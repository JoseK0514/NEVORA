# NEVORA Owner web guide

This guide covers the current development web workflows. Available modules and
provider services depend on the selected environment. It does not certify a
hosted release. See the [guide index](README.md) for distribution scope.

## Start with your company

Sign in to the company address supplied for your account. Review **Home** for
current work, then open **More → Settings** for company configuration. An
existing company does not need to be recreated through signup. Production
new-company admission defaults closed; provisioning needs its own explicit
configuration and authorization. A signup page alone does not establish
availability.

Settings includes these current destinations:

| Area | What to review |
| --- | --- |
| Company | Company profile, locations, branding, features and team terms, company policies |
| Scheduling | Positions, break types and scheduling rules |
| Clocker | Clocker tablets, PINs, punch photos, shift matching and recovery |
| Pay | Payroll settings, when payroll is available to this environment |

Confirm the company timezone, active locations and positions before planning.
Location eligibility, operational positions, an access role and a designated
shift lead are different settings. Hiding a feature changes its availability;
it does not complete the feature's provider setup or required acceptance.

If an operator supplied your initial password, sign in with it and choose a
different password on the replacement screen. The initial password grants no
workplace session. After replacement, sign in with your new password.

## Add people and grant access

1. Open **Team** and add the person. Enter a unique Employee ID and accurate
   details; choose their role, primary location, eligible locations and positions
   from the form. An active location is required. An employee record can be saved
   without an email, but email is needed for an account invitation.
2. Review the person's profile and **Access and sign-in**. Only an Owner can add
   another Owner or manage account invitations.
3. For a Manager, explicitly select company-wide management or the locations
   they may manage. Save or revoke **Management access** using the offered
   confirmation. Promotion or reactivation requires a current access assignment;
   the role name alone does not grant operational scope.
4. When eligible, use **Send invitation** to the registered email. Review the
   displayed delivery state. Issued or provider-accepted is not proof of inbox
   delivery or account activation. A new invitation replaces the previous one.
5. Have the person open their private invitation, choose a password and keep
   their Employee ID. They then sign in normally. Never ask them to share the
   password or invitation proof.

Use **Refresh invitation** for current state. If an action is unconfirmed, use
**Check action outcome** before sending another invitation. For management
access conflicts, reload the current employee and review the current assignment.
An earlier receipt records an action; it does not prove access is unchanged now.

**Employment dates** are optional on the add and edit forms: hire date,
termination date and date of birth. In Puerto Rico the hire date decides which
wage rules apply (people hired before January 26, 2017 follow the earlier
rules), and the date of birth supports minors' hour limits. Only you and
company-wide Managers see or edit them, and they never appear on schedules, the
kiosk, exports or employee screens. A termination date is a record only: it
never deactivates anyone.

Deactivate or change access through the employee's current form. Payroll review
and approval grants are separate from management scope. A Lead has personal
self-service access; neither the Lead role nor a shift's designated-lead marker
grants Manager powers.

## Build, review and publish a schedule

1. Open **Schedule**, select the week and location, and check who is eligible.
   Review **Scheduling rules** for hours targets, staffing, recurring coverage,
   availability deadlines and shift-change policy. Only an Owner edits the
   trades-and-coverage policy.
2. Build or fill the draft. Use the available manual shifts, **Copy previous
   week**, **Week templates** or draft-building controls. Review each assignment,
   position, designated lead, availability conflict and coverage warning.
   If an edit or deletion says the shift changed since you opened it, keep your
   draft. **Unsaved changes to copy** retains the submitted fields; copy what
   you need before choosing **Reload current shift**, which replaces that draft.
   Review the current assignment before submitting again.
   If a deletion's outcome is unknown, it may already have completed. Further
   deletion submissions stop. Copy any needed draft values, then explicitly
   reload and review the current schedule before starting another change.
3. Open **Publish** or **Publish changes**. Review the listed draft locations,
   pending changes and blockers. Draft assignments and unpublished edits are not
   the employee's current published schedule.
