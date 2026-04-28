import { execSync } from 'node:child_process';
import { locateSkill } from './skill-loader.js';

export interface PreflightResult {
  ok: boolean;
  available: { lighthouse: boolean; squirrelscan: boolean };
  skills: { impeccable: boolean; accessibility: boolean; coreWebVitals: boolean; webQualityAudit: boolean; auditWebsite: boolean };
  anthropicKey: boolean;
  warnings: string[];
}

function hasBinary(name: string): boolean {
  try {
    execSync(`command -v ${name}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function runPreflight(): PreflightResult {
  const lighthouse = hasBinary('lighthouse');
  const squirrelscan = hasBinary('squirrelscan');
  const anthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);

  const skills = {
    impeccable: Boolean(locateSkill('impeccable')),
    accessibility: Boolean(locateSkill('accessibility')),
    coreWebVitals: Boolean(locateSkill('core-web-vitals')),
    webQualityAudit: Boolean(locateSkill('web-quality-audit')),
    auditWebsite: Boolean(locateSkill('audit-website')),
  };

  const warnings: string[] = [];
  if (!lighthouse) warnings.push('lighthouse CLI not found — install with `npm i -g lighthouse`. Web-quality pass will be skipped.');
  if (!squirrelscan) warnings.push('squirrelscan CLI not found — install per https://skills.sh/squirrelscan/skills/audit-website. Audit-website pass will be skipped.');
  if (!anthropicKey) warnings.push('ANTHROPIC_API_KEY not set — design-deep, accessibility-deep, and CWV-deep passes will be skipped.');
  for (const [skill, present] of Object.entries(skills)) {
    if (!present) warnings.push(`Skill "${skill}" not installed — its pass will be skipped. Install with: npx skills add <owner/repo>`);
  }

  return {
    ok: warnings.length === 0,
    available: { lighthouse, squirrelscan },
    skills,
    anthropicKey,
    warnings,
  };
}
