# Phase 2 — Claude financial interface contract

November 16, 2026. Baseline `edce7661c211aba588f29bd6d56327fabdc11b47`; Phase 2 local patch only. Claude owns presentation and combined UI acceptance. These contracts describe externally calculated payroll totals and recorded-time exports. They do not execute payroll, calculate statutory tax, certify legal break eligibility, activate native payroll, or establish hosted payment/provider acceptance.

## Versioned sources and executable examples

| Contract | Owning source | Version |
| --- | --- | --- |
| Import, correction, runs, receipt reads | `src/lib/payroll/contracts.ts`, `model.ts`, `service.ts`, `http.ts` | `PAYROLL_API_V1`; amounts schemas below |
| Export command | `src/lib/payroll-export/command.ts` (also re-exported by `service.ts`) | Existing export V1; no new wire field |
| Mapping, canonical output, paid review | `payroll-export/model.ts`, `paid-time.ts`, `errors.ts`, `client.ts` | Profile/model/review `version:1` |
| Byte-aware planning / verified coverage | `payroll-export/batches.ts` | `NEVORA_PAID_EXPORT_BATCHES_V1` |
| Roster / manifests / artifacts | `src/lib/period-close/service.ts`, `/api/period-close` | Existing `READ`, `POPULATION`, `MANIFEST`, `HANDOFF`, `HISTORY` actions |
| Company billing read / central mutations | `src/lib/commerce/status.ts`, `/api/commerce/status`, `services/commerce/service.ts` | Existing CommerceStatus and `/v1/*` contract; unchanged |

[Fictional fixtures](2026-11-16-backend-phase2-finance-fixtures.json) contain complete accepted JSON/CSV/correction commands, an invalid row and response, original/retry bodies, receipt reads, a full hash-verifiable paid export, mapping save/read replies, a complete batch input/plan/manifest request, and trial/paid/grace/restricted/pending billing examples. `src/lib/payroll/phase2-contract-fixtures.test.ts` exercises them against the real parsers, cents arithmetic, CSV/hash verification and planner. URLs ending in `fictional-not-usable` are illustrative, not usable provider sessions.

## Admission, identity and authority

All financial reads and responses are private/no-store. Use the current signed-in company context and same-origin requests. Never accept a company, employee role, amount total or source hash supplied by a browser as authorization. The server rechecks current active session/role/company scope around protected work and receipt disclosure.

| Surface | Headers / authority | Body cap |
| --- | --- | --- |
| `/api/payroll/runs`, `/settings`, `/receipts` | `x-nevora-payroll: 1`; mutation JSON + exact allowed Origin. Current Owner, or current Manager with the required payroll review/approve grant and object/location coverage. `NEVORA_PAYROLL_ENABLED` must be enabled by its existing release owner. | 1,048,576 actual UTF-8 bytes for mutations |
| `/api/payroll-export`, `/profiles` | `x-nevora-payroll-export: 1`; POST JSON + exact allowed Origin. Send `x-nevora-actor` equal to the signed-in employee ID; if supplied it must match. Current Owner or Manager with Company authority. A location-only Manager cannot use Company export recovery. | 65,536 actual UTF-8 bytes |
| `/api/period-close` | `x-nevora-period-close: 1`; JSON + exact allowed Origin; required `x-nevora-actor` matching session. Current Owner or Company Manager. | 262,144 actual UTF-8 bytes |
| Company `/api/commerce/status`, `/handoff` | Current bound Owner, exact configured host/origin and valid installation; cookie session. Handoff POST requires exact company Origin. | Existing boundary; no client company/actor selectors |
| Central `/v1/status`, `/v1/checkout`, `/v1/portal`, `/v1/plan-change` | Approved Origin and existing commerce bearer bound to current Owner/installation. Mutations require `Idempotency-Key` with a newly reviewed UUID; use normal UUIDv4. | 16,384 actual request bytes for these mutations |

Employee/Lead sessions cannot import or export Company payroll. Own published statements use the separate existing statements contract. Role labels alone do not establish a Manager's finance permissions; consume `capabilities.canReview`, `canApprove`, `canConfigure` and server object coverage. Exports and period closure are Company operations even where a narrower Manager may review an authorized payroll object. No session proof or provider credential belongs in a client payload or fixture.

