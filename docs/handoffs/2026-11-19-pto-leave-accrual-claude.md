# PTO, delegated time off and accrual

This contract covers #1, #2, #9 and #10 on the SCRUM-188 foundation. Codex owns the backend and Claude owns the UI. The local source starts at `origin/development` commit `e0e8efe9ce1aeee8a2961cd92684ff1a38f95550`.

## Policy setup and balances

All workforce requests require `x-nevora-workforce: 1`. Writes send same-origin JSON with the signed-in session. Display the returned state and refresh the relevant read after a confirmed write.

| Workflow | Contract |
| --- | --- |
| Read policies | `GET /api/workforce/settings` returns `data.policies`. An Owner sees enabled and disabled policies. Other signed-in roles see enabled policies. Each row includes `id`, `code`, `label`, `revision`, `enabled`, `fullDayMinutes`, `earnedMinutesPer100Hours` and `carryoverCapMinutes`. |
| Save a policy | Owner sends `POST /api/workforce/settings` with `kind: "PTO_POLICY"`, `operationId` (UUID), `code`, `label`, `enabled`, `fullDayMinutes`, `earnedMinutesPer100Hours`, `carryoverCapMinutes` and `expectedRevision`. Use revision 0 to create and the current revision to edit. Use the returned `receipt.policyId` for new requests. Keep `code` stable so its revisions share one balance. |
| View balance and history | `GET /api/workforce/pto` reads the signed-in account. An Owner can also use `GET /api/workforce/pto/{employeeId}`. Read `data.balances` by stable code and `balanceMinutes`, plus the most recent 100 `data.entries`. Respect `historyTruncated`. History uses signed minutes, `effectiveDate`, `recordedAt`, `policyId`, `requestId` when applicable, and `kind`. Owner audit also includes actor, source reference, qualifying minutes and note when present. |
| Adjust an account | Owner sends `POST /api/workforce/settings` with `kind: "PTO_POST"`, `operationId`, `employeeId`, `policyCode`, `expectedPolicyRevision`, `effectiveDate`, `entryKind: "ADJUSTMENT"`, nonzero signed `quantity` in minutes, `sourceReference: null`, and a required `note`. SCRUM-188 also supports `OPENING`, manual `EARNED` with a unique verified source, and `CARRYOVER`. Do not wire a qualifying-time or statutory accrual button to the manual posting command. |

Settings writes return `200 {state:"saved",receipt}`, `400 {state:"invalid"}`, `409 {state:"conflict"}` or `503 {state:"unknown"}` on uncertain persistence. A missing session returns 401 and lost authority returns 403. Retry an uncertain command with the same operation ID and body. On conflict, refresh the record before preparing a new command. Paid requests send the current revision UUID as `ptoPolicyId`. Full-day requests use inclusive dates at the policy's daily minutes. Partial days use the selected time interval on one date. A later policy edit leaves already captured request amounts intact.

## Manager intake, employee visibility and review

- A Manager sends `POST /api/workforce/leave` with `kind: "request"`, client-generated v4 UUID `requestId`, `startDate` and `endDate` in YYYY-MM-DD, paired `startTime` and `endTime` in HH:MM or both null, and `note` as trimmed text up to 250 characters. Optionally include `ptoPolicyId`. For delegated intake, include `employeeId` for the selected Employee or Lead. For the Manager's own request, omit `employeeId`. The signed-in Manager is the recorded submitter.
- For delegated intake, use the existing scoped roster for the person picker. Saving also requires `APPROVE_LEAVE` across the employee's home, eligibility, and scheduled locations for the requested dates. The Manager can enter a request in scope even though they cannot decide or cancel the resulting approval. Another independently authorized reviewer can act. Owner review covers cases without a fully scoped independent Manager. The existing SCRUM-215 owner retains shared Manager grants and refusal messaging.
- Successful intake returns `200 {state:"saved",requestId}`. A changed retry returns 409. `{state:"conflict",reason:"pto-policy"}` means the selected policy changed. Reload enabled policies and let the user select a current revision. Handle 400 invalid fields, 401 sign-in, 403 denied or `{state:"disabled"}`, and 503 unavailable. On an uncertain response, keep the exact body and request ID for retry.
- The employee sees the new item in the existing personal Time Off list and mobile planning read. `enteredBy` supplies the delegate's display name when present. Management and personal workforce results can include `submittedByEmployeeId`. Records created before this checkpoint can omit attribution. Keep the employee as the named subject.
- The Manager's own requests use `GET /api/workforce/leave/mine`. These carry `ownerReviewRequired: true` and go to an independent Owner. The rule stays attached to the request if the requester changes roles. A Manager can withdraw an own pending request with `POST /api/workforce/leave` using `{kind:"withdraw",requestId,confirmed:true}`. The employee's existing own withdrawal remains available for a pending delegated request.
- The team queue uses `GET /api/workforce/leave/{PENDING|APPROVED|DENIED|CANCELLED}`. Decide with the existing `reviewTimeOffAction` using `requestId` and `decision` of `APPROVED`, `DENIED` or `CANCELLED`. For approved cancellation, ask for confirmation and refresh the queue, balance and history after success. Insufficient balance leaves the request pending and redirects with `error=pto-balance`. An approval retry may return the existing review redirect without a new write. On that outcome, refresh the request and its history. A same-reviewer cancellation retry acknowledges the original cancellation and restores the original deduction once. A pending withdrawal has no ledger effect.
- For these new submissions, the existing pending-review notification seed goes to the Owner. Other authorized reviewers can find delegated requests in the team queue. The affected employee can track the request directly from Time Off.

