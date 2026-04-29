import Anthropic from '@anthropic-ai/sdk';
import type { AuditPassResult } from '@upriver/core';
import { runSkillPass } from './skill-pass.js';

export async function runCoreWebVitalsDeep(
  slug: string,
  clientDir: string,
  opts: { anthropic: Anthropic; log: (msg: string) => void },
): Promise<AuditPassResult> {
  return runSkillPass(slug, clientDir, {
    skillName: 'core-web-vitals',
    dimension: 'core-web-vitals',
    sampleSize: 2,
    includeHtml: true,
    anthropic: opts.anthropic,
    log: opts.log,
    systemRole:
      'You are a Core Web Vitals optimization expert. Inspect HTML and screenshots to predict and diagnose LCP, INP, and CLS issues, then recommend specific fixes.',
    taskDescription:
      'Audit this page for Core Web Vitals risks: LCP (largest contentful paint — render-blocking resources, unoptimized hero images, font loading strategy), INP (interaction responsiveness — heavy JS on main thread, large input handlers), and CLS (layout shift — images without dimensions, late-loading fonts, dynamic content insertion).',
  });
}
