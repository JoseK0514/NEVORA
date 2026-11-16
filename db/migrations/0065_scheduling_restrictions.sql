BEGIN;

-- Employee-entered availability remains a separate source. NULL is deliberately
-- unconfirmed legacy data; no existing pattern is promoted to an agreement.
ALTER TABLE employee_scheduling_settings ADD COLUMN management_restrictions jsonb
 CHECK (management_restrictions IS NULL OR (
  jsonb_typeof(management_restrictions)='object'
  AND management_restrictions ?& ARRAY['schemaVersion','revision','versions','requests']
  AND jsonb_typeof(management_restrictions->'schemaVersion')='number'
  AND management_restrictions->>'schemaVersion'='1'
  AND jsonb_typeof(management_restrictions->'versions')='array'
  AND jsonb_typeof(management_restrictions->'requests')='array'
  AND jsonb_typeof(management_restrictions->'revision')='number'
  AND management_restrictions->>'revision' ~ '^[0-9]+$'
  AND octet_length(management_restrictions::text)<=1048576
 ));

CREATE FUNCTION preserve_management_restrictions_history() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE previous jsonb; current_request jsonb; i integer;
BEGIN
 IF OLD.management_restrictions IS NULL OR NEW.management_restrictions IS NOT DISTINCT FROM OLD.management_restrictions THEN RETURN NEW; END IF;
 IF NEW.management_restrictions IS NULL
  OR (NEW.management_restrictions->>'revision')::bigint<>(OLD.management_restrictions->>'revision')::bigint+1
  OR jsonb_array_length(NEW.management_restrictions->'versions')<jsonb_array_length(OLD.management_restrictions->'versions')
  OR jsonb_array_length(NEW.management_restrictions->'requests')<jsonb_array_length(OLD.management_restrictions->'requests') THEN
  RAISE EXCEPTION 'scheduling_restrictions_history_immutable';
 END IF;
 FOR i IN 0..jsonb_array_length(OLD.management_restrictions->'versions')-1 LOOP
  IF NEW.management_restrictions->'versions'->i IS DISTINCT FROM OLD.management_restrictions->'versions'->i THEN RAISE EXCEPTION 'scheduling_restrictions_history_immutable'; END IF;
 END LOOP;
 FOR i IN 0..jsonb_array_length(OLD.management_restrictions->'requests')-1 LOOP
  previous=OLD.management_restrictions->'requests'->i;
  current_request=NEW.management_restrictions->'requests'->i;
  IF previous->>'status'<>'PENDING' THEN
   IF previous IS DISTINCT FROM current_request THEN RAISE EXCEPTION 'scheduling_restrictions_history_immutable'; END IF;
  ELSIF previous-ARRAY['status','decision'] IS DISTINCT FROM current_request-ARRAY['status','decision'] THEN
   RAISE EXCEPTION 'scheduling_restrictions_history_immutable';
  END IF;
 END LOOP;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION preserve_management_restrictions_history() FROM PUBLIC;
CREATE TRIGGER management_restrictions_history BEFORE UPDATE OF management_restrictions
 ON employee_scheduling_settings FOR EACH ROW EXECUTE FUNCTION preserve_management_restrictions_history();

COMMIT;
