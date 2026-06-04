/**
 * Scan generated output for `[NEEDS CONFIRMATION: <question>]` markers (spec
 * §4). The model emits these wherever the profile is thin rather than inventing
 * facts; the run report aggregates them for the operator.
 */
const MARKER_RE = /\[NEEDS CONFIRMATION:\s*([\s\S]*?)\]/g;

export function scanMarkers(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(MARKER_RE)) {
    const question = (match[1] ?? '').trim().replace(/\s+/g, ' ');
    if (question.length > 0) out.push(question);
  }
  return out;
}
