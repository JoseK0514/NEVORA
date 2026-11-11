BEGIN;
-- Preserve the existing authority-loss effects and ACL; only the login version
-- fence changes. No historical rows, passkey records or credentials are rewritten.
CREATE OR REPLACE FUNCTION public.auth_passkey_authority_loss() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE target text; why text;
BEGIN
  IF TG_TABLE_NAME='employees' THEN
    IF OLD.active AND NOT NEW.active THEN target:=NEW.id;why:='account_disabled'; END IF;
  ELSIF TG_TABLE_NAME='account_deletion_requests' THEN
    IF NEW.employee_id IS NOT NULL AND NEW.status IN ('received','processing') THEN
      target:=NEW.employee_id;why:='account_deletion';
      UPDATE employees SET updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 microsecond') WHERE id=target;
    END IF;
  ELSIF TG_OP='DELETE' THEN
    target:=OLD.employee_id;why:='credential_reset';
  ELSE
    IF NEW.password_hash IS DISTINCT FROM OLD.password_hash OR NEW.password_updated_at IS DISTINCT FROM OLD.password_updated_at
      THEN target:=NEW.employee_id;why:='credential_reset'; END IF;
  END IF;
  IF target IS NOT NULL THEN
    WITH revoked AS (
      UPDATE employee_passkeys SET revoked_at=clock_timestamp(),revocation_reason=why
      WHERE employee_id=target AND revoked_at IS NULL RETURNING id
    )
    INSERT INTO auth_passkey_audit(employee_id,passkey_id,event,reason)
      SELECT target,id,'revoke',why FROM revoked;
    DELETE FROM auth_passkey_challenges WHERE employee_id=target;
    IF why='account_deletion' THEN
      DELETE FROM employee_sessions WHERE employee_id=target;
      UPDATE calendar_subscriptions SET revoked_at=clock_timestamp(),revocation_reason='account_loss'
        WHERE employee_id=target AND revoked_at IS NULL;
    END IF;
  END IF;
  RETURN NULL;
END $$;
COMMIT;
