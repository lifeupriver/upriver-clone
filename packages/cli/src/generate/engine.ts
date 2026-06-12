import {
  COVERAGE_MAP,
  deliverableReadiness,
  nearestEnvelope,
  type DeliverableId,
} from '@upriver/schemas';
import type { ClientDataSource } from '@upriver/core/data';

import { resolveGateDecision } from './gate.js';
import { scanMarkers, scanOperatorActions } from './markers.js';
import {
  generatedIds,
  hashContent,
  readManifest,
  setApproved,
  upsertEntry,
  writeManifest,
  type Manifest,
  type ManifestEntry,
} from './manifest.js';
import { assertIdentity } from './identity-assert.js';
import { readProfile } from './profile-io.js';
import { profileSlice, renderSlice } from './profile-slice.js';
import { buildPrompt, type UpstreamDoc } from './prompt-builder.js';
import { buildUpstreamDigest, DIGEST_MAX_CHARS } from './upstream-digest.js';
import { I_SERIES, isProvisioning } from './provisioning.js';
import { assessPromptSize, type PromptSize } from './prompt-size.js';
import { newlyUnblocked, renderDocLine, renderGenerationReport, renderReadiness, titleFor } from './report.js';
import { runDoc, type ClaudeCall } from './runner.js';
import { loadDeliverableSpec } from './spec-loader.js';
import { buildPitchContext, isPitchDoc, PITCH_DOCS } from '../pitch/teasers.js';

export { PITCH_DOCS };

/**
 * The full AI Operating System document scope — 01–18. Docs 13–18 (Master Build
 * Sequence, Onboarding Kit, Retainer Playbook, Sales Collateral, Handoff, AOS
 * Sales Document) were previously out of scope, but the i01 provisioning artifact
 * ("Client Claude Project") requires ALL 18 docs in the client's knowledge base
 * per its spec ("All 18 AI Operating System knowledge docs are uploaded"). The
 * e2e run surfaced i01 as permanently blocked while 13–18 were ungeneratable, so
 * they are now part of `generate --all`. They have specs and clean deps (only
 * doc-16 depends on upstream docs 01–07; the rest are standalone).
 */
export const M1_DOCS: readonly DeliverableId[] = [
  'doc-01', 'doc-02', 'doc-03', 'doc-04', 'doc-05', 'doc-06',
  'doc-07', 'doc-08', 'doc-09', 'doc-10', 'doc-11', 'doc-12',
  'doc-13', 'doc-14', 'doc-15', 'doc-16', 'doc-17', 'doc-18',
];

/**
 * The website tier (Build Spec 10, gap G6): post-fork deliverables generated
 * under the explicit `--web` scope, NOT part of `--all`'s default 01–18 set.
 * Both are HV-gated on `goals.engagementScope.websiteScope` (the doc-10 §9 money
 * decision). `doc-web-prd` is the buildable website-requirements doc; the
 * `design-system` doc + its `tokens.json` feed the new-design path.
 */
export const WEB_DOCS: readonly DeliverableId[] = ['doc-web-prd', 'design-system'];

/**
 * Everything `generate` can produce: the 18 AI Operating System docs (01–18),
 * the website-tier deliverables (`--web`), the pitch teasers (Spec 19 —
 * generated one-by-one by `pitch run`, never via --all/--web), plus the
 * provisioning artifacts (i01–i09, Build Spec 09).
 */
export const GENERATABLE: readonly DeliverableId[] = [
  ...M1_DOCS,
  ...WEB_DOCS,
  ...PITCH_DOCS,
  ...I_SERIES,
];

export function slugifyTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function docFileName(id: DeliverableId, title: string): string {
  return `${id}-${slugifyTitle(title)}.md`;
}

export interface GenerateOptions {
  slug: string;
  id: DeliverableId;
  dryRun: boolean;
  yes: boolean;
  model: string;
  /**
   * Batch reuse hook (M2 `--all`): generate + record the manifest entry but skip
   * the per-doc Continue gate, so `batch.ts` can gate the whole DAG tier at once.
   * Defaults to the single-doc behavior (gate runs). Additive — existing callers
   * are unaffected.
   */
  skipGate?: boolean;
  /**
   * Debug escape (`--full-upstream`): inject upstream docs whole instead of as
   * F1 digests. Reproduces the pre-hardening (overflow-prone) prompt for
   * comparison. Defaults to digests.
   */
  fullUpstream?: boolean;
}

