import 'server-only';

/** A read-only projection of the scheduling records for the outer workspace w.
 * Historic publications count even after the week leaves the live schedule. */
export const scheduleActivationEvidenceSql = `
  EXISTS(SELECT 1 FROM active_locations) AND NOT EXISTS(
    SELECT 1 FROM active_locations l
    WHERE NOT EXISTS(SELECT 1 FROM public.location_staffing_settings s WHERE s.location_id=l.id)
       OR NOT EXISTS(SELECT 1 FROM public.location_coverage_windows c WHERE c.location_id=l.id)
       OR NOT EXISTS(
         SELECT 1 FROM public.employee_location_eligibility eligibility
         JOIN public.employees member ON member.id=eligibility.employee_id AND member.active
         JOIN public.locations home ON home.id=member.primary_location_id
         WHERE eligibility.location_id=l.id AND home.workspace_id=w.id
       )
       OR EXISTS(
         SELECT 1 FROM public.location_coverage_windows c
         JOIN public.coverage_window_position_requirements r ON r.coverage_window_id=c.id
         JOIN public.positions p ON p.id=r.position_id
         WHERE c.location_id=l.id AND (NOT p.active OR p.workspace_id<>w.id)
       )
  ) AS "LOCATION_AND_RULES",
  (
    EXISTS(
      SELECT 1 FROM public.schedule_publication_revisions r
      JOIN public.employees publisher ON publisher.id=r.created_by
      JOIN public.locations home ON home.id=publisher.primary_location_id
      WHERE r.source_type='PUBLISH' AND home.workspace_id=w.id
        AND (r.affected_location_id IS NULL OR EXISTS(
          SELECT 1 FROM public.locations l WHERE l.id=r.affected_location_id AND l.workspace_id=w.id
        ))
    ) OR EXISTS(
      SELECT 1 FROM public.schedules s JOIN public.locations l ON l.id=s.location_id
      WHERE l.workspace_id=w.id AND s.status IN ('PUBLISHED','ARCHIVED') AND s.published_at IS NOT NULL
    )
  ) AS "FIRST_SCHEDULE_PUBLISHED"`;
