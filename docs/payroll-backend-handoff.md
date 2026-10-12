# Configurable payroll backend handoff

Owner: payroll_backend executor; integration/release owner: root. Candidate branch:
`codex/configurable-payroll-20261012`. P1 backend baseline: `f1da5a03`. Contract
checkpoints: `4272655`, `283f57f`, and additive P2 contract `43924638`. The P2
implementation is committed as `ed7d2c2`, with the schedule-transition correction
in `76610d7`. No production deployment, bank submission,
real notification delivery, or independent finding closure.

## Runtime and adapter boundary

`NEVORA_PAYROLL_ENABLED=true` explicitly enables the subsystem; absent/other values
fail closed. `npm run payroll:worker` schedules due work and processes one durable
job, suitable for an externally managed periodic invocation. Internal calculation
is unavailable. Provider selection records preference only. ADP RUN, QuickBooks
Payroll, Paychex, Gusto and OTHER all use `NEVORA_PAYROLL_IMPORT_V1` until a selected
account's current report/identifier/amount mapping is independently validated.
Saved bank-channel choices likewise represent intended channels, not capability.
Neutral payment instructions are JSON, compatibility UNVERIFIED, NOT_SUBMITTED,
processing UNVERIFIED. No raw bank account or tax identifier is accepted.

A future CSV adapter belongs ahead of `parseImport`, produces the same complete
canonical import, and needs versioned column/employee mappings, current-account
samples, exact-money parsing and independent reconciliation before activation.
It cannot bypass population/time custody, alter approved imports, or claim a
native provider integration. These adapter activations remain open follow-on work.

## Protocol and controls

Browser contract: `src/lib/payroll/contracts.ts`. Settings and runs mutations
require same-origin JSON plus `x-nevora-payroll: 1`. Read endpoints require that
header except authenticated document navigation. Responses are private/no-store.
Receipt recovery accepts exactly one UUID `operationId`, is current-authority and
actor scoped, and returns no request body. Reuse with changed payload conflicts.
Browser storage should retain only the opaque pending operation ID.

Owner alone writes settings, employee exceptions and explicit grant revisions.
Review/approval grants are separately enforced against current SQL state and
active current session, after ordered locks and at transaction end. Time Manager
access does not grant financial access. Employees of any active role can retrieve
only their own published statements. Payroll-authorized users can inspect their
workspace's private documents. Missing/foreign document IDs share one response.

Company/exception/grant records and run revisions are append-only. Approval blocks
further revisions to that run. Corrections make a linked new run; original PDFs
and money remain intact. Effective defaults and explicit exceptions are copied
into approved snapshots. All settings/exception revisions conservatively invalidate
an unapproved review, including future-dated changes; the UI impact list lists
all unapproved drafts rather than predicting a statutory effective-date impact.

Imports require every period population member, including inactive and zero-time
members, and reconcile exact integer minor-unit USD strings. INCLUDE members need
finalized time before approval; zero/excluded members require explicit zero money.
Missing configuration/population is an actionable conflict. Employer contributions
never reduce net, and saved rules never recalculate provider amounts.

Monthly periods are calendar months; semimonthly periods are days 1–15 and 16–end.
Their anchor date is a rollout boundary. Weekly/biweekly periods start on the
anchor date. The scheduler prepares only the most recent completed period;
historical catch-up is an explicit reviewed action using the oldest missing-period
preview. That preview uses immutable effective settings history, original runs,
and exact calendar boundaries. Overlapping schedules or a schedule change inside
a period are flagged AMBIGUOUS_TRANSITION for human resolution. Corrections do not
replace original-period presence. At most 50 oldest gaps are returned with exact
remaining counts. History exceeding 1,000 setting revisions, 10,000 original runs
in the scanned range, or 3,660 days returns explicit overflow and unknown counts.
SQL limits apply before JSON aggregation; no silently truncated success count. Payday is period end plus
saved offset. Preparation never finalizes time or supplies invented amounts.

