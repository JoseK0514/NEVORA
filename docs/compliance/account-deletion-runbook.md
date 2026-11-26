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

Assign these roles in the restricted case before starting fulfillment. Jose is the initial Support responder and
authorizes the production operator. Record the named operator and handoff if someone else does the work.

| Step | Owner | Evidence in the restricted case |
| --- | --- | --- |
| Intake and claim | Support responder, then authorized deletion operator | Exact environment, database incarnation and workspace, request UUID and reference, subject bound at claim, policy version, verification and confirmation times, due date, and claim receipt. |
| Work and retention decisions | Employer's authorized records owner, with Jose for VELANI policy or unresolved holds | Open punch, correction, time-off, exchange and payroll disposition. Approved removal manifest, retention purpose, source date, end date or hold release condition, and access owner per category. |
| Data and provider work | Deletion operator for database and objects. Authorized provider or backup custodian for external work. | Scoped operation receipts or post-operation counts, provider references or reason a category is inapplicable, restore-window readback, snapshot disposition and restore reapplication instructions. |
| Verification and notice | Deletion operator verifies. Support responder owns the completion notice. | Timestamped readbacks for each manifest item and remaining access paths. Approved notice channel and outcome, or evidence that no address was on file. |
| Completion record and follow-up | Deletion operator records closure. Support reconciles any notice and tracks the case. | Exact completed row and timestamp, incident or retry reconciliation if applicable, and the privacy-evidence disposal date. |

## 1. See open requests

```sql
SELECT reference, workspace_id, channel, status, confirmed_at
  FROM account_deletion_requests
 WHERE workspace_id = $1 AND status IN ('received', 'processing')
 ORDER BY confirmed_at;
```

Complete each within `DELETION_COMPLETION_PERIOD` (see `src/lib/legal/policies.ts`), counted from `confirmed_at`.
Support reports the reference as received or in progress while the request is open. Escalate a blocked case
to Jose before its deadline and record the blocker, responsible person and next check in the restricted case.

## 2. Start one

```sql
UPDATE account_deletion_requests SET status = 'processing', updated_at = clock_timestamp()
 WHERE reference = $1 AND workspace_id = $2 AND employee_id = $3 AND status = 'received'
 RETURNING id, reference, workspace_id, employee_id, policy_version, verified_at, confirmed_at, status;
```

Bind the exact reference, workspace and verified request subject. Exactly one returned row claims processing.
Zero rows means no claim: reread that exact case. A lost response is unknown; reconcile its current status before
continuing. If processing already began, resume its existing manifest and completed steps; do not claim fresh
custody merely because the row says processing. Support withdrawal may proceed only while status is received.

Acceptance ends the subject's application sessions, revokes their passkeys and calendar feeds, and blocks
sign-in while the request is open. Check that those effects belong to the verified subject before processing.
If an Owner was refused because no activated replacement Owner is available, route them to Support for
the existing ownership handoff. A refusal leaves their access and the request queue intact.

## 3. Check what is in flight

Before removing anything, check for an open clock-in, a pending correction, time-off or exchange, or a payroll
period being prepared for this person. Let the employer resolve those (or record why they stay) so deletion
neither breaks a work record nor leaves a half-finished one.

## 4. Remove or de-identify

Follow the table in `README.md` (“Data inventory”). In short:

- Delete per the approved manifest: credentials, recovery proofs, Clocker PIN, push subscriptions, inbox
  notifications, receipts, and contributed updates the person authored (or de-identify the author).
- Calendar: verify zero unrevoked subscriptions and that former feed links are refused. The subscription rows
  contain token digests and revocation evidence, and the operation rows are append-only. The current schema
  rejects their deletion. Have the records owner document the approved purpose, access restriction and disposal
  disposition for this retained history. Escalate any erasure or disposal the schema blocks and leave the case
  processing until the required disposition is feasible and recorded.
- Employer work records (shifts, time, corrections, payroll): keep or de-identify as `RETENTION_SCHEDULE` says;
  restrict access to what is kept.
- `employees` row: clear first name, last name, phone and email (replace with a neutral label such as
  “Former team member”) and set `birth_date` to NULL (migration 0068) when work records must stay; keep it inactive
  and remove all sign-in/recovery material. Hire and termination dates are employment records: handle them with the
  work records above.
  Use a reviewed neutral label and an empty phone value. The current schema creates a protected
  `operational_subject_versions` reference even for a new employee. Use the approved inactive, neutralized row
  when that reference must be kept. Escalate a required hard deletion with the exact constraints it would hit.
  Preserve the opaque request/reference and private fulfillment evidence if the employee foreign key becomes null
  after an authorized removal.
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

## 5. Verify fulfillment and reconcile the notice

The deletion operator signs off each manifest item with a timestamp and a scoped readback. Check the
inactive neutralized subject or removed row, credentials and recovery material, sessions, passkeys, calendar
revocation, subject-linked Clocker PIN and device grants, provider tasks, retained work records and access restrictions.
Verify the backup disposition and document how a restore reapplies completed erasures before access reopens.
Keep the case processing while required changes, evidence or retention decisions are unresolved.

Support prepares the notice using the authorized pre-removal contact source. After the operator's verification,
send through the approved Support workflow if an address was on file. State that fulfillment is complete and
describe anything retained and the applicable retention end date or hold condition. Record the message
reference and outcome in the restricted case, or record the verified absence of an address on file. For an
unknown send outcome, reconcile the existing Support message record before retrying. A missing trustworthy
contact source or unresolved required notice goes to Jose and keeps the case processing.

In a fictional rehearsal, record the verification and notice as rehearsal evidence using a simulated notice
receipt. Keep mailbox, provider and backup actions local or simulated.

## 6. Record completion

After verification and notice disposition are recorded, bind the exact reference, workspace and request UUID
captured when claiming the case. The UUID is stable if deleting the employee row clears its foreign key.

```sql
UPDATE account_deletion_requests
   SET status = 'completed', completed_at = clock_timestamp(), updated_at = clock_timestamp(),
       retained_note = btrim($4)
 WHERE reference = $1 AND workspace_id = $2 AND id = $3 AND status = 'processing'
   AND length(btrim($4)) BETWEEN 1 AND 2000
 RETURNING id, reference, workspace_id, status, completed_at, retained_note;
```

The retention note records what was kept, why, and through which date or hold condition using category names
and no personal data. Use the stored completion timestamp to calculate the privacy case's 24-month disposal date.
Exactly one returned row confirms closure. For zero rows or a lost acknowledgement, read the same request.

```sql
SELECT id, reference, workspace_id, status, completed_at, retained_note
  FROM account_deletion_requests
 WHERE reference = $1 AND workspace_id = $2 AND id = $3;
```

If the row is completed, record its timestamp and reconcile the existing notice outcome in the private case.
Resume a processing row from the recorded checklist. Escalate a missing or conflicting row without widening
the query or repeating data removal or a confirmed notice.

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