## CSV and JSON import / correction

`GET /api/payroll/runs` returns `PayrollRunsResponse`: `version`, `capabilities`, `runs`, `jobs`, optional `currentPeriod`, `missingPeriods`, `backlog`. Complete field definitions live in `contracts.ts`. Relevant run fields are `id`, `revision`, inclusive `period`, `payday`, `status` (`WAITING_FOR_AMOUNTS`, `BLOCKED`, `REVIEW_REQUIRED`, `APPROVED`), `sourceAuthority`, `correctionOf`, `rows`, `totals`, source name/reference, population/settings/import revisions, `exceptions`, `reviewToken`, documents and approval timestamps. Rows/totals/reviewToken may be null while waiting; null/overflow is not zero or complete. A document's existence and a published statement are separate states.

`GET /api/payroll/settings` provides the actual employee IDs/names/active state plus current settings, grants and capabilities. Match accountant records explicitly to these IDs; there is no fuzzy-name or email matching contract. Include inactive employees in the reviewed all-roster population. Existing settings and approved period dates come from the server; do not infer a new payroll schedule or rates.

`POST /api/payroll/runs` accepts these bounded financial actions:

```ts
{action:'PREPARE', operationId, period:{startDate,endDate}, payday}
{action:'IMPORT', operationId, runId, expectedRevision, amounts}
{action:'CORRECT', operationId, runId, expectedRevision, reason, amounts}
{action:'APPROVE', operationId, runId, expectedRevision, reviewToken}
{action:'PUBLISH', operationId, runId, expectedRevision}
```

Use UUID operation/run IDs, a positive integer current revision, and the originally reviewed approval token (64 lowercase hex characters). A prepare/import/correction is a separate operation from approval/publication. Preparation does not calculate or import money. `IMPORT` updates a pre-approval external run; `CORRECT` requires an approved external run and creates a linked new run with a fresh review, preserving old statements/artifacts. Its reason is a trimmed, nonempty string of at most 300 characters. Successful commands return `{receipt:{operationId,action,runId?,revision?,jobId?,documentId?}}`; refresh authoritative reads to present resulting jobs/documents. Approval can queue document work; publication is distinct. Do not add `RECALCULATE`, `CORRECT_NATIVE` or payment execution to the external-import flow. Existing payment-instruction exports have separate support guards, including correction holds.

Both amounts formats require `currency:'USD'`, `sourceName`, `sourceReference`, `period:{startDate,endDate}`, `payday`. Source strings: trimmed, nonempty, no control characters, at most 300 characters. Dates: real `YYYY-MM-DD`, inclusive span of 1–31 days; payday must be on/after period end and must match the prepared run. Unknown keys, sensitive bank/tax fields and wrong schemas are refused.

JSON amounts:

```ts
{
 schema:'NEVORA_PAYROLL_IMPORT_V1', currency:'USD',
 sourceName, sourceReference, period:{startDate,endDate}, payday,
 rows:[{
  employeeId, grossMinor, employeeDeductions:[{code,label,amountMinor}],
  employerContributions:[{code,label,amountMinor}], netMinor,
  earnings?:[{code,label,amountMinor}]
 }]
}
```

Use canonical nonnegative base-10 integer **strings** for USD cents: `0` or 1–15 digits without leading zeroes. Never use floating point, dollar signs, exponent notation or decimal values in minor-unit fields. Gross minus employee deductions must equal net; employer contributions remain separate; optional earnings must sum to gross. At most 100 lines per kind, distinct codes within each kind (1–80 characters), labels 1–300 characters. One row per actual roster employee, 1–300 people; employee IDs are exact trimmed strings of at most 200 characters. Include zero/excluded people with zero values consistent with their reviewed disposition. Nonzero excluded values and unfinalized included time appear as blocking review exceptions; they do not authorize approval.

CSV amounts replace `rows` with `csv` and use `schema:'NEVORA_PAYROLL_CSV_TOTALS_V1'`. Exact required header order:

