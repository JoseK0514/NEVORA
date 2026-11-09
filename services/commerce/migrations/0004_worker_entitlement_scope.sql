BEGIN;
ALTER TABLE commerce.external_installations ADD COLUMN worker_secret_hash text CHECK(worker_secret_hash IS NULL OR worker_secret_hash~'^[a-f0-9]{64}$');
COMMIT;
