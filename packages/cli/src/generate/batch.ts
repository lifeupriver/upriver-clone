import {
  COVERAGE_MAP,
  deliverableReadiness,
  generationOrder,
  type ClientProfile,
  type DeliverableId,
  type Readiness,
} from '@upriver/schemas';
import type { ClientDataSource } from '@upriver/core/data';

import { runGenerate, M1_DOCS, type GenerateDeps, type GenerateOptions } from './engine.js';
import {
  generatedIds,
  readManifest,
  upsertEntry,
  writeManifest,
  type Manifest,
  type ManifestEntry,
} from './manifest.js';
import { PROFILE_PATH } from './profile-io.js';
import { I_SERIES } from './provisioning.js';

/**
 * Batch generation over the 01–12 document DAG (M2 `generate --all`). This is
 * the oclif-free orchestrator: `planBatch` computes the tier plan + blocked set
 * from a profile and its manifest; `runTier` reuses the single-doc engine
 * (`runGenerate`) per doc, deferring the Continue gate so the command can gate a
 * whole tier at once; `aggregateMarkers` consolidates the `[NEEDS CONFIRMATION]`
 * list. No filesystem, no git, no oclif — the LLM (via `runGenerate`) and the
 * committer are injected so this unit-tests with `claudeCliCall` + git mocked.
 *
 * `runTierParallel` is the opt-in `--jobs N` path: within a tier the docs are
 * independent and write uniquely-named files, so they can generate concurrently,
 * each in its own injected worktree (a private `ClientDataSource`), then merge
 * back into the main tree before the per-tier gate. The git/worktree machinery
 * is injected via {@link ParallelTierDeps} — this module still touches no git and
 * only the injected data sources for IO.
 */

/** Default `--all` scope: the 01–12 core docs (PRD §8 M2). Reuses the engine's M1 set. */
export const ALL_DOCS: readonly DeliverableId[] = M1_DOCS;

const byId = new Map(COVERAGE_MAP.map((d) => [d.id, d] as const));
const titleOf = (id: DeliverableId): string => byId.get(id)?.title ?? id;
const requiresDocsOf = (id: DeliverableId): DeliverableId[] => byId.get(id)?.requiresDocs ?? [];

export type BlockReason = 'missing-fields' | 'unverified-hv' | 'blocked-upstream';

/** Why an upstream dep can't be satisfied this run. */
export interface BlockingDoc {
  id: DeliverableId;
  /**
   * `blocked-this-run`: the dep is in scope but itself blocked (needs more
   * profile data). `unapproved-out-of-scope`: the dep is neither approved nor in
   * this run's `--docs` subset.
   */
  kind: 'blocked-this-run' | 'unapproved-out-of-scope';
}

export interface BlockedDoc {
  id: DeliverableId;
  title: string;
  readiness: Readiness;
  reasons: BlockReason[];
  blockingDocs: BlockingDoc[];
}

export interface Tier {
  index: number;
  docs: DeliverableId[];
}

export interface BatchPlan {
  scope: DeliverableId[];
  /** Already-approved docs (count as satisfied deps), from the manifest. */
  approved: DeliverableId[];
  tiers: Tier[];
  blocked: BlockedDoc[];
}

/**
 * Plan a batch run: classify every in-scope doc as producible (→ a DAG tier) or
 * blocked (→ named reasons). A doc is producible when its required fields are
 * present, its required HV fields are verified, and every `requiresDocs` dep is
 * either already approved or itself producible this run. Tiers are layered so a
 * tier's docs depend only on earlier tiers (the §3.1 DAG via `generationOrder`).
 * Pure — no I/O.
 */
