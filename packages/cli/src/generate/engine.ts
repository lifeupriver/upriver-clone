import {
  COVERAGE_MAP,
  deliverableReadiness,
  type DeliverableId,
} from '@upriver/schemas';
import type { ClientDataSource } from '@upriver/core/data';

import { resolveGateDecision } from './gate.js';
import { scanMarkers } from './markers.js';
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
import { readProfile } from './profile-io.js';
import { profileSlice, renderSlice } from './profile-slice.js';
import { buildPrompt, type UpstreamDoc } from './prompt-builder.js';
import { newlyUnblocked, renderGenerationReport, renderReadiness, titleFor } from './report.js';
import { runDoc, type ClaudeCall } from './runner.js';
import { loadDeliverableSpec } from './spec-loader.js';

/** The M1 generation scope — single docs, 01–12 (PRD §8 / spec §1). */
export const M1_DOCS: readonly DeliverableId[] = [
  'doc-01', 'doc-02', 'doc-03', 'doc-04', 'doc-05', 'doc-06',
  'doc-07', 'doc-08', 'doc-09', 'doc-10', 'doc-11', 'doc-12',
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
}

export interface GenerateDeps {
  ds: ClientDataSource;
  call: ClaudeCall;
  log: (msg: string) => void;
  isTty: boolean;
  promptApprove: () => Promise<boolean>;
  now: () => string;
}

export type GenerateStatus = 'generated' | 'reused' | 'blocked' | 'dry-run' | 'error';

export interface GenerateOutcome {
  status: GenerateStatus;
  exitCode: number;
  approved: boolean;
  markers: string[];
  docPath?: string;
  claudeCalls: number;
}

async function loadUpstreamDocs(
  ds: ClientDataSource,
  slug: string,
  id: DeliverableId,
  manifest: Manifest,
): Promise<UpstreamDoc[]> {
  const entry = COVERAGE_MAP.find((d) => d.id === id);
  const out: UpstreamDoc[] = [];
  for (const depId of entry?.requiresDocs ?? []) {
    const m = manifest.docs[depId];
    if (!m || !m.approved) continue;
    const content = await ds.readClientFileText(slug, m.path);
    if (content) out.push({ id: depId, content });
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
  const fail = (msg: string): GenerateOutcome => {
    log(msg);
    return { status: 'error', exitCode: 2, approved: false, markers: [], claudeCalls: 0 };
  };

  if (!M1_DOCS.includes(opts.id)) {
    return fail(
      `Deliverable ${opts.id} is out of scope for this build (M1 = doc-01..doc-12). --all, provisioning (i01–i09), and docs 13–18 land in later specs.`,
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
  const upstreamDocs = await loadUpstreamDocs(ds, opts.slug, opts.id, manifest);
  const prompt = buildPrompt({ id: opts.id, profile, outputPath: outputFileName, upstreamDocs });

  if (opts.dryRun) {
    log(renderReadiness(opts.id, readiness));
    log('');
    log('Assembled prompts (no claude invocation in --dry-run):');
    log(`  system prompt: ${prompt.system.length} chars`);
    log(`  user prompt:   ${prompt.user.length} chars`);
    log(`  upstream docs: ${upstreamDocs.length}`);
    return { status: 'dry-run', exitCode: 0, approved: false, markers: [], docPath, claudeCalls: 0 };
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
    await ds.writeClientFile(opts.slug, docPath, content);
  }

  const markers = scanMarkers(content);
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

  log(
    renderGenerationReport({
      id: opts.id,
      docPath,
      content,
      markers,
      fromCache,
      nowUnblocked: newlyUnblocked(profile, generated, opts.id),
    }),
  );
  log('');

  const decision = resolveGateDecision({ yes: opts.yes, isTty: deps.isTty, priorApproved });
  let approved = priorApproved;
  switch (decision) {
    case 'auto-approve':
      approved = true;
      log('Auto-approved (--yes; this doc was previously approved).');
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
    docPath,
    claudeCalls,
  };
}