```csv
employeeId,gross,employeeDeductions,employerContributions,net
E,1000.01,123.40,70.00,876.61
Z,0,0,0,0
```

Accept UTF-8 text, optional initial BOM, LF/CRLF, standard quoted cells/escaped quotes and one optional final line ending. At most 262,144 encoded CSV bytes, 300 data rows, five columns, 200 characters per cell. Required dollar strings are `0` or a nonzero-leading integer up to 13 digits, optionally followed by one/two decimal digits. `0.01` becomes `"1"`, `1.2` becomes `"120"`, and `9999999999999.99` becomes `"999999999999999"` exactly. Negative, signed, exponent, comma-grouped, whitespace-padded or three-decimal amounts are refused. Every cell is required, including zero. Blank rows, extra/missing/reordered/duplicate headers and extra columns are refused.

CSV normalization retains the **exact accepted CSV** as `sourceDocument:{schema:'NEVORA_PAYROLL_CSV_TOTALS_V1',csv}` inside immutable canonical import evidence. That field, when replaying canonical data, must reproduce the rows exactly; do not synthesize, trim or replace it. Original source metadata/bytes and normalized amounts participate in operation identity. Both formats remain supported; CSV does not supply detailed earning/rate classifications. Imported money stays authoritative and external, not a tax calculation.

Validation: HTTP 400 `{error:'INVALID_PAYROLL_INPUT',message:'invalid payroll input',issues:[{path,message:'Check this value.'}]}`. Paths include `csv`, `csv.headers`, `csv.rows`, `csv.cell`, `csv.columns`, `csv.quoting`, `csv.lineEnding`, `rows.N`, `rows.N.employeeId`, `rows.N.gross`, `rows.N.employeeDeductions`, `rows.N.employerContributions`, `rows.N.net`, `rows.N.money`, `rows.N.netMinor`, `rows.N.earnings`, `rows.population`, `source`, `period`, `payday`, `sourceDocument.rows`. Validation currently stops at the first error; do not promise an exhaustive error list. Malformed JSON/transport uses `INVALID_INPUT` / `REQUEST_REJECTED`.

Conflicts (409) include `OPERATION_CONFLICT` (same operation, changed normalized command), `REVISION_CONFLICT`, `RUN_STATE_CONFLICT`, `IMPORT_PERIOD_CONFLICT`, `POPULATION_REVIEW_REQUIRED`, `POPULATION_SOURCE_CONFLICT`, `REVIEW_CONFLICT`, `SOURCE_CONFLICT`, `FINALIZED_TIME_REQUIRED` and generic `PAYROLL_CONFLICT`. Setup can report `SETTINGS_REQUIRED`; unsupported native input reports `NATIVE_AMOUNT_INPUT_FORBIDDEN`. Authentication/authorization is 401/403; absent or inaccessible runs can return `RUN_UNAVAILABLE` (404). Unknown failures remain `PAYROLL_UNAVAILABLE` (503), with a sanitized optional `X-Nevora-Request-Id` for support.

Unknown response, disconnect or timeout: retain the **original operation and complete body**, block changed-body submission, and use `GET /api/payroll/receipts?operationId=<original UUID>` with `x-nevora-payroll:1`. It returns `{receipt:PayrollReceipt|null}` under current authority. A null read is only the current observation, not proof an in-flight command cannot commit. Reconcile/retry the original body and ID; the server serializes and returns one effect. A changed file, metadata, revision, reason or amounts is a **new reviewed operation**, after resolving the old unknown operation. Do not silently refresh review tokens/revisions on retry.

## Paid-time export and mapping

`GET /api/payroll-export/profiles` returns `{state:'ready',profiles:[{id,revision,profile,requiresTimeBasisReview?:true}]}`. `POST` accepts exactly `{operationId,id,expectedRevision,profile}`. First save uses revision 0; later saves the reviewed latest revision. Replies are `{state:'saved',profile:{id,revision,profile}}`. Historical legacy saves can replay their original immutable revision; new legacy RUN recorded-hours saves are refused.

