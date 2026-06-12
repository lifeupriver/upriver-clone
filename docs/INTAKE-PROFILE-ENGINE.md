# The Intake & Profile Engine

How Upriver turns a prospect into a verified fact base, and that fact base into the **AI Operating System** — the 18-document deliverable set plus provisioning artifacts. This is the `recon` / `profile` / `generate` side of the CLI, built across Build Specs 01–14 (see `.planning/intake-profile-engine/`).

Audience: operators running engagements and engineers extending the engine.

---

## Why a profile, not just an audit

The website pipeline works from *scraped evidence* — whatever the old site happens to say. Deliverable documents need *verified facts*: the actual pricing, the actual team, what the owner actually wants. The Client Profile is that fact base. Every value in it carries:

- **a source** — `recon`, transcript extraction, operator edit, client import — with a precedence order;
- **a verified flag** — set only by a human (`upriver profile verify`), never by automation;
- **conflict tracking** — when two sources disagree, the value goes to a conflict queue for an operator decision instead of being silently overwritten.

The shape is defined once, in Zod, in `packages/schemas` (`@upriver/schemas`): sections for identity, people, offerings, pricing, customers, positioning, voice, sales process, content, competitors, SEO, tools & access, operations/automation, governance, goals, and audit decisions — plus industry modules (preschool, venue, contractor, restaurant) that extend the base shape.

On disk the profile lives at `clients/<slug>/profile.json` with `conflicts.json` beside it. The canonical store is **Supabase** (these commands default to `UPRIVER_DATA_SOURCE=supabase`); set `UPRIVER_DATA_SOURCE=local` for offline work, fixtures, and e2e runs. `profile push` / `profile pull` move data between the two using merge rules that never clobber verified values or open conflicts.

## Filling the profile

Four inlets, in rough order of an engagement:

1. **Recon** — `upriver recon <slug>` runs adapters (`website`, `gbp`, `socials`, `geo`, `serp`) and merges `source:"recon"` candidates in. Recon **fills gaps only**: it never overwrites higher-precedence data and never marks anything verified. `--dry-run` previews, `--fresh` re-scrapes past the cache.
   - **Secret shopper**: `upriver recon secret-shopper start` logs an inquiry *you sent manually* (recon never contacts the business); `… record` captures the reply and merges the measured first-touch response time as a recon candidate.
2. **Import** — `upriver profile import <slug> <file>` validates a hand-filled profile JSON and persists it (per-field merge, or `--replace` wholesale). The day-one seeding path.
3. **Transcript extraction** — `upriver profile extract-transcript <slug> <file>` mines the client interview transcript and proposes profile updates.
4. **Operator edits** — `upriver profile set <slug> <section> <field> <value>` for single fields; the dashboard's intake chat writes through the same merge rules (rate-limited server-side).

A fifth inlet exists for converted prospects: `upriver pitch convert` maps the pitch questionnaire's answers into `identity.*`/profile candidates with `source:"interview"` through the same merge arbiter — verified data is never overwritten. See [`PITCH-ENGINE.md`](PITCH-ENGINE.md).

Legacy engagements migrate via `upriver profile migrate-intake`.

## Coverage, conflicts, verification

```bash
upriver profile show <slug>                       # the whole picture
upriver profile show <slug> --deliverable=doc-10  # why is THIS doc blocked?
upriver profile conflicts <slug>                  # decide between disagreeing sources
upriver profile verify <slug>                     # mark fields human-verified
```

`profile show` is the cockpit: per-deliverable readiness (ready / blocked, and the exact fields blocking), the conflict queue, generated-but-unapproved docs, and fill statistics. The coverage map — which deliverable requires which fields — lives in `packages/schemas/src/coverage-map.ts`.

Some fields are registered as **human-verify-required** (`packages/schemas/src/hv.ts`): facts like pricing where a wrong value in a client deliverable is unacceptable. Generation of any doc that depends on them is gated until an operator verifies them. This is the engine's central safety property: *automation proposes, humans confirm, documents only generate from confirmed ground.*

## Generating the deliverables

```bash
upriver generate <slug> --doc doc-01          # one deliverable
upriver generate <slug> --all                 # DAG-batch docs 01–18, per-tier Continue gates
upriver generate <slug> --all --provisioning  # I01–I09 provisioning artifacts
upriver generate <slug> --web                 # post-fork website tier (doc-web-prd, design-system)
```

`generate` runs write-capable headless Claude Code sessions (so docs are produced with full skill/context access), gated on coverage and verification as above. The deliverable set — brand voice guide, business facts reference, sales process map, content library, competitor landscape, SEO keyword strategy, FAQ bank, email templates, social media playbook, website audit, automation spec package, measurement/KPI framework, master build sequence, client onboarding kit, retainer playbook, sales collateral, handoff/offboarding, and the AI OS sales document — is specified per-doc in `.planning/intake-profile-engine/specs-reference/`. Outputs land under `clients/<slug>/docs/` and `deliverables/` with `manifest.json` tracking generated/approved state.

Useful flags:

- `--docs=<subset>` / `--from=<id>` — generate a subset or resume a batch.
- `--dry-run` — plan without generating; `--yes` / `UPRIVER_GATE_AUTO=1` — auto-accept Continue gates (unattended/synthetic runs).
- `--jobs=<n>` — parallelize tiers via git worktrees (requires `UPRIVER_DATA_SOURCE=local`; otherwise falls back to sequential with a warning).
- `--model` — model override; `UPRIVER_LLM_NO_CACHE=1` — force fresh sessions on resumed runs.
- `--full-upstream` — regenerate with full upstream context.
- `--strict-provisioning` — project provisioning readiness and **exit 3** if gaps exist (see below).

### Exit codes (pinned, smoke-tested in CI)

| Code | Meaning |
|---|---|
| 0 | Success |
| 2 | Preflight failure — a composed prompt exceeded the token ceiling (also oclif usage errors generally) |
| 3 | `--strict-provisioning` found provisioning gaps |

These are part of the repo-wide exit-code contract (`scripts/cli-smoke.mjs` pins them), so unattended pipelines can branch on them instead of scraping logs. Spec 14's hardening also guarantees no raw stack traces leak to the shell.

## Provenance in generated docs

Spec 14 made generation **provenance-aware**: documents distinguish verified facts from recon-sourced candidates, and the engine asserts client identity so a profile can't silently generate docs for the wrong business. If a doc reads thin, the fix is upstream — fill and verify the profile, don't edit the output.

## The acceptance run

The end-to-end proof of the engine is the **Little Friends** synthetic corpus (`clients/littlefriends/`):

```bash
UPRIVER_GATE_AUTO=1 bash scripts/e2e-littlefriends.sh
```

Phases: reset → recon → extract → conflicts → verify → readiness → docs → provisioning → final. Resumable from any phase; the `readiness-only` stop skips LLM-backed doc generation. Requires `claude` on PATH. See [`TESTING.md`](TESTING.md).

## Relationship to the website pipeline

The two engines meet in three places:

- `design-brief` and `scaffold` are **profile-first**: verified profile facts override stale scraped copy when both exist.
- doc-10 (website audit) §9 `websiteScope` gates the `generate --web` tier (doc-web-prd, design-system) — the fork from documents into the rebuild.
- The dashboard's coverage view and intake chat read/write the same profile through `@upriver/schemas`' shared `show-model`.
