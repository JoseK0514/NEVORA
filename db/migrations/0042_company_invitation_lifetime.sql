BEGIN;
-- Invitation lifetime: 15 minutes -> 7 days (Jose approved October 27, 2026), as a fixed 168 hours so a
-- daylight-saving change in the session time zone never shortens it or trips the check. New hires often open the
-- email hours later, and only an Owner can reissue. Single use, retire-on-reissue, issue limits and
-- digest custody are unchanged. Requires 0032; applied after it in FINAL_MIGRATIONS.
LOCK TABLE company_invitations IN SHARE ROW EXCLUSIVE MODE;
DO $$
DECLARE name text;
BEGIN
 FOR name IN SELECT conname FROM pg_constraint
   WHERE conrelid='company_invitations'::regclass AND contype='c' AND conname<>'company_invitations_lifetime'
     AND pg_get_constraintdef(oid) LIKE '%expires_at > issued_at%'
 LOOP EXECUTE format('ALTER TABLE company_invitations DROP CONSTRAINT %I',name); END LOOP;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='company_invitations'::regclass AND conname='company_invitations_lifetime') THEN
  ALTER TABLE company_invitations ADD CONSTRAINT company_invitations_lifetime
   CHECK(expires_at>issued_at AND expires_at<=issued_at+interval '168 hours');
 END IF;
END $$;
COMMIT;
