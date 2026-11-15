BEGIN;
-- A password-proven initial replacement is neither email nor assisted recovery.
-- No existing credentials, sessions, statements or operational data are rewritten.
ALTER TABLE password_recovery_proofs DROP CONSTRAINT password_recovery_proofs_method_check;
ALTER TABLE password_recovery_proofs ADD CONSTRAINT password_recovery_proofs_method_check
 CHECK(method IN ('EMAIL','ASSISTED','INITIAL_PASSWORD'));
COMMIT;
