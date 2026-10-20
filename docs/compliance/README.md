# NEVORA public policies and account deletion

Branch `claude/nevora-compliance`, from the release candidate `codex/verify-preview-33` (2eb2a03). Built from the
October 18 App Store compliance handoff; Jose confirmed on October 20 that this ships on the web release too.

Operator: **VELANI LLC** · domain **thevelani.com** · support **support@thevelani.com** (confirmed by Jose).

## What ships

| Piece | Where | Notes |
|---|---|---|
| Privacy Policy | `/privacy` | Public, no sign-in. Text in `src/lib/legal/policies.ts`. |
| Terms of Use | `/terms` | Public. Reporting points to support email until Report content ships. |
| Support | `/support` | Public. `mailto:` link, sign-in help, privacy and deletion links. |
| Account deletion | `/account-deletion` | Public explanation; **Start deletion request** signs in, then opens the in-app page. |
| Delete my account | `/app/account/delete` | Every role. Review → password → confirm → reference. |
| Links | Sign-in footer (Login, Forgot, Reset, Activate), Profile (all roles) | Shown only while the policies are visible. |
| Storage | `db/migrations/0034_account_deletion_requests.sql` | One open request per person; reference `DEL-XXXXXXXX`. |
| Sign-in block | `src/app/login/actions.ts` | After the right password, an open request stops sign-in with its own message. |

Decisions (Jose, October 20): deletion is a **verified request today**, completed by the runbook; the automatic purge
is a later push. Policies are **hidden in production until every fact is filled**. **Report content and blocking
come in a later push**; until then the policies point to support email and promise no Report button.

## How publishing works

`src/lib/legal/policies.ts` has `POLICY_FACTS`. While any fact a page uses is `null`:

- development and Vercel previews show the pages with a yellow `[CONFIRM_…]` marker where the fact goes;
- production (`VERCEL_ENV=production`, or `NODE_ENV=production` off Vercel) returns 404 for the four pages and
  `/app/account/delete`, and hides every link to them. `NEVORA_SHOW_DRAFT_POLICIES=1` never applies in production.

To publish: fill every fact (one place), bump `POLICY_VERSION`, and apply migration 0034 to the production database
(separately authorized; build and start never apply migrations). Until 0034 exists, sign-in keeps working and a
deletion request reports "isn’t available right now" instead of failing silently.

### Facts

Filled on October 20, 2026 from Jose’s answers (Neon and Vercel confirmed in the connected accounts):
`EFFECTIVE_DATE` (October 20, 2026; change it if the policies take effect later), `SUPPORT_RESPONSE_TIME` (two
business days, Puerto Rico holidays excluded), `DELETION_COMPLETION_PERIOD` (30 calendar days after receipt),
`RETENTION_SCHEDULE` (3 years for attendance and payroll records, at least 4 years for employment-tax records,
90 days for security logs, 24 months for privacy-request records, legal holds until released),
`PROCESSORS_AND_PURPOSES` (Vercel, Neon, a transactional email provider, browser push services),
`HOSTING_TRANSFER_DETAILS` (United States, Northern Virginia: Neon us-east-1, Vercel iad1),
`SALE_SHARING_AND_TRACKING_STATEMENT`, `EMPLOYER_DATA_RESPONSIBILITIES`, `REGIONAL_PRIVACY_DETAILS` (Puerto Rico).

`BACKUP_EXPIRY` uses Jose’s approved interim wording (six-hour restore history; the maximum across all copies is being
verified). Update it once the full lifecycle is confirmed.

**Still open, so production keeps the pages hidden:**

| Fact | Needed |
|---|---|
| `BUSINESS_CONTACT_DETAILS` | VELANI LLC’s mailing address for publication (or Jose’s decision to list email only). |

Before publishing, also confirm with the employer that the retention schedule covers any longer Puerto Rico tax,
benefits or dispute requirements, and name the email provider internally (the policy describes it by category).

`MODERATION_RESPONSE_TIME` comes back with Report content. Payroll and legal wording needs Jose’s approval before
publishing, as with every payroll copy change.

