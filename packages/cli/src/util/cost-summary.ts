import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * One credit-bearing event parsed from `token-and-credit-usage.log`. The log
 * format is one line per event written by the @upriver/core Firecrawl client:
 *
 *   `<ISO_TS> [<event_type>] credits=<N> slug=<slug> cmd=<command> [extra]`
 */
export interface UsageLogEntry {
  ts: string;
  eventType: string;
  credits: number;
  command: string;
}

/**
 * Aggregated usage summary for a single client directory's
 * `token-and-credit-usage.log`.
 */
export interface UsageSummary {
  totalCredits: number;
  totalEvents: number;
  byEventType: Map<string, { events: number; credits: number; avgCredits: number }>;
  byCommand: Map<string, { events: number; credits: number; avgCredits: number }>;
  /** Estimated USD cost. Uses `creditsToUsd` rate (default $0.001/credit). */
  estimatedUsd: number;
  source: string;
}

/** Default Firecrawl credit-to-USD conversion. Rough order of magnitude. */
export const DEFAULT_USD_PER_CREDIT = 0.001;

const LINE_PATTERN =
  /^(?<ts>\S+)\s+\[(?<eventType>[^\]]+)\]\s+credits=(?<credits>-?\d+(?:\.\d+)?)\s+slug=\S+\s+cmd=(?<command>\S+)/;

/**
 * Parse a single usage-log line. Returns null when the line is empty or does
 * not match the expected shape. The parser is intentionally lenient so a
 * malformed tail line can't poison the whole summary.
 */
export function parseUsageLine(line: string): UsageLogEntry | null {
  const trimmed = line.trim();
  if (trimmed.length === 0) return null;
  const m = LINE_PATTERN.exec(trimmed);
  if (!m || !m.groups) return null;
  const credits = Number(m.groups['credits']);
  if (!Number.isFinite(credits)) return null;
  return {
    ts: m.groups['ts']!,
    eventType: m.groups['eventType']!,
    credits,
    command: m.groups['command']!,
  };
}

/**
 * Build a UsageSummary from `<clientDir>/token-and-credit-usage.log`. Returns
 * a zeroed summary (with `source` pointing at the expected path) when the file
 * is absent so the caller can still print something useful.
 */
export function summarizeUsageLog(
  clientDir: string,
  usdPerCredit: number = DEFAULT_USD_PER_CREDIT,
): UsageSummary {
  const path = join(clientDir, 'token-and-credit-usage.log');
  const empty: UsageSummary = {
    totalCredits: 0,
    totalEvents: 0,
    byEventType: new Map(),
    byCommand: new Map(),
    estimatedUsd: 0,
    source: path,
  };
  if (!existsSync(path)) return empty;
  const raw = readFileSync(path, 'utf8');
  return summarizeUsageText(raw, usdPerCredit, path);
}

/** Pure variant exposed for tests and callers that already have the log text. */
export function summarizeUsageText(
  raw: string,
  usdPerCredit: number = DEFAULT_USD_PER_CREDIT,
  source = '<inline>',
): UsageSummary {
  const byEventType = new Map<string, { events: number; credits: number; avgCredits: number }>();
  const byCommand = new Map<string, { events: number; credits: number; avgCredits: number }>();
  let totalCredits = 0;
  let totalEvents = 0;
  for (const line of raw.split(/\r?\n/)) {
    const e = parseUsageLine(line);
    if (!e) continue;
    totalEvents += 1;
    totalCredits += e.credits;
    const t = byEventType.get(e.eventType) ?? { events: 0, credits: 0, avgCredits: 0 };
    t.events += 1;
    t.credits += e.credits;
    t.avgCredits = t.credits / t.events;
    byEventType.set(e.eventType, t);
    const c = byCommand.get(e.command) ?? { events: 0, credits: 0, avgCredits: 0 };
    c.events += 1;
    c.credits += e.credits;
    c.avgCredits = c.credits / c.events;
    byCommand.set(e.command, c);
  }
  return {
    totalCredits,
    totalEvents,
    byEventType,
    byCommand,
    estimatedUsd: totalCredits * usdPerCredit,
    source,
  };
}

/**
 * Estimate the credit cost of running a command based on historical usage for
 * the same command. Returns null if the command has no history; callers should
 * fall back to a printed warning.
 */
export function estimateCostForCommand(
  summary: UsageSummary,
  command: string,
): { credits: number; basis: number } | null {
  const e = summary.byCommand.get(command);
  if (!e || e.events === 0) return null;
  return { credits: Math.round(e.avgCredits * 100) / 100, basis: e.events };
}

/**
 * Render a short multi-line summary suitable for CLI output. Keeps to ~12
 * lines so it fits in a terminal without scrolling.
 */
export function renderUsageSummary(s: UsageSummary): string {
  const lines: string[] = [];
  lines.push(`Usage log: ${s.source}`);
  if (s.totalEvents === 0) {
    lines.push('  (no events recorded yet)');
    return lines.join('\n');
  }
  lines.push(
    `  Total: ${s.totalEvents} event(s), ${s.totalCredits.toLocaleString()} credit(s) (~$${s.estimatedUsd.toFixed(2)})`,
  );
  if (s.byEventType.size > 0) {
    lines.push('  By event type:');
    const entries = Array.from(s.byEventType.entries()).sort((a, b) => b[1].credits - a[1].credits);
    for (const [k, v] of entries) {
      lines.push(`    - ${k.padEnd(20)} ${String(v.events).padStart(4)}x (${v.credits.toLocaleString()} credits)`);
    }
  }
  if (s.byCommand.size > 0) {
    lines.push('  By command:');
    const entries = Array.from(s.byCommand.entries()).sort((a, b) => b[1].credits - a[1].credits);
    for (const [k, v] of entries) {
      lines.push(
        `    - ${k.padEnd(20)} ${String(v.events).padStart(4)}x avg ${v.avgCredits.toFixed(1)} credits`,
      );
    }
  }
  return lines.join('\n');
}
