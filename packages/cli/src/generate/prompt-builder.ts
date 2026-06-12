import { COVERAGE_MAP, type ClientProfile, type DeliverableId } from '@upriver/schemas';

import { profileSlice, renderSlice } from './profile-slice.js';
import { isProvisioning, provisioningOutputContract } from './provisioning.js';
import { loadBrandVoiceRules, loadDeliverableSpec } from './spec-loader.js';

/** The instruction that keeps the model from papering over a thin profile (spec §4). */
export const MARKER_INSTRUCTION =
  'Where the profile is ambiguous, thin, or silent on something the spec requires, write [NEEDS CONFIRMATION: <specific question>] inline rather than inventing facts.';

/**
 * P1 (Build Spec 14): the recon trust boundary at generation time. The slice
 * tags unverified low/medium-confidence recon values with [UNCONFIRMED]
 * (profile-slice.ts UNCONFIRMED_TAG); this rule teaches every generator —
 * doc-01, the DAG root, most of all — to hedge them instead of adopting them
 * as identity (the Montessori metastasis, 13-e2e-live-evaluation.md).
 */
export const UNCONFIRMED_INSTRUCTION =
  'Profile fields tagged [UNCONFIRMED] are automated web-recon findings the client has not confirmed. ' +
  'They may inform your work but must NEVER be asserted as fact, identity, or positioning. Either hedge ' +
  'them explicitly ("appears to be", "according to its online listing") or restate them inside a ' +
  '[NEEDS CONFIRMATION: <specific question>] marker. Never build structure (keyword sets, competitive ' +
  'positioning, vocabulary rules) on an [UNCONFIRMED] field without flagging that dependency.';

export interface UpstreamDoc {
  id: DeliverableId;
  /**
   * What to inject for this upstream dep: a compact structural DIGEST (F1,
   * Build Spec 11) — its headings, section ledes, and lists — not the full
   * body. The engine builds it via `buildUpstreamDigest`; `--full-upstream`
   * (debug) puts the whole body here instead. Passing full bodies is what made
   * the prompt overflow down the DAG (07-e2e finding D8).
   */
  digest: string;
}

export interface BuiltPrompt {
  system: string;
  user: string;
}

export interface BuildPromptInput {
  id: DeliverableId;
  profile: ClientProfile;
  /** Relative path (inside the session's cwd) the model must write the doc to. */
  outputPath: string;
  /** Already-generated upstream docs this deliverable depends on. */
  upstreamDocs: UpstreamDoc[];
  /**
   * Extra user-prompt context for deliverables whose inputs are not profile
   * fields — the pitch teasers (Spec 19) inject audit findings, scraped
   * homepage copy, and the vertical pack here. The session cwd is an empty
   * staging dir, so this is the only road in.
   */
  extraUserContext?: string;
}

/**
 * Assemble the system prompt (deliverable spec + brand voice rules + marker
 * instruction + output contract) and the user prompt (profile slice + upstream
 * doc contents) for one generation session (spec §4).
 */
export function buildPrompt(input: BuildPromptInput): BuiltPrompt {
  const title = COVERAGE_MAP.find((d) => d.id === input.id)?.title ?? input.id;
  const spec = loadDeliverableSpec(input.id);

  // Provisioning artifacts (i01–i09) have a different output shape than prose
  // docs (PRD §6): one file holding the config + an operator runbook + a
  // cannot-generate checklist, with the second `[OPERATOR ACTION]` marker class.
  // The branch fires only for i-series ids; the doc path is byte-identical.
  const intro = isProvisioning(input.id)
    ? `You are producing the "${title}" client provisioning artifact for an Upriver Consulting engagement, following the infrastructure spec below exactly. This artifact configures part of the client's Claude environment; many steps happen inside the client's Anthropic account and cannot be done from a file.`
    : `You are producing the "${title}" deliverable for an Upriver Consulting client, following the production spec below exactly.`;
  const outputContract = isProvisioning(input.id)
    ? provisioningOutputContract(input.outputPath, `${MARKER_INSTRUCTION}\n${UNCONFIRMED_INSTRUCTION}`)
    : [
        '## Output contract',
        `Write the deliverable to a single new Markdown file in your current working directory. Name it per the spec's file-naming convention (a reasonable default is ${input.outputPath}).`,
        'Use a RELATIVE path inside the working directory (e.g. `./' +
          input.outputPath +
          '`). Do NOT write to an absolute path or anywhere outside this directory — a file written elsewhere will not be found.',
        "The file must follow the spec's section template and structure.",
        'Write only the document into that file. Do not print the document to the conversation; your reply should be a short summary only.',
        MARKER_INSTRUCTION,
        UNCONFIRMED_INSTRUCTION,
      ].join('\n');

  const system = [
    intro,
    outputContract,
    `## Brand voice rules\n${loadBrandVoiceRules()}`,
    `## Deliverable production spec\n${spec}`,
  ].join('\n\n');

  const sliceText = renderSlice(profileSlice(input.profile, input.id));
  const upstream =
    input.upstreamDocs.length > 0
      ? input.upstreamDocs.map((d) => `### Upstream document digest: ${d.id}\n\n${d.digest}`).join('\n\n')
      : '(no upstream documents are required for this deliverable)';

  const user = [
    '## Client profile (the facts to build from — cite these, do not invent)',
    sliceText,
    '## Upstream document digests (structure + key facts of the already-generated deps — use as context, do not restate)',
    upstream,
    ...(input.extraUserContext
      ? ['## Pitch recon context (automated findings — hedge per the [UNCONFIRMED] rule)', input.extraUserContext]
      : []),
  ].join('\n\n');

  return { system, user };
}
