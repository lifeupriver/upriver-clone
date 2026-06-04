import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { COVERAGE_MAP, type DeliverableId } from '@upriver/schemas';

/**
 * Where the deliverable production specs live. Defaults to the repo's
 * `specs-reference/`; override with `UPRIVER_SPECS_DIR`. These are build inputs
 * (repo files), not client artifacts, so plain `fs` is appropriate here.
 */
export function specsReferenceDir(): string {
  return process.env['UPRIVER_SPECS_DIR'] ?? '.planning/intake-profile-engine/specs-reference';
}

/** Absolute-or-relative path to a deliverable's production spec markdown. */
export function specPathFor(id: DeliverableId): string {
  const entry = COVERAGE_MAP.find((d) => d.id === id);
  if (!entry) throw new Error(`Unknown deliverable: ${id}`);
  return join(specsReferenceDir(), entry.specPath);
}

/** Load a deliverable's production spec markdown (the headless session's system prompt body). */
export function loadDeliverableSpec(id: DeliverableId): string {
  const path = specPathFor(id);
  if (!existsSync(path)) {
    throw new Error(
      `Deliverable spec not found at ${path}. Set UPRIVER_SPECS_DIR if your specs-reference lives elsewhere.`,
    );
  }
  return readFileSync(path, 'utf8');
}

/**
 * The Upriver house voice rules for generated client documents (spec §4 / build
 * prompt). A constant for now; the client's own generated Doc 01 is later
 * consumed as an upstream document, not as a system-prompt rule.
 */
export const BRAND_VOICE_RULES = [
  'Upriver house voice rules for generated client documents:',
  '- Write in first-person singular ("I", not "we") as the consultant speaking.',
  '- No em dashes. Use commas, periods, or parentheses instead.',
  '- No marketing clichés or hype words (e.g. "game-changing", "seamless", "world-class", "unlock", "elevate", "supercharge").',
  '- Use real, specific tool and product names; never vague placeholders.',
  '- Sentence case in body text and headings; reserve Title Case for proper nouns.',
  "- Concrete over abstract: cite the profile's actual facts, numbers, and quotes.",
].join('\n');

export function loadBrandVoiceRules(): string {
  return BRAND_VOICE_RULES;
}
