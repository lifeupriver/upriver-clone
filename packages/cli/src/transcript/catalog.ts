// A compact, human-readable catalog of schema leaf paths for the extraction
// system prompt (spec §1). NOT the raw zod source — just `path [hint]` lines
// grouped by section, with MUST_ASK / transcript-expected paths flagged so the
// model spends its attention on the session's high-value fields. Kept well
// under 8k chars by including only the client's active industry module(s).

import { MUST_ASK, SOURCE_EXPECTATIONS } from '@upriver/schemas';

import { enumerateLeafPaths } from '../profile/paths.js';

export const PRIORITY_MARK = '★';

export interface CatalogOptions {
  /** Module keys (e.g. `preschool`) whose leaves to include; others omitted. */
  activeModules?: string[];
}

function priorityPaths(): Set<string> {
  const set = new Set<string>(SOURCE_EXPECTATIONS.transcript);
  for (const m of MUST_ASK) set.add(m.path);
  return set;
}

/** Build the catalog text for the system prompt. */
export function buildPathCatalog(opts: CatalogOptions = {}): string {
  const active = new Set(opts.activeModules ?? []);
  const priority = priorityPaths();

  const leaves = enumerateLeafPaths().filter((leaf) => {
    if (!leaf.path.startsWith('modules.')) return true;
    const moduleKey = leaf.path.split('.')[1];
    return moduleKey !== undefined && active.has(moduleKey);
  });

  // Group by the top-level section (or `modules.<key>` for modules).
  const groups = new Map<string, string[]>();
  for (const leaf of leaves) {
    const segs = leaf.path.split('.');
    const group = leaf.path.startsWith('modules.') ? `${segs[0]}.${segs[1]}` : (segs[0] as string);
    const flag = priority.has(leaf.path) ? ` ${PRIORITY_MARK}` : '';
    const line = `  - ${leaf.path} [${leaf.hint}]${flag}`;
    const list = groups.get(group) ?? [];
    list.push(line);
    groups.set(group, list);
  }

  const out: string[] = [
    `Profile field paths (${PRIORITY_MARK} = high-value session field; prefer these).`,
  ];
  for (const [group, lines] of groups) {
    out.push(`${group}:`);
    out.push(...lines);
  }
  return out.join('\n');
}
