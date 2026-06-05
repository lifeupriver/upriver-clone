import {
  COVERAGE_MAP,
  deliverableReadiness,
  generationOrder,
  type ClientProfile,
  type DeliverableId,
  type Readiness,
} from '@upriver/schemas';

import { runGenerate, M1_DOCS, type GenerateDeps, type GenerateOptions } from './engine.js';
import { generatedIds, type Manifest } from './manifest.js';

/**
 * Batch generation over the 01–12 document DAG (M2 `generate --all`). This is
 * the oclif-free orchestrator: `planBatch` computes the tier plan + blocked set
 * from a profile and its manifest; `runTier` reuses the single-doc engine
 * (`runGenerate`) per doc, deferring the Continue gate so the command can gate a
 * whole tier at once; `aggregateMarkers` consolidates the `[NEEDS CONFIRMATION]`
 * list. No filesystem, no git, no oclif — the LLM (via `runGenerate`) and the
 * committer are injected so this unit-tests with `claudeCliCall` + git mocked.
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

/**
 * Generate one DAG tier, sequentially, reusing `runGenerate` per doc with the
 * Continue gate deferred (`skipGate`). A doc whose upstream failed/was-skipped
 * earlier in THIS run is skipped with that reason (failure isolation — PRD §5);
 * a generation error is caught and recorded, never aborting the tier. `failedUpstream`
 * is the accumulating set of this-run docs that did not become available.
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
    const deadDeps = requiresDocsOf(id).filter((d) => failedUpstream.has(d));
    if (deadDeps.length > 0) {
      docs.push({
        id,
        title: titleOf(id),
        status: 'skipped',
        markers: [],
        words: 0,
        reason: `upstream not available this run: ${deadDeps.join(', ')}`,
      });
      continue;
    }

    let result: DocResult;
    try {
      const outcome = await runGenerate({ ...base, id, skipGate: true }, deps);
      claudeCalls += outcome.claudeCalls;
      if (outcome.status === 'generated' || outcome.status === 'reused') {
        result = {
          id,
          title: titleOf(id),
          status: outcome.status === 'reused' ? 'reused' : 'produced',
          ...(outcome.docPath ? { docPath: outcome.docPath } : {}),
          markers: outcome.markers,
          words: outcome.words ?? 0,
        };
      } else {
        result = {
          id,
          title: titleOf(id),
          status: 'failed',
          ...(outcome.docPath ? { docPath: outcome.docPath } : {}),
          markers: [],
          words: 0,
          reason: outcome.status === 'blocked' ? 'readiness gate blocked at runtime' : 'generation error',
        };
      }
    } catch (err) {
      result = {
        id,
        title: titleOf(id),
        status: 'failed',
        markers: [],
        words: 0,
        reason: (err as Error).message,
      };
    }
    docs.push(result);
  }

  return {
    index: tier.index,
    docs,
    produced: docs.filter((d) => d.status === 'produced' || d.status === 'reused').map((d) => d.id),
    failed: docs.filter((d) => d.status === 'failed').map((d) => d.id),
    skipped: docs.filter((d) => d.status === 'skipped').map((d) => d.id),
    claudeCalls,
  };
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

/** Consolidate the `[NEEDS CONFIRMATION]` markers produced across a tier, grouped by doc. */
export function aggregateMarkers(docs: DocResult[]): MarkerAggregate {
  const byDoc = docs
    .filter((d) => d.markers.length > 0)
    .map((d) => ({ id: d.id, title: d.title, markers: d.markers }));
  return { byDoc, total: byDoc.reduce((n, g) => n + g.markers.length, 0) };
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
