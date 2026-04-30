/**
 * File-backed store for interview responses at
 * `clients/<slug>/interview-responses.json`. Pure JSON: a flat map from
 * form-item id (e.g. `customized-faq-questions-100-total-q12`) to the
 * client's typed answer plus a `_meta` object for timestamps.
 *
 * Reads return an empty store when the file is missing — first-load is
 * indistinguishable from "no answers yet."
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { clientDir } from '@upriver/core';

export interface ResponsesFile {
  _meta: {
    slug: string;
    createdAt: string;
    updatedAt: string;
    answeredCount: number;
  };
  answers: Record<string, string>;
}

function resolveClientsBase(): string {
  return process.env['UPRIVER_CLIENTS_DIR'] ?? './clients';
}

export function responsesPath(slug: string): string {
  return join(clientDir(slug, resolveClientsBase()), 'interview-responses.json');
}

export function readResponses(slug: string): ResponsesFile {
  const path = responsesPath(slug);
  if (!existsSync(path)) {
    const now = new Date().toISOString();
    return {
      _meta: { slug, createdAt: now, updatedAt: now, answeredCount: 0 },
      answers: {},
    };
  }
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as ResponsesFile;
    parsed.answers = parsed.answers ?? {};
    return parsed;
  } catch {
    const now = new Date().toISOString();
    return {
      _meta: { slug, createdAt: now, updatedAt: now, answeredCount: 0 },
      answers: {},
    };
  }
}

export function writeResponses(slug: string, file: ResponsesFile): void {
  const path = responsesPath(slug);
  mkdirSync(dirname(path), { recursive: true });
  const answeredCount = Object.values(file.answers).filter(
    (v) => typeof v === 'string' && v.trim().length > 0,
  ).length;
  const out: ResponsesFile = {
    _meta: { ...file._meta, slug, updatedAt: new Date().toISOString(), answeredCount },
    answers: file.answers,
  };
  writeFileSync(path, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
}

/**
 * Patch one or more answers and persist. Returns the updated file. Empty
 * strings clear the answer (useful for "I don't know — skip"); whitespace-
 * only values are normalized to deletion so the dashboard's progress count
 * stays honest.
 */
export function patchResponses(
  slug: string,
  patch: Record<string, string>,
): ResponsesFile {
  const file = readResponses(slug);
  for (const [k, v] of Object.entries(patch)) {
    if (typeof v !== 'string') continue;
    const trimmed = v.trim();
    if (trimmed.length === 0) {
      delete file.answers[k];
    } else {
      file.answers[k] = v;
    }
  }
  writeResponses(slug, file);
  return file;
}
