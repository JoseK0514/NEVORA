# Configurable payroll implementation and acceptance ledger

Sponsor: Jose. Integration owner: Check findings resolution status (chat
01a12fbf-5174-7e22-8d66-3aa154492b71). Scope: NEVORA, one company per database.
SaaS/Phase F remain paused. Production, bank submission, real notifications and
independent finding closure are outside this implementation authorization.

## Authority and source custody

Approved directive:
/Users/josek0514/Documents/Codex/2026-10-12/coo-x20/outputs/NEVORA_PAYROLL_IMPLEMENTATION_DIRECTIVE.md.
Human authorization was verified in originating chat
01a1301a-69c7-72a3-9880-48aa97e80e12, turn
01a1305c-7153-7b83-b2c3-9950fc80259b, message
01a1305c-724d-7603-94d6-5e9e6467173e.

Isolated branch: codex/configurable-payroll-20261012. Development ancestor:
b58496b84b21690f7be22474f7570da2d81af6c3. Integration starts from findings
candidate a00fa639a850904615070377bf14e3abf604c562. Setup/employee candidate
8950786 was adopted as 10277b9; approved payroll redesign 9851ccf was adopted
as eea9a8a. Only integration conflicts were combined: preserve both company
policy and employee QA scenarios, and retain PayrollPeriodClose in the redesign.
Common code base: eea9a8a. Other checkouts and the independent ledger are preserved.

## Engineering ownership and dependency sequence

1. Integration owner establishes this contract and owns source, Git, backend,
   schema, workers, document generation and consolidated verification.
2. Payroll workflow/configuration UI owner: Redesign payroll exports, chat
   01a13031-8ae8-7401-bf2c-c5e50fb7347b. Owns payroll configuration/run/statement
   components, pages and browser tests in its separate checkout. Preserve the
   approved interface. Do not edit backend/schema files concurrently.
3. Read-only discovery: payroll_contract_discovery, completed with source paths
   for session, period custody, timecards, migration registration and outbox.
4. Implementation proceeds P1, P2, P3 neutral adapter; P4 remains disabled until
   independently authoritative accountant cases and jurisdiction scope exist.
5. Root QA observes the integrated candidate; fresh engineering code review
   follows. Independent QA/UI receive evidence and retain verdict authority.

Every worker has explicit module ownership and must preserve other engineers'
work. One active writer per checkout. UI joins only after the contract commit;
source changes then receive affected integration/browser checks.

## P0 data and API contract

New bounded domain: src/lib/payroll. Existing time exports and period-close
manifests retain their current meaning; they do not imply processed money.
New APIs live under /api/payroll and use private/no-store responses, bounded
JSON, same-origin mutation checks and x-nevora-payroll: 1. Runtime feature
switch NEVORA_PAYROLL_ENABLED defaults off. Internal calculator is unavailable.

All external money is explicit currency USD and canonical nonnegative integer
minor-unit strings, never binary floating point. A neutral import schema is
versioned JSON, named NEVORA_PAYROLL_IMPORT_V1, with authoritative source name,
source reference, pay period, payday and complete employee rows. Each row has
employeeId, grossMinor, employeeDeduction lines, employerContribution lines,
netMinor; optional earning lines reconcile to gross. Preserve imported amounts
exactly. Gross minus employee deductions equals net; employer contributions do
not reduce net. Reject duplicates, unknown employees, omitted required members,
ambiguous money/currency, excessive rows/lines and mismatched periods.

Company settings and employee exceptions are append-only effective-dated
revisions with operationId, expectedRevision and reason. Settings cover document
identity/language, pay schedule, supported rule configurations and preparation,
publication/reminder preferences. Rules distinguish FIXED from PERCENTAGE, named
base/applicability, effective dates, caps, employee deduction versus employer
contribution and remittance responsibility. They describe preferences, not a
statutory tax engine or permission to alter imported net pay. Unconfigured is
null/absent, never inferred zero/exempt. Defaults resolve with explicit employee
overrides without rewriting the overrides; impact preview identifies affected
future drafts. Historical snapshots remain unchanged.

Owner controls settings, exceptions and financial access grants. Other Managers
have no money access by default. Explicit current payroll grants may permit
REVIEW and APPROVE; time-review authority alone never suffices. Recheck live
active role/session/grant in SQL after locks and at transaction end. Self-service
employee access is limited to their own published statements; guessed IDs and
other employee IDs are rejected identically. Never send proof/hash to clients.

GET /api/payroll/settings returns authorized settings, exceptions, revisions,
capabilities and future-draft impact. POST saves an idempotent command; Owner
writes only. GET /api/payroll/runs lists authorized run revisions and exceptions.
POST prepares/imports/approves/corrects/publishes with an action discriminator,
operationId and explicit expected revision/source identity. Implementation's
exported TypeScript parsers/types are the definitive field-level UI contract;
publish them before dependent UI edits. No arbitrary SQL/table/action names.
GET /api/payroll/statements returns only the current employee's published
document metadata. GET /api/payroll/documents/[id] serves authenticated PDF
attachments, with SHA-256 and safe filenames. Summary is payroll-authority only.

