BEGIN;
-- Older prepared rows, if any, remain non-dispatchable until reviewed anew.
ALTER TABLE onboarding_invitation_batches ADD COLUMN owner_generation bigint NOT NULL DEFAULT 0 CHECK(owner_generation>=0);
ALTER TABLE onboarding_invitation_items ADD COLUMN target_generation bigint NOT NULL DEFAULT 0 CHECK(target_generation>=0);
CREATE FUNCTION onboarding_batch_custody_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='onboarding_invitation_batches' THEN
  IF (NEW.workspace_id,NEW.actor_employee_id,NEW.operation_id,NEW.command_hash,NEW.owner_generation,NEW.created_at) IS DISTINCT FROM (OLD.workspace_id,OLD.actor_employee_id,OLD.operation_id,OLD.command_hash,OLD.owner_generation,OLD.created_at) THEN RAISE EXCEPTION 'onboarding_batch_custody_immutable'; END IF;
 ELSE
  IF (NEW.workspace_id,NEW.actor_employee_id,NEW.operation_id,NEW.employee_id,NEW.child_operation_id,NEW.expected_employee_version,NEW.expected_invitation_revision,NEW.target_generation) IS DISTINCT FROM (OLD.workspace_id,OLD.actor_employee_id,OLD.operation_id,OLD.employee_id,OLD.child_operation_id,OLD.expected_employee_version,OLD.expected_invitation_revision,OLD.target_generation) THEN RAISE EXCEPTION 'onboarding_batch_target_immutable'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER onboarding_batch_custody BEFORE UPDATE ON onboarding_invitation_batches FOR EACH ROW EXECUTE FUNCTION onboarding_batch_custody_immutable();
CREATE TRIGGER onboarding_batch_target BEFORE UPDATE ON onboarding_invitation_items FOR EACH ROW EXECUTE FUNCTION onboarding_batch_custody_immutable();
COMMIT;
