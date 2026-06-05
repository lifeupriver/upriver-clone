/**
 * Dashboard-side Client Profile coverage: the operator coverage view's model and
 * the chatbot's gap computation + write path. Two surfaces over the one profile,
 * both through the existing `ClientDataSource` (never a direct Supabase client —
 * PRD §7 trust boundary).
 *
 * The coverage view renders the SAME `ShowModel` the CLI's `profile show --json`
 * emits, via the builder promoted to `@upriver/schemas` (Build Spec 06 §1a
 * decision) — so the two surfaces cannot drift.
 */
import type { ClientDataSource } from '@upriver/core/data';
import {
  MUST_ASK,
  buildShowModel,
  clientProfileZ,
  conflictEntry,
  fieldFilled,
  isHumanVerifyRequired,
  mergeCandidate,
  nearestEnvelope,
  questionQueue,
  type ClientProfile,
  type ConflictEntry,
  type DeliverableId,
  type Manifest,
  type ProfileField,
  type ShowModel,
} from '@upriver/schemas';

import { resolveClientDataSource } from './data-source.js';

const PROFILE_PATH = 'profile.json';
const CONFLICTS_PATH = 'profile-conflicts.json';
const MANIFEST_PATH = 'docs/manifest.json';
const RESPONSES_PATH = 'interview-responses.json';

/** The 01–12 core docs — the default engagement scope the chatbot orders its gap against. */
const DOC_SCOPE: DeliverableId[] = [
  'doc-01', 'doc-02', 'doc-03', 'doc-04', 'doc-05', 'doc-06',
  'doc-07', 'doc-08', 'doc-09', 'doc-10', 'doc-11', 'doc-12',
];

// ── Profile + manifest + conflicts I/O (all through ClientDataSource) ─────────

export async function readProfile(ds: ClientDataSource, slug: string): Promise<ClientProfile | null> {
  const text = await ds.readClientFileText(slug, PROFILE_PATH);
  if (text === null) return null;
  return clientProfileZ.parse(JSON.parse(text));
}

async function writeProfile(ds: ClientDataSource, slug: string, profile: ClientProfile): Promise<void> {
  await ds.writeClientFile(slug, PROFILE_PATH, `${JSON.stringify(profile, null, 2)}\n`);
}

async function readManifest(ds: ClientDataSource, slug: string): Promise<Manifest> {
  const text = await ds.readClientFileText(slug, MANIFEST_PATH);
  if (text === null) return { version: 1, docs: {} };
  try {
    const parsed = JSON.parse(text) as Partial<Manifest>;
    return parsed.docs ? { version: 1, docs: parsed.docs } : { version: 1, docs: {} };
  } catch {
    return { version: 1, docs: {} };
  }
}

async function readConflicts(ds: ClientDataSource, slug: string): Promise<ConflictEntry[]> {
  const text = await ds.readClientFileText(slug, CONFLICTS_PATH);
  if (text === null) return [];
  try {
    return JSON.parse(text) as ConflictEntry[];
  } catch {
    return [];
  }
}

/** Build the coverage view model (the dashboard mirror of `profile show --json`). */
export async function loadCoverageModel(slug: string): Promise<ShowModel | null> {
  const ds = resolveClientDataSource();
  const profile = await readProfile(ds, slug);
  if (!profile) return null;
  const [manifest, conflicts] = await Promise.all([readManifest(ds, slug), readConflicts(ds, slug)]);
  return buildShowModel(profile, manifest, conflicts);
}

// ── The chatbot gap + whitelist (PRD §3.5 "chatbot gap-fill" bucket) ──────────

/** Plain-language labels for the chatbot-fillable fields (for the gap prompt). */
const FIELD_LABELS: Record<string, string> = {
  'people.keyTeam': 'key team members — names and roles',
  'operationsAutomation.recurringTasks': 'recurring operational tasks the team handles (and how often)',
  'content.productionCapacity': 'who creates your content and roughly how many hours per week',
};

/**
 * The chatbot-fillable whitelist: the must-ask fields routed to the chatbot
 * (PRD §3.5) MINUS any that are human-verify-required. HV/credential/money
 * fields are operator-only and the endpoint rejects them, so they never enter
 * this set even though §3.5 lists some under "chatbot gap-fill".
 */
export const CHATBOT_FILLABLE: string[] = MUST_ASK
  .filter((e) => e.askVia === 'chatbot' && !isHumanVerifyRequired(e.path))
  .map((e) => e.path);

/** Is `path` a field the chatbot is allowed to write? (The endpoint's whitelist.) */
export function isChatbotFillable(path: string): boolean {
  return CHATBOT_FILLABLE.includes(path) && !isHumanVerifyRequired(path);
}

export interface GapField {
  path: string;
  label: string;
  unblocksCount: number;
}

/**
 * The chatbot's question gap: chatbot-fillable must-ask fields not yet filled,
 * ordered by how many in-scope deliverables each unblocks (descending). Reuses
 * `@upriver/schemas` `questionQueue`, then narrows to the chatbot bucket.
 */
