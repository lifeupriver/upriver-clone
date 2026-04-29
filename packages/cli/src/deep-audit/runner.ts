import { spawn } from 'node:child_process';

import type {
  AuditDimension,
  AuditFinding,
  AuditPassResult,
  FindingEffort,
  FindingPriority,
} from '@upriver/core';

/**
 * The CLI binary used to invoke Claude Code in headless mode. Override with
 * CLAUDE_BIN=/path/to/claude for tests or alternative installs.
 */
const CLAUDE_BIN = process.env['CLAUDE_BIN'] || 'claude';

/**
 * A deep audit pass. Produces a prompt from the loaded client context, then
 * parses the agent's response into AuditFindings for the pass's dimension.
 *
 * Deep passes differ from base passes (under packages/audit-passes/) in two
 * ways: they invoke an LLM agent rather than running pure heuristics, and
 * their prompts read methodology from .agents/skills/<skill>/SKILL.md.
 *
 * Roadmap: Workstream C.3 (content-strategy), C.4 (conversion-psychology),
 * C.5 (competitor-deep). All three share this runner shell.
 */
export interface DeepPassSpec<Ctx> {
  /** Stable id for logging and future mode filtering. */
  id: string;
  /** Audit dimension the produced findings will carry. */
  dimension: AuditDimension;
  /** Build the prompt body from loaded context. Pure. */
  buildPrompt: (ctx: Ctx) => string;
  /** Load whatever the prompt needs from disk. Allowed to do IO. */
  loadContext: (slug: string, clientDir: string) => Promise<Ctx> | Ctx;
}

/**
 * Strategy for invoking an agent. Abstracted so tests can inject a stub. The
 * real implementation (claudeCliRunner) shells out to `claude --print`.
 */
export type AgentRunner = (prompt: string) => Promise<string>;

/**
 * Shape the deep agent must produce. Validated leniently — extra fields are
 * ignored, missing optional fields default to safe values.
 */
interface AgentFindingShape {
  id?: string;
  title?: string;
  description?: string;
  priority?: string;
  effort?: string;
  recommendation?: string;
  why_it_matters?: string;
  evidence?: string;
  page?: string;
  affected_pages?: string[];
}

interface AgentResponseShape {
  summary?: string;
  findings?: AgentFindingShape[];
}

/**
 * Run a deep audit pass. Loads context, builds the prompt, invokes the agent,
 * parses the response, and returns an AuditPassResult shaped exactly like the
 * base passes so the caller can merge them transparently.
 */
export async function runDeepPass<Ctx>(
  spec: DeepPassSpec<Ctx>,
  args: { slug: string; clientDir: string; runAgent: AgentRunner },
): Promise<AuditPassResult> {
  const ctx = await spec.loadContext(args.slug, args.clientDir);
  const prompt = spec.buildPrompt(ctx);

  let raw: string;
  try {
    raw = await args.runAgent(prompt);
  } catch (err) {
    return {
      dimension: spec.dimension,
      score: 50,
      summary: `Deep pass "${spec.id}" failed to run: ${err instanceof Error ? err.message : String(err)}`,
      findings: [],
      completed_at: new Date().toISOString(),
    };
  }

  const parsed = parseAgentResponse(raw, spec.dimension);
  return {
    dimension: spec.dimension,
    score: scoreFromFindings(parsed.findings),
    summary: parsed.summary,
    findings: parsed.findings,
    completed_at: new Date().toISOString(),
  };
}

/**
 * Default AgentRunner that shells out to the `claude` CLI in headless mode.
 * Uses --print (non-interactive) and constrains tool access to read-only
 * operations since deep audits must not mutate the repo.
 */
export const claudeCliRunner: AgentRunner = (prompt) => {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(
      CLAUDE_BIN,
      [
        '--print',
        '--permission-mode',
        'plan',
        '--allowed-tools',
        'Read,Glob,Grep',
      ],
      { stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env } },
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d: Buffer) => {
      stdout += d.toString('utf8');
    });
    child.stderr.on('data', (d: Buffer) => {
      stderr += d.toString('utf8');
    });
    child.stdin.write(prompt);
    child.stdin.end();
    child.on('error', (err) => rejectP(err));
    child.on('exit', (code) => {
      if (code === 0) resolveP(stdout);
      else rejectP(new Error(`claude exited ${code}: ${stderr.split('\n')[0] ?? ''}`));
    });
  });
};

/**
 * Parse the agent's response. The agent is asked to emit a JSON object
 * matching AgentResponseShape, optionally fenced in ```json. We extract the
 * first balanced JSON object from the output; bad JSON degrades to an empty
 * findings list with a clear summary so the rest of the audit still runs.
 *
 * Exported for unit tests.
 */