### Single-Owner scheduling option

A sole Owner can use their own existing **When they can be scheduled** record from the employee profile at `/app/employees/{employeeId}/restrictions`. Set the unavailable time blocks starting with the earliest editable schedule week. The weekly rule persists until a later version restores availability, so record that later version for temporary unavailability. Adjust existing published assignments through the normal schedule workflow when a restriction cannot affect the already closed week. This writes a scheduling restriction and carries no leave approval or ledger effect.

## Accrual explanations

Use one balance each for `VACATION` and `SICK`. An accrual-backed entry may include an `accrual` object with `startDate`, `endDate`, `qualifyingMinutes`, `policyRevision`, `awardMinutes` and signed `changeMinutes`. Show the finalized time period, qualifying time and policy version. On `EARNED`, show the original credit. On `ADJUSTMENT` with accrual metadata, explain that a finalized timecard changed and show the signed difference. Compute the prior award as `awardMinutes - changeMinutes` if needed. An adjustment without accrual metadata is a separate manual ledger entry. Employee history carries the accrual explanation without raw punches, source references, or private notes.

The internal preparation uses one immutable finalized timecard per employee and period, explicit policy revision IDs, and two ledger accounts. Fictional rules count completed elapsed minutes less recorded breaks, then multiply by the pinned rate and round down to whole earned minutes. Refinalizing the period compares the recalculated award against the last recorded award for that period. A zero change stores a receipt without a ledger movement. Overlapping periods and a correction that would push either account below zero are refused atomically. Ledger posting dates follow the company business date, with the qualifying dates retained in the explanation. Current code leaves the accrual writer unwired from HTTP, workers, and schedules. Keep Puerto Rico statutory configuration and activation pending Chat 4's source-based rules and professional review, including how to reconcile prior manual credits before a first automated run.

## Integration checkpoint

Apply `0072_delegated_time_off.sql` and then `0073_pto_timecard_accrual.sql` following `0071_user_language_preferences.sql` and before serving the combined application. Both are registered in the canonical order and local fixture list. The onboarding manifest and provisioned application role grants are updated. The UI checkpoint includes both migrations because the account reader joins the explanation records.

The integrator should combine this with SCRUM-215's changes to `src/lib/workforce/leave-authority.server.ts`. Keep SCRUM-215's typed refusals, and include both the submitting participant check and the Owner-only review rule from this checkpoint. Rerun the owned PostgreSQL suites and run combined Development acceptance with Claude's UI. Codex owns the migration and backend evidence. Development is the operating acceptance environment. Main and production promotion require Jose's approval of the verified combined release.

## Test evidence

The focused owned PostgreSQL run passed 28 checks across PTO, leave review and legacy workforce contracts. The release migration suite passed 20 checks, including upgrade from the prior Development schema and restore of both pre-upgrade and post-upgrade backups. Tests use fictional companies and timecards.

Reproduce with `DATABASE_URL` and any application database target unset. Point `NEVORA_TEST_PG_BIN` at local PostgreSQL binaries. The migration restore test also needs `pg_dump` and `pg_restore` in that bin directory.

```sh
node scripts/payroll-postgres.mjs vitest.company-access-integration.config.mts company-access-pto company-access-workforce-pto company-access-time-off-review
node scripts/payroll-postgres.mjs vitest.release1-migrations.config.mts
npm run typecheck
npm run lint
npm run check:onboarding-manifest
```