export function chatbotGap(profile: ClientProfile, scope: DeliverableId[] = DOC_SCOPE): GapField[] {
  return questionQueue(profile, scope)
    .filter((q) => q.askVia === 'chatbot' && isChatbotFillable(q.path))
    .map((q) => ({ path: q.path, label: FIELD_LABELS[q.path] ?? q.path, unblocksCount: q.unblocksCount }));
}

// ── The write path (source:'interview', through the data source) ──────────────

export type WriteResult =
  | { ok: true; path: string; revision: number }
  | { ok: false; path: string; reason: string };

/**
 * Validate `value` for `path` against `clientProfileZ` by probing a minimal
 * profile with the value placed at the path. Handles the depth-2 `section.leaf`
 * shape of every chatbot-fillable field; rejects anything deeper. Returns the
 * zod-parsed (cleaned) value on success.
 */
export function validateLeafValue(
  path: string,
  value: unknown,
  now: string,
): { ok: true; value: unknown } | { ok: false } {
  const segs = path.split('.');
  if (segs.length !== 2) return { ok: false };
  const [section, leaf] = segs as [string, string];
  const envelope = { value, source: 'interview' as const, confidence: 'medium' as const, verified: false, updatedAt: now };
  const probe = {
    _meta: { version: 1, slug: 'probe', createdAt: now, updatedAt: now, revision: 1 },
    [section]: { [leaf]: envelope },
  };
  const parsed = clientProfileZ.safeParse(probe);
  if (!parsed.success) return { ok: false };
  const parsedSection = (parsed.data as unknown as Record<string, Record<string, ProfileField<unknown>>>)[section];
  const parsedEnv = parsedSection?.[leaf];
  if (!parsedEnv || parsedEnv.value === undefined) return { ok: false };
  return { ok: true, value: parsedEnv.value };
}

function setLeaf(profile: ClientProfile, path: string, field: ProfileField<unknown>): ClientProfile {
  const [section, leaf] = path.split('.') as [string, string];
  const root = structuredClone(profile) as unknown as Record<string, Record<string, unknown>>;
  const sec = (root[section] ?? {}) as Record<string, unknown>;
  root[section] = { ...sec, [leaf]: field };
  return root as unknown as ClientProfile;
}

async function appendProvenance(
  ds: ClientDataSource,
  slug: string,
  entry: { path: string; value: unknown; evidence?: string; at: string },
): Promise<void> {
  const text = await ds.readClientFileText(slug, RESPONSES_PATH);
  let file: Record<string, unknown> = {};
  if (text !== null) {
    try {
      file = JSON.parse(text) as Record<string, unknown>;
    } catch {
      file = {};
    }
  }
  const log = Array.isArray(file['chatbotFills']) ? (file['chatbotFills'] as unknown[]) : [];
  file['chatbotFills'] = [...log, entry];
  await ds.writeClientFile(slug, RESPONSES_PATH, `${JSON.stringify(file, null, 2)}\n`);
}

/**
 * Merge a chatbot-captured answer as `source:'interview'` through the data source
 * (revision bump; conflicts queue to `profile-conflicts.json`, never overwrite a
 * higher-precedence value). `mergeCandidate` keeps `verified:false` — this path
 * can never set `verified`. The trust-boundary gate (token, whitelist, HV,
 * operator-source, verified) lives in the endpoint; this is the mechanical write.
 */
export async function mergeInterviewField(
  ds: ClientDataSource,
  slug: string,
  path: string,
  value: unknown,
  evidence: string | undefined,
  now: string,
): Promise<WriteResult> {
  const valid = validateLeafValue(path, value, now);
  if (!valid.ok) return { ok: false, path, reason: 'value does not match the profile schema for this field' };

  const profile = await readProfile(ds, slug);
  if (!profile) return { ok: false, path, reason: 'no profile for this client' };

  const existing = nearestEnvelope(profile as unknown as Record<string, unknown>, path);
  const outcome = mergeCandidate(existing, { value: valid.value, source: 'interview', ...(evidence ? { evidence } : {}) }, now);

  if (outcome.kind === 'conflict') {
    const prior = await readConflicts(ds, slug);
    await ds.writeClientFile(
      slug,
      CONFLICTS_PATH,
      `${JSON.stringify([...prior, conflictEntry(path, outcome, now)], null, 2)}\n`,
    );
    return { ok: false, path, reason: 'queued for operator review (a higher-precedence value already exists)' };
  }

  const revision = profile._meta.revision + 1;
  const next = setLeaf(profile, path, outcome.field);
  next._meta = { ...next._meta, revision, updatedAt: now };
  await writeProfile(ds, slug, next);
  await appendProvenance(ds, slug, { path, value: valid.value, ...(evidence ? { evidence } : {}), at: now });
  return { ok: true, path, revision };
}