Full `ExportProfile` fields: `version:1`, `name`/`product` (1–120 characters), `format:'CUSTOM_CSV'|'ADP_RUN_GENERIC_V1'`, `dateFormat:'ISO'|'US'`, `hourDecimals:0..9`, `precision:'REJECT_INEXACT'|'HALF_UP'`, `verifiedRequirements` (1–600 characters), `reviewedTimeBasis:true`, `columns` (1–20), `employeeMappings` (0–100). Each column is `{header,source,constant?}`: distinct case-insensitive headers (1–80 characters), constant only for `source:'constant'` (empty or at most 100 characters). Each mapping is `{employeeId,providerEmployeeId}`: unique IDs on both sides, at most 200/100 characters. Text is trimmed/control-free; import-sensitive header/constant/provider-ID formula prefixes are refused. Missing provider IDs refuse the entire output, never skip rows.

Mapping sources: `employeeId`, `employeeName`, `providerEmployeeId`, `periodStart`, `periodEnd`, `recordedHours`, `breakHours`, `recordedNanoseconds`, `breakNanoseconds`, `revision`, `sourceHash`, `constant`, `businessDate`, `paidHours`, `unpaidBreakHours`, `paidRestHours`, `paidNanoseconds`, `unpaidBreakNanoseconds`, `paidRestNanoseconds`. `businessDate` selects daily rows. The complete default paid profile is in `fixtures.exports.generated.export.profile`; a complete save command is in `fixtures.profiles.saveRequest`.

For RUN use `adpRunPaidColumns(companyCode,payFrequency,earningsCode,rateCode)` with the actual reviewed provider requirements. The exact 11 headers/order, US dates and two decimal hours are validated. Company code is 1–10 alphanumeric characters; frequency is `B|W|S|M|Q`; earnings/rate codes must be reviewed nonempty values up to 10 characters; provider IDs are alphanumeric, at most 15 characters. The generator's other constant constraints remain in `model.ts`. Never infer an account-specific rate/earnings code or claim universal provider compatibility.

`POST /api/payroll-export` accepts exactly:

```ts
{
 operationId, profileId:null|UUID, profileRevision,
 startDate,endDate,
 cards:[{employeeId,revision,sourceHash,finalizationOperationId}],
 paidTime:{version:1,breakTreatments:[
  {employeeId,entryId,breakId,treatment:'PAID_REST'|'UNPAID_RELIEVED_MEAL'}
 ]}
}
```

`profileId:null` requires revision 0 and selects the neutral paid profile when `paidTime` is present. A saved profile needs its current positive revision. Each request selects 1–100 unique employee IDs and at most 1,000 break treatments, within **65,536 UTF-8 bytes for the complete JSON body**. Card revisions are positive safe integers; source hashes are 32 lowercase hex characters; finalization and operation IDs use the existing UUID parser. Each treatment uses exact employee/entry/break identity (IDs 1–300 trimmed/control-free characters), no duplicate identity, and one allowed explicit treatment. Include every effective recorded break overlapping the selected period, including those on overnight/DST/period-boundary entries. No break-category/name/duration inference. Empty treatments explicitly attest no selected effective breaks. Missing, foreign or extra break identities refuse output. Existing recorded-only/historical APIs remain supported but must not be labeled paid time.

Success: `{state:'generated',export:{operationId,profileId,profileRevision,profile,model,csv,csvSha256,canonicalSha256}}`. `model` preserves `version:1`, workspace/timezone/period, `timeBasis:'RECORDED_ELAPSED_INCLUDING_BREAKS'`, source entries and immutable finalized revisions/hashes. Its explicit `paidTime`, row daily `days` and exact decimal nanosecond strings separate recorded elapsed, total breaks, paid time, unpaid relieved meals and paid rest. Paid = recorded minus explicitly reviewed unpaid meals; paid rest remains included. No rates, overtime rules or legal classifications are computed. `canonicalSha256` covers deterministic canonical JSON; `csvSha256` covers exact CSV bytes. Call `verifyExportReply` before using/downloading a reply.

