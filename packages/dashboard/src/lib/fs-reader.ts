import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { ClientConfig } from '@upriver/core';
import type { AuditFinding, AuditPassResult, ClientIntake } from '@upriver/core';
import { detectStage, type PipelineStage } from './pipeline.js';

export interface ClientSummary {
  config: ClientConfig;
  pipelineStage: PipelineStage;
  overallScore: number | null;
  p0Count: number;
  p1Count: number;
  p2Count: number;
  hasDesignBrief: boolean;
  hasQaReport: boolean;
  hasLaunchChecklist: boolean;
}

export interface AuditSummary {
  scores: Record<string, number>;
  overall: number;
  total_findings: number;
  p0_count: number;
  p1_count: number;
  p2_count: number;
  completed_at: string;
}

export function getClientsBase(): string {
  return process.env['UPRIVER_CLIENTS_DIR'] ?? join(process.cwd(), 'clients');
}

export function listClients(): ClientSummary[] {
  const base = getClientsBase();
  if (!existsSync(base)) return [];

  const slugs = readdirSync(base, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  const results: ClientSummary[] = [];

  for (const slug of slugs) {
    const config = readClientConfig(slug);
    if (!config) continue;

    const summary = readAuditSummary(slug);
    const pipelineStage = detectStage(slug);
    const slugBase = join(base, slug);

    results.push({
      config,
      pipelineStage,
      overallScore: summary?.overall ?? null,
      p0Count: summary?.p0_count ?? 0,
      p1Count: summary?.p1_count ?? 0,
      p2Count: summary?.p2_count ?? 0,
      hasDesignBrief: existsSync(join(slugBase, 'claude-design-brief.md')),
      hasQaReport: existsSync(join(slugBase, 'qa-report.md')),
      hasLaunchChecklist: existsSync(join(slugBase, 'launch-checklist.md')),
    });
  }

  return results.sort((a, b) =>
    new Date(b.config.created_at).getTime() - new Date(a.config.created_at).getTime()
  );
}

export function readClientConfig(slug: string): ClientConfig | null {
  const path = join(getClientsBase(), slug, 'client-config.yaml');
  if (!existsSync(path)) return null;
  try {
    return parseYaml(readFileSync(path, 'utf8')) as ClientConfig;
  } catch {
    return null;
  }
}

export function readAuditSummary(slug: string): AuditSummary | null {
  const path = join(getClientsBase(), slug, 'audit', 'summary.json');
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as AuditSummary;
  } catch {
    return null;
  }
}

export function readAuditPasses(slug: string): AuditPassResult[] {
  const auditDir = join(getClientsBase(), slug, 'audit');
  if (!existsSync(auditDir)) return [];

  const files = readdirSync(auditDir).filter(
    f => f.endsWith('.json') && f !== 'summary.json'
  );

  const passes: AuditPassResult[] = [];
  for (const file of files) {
    try {
      const data = JSON.parse(readFileSync(join(auditDir, file), 'utf8')) as AuditPassResult;
      passes.push(data);
    } catch {
      // skip malformed files
    }
  }

  return passes.sort((a, b) => a.dimension.localeCompare(b.dimension));
}

export function readAllFindings(slug: string): AuditFinding[] {
  return readAuditPasses(slug).flatMap(p => p.findings);
}

export function readMarkdownFile(slug: string, filename: string): string | null {
  const path = join(getClientsBase(), slug, filename);
  if (!existsSync(path)) return null;
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

export function clientExists(slug: string): boolean {
  return existsSync(join(getClientsBase(), slug, 'client-config.yaml'));
}

/**
 * Read the persisted client intake for a slug.
 *
 * @param slug - Client slug (directory name under the clients base path).
 * @returns Parsed `ClientIntake`, or `null` if `intake.json` is missing or
 *          unparseable. The caller is responsible for treating `null` as
 *          "no intake yet" and rendering an empty form.
 */
export function readIntake(slug: string): ClientIntake | null {
  const path = join(getClientsBase(), slug, 'intake.json');
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as ClientIntake;
  } catch {
    return null;
  }
}

/**
 * Aggregated clone-fidelity summary written by `upriver clone-fidelity`.
 * Mirrors the `FidelitySummary` shape exported by the CLI scorer; redeclared
 * here so the dashboard package does not depend on `@upriver/cli`.
 */
export interface FidelitySummary {
  generatedAt: string;
  overall: number;
  pages: Array<{
    pageSlug: string;
    pixel: {
      totalPixels: number;
      matchedPixels: number;
      differingPixels: number;
      score: number;
      diffPath: string | null;
    };
    copy: {
      liveTokens: number;
      cloneTokens: number;
      sharedTokens: number;
      missingFromClone: string[];
      score: number;
    };
    overall: number;
    status: 'scored' | 'no-live-shot' | 'no-clone-shot' | 'error';
    errorMessage?: string;
  }>;
}

/**
 * Read the clone-fidelity summary for a slug.
 *
 * Returns the parsed contents of `clients/<slug>/clone-qa/summary.json`,
 * or `null` if the file is missing or cannot be parsed. Callers should
 * treat `null` as "no fidelity scores yet" and render an empty state.
 *
 * @param slug - Client slug (directory name under the clients base path).
 * @returns Parsed `FidelitySummary`, or `null` if missing/invalid.
 */
export function readFidelitySummary(slug: string): FidelitySummary | null {
  const path = join(getClientsBase(), slug, 'clone-qa', 'summary.json');
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as FidelitySummary;
  } catch {
    return null;
  }
}
