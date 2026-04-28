#!/usr/bin/env node
// Read fragment files from CHANGELOG.d/ and merge them into the [Unreleased]
// section of CHANGELOG.md, then delete the fragments.
//
// The upriver clone and fixes-apply commands write per-branch fragments to
// CHANGELOG.d/ to avoid merge conflicts when parallel worktrees would
// otherwise both append to the same location in CHANGELOG.md. Run this
// after merging branches to main (or before tagging a release) to flush
// fragments into the canonical CHANGELOG.md.
//
// Usage: pnpm changelog:assemble [--keep-fragments]
//
// Flags:
//   --keep-fragments   Don't delete fragment files after merging.
//   --section=<name>   Section to merge into (default: "[Unreleased]").

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');

const args = process.argv.slice(2);
const keepFragments = args.includes('--keep-fragments');
const sectionFlag = args.find((a) => a.startsWith('--section='));
const sectionName = sectionFlag ? sectionFlag.slice('--section='.length) : '[Unreleased]';
const sectionHeader = '## ' + sectionName;

const fragDir = join(repoRoot, 'CHANGELOG.d');
const changelogPath = join(repoRoot, 'CHANGELOG.md');

if (!existsSync(fragDir)) {
  console.log('No ' + fragDir + '/ — nothing to assemble.');
  process.exit(0);
}

const fragments = readdirSync(fragDir)
  .filter((f) => f.endsWith('.md') && f !== '.gitkeep')
  .sort();

if (fragments.length === 0) {
  console.log(fragDir + '/ is empty — nothing to assemble.');
  process.exit(0);
}

const lines = fragments
  .map((f) => readFileSync(join(fragDir, f), 'utf8').trimEnd())
  .filter((s) => s.length > 0)
  .join('\n');

let changelog = '';
if (existsSync(changelogPath)) {
  changelog = readFileSync(changelogPath, 'utf8');
} else {
  changelog = '# Changelog\n\n' + sectionHeader + '\n';
}

if (!changelog.includes(sectionHeader)) {
  // Insert section right after the title
  const titleIdx = changelog.indexOf('# Changelog');
  if (titleIdx >= 0) {
    const afterTitle = changelog.indexOf('\n', titleIdx);
    const insertAt = afterTitle >= 0 ? afterTitle + 1 : changelog.length;
    changelog = changelog.slice(0, insertAt) + '\n' + sectionHeader + '\n\n' + changelog.slice(insertAt);
  } else {
    changelog = sectionHeader + '\n\n' + changelog;
  }
}

// Insert the merged lines right after the section header (above any existing
// entries — newest first ordering).
const headerIdx = changelog.indexOf(sectionHeader + '\n');
if (headerIdx >= 0) {
  const insertAt = headerIdx + sectionHeader.length + 1;
  changelog = changelog.slice(0, insertAt) + lines + '\n' + changelog.slice(insertAt);
} else {
  changelog = changelog + '\n' + sectionHeader + '\n' + lines + '\n';
}

writeFileSync(changelogPath, changelog, 'utf8');
console.log('Merged ' + fragments.length + ' fragment(s) into ' + sectionName + ':');
for (const f of fragments) console.log('  - ' + f);

if (!keepFragments) {
  for (const f of fragments) rmSync(join(fragDir, f));
  mkdirSync(fragDir, { recursive: true });
  writeFileSync(join(fragDir, '.gitkeep'), '', 'utf8');
  console.log('Cleared ' + fragDir + '/ (kept .gitkeep).');
} else {
  console.log('Kept fragments in ' + fragDir + '/ (--keep-fragments).');
}