4. Publish the reviewed scope. Check the resulting published state. Review
   acknowledgement status separately; publication and a queued notification do
   not prove that each person read or accepted the schedule.

Published replacements may require an additional explicit publication consent.
Follow the particular review screen. A saved replacement or Rondo coverage
draft is not a general instruction to publish every outstanding change.

## Review requests and recorded time

Open **Things to do** for current management work. **Time off**, **Shift
requests** and **Availability** hold the corresponding records when enabled.
Review the exact dates, people, request status and current rules before deciding.
Another person's acceptance may still leave a request awaiting management.
Refresh a changed review instead of approving from an old screen.

In **Time exports**, **Who’s included and sent files** opens the period's people
and saved records. **Latest downloads and notes** is a counted summary of the
latest event of each kind, not the full history. **Load history** and **Load older
events** show the full period history in pages, newest first, with loaded/total
counts. All events in a snapshot are loaded only when the page says so.
**Refresh history** includes newer events. A recorded download does not confirm
that a file finished downloading or that a provider imported it.

Live **Updates** communications remain under the D04 hold. A visible destination
does not activate them; use your existing employer communication channel while
that workflow is unavailable.

Use **Time** / **Timecards** to review actual punches, breaks, exceptions and
corrections. Scheduling records describe planned work; they do not establish
attendance or hours worked. Employees use their location's enrolled **Clocker**
to record punches. The personal time view is not a promise of phone clock-in.
Review Clocker recovery and any photo requirements through the Owner tools.

**Settings → Clocker → Shift matching** sets the **Early clock-in grace**, 0 to
30 minutes. A punch up to that many minutes before a shift start counts toward
that shift; paid time still starts at the actual punch. It starts at 0 (strict
matching), only you can change it, every save is recorded, and punches already
recorded keep how they were matched.

Attendance review flags a forgotten clock-out. A punch matched to a shift
shows **No clock-out recorded · scheduled end passed**; a punch with no single
matching shift shows **No clock-out after 12 hours** once it has been open more
than 12 hours. Both are review prompts only: nothing closes a punch for you.

For another person’s eligible open punch, use **Close open punch** in the
Timecards inspector. Enter the verified company-local end time, a reason and
the confirmation, then choose **Record close**. Read the open-break explanation
before confirming. A later punch needs a new review. If the result is unconfirmed,
use the original close’s recovery control instead of starting a second close.

Use **Request time correction** for another employee’s entry, break or missing
time. Check the employee, proposed local times and reason before **Send correction
request**. A request leaves original punches unchanged. A different authorized
reviewer must decide it; neither the employee nor the person who submitted it can
approve or reject it. Follow current-source and finalized-period restrictions.

## Review insights and payroll

**Insights** uses a selected reporting period. Verify that period and the
underlying records before drawing conclusions. **Time exports** exports time
data; it is distinct from payroll approval or sending money.

In a Puerto Rico workspace, **Insights → Christmas bonus hours** shows each
person's hours on finalized timecards for a bonus year (October 1 to
September 30) against 700 hours (hired before January 26, 2017) or 1,350 hours
(hired on or after). A person is **Reached**, **Check breaks** (reached only if
breaks count), **Not confirmed** (short, with time not yet finalized), **Not
reached**, or needs a hire date. It shows no money and doesn't decide
eligibility; confirm with your payroll provider or counsel before paying between
November 15 and December 15 (exemption filings are due December 1).

When payroll is enabled:

1. Check **Payroll settings**, pay schedule and people. New payroll uses amounts
   calculated outside NEVORA. Export the approved hours to your provider, finish
   calculations there and import the supported structured amounts for review.
   NEVORA checks the import; it does not calculate taxes or send wages.
2. Choose **Prepare payroll**, then **Review payroll**. Resolve **Fix before
   payroll** items and inspect the people, period, payday, amounts and exceptions.
3. Approve only the revision you reviewed. A changed source needs a fresh
   import/review. Approval freezes that revision; it does not mean paid.
