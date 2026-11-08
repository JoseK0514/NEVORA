BEGIN;

-- Established settings/profile writers and onboarding share one revision. One
-- transaction can touch several canonical tables but advances it only once.
ALTER TABLE onboarding_progress ADD COLUMN IF NOT EXISTS canonical_transaction xid8;
CREATE OR REPLACE FUNCTION onboarding_canonical_revision() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 UPDATE public.onboarding_progress p SET version=p.version+1,updated_at=clock_timestamp(),canonical_transaction=pg_current_xact_id()
 FROM public.onboarding_workspace_identity a
 WHERE a.singleton AND a.lifecycle='ACTIVE' AND p.workspace_id=a.workspace_id
 AND p.canonical_transaction IS DISTINCT FROM pg_current_xact_id();
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION onboarding_canonical_revision() FROM PUBLIC;
DO $$ DECLARE relation text; BEGIN
 FOREACH relation IN ARRAY ARRAY['workspaces','locations','positions','employees','employee_location_eligibility','employee_positions','employee_scheduling_settings','location_staffing_settings','location_coverage_windows','coverage_window_position_requirements'] LOOP
  EXECUTE format('CREATE TRIGGER onboarding_canonical_revision AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.onboarding_canonical_revision()',relation);
 END LOOP;
END $$;

COMMIT;
