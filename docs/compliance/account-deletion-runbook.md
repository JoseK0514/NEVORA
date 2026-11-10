# Account deletion runbook (until the automatic purge ships)

For VELANI LLC operators. Run against production only with Jose’s authorization and a fresh backup. Never paste
personal data into tickets or chat; use the request reference.

November 10 operating addendum: this procedure is manual fulfillment, not a deployed purge worker or completion
mailer. Use the request's recorded policy version and the approved `POLICY_FACTS` in `src/lib/legal/policies.ts`.
Do not substitute newly researched periods or restart a retention clock when a request arrives. Jose is the
initial responder; support's public response aim is separate from the 30-calendar-day deletion timetable.

## 0. Establish custody and a per-request removal manifest

Select the exact authorized environment, company database/incarnation and workspace through the approved
operator. Verify its identity before any query that changes data. VELANI Preview is blocked for mutation while
its `DATABASE_URL` targets Production too. Never clone Production to rehearse deletion. Use owned fictional
fixtures for rehearsal, including pending payroll/corrections and a lost completion response.

For each reference, keep a restricted case with operator, received/due time, policy version, backup/restore
receipt, exact company/workspace, private subject reference, legal-hold decision owner, table/object removal
manifest, provider work, retained categories/purpose/end dates/access owner and verification outcomes. Do not
copy names, email addresses, documents or challenge secrets into Git or this case. If a historical contact is
needed, refer to the authorized source rather than creating a new profile snapshot.

Inventory the actual deployed schema, foreign keys, triggers and object storage before preparing the bounded
transaction. Include current web passkeys/recovery material, communication revisions/receipts, payroll documents,
Clocker photo objects and advisor conversations/memory if this account owns them. The older inventory below is
a starting point, not permission to delete every row named after an employee. Preserve other workers' records,
workplace approval history and immutable financial evidence under the approved retention decision.

Pause/drain only the approved processing scope where in-flight operations require it; preserve durable job/lease
identities. Have the employer resolve work dependencies and approve the exact removal/de-identification
manifest. There is no blanket `DELETE employees` or safe universal purge order in this packet. Never disable
foreign keys, RLS, audit triggers or append-only controls to make removal succeed. If those controls require a
new erasure mechanism, keep the case processing and give engineering the specific blocked table/constraint.

## 1. See open requests

```sql
SELECT reference, workspace_id, channel, status, confirmed_at
  FROM account_deletion_requests
 WHERE workspace_id = $1 AND status IN ('received', 'processing')
 ORDER BY confirmed_at;
```

Complete each within `DELETION_COMPLETION_PERIOD` (see `src/lib/legal/policies.ts`), counted from `confirmed_at`.

## 2. Start one

```sql
UPDATE account_deletion_requests SET status = 'processing', updated_at = clock_timestamp()
 WHERE reference = $1 AND workspace_id = $2 AND employee_id = $3 AND status = 'received'
 RETURNING reference, workspace_id, employee_id, status;
```

Bind the exact reference, workspace and verified request subject. Exactly one returned row claims processing.
Zero rows means no claim: reread that exact case. A lost response is unknown; reconcile its current status before
continuing. If processing already began, resume its existing manifest and completed steps; do not claim fresh
custody merely because the row says processing. Support withdrawal may proceed only while status is received.

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
  “Former team member”) when work records must stay; keep it inactive and remove all sign-in/recovery material.
  The schema requires non-null name/phone fields: use a reviewed neutral label/empty contact value, not an
  invented reachable address or `NULL` that violates the schema. Otherwise remove the row only after reviewing
  its actual dependencies. The request's `employee_id` may become null by its existing foreign key; preserve the
  opaque request/reference and private fulfillment evidence.
- Outside the database: email provider, push provider, logs, backups (`BACKUP_EXPIRY`).

Apply the longest applicable approved retention period: work/payroll records three years from final entry;
employment-tax support at least four years after tax due or paid, whichever is later; security/access logs up to
90 days from event; privacy request evidence 24 months after closure; a legal hold/unresolved dispute until
released and the otherwise applicable period has passed. These are existing policy categories, not a new legal
assessment. Record the employer's applicable obligation, exact end date and restricted access for each retained
category. Missing dates/hold authority are blockers to final disposal, not authority to extend everything forever.

Verify current backup configuration independently. The public policy describes seven-day restore history;
that wording is not proof that every staging/production target is configured accordingly. Track separate
recovery snapshots by purpose, owner and review/disposal event. Never restore deleted access: a future restore
must reapply completed erasures/retention restrictions before reopening the restored company. Do not edit a
backup, lower restore history or delete a snapshot without the coordinator's reviewed recovery plan.

## 5. Finish

```sql
UPDATE account_deletion_requests
   SET status = 'completed', completed_at = clock_timestamp(), updated_at = clock_timestamp(),
       retained_note = $3  -- what was kept, why, and until when; no personal data; max 2000 chars
 WHERE reference = $1 AND workspace_id = $2 AND status = 'processing'
 RETURNING reference, workspace_id, status, completed_at;
```

First verify removal/restriction against the manifest, every credential/session/feed/device path, provider tasks
and backup disposition. Keep a private completion communication prepared before removing contact data; send
only through the approved support workflow with authorization for that actual person. Do not invent an address
or test real mail here. A receipt/reference alone is not authority to contact a person.

Exactly one returned row confirms the state change. Zero rows or a lost acknowledgement requires a read of
the exact reference/workspace; do not run a broader update. If already completed, reconcile that same private
case and communication outcome without deleting/sending again. If provider removal or required completion
communication is unresolved, document it and escalate; do not describe the whole fulfillment as complete.

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
