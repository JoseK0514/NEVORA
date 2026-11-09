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

Jose approved verification by control of the pre-request account email plus Employee ID on October 29, 2026.
Withdrawal is handled by Support only, before processing starts
(`status = 'received'`). Contacting Support is not a guarantee of withdrawal. There is no in-app cancellation.

### Verify the account holder

1. Find the exact request reference, workspace and Employee ID. Check its status without changing it.
2. Establish the account email **as it was before this request**, using an authorized historical record tied to
   the request's `confirmed_at`. Do not substitute a new address supplied in the support conversation or assume
   the current employee profile is unchanged. Migration 0034 deliberately stores no profile/email snapshot.
   Until Operations identifies a trustworthy pre-request source for this account, **do not withdraw**; escalate
   to Jose. Do not add personal-data copies to tickets, the request row or this repository as a workaround.
3. Verify control of that pre-request mailbox: Support initiates a fresh, unpredictable, single-use challenge to
   that recorded address through the approved support mailbox. Require a reply containing the challenge and the
   matching Employee ID. Expire the challenge after 15 minutes and invalidate it after successful use. A matching
   From address, an Employee ID, a request reference, a forwarded message or a prior challenge alone is insufficient.
   Never ask for the person's password, passkey, recovery proof or identity documents.
4. Record verification in the restricted operations case, referenced by deletion reference: workspace/Employee ID,
   operator, verification time, historical-source reference/time, outbound challenge message reference, expiry and
   successful one-time verification. Do not retain the challenge value or duplicate the email address in the case.
   An unverified request, expired challenge or mismatched ID must leave the deletion status unchanged.

This is an operator procedure, not an automated email sender or new collection feature. Support mailbox access,
the historical contact source and the challenge procedure must be verified before live use. No production
withdrawal, mailbox delivery or provider verification is implied by local SQL rehearsal.

### Apply the verified withdrawal

After the checks above, bind `$1` to the exact reference, `$2` to its workspace and `$3` to the verified Employee ID.
Run this single conditional statement with authorized operator access:

```sql
UPDATE account_deletion_requests
   SET status = 'withdrawn', updated_at = clock_timestamp()
 WHERE reference = $1 AND workspace_id = $2 AND employee_id = $3 AND status = 'received'
 RETURNING reference, employee_id, workspace_id, status;
```

Exactly one returned row confirms the withdrawal. Record that outcome in the same restricted case. Zero rows
means it was **not** withdrawn by this statement: re-read the request and escalate; do not retry with a broader
condition or report success. If the connection fails or the reply is lost, treat the outcome as unknown: re-read that exact
reference/workspace/Employee ID and reconcile the restricted case before reporting an outcome. Do not broaden the
condition or recreate access to resolve an unknown result.

The status condition prevents withdrawal if processing wins the race. Processing
or completed requests cannot be withdrawn through this procedure.

Do not recreate sessions, passkeys, subscriptions or calendar feeds. A withdrawn request removes only the deletion
hold: ordinary sign-in still requires the account's existing credentials and current active/role authorization.
Calendar feeds remain revoked; if authorized, the person can create a new feed through the existing Calendar flow.