export function planBatch(
  profile: ClientProfile,
  manifest: Manifest,
  scope: DeliverableId[],
): BatchPlan {
  const approved = generatedIds(manifest);
  const approvedSet = new Set(approved);
  const scopeSet = new Set(scope);

  const readinessOf = (id: DeliverableId): Readiness => deliverableReadiness(profile, id, approved);
  const fieldHvReady = (id: DeliverableId): boolean => {
    const r = readinessOf(id);
    return r.missingFields.length === 0 && r.unverifiedHv.length === 0;
  };

  // Fixpoint: producible = field/HV-ready ∧ every dep ∈ (approved ∪ producible).
  const producible = new Set<DeliverableId>();
  for (let changed = true; changed; ) {
    changed = false;
    for (const id of scope) {
      if (producible.has(id) || !fieldHvReady(id)) continue;
      const ok = requiresDocsOf(id).every((dep) => approvedSet.has(dep) || producible.has(dep));
      if (ok) {
        producible.add(id);
        changed = true;
      }
    }
  }

  // Layer producible docs into tiers by longest in-run dependency path.
  const order = generationOrder([...producible]);
  const tierOf = new Map<DeliverableId, number>();
  for (const id of order) {
    const deps = requiresDocsOf(id).filter((d) => producible.has(d));
    const t = deps.length === 0 ? 0 : 1 + Math.max(...deps.map((d) => tierOf.get(d) ?? 0));
    tierOf.set(id, t);
  }
  const maxTier = tierOf.size === 0 ? -1 : Math.max(...tierOf.values());
  const tiers: Tier[] = [];
  for (let i = 0; i <= maxTier; i++) {
    const docs = order.filter((id) => tierOf.get(id) === i);
    if (docs.length > 0) tiers.push({ index: i, docs });
  }

  // Blocked = scope \ producible, with reasons.
  const blocked: BlockedDoc[] = [];
  for (const id of scope) {
    if (producible.has(id)) continue;
    const r = readinessOf(id);
    const reasons: BlockReason[] = [];
    if (r.missingFields.length > 0) reasons.push('missing-fields');
    if (r.unverifiedHv.length > 0) reasons.push('unverified-hv');
    const blockingDocs: BlockingDoc[] = [];
    for (const dep of requiresDocsOf(id)) {
      if (approvedSet.has(dep) || producible.has(dep)) continue; // satisfiable
      blockingDocs.push({ id: dep, kind: scopeSet.has(dep) ? 'blocked-this-run' : 'unapproved-out-of-scope' });
    }
    if (blockingDocs.length > 0) reasons.push('blocked-upstream');
    blocked.push({ id, title: titleOf(id), readiness: r, reasons, blockingDocs });
  }

  return { scope, approved, tiers, blocked };
}

/** Index of the tier containing `id`, or -1 if it is blocked / out of scope (`--from`). */
export function tierIndexOf(plan: BatchPlan, id: DeliverableId): number {
  return plan.tiers.findIndex((t) => t.docs.includes(id));
}

export type DocStatus = 'produced' | 'reused' | 'failed' | 'skipped';

export interface DocResult {
  id: DeliverableId;
  title: string;
  status: DocStatus;
  docPath?: string;
  markers: string[];
  /** `[OPERATOR ACTION]` click-ops (provisioning only, Build Spec 09); optional, treated as []. */
  operatorActions?: string[];
  words: number;
  /** For `failed` / `skipped`: why. */
  reason?: string;
}

export interface TierRunResult {
  index: number;
  docs: DocResult[];
  /** produced + reused — the docs eligible for tier approval. */
  produced: DeliverableId[];
  failed: DeliverableId[];
  skipped: DeliverableId[];
  claudeCalls: number;
}

/** A single doc's tier result plus how many claude calls it cost. */
interface DocOutcome {
  result: DocResult;
  claudeCalls: number;
}

/**
 * Generate one doc inside a tier, reusing `runGenerate` with the Continue gate
 * deferred (`skipGate`). A doc whose upstream failed/was-skipped earlier in THIS
 * run is skipped with that reason (failure isolation — PRD §5); a generation
 * error is caught and recorded, never aborting the tier. The single source of
 * per-doc truth shared by the sequential and parallel tier runners.
 */
