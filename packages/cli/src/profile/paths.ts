import { clientProfileZ, createEmptyProfile } from '@upriver/schemas';

/**
 * Dot-path validation + leaf enumeration against the `clientProfileZ` shape.
 *
 * The schema's zod AST is the single source of truth for which paths exist; the
 * `profile` commands validate operator-supplied paths against it rather than
 * hard-coding a list. This walker is ported from the schemas package's own
 * map↔schema cross-check test (`packages/schemas/src/coverage.test.ts`) — that
 * test resolves every coverage/HV dot-path against the composed schema. The
 * spec (§1) says reuse that walk and expose it here rather than modifying the
 * read-only schemas package.
 *
 * Tier-2 integration seam #1: this module is the single home for the schema-path
 * walker. The transcript extractor's former `transcript/paths.ts` (leaf
 * enumeration + candidate-value validation) was folded in here — those helpers
 * are below the `profile set` path-resolution family and reuse the same
 * `unwrap`/`objectShape`/envelope primitives. `transcript/` now imports them.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
function unwrap(schema: any): any {
  let s = schema;
  for (;;) {
    const t = s?._def?.typeName;
    if (t === 'ZodOptional' || t === 'ZodNullable' || t === 'ZodReadonly') s = s._def.innerType;
    else if (t === 'ZodDefault') s = s._def.innerType;
    else if (t === 'ZodEffects') s = s._def.schema;
    else if (t === 'ZodBranded') s = s._def.type;
    else return s;
  }
}

/** The object shape behind any wrappers (optional/default/effects), or null. */
function objectShape(s: any): Record<string, any> | null {
  const core = unwrap(s);
  return core?._def?.typeName === 'ZodObject' ? core._def.shape() : null;
}

function isEnvelopeSchema(s: any): boolean {
  const shape = objectShape(s);
  return !!shape && 'value' in shape && 'source' in shape && 'verified' in shape && 'updatedAt' in shape;
}

// ---------------------------------------------------------------------------
// `profile set` path resolution (concrete + wildcard) against the schema.
// ---------------------------------------------------------------------------

interface PathInfo {
  /** The path resolves to a node in the schema (wildcards allowed). */
  resolved: boolean;
  /** The terminal node is an envelope leaf (a writable profile field). */
  envelopeLeaf: boolean;
}

/**
 * Resolve `path` against the composed schema, returning whether it resolves and
 * whether the terminal node is an envelope leaf. Unwraps optionals/defaults,
 * descends into an envelope's `value` when a segment names an inner field, `*`
 * into array/record elements, and treats trailing `**` as the remainder.
 */
function resolvePathInfo(path: string): PathInfo {
  const segs = path.split('.');
  let cur = unwrap(clientProfileZ as any);
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i] as string;
    if (seg === '**') return { resolved: true, envelopeLeaf: false };
    const t = cur?._def?.typeName;
    if (seg === '*') {
      if (t === 'ZodArray') { cur = unwrap(cur._def.type); continue; }
      if (t === 'ZodRecord') { cur = unwrap(cur._def.valueType); continue; }
      if (isEnvelopeSchema(cur)) {
        const inner = unwrap(objectShape(cur)!.value);
        if (inner?._def?.typeName === 'ZodArray') { cur = unwrap(inner._def.type); continue; }
        if (inner?._def?.typeName === 'ZodRecord') { cur = unwrap(inner._def.valueType); continue; }
      }
      return { resolved: false, envelopeLeaf: false };
    }
    const shape = objectShape(cur);
    if (shape && seg in shape) { cur = unwrap(shape[seg]); continue; }
    if (isEnvelopeSchema(cur)) {
      const ishape = objectShape(unwrap(objectShape(cur)!.value));
      if (ishape && seg in ishape) { cur = unwrap(ishape[seg]); continue; }
    }
    if (t === 'ZodRecord') { cur = unwrap(cur._def.valueType); continue; }
    return { resolved: false, envelopeLeaf: false };
  }
  return { resolved: true, envelopeLeaf: isEnvelopeSchema(cur) };
}

/** Does `path` resolve against the Client Profile schema? Wildcards allowed. */
export function pathResolves(path: string): boolean {
  return resolvePathInfo(path).resolved;
}

/** A path with no `*`/`**` wildcard segment. */
export function isConcretePath(path: string): boolean {
  return !path.split('.').includes('*') && !path.split('.').includes('**');
}

export type SetPathResult = { ok: true } | { ok: false; reason: string };

/**
 * Validate a path for `profile set`: it must be concrete (no wildcards), resolve
 * against the schema, and point at an envelope leaf — a whole profile field —
 * rather than a value nested inside one or an entire section. `set` writes a
 * single envelope at the path; the envelope is the unit of provenance.
 */
export function validateSetPath(path: string): SetPathResult {
  if (!isConcretePath(path)) {
    return { ok: false, reason: `"${path}" contains a wildcard; set requires a concrete field path.` };
  }
  const info = resolvePathInfo(path);
  if (!info.resolved) {
    return { ok: false, reason: `"${path}" does not resolve against the Client Profile schema.` };
  }
  if (!info.envelopeLeaf) {
    return {
      ok: false,
      reason: `"${path}" is not a profile field (an envelope leaf); set the whole field, not a value inside it or a section.`,
    };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Leaf enumeration + candidate-value validation.
// Folded in from the transcript extractor (tier-2 integration seam #1). Used by
// `transcript/catalog.ts` (the system-prompt catalog) and `transcript/reconcile.ts`
// (path/value validation); shares the primitives above.
// ---------------------------------------------------------------------------

export interface LeafPathInfo {
  path: string;
  hint: string;
}

const VALIDATION_NOW = '2026-01-01T00:00:00.000Z';

function hintForInner(inner: any): string {
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
      return (core._def.options as any[]).map(hintForInner).join('|');
    default:
      return 'value';
  }
}

/** The envelope's inner value type → a coarse hint (`value: inner.nullable()`). */
function envelopeHint(schema: any): string {
  const shape = objectShape(schema);
  const valueSchema = shape?.['value'];
  return valueSchema ? hintForInner(valueSchema) : 'value';
}

function walk(schema: any, prefix: string, out: LeafPathInfo[]): void {
  if (prefix && isEnvelopeSchema(schema)) {
    out.push({ path: prefix, hint: envelopeHint(schema) });
    return;
  }
  const shape = objectShape(schema);
  if (!shape) return;
  for (const [key, child] of Object.entries(shape)) {
    if (prefix === '' && key === '_meta') continue; // doc metadata, not a field
    const next = prefix ? `${prefix}.${key}` : key;
    if (isEnvelopeSchema(child)) {
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
