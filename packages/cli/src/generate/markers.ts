/**
 * Scan generated output for inline markers (spec §4). `[NEEDS CONFIRMATION:
 * <question>]` is emitted wherever the profile is thin rather than inventing
 * facts; `[OPERATOR ACTION: <step>]` (provisioning only, Build Spec 09) flags a
 * click-ops step the engine cannot perform. The run report aggregates each class
 * for the operator.
 */
function scanTagged(text: string, tag: string): string[] {
  const re = new RegExp(`\\[${tag}:\\s*([\\s\\S]*?)\\]`, 'g');
  const out: string[] = [];
  for (const match of text.matchAll(re)) {
    const body = (match[1] ?? '').trim().replace(/\s+/g, ' ');
    if (body.length > 0) out.push(body);
  }
  return out;
}

/** `[NEEDS CONFIRMATION: ...]` questions, in order. */
export function scanMarkers(text: string): string[] {
  return scanTagged(text, 'NEEDS CONFIRMATION');
}

/** `[OPERATOR ACTION: ...]` cannot-generate steps, in order (provisioning). */
export function scanOperatorActions(text: string): string[] {
  return scanTagged(text, 'OPERATOR ACTION');
}
