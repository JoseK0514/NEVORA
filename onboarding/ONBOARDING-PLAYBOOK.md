# First-customer onboarding playbook

**Working draft v0.1 · 2026-10-25 · Operational work: NOT_STARTED.** Assign named people during intake. This procedure does not establish customer acceptance or production approval.

## Scope and evidence

**Source facts:** NEVORA supports one company per database, configured locations and Owner, Manager, Lead and Employee roles. Company setup, manual employee creation and invitation activation exist in source; hosted behavior and providers require verification. No self-service signup, multi-business tenant management or roster import is promised.

Reference: `JoseK0514/NEVORA` at `8e9073974b52053e557382ec5199dbce9d5aa32c`; `README.md`, `docs/execution/single-company-20261012.md`, `src/components/company-access/new-employee-form.tsx`, `src/lib/company-access/employee-profile.server.ts`, and `src/lib/auth/invitations/{service,delivery,claim}.server.ts`. Reconcile Claude's final candidate before execution. Steps below are **proposed procedures**.

## Responsibilities

| Role | Accountability |
| --- | --- |
| Customer Owner | Confirms company structure, data accuracy, access decisions and business acceptance. |
| Customer Manager | Reviews daily workflows and staff readiness within assigned management access. |
| NEVORA Onboarding Lead | Coordinates intake, training, roster review and evidence handoff. |
| Claude / Engineering Lead | Confirms configuration path, target custody, capability gaps and technical verification. |
| NEVORA Operations Lead | Receives support ownership and unresolved issues. |
| Jose / Business Owner | Resolves material scope/risk decisions and authorizes production separately. |
| Employee | Activates their own account and demonstrates agreed self-service tasks. |

## 1. Intake and customer-structure gate

Entry: Customer Owner and Onboarding Lead identified. Complete a private copy of [company intake](COMPANY-INTAKE.md).

- [ ] Record **employee count and separate client-business count independently**. Confirm whether locations belong to this same company.
- [ ] For one employer with multiple employees/locations, continue with the single-company plan.
- [ ] If the customer manages separate businesses needing independent owners, data separation or billing, mark scope **BLOCKED**. Onboarding Lead routes a written scope decision to Jose and Engineering. Do not represent businesses as locations to bypass that decision.
- [ ] Agree pilot workflows, location, participants, success criteria and evidence storage. Record unsupported requests as decisions.

Exit evidence: Customer Owner's reviewed intake, named responsibilities and resolved structure branch. No configuration handoff while this branch remains ambiguous.

## 2. Configuration handoff

Entry: Reviewed intake. Onboarding Lead hands Engineering company/timezone/location mapping, access decisions, module scope and dependencies. Initial Owner access uses Engineering's approved setup path; credentials remain private.

- [ ] Engineering identifies the intended environment, database and candidate; determines fresh setup versus existing-company configuration. Source setup refuses an existing schema; this playbook does not authorize a conversion or reset.
- [ ] Customer Owner confirms active locations, optional positions, staffing/coverage and Manager access scope. Roles and position qualifications are separate.
- [ ] Engineering records configuration evidence and gaps through the [launch checklist](../acceptance/LAUNCH-CHECKLIST.md). No settings, provider or database changes are executed by this document.

Exit: Configuration evidence ready for review, with owners for gaps. Production remains subject to its separate release gate.

## 3. Guided pilot

Entry: Approved nonproduction target and fictional accounts. Onboarding Lead guides Customer Owner/Manager through manual entry using the [roster guide](ROSTER-GUIDE.md), a draft schedule and an employee task. Include access denial and an expired invitation.

- [ ] Record expected versus observed behavior, environment/candidate, reviewer and sanitized evidence.
- [ ] Confirm timezone, location eligibility, qualifications and Manager scope. Do not publish a real schedule as a demonstration.
- [ ] Classify each acceptance case in the launch checklist; every case begins **NOT_RUN**.

Exit: Pilot cases pass or have dispositions under launch gates. Failed access/data-isolation checks block affected activation. Engineering owns defects; Onboarding Lead schedules retraining.

## 4. Employee activation

Entry: Relevant launch gates and target authorization satisfied; Customer Owner approves the cohort. Enter reviewed records manually. Saving neither sends invitations nor proves sign-in.

- [ ] Customer Owner checks each registered email and issues invitations through the employee's **Account invitation** panel when available. Email is optional for a saved employee, required for this activation path.
- [ ] Verify delivery availability with Engineering first: it is disabled by default in source. Provider acceptance alone proves neither receipt nor activation.
- [ ] Employee opens their own email link, chooses a password, keeps their Employee ID and signs in with ID/password. Source links are single-use and expire after 15 minutes.
- [ ] For uncertain outcomes, use **Check action outcome** before issuing again. Escalate unavailable delivery, missing email or invalid links through [support procedures](../support-training/SUPPORT-PROCEDURES.md); never share invitation proofs or choose passwords for employees.

Exit evidence: Sanitized cohort totals for saved, invited, activated, sign-in verified and blocked; each blocked account has an owner and next action. Do not infer activation from invitation issuance.

## 5. First operating cycle and acceptance

Customer Manager owns the agreed first cycle: review the roster, prepare/review the schedule, publish only when authorized, verify employee visibility, and review attendance or payroll outputs only if included in scope. Customer Owner checks exceptions before operational reliance. Training completion requires each role to demonstrate its agreed task.

Onboarding Lead reconciles results against the [launch checklist](../acceptance/LAUNCH-CHECKLIST.md), records customer acceptance separately from Jose's production authorization, and hands Operations the approved support contacts, known limitations, open issue owners and evidence references. Follow [support procedures](../support-training/SUPPORT-PROCEDURES.md) for triage and policy wording. Agree the next review checkpoint; do not invent an SLA.

| Completion record | Fill when executed |
| --- | --- |
| Work status / owner / next gate | NOT_STARTED / ___ / ___ |
| Customer acceptance / evidence / date | Pending / ___ / ___ |
| Open issues / owner / next review | ___ |
| Jose production authorization reference | Pending; separate gate |
