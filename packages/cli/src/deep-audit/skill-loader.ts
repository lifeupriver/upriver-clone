import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SKILL_ROOTS = ['.claude/skills', '.agents/skills'];

export interface LoadedSkill {
  name: string;
  root: string;
  skillMd: string;
  referenceDir: string | null;
}

export function locateSkill(name: string): string | null {
  for (const root of SKILL_ROOTS) {
    const dir = join(root, name);
    if (existsSync(join(dir, 'SKILL.md'))) return dir;
  }
  return null;
}

export function loadSkill(name: string): LoadedSkill | null {
  const root = locateSkill(name);
  if (!root) return null;
  const skillMd = readFileSync(join(root, 'SKILL.md'), 'utf8');
  const refDir = join(root, 'reference');
  const referenceDir = existsSync(refDir) ? refDir : (existsSync(join(root, 'references')) ? join(root, 'references') : null);
  return { name, root, skillMd, referenceDir };
}

export function loadReference(skill: LoadedSkill, refName: string): string | null {
  if (!skill.referenceDir) return null;
  const path = join(skill.referenceDir, `${refName}.md`);
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf8');
}

export function listReferences(skill: LoadedSkill): string[] {
  if (!skill.referenceDir) return [];
  return readdirSync(skill.referenceDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));
}
