import { parse as parseYaml } from 'yaml';
import type { ClientConfig } from '@upriver/core';
import type { AuditFinding, AuditPassResult, ClientIntake } from '@upriver/core';

import { resolveClientDataSource } from './data-source.js';
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

export async function listClients(): Promise<ClientSummary[]> {
  const ds = resolveClientDataSource();
  const slugs = await ds.listClientSlugs();

  const results: ClientSummary[] = [];

  for (const slug of slugs) {
    const config = await readClientConfig(slug);
    if (!config) continue;

    const summary = await readAuditSummary(slug);
    const pipelineStage = await detectStage(slug);
    const [hasDesignBrief, hasQaReport, hasLaunchChecklist] = await Promise.all([
      ds.fileExists(slug, 'claude-design-brief.md'),
      ds.fileExists(slug, 'qa-report.md'),
      ds.fileExists(slug, 'launch-checklist.md'),
    ]);

    results.push({
      config,
      pipelineStage,
      overallScore: summary?.overall ?? null,
      p0Count: summary?.p0_count ?? 0,
      p1Count: summary?.p1_count ?? 0,
      p2Count: summary?.p2_count ?? 0,
      hasDesignBrief,
      hasQaReport,
      hasLaunchChecklist,
    });
  }

  return results.sort(
    (a, b) =>
      new Date(b.config.created_at).getTime() - new Date(a.config.created_at).getTime(),
  );
}

export async function readClientConfig(slug: string): Promise<ClientConfig | null> {
  const text = await resolveClientDataSource().readClientFileText(slug, 'client-config.yaml');
  if (!text) return null;
  try {
    return parseYaml(text) as ClientConfig;
  } catch {
    return null;
  }
}

export async function readAuditSummary(slug: string): Promise<AuditSummary | null> {
  const text = await resolveClientDataSource().readClientFileText(slug, 'audit/summary.json');
  if (!text) return null;
  try {
    return JSON.parse(text) as AuditSummary;
  } catch {
    return null;
  }
}

export async function readAuditPasses(slug: string): Promise<AuditPassResult[]> {
  const ds = resolveClientDataSource();
  const files = await ds.listClientFiles(slug, 'audit');
  const passFiles = files.filter(f => f.endsWith('.json') && f !== 'summary.json');

  const passes: AuditPassResult[] = [];
  for (const file of passFiles) {
    const text = await ds.readClientFileText(slug, `audit/${file}`);
    if (!text) continue;
    try {
      passes.push(JSON.parse(text) as AuditPassResult);
    } catch {
      // skip malformed files
    }
  }

  return passes.sort((a, b) => a.dimension.localeCompare(b.dimension));
}

export async function readAllFindings(slug: string): Promise<AuditFinding[]> {
  const passes = await readAuditPasses(slug);
  return passes.flatMap(p => p.findings);
}

export async function readMarkdownFile(
  slug: string,
  filename: string,
): Promise<string | null> {
  return resolveClientDataSource().readClientFileText(slug, filename);
}

export async function clientExists(slug: string): Promise<boolean> {
  return resolveClientDataSource().fileExists(slug, 'client-config.yaml');
}

/**
 * Read the persisted client intake for a slug.
 *
 * @param slug - Client slug.
 * @returns Parsed `ClientIntake`, or `null` if `intake.json` is missing or
 *          unparseable.
 */
export async function readIntake(slug: string): Promise<ClientIntake | null> {
  const text = await resolveClientDataSource().readClientFileText(slug, 'intake.json');
  if (!text) return null;
  try {
    return JSON.parse(text) as ClientIntake;
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
 * @param slug - Client slug.
 * @returns Parsed `FidelitySummary`, or `null` if missing/invalid.
 */
export async function readFidelitySummary(slug: string): Promise<FidelitySummary | null> {
  const text = await resolveClientDataSource().readClientFileText(
    slug,
    'clone-qa/summary.json',
  );
  if (!text) return null;
  try {
    return JSON.parse(text) as FidelitySummary;
  } catch {
    return null;
  }
}

/**
 * One-shot probe of every artifact the dashboard cares about for a single
 * client. Used by the operator landing page (artifact grid) and the per-client
 * sidebar section. Replaces several scattered probe sites that were each
 * doing their own `fileExists` calls.
 */
export interface ClientArtifacts {
  hasIntake: boolean;
  hasInterviewSpec: boolean;
  hasInterviewResponses: boolean;
  hasAudit: boolean;
  hasFidelity: boolean;
  hasVoice: boolean;
  hasBrief: boolean;
  hasFixes: boolean;
  hasQa: boolean;
  hasLaunch: boolean;
  hasRepo: boolean;
}

export async function getClientArtifacts(slug: string): Promise<ClientArtifacts> {
  const ds = resolveClientDataSource();
  const [
    hasIntake,
    hasInterviewSpec,
    hasInterviewResponses,
    hasAudit,
    hasFidelity,
    hasVoice,
    hasBrief,
    hasFixes,
    hasQa,
    hasLaunch,
    hasRepo,
  ] = await Promise.all([
    ds.fileExists(slug, 'intake.json'),
    ds.fileExists(slug, 'interview/interview-spec.json'),
    ds.fileExists(slug, 'interview/responses.json'),
    ds.fileExists(slug, 'audit/summary.json'),
    ds.fileExists(slug, 'clone-qa/summary.json'),
    ds.fileExists(slug, 'docs/brand-voice-guide.md'),
    ds.fileExists(slug, 'claude-design-brief.md'),
    ds.fileExists(slug, 'fixes-plan.md'),
    ds.fileExists(slug, 'qa-report.md'),
    ds.fileExists(slug, 'launch-checklist.md'),
    ds.fileExists(slug, 'repo'),
  ]);
  return {
    hasIntake,
    hasInterviewSpec,
    hasInterviewResponses,
    hasAudit,
    hasFidelity,
    hasVoice,
    hasBrief,
    hasFixes,
    hasQa,
    hasLaunch,
    hasRepo,
  };
}
