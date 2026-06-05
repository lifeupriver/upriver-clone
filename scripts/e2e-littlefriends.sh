#!/usr/bin/env bash
# End-to-end synthetic run: Little Friends corpus → full AI Operating System.
# Fully non-interactive. All output goes to the log; the orchestrator (a Claude
# Code session or Joshua) only ever needs the tail of the log plus the
# structured JSON artifacts — never the doc bodies. Resumable: pass a phase
# name (reset|recon|extract|conflicts|verify|readiness|docs|provisioning|final)
# to start there.
#
# REQUIRES: UPRIVER_GATE_AUTO=1 support in gate.ts (step 0 of the run prompt).
# Refuses to start without it set, so it can never be mistaken for a live run.
set -uo pipefail

SLUG=littlefriends
CORPUS=.planning/intake-profile-engine/test-fixtures/little-friends-synthetic-onboarding-corpus.md
RUN_DIR=clients/$SLUG/e2e
LOG=$RUN_DIR/run.log
export UPRIVER_DATA_SOURCE=local

[ "${UPRIVER_GATE_AUTO:-}" = "1" ] || { echo "Refusing: set UPRIVER_GATE_AUTO=1 (synthetic runs only)."; exit 1; }
command -v claude >/dev/null || { echo "Refusing: claude CLI not on PATH."; exit 1; }
mkdir -p "$RUN_DIR"

UPRIVER="node packages/cli/bin/run.js"
START_PHASE="${1:-reset}"
PHASES=(reset recon extract conflicts verify readiness docs provisioning final)

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG"; }
run() { log "\$ $*"; "$@" >>"$LOG" 2>&1; local rc=$?; log "(exit $rc)"; return $rc; }
phase_ge() { # true if current phase $1 is at/after START_PHASE
  local cur=$1 i s=-1 c=-1
  for i in "${!PHASES[@]}"; do
    [ "${PHASES[$i]}" = "$START_PHASE" ] && s=$i
    [ "${PHASES[$i]}" = "$cur" ] && c=$i
  done
  [ $c -ge $s ]
}

log "=== e2e synthetic run start (from: $START_PHASE) ==="

# ---- Phase: reset ----------------------------------------------------------
if phase_ge reset; then
  log "--- PHASE reset: clean client state (git preserves history) ---"
  git rm -rq --ignore-unmatch clients/$SLUG/docs clients/$SLUG/profile.json \
    clients/$SLUG/profile-conflicts.json clients/$SLUG/transcripts \
    clients/$SLUG/intake.json clients/$SLUG/intake.json.migrated \
    clients/$SLUG/coverage-final.json >>"$LOG" 2>&1
  rm -rf clients/$SLUG/docs clients/$SLUG/provisioning clients/$SLUG/.cache
  git commit -qm "e2e: reset littlefriends client state" >>"$LOG" 2>&1 || true
  cat > "$RUN_DIR/seed.json" <<EOF
{ "_meta": { "version": 1, "slug": "$SLUG", "createdAt": "$(date -u +%FT%TZ)", "updatedAt": "$(date -u +%FT%TZ)", "revision": 1 } }
EOF
  run $UPRIVER profile import $SLUG "$RUN_DIR/seed.json" --replace || { log "FATAL: seed import failed"; exit 1; }
fi

# ---- Phase: recon ----------------------------------------------------------
if phase_ge recon; then
  log "--- PHASE recon ---"
  if [ -n "${FIRECRAWL_API_KEY:-}" ]; then
    run $UPRIVER recon $SLUG --adapters website,gbp || log "WARN: recon failed; pipeline continues (recon is lowest precedence)"
  else
    log "SKIP: FIRECRAWL_API_KEY not set"; run $UPRIVER recon $SLUG --dry-run || true
  fi
fi

# ---- Phase: extract --------------------------------------------------------
if phase_ge extract; then
  log "--- PHASE extract: corpus → profile ---"
  run $UPRIVER profile extract-transcript $SLUG "$CORPUS" || { log "FATAL: extraction failed"; exit 1; }
fi

# ---- Phase: conflicts ------------------------------------------------------
if phase_ge conflicts; then
  log "--- PHASE conflicts: keep candidate (corpus/transcript beats stale recon) ---"
  for i in $(seq 1 200); do
    $UPRIVER profile conflicts $SLUG --resolve 1 --keep candidate >>"$LOG" 2>&1 || break
  done
  run $UPRIVER profile conflicts $SLUG || true
fi