Durable jobs have unique business keys, expiring claim tokens, bounded retries,
explicit manual retry, and transactional end fencing. PDF generation renews its
lease between documents and stores a complete immutable set atomically; a crash
before commit leaves no partial set. Publication and reminder jobs are separate.
Reminder jobs now atomically write private source metadata and generic intents via
`notificationIntentStatements` inside the same fenced transaction. The existing
push dispatcher owns subscription consent, activation, retry and provider delivery;
payroll never creates or invokes a sender. Old PRIVATE_LINK_STUB/NOT_SENT receipts
remain immutable and project NOT_SENT_STUB. New receipts record actual intent
counts and QUEUED, QUEUED_DELIVERY_DISABLED, or NO_CURRENT_RECIPIENTS. A queued job
never means a delivered notification; capability noticeDelivery reports current
runtime readiness only. Queue environment is fixed when the intent is created.
Actual external delivery remains disabled/unverified; no live sender was tested.

Preparation sources authorize only an active Owner or current explicit review
grant. Statement sources authorize only the active employee owning the exact
published approved statement. Delivery and protected notification-open recheck
payroll enablement, current workspace identity/version, current authority and
current effective reminder enablement using metadata-only queries. Financial
snapshots and document bytes are not loaded. Private copy and external push
envelopes contain no employee name, money, period, source ID or document URL.
The external envelope retains the existing opaque notification ID and generic
message. Protected open routes to /app/payroll or /app/my-pay; there is no inbox UI.

Reminder lead values are eligibility thresholds, collapsed to one notice per
period/settings revision. Each scheduler invocation considers historical completed
periods, including older periods with long payday offsets, and selects only the
most recent period whose payday has entered a configured threshold. If its original
run is approved, no older burst is generated. A restart after a missed lead date
can queue this one current actionable notice. Repeated invocations reuse the same
business key. All other gaps remain visible for explicit manual preparation.
Automatic preparation still handles only the latest completed period, and never
approves money or finalizes time. Overflow/ambiguous history does not auto-notify.

PDF generation uses the PDF-standard Helvetica WinAnsi repertoire (including
English/Spanish accents), validates glyph support, wraps
long text, paginates, and emits English/Spanish from the approved snapshot.
Unsupported Unicode outside this repertoire fails visibly rather than silently
losing names. Arbitrary-script font support remains open. Variable and static
Inter subsetting produced missing outlines in real rendering and was rejected.
All dynamic document strings are preflighted before immutable human approval;
unsupported names or labels return actionable UNSUPPORTED_DOCUMENT_GLYPH field
issues without approving or enqueuing PDF work. The worker also retains that
actionable failure code defensively. Exact source names are never transliterated. This is not arbitrary-Unicode support. Byte hashes
and filenames are stable for exact retries; documents stay private in PostgreSQL.

## Integration fixture and UI handoff

`seedPayrollFixture(executor, {published?:boolean})` in
`src/test/integration/payroll-fixture.ts` accepts only a marked disposable local
fixture database. It creates fictional Owner, explicitly granted Manager reviewer,
ungranted Manager, and employees A/B; returns IDs, fictional password, server proof,
period, exact amounts, preferences and run ID. It includes nonzero finalized time
and a complete reviewed roster. `published:false` leaves imported review state;
`published:true` uses the real approval/PDF/publication/private-outbox path.

`createOwnedNextApp(evidenceDirectory,{payrollEnabled:true})` enables payroll only
in its owned scratch runtime. Default is false; parent flags are not inherited.
The existing helper records actual source hashes and substituted local SQL adapter.
Root/UI own browser checks and screenshots. This backend handoff does not claim UI
or hosted acceptance.

## Rollback and next gates

Disable feature and worker first; preserve immutable financial/custody/artifact
rows. Do not reverse/drop approval history to roll back application code.
Required next gates: integrated source/browser verification, engineering review,
independent review, environment/migration backup privileges and Jose's production
release approval. Account-specific provider CSV mappings, bank-channel enrollment
and accepted format, and accountant-validated internal tax cases remain blocked
on external evidence; neutral import/settings/PDF work does not imply those states.

Validation matrix and exact local invocations are recorded under
`.omo/evidence/payroll-backend/README.md` (P1) and
`.omo/evidence/payroll-p2/README.md` (P2). Earlier failed logs are retained and
identified; only fresh successful runs count as observed evidence.

## P1 review follow-ups included in P2

P1-enum-coercion: all enum validators now require an actual string; singleton
JSON arrays, objects, booleans and numbers are rejected instead of coerced.
P1-M2: document metadata reads are constrained to the selected 300 run IDs;
an empty selection fetches no documents and older immutable history is not loaded.
These fixes have focused regression scenarios; independent finding closure belongs
to the review owner. Broad module restructuring was excluded from this bounded round.
