BEGIN;
CREATE SCHEMA IF NOT EXISTS commerce;
CREATE TABLE commerce.accounts (
 id uuid PRIMARY KEY, email text NOT NULL UNIQUE, password_hash text,
 profile jsonb NOT NULL, setup_fingerprint text, verified_at timestamptz, created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE commerce.businesses (
 id uuid PRIMARY KEY REFERENCES commerce.accounts(id), state text NOT NULL DEFAULT 'required' CHECK(state IN ('required','pending','provisioning','ready')),
 trial_started_at timestamptz, trial_ends_at timestamptz,
 stripe_customer_id text UNIQUE, stripe_subscription_id text UNIQUE, subscription_status text,
 paid_through timestamptz, past_due_since timestamptz, plan_key text CHECK(plan_key IN ('small','team')),
 checkout_id text, checkout_url text, checkout_expires_at timestamptz,
 sync_at timestamptz, employee_count integer NOT NULL CHECK(employee_count BETWEEN 1 AND 30),
 CHECK((trial_started_at IS NULL)=(trial_ends_at IS NULL))
);
CREATE TABLE commerce.tokens (
 hash text PRIMARY KEY, account_id uuid NOT NULL REFERENCES commerce.accounts(id),
 purpose text NOT NULL CHECK(purpose IN ('verify','signin','session','handoff')),
 expires_at timestamptz NOT NULL, owner_binding text, used_at timestamptz
);
CREATE TABLE commerce.slots (
 id text PRIMARY KEY, origin text NOT NULL UNIQUE, database_fingerprint text NOT NULL UNIQUE, database_secret text NOT NULL,
 instance_secret_hash text NOT NULL UNIQUE, instance_secret text NOT NULL,
 business_id uuid UNIQUE REFERENCES commerce.businesses(id), approved_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE commerce.jobs (
 id uuid PRIMARY KEY, dedupe_key text NOT NULL UNIQUE, kind text NOT NULL CHECK(kind IN ('mail','provision','stripe')),
 payload text NOT NULL, state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','running','done')),
 attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 lease_id uuid, lease_until timestamptz, last_error text
);
CREATE INDEX commerce_jobs_due ON commerce.jobs(available_at) WHERE state <> 'done';
CREATE TABLE commerce.checkout_intents (
 business_id uuid NOT NULL REFERENCES commerce.businesses(id), operation text NOT NULL,
 previous_subscription_id text, params_secret text NOT NULL, employee_count integer NOT NULL,
 plan_key text NOT NULL CHECK(plan_key IN ('small','team')), expires_at timestamptz NOT NULL,
 session_id text UNIQUE, result_secret text, reconciled_expired_at timestamptz, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(business_id,operation)
);
CREATE TABLE commerce.webhooks (id text PRIMARY KEY, received_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE commerce.rate_limits (key text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE commerce.audit (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, business_id uuid REFERENCES commerce.businesses(id), event text NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp());

CREATE OR REPLACE FUNCTION commerce.checkout_expiry_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.reconciled_expired_at IS NOT NULL AND NEW.session_id IS NULL THEN
  RAISE EXCEPTION 'checkout_expiry_observation_requires_session';
 END IF;
 IF TG_OP='UPDATE' AND OLD.reconciled_expired_at IS NOT NULL AND
  ROW(NEW.business_id,NEW.operation,NEW.previous_subscription_id,NEW.params_secret,NEW.employee_count,NEW.plan_key,NEW.expires_at,NEW.session_id,NEW.reconciled_expired_at)
   IS DISTINCT FROM ROW(OLD.business_id,OLD.operation,OLD.previous_subscription_id,OLD.params_secret,OLD.employee_count,OLD.plan_key,OLD.expires_at,OLD.session_id,OLD.reconciled_expired_at) THEN
  RAISE EXCEPTION 'checkout_expiry_observation_immutable';
 END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS checkout_expiry_immutable ON commerce.checkout_intents;
CREATE TRIGGER checkout_expiry_immutable BEFORE INSERT OR UPDATE ON commerce.checkout_intents FOR EACH ROW EXECUTE FUNCTION commerce.checkout_expiry_immutable();

-- Fresh catalogs include the explicit onboarding enrollment revision atomically.
ALTER TABLE commerce.accounts ADD COLUMN enrollment_source text NOT NULL DEFAULT 'slots' CHECK(enrollment_source IN('slots','onboarding'));
ALTER TABLE commerce.accounts DROP CONSTRAINT accounts_email_key;
CREATE UNIQUE INDEX commerce_legacy_email_unique ON commerce.accounts(email) WHERE enrollment_source='slots';
CREATE TABLE commerce.external_installations(
 business_id uuid PRIMARY KEY REFERENCES commerce.businesses(id), id text NOT NULL UNIQUE,
 origin text NOT NULL UNIQUE, environment text NOT NULL CHECK(environment IN('test','development','production')),
 incarnation bigint NOT NULL CHECK(incarnation>0), provider_project_id text NOT NULL, manifest_hash text NOT NULL,
 identity_hash text NOT NULL, worker_secret_hash text CHECK(worker_secret_hash IS NULL OR worker_secret_hash~'^[a-f0-9]{64}$'), instance_secret_hash text NOT NULL UNIQUE, instance_secret text NOT NULL
);
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
