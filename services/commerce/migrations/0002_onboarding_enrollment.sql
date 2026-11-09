BEGIN;
ALTER TABLE commerce.accounts ADD COLUMN enrollment_source text NOT NULL DEFAULT 'slots' CHECK(enrollment_source IN('slots','onboarding'));
ALTER TABLE commerce.accounts DROP CONSTRAINT accounts_email_key;
CREATE UNIQUE INDEX commerce_legacy_email_unique ON commerce.accounts(email) WHERE enrollment_source='slots';
CREATE TABLE commerce.external_installations(
 business_id uuid PRIMARY KEY REFERENCES commerce.businesses(id), id text NOT NULL UNIQUE,
 origin text NOT NULL UNIQUE, environment text NOT NULL CHECK(environment IN('test','development','production')),
 incarnation bigint NOT NULL CHECK(incarnation>0), provider_project_id text NOT NULL, manifest_hash text NOT NULL,
 identity_hash text NOT NULL, instance_secret_hash text NOT NULL UNIQUE, instance_secret text NOT NULL
);
COMMIT;