export function parseAgentResponse(
  raw: string,
  dimension: AuditDimension,
): { summary: string; findings: AuditFinding[] } {
  const jsonText = extractJsonBlock(raw);
  if (!jsonText) {
    return { summary: 'Deep pass produced no parseable JSON output.', findings: [] };
  }
  let parsed: AgentResponseShape;
  try {
    parsed = JSON.parse(jsonText) as AgentResponseShape;
  } catch (err) {
    return {
      summary: `Deep pass JSON parse failed: ${err instanceof Error ? err.message : String(err)}`,
      findings: [],
    };
  }

  const out: AuditFinding[] = [];
  let counter = 1;
  for (const f of parsed.findings ?? []) {
    if (!f || typeof f !== 'object') continue;
    if (typeof f.title !== 'string' || f.title.trim().length === 0) continue;
    const priority = normalizePriority(f.priority);
    const effort = normalizeEffort(f.effort);
    const finding: AuditFinding = {
      id: typeof f.id === 'string' && f.id ? f.id : `${dimension}-deep-${String(counter).padStart(3, '0')}`,
      dimension,
      priority,
      effort,
      title: f.title.trim(),
      description: typeof f.description === 'string' ? f.description : '',
      why_it_matters:
        typeof f.why_it_matters === 'string' && f.why_it_matters
          ? f.why_it_matters
          : typeof f.description === 'string'
            ? f.description
            : '',
      recommendation: typeof f.recommendation === 'string' ? f.recommendation : '',
      estimatedImpact: defaultImpact(priority, effort),
      ...(typeof f.evidence === 'string' ? { evidence: f.evidence } : {}),
      ...(typeof f.page === 'string' ? { page: f.page } : {}),
      ...(Array.isArray(f.affected_pages) ? { affected_pages: f.affected_pages.filter((s) => typeof s === 'string') } : {}),
    };
    out.push(finding);
    counter += 1;
  }

  return {
    summary:
      typeof parsed.summary === 'string' && parsed.summary
        ? parsed.summary
        : `${out.length} deep finding(s) produced.`,
    findings: out,
  };
}

/** Find the first balanced top-level `{...}` block in `raw`. */
function extractJsonBlock(raw: string): string | null {
  const fence = /```(?:json)?\s*\n([\s\S]*?)\n```/m.exec(raw);
  if (fence && fence[1]) {
    const inner = fence[1].trim();
    if (inner.startsWith('{') && inner.endsWith('}')) return inner;
  }
  let depth = 0;
  let start = -1;
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (ch === '{') {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        return raw.slice(start, i + 1);
      }
    }
  }
  return null;
}

function normalizePriority(p: string | undefined): FindingPriority {
  if (p === 'p0' || p === 'p1' || p === 'p2') return p;
  const lower = (p ?? '').toLowerCase();
  if (lower.includes('critical') || lower.includes('high')) return 'p0';
  if (lower.includes('low')) return 'p2';
  return 'p1';
}

function normalizeEffort(e: string | undefined): FindingEffort {
  if (e === 'light' || e === 'medium' || e === 'heavy') return e;
  const lower = (e ?? '').toLowerCase();
  if (lower.includes('quick') || lower.includes('small')) return 'light';
  if (lower.includes('large') || lower.includes('big')) return 'heavy';
  return 'medium';
}

/** Mirror of audit-passes/shared/finding-builder.ts:scoreFromFindings. Inlined to avoid pulling that package. */
function scoreFromFindings(findings: AuditFinding[]): number {
  if (findings.length === 0) return 90;
  const deductions = findings.reduce((sum, f) => {
    const d = f.priority === 'p0' ? 15 : f.priority === 'p1' ? 7 : 3;
    return sum + d;
  }, 0);
  return Math.max(0, Math.min(100, 100 - deductions));
}

/** Mirror of finding-builder.ts:defaultImpact. Inlined for the same reason. */
function defaultImpact(priority: FindingPriority, effort: FindingEffort) {
  const matrix: Record<FindingPriority, Record<FindingEffort, { scorePoints: number; description: string }>> = {
    p0: {
      light: { scorePoints: 5, description: '+4-6 score pts in 2-4 hours' },
      medium: { scorePoints: 8, description: '+6-10 score pts in 1-2 days' },
      heavy: { scorePoints: 12, description: '+10-15 score pts in 1-2 weeks' },
    },
    p1: {
      light: { scorePoints: 2, description: '+1-3 score pts in <1 day' },
      medium: { scorePoints: 4, description: '+3-5 score pts in 2-4 days' },
      heavy: { scorePoints: 6, description: '+5-8 score pts in 1-3 weeks' },
    },
    p2: {
      light: { scorePoints: 1, description: 'incremental polish' },
      medium: { scorePoints: 2, description: 'minor lift, multi-day' },
      heavy: { scorePoints: 3, description: 'long-tail, weeks of work' },
    },
  };
  return matrix[priority][effort];
}
