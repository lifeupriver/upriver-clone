import type { DeliverableId } from '@upriver/schemas';

/**
 * M5 provisioning scope: the client-facing infrastructure artifacts I01–I09
 * (PRD §3.4 / §6). I10–I15 are Joshua's own internal infrastructure and are out
 * of the per-client map. Listed numerically; `generationOrder` (via `planBatch`)
 * re-sorts into DAG tiers (I07 first, then I01, then I02→I04→I03, with
 * I05/I06/I08/I09 parallel after I01), so the listing order here is cosmetic.
 */
export const I_SERIES: readonly DeliverableId[] = [
  'i01', 'i02', 'i03', 'i04', 'i05', 'i06', 'i07', 'i08', 'i09',
];

/** Is `id` a provisioning artifact (i01–i09) rather than a prose doc (01–18)? */
export function isProvisioning(id: DeliverableId): boolean {
  return (I_SERIES as readonly string[]).includes(id);
}

/**
 * The second marker class, unique to provisioning (PRD §6). The model emits this
 * for any step that requires the client's Anthropic account or a third-party
 * consent screen and therefore CANNOT be produced as file content — the engine
 * never attempts it, and the run report aggregates these into the operator's
 * "must do" checklist alongside the `[NEEDS CONFIRMATION]` list.
 */
export const OPERATOR_ACTION_INSTRUCTION =
  'Where a step requires clicking inside the client\'s Anthropic account or a third-party consent screen and so cannot be produced as file content — creating or sharing the Project, completing an OAuth consent, uploading a skill ZIP, changing the plan tier or billing, installing an extension, or publishing an artifact — write [OPERATOR ACTION: <specific step>] inline at that point in the runbook rather than describing it as already done.';

/**
 * The provisioning output contract (PRD §6: "different output shape than M2's
 * prose docs"). One Markdown file in three parts — the generated config, the
 * operator runbook, and the cannot-generate checklist — confirmed against each
 * I0X spec's single-file "File naming" / "Delivery format" declaration. Returned
 * as the system-prompt "## Output contract" block body; `prompt-builder` wraps it
 * with the shared marker instruction and the spec body.
 */
export function provisioningOutputContract(outputPath: string, markerInstruction: string): string {
  return [
    '## Output contract',
    `Write the provisioning artifact to a single new Markdown file in your current working directory. Name it per the spec's File naming convention (a reasonable default is ${outputPath}).`,
    'Structure the file in three parts, in this order:',
    "  1. The configuration / reference itself, filled from the client profile per the spec's section-by-section template.",
    "  2. An \"## Operator runbook\" section listing, in order, the steps I (the operator) perform to stand this up — drawn from the spec's \"How to Build This Document\".",
    '  3. An "## Operator must do (cannot be generated)" checklist collecting every step that requires the client\'s account.',
    'Write only the artifact into that file. Do not print it to the conversation; your reply should be a short summary only.',
    markerInstruction,
    OPERATOR_ACTION_INSTRUCTION,
  ].join('\n');
}
