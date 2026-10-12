# Configurable payroll backend handoff

Owner: payroll_backend executor; integration/release owner: root. Candidate branch:
`codex/configurable-payroll-20261012`. Contract checkpoints: `4272655` and `283f57f` (additive optional provider/channel
metadata and explicit NOT_SENT_STUB outcome); uncommitted implementation remains
in the authorized candidate checkout. No production deployment, bank submission,
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
historical catch-up is an explicit reviewed action. Payday is period end plus
saved offset. Preparation never finalizes time or supplies invented amounts.

Durable jobs have unique business keys, expiring claim tokens, bounded retries,
explicit manual retry, and transactional end fencing. PDF generation renews its
lease between documents and stores a complete immutable set atomically; a crash
before commit leaves no partial set. Publication and reminder jobs are separate.
Completed reminder jobs expose outcome NOT_SENT_STUB. The notification transport
is deliberately NOT IMPLEMENTED/disabled: synthetic
private-link receipts say PRIVATE_LINK_STUB and NOT_SENT. A successful stub job
never means a real notice was sent. No actual external transport is configured.

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
`published:true` uses the real approval/PDF/publication/stub-worker path.

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
`.omo/evidence/payroll-backend/README.md`. Earlier failed logs are retained and
identified; only fresh successful runs count as observed evidence.
