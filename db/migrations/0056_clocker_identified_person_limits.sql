BEGIN;
-- Forward-only extension. Original PIN and held tenancy migrations stay byte-stable.
ALTER TABLE public.clocker_pin_limits DROP CONSTRAINT clocker_pin_limits_scope_check;
ALTER TABLE public.clocker_pin_limits ADD CONSTRAINT clocker_pin_limits_scope_check
 CHECK (scope IN ('DEVICE','WORKSPACE','PERSON'));

-- A PERSON key is a real canonical employee identity, never a submitted unknown
-- ID or a guessed PIN digest. No new definer privilege or callable authority.
CREATE FUNCTION public.clocker_pin_person_parent_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $person_parent$
DECLARE parent_workspace text;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF (OLD.scope='PERSON' OR NEW.scope='PERSON')
   AND (NEW.scope,NEW.scope_id) IS DISTINCT FROM (OLD.scope,OLD.scope_id) THEN
   RAISE EXCEPTION 'clocker_pin_person_identity_immutable' USING ERRCODE='23514';
  END IF;
  -- Budget/window changes and fenced metadata backfill retain the exact key.
  -- Do not turn later revocation into a rollback of already-spent abuse credit.
  RETURN NEW;
 END IF;
 IF NEW.scope<>'PERSON' THEN RETURN NEW; END IF;
 SELECT CASE WHEN to_jsonb(e) ? 'workspace_id' THEN to_jsonb(e)->>'workspace_id'
   ELSE l.workspace_id END INTO parent_workspace
 FROM public.employees e JOIN public.locations l ON l.id=e.primary_location_id
 WHERE e.id=NEW.scope_id FOR KEY SHARE OF e;
 -- Once f10 metadata exists it is the only parent authority. A missing/unfilled
 -- immutable owner must fail closed, not be inferred from a mutable location.
 IF parent_workspace IS NULL
  OR NOT EXISTS(SELECT 1 FROM public.workspaces w WHERE w.id=parent_workspace AND w.singleton)
  OR ((to_jsonb(NEW)->>'workspace_id') IS NOT NULL
   AND (to_jsonb(NEW)->>'workspace_id') IS DISTINCT FROM parent_workspace) THEN
  RAISE EXCEPTION 'clocker_pin_person_parent_invalid' USING ERRCODE='23503';
 END IF;
 IF to_jsonb(NEW) ? 'workspace_id' THEN
  -- INSERT only: copy already-proven immutable employee ownership into the
  -- added f10 metadata before its identity guard runs. Never fill an UPDATE,
  -- infer an unfilled employee owner, or evade the statement-level write fence.
  NEW:=jsonb_populate_record(NEW,jsonb_build_object('workspace_id',parent_workspace));
 END IF;
 RETURN NEW;
END;
$person_parent$;
REVOKE ALL ON FUNCTION public.clocker_pin_person_parent_guard() FROM PUBLIC;
CREATE TRIGGER clocker_pin_person_parent BEFORE INSERT OR UPDATE ON public.clocker_pin_limits
 FOR EACH ROW EXECUTE FUNCTION public.clocker_pin_person_parent_guard();
-- Existing f10 statement/row guards, when installed, continue to run. Their
-- statement fence runs before this row trigger; it is never bypassed or disabled.
COMMIT;
