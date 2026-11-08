BEGIN;
CREATE SCHEMA IF NOT EXISTS commerce;
CREATE TABLE commerce.accounts (
 id uuid PRIMARY KEY, email text NOT NULL UNIQUE, password_hash text,
 profile jsonb NOT NULL, verified_at timestamptz, created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE commerce.businesses (
 id uuid PRIMARY KEY REFERENCES commerce.accounts(id), state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','provisioning','ready')),
 trial_started_at timestamptz, trial_ends_at timestamptz,
 stripe_customer_id text UNIQUE, stripe_subscription_id text UNIQUE, subscription_status text,
 paid_through timestamptz, past_due_since timestamptz, plan_key text CHECK(plan_key IN ('small','team')),
 sync_at timestamptz, employee_count integer NOT NULL CHECK(employee_count BETWEEN 1 AND 30),
 CHECK((trial_started_at IS NULL)=(trial_ends_at IS NULL))
);
CREATE TABLE commerce.tokens (
 hash text PRIMARY KEY, account_id uuid NOT NULL REFERENCES commerce.accounts(id),
 purpose text NOT NULL CHECK(purpose IN ('verify','signin','session','handoff')),
 expires_at timestamptz NOT NULL, used_at timestamptz
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
CREATE TABLE commerce.webhooks (id text PRIMARY KEY, received_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE commerce.rate_limits (key text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE commerce.operations (
 business_id uuid NOT NULL REFERENCES commerce.businesses(id), key text NOT NULL, fingerprint text NOT NULL,
 result jsonb, PRIMARY KEY(business_id,key)
);
CREATE TABLE commerce.audit (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, business_id uuid REFERENCES commerce.businesses(id), event text NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp());
COMMIT;