Precision is explicit. Neutral paid hours use nine-decimal `REJECT_INEXACT`; some minute durations still cannot be represented exactly. Show `INEXACT_HOURS`; do not silently round or select `HALF_UP`. A user may explicitly review/save a supported rounding profile; keep exact source durations and the chosen policy in the immutable receipt.

| Reply | Meaning / consumer action |
| --- | --- |
| 400 `state:'invalid'` + optional `reason` | Known shape or pre-write review refusal; no new receipt from this refused attempt. Reasons: `LEGACY_MAPPING_REVIEW_REQUIRED`, `BREAK_CLASSIFICATION_REVIEW_REQUIRED`, `PAID_TIME_REVIEW_REQUIRED`, `INEXACT_HOURS`, **`PROVIDER_EMPLOYEE_MAPPING_REQUIRED`**, **`FINALIZED_TIMECARDS_REQUIRED`**. The last two are Phase 2 additions. An overlapping identical committed operation is recovered before reporting a later source/profile refusal. |
| 409 `state:'conflict'` | Original operation/body, source revision, profile or finalization changed. Preserve original custody; reconcile an unknown original before new review. |
| 409 `state:'already_generated'` | This workspace already has that business artifact under another operation/actor/profile alias. Find the original receipt through period-close read; do not mint replacement IDs. |
| 401/403 `state:'unavailable'` | Sign-in or scope denied; do not disclose or retry under a different actor. |
| 503 `state:'unavailable'`, network loss or unverified reply | Outcome remains unknown. Retry exactly the original serialized body and ID, under the original actor's current authority. Never treat text from an arbitrary exception as a safe refusal. |

The export route has no separate receipt GET. Identical POST returns the immutable original, even after reopen/profile changes, provided current authority remains valid. Period-close `READ` exposes authorized period receipts. Actor identity, normalized command and source custody remain bound. Unknown post-write receipt-verification failures stay uncertain, rather than becoming review refusals.

## Practical batching and whole-period custody

Import `planPaidExportBatches` and `paidExportBatchProgress` from the new client-safe `batches.ts`. Planning is local and has no mutation endpoint. Inputs are complete in `fixtures.batching.input`: a newly reviewed random UUIDv4 `planId`, current `actorId`/`workspaceId`, period, current `sourceHash`, **the entire server-reviewed Population**, profile selection, exactly the INCLUDE employees' finalized card references, and the complete paid-time review. ZERO_TIME/EXCLUDE members stay in population custody. No count-only slicing or silent overflow selection.

The returned versioned plan freezes a deterministic command/body/`encodedBytes` per batch plus `manifestRequest`. It greedily groups whole employees, checks actual `TextEncoder` bytes, and retains the original 100-card/1,000-treatment caps. Each employee and all their selected treatments occur once. It rejects omissions, duplicates, foreign treatments, stale population/source pairing and non-included selected people with `PayrollExportBatchError.reason:'POPULATION_COVERAGE_REQUIRED'`. If one person's complete command exceeds bytes/treatments, `EMPLOYEE_EXCEEDS_COMMAND_LIMIT` requires a supported, explicitly reviewed next step; there is no automatic per-entry split, truncation, larger global limit or partial-complete label. A roster above 300 remains unsupported here. Wire ordering is locale independent; operation IDs are derived once from the plan UUID/index in the format accepted by existing period-close receipt references.

Send each stored `batch.body` **verbatim** to the existing export endpoint. Do not reserialize/repartition/replan or create another plan UUID to recover uncertainty. A changed review requires a new plan only after the original is reconciled. Keep the private plan in the existing finite in-memory authority lifecycle; retire it on scope/session loss or expiry. Do not add localStorage, analytics or indefinite payroll persistence.

If a batch reports `already_generated` under a different operation, stop this plan in an explicit blocked/reconciliation state. Its original body remains retained, but another operation's artifact cannot satisfy its progress or fixed manifest request. Period-close `READ` provides authorized receipt references/fingerprints, not a replacement full generated reply. Use the existing authorized period-close receipt-selection flow to review a complete INCLUDE set and explicitly prepare a separate manifest request referencing the actual original receipts; the server revalidates the entire set. Never relabel another operation's reply or silently swap references inside this plan.

