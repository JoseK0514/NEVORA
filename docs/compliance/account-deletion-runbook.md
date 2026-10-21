# Account deletion runbook (until the automatic purge ships)

For VELANI LLC operators. Run against production only with Jose’s authorization and a fresh backup. Never paste
personal data into tickets or chat; use the request reference.

## 1. See open requests

```sql
SELECT reference, workspace_id, channel, status, confirmed_at
  FROM account_deletion_requests
 WHERE status IN ('received', 'processing')
 ORDER BY confirmed_at;
```

Complete each within `DELETION_COMPLETION_PERIOD` (see `src/lib/legal/policies.ts`), counted from `confirmed_at`.

## 2. Start one

```sql
UPDATE account_deletion_requests SET status = 'processing', updated_at = clock_timestamp()
 WHERE reference = $1 AND status = 'received' RETURNING employee_id;
```

Sessions and calendar feeds were already removed when the request was accepted. Sign-in is blocked while the
request is open.

## 3. Check what is in flight

Before removing anything, check for an open clock-in, a pending correction, time-off or exchange, or a payroll
period being prepared for this person. Let the employer resolve those (or record why they stay) so deletion
neither breaks a work record nor leaves a half-finished one.

## 4. Remove or de-identify

Follow the table in `README.md` (“Data inventory”). In short:

- Delete: credentials, recovery proofs, Clocker PIN, push subscriptions, inbox notifications, receipts, calendar
  subscriptions, contributed updates the person authored (or de-identify the author).
- Employer work records (shifts, time, corrections, payroll): keep or de-identify as `RETENTION_SCHEDULE` says;
  restrict access to what is kept.
- `employees` row: clear first name, last name, phone and email (replace with a neutral label such as
  “Former team member”) when work records must stay; otherwise delete it.
- Outside the database: email provider, push provider, logs, backups (`BACKUP_EXPIRY`).

## 5. Finish

```sql
UPDATE account_deletion_requests
   SET status = 'completed', completed_at = clock_timestamp(), updated_at = clock_timestamp(),
       retained_note = $2  -- what was kept, why, and until when; no personal data
 WHERE reference = $1 AND status = 'processing';
```

Email the person (if an address was on file before removal) that deletion is complete and what, if anything, was
kept and until when. Only mark a request completed when every step above is done.

## Withdrawing

If the person changes their mind before processing starts, set `status = 'withdrawn'`. They can then sign in again
with their password (calendar feeds stay revoked; they can turn them on again in Profile).
