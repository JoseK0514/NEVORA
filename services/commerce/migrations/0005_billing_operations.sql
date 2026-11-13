BEGIN;
-- Explicit operator migration; application startup/build never applies it.
CREATE TABLE IF NOT EXISTS commerce.billing_operations (
 business_id uuid NOT NULL REFERENCES commerce.businesses(id), operation uuid NOT NULL,
 action text NOT NULL CHECK(action IN('checkout','portal','plan-change')),
 actor_hash text NOT NULL CHECK(actor_hash~'^[a-f0-9]{64}$'),
 request_hash text NOT NULL CHECK(request_hash~'^[a-f0-9]{64}$'),
 binding_hash text NOT NULL CHECK(binding_hash~'^[a-f0-9]{64}$'),
 created_at timestamptz NOT NULL, expires_at timestamptz NOT NULL,
 started_at timestamptz, result_secret text, resolved_at timestamptz,
 PRIMARY KEY(business_id,operation),
 CHECK(expires_at>created_at AND expires_at<=created_at+interval '1 hour'),
 CHECK((result_secret IS NULL)=(resolved_at IS NULL)),
 CHECK(result_secret IS NULL OR octet_length(result_secret)<=131072)
);
CREATE UNIQUE INDEX IF NOT EXISTS commerce_one_unresolved_billing_operation
 ON commerce.billing_operations(business_id) WHERE started_at IS NOT NULL AND resolved_at IS NULL;
CREATE TABLE IF NOT EXISTS commerce.billing_operation_stages (
 business_id uuid NOT NULL, operation uuid NOT NULL, stage text NOT NULL CHECK(stage~'^[a-z][a-z0-9_]{0,31}$'),
 params_secret text NOT NULL CHECK(octet_length(params_secret)<=131072),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), issued_at timestamptz,
 result_secret text, resolved_at timestamptz,
 PRIMARY KEY(business_id,operation,stage),
 FOREIGN KEY(business_id,operation) REFERENCES commerce.billing_operations(business_id,operation),
 CHECK((result_secret IS NULL)=(resolved_at IS NULL)),
 CHECK(result_secret IS NULL OR octet_length(result_secret)<=131072),
 CHECK(result_secret IS NULL OR issued_at IS NOT NULL)
);
CREATE OR REPLACE FUNCTION commerce.billing_operation_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='billing_operations' THEN
  IF ROW(NEW.business_id,NEW.operation,NEW.action,NEW.actor_hash,NEW.request_hash,NEW.binding_hash,NEW.created_at,NEW.expires_at)
    IS DISTINCT FROM ROW(OLD.business_id,OLD.operation,OLD.action,OLD.actor_hash,OLD.request_hash,OLD.binding_hash,OLD.created_at,OLD.expires_at)
    OR (OLD.started_at IS NOT NULL AND NEW.started_at IS DISTINCT FROM OLD.started_at) THEN
   RAISE EXCEPTION 'billing_operation_identity_immutable';
  END IF;
 ELSE
  IF ROW(NEW.business_id,NEW.operation,NEW.stage,NEW.params_secret,NEW.created_at)
    IS DISTINCT FROM ROW(OLD.business_id,OLD.operation,OLD.stage,OLD.params_secret,OLD.created_at)
    OR (OLD.issued_at IS NOT NULL AND NEW.issued_at IS DISTINCT FROM OLD.issued_at) THEN
   RAISE EXCEPTION 'billing_operation_identity_immutable';
  END IF;
 END IF;
 IF OLD.result_secret IS NOT NULL AND (NEW.result_secret IS DISTINCT FROM OLD.result_secret OR NEW.resolved_at IS DISTINCT FROM OLD.resolved_at) THEN
  RAISE EXCEPTION 'billing_operation_result_immutable';
 END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS billing_operation_immutable ON commerce.billing_operations;
CREATE TRIGGER billing_operation_immutable BEFORE UPDATE ON commerce.billing_operations FOR EACH ROW EXECUTE FUNCTION commerce.billing_operation_immutable();
DROP TRIGGER IF EXISTS billing_operation_stage_immutable ON commerce.billing_operation_stages;
CREATE TRIGGER billing_operation_stage_immutable BEFORE UPDATE ON commerce.billing_operation_stages FOR EACH ROW EXECUTE FUNCTION commerce.billing_operation_immutable();
COMMIT;
