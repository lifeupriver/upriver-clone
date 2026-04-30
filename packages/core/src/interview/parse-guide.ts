/**
 * Parse `clients/<slug>/interview-guide.md` into a structured form spec the
 * dashboard can render as a fillable interview. The guide format is human-
 * authored markdown — see clients/littlefriends/interview-guide.md for the
 * canonical shape — so this parser is pragmatic, not strict.
 *
 * Item kinds:
 *   - q       : numbered question ("12. What does drop-off look like?")
 *   - check   : checkbox item ("- [ ] Logo SVG")
 *   - override: a multi-paragraph override block (#### Override 1: ...)
 */

export interface FormItem {
  id: string;
  kind: 'q' | 'check' | 'override';
  prompt: string;
  why?: string;
  detail?: string;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  items: FormItem[];
}

export interface FormSpec {
  sections: FormSection[];
  totalItems: number;
}

const H2 = /^##\s+(.+?)\s*$/;
const H3 = /^###\s+(.+?)\s*$/;
const H4 = /^####\s+(.+?)\s*$/;
const NUMBERED = /^\s*(\d+)\.\s+(.+?)\s*$/;
const CHECKBOX = /^\s*-\s+\[\s?\]\s+(.+?)\s*$/;

const WHY_TAIL = /\s*\*\(why:\s*(.+?)\)\*\s*$/i;

export function parseInterviewGuide(md: string): FormSpec {
  const lines = md.split(/\r?\n/);
  const sections: FormSection[] = [];

  let currentSection: FormSection | null = null;
  let currentSubtitle: string | null = null;
  let pendingOverride: { title: string; lines: string[]; idx: number } | null = null;
  let totalItems = 0;
  let questionCounter = 0;

  const flushOverride = () => {
    if (!pendingOverride || !currentSection) return;
    const detail = pendingOverride.lines.join('\n').trim();
    const titleLower = pendingOverride.title.toLowerCase();
    const idPrefix = titleLower.startsWith('probe') ? 'probe' : 'override';
    currentSection.items.push({
      id: `${currentSection.id}-${idPrefix}-${pendingOverride.idx}`,
      kind: 'override',
      prompt: pendingOverride.title,
      detail,
    });
    totalItems++;
    pendingOverride = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    if (pendingOverride) {
      if (H2.test(line) || H3.test(line) || H4.test(line)) {
        flushOverride();
      } else {
        pendingOverride.lines.push(line);
        continue;
      }
    }

    const h2 = line.match(H2);
    if (h2) {
      currentSection = {
        id: slugifySection(h2[1]!),
        title: h2[1]!,
        items: [],
      };
      sections.push(currentSection);
      currentSubtitle = null;
      questionCounter = 0;
      continue;
    }

    const h3 = line.match(H3);
    if (h3 && currentSection) {
      // Probe N and Override N blocks — rendered at h3 level in the guide —
      // are themselves form items (multi-paragraph prompt). Buffer them.
      const probeMatch = h3[1]!.match(/^(Probe|Override)\s+(\d+):\s*(.+?)\s*$/i);
      if (probeMatch) {
        pendingOverride = {
          idx: Number(probeMatch[2]),
          title: `${probeMatch[1]} ${probeMatch[2]}: ${probeMatch[3]}`,
          lines: [],
        };
        continue;
      }
      currentSubtitle = h3[1]!;
      continue;
    }

    const h4 = line.match(H4);
    if (h4 && currentSection) {
      const overrideMatch = h4[1]!.match(/^Override\s+(\d+):\s*(.+?)\s*$/i);
      if (overrideMatch) {
        pendingOverride = {
          idx: Number(overrideMatch[1]),
          title: overrideMatch[2]!,
          lines: [],
        };
      }
      continue;
    }

    if (!currentSection) continue;

    const numbered = line.match(NUMBERED);
    if (numbered) {
      const text = numbered[2]!;
      const why = text.match(WHY_TAIL);
      const cleanPrompt = why ? text.replace(WHY_TAIL, '').trim() : text.trim();
      questionCounter++;
      const item: FormItem = {
        id: `${currentSection.id}-q${questionCounter}`,
        kind: 'q',
        prompt: cleanPrompt,
      };
      if (why) item.why = why[1]!;
      if (currentSubtitle) item.detail = currentSubtitle;
      currentSection.items.push(item);
      totalItems++;
      continue;
    }

    const check = line.match(CHECKBOX);
    if (check) {
      const text = check[1]!;
      const id = `${currentSection.id}-c${currentSection.items.length + 1}`;
      const item: FormItem = { id, kind: 'check', prompt: text };
      if (currentSubtitle) item.detail = currentSubtitle;
      currentSection.items.push(item);
      totalItems++;
      continue;
    }
  }

  flushOverride();

  return { sections, totalItems };
}

function slugifySection(s: string): string {
  return s
    .toLowerCase()
    .replace(/^\d+\.?\s*/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/**
 * Compute completion stats given a parsed spec and a flat
 * `responses` map (id → answer string). An item is "answered" iff its key
 * exists in `responses` and the trimmed value is non-empty.
 */
export function summarizeProgress(
  spec: FormSpec,
  responses: Record<string, string | undefined>,
): { answered: number; total: number; perSection: Array<{ id: string; answered: number; total: number }> } {
  let answered = 0;
  const perSection = spec.sections.map((s) => {
    let a = 0;
    for (const item of s.items) {
      const v = responses[item.id];
      if (typeof v === 'string' && v.trim().length > 0) a++;
    }
    answered += a;
    return { id: s.id, answered: a, total: s.items.length };
  });
  return { answered, total: spec.totalItems, perSection };
}

/**
 * Render the response map back into a faux-transcript markdown blob suitable
 * for feeding into `process-interview`. Skipped items are omitted (they'd
 * dilute the LLM signal).
 */
export function responsesToTranscriptMarkdown(
  spec: FormSpec,
  responses: Record<string, string | undefined>,
  meta: { clientName: string },
): string {
  const out: string[] = [`# Interview responses — ${meta.clientName}`, ''];
  for (const section of spec.sections) {
    const answered = section.items.filter(
      (it) => typeof responses[it.id] === 'string' && responses[it.id]!.trim().length > 0,
    );
    if (answered.length === 0) continue;
    out.push(`## ${section.title}`, '');
    for (const item of answered) {
      const a = responses[item.id]!.trim();
      if (item.kind === 'check') {
        out.push(`- ${item.prompt} — ${a}`);
      } else {
        out.push(`**Q: ${item.prompt}**`);
        out.push(`A: ${a}`, '');
      }
    }
    out.push('');
  }
  return out.join('\n');
}