async function generateOneDoc(
  id: DeliverableId,
  base: Omit<GenerateOptions, 'id' | 'skipGate'>,
  deps: GenerateDeps,
  failedUpstream: ReadonlySet<DeliverableId>,
): Promise<DocOutcome> {
  const deadDeps = requiresDocsOf(id).filter((d) => failedUpstream.has(d));
  if (deadDeps.length > 0) {
    return {
      result: {
        id,
        title: titleOf(id),
        status: 'skipped',
        markers: [],
        words: 0,
        reason: `upstream not available this run: ${deadDeps.join(', ')}`,
      },
      claudeCalls: 0,
    };
  }

  try {
    const outcome = await runGenerate({ ...base, id, skipGate: true }, deps);
    if (outcome.status === 'generated' || outcome.status === 'reused') {
      return {
        result: {
          id,
          title: titleOf(id),
          status: outcome.status === 'reused' ? 'reused' : 'produced',
          ...(outcome.docPath ? { docPath: outcome.docPath } : {}),
          markers: outcome.markers,
          operatorActions: outcome.operatorActions ?? [],
          words: outcome.words ?? 0,
        },
        claudeCalls: outcome.claudeCalls,
      };
    }
    return {
      result: {
        id,
        title: titleOf(id),
        status: 'failed',
        ...(outcome.docPath ? { docPath: outcome.docPath } : {}),
        markers: [],
        words: 0,
        reason: outcome.status === 'blocked' ? 'readiness gate blocked at runtime' : 'generation error',
      },
      claudeCalls: outcome.claudeCalls,
    };
  } catch (err) {
    return {
      result: {
        id,
        title: titleOf(id),
        status: 'failed',
        markers: [],
        words: 0,
        reason: (err as Error).message,
      },
      claudeCalls: 0,
    };
  }
}

/** Roll up per-doc results into the tier summary (produced/failed/skipped sets). */
function summarizeTier(tier: Tier, docs: DocResult[], claudeCalls: number): TierRunResult {
  return {
    index: tier.index,
    docs,
    produced: docs.filter((d) => d.status === 'produced' || d.status === 'reused').map((d) => d.id),
    failed: docs.filter((d) => d.status === 'failed').map((d) => d.id),
    skipped: docs.filter((d) => d.status === 'skipped').map((d) => d.id),
    claudeCalls,
  };
}

/**
 * Generate one DAG tier, sequentially — the proven path (`--jobs 1`). Each doc
 * runs through `generateOneDoc` against the single shared data source.
 * `failedUpstream` is the accumulating set of this-run docs that did not become
 * available.
 */
export async function runTier(
  tier: Tier,
  base: Omit<GenerateOptions, 'id' | 'skipGate'>,
  deps: GenerateDeps,
  failedUpstream: ReadonlySet<DeliverableId>,
): Promise<TierRunResult> {
  const docs: DocResult[] = [];
  let claudeCalls = 0;
  for (const id of tier.docs) {
    const { result, claudeCalls: n } = await generateOneDoc(id, base, deps, failedUpstream);
    claudeCalls += n;
    docs.push(result);
  }
  return summarizeTier(tier, docs, claudeCalls);
}

/**
 * An isolated client tree for one parallel doc generation — a git worktree's
 * private `ClientDataSource`, seeded from the main tree and torn down after.
 * Injected so `batch.ts` stays git-free and tests can mock it with temp dirs.
 */
export interface TierWorktree {
  /** Data source rooted at the worktree (its own `clients/<slug>/` + manifest). */
  ds: ClientDataSource;
  /** Copy the inputs generation reads (profile + `docs/`) from the main tree. */
  seed(): Promise<void>;
  /** Tear down the worktree (best-effort; never throws). */
  release(): Promise<void>;
}