export interface GenerateDeps {
  ds: ClientDataSource;
  call: ClaudeCall;
  log: (msg: string) => void;
  isTty: boolean;
  promptApprove: () => Promise<boolean>;
  now: () => string;
  /**
   * Other clients' identity.publicName values (P2, Build Spec 14): a generated
   * artifact naming one of these is cross-client contamination and fails the
   * identity assert. Optional — callers without a client roster pass nothing
   * and only the own-name presence check runs.
   */
  foreignNames?: string[];
}

export type GenerateStatus = 'generated' | 'reused' | 'blocked' | 'dry-run' | 'error';

export interface GenerateOutcome {
  status: GenerateStatus;
  exitCode: number;
  approved: boolean;
  markers: string[];
  docPath?: string;
  claudeCalls: number;
  /** Word count of the produced doc (set once content exists; for the batch tier report). */
  words?: number;
  /**
   * `[OPERATOR ACTION]` click-ops the engine cannot perform (provisioning only,
   * Build Spec 09). Empty for prose docs (whose prompt never asks for them).
   */
  operatorActions?: string[];
  /** F2 pre-flight prompt-size estimate, set in `--dry-run`. */
  promptSize?: PromptSize;
}

/**
 * The upstream deps to inject for `id`: each approved `requiresDocs` doc passed
 * as a compact F1 digest (default) rather than its full body — the fix for the
 * prompt overflow that capped the prior run at doc-08. `fullUpstream` (the
 * `--full-upstream` debug escape) restores the old whole-body behavior.
 */
async function loadUpstreamDocs(
  ds: ClientDataSource,
  slug: string,
  id: DeliverableId,
  manifest: Manifest,
  fullUpstream: boolean,
): Promise<UpstreamDoc[]> {
  const entry = COVERAGE_MAP.find((d) => d.id === id);
  // Provisioning artifacts are infrastructure runbooks that REFERENCE the AOS
  // docs by title (i01 uploads all 18 to the client's Claude Project; others cite
  // specific deliverables) — they do not synthesize from doc content. Injecting
  // full digests of every requiresDocs dep overflows the prompt at i01's 19-way
  // fan-in, so provisioning gets a title list instead.
  const titleRefs = isProvisioning(id);
  const out: UpstreamDoc[] = [];
  for (const depId of entry?.requiresDocs ?? []) {
    const m = manifest.docs[depId];
    if (!m || !m.approved) continue;
    if (titleRefs) {
      out.push({ id: depId, digest: titleFor(depId) });
    } else if (fullUpstream) {
      const content = await ds.readClientFileText(slug, m.path);
      if (content) out.push({ id: depId, digest: content });
    } else {
      const { digest } = await buildUpstreamDigest(slug, depId, ds);
      if (digest) out.push({ id: depId, digest });
    }
  }
  return out;
}

/**
 * Upstream set for the F2 dry-run estimate. Unlike {@link loadUpstreamDocs},
 * this PROJECTS deps that aren't generated yet as a worst-case digest
 * (DIGEST_MAX_CHARS), so the pre-flight size is an upper bound on the eventual
 * prompt regardless of generation order. Without this, a fresh-tree dry-run (the
 * e2e readiness phase) sees no upstream and reports every doc OK — useless as a
 * gate. Already-generated deps contribute their real (≤ cap) digest.
 */
async function projectedUpstreamDocs(
  ds: ClientDataSource,
  slug: string,
  id: DeliverableId,
  manifest: Manifest,
  fullUpstream: boolean,
): Promise<UpstreamDoc[]> {
  const entry = COVERAGE_MAP.find((d) => d.id === id);
  // Mirror loadUpstreamDocs: provisioning artifacts reference docs by title, so
  // their projected prompt is a title list (tiny), not 19 worst-case digests.
  const titleRefs = isProvisioning(id);
  const out: UpstreamDoc[] = [];
  for (const depId of entry?.requiresDocs ?? []) {
    if (titleRefs) {
      out.push({ id: depId, digest: titleFor(depId) });
      continue;
    }
    const m = manifest.docs[depId];
    if (m && m.approved) {
      if (fullUpstream) {
        const content = await ds.readClientFileText(slug, m.path);
        out.push({ id: depId, digest: content ?? '' });
      } else {
        const { digest } = await buildUpstreamDigest(slug, depId, ds);
        out.push({ id: depId, digest });
      }
    } else {
      // Not generated yet → assume the worst case it will contribute under F1.
      out.push({ id: depId, digest: 'x'.repeat(DIGEST_MAX_CHARS) });
    }
  }
  return out;
}

