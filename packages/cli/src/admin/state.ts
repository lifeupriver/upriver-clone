// Per-client admin state. Lives at clients/<slug>/admin/state.json. Tracks
// which repo + form-deployment the admin is wired to, and the operator's
// pause flag. The roadmap's spec also calls for a Supabase `client_admins`
// row; that is set up by the worker's deploy path. The local file is the
// source of truth for the CLI.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export interface AdminState {
  slug: string;
  github_repo: string | null;
  form_url: string | null;
  form_pin_set: boolean;
  paused: boolean;
  deployed_at: string | null;
  last_change_processed_at: string | null;
}

const DEFAULT: Omit<AdminState, 'slug'> = {
  github_repo: null,
  form_url: null,
  form_pin_set: false,
  paused: false,
  deployed_at: null,
  last_change_processed_at: null,
};

export function statePath(clientDir: string): string {
  return join(clientDir, 'admin', 'state.json');
}

export function readState(clientDir: string, slug: string): AdminState {
  const p = statePath(clientDir);
  if (!existsSync(p)) return { slug, ...DEFAULT };
  try {
    const parsed = JSON.parse(readFileSync(p, 'utf8')) as Partial<AdminState>;
    return { slug, ...DEFAULT, ...parsed };
  } catch {
    return { slug, ...DEFAULT };
  }
}

export function writeState(clientDir: string, state: AdminState): void {
  const p = statePath(clientDir);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(state, null, 2), 'utf8');
}
