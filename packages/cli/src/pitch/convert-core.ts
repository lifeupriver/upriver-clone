// `pitch convert` core (Spec 19 §2): the upsell bridge. Flips the prospect's
// `stage` to `client` and maps their questionnaire answers into profile
// candidate fields. All artifact IO goes through ClientDataSource so the
// logic is testable with a fake and identical under local/Supabase.

import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { createEmptyProfile, type ClientProfile } from '@upriver/schemas';
import type { ClientDataSource } from '@upriver/core/data';
import type { ClientConfig } from '@upriver/core';
import { appendConflicts, readProfile, writeProfile, bumpMeta } from '../generate/profile-io.js';
import { applyProspectAnswers, type AnswerOutcome } from './answer-mapping.js';

export interface ConvertResult {
  /** false when the config was already stage: client (idempotent re-run). */
  flipped: boolean;
  outcomes: AnswerOutcome[];
  conflicts: number;
  /** true when no answers existed and --no-answers allowed proceeding. */
  withoutAnswers: boolean;
}

interface ResponsesFile {
  answers?: Record<string, string>;
}

export async function convertProspect(
  ds: ClientDataSource,
  slug: string,
  opts: { noAnswers?: boolean; now?: string } = {},
): Promise<ConvertResult> {
  const now = opts.now ?? new Date().toISOString();

  const configRaw = await ds.readClientFileText(slug, 'client-config.yaml');
  if (configRaw === null) {
    throw new Error(`No client-config.yaml for "${slug}" — is this a pitch prospect?`);
  }
  const config = parseYaml(configRaw) as ClientConfig;
  const alreadyClient = config.stage !== 'prospect';

  const responsesRaw = await ds.readClientFileText(slug, 'interview-responses.json');
  let answers: Record<string, string> = {};
  if (responsesRaw !== null) {
    try {
      answers = (JSON.parse(responsesRaw) as ResponsesFile).answers ?? {};
    } catch {
      throw new Error(`${slug}/interview-responses.json is not valid JSON`);
    }
  }
  const hasAnswers = Object.values(answers).some((v) => typeof v === 'string' && v.trim() !== '');
  if (!hasAnswers && !opts.noAnswers) {
    throw new Error(
      `No questionnaire answers found for "${slug}". The prospect has not engaged yet — convert anyway with --no-answers.`,
    );
  }

  let outcomes: AnswerOutcome[] = [];
  let conflictCount = 0;
  if (hasAnswers) {
    const existing: ClientProfile =
      (await readProfile(ds, slug)) ?? createEmptyProfile(slug, now);
    const { profile, outcomes: o, conflicts } = applyProspectAnswers(existing, answers, now);
    outcomes = o;
    conflictCount = conflicts.length;
    if (outcomes.some((x) => x.kind === 'filled')) {
      await writeProfile(ds, slug, bumpMeta(profile, now));
    }
    await appendConflicts(ds, slug, conflicts);
  }

  if (!alreadyClient) {
    const updated: ClientConfig = { ...config, stage: 'client' };
    await ds.writeClientFile(slug, 'client-config.yaml', stringifyYaml(updated));
  }

  return {
    flipped: !alreadyClient,
    outcomes,
    conflicts: conflictCount,
    withoutAnswers: !hasAnswers,
  };
}