/**
 * The `generate` orchestration (spec §4), free of oclif so M2's `--all` and the
 * worker can reuse it. Load + gate (readiness, then HV — no force-through),
 * assemble prompts, run one write-mode session into a staging dir, persist
 * through `ClientDataSource`, scan markers, record the manifest entry, and
 * resolve the Continue gate. `--dry-run` returns before any `claude` call.
 */
export async function runGenerate(
  opts: GenerateOptions,
  deps: GenerateDeps,
): Promise<GenerateOutcome> {
  const { ds, log } = deps;
  const fail = (msg: string, claudeCalls = 0): GenerateOutcome => {
    log(msg);
    return { status: 'error', exitCode: 2, approved: false, markers: [], claudeCalls };
  };

  if (!GENERATABLE.includes(opts.id)) {
    return fail(
      `Deliverable ${opts.id} is out of scope for generation. Generatable: docs 01–18 (--all), the website tier doc-web-prd/design-system (--web), and provisioning i01–i09 (--all --provisioning).`,
    );
  }
  const profile = await readProfile(ds, opts.slug);
  if (!profile) {
    return fail(`No profile for "${opts.slug}". Run: upriver profile import ${opts.slug} <file>`);
  }

  const manifest = await readManifest(ds, opts.slug);
  const generated = generatedIds(manifest);
  const readiness = deliverableReadiness(profile, opts.id, generated);

  const title = titleFor(opts.id);
  const spec = loadDeliverableSpec(opts.id);
  const sliceText = renderSlice(profileSlice(profile, opts.id));
  const specHash = hashContent(spec);
  const profileSliceHash = hashContent(sliceText);
  const outputFileName = docFileName(opts.id, title);
  const docPath = `docs/${outputFileName}`;
  const upstreamDocs = await loadUpstreamDocs(ds, opts.slug, opts.id, manifest, opts.fullUpstream ?? false);
  // Spec 19: teasers are built from recon artifacts, not profile fields — the
  // audit findings / homepage copy / vertical pack ride in as extra context.
  const extraUserContext = isPitchDoc(opts.id)
    ? await buildPitchContext(ds, opts.slug)
    : undefined;
  const prompt = buildPrompt({
    id: opts.id,
    profile,
    outputPath: outputFileName,
    upstreamDocs,
    ...(extraUserContext !== undefined ? { extraUserContext } : {}),
  });

  if (opts.dryRun) {
    // Estimate against the PROJECTED worst-case prompt (ungenerated deps padded
    // to the digest cap), so the pre-flight catches overflow on a fresh tree.
    const projected = await projectedUpstreamDocs(ds, opts.slug, opts.id, manifest, opts.fullUpstream ?? false);
    const projectedPrompt = buildPrompt({
      id: opts.id,
      profile,
      outputPath: outputFileName,
      upstreamDocs: projected,
      ...(extraUserContext !== undefined ? { extraUserContext } : {}),
    });
    const size = assessPromptSize(opts.id, projectedPrompt.system, projectedPrompt.user);
    log(renderReadiness(opts.id, readiness));
    log('');
    log('Assembled prompts (no claude invocation in --dry-run; upstream projected at worst case):');
    log(`  system prompt: ${projectedPrompt.system.length} chars`);
    log(`  user prompt:   ${projectedPrompt.user.length} chars (${projected.length} upstream deps projected)`);
    log(`  est. tokens:   ${size.estTokens} / ${size.ceiling} ceiling — ${size.overCeiling ? 'FAIL' : 'OK'}`);
    return {
      status: 'dry-run',
      exitCode: size.overCeiling ? 2 : 0,
      approved: false,
      markers: [],
      docPath,
      claudeCalls: 0,
      promptSize: size,
    };
  }

  if (!readiness.ready) {
    log(renderReadiness(opts.id, readiness));
    return { status: 'blocked', exitCode: 1, approved: false, markers: [], docPath, claudeCalls: 0 };
  }

  // Re-run free: unchanged spec + slice and the doc still present → reuse it.
  const prior = manifest.docs[opts.id];
  const unchanged =
    !!prior &&
    prior.specHash === specHash &&
    prior.profileSliceHash === profileSliceHash &&
    (await ds.fileExists(opts.slug, prior.path));

  let content: string;
  let fromCache = false;
  let claudeCalls = 0;
  if (unchanged && prior) {
    content = (await ds.readClientFileText(opts.slug, prior.path)) ?? '';
    fromCache = true;
  } else {
    const result = await runDoc(
      {
        slug: opts.slug,
        id: opts.id,
        model: opts.model,
        systemPrompt: prompt.system,
        userPrompt: prompt.user,
        outputFileName,
        specHash,
        profileSliceHash,
      },
      deps.call,
    );
    claudeCalls = 1;
    content = result.content;
    fromCache = result.fromCache;

    // P2 (Build Spec 14): a fresh artifact must name THIS client and no other.
    // Reused content (the `unchanged` path) was already asserted when generated.
    const nameEnv = nearestEnvelope(profile as unknown as Record<string, unknown>, 'identity.publicName');
    if (typeof nameEnv?.value === 'string' && nameEnv.value.trim().length > 0) {
      try {
        assertIdentity({ content, publicName: nameEnv.value, foreignNames: deps.foreignNames ?? [] });
      } catch (err) {
        return fail(`${opts.id}: ${(err as Error).message}`, claudeCalls);
      }
    }

    await ds.writeClientFile(opts.slug, docPath, content);
  }

  const markers = scanMarkers(content);
  const operatorActions = scanOperatorActions(content);
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const priorApproved = prior?.approved ?? false;
  const entry: ManifestEntry = {
    id: opts.id,
    path: docPath,
    generatedAt: deps.now(),
    specHash,
    profileSliceHash,
    markers: markers.length,
    approved: priorApproved,
  };
  let nextManifest = upsertEntry(manifest, entry);

  // Batch mode: record the entry (prior approval untouched) and return a terse
  // line — `batch.ts` aggregates markers and gates the whole tier.
  if (opts.skipGate) {
    log(renderDocLine({ id: opts.id, docPath, content, markers, fromCache }));
    await writeManifest(ds, opts.slug, nextManifest);
    return {
      status: unchanged ? 'reused' : 'generated',
      exitCode: 0,
      approved: priorApproved,
      markers,
      operatorActions,
      docPath,
      claudeCalls,
      words,
    };
  }

  log(
    renderGenerationReport({
      id: opts.id,
      docPath,
      content,
      markers,
      operatorActions,
      fromCache,
      nowUnblocked: newlyUnblocked(profile, generated, opts.id),
    }),
  );
  log('');

  const decision = resolveGateDecision({
    yes: opts.yes,
    isTty: deps.isTty,
    priorApproved,
    gateAuto: process.env.UPRIVER_GATE_AUTO === '1',
  });
  let approved = priorApproved;
  switch (decision) {
    case 'auto-approve':
      approved = true;
      log('Auto-approved (--yes; this doc was previously approved).');
      break;
    case 'auto-approve-gate':
      approved = true;
      log('[gate] AUTO-APPROVED (UPRIVER_GATE_AUTO) — unattended/synthetic runs only.');
      break;
    case 'refuse-yes':
      log('Refusing --yes on a never-approved doc. Review it and approve interactively (or re-run --yes once approved).');
      break;
    case 'skip-non-tty':
      log(`Not a TTY; leaving ${opts.id} unapproved. Re-run in a terminal to approve at the gate.`);
      break;
    case 'prompt':
      approved = await deps.promptApprove();
      log(approved ? `Approved ${opts.id}.` : `Left ${opts.id} unapproved. Edit ${docPath} and re-run, or approve later.`);
      break;
  }

  nextManifest = setApproved(nextManifest, opts.id, approved);
  await writeManifest(ds, opts.slug, nextManifest);

  return {
    status: unchanged ? 'reused' : 'generated',
    exitCode: 0,
    approved,
    markers,
    operatorActions,
    docPath,
    claudeCalls,
    words,
  };
}
