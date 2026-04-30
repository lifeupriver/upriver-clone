/**
 * Dashboard-side helpers for the client-facing interview form. Validates
 * magic-link tokens against `clients/<slug>/interview-share.json`, reads the
 * parsed form spec, and persists answers to
 * `clients/<slug>/interview-responses.json`. All filesystem work goes
 * through the `ClientDataSource` so Supabase deployments work too.
 */
import { resolveClientDataSource } from './data-source.js';
import { parseInterviewGuide, summarizeProgress, type FormSpec } from '@upriver/core';

interface InterviewShareInfo {
  token: string;
  createdAt: string;
  baseUrl?: string;
}

interface ResponsesFile {
  _meta?: {
    slug: string;
    createdAt: string;
    updatedAt: string;
    answeredCount: number;
  };
  answers?: Record<string, string>;
}

export async function readInterviewShare(slug: string): Promise<InterviewShareInfo | null> {
  const ds = resolveClientDataSource();
  const raw = await ds.readClientFileText(slug, 'interview-share.json');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as InterviewShareInfo;
  } catch {
    return null;
  }
}

export async function validateInterviewToken(slug: string, token: string | null | undefined): Promise<boolean> {
  if (!token || token.length < 16 || token.length > 256) return false;
  const share = await readInterviewShare(slug);
  if (!share) return false;
  // Constant-time compare
  if (share.token.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= share.token.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}

export async function readInterviewSpec(slug: string): Promise<FormSpec | null> {
  const ds = resolveClientDataSource();
  const md = await ds.readClientFileText(slug, 'interview-guide.md');
  if (!md) return null;
  return parseInterviewGuide(md);
}

export async function readResponses(slug: string): Promise<ResponsesFile> {
  const ds = resolveClientDataSource();
  const raw = await ds.readClientFileText(slug, 'interview-responses.json');
  if (!raw) {
    const now = new Date().toISOString();
    return { _meta: { slug, createdAt: now, updatedAt: now, answeredCount: 0 }, answers: {} };
  }
  try {
    const parsed = JSON.parse(raw) as ResponsesFile;
    parsed.answers = parsed.answers ?? {};
    return parsed;
  } catch {
    const now = new Date().toISOString();
    return { _meta: { slug, createdAt: now, updatedAt: now, answeredCount: 0 }, answers: {} };
  }
}

export async function patchResponses(
  slug: string,
  patch: Record<string, string>,
): Promise<ResponsesFile> {
  const ds = resolveClientDataSource();
  const file = await readResponses(slug);
  for (const [k, v] of Object.entries(patch)) {
    if (typeof v !== 'string') continue;
    if (v.trim().length === 0) {
      delete file.answers![k];
    } else {
      file.answers![k] = v;
    }
  }
  const answeredCount = Object.values(file.answers!).filter(
    (v) => typeof v === 'string' && v.trim().length > 0,
  ).length;
  const now = new Date().toISOString();
  const out: ResponsesFile = {
    _meta: {
      slug,
      createdAt: file._meta?.createdAt ?? now,
      updatedAt: now,
      answeredCount,
    },
    answers: file.answers,
  };
  await ds.writeClientFile(slug, 'interview-responses.json', JSON.stringify(out, null, 2) + '\n');
  return out;
}

export { summarizeProgress };
