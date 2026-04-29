/**
 * Substitution context for the report-send email template. All values are
 * stringified into the rendered output via simple `{{placeholder}}` swap.
 */
export interface EmailTemplateContext {
  clientName: string;
  clientFirstName: string;
  siteUrl: string;
  shareUrl: string;
  shareToken: string;
  auditDate: string;
  overallScore: number | string;
  criticalCount: number | string;
  topRecommendation: string;
}

/**
 * Email template body (markdown). The first line is the `Subject: ...` header
 * which downstream consumers extract. Edit `src/templates/report-email.md`
 * alongside this constant — the .md file is a human-editable reference, but
 * the runtime reads only this embedded string. If you edit the .md, also
 * update the const here.
 */
const TEMPLATE = `Subject: Your website audit is ready, {{clientName}}

Hi {{clientFirstName}},

We finished the audit of {{siteUrl}} on {{auditDate}}.

View the full report (private link, valid until you share it):
{{shareUrl}}

Highlights:
- Overall score: {{overallScore}}/100
- Critical issues to address: {{criticalCount}}
- Top recommendation: {{topRecommendation}}

When you have ten minutes, walk through the findings and let us know which ones you want fixed. The Next Steps page in the report has a short intake form to make that easy.

Reference token: {{shareToken}}

Talk soon,
Upriver Consulting
`;

/**
 * Render the report-email template by substituting each `{{placeholder}}`
 * with the matching context value. Unknown placeholders are left in place
 * so missing fields surface visibly during review.
 *
 * @param ctx - Substitution values for the template.
 * @returns The rendered markdown body, including the leading `Subject:` line.
 */
export function renderEmailTemplate(ctx: EmailTemplateContext): string {
  const map: Record<string, string> = {
    clientName: ctx.clientName,
    clientFirstName: ctx.clientFirstName,
    siteUrl: ctx.siteUrl,
    shareUrl: ctx.shareUrl,
    shareToken: ctx.shareToken,
    auditDate: ctx.auditDate,
    overallScore: String(ctx.overallScore),
    criticalCount: String(ctx.criticalCount),
    topRecommendation: ctx.topRecommendation,
  };
  return TEMPLATE.replace(/\{\{(\w+)\}\}/g, (full, key: string) => {
    return Object.prototype.hasOwnProperty.call(map, key) ? (map[key] ?? full) : full;
  });
}

/**
 * Extract the `Subject:` value from a rendered email body. Returns an empty
 * string if the first line is not a Subject header.
 *
 * @param rendered - Output of `renderEmailTemplate`.
 * @returns The subject line text, or `''` if absent.
 */
export function extractSubject(rendered: string): string {
  const firstLine = rendered.split('\n', 1)[0] ?? '';
  const m = firstLine.match(/^Subject:\s*(.*)$/);
  return m && m[1] ? m[1].trim() : '';
}