Pass successful server replies to `paidExportBatchProgress`. It reconstructs/verifies the plan and each reply, workspace, CSV and hashes before counting a person. Duplicate/foreign/altered replies and corrupted plans refuse with `INVALID_BATCH_PLAN` or the receipt verifier's failure. Missing/lost replies stay pending. Result fields: `state:'INCOMPLETE'|'READY_FOR_MANIFEST'`, **`periodComplete:false`**, `completedEmployeeIds`, `pendingEmployeeIds`, `completedOperationIds`, `pendingOperationIds`. Even all successful exports only mean ready to request a manifest. The helper does not prove current server source or supply authorization.

Existing period-close protocol remains authoritative:

```ts
POST /api/period-close
{action:'READ', command:{startDate,endDate}}
{action:'POPULATION', command:{operationId,startDate,endDate,expectedRevision,sourceHash,
 members:[{employeeId,disposition:'INCLUDE'|'ZERO_TIME'|'EXCLUDE',reason,
 employmentFacts,employmentBasis:'MANAGER_ATTESTED'}]}}
{action:'MANIFEST', command:{operationId,startDate,endDate,populationRevision,
 receipts:[{actorId,operationId}]}}
```

Use the complete current server roster, including inactive/zero/excluded people, in the reviewed population (at most 300). Reasons/employment facts are explicit attestations, not inferred dates or legal employment determinations. ZERO_TIME with recorded time is refused; EXCLUDE with recorded time requires an Owner and a reason of at least 10 characters. The planner never changes those rules. Use its fixed `manifestRequest` only after all replies reconcile; zero INCLUDE people can correctly produce zero export batches but still require the server manifest.

The server loads original receipts itself and requires exactly the INCLUDE set: omitted/duplicated/extra people, wrong-period receipts, changed population/source, stale/reopened cards, changed mappings and export-custody races refuse. A new export batch invalidates older current-manifest custody. Partial success is retained as immutable receipts and remains incomplete. The accepted manifest contains the full population, all selected original export receipts, totals, `state:'MANIFEST_PREPARED'`, `downstream:'NOT_VERIFIED'`. Existing artifact/history/handoff reads retain original bytes and explicit event coverage. A prepared manifest does not prove import into a payroll provider. `HANDOFF` remains separately reported/verified with the existing release/provider owner; no native payroll or provider submission is activated.

## Billing — existing business rules and recovery

Billing code is preserved; Phase 2 found no confirmed billing defect in the executed bounded suite. Consume the actual server offer/configuration; no proposal price, trial length, retention policy or extra entitlement is adopted here. The approved 30-day original trial is not restarted by signup, redirect, retries or early setup. Small/Team support 15/30 active non-Owner employees respectively; above 30 requires assisted setup. Owners are excluded from that seat count. Capacity refusal never automatically deactivates or deletes people.

`GET /api/commerce/status` returns existing CommerceStatus plus current `notice`, `timeZone`, `observedAt`, `validForMs`. Honor that lease; zero/expired/failed reads are not a perpetual entitlement. Status fields: `state:'trial'|'paid'|'grace'|'restricted'`, `operational`, `trialEndsAt`, `paidThrough`, `graceEndsAt`, `plan:'small'|'team'|null`, `employeeLimit:15|30`, `activeEmployees`, nullable `reason`, `billing:true`, `export:true`. Reasons: `setup_required`, `setup_pending`, `employee_limit_exceeded`, `trial_ended`, `payment_failed`, `subscription_canceled`, `payment_required`. Timestamp/null semantics are retained. The synthetic companyStatus fixtures cover each relevant state and pending changes; **pending is not an extra entitlement state**.

`POST /api/commerce/handoff` uses the current Owner cookie session and exact Origin; send no caller company/actor/plan fields. Success is `{url:<trusted plans URL with fragment handoff>}`. It is navigation/session recovery, not payment proof. Central `/v1/handoff/exchange` consumes the existing one-time purpose-bound fragment via the established billing flow; keep it out of logs/storage. Full established central authentication contract remains in `services/commerce/README.md` and existing central UI helpers.

