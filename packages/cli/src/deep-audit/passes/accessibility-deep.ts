import Anthropic from '@anthropic-ai/sdk';
import type { AuditPassResult } from '@upriver/core';
import { runSkillPass } from './skill-pass.js';

export async function runAccessibilityDeep(
  slug: string,
  clientDir: string,
  opts: { anthropic: Anthropic; log: (msg: string) => void },
): Promise<AuditPassResult> {
  return runSkillPass(slug, clientDir, {
    skillName: 'accessibility',
    dimension: 'accessibility',
    sampleSize: 4,
    includeHtml: true,
    anthropic: opts.anthropic,
    log: opts.log,
    systemRole:
      'You are an accessibility expert applying WCAG 2.2 AA standards. Identify violations from screenshots and HTML markup. Be specific about which success criterion each violation breaks.',
    taskDescription:
      'Audit this page against WCAG 2.2 AA. Look for: missing alt text, color contrast failures, missing form labels, heading hierarchy breaks, missing skip links, keyboard traps, ARIA misuse, missing landmarks, focus order problems, decorative images marked semantic, links without accessible names.',
  });
}
