// F05 change-request processor.
//
// Two phases:
//   1. parseIntent — read-only Claude pass that classifies the request,
//      identifies target files, asset requirements, voice implications.
//      Returns structured intent suitable for posting back to GitHub as
//      the bot's first comment.
//   2. runChange — write-allowed headless Claude session that opens a
//      branch, makes the requested changes, and stages them for commit
//      and PR. Operator (or Inngest webhook handler) does the actual
//      commit/push/PR-open via Octokit.
//
// Both phases use the operator's Claude Max subscription via the
// claudeCliCall helper.

import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import type { VoiceRules } from '@upriver/core';
import { UPRIVER_BANNED_WORDS } from '@upriver/core';

import { claudeCliCall } from '../util/claude-cli.js';

export type IntentType = 'content_addition' | 'content_edit' | 'content_removal' | 'asset_change' | 'design_change' | 'unknown';

export interface ParsedIntent {
  type: IntentType;
  target_files: string[];
  summary: string;
  asset_requirements: string[];
  voice_concerns: string[];
  estimated_complexity: 'low' | 'medium' | 'high';
  confidence: number;
}

export interface ChangeRequestInput {
  slug: string;
  /** Working directory of the client's GitHub repo (already cloned). */
  repoDir: string;
  /** Issue number for branch naming. */
  issueNumber: number;
  /** Issue title for the PR title. */
  issueTitle: string;
  /** Free-text issue body from the form or directly from GitHub. */
  issueBody: string;
  /** Optional voice rules — when present, the system prompt enforces them strictly. */
  voiceRules: VoiceRules | null;
  /** Optional operator feedback when re-running after a "request changes" review. */
  operatorFeedback?: string;
}

export interface ChangeRequestResult {
  intent: ParsedIntent;
  branch: string;
  /** Files Claude reports it modified. */
  changed_files: string[];
  /** Plain-language summary of what changed. */
  summary: string;
  /** Voice-check verdict on the diff. */
  voice_check: VoiceCheckResult;
  /** Was the change blocked? When true the operator must review before merge. */
  blocked: boolean;
  block_reason: string | null;
}

export interface VoiceCheckResult {
  passed: boolean;
  banned_word_hits: Array<{ word: string; count: number }>;
  em_dash_hits: number;
  notes: string[];
}

const INTENT_SYSTEM = `You are an Upriver issue triage assistant. Read the change-request issue body and produce a structured intent. Voice rules apply to your output:
- No em dashes anywhere.
- Plain USD prices.
- No banned words: stunning, magical, special day, transform, elevate, unlock, seamlessly, robust, synergy, game-changer.
Return one JSON object exactly:
{
  "type": "content_addition" | "content_edit" | "content_removal" | "asset_change" | "design_change" | "unknown",
  "target_files": ["<best-guess relative paths in the repo>"],
  "summary": "<2-3 sentences in first person from the operator>",
  "asset_requirements": ["<photos, PDFs, files mentioned but not provided>"],
  "voice_concerns": ["<phrases or words from the issue that would violate voice rules if pasted directly>"],
  "estimated_complexity": "low" | "medium" | "high",
  "confidence": <0-100>
}
No prose around the JSON.`;

const CHANGE_SYSTEM_BASE = `You are an Upriver headless code agent making a change to a client's website repository. Rules:
- Make the SMALLEST change that satisfies the request. No drive-by refactors.
- Never invent facts about the business. If the issue references a fact you cannot verify from the repo, leave a TODO comment in code rather than fabricating.
- Voice rules: no em dashes anywhere; no banned words from the Upriver list; plain USD prices; real tool names always.
- When you finish, end your reply with a JSON block listing the files you changed and a one-paragraph summary, exactly:

\`\`\`json
{
  "changed_files": ["<paths>"],
  "summary": "<2-3 sentences>"
}
\`\`\`

Do not output anything after that block.`;

