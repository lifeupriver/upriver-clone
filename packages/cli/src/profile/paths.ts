import { clientProfileZ } from '@upriver/schemas';

/**
 * Dot-path validation against the `clientProfileZ` shape.
 *
 * The schema's zod AST is the single source of truth for which paths exist; the
 * `profile` commands validate operator-supplied paths against it rather than
 * hard-coding a list. This walker is ported from the schemas package's own
 * map↔schema cross-check test (`packages/schemas/src/coverage.test.ts`) — that
 * test resolves every coverage/HV dot-path against the composed schema. The
 * spec (§1) says reuse that walk and expose it here rather than modifying the
 * read-only schemas package.
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

function objectShape(s: any): Record<string, any> | null {
  return s?._def?.typeName === 'ZodObject' ? s._def.shape() : null;
}

function isEnvelopeSchema(s: any): boolean {
  const shape = objectShape(s);
  return !!shape && 'value' in shape && 'source' in shape && 'verified' in shape && 'updatedAt' in shape;
}

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
/* eslint-enable @typescript-eslint/no-explicit-any */

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