## Deletion: what happens today

1. The person opens Profile → **Delete my account** (or `/account-deletion` → sign in).
2. The page shows their account, what ends now, what is removed, what may be kept and the completion period.
3. They re-enter their password and tick the confirmation. The server checks the password against the signed-in
   person only (never an email address or an ID typed in a form).
4. In one transaction: the request is saved (or the open one is returned), **every session is deleted** and
   **calendar feeds are revoked**. Push subscriptions stop delivering because they are tied to sessions.
5. They see the reference and are signed out. Sign-in then shows "This account is being deleted…".
6. VELANI completes the deletion with `account-deletion-runbook.md` and marks the request completed.

Not yet automatic (later push): the purge worker, completion email, status check after sign-out other than
support email, native (Capacitor) entry points, owner workspace handover.

## Data inventory (starting point, to verify against the release)

From the schema in `db/migrations`. Each class needs: leaves the device? provider, purpose, linked to the person,
tracking (none observed in code), retention rule, removal path. **Verify before the store privacy labels.**

| Data class | Tables | Removal path (runbook) |
|---|---|---|
| Identity and contact | `employees` (name, phone, email, role, location) | De-identify the row (name, phone, email cleared) if work records must stay; else delete. |
| Credentials and sessions | `employee_credentials`, `employee_sessions`, `password_recovery_proofs`, `password_recovery_limits`, `employee_clocker_pins`, `clocker_pin_sessions` | Delete. Sessions already gone at request. |
| Notifications | `push_subscriptions`, `push_deliveries`, `notifications`, `employee_attention_receipts` | Delete subscriptions and the person’s inbox items. |
| Calendar feeds | `calendar_subscriptions` (revoked at request), `calendar_operations` | Already revoked; delete after the retention decision. |
| Schedules and requests | `shifts`, `availability_*`, `weekly_availability_*`, `time_off_requests`, `shift_exchanges`, `shift_callouts`, `shift_change_*` | Employer work records: keep or de-identify per `RETENTION_SCHEDULE`. |
| Time and attendance | `time_entries`, `break_entries`, `time_correction_*`, `timecard_revisions`, `clocker_*` events, `attendance_policy_observations` | Employer work records: keep or de-identify per `RETENTION_SCHEDULE`. |
| Payroll | `payroll_*` (documents, runs, exceptions, notices) | Keep only what the retention schedule requires; restrict access. |
| Contributed content | `communications`, `communication_revisions`, `communication_receipts`, `communication_recipients` | Delete or de-identify authored updates; remove receipts. |
| Deletion requests | `account_deletion_requests` | Kept as the record of the request; no profile copy. |

Also outside the database: email delivery (recovery codes), web push provider endpoints, Vercel logs, backups.

## App Store and Play review notes (draft)

NEVORA is a workforce scheduling and operations application provided by VELANI LLC. It gives authenticated
access to an organization’s workplace information according to the person’s role. The review accounts in the
private credentials fields belong to a fictional workspace. Accounts are created by an Owner or Manager and
activated by the employee from the sign-in page; there is no public sign-up.

Privacy, Terms and Support: Profile → Privacy and your account, and the sign-in footer. Account deletion: Profile →
Privacy and your account → Delete my account (every role). Web: https://thevelani.com/nevora/account-deletion
(**to confirm**: which site serves thevelani.com; the NEVORA routes are `/privacy`, `/terms`, `/support`,
`/account-deletion`). Content concerns: support@thevelani.com (Report content is not in this release).

Reviewer accounts, a hosted fictional workspace, native entry points and the store privacy labels are separate
tasks on `codex/nevora-mobile-launch`.

## Remaining work

- Jose: fill the facts; confirm which repository serves thevelani.com and whether its `/nevora/*` pages render
  these or link to the NEVORA routes; authorize applying 0034 to production.
- Later push: automatic purge worker and completion email; post-sign-out status check; Report content, moderation
  queue, blocking; native Profile entry points; owner workspace handover.
- Store: privacy labels from the verified inventory, `PrivacyInfo.xcprivacy`, Play data safety, reviewer workspace.