/** The injected git + data-source seam for the parallel `--jobs` tier runner. */
export interface ParallelTierDeps {
  /** Max concurrent doc sessions (the resolved `--jobs` cap, ≥ 2 here). */
  jobs: number;
  /** Acquire a fresh, isolated worktree for `key` (one per doc). */
  acquire(key: string): Promise<TierWorktree>;
}

/**
 * Copy the inputs a parallel worktree needs — `profile.json` and everything
 * under `docs/` (the manifest + already-approved upstream docs) — from `src`
 * into `dst`. Data-source agnostic and pure of node IO. So the worktree session
 * sees the same prior state the sequential run would, the merged output is
 * identical (modulo the LLM).
 */
export async function seedClientTree(
  src: ClientDataSource,
  dst: ClientDataSource,
  slug: string,
): Promise<void> {
  const profile = await src.readClientFileText(slug, PROFILE_PATH);
  if (profile !== null) await dst.writeClientFile(slug, PROFILE_PATH, profile);
  for (const name of await src.listClientFiles(slug, 'docs')) {
    const bytes = await src.readClientFile(slug, `docs/${name}`);
    if (bytes !== null) await dst.writeClientFile(slug, `docs/${name}`, bytes);
  }
}

/** What a finished worktree job hands back to the merge step. */
interface MergeUnit {
  docPath: string;
  content: string;
  entry: ManifestEntry;
}

/**
 * Run one doc in a freshly-acquired worktree and capture its output for the
 * post-tier merge. Skips (dead upstream) short-circuit before any worktree is
 * created. The worktree is always released in `finally` (no leaks), and every
 * failure path resolves to a `failed` DocResult so the concurrency pool never
 * rejects.
 */
async function runDocInWorktree(
  id: DeliverableId,
  tier: Tier,
  base: Omit<GenerateOptions, 'id' | 'skipGate'>,
  deps: GenerateDeps,
  failedUpstream: ReadonlySet<DeliverableId>,
  parallel: ParallelTierDeps,
  captured: Map<DeliverableId, MergeUnit>,
): Promise<DocOutcome> {
  const deadDeps = requiresDocsOf(id).filter((d) => failedUpstream.has(d));
  if (deadDeps.length > 0) {
    return generateOneDoc(id, base, deps, failedUpstream); // returns the skip, no worktree
  }

  let wt: TierWorktree | null = null;
  try {
    wt = await parallel.acquire(`${base.slug}-t${tier.index}-${id}`);
    await wt.seed();
    const out = await generateOneDoc(id, base, { ...deps, ds: wt.ds }, failedUpstream);
    if ((out.result.status === 'produced' || out.result.status === 'reused') && out.result.docPath) {
      const content = await wt.ds.readClientFileText(base.slug, out.result.docPath);
      const m = await readManifest(wt.ds, base.slug);
      const entry = m.docs[id];
      if (content !== null && entry) captured.set(id, { docPath: out.result.docPath, content, entry });
    }
    return out;
  } catch (err) {
    return {
      result: { id, title: titleOf(id), status: 'failed', markers: [], words: 0, reason: (err as Error).message },
      claudeCalls: 0,
    };
  } finally {
    if (wt) {
      try {
        await wt.release();
      } catch {
        /* best-effort cleanup */
      }
    }
  }
}

/**
 * Generate one DAG tier in parallel (`--jobs N`). The docs in a tier are
 * independent and write uniquely-named files, so they run concurrently — each
 * in its own worktree data source (a private manifest) — then merge back into
 * the main tree in tier order. The merge is the single writer of the main
 * manifest, so no lock is needed: the unique paths can't collide, and ordered
 * `upsertEntry` reproduces exactly what the sequential run would have written.
 *
 * Concurrency is capped at `min(jobs, tier.docs.length)`. The tier never aborts
 * on a single doc's failure (mirrors `runTier`).
 */
