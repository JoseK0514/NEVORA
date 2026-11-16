# Confirmed dead-end defects: backend repair handoff

Development is Jose's working and acceptance release, with production standards. Codex owns backend/hosting, Claude owns UI. Main/production promotion needs Jose's approval. This patch uses fictional local data only; no hosted database, customer data, real notification, payment, paid service or Rondo migration is touched.

## Scope and source

Base: freshly fetched `origin/development` at `b5085edb33d1bccc440588f950e728566c8a79ac`. Work is isolated in a detached worktree. Jose's Nov 15 clarification limits this pass to confirmed defects preserving existing product rules; broader assessment recommendations are deferred. The incoming assessment is a code-reading review, not proof of current hosted modes or independent acceptance.

- Account safeguard: `4577ac5e`. Deletion and profile demotion/deactivation serialize on ordered Owner lifecycle locks. A new request cannot remove the last active Owner without an open deletion. Refusal rolls back request creation, session/calendar revocation and lifecycle timestamp changes. Another Owner already awaiting deletion does not count as a replacement. Existing requests still recover their original receipt; this does not silently withdraw a preexisting request.
- External totals CSV: `d964988a`. The current payroll import/review/publication lifecycle accepts a bounded CSV wrapper, normalizes exact dollar strings to integer cents, and retains the exact accepted source in its immutable snapshot/hash. Existing JSON imports remain supported. Complete-population, balanced deductions, currency, dates, optimistic revision, approval token, current scope and same-operation recovery checks remain authoritative.
- Paid exports: implementation/verification commit recorded in the final evidence below. Explicit treatment of every relevant recorded break supplies paid and unpaid durations and daily rows. Paid rests remain paid; only attested relieved meals are subtracted. No break label, category, duration, overtime, tax or legal eligibility is guessed. Raw canonical fields and historical receipt bytes remain intact. Legacy RUN mappings with recorded time under Pay Hours need explicit review/replacement before a new file can be generated.

This is backend qualification. Claude must connect the additive contracts and verify combined UI/backend journeys before those journeys can be called accepted.

## Claude contracts

### Final Owner deletion

The existing server action returns `{kind:'unavailable', reason:'LAST_OWNER'}`. Its current UI still renders the supported unavailable/contact-support state. Claude should explain: another active Owner must be established before self-service deletion, or contact support to close/offboard the company. Do not imply the request was accepted or sign the person out. The service's typed result uses `{outcome:'unavailable',reason:'LAST_OWNER'}`. No form/CSS/component was edited.

### External payroll totals

Use the existing protected JSON POST `/api/payroll/runs`, with existing same-origin/session and `x-nevora-payroll: 1` admission. For example:

```json
{
  "action":"IMPORT",
  "operationId":"11111111-1111-4111-8111-111111111111",
  "runId":"22222222-2222-4222-8222-222222222222",
  "expectedRevision":2,
  "amounts":{
    "schema":"NEVORA_PAYROLL_CSV_TOTALS_V1",
    "currency":"USD",
    "sourceName":"Fictional accountant",
    "sourceReference":"QA-2026-09",
    "period":{"startDate":"2026-09-21","endDate":"2026-09-27"},
    "payday":"2026-09-29",
    "csv":"employeeId,gross,employeeDeductions,employerContributions,net\nfictional-a,1000.01,123.40,70.00,876.61\nfictional-b,0,0,0,0\n"
  }
}
```

The same wrapper works in CORRECT with the existing required reason. Include every roster person, including zero/excluded dispositions. Exact ordered headers; LF or CRLF; initial BOM and strict quoted/escaped cells accepted. Nonnegative decimal dollar strings only: no symbols, grouping, exponent, leading zeros or more than two fractional digits. At most 300 people, 256 KiB UTF-8 and 200 characters per cell. No arbitrary provider fields or inferred tax categorization. Deductions/contributions are honestly labeled external totals.

`sourceDocument` is canonical audit evidence in the immutable snapshot, not a run-list field or a log. Changed CSV bytes, source metadata or logical contents cannot reuse an operation ID. Preserve the complete original request on uncertain-outcome retry; a deliberately changed request uses a new operation and review. Errors retain existing INVALID_PAYROLL_INPUT plus bounded issue paths. This is provider-neutral CSV, not an assertion of compatibility with a provider's native file.

### Paid time exports

The current protected export command accepts additive `paidTime`:

```json
{"version":1,"breakTreatments":[{"employeeId":"fictional-a","entryId":"recorded-entry-id","breakId":"recorded-break-id","treatment":"UNPAID_RELIEVED_MEAL"}]}
```