Approved runs freeze authoritative import, exact money/totals, population,
current finalized-time references, employee/settings/exception revisions,
document identity, approver and source hashes. Approval rereads sources under
existing period-custody locking order and rejects changes since review.
Corrections create linked new revisions; no approved record mutation/deletion.
Idempotency is scoped consistently by workspace/actor/operation and command hash.
An identical retry returns the original result; changed payload reuse conflicts.

Persist PDF bytes and their hashes privately; generate from approved snapshots,
never mutable company settings. Real employee PDFs and company summary support
English/Spanish, long names, pagination, period/payday/source identity, exact
money and separate employer costs. Do not collect raw bank account/tax IDs for
the neutral import; mask any supported sensitive display fields.

## P2/P3 worker and export contract

Durable leased/fenced jobs handle preparation, PDF generation, publication and
reminders. Unique business keys, atomic enqueue with source transitions, bounded
attempts/backoff, stale claim fencing and recoverable terminal failures.
Preparation never finalizes timecards or impersonates an approver; absent
authoritative figures means WAITING_FOR_AMOUNTS. Missing approvals/configuration
produce explicit exceptions. Approval is always authorized human action.
Publication is separate from generation, notification and payment confirmation.
No real notification transport is enabled by this work; route availability
notices through deliberately authorized private-link contracts. A failed notice
must not invalidate published PDFs or create another payroll/bank export.

Bank adapter is separate and versioned. Neutral payment instructions may be
generated from an approved run with immutable artifact/count/total and exact
retry. All such outputs carry compatibility UNVERIFIED. Bank-channel details,
enrollment, format acceptance and confirmation are required before bank-ready.
Manual submission remains reported/unverified; never represent it as processed.

## Acceptance ledger

Statuses: NOT STARTED, IN PROGRESS, IMPLEMENTED, LOCALLY VERIFIED, HOSTED VERIFIED,
ACCEPTED. Local verification never closes independent findings or approves release.

| Stage | Owner | State | Evidence / next gate |
|---|---|---|---|
| P0 base/contract | Integration owner | LOCALLY VERIFIED | APIv1 4272655, additive contract 283f57f; UI handoff issued |
| P1 preferences/import/runs/PDF | Backend + UI owners | IN PROGRESS | Backend SQL/import/document evidence: .omo/evidence/payroll-backend/README.md; integrated UI and review pending |
| P2 preparation/publication/reminders | Backend + UI owners | IN PROGRESS | Durable prepare/PDF/publication and fenced retries locally tested; notice transport disabled NOT_SENT_STUB; missed-period automatic catch-up open |
| P3 bank-neutral adapter | Integration owner | LOCALLY VERIFIED | Synthetic neutral JSON exact totals/count/hash/replay; native bank acceptance and account mappings BLOCKED |
| P4 internal calculator | Integration owner | NOT STARTED | accountant-validated cases/statutory scope BLOCKED; engine disabled |
| Integrated review | Root QA + code reviewer | NOT STARTED | unit/SQL/auth/worker/browser/lint/typecheck/build on exact source |
| Hosted/independent/release | Jose + independent reviewers | NOT STARTED | hosted evidence and independent verdict; production authorization |

Minimum cases follow directive cases 1-15: settings reload/endpoint bypass,
inheritance/override preservation/history, rule validation, complete import and
reconciliation, single authority, finalized-time prerequisite, concurrency and
lost responses, stale review/correction, actual PDF contents, employee isolation,
notification recovery, bank-neutral artifact replay, mobile/desktop/keyboard
workflow, disabled unsupported internal calculation and complete source evidence.

## Controls and rollback

CTO: reuse SQL executor/current-session guards and existing finalized period
custody. CISO: Owner/default-deny payroll, explicit current grants, private self
documents, no money in generic management projections. CPO/Experience: save once,
reuse preferences, import approved amounts and focus review on exceptions.
Governance: immutable source/revision/artifacts and separate verification states.
Technical assurance: stale-source checks under locks, exact money and durable jobs.

Rollout stays off until verified. Rollback first disables feature/worker; preserve
immutable money/document/audit rows and deploy the previous application. Never
drop custody tables or reverse published financial records as a routine rollback.
Hosted backup/privileges and any production write pause require a separate
authorized release procedure. Original six independent findings remain OPEN.

External blockers: accountant/provider sample or accepted neutral mapping;
validated statutory calculation cases; Banco Popular enrolled channel and exact
accepted format. They do not block neutral import/settings/PDF implementation.
At initial handoff the app's local thread host could not read the UI chat;
file-based contract remains available and messaging will be retried when available.
