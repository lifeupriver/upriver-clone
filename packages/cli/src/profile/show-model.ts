/**
 * The `profile show` coverage model has been promoted to `@upriver/schemas`
 * (Build Spec 06 §1a) so the CLI and the dashboard coverage view render from one
 * builder and cannot drift. This module re-exports it; `commands/profile/show.ts`
 * and `profile/render.ts` keep importing from here.
 */
export {
  buildShowModel,
  buildDeliverableDetail,
  type ShowModel,
  type DeliverableRow,
  type UnapprovedBlocking,
  type SectionFill,
  type FieldState,
  type DeliverableDetail,
} from '@upriver/schemas';