Allowed treatments are PAID_REST and UNPAID_RELIEVED_MEAL. Every relevant break in the selected period/source must appear exactly once, with employee/entry/break identity. Empty treatments explicitly review a period with no breaks. Missing, stale, duplicate or out-of-selection identities refuse the file. Existing finalized revision/source-hash/finalization-operation fences remain required.

With `profileId:null` and `paidTime`, the provider-neutral file is per employee/business date and includes decimal paid/unpaid/rest hours alongside exact nanoseconds and source provenance. Default precision remains nine decimals with REJECT_INEXACT; an inexact decimal duration requires a separately reviewed custom precision/rounding profile. No automatic rounding choice is made. Legacy raw neutral exports remain labeled recorded time.

Use `adpRunPaidColumns()` for a newly reviewed RUN mapping. `adpRunColumns()` remains the legacy UI template so its existing select does not silently change meaning. Reads flag legacy profiles with `requiresTimeBasisReview:true`. New save/generation refuses a legacy RUN recorded-hours mapping; existing receipts replay their original bytes. Claude must add paid mapping choices, classification review, precision guidance and clear refusal copy. Current UI cannot submit `paidTime`, so the full accountant journey remains open.

## Existing decisions checked

- External calculation/imported statements were already approved on Nov 15: [remaining inspection contract](2026-11-15-inspection-backend-remaining.md). This patch reuses that approval and leaves native-provisional activation/rules unchanged.
- Availability is already covered by a newer approved management-restrictions design, superseding the research proposal. The separate scheduling candidate at local `018a0f8b7cd9ec4401459b3363909e7873e57446` contains `docs/superpowers/specs/2026-11-15-management-scheduling-restrictions-design.md` and `docs/handoffs/2026-11-15-management-scheduling-backend.md` in `/Users/josek0514/.codex/worktrees/nevora-scheduling-restrictions/Fuel Scheduler`. Its explicit approval keeps agreed restrictions firm, makes employee inputs preferences only after management establishes a version, preserves legacy-unconfirmed state and existing legal/maximum/leave/eligibility blockers. No blanket grandfathering or unreviewed conversion is approved by that design. It is not imported, reimplemented or certified here. Its 0065 migration must be combined by its integrator with the assigned Rondo 0064 work and Claude UI.
- The current database-per-company operator direction is already approved: [operator guide](../product/multi-company-database-per-company-20261021.md). Isolated routing has bounded staging work; this does not approve making it the selling/default architecture. No tenancy change here.
- Existing company/location Manager boundaries and independent correction review remain unchanged. No confirmed approval was found in the inspected source for blanket Unknown-to-warning changes, solo-Owner self-review or expanded location-Manager publishing.

Recommendations for unresolved decisions (proposals only):

| Decision | One recommendation, launch need and safeguard effect |
| --- | --- |
| Labor-rule defaults | Keep unknown/legal-unverified facts blocking; make setup identify each incomplete rule and require an explicit configured/not-applicable decision. This removes unexplained launch dead ends without silently waiving a legal requirement. |
| Solo-Owner corrections | Use an authorized second reviewer for the pilot; separately decide any direct-correction ledger workflow. Staff time can be corrected while independent review remains enforced. |
| Location Managers | Keep current scope and Owner publication; have Claude surface drafts waiting on the Owner. Launch gets a visible handoff without expanding Manager authority. |
| Isolated tenancy as default | Retain the approved database-per-company operating model; qualify existing isolated routing and migration/rollback tooling on disposable clients before deciding a default change. Growth preparation preserves tenant isolation and release custody. |

## Deferred assessment scope

Availability integration stays with its current candidate/owner. UI simplification, Spanish, call-out/module separation, approved-leave cancellation, late swaps, overtime exceptions, correction-decision pushes, shift reminders, notification preferences, Builder changes, capability unification, tenancy migration tooling, native company entry, marketing and monitoring remain deferred to their approved owners/scopes. No unknown legal requirement becomes advisory, no self-review protection is removed, and no Manager permission or tenancy architecture is changed because the assessment recommended it. Rondo work is untouched.

Actual hosted calculation modes and monitoring/notification delivery are not verified by this local patch. No 2027 native rules or Puerto Rico compliance claim is introduced. Paid/unpaid export attestations describe reviewed facts, not legal clearance.

## Verification and release evidence

Final exact-source checks, candidate identity, review findings/dispositions and remote/CI state are appended below. Earlier RED runs are preserved externally under `/Users/josek0514/Documents/Codex/2026-11-15/ple/work`. A whole-unit discovery run overlapped intentional RED tests and is not a clean baseline or final qualification. The broad Company Access run initially hit three unsupported-XML errors in the earlier local PostgreSQL build; the test-runtime correction is isolated from repository/application changes, and the final rerun is required.
