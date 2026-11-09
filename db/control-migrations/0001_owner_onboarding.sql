BEGIN;
CREATE SCHEMA nevora_onboarding;
REVOKE ALL ON SCHEMA nevora_onboarding FROM PUBLIC;
CREATE TABLE nevora_onboarding.registrations(
 id uuid PRIMARY KEY,
 environment text NOT NULL CHECK(environment IN('test','development','production')),
 email_digest text NOT NULL CHECK(email_digest ~ '^[0-9a-f]{64}$'),
 email_ciphertext text NOT NULL,
 locale text NOT NULL CHECK(locale IN('en','es')),
 state text NOT NULL CHECK(state IN('EMAIL_PENDING','EMAIL_VERIFIED','WORKSPACE_RESERVED','PROVISIONING','OWNER_ACTIVATION_REQUIRED','SETUP_IN_PROGRESS','READY')),
 version bigint NOT NULL DEFAULT 1 CHECK(version>0),
 terms_version text NOT NULL,
 privacy_version text NOT NULL,
 consent_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 verification_digest text UNIQUE,
 verification_expires_at timestamptz NOT NULL,
 verification_retired_at timestamptz,
 verification_consumed_at timestamptz,
 verified_at timestamptz,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX ON nevora_onboarding.registrations(environment,email_digest);
CREATE UNIQUE INDEX one_unfinished_signup_per_email ON nevora_onboarding.registrations(environment,email_digest)
 WHERE state IN('EMAIL_PENDING','EMAIL_VERIFIED','WORKSPACE_RESERVED','PROVISIONING','OWNER_ACTIVATION_REQUIRED');
CREATE TABLE nevora_onboarding.email_subjects(
 environment text NOT NULL,
 email_digest text NOT NULL,
 last_sent_at timestamptz NOT NULL,
 PRIMARY KEY(environment,email_digest)
);
CREATE TABLE nevora_onboarding.admission_counters(
 environment text NOT NULL,
 kind text NOT NULL CHECK(kind IN('EMAIL','IP','PLATFORM')),
 subject_digest text NOT NULL,
 bucket_start timestamptz NOT NULL,
 attempts integer NOT NULL CHECK(attempts>0),
 PRIMARY KEY(environment,kind,subject_digest,bucket_start)
);
CREATE TABLE nevora_onboarding.registration_requests(
 operation_id uuid PRIMARY KEY,
 registration_id uuid REFERENCES nevora_onboarding.registrations(id) ON DELETE CASCADE,
 command_hash text NOT NULL,
 response_kind text NOT NULL CHECK(response_kind IN('DELIVERY_REQUESTED','QUIET')),
 terms_version text NOT NULL,
 privacy_version text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE nevora_onboarding.verification_deliveries(
 operation_id uuid PRIMARY KEY REFERENCES nevora_onboarding.registration_requests(operation_id) ON DELETE CASCADE,
 payload_ciphertext text,
 delivery_state text NOT NULL CHECK(delivery_state IN('PREPARED','SENDING','PROVIDER_ACCEPTED','FAILED','UNKNOWN')),
 claimed_at timestamptz,
 completed_at timestamptz,
 expires_at timestamptz NOT NULL,
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 1)
);
CREATE TABLE nevora_onboarding.signup_sessions(
 id uuid PRIMARY KEY,
 registration_id uuid NOT NULL REFERENCES nevora_onboarding.registrations(id) ON DELETE CASCADE,
 environment text NOT NULL,
 token_digest text NOT NULL UNIQUE CHECK(token_digest ~ '^[0-9a-f]{64}$'),
 expires_at timestamptz NOT NULL,
 revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE nevora_onboarding.verification_claim_receipts(
 operation_id uuid PRIMARY KEY,
 proof_digest text NOT NULL UNIQUE,
 registration_id uuid NOT NULL REFERENCES nevora_onboarding.registrations(id) ON DELETE CASCADE,
 session_id uuid NOT NULL REFERENCES nevora_onboarding.signup_sessions(id) ON DELETE CASCADE,
 session_ciphertext text,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
REVOKE ALL ON ALL TABLES IN SCHEMA nevora_onboarding FROM PUBLIC;
COMMIT;
