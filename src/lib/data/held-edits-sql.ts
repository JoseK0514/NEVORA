/**
 * Publish changes (Jose, 2026-10-29): SQL boolean that is true when the live
 * shift `shift` (in schedule `schedule`) has a held manual edit, meaning its
 * live row differs from its row in the latest publication revision of its
 * week, or the latest revision does not show it at all. A week that was never
 * captured has no held edits. Callout release is excluded because it publishes
 * with its own approval revision. Notes count, as in the canonical comparison.
 *
 * Readers that offer a shift for exchange use NOT held(...) so nobody is asked
 * to trade or cover terms they were never shown.
 */
export function heldShiftEditSql(shift = 'sh', schedule = 's'): string {
  return `(EXISTS(SELECT 1 FROM schedule_publication_revisions held_any WHERE held_any.week_start=${schedule}.week_start)
 AND NOT EXISTS(SELECT 1 FROM schedule_publication_revision_shifts held_row
  WHERE held_row.revision_id=(SELECT held_latest.id FROM schedule_publication_revisions held_latest WHERE held_latest.week_start=${schedule}.week_start ORDER BY held_latest.revision_number DESC LIMIT 1)
  AND held_row.source_shift_id=${shift}.id AND held_row.schedule_id=${shift}.schedule_id AND held_row.location_id=${schedule}.location_id
  AND held_row.employee_id=${shift}.employee_id AND held_row.date=${shift}.date AND held_row.start_time=${shift}.start_time AND held_row.end_time=${shift}.end_time
  AND held_row.position_id IS NOT DISTINCT FROM ${shift}.position_id AND NULLIF(held_row.notes,'') IS NOT DISTINCT FROM NULLIF(${shift}.notes,'')
  AND held_row.is_designated_lead=${shift}.is_designated_lead))`;
}