/**
 * Read-only intent parse. Cheap and fast. Result is meant to be posted back
 * to the GitHub issue as the bot's first comment so the client and operator
 * can both see what the bot heard before any code changes happen.
 */
export async function parseIntent(input: { slug: string; issueBody: string }): Promise<ParsedIntent> {
  const result = await claudeCliCall({
    slug: input.slug,
    command: 'admin-process:intent',
    model: 'sonnet',
    systemPrompt: INTENT_SYSTEM,
    userPrompt: `Change-request issue body:\n"""\n${input.issueBody.slice(0, 8000)}\n"""\n\nProduce the JSON intent.`,
    permissionMode: 'plan',
    allowedTools: ['Read', 'Glob', 'Grep'],
  });
  return parseIntentJson(result.text);
}

function parseIntentJson(text: string): ParsedIntent {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('intent parser returned no JSON');
  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as ParsedIntent;
  if (typeof parsed.type !== 'string') throw new Error('intent missing type');
  return parsed;
}

/**
 * Write-allowed headless Claude session. Operates inside `repoDir` with
 * `Edit, Write, Bash, Read, Glob, Grep` allowed and `acceptEdits` permission
 * mode so the model can land file changes without further confirmation.
 *
 * Caller is responsible for:
 *   - cloning the repo to repoDir before calling
 *   - committing + pushing + opening the PR after the call returns
 *
 * The function does NOT spawn `git` itself — it leaves the repo in a dirty
 * state with the requested changes staged for the caller's commit.
 */
export async function runChangeRequest(input: ChangeRequestInput): Promise<ChangeRequestResult> {
  const intent = await parseIntent({ slug: input.slug, issueBody: input.issueBody });

  // Block early when assets are missing — operator's webhook handler should
  // label as awaiting-assets and skip the write phase.
  if (intent.asset_requirements.length > 0 && !input.issueBody.match(/https?:\/\/\S+\.(?:jpe?g|png|webp|pdf)/i)) {
    return {
      intent,
      branch: '',
      changed_files: [],
      summary: 'Paused waiting on missing assets.',
      voice_check: { passed: true, banned_word_hits: [], em_dash_hits: 0, notes: [] },
      blocked: true,
      block_reason: 'awaiting-assets',
    };
  }

  const branch = `change-request/issue-${input.issueNumber}`;
  const voiceBlock = input.voiceRules
    ? `Brand voice rules for THIS client (override the defaults when they conflict):
- Formality ${input.voiceRules.formality_score.toFixed(2)}, warmth ${input.voiceRules.warmth_score.toFixed(2)}.
- Required markers (use at least one in any new prose): ${input.voiceRules.required_voice_markers.slice(0, 5).join(', ') || 'none'}.
- Banned (must avoid): ${input.voiceRules.banned_words.slice(0, 12).join(', ')}.
- Voice prompt: ${input.voiceRules.voice_prompt.slice(0, 600)}`
    : 'No voice rules available; use a warm-professional default register.';

  const userPrompt = `Repository: ${input.repoDir}
Issue #${input.issueNumber}: ${input.issueTitle}

Issue body:
"""
${input.issueBody}
"""

${input.operatorFeedback ? `Operator feedback from the previous attempt:\n"""\n${input.operatorFeedback}\n"""\n` : ''}

Parsed intent (for reference; you can disagree):
${JSON.stringify(intent, null, 2)}

${voiceBlock}

Make the change. Use Edit/Write to modify files in ${input.repoDir}. Do not run \`git\` yourself — leave the working tree dirty for the caller to commit. End with the required JSON block.`;

  const result = await claudeCliCall({
    slug: input.slug,
    command: 'admin-process:change',
    model: 'sonnet',
    systemPrompt: CHANGE_SYSTEM_BASE,
    userPrompt,
    permissionMode: 'acceptEdits',
    allowedTools: ['Read', 'Glob', 'Grep', 'Edit', 'Write', 'Bash'],
  });

  const tail = parseChangeJson(result.text);

  // Voice-check the diff. Fall back to "no diff" — Claude may have replied
  // with a refusal; the caller treats that as blocked.
  const diffOutput = await safeGitDiff(input.repoDir);
  const voiceCheck = checkVoice(diffOutput, input.voiceRules);
  const blocked = !voiceCheck.passed;

  return {
    intent,
    branch,
    changed_files: tail.changed_files,
    summary: tail.summary,
    voice_check: voiceCheck,
    blocked,
    block_reason: blocked ? 'voice-check-failed' : null,
  };
}

