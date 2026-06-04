import { COVERAGE_MAP, type ClientProfile, type DeliverableId } from '@upriver/schemas';

import { profileSlice, renderSlice } from './profile-slice.js';
import { loadBrandVoiceRules, loadDeliverableSpec } from './spec-loader.js';

/** The instruction that keeps the model from papering over a thin profile (spec §4). */
export const MARKER_INSTRUCTION =
  'Where the profile is ambiguous, thin, or silent on something the spec requires, write [NEEDS CONFIRMATION: <specific question>] inline rather than inventing facts.';

export interface UpstreamDoc {
  id: DeliverableId;
  content: string;
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
}

/**
 * Assemble the system prompt (deliverable spec + brand voice rules + marker
 * instruction + output contract) and the user prompt (profile slice + upstream
 * doc contents) for one generation session (spec §4).
 */
export function buildPrompt(input: BuildPromptInput): BuiltPrompt {
  const title = COVERAGE_MAP.find((d) => d.id === input.id)?.title ?? input.id;
  const spec = loadDeliverableSpec(input.id);

  const system = [
    `You are producing the "${title}" deliverable for an Upriver Consulting client, following the production spec below exactly.`,
    [
      '## Output contract',
      `Write the deliverable to a single new Markdown file in your current working directory. Name it per the spec's file-naming convention (a reasonable default is ${input.outputPath}).`,
      "The file must follow the spec's section template and structure.",
      'Write only the document into that file. Do not print the document to the conversation; your reply should be a short summary only.',
      MARKER_INSTRUCTION,
    ].join('\n'),
    `## Brand voice rules\n${loadBrandVoiceRules()}`,
    `## Deliverable production spec\n${spec}`,
  ].join('\n\n');

  const sliceText = renderSlice(profileSlice(input.profile, input.id));
  const upstream =
    input.upstreamDocs.length > 0
      ? input.upstreamDocs.map((d) => `### Upstream document: ${d.id}\n\n${d.content}`).join('\n\n')
      : '(no upstream documents are required for this deliverable)';

  const user = [
    '## Client profile (the facts to build from — cite these, do not invent)',
    sliceText,
    '## Upstream documents (already generated — use as context, do not restate wholesale)',
    upstream,
  ].join('\n\n');

  return { system, user };
}