4. Use **Share pay statements** separately when offered. Employees see only
   their own published statements. Review downloads and any delivery state.
5. For a correction, use **Fix this payroll** and review the linked replacement.
   Compare the signed net-amount difference per person and in total. The original
   approval and statements remain in history; a difference is not a payment.

Correction payroll does not offer payment-instruction exports. Reconcile any
older correction instructions through the existing payment system and accountant;
do not calculate a replacement or delta from the file. An already-generated time
export must be recovered and reconciled rather than generated again with a new
action. A changed export does not automatically replace a provider submission.

Payment instructions, where offered, are a file. NEVORA does not transfer money;
the employer's existing payment system handles disbursement. Do not infer bank
compatibility, tax filing or universal legal compliance from a calculated amount.

## When information is unavailable

Reconnect and refresh. An unavailable list does not mean no work exists, and an
unconfirmed save may already have committed. Use the original action's recovery
control and inspect current status before repeating it. **Help someone sign in**
provides the supported recovery workflow; never collect another person's secret.
For Rondo, use the separate [Rondo guide](rondo.md). For technical operations or
privacy fulfillment, use the [operations guide](operations.md).


## Business records, when enabled

Open **AI manager → Business records**. Add a JSON file or explicitly map a CSV,
review every bounded row and the server's findings, and acknowledge the exact
version before **Publish for Rondo**. **Main records** reviews the account and
location perimeter; **Check figures** reads the eligible published records for the
chosen period. These controls depend on the existing default-off feature flags;
this source guide does not establish hosted activation or an accounting connector.
An Owner-declared perimeter cannot prove no account is missing, and shared cash
cannot be allocated to locations. Receivables are not cash and net receipts are
not profit. An unconfirmed change keeps its original reference: check that change,
even after a conflict, instead of creating a replacement.

## Import pay and export paid time

On **Review payroll**, **Import pay** opens file selection, exact person matching,
amount review and confirmation. An untouched supported CSV is retained exactly.
Re-matched or corrected CSV data is saved as the reviewed structured amounts;
keep the original file separately when the confirmation says it is not retained.
Choices for people omitted from a file do not replace the server's reviewed
period population or create persisted employment facts. Resolve a population
refusal on **Who's included** and review again.

**Paid time export** requires a current reviewed population and finalized cards.
Decide each recorded break explicitly; a recorded label does not establish paid
or unpaid treatment. Review the planned whole-person batches, recover an uncertain
batch using its original identity, and confirm the period only after every batch
and the server manifest reconcile. A saved file is not a provider submission or
payment. This guided export uses the exact neutral format. It does not offer
a saved rounding profile; values requiring rounding are refused. Payroll treatment
and legal suitability remain employer review matters.

Private import drafts, break choices, plans and CSV replies clear when their
current view expires, you step away, or access ends. Read current access again
and re-upload an unsaved file. An uncertain save retains only its original
request for checking or an unchanged retry; do not start a replacement while it
is unresolved. Downloading a batch checks current access with the server again.

## Agreed scheduling times

From a person's Team page, **When they can be scheduled** shows current and future
agreements and change requests. Management-agreed restrictions are enforceable;
availability preferences remain separate. Review the effective Monday and changed
days before saving or deciding a request. A missing legacy agreement does not mean
an explicit unrestricted agreement.

## Tablet setup and uncertain punches

Open **Clocker tablets** to register a tablet. The setup card offers a QR code, **Copy link** and **Show code**; use the link only on the intended tablet. The person holding it must tap to connect it. The code works once for 15 minutes. Browser and Home Screen app cookies can differ, so check registration in the actual kiosk you will use.

A retained punch may say **not confirmed yet**. **Check if it saved** checks its original reference; **Send it again** retains that reference. **See current status** is a separate current observation. **Ask Owner to check** and **Check your last punch** are recovery routes. A failed check or a disabled service is not proof that a previous punch was never recorded. Offline punches are not queued automatically.