function parseChangeJson(text: string): { changed_files: string[]; summary: string } {
  // Look for a fenced JSON block at the END of the message.
  const m = text.match(/```json\s*([\s\S]*?)\s*```\s*$/);
  if (m && m[1]) {
    try {
      const parsed = JSON.parse(m[1]) as { changed_files?: string[]; summary?: string };
      return { changed_files: parsed.changed_files ?? [], summary: parsed.summary ?? '' };
    } catch {
      // fall through
    }
  }
  // Fallback: search anywhere.
  const start = text.lastIndexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      const parsed = JSON.parse(text.slice(start, end + 1)) as {
        changed_files?: string[];
        summary?: string;
      };
      return { changed_files: parsed.changed_files ?? [], summary: parsed.summary ?? '' };
    } catch {
      // ignore
    }
  }
  return { changed_files: [], summary: text.split('\n').slice(0, 3).join(' ').slice(0, 240) };
}

function safeGitDiff(repoDir: string): Promise<string> {
  return new Promise((resolve) => {
    if (!existsSync(join(repoDir, '.git'))) {
      resolve('');
      return;
    }
    const child = spawn('git', ['-C', repoDir, 'diff', '--no-color'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => { out += d.toString('utf8'); });
    child.on('error', () => resolve(''));
    child.on('exit', () => resolve(out));
  });
}

/**
 * Voice check on a unified-diff string. Inspects only added lines (lines
 * starting with `+` but not `+++`). Records any banned-word hits, em-dash
 * usage, and warning notes.
 */
export function checkVoice(diff: string, voiceRules: VoiceRules | null): VoiceCheckResult {
  const banned = new Set<string>(
    [
      ...UPRIVER_BANNED_WORDS.map((w) => w.toLowerCase()),
      ...((voiceRules?.banned_words ?? []).map((w) => w.toLowerCase())),
    ].filter(Boolean),
  );
  let emDashHits = 0;
  const wordHits = new Map<string, number>();
  const notes: string[] = [];

  const addedLines = diff
    .split('\n')
    .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
    .map((line) => line.slice(1));
  const addedText = addedLines.join('\n');

  for (const word of banned) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b`, 'gi');
    const matches = addedText.match(re);
    if (matches && matches.length > 0) wordHits.set(word, matches.length);
  }
  emDashHits = (addedText.match(/—/g) ?? []).length;
  if (emDashHits > 0) notes.push(`${emDashHits} em dash(es) added — Upriver voice rule disallows them.`);

  if (voiceRules?.required_voice_markers && voiceRules.required_voice_markers.length > 0) {
    const longProse = addedText.length > 600;
    const hasMarker = voiceRules.required_voice_markers.some((m) =>
      addedText.toLowerCase().includes(m.toLowerCase()),
    );
    if (longProse && !hasMarker) {
      notes.push('Long prose added without any required voice markers; consider adding one.');
    }
  }

  return {
    passed: wordHits.size === 0 && emDashHits === 0,
    banned_word_hits: [...wordHits.entries()].map(([word, count]) => ({ word, count })),
    em_dash_hits: emDashHits,
    notes,
  };
}

/** Read voice rules from the standard location. */
export function loadVoiceRulesFromClient(clientDir: string): VoiceRules | null {
  const p = join(clientDir, 'voice', 'voice-rules.json');
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as VoiceRules;
  } catch {
    return null;
  }
}
