// Schema path catalog + validation, walked from `clientProfileZ` (spec §1).
//
// Build Spec 03 will land an equivalent `packages/cli/src/profile/paths.ts`
// (path validation against the profile schema). That module is not on `main`
// when this is built, so the walk is implemented locally here; consolidating
// the two into one shared helper is a tracked follow-up (spec §3 changelog).

import { clientProfileZ, createEmptyProfile } from '@upriver/schemas';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Zod = any;

export interface LeafPathInfo {
  path: string;
  hint: string;
}

const VALIDATION_NOW = '2026-01-01T00:00:00.000Z';

/** Strip Optional/Nullable/Default/Effects/Readonly wrappers to the core type. */
function unwrap(schema: Zod): Zod {
  let cur = schema;
  for (;;) {
    const tn: string | undefined = cur?._def?.typeName;
    if (tn === 'ZodOptional' || tn === 'ZodNullable' || tn === 'ZodReadonly') {
      cur = cur._def.innerType;
    } else if (tn === 'ZodDefault') {
      cur = cur._def.innerType;
    } else if (tn === 'ZodEffects') {
      cur = cur._def.schema;
    } else {
      return cur;
    }
  }
}

function objectShape(schema: Zod): Record<string, Zod> | null {
  const core = unwrap(schema);
  if (core?._def?.typeName !== 'ZodObject') return null;
  return core._def.shape();
}

/** A `profileFieldZ(...)` envelope: an object carrying value/source/verified. */
function isEnvelopeObject(schema: Zod): boolean {
  const shape = objectShape(schema);
  if (!shape) return false;
  return 'value' in shape && 'source' in shape && 'verified' in shape;
}

function hintForInner(inner: Zod): string {
  const core = unwrap(inner);
  switch (core?._def?.typeName) {
    case 'ZodArray':
      return 'array';
    case 'ZodObject':
      return 'object';
    case 'ZodString':
      return 'string';
    case 'ZodNumber':
      return 'number';
    case 'ZodBoolean':
      return 'boolean';
    case 'ZodEnum':
      return `enum(${(core._def.values as string[]).join('|')})`;
    case 'ZodLiteral':
      return `literal(${String(core._def.value)})`;
    case 'ZodUnion':
      return (core._def.options as Zod[]).map(hintForInner).join('|');
    default:
      return 'value';
  }
}

/** The envelope's inner value type → a coarse hint (`value: inner.nullable()`). */
function envelopeHint(schema: Zod): string {
  const shape = objectShape(schema);
  const valueSchema = shape?.['value'];
  return valueSchema ? hintForInner(valueSchema) : 'value';
}

function walk(schema: Zod, prefix: string, out: LeafPathInfo[]): void {
  if (prefix && isEnvelopeObject(schema)) {
    out.push({ path: prefix, hint: envelopeHint(schema) });
    return;
  }
  const shape = objectShape(schema);
  if (!shape) return;
  for (const [key, child] of Object.entries(shape)) {
    if (prefix === '' && key === '_meta') continue; // doc metadata, not a field
    const next = prefix ? `${prefix}.${key}` : key;
    if (isEnvelopeObject(child)) {
      out.push({ path: next, hint: envelopeHint(child) });
    } else {
      walk(child, next, out);
    }
  }
}

let cachedLeaves: LeafPathInfo[] | null = null;

/** Every envelope-leaf dot-path in the profile schema, with a type hint. */
export function enumerateLeafPaths(): LeafPathInfo[] {
  if (cachedLeaves) return cachedLeaves;
  const out: LeafPathInfo[] = [];
  walk(clientProfileZ, '', out);
  cachedLeaves = out;
  return out;
}

let cachedSet: Map<string, string> | null = null;
function leafMap(): Map<string, string> {
  if (cachedSet) return cachedSet;
  cachedSet = new Map(enumerateLeafPaths().map((e) => [e.path, e.hint]));
  return cachedSet;
}

/** Is `path` a real envelope leaf in the schema? */
export function isValidLeafPath(path: string): boolean {
  return leafMap().has(path);
}

/** Coarse type hint for a leaf path, or undefined if unknown. */
export function hintForPath(path: string): string | undefined {
  return leafMap().get(path);
}

export type ValueValidation = { ok: true } | { ok: false; error: string };

function setAtPath(root: Record<string, unknown>, path: string, value: unknown): void {
  const segs = path.split('.');
  let cur = root;
  for (let i = 0; i < segs.length - 1; i++) {
    const seg = segs[i] as string;
    if (typeof cur[seg] !== 'object' || cur[seg] === null) cur[seg] = {};
    cur = cur[seg] as Record<string, unknown>;
  }
  cur[segs[segs.length - 1] as string] = value;
}

/**
 * Does `value` fit the inner schema at `path`? Builds a one-field profile and
 * parses it with `clientProfileZ`, so the check is exactly what `profile import`
 * would accept. Evidence is intentionally omitted — its 2000-char cap is a
 * separate concern (the caller clamps), and must not fail an otherwise-valid
 * value.
 */
export function validateCandidateValue(path: string, value: unknown): ValueValidation {
  if (!isValidLeafPath(path)) return { ok: false, error: `unknown schema path: ${path}` };
  const probe = createEmptyProfile('__validate__', VALIDATION_NOW) as unknown as Record<
    string,
    unknown
  >;
  setAtPath(probe, path, {
    value,
    source: 'transcript',
    confidence: 'medium',
    verified: false,
    updatedAt: VALIDATION_NOW,
  });
  const result = clientProfileZ.safeParse(probe);
  if (result.success) return { ok: true };
  const issue = result.error.issues.find((i) => i.path.join('.').startsWith(path)) ?? result.error.issues[0];
  return { ok: false, error: issue ? `${issue.path.join('.')}: ${issue.message}` : 'invalid value' };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