export async function runTierParallel(
  tier: Tier,
  base: Omit<GenerateOptions, 'id' | 'skipGate'>,
  deps: GenerateDeps,
  failedUpstream: ReadonlySet<DeliverableId>,
  parallel: ParallelTierDeps,
): Promise<TierRunResult> {
  const captured = new Map<DeliverableId, MergeUnit>();
  const outcomes = new Map<DeliverableId, DocOutcome>();
  const queue = [...tier.docs];

  const lane = async (): Promise<void> => {
    for (;;) {
      const id = queue.shift();
      if (!id) break;
      outcomes.set(id, await runDocInWorktree(id, tier, base, deps, failedUpstream, parallel, captured));
    }
  };
  const lanes = Math.max(1, Math.min(parallel.jobs, tier.docs.length));
  await Promise.all(Array.from({ length: lanes }, () => lane()));

  // Merge produced docs into the main tree, in tier order, so the resulting
  // manifest is byte-identical to the sequential path. Single writer → no lock.
  let manifest = await readManifest(deps.ds, base.slug);
  for (const id of tier.docs) {
    const unit = captured.get(id);
    if (!unit) continue;
    await deps.ds.writeClientFile(base.slug, unit.docPath, unit.content);
    manifest = upsertEntry(manifest, unit.entry);
  }
  await writeManifest(deps.ds, base.slug, manifest);

  const docs = tier.docs.map((id) => (outcomes.get(id) as DocOutcome).result);
  const claudeCalls = tier.docs.reduce((n, id) => n + (outcomes.get(id)?.claudeCalls ?? 0), 0);
  return summarizeTier(tier, docs, claudeCalls);
}

export interface MarkerGroup {
  id: DeliverableId;
  title: string;
  markers: string[];
}
export interface MarkerAggregate {
  byDoc: MarkerGroup[];
  total: number;
}

function aggregateBy(docs: DocResult[], pick: (d: DocResult) => string[]): MarkerAggregate {
  const byDoc = docs
    .map((d) => ({ id: d.id, title: d.title, markers: pick(d) ?? [] }))
    .filter((g) => g.markers.length > 0);
  return { byDoc, total: byDoc.reduce((n, g) => n + g.markers.length, 0) };
}

/** Consolidate the `[NEEDS CONFIRMATION]` markers produced across a tier, grouped by doc. */
export function aggregateMarkers(docs: DocResult[]): MarkerAggregate {
  return aggregateBy(docs, (d) => d.markers);
}

/** Consolidate the `[OPERATOR ACTION]` cannot-generate steps across a tier (provisioning), grouped by artifact. */
export function aggregateOperatorActions(docs: DocResult[]): MarkerAggregate {
  return aggregateBy(docs, (d) => d.operatorActions ?? []);
}

/**
 * The git command that snapshots an approved tier (the resolved open decision:
 * per-tier commits are surfaced as a printed command, not run by the CLI — see
 * the spec changelog). Built here so a future CLI-direct committer is a
 * one-function swap. `paths` are the produced docs' client-relative paths.
 */
export function commitCommand(slug: string, tier: Tier, paths: string[]): string {
  const files = [...paths, 'docs/manifest.json'].map((p) => `clients/${slug}/${p}`).join(' ');
  return `git add -f ${files} && git commit -m "generate(${slug}): approve tier ${tier.index} — ${tier.docs.join(', ')}"`;
}

export interface ProvisioningProjection {
  id: DeliverableId;
  title: string;
  missingFields: string[];
  unverifiedHv: string[];
}

/**
 * Finding G (Build Spec 14, P5): project the I01–I09 provisioning artifacts'
 * FIELD readiness for the pre-docs checkpoint. `missingDocs` is deliberately
 * excluded — upstream docs are by definition ungenerated at the checkpoint, so
 * reporting them would make the projection all-red and useless. Pure — no I/O.
 */
export function projectProvisioningReadiness(profile: ClientProfile): ProvisioningProjection[] {
  return I_SERIES.map((id) => {
    const r = deliverableReadiness(profile, id);
    return { id, title: titleOf(id), missingFields: r.missingFields, unverifiedHv: r.unverifiedHv };
  });
}
