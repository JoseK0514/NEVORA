-- Additive, own-account topic choices; absence preserves existing delivery defaults.
CREATE TABLE IF NOT EXISTS management_alert_preferences (
  workspace_id text NOT NULL REFERENCES workspaces(id),
  employee_id text NOT NULL REFERENCES employees(id),
  topic_id text NOT NULL CHECK (topic_id IN ('time-off','shift-changes','unable-to-work','clock-review','payroll-ready')),
  enabled boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(workspace_id,employee_id,topic_id)
);

CREATE OR REPLACE FUNCTION management_alert_topic(source_kind text, event_type text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE source_kind
    WHEN 'TIME_OFF' THEN 'time-off' WHEN 'EXCHANGE' THEN 'shift-changes'
    WHEN 'CALLOUT' THEN 'unable-to-work' WHEN 'PAYROLL_PREPARATION' THEN 'payroll-ready'
    ELSE CASE WHEN event_type IN ('CLOCK_REVIEW_REQUIRED','ATTENDANCE_REVIEW_REQUIRED','TIME_CORRECTION_REVIEW_REQUIRED') THEN 'clock-review' END END
$$;

CREATE OR REPLACE FUNCTION management_alert_on(actor text, topic text)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM management_alert_preferences p JOIN employees e ON e.id=p.employee_id
      JOIN locations l ON l.id=e.primary_location_id AND l.workspace_id=p.workspace_id
    WHERE p.employee_id=actor AND p.topic_id=topic AND NOT p.enabled AND e.role IN ('OWNER','MANAGER')
  )
$$;

-- Preserve intent/history identities and INSERT RETURNING behavior. An opted-out
-- intent is retained as cancelled; it cannot enter the inbox or push dispatcher.
CREATE OR REPLACE FUNCTION apply_management_alert_preference()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE topic text; member text; member_kind text; retained text[] := ARRAY[]::text[];
BEGIN
  topic := management_alert_topic(NEW.source_kind,NEW.type);
  IF NEW.source_kind='MANAGER_SUMMARY' AND cardinality(NEW.item_keys)>0 THEN
    FOREACH member IN ARRAY NEW.item_keys LOOP
      BEGIN
        member_kind := (member::jsonb)->>0;
        IF management_alert_on(NEW.employee_id,management_alert_topic(member_kind,NULL)) THEN
          retained := array_append(retained,member);
        END IF;
      EXCEPTION WHEN invalid_text_representation THEN
        -- Retain legacy/non-JSON keys; never guess their topic.
        retained := array_append(retained,member);
      END;
    END LOOP;
    NEW.item_keys := retained;
    IF cardinality(retained)=0 THEN
      NEW.cancelled_at := COALESCE(NEW.cancelled_at,clock_timestamp());
      NEW.push_state := 'cancelled';
    END IF;
  ELSIF NOT management_alert_on(NEW.employee_id,topic) THEN
    NEW.cancelled_at := COALESCE(NEW.cancelled_at,clock_timestamp());
    NEW.push_state := 'cancelled';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS management_alert_preference ON notifications;
CREATE TRIGGER management_alert_preference
BEFORE INSERT OR UPDATE OF item_keys ON notifications
FOR EACH ROW EXECUTE FUNCTION apply_management_alert_preference();