# ---- Phase: verify ---------------------------------------------------------
if phase_ge verify; then
  log "--- PHASE verify: all filled HV fields (synthetic authorization) ---"
  run $UPRIVER profile show $SLUG --json
  $UPRIVER profile show $SLUG --json > "$RUN_DIR/coverage-pre.json" 2>>"$LOG"
  HV_PATHS=$(node -e '
    // show --json shape: { ready: DeliverableRow[], blocked: DeliverableRow[] },
    // each row { id, title, readiness: { ready, missingFields[], unverifiedHv[], missingDocs[] } }.
    const m = require(process.argv[1]);
    const rows = [...(m.ready ?? []), ...(m.blocked ?? [])];
    const set = new Set();
    for (const d of rows) for (const p of (d.readiness?.unverifiedHv ?? [])) set.add(p);
    console.log([...set].join(" "));
  ' "$PWD/$RUN_DIR/coverage-pre.json" 2>>"$LOG")
  if [ -n "$HV_PATHS" ]; then
    # shellcheck disable=SC2086
    run $UPRIVER profile verify $SLUG $HV_PATHS --evidence "synthetic e2e run" \
      || log "WARN: some HV paths refused (empty values stay unverified by design)"
  else
    log "No filled-but-unverified HV paths found."
  fi
fi

# ---- Phase: readiness gate (the one judgment checkpoint) -------------------
if phase_ge readiness; then
  log "--- PHASE readiness: dry-run the full doc DAG ---"
  run $UPRIVER generate $SLUG --all --dry-run
  BLOCKED=$(node -e '
    const fs=require("fs");
    const log=fs.readFileSync(process.argv[1],"utf8");
    const m=[...log.matchAll(/blocked[^\n]*\n/gi)].slice(-20).map(x=>x[0].trim());
    console.log(m.join("\n"));
  ' "$PWD/$LOG" 2>/dev/null | tail -12)
  $UPRIVER profile show $SLUG --json > "$RUN_DIR/readiness.json" 2>>"$LOG"
  # The checkpoint fires only on FIELD-level blockers (missing required fields or
  # unverified HV) — the operator gap-fills those. Docs blocked solely by an
  # ungenerated upstream doc (missingDocs) are normal DAG ordering that
  # `generate --all` resolves tier by tier, so they must NOT trip the checkpoint.
  NOT_READY=$(node -e '
    const m=require(process.argv[1]);
    const rows=(m.blocked ?? []).filter(d=>/^doc-/.test(d.id));
    for (const d of rows) {
      const r=d.readiness ?? {};
      const mf=r.missingFields ?? [], hv=r.unverifiedHv ?? [], md=r.missingDocs ?? [];
      if (mf.length===0 && hv.length===0) continue; // blocked only by upstream docs — not an operator action
      console.log(`${d.id}: missingFields=[${mf.join(",")}] unverifiedHv=[${hv.join(",")}] missingDocs=[${md.join(",")}]`);
    }
  ' "$PWD/$RUN_DIR/readiness.json" 2>>"$LOG")
  if [ -n "$NOT_READY" ]; then
    log "CHECKPOINT: docs blocked — operator gap-fill needed before generation."
    log "$NOT_READY"
    log "Gap-fill with: $UPRIVER profile set $SLUG <path> <value> --evidence 'operator gap-fill, synthetic e2e'"
    log "Then resume:   UPRIVER_GATE_AUTO=1 bash scripts/e2e-littlefriends.sh docs"
    exit 3
  fi
  log "All docs READY."
fi

# ---- Phase: docs -----------------------------------------------------------
if phase_ge docs; then
  log "--- PHASE docs: generate the 12-doc AI Operating System (auto-gated) ---"
  run $UPRIVER generate $SLUG --all || { log "FATAL: doc generation failed — resume with: bash scripts/e2e-littlefriends.sh docs (or --from <doc-id> manually)"; exit 1; }
fi

# ---- Phase: provisioning ---------------------------------------------------
if phase_ge provisioning; then
  log "--- PHASE provisioning: I01–I09 artifacts ---"
  run $UPRIVER generate $SLUG --all --provisioning || { log "FATAL: provisioning failed — resume with: bash scripts/e2e-littlefriends.sh provisioning"; exit 1; }
fi

# ---- Phase: final ----------------------------------------------------------
if phase_ge final; then
  log "--- PHASE final: snapshots ---"
  $UPRIVER profile show $SLUG --json > clients/$SLUG/coverage-final.json 2>>"$LOG"
  run $UPRIVER profile show $SLUG
  run $UPRIVER profile conflicts $SLUG
  log "=== e2e synthetic run COMPLETE ==="
  log "Artifacts: clients/$SLUG/docs/  clients/$SLUG/coverage-final.json  $RUN_DIR/"
fi