With the current central commerce bearer, JSON, approved Origin and original `Idempotency-Key`:

| Endpoint | Complete accepted body | Success |
| --- | --- | --- |
| `POST /v1/checkout` | `{}` or `{lang:'en'|'es'}` | `{url}` |
| `POST /v1/portal` | `{}` or `{lang:'en'|'es'}` | `{url}` |
| `POST /v1/plan-change` | `{plan:'small'|'team', lang?:'en'|'es'}` | `{url,plan,effective:'after_payment'|'period_end'}` |
| `GET /v1/status` | No body/selectors | CommerceStatus plus business/setup/application/Owner facts, `billingAction:'checkout'|'portal'|null`, `subscriptionStatus` |

The status endpoint chooses Checkout/Portal from the server subscription state, not simply from paid access. A canceled-but-paid-through terminal subscription may use verified replacement Checkout with its existing paid anchor preserved. An unknown provider read authorizes neither replacement nor a charge. Upgrades grant added capacity only after matching confirmed positive paid coverage. Downgrades take effect at renewal (`period_end`); an over-limit renewed lower plan restricts operations while preserving recovery/export, and never deletes staff. Failed initial payment grants no grace; failed renewal uses the original bounded seven-day grace without restarting on duplicate events. Cancellation retains paid-through coverage. Browser returns, a successful URL response, `active` provider status alone or zero/credit invoices do not prove payment.

Signed webhooks verify raw body, timestamp, mode and merchant, then atomically deduplicate the receipt/job. Duplicates/retries/lost acknowledgments yield one durable effect. Workers reconcile current provider invoice/subscription facts rather than applying arrival order; wrong customer/company/subscription cannot extend another company's coverage. Refund/dispute/risk events remain operator review, not automatic refunds/deletion. Controlled fixtures test these paths; no real provider was contacted here.

Errors are `{error:{code,operationState?:'refused'}}`. Relevant bounded codes/statuses: `invalid_billing_input`, `invalid_plan`, `invalid_language`, `idempotency_key_required` (400); `unauthorized` (401), `owner_required`/`origin_denied` (403); `setup_pending`, `subscription_required`, `plan_already_selected`, `plan_employee_limit`, `assisted_quote_required`, `payment_required`, `subscription_change_pending`, `idempotency_conflict`, `billing_binding_changed` (409); disabled/misconfigured provider or unknown transport uses existing 503 codes such as `billing_unavailable`, `plan_changes_unavailable`, `plan_change_policy_unavailable`, `temporarily_unavailable`.

Uncertain billing preserves the same action, key, accepted language/plan, actor and immutable installation plus prepared provider parameters. `billing_operation_pending` / `checkout_pending` means retry the original operation. `billing_operation_reconciliation_required` / `legacy_operation_reconciliation_required` means retain its custody and seek the existing reconciliation/support path. No replacement key may bypass unresolved work. `idempotency_conflict` means changed actor/body/action on that key, not permission to retry altered data. `billing_operation_expired` / `checkout_expired` requires authoritative status/reconciliation; deadlines never extend. A known `operationState:'refused'` is distinct from an unknown issued provider mutation. Original parameter creation/retry is bounded by its existing one-hour lifetime (Checkout URLs also keep original 45-minute expiry); never clear receipts or assume provider key retention authorizes a later create.

## Claude decisions and remaining acceptance

Claude must choose the upload/matching/review/correction presentation, explicit per-break treatment controls, mapping/precision refusal copy, batch coverage/progress/recovery presentation and supported guidance for one oversized employee. Preserve existing brand, authority retirement and keyboard/mobile behavior. These are UI choices within settled backend rules, not permission to invent legal classifications, rates, rounding, employee matching, payment success or larger-team support.

The new batching helper is supplied for Claude and **is not yet wired into presentation**. Existing server protections have local SQL/API evidence; a complete upload→review→export→manifest→correction UI journey still requires Claude implementation and joined acceptance by the existing integration/QA owners. Hosted callbacks, actual provider import/payment, delivery, physical devices and operating-release qualification remain with their existing owners. Do not close those Jira/UI/provider records from this handoff.
