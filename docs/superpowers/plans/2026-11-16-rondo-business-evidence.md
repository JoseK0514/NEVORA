# Rondo Business Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Preserve the established Native method: Codex implements inline, one fresh final reviewer; Claude owns B2 UI.

**Goal:** Add Owner-reviewed financial/sales imports and source-fenced read-only Rondo tools with exact calculations, without activating providers or external actions.

**Architecture:** Client-safe contracts and pure calculations feed an immutable company source/version store. An explicit primary-source coverage map prevents duplicate company totals. Owner APIs and read-only model tools share current authority, full-scope admission, version/context fences and recoverable operations.

**Tech Stack:** Existing TypeScript/Next, PostgreSQL/SqlExecutor, Vitest5, owned PostgreSQL/browser harnesses and existing Temporal helper; no new dependency or service.

**Spec:** `docs/superpowers/specs/2026-11-16-rondo-business-evidence-design.md` (Jose approved local implementation on November16; builder questions resolved in its final section).

## Global Constraints

- Codex backend/hosting; Claude UI; selected style **B2**. No root screen implementation.
- Preserve existing detached source b051c12 and prior182 evidence files. Current development base22a9d598, UIb92e1bbc and backend e7f00843 are historical verified inputs, not proof of hosted acceptance.
- Fetch/reconcile Development and active Phase5 release ownership before execution. Do not move its branch, dispatch CI, deploy or create a competing shared candidate. Detached local development-lineage work only; preserve all worktrees.
-512KiB actual decoded input;1000 rows/version;20 active sources;20 uncommitted versions;200 retained versions;100,000 retained rows/workspace.
-5-minute review receipts;15-second private read leases;20-second request deadlines;1.5-second lock waits. No silent truncation, automatic deletion or paid quota increase.
- Both import availability and model retrieval are separate default-off flags below parent Owner-adviser admission. No key needed for imports.
- Model budgets remain8 calls/6 rounds and existing source slots/serialization/argument limits. Insufficient exact citation or data capacity returns an unavailable metric.
- Published versions are immutable; exact-window correction retains other nonoverlapping windows. Primary/corroborating map is explicitly reviewed; shared cash is not allocated to a location.
- Money is exact integer strings/BigInt/PostgreSQL numeric. No FX, profit, wage/tax calculation or guaranteed collection. Structurally valid reconciliation discrepancies remain reportable; their cash scenarios remain unavailable.
- No actual provider adapter/account, credentials, customer access, background refresh, messages, payments, orders, new spend, push or deployment. Actual-model50-case scores stay null until separately qualified.

## Review Focus

1. A source correcting January must leave February queryable; a duplicate POS/accounting feed must never double company totals (Tasks3/4/5).
2. A boundary at local midnight, DST change or freshness expiry must not turn historical/incomplete records into current cash or full-period sales (Tasks1/2/3/7).
3. Maximum UTF-8/CSV/quota input, a cancelled body or contended lock must fail boundedly without partial publication or lost operation custody (Tasks1/4/5/6).
4. Lost replies, concurrent publish/withdraw/delete and another Owner/session must not inherit approval or repeat an import (Tasks4/5/6).
5. An unselected business tool, map/location change or mixed weekly/business investigation must still fence settlement/replay and preserve ordinary history (Task7).

## Shared decisions and wire interfaces

These are Codex implementation choices within the approved design. Keep them in one client-safe `business/contracts.ts`; do not redefine them in consumers.

- `BusinessDomain = 'FINANCE'|'SALES'`; initial admitted currencies USD/EUR, scale2 only. No exchange rate. Row amounts are canonical signed decimal integer strings with at most18 digits of magnitude; reject negative zero, leading zeros, fractions, exponents and JSON numbers. Totals use signed integer strings up to30 digits.
- `BusinessWindow = {fromAt:string;toAt:string}` is half-open, canonical UTC millisecond ISO, fromAt<toAt. Version sourceAsOf cannot be future relative to the trusted DB observation; COMPLETE requires toAt<=sourceAsOf. Event rows belong to the reporting window; balance anchors may sit at either endpoint. Scenario due dates may extend beyond the window, but are recorded obligations known at sourceAsOf, never a complete prediction of future business. CURRENT freshness measures the relevant window/anchor observation, not upload time: correcting an old January report today cannot make January cash current.
- `BusinessSourceSpec = {sourceId:string|null;expectedRevision:number;name:string;domain:BusinessDomain;namespace:string;currency:'USD'|'EUR';scale:2;maxAgeMinutes:number}`. New sources are server-ID-created atomically by stage; domain/namespace/currency/scale are immutable thereafter. Label<=240 UTF-8 bytes, opaque namespace/record/account/order references<=128 bytes; no URL, credentials or personal customer fields. maxAgeMinutes is explicitly selected15..10080, default1440; freshness never makes a historical window a different time period.
- `BusinessRecord` has recordId/revision (opaque bounded strings) and one discriminated body. Finance: BALANCE(accountRef,at,amountMinor); CASH(accountRef,occurredAt,postedAt|null,state POSTED/PENDING/REVERSED,deltaMinor,reconciliationRef|null); OBLIGATION/RECEIVABLE(accountRef,recordedAt,dueDate,amountMinor,state OPEN/SETTLED/CANCELLED,confirmation SOURCE_CONFIRMED/OWNER_REPORTED/UNCONFIRMED). REVERSED means void/no posted effect; a posted cash offset is POSTED with its own signed delta. Sales: SALE/REFUND(orderRef,locationId,at,merchandiseMinor,discountMinor,taxMinor,collectedMinor), CANCELLATION(orderRef,locationId,at;no money fields), FEE(orderRef,locationId,at,feeMinor). All sales components are nonnegative; collected=merchandise-discount+tax, discount<=merchandise. REFUND contributes negative components; FEE never reduces merchandise revenue.
- `BusinessVersionInput = {source:BusinessSourceSpec;window:BusinessWindow;sourceAsOf:string;completeness:'COMPLETE'|'PARTIAL';records:BusinessRecord[]}`. Staging JSON or explicitly mapped CSV yields the identical canonical input/digest. Unmapped/unknown fields, row-identity duplicates, inconsistent row equations and unmapped locations are admission errors. A structurally valid PARTIAL snapshot can stage but not publish as complete evidence.
- `BusinessCoverageMap` has expectedRevision and up to400 cells selecting sourceId, domain/metric family, currency, window and location/account set. Its declared finance perimeter contains<=100 accounts with COMPANY_SHARED or EXCLUSIVE_LOCATION(locationId) ownership. PRIMARY and CORROBORATING roles are explicit. Same primary economic scope/window cannot overlap. ALL sales uses the current active location set; fail explicit INPUT_LIMIT above200 rather than truncate. SELECTED uses1..20 unique current IDs, still within the model's existing argument-size limit.
- `BusinessQuery = {window:BusinessWindow;selection:{kind:'PRIMARY_PERIMETER'}|{kind:'SOURCE';sourceId:string};locationScope:{kind:'ALL'}|{kind:'SELECTED';locationIds:string[]};temporalUse:'CURRENT'|'HISTORICAL'}`. `BusinessFinanceQuery = BusinessQuery & {scenario:{anchorRecordId:string;throughDate:string;obligationRecordIds:string[];receivableRecordIds:string[]}|null}`, total selected IDs<=100. Current means the requested observation/coverage must pass the published freshness policy; every reported amount still carries its actual as-of time. No date is silently extended to now.
- `BusinessReadResult` is a client-safe payload carrying state ready/unavailable, reason, complete-scope flag, origin/completeness/as-of qualifiers, separate per-currency exact metrics, findings/exclusions and source/window/version citations. Its server-only inspection/fence is a separate type and never part of this public DTO. SOURCE selection is always a source subtotal. Missing anchor/window/source/map/shared-account allocation returns null unavailable metrics, never zeros or a chosen subset labeled company total.
- `BusinessReceipt = {operationId,kind,sourceId|null,versionId|null,mapVersionId|null,revision,savedAt}` contains no imported values. `BusinessApiResult` supplies state, nullable catalog/full version/map/receipt, readReceiptId,authority,observedAt,validForMs. Public results never contain private model inspection references.
- Strict command names: stage_source_version,read_source_version,publish_source_version,discard_source_version,discard_coverage_map,stage_coverage_map,read_coverage_map,publish_coverage_map,withdraw_source,delete_source,check_source_operation,query_finance,query_sales. Every command has requestId(UUIDv4); writers bind expected revision/digest, publish requires full-read handle+acknowledged:true. Explicit discard erases only an unpublished draft with acknowledgement; it never deletes published history or runs automatically. Source stage format is JSON or CSV with explicit mapping, not inferred columns. Optional GET returns only the bounded catalog and current administration-scope digests for whole-source withdrawal/deletion. Owner query operations reuse the read services without needing a model key.
- Server-assigned workspace timezone and OWNER_IMPORT provenance cannot be supplied as trusted client authority. Imported confirmation/completeness remain reported claims. Only a registered server connector can attach connector provenance; still no actual provider is installed by this plan.
- Additional read-safety choices: metadata preflight counts all selected versions/rows/UTF-8 payload bytes before fetching records, rejects a complete materialization above2MiB, and never substitutes a sample. Model projections<=12KiB also fit the existing remaining citation/serialization budgets. Standalone Owner query projections may contain all<=200 exact version citations. Structured inspection payloads/read receipts expire at5minutes or an earlier context/source boundary; no source facts are automatically deleted. Up to1000 live inspections and10000 durable content-free operations/inspection tombstones per workspace; quota-full still permits original-operation recovery. Source/version/row quotas count retained payloads, not erased tombstones, and draft quotas exclude published/discarded/erased versions. These are explicit local pilot limits.

## File ownership

All new domain files live in `src/lib/owner-advisor/business/`: contracts/parse/money/csv (client-safe or pure), finance/sales/scope (pure), store/context/service/http/tools/connector (server-only). Unit/integration files colocate there. Existing model integration stays in the current adviser modules; do not relocate unrelated features.

Schema file proposed `db/migrations/0067_owner_business_evidence.sql`: recheck filename availability and canonical order immediately before creating it; append after0066, never sort numerical prefixes. Current Phase5 and remote sources contain no0067. Any intervening reservation changes the plan's filename and generated manifest deliberately before DDL, without rewriting an applied migration.

## Verification commands

`UNIT = node node_modules/vitest/vitest.mjs run src/lib/owner-advisor/business --maxWorkers=1`

`SQL = env -u DATABASE_URL -u TEST_DATABASE_URL -u FUEL_TEST_DATABASE_URL -u ANTHROPIC_API_KEY -u OPENAI_API_KEY NEVORA_TEST_PG_BIN='/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/integration-evidence/pg-runtime/package/native/bin' node scripts/payroll-postgres.mjs vitest.owner-advisor-integration.config.mts`

Use file filters while developing; retain every failed/passed log under the plan's owned SDD directory. Do not increase existing test timeouts to make a failure pass. All SQL tests use new ownership-marked loopback clusters.

---

### Task 1: Canonical contracts, exact money and explicit CSV mapping

**Files:** Create `business/contracts.ts`, `parse.ts`, `money.ts`, `csv.ts` and corresponding `.test.ts` files.

**Interfaces:** `parseBusinessCommand(unknown):BusinessCommand`; `normalizeBusinessVersion(unknown):BusinessVersionInput`; `parseBusinessCsv(text:string,mapping:BusinessCsvMapping,metadata:Omit<BusinessVersionInput,'records'>):BusinessVersionInput`; `minor(value:unknown,nonnegative?:boolean):bigint`; `moneyTotal(bigint):string`; `businessDigest(unknown):string` in a separate server-only `digest.server.ts`. Client-safe files cannot import crypto/server/DB modules.

- [x] Write tests for every strict command/row/map/query shape, unknown keys, forged authority/UUID, safe integer revisions, unsupported currency/scale, negative zero/large amount, duplicate row IDs and unsupported PII fields. Prove major-decimal CSV10.10 maps to1010 only with explicit DECIMAL_MAJOR mapping; reject excess precision/thousands guessing/formula amounts. Bound quotes/CRLF/embedded newlines, duplicate headers, required columns, malformed UTF-8 upstream,1000/1001 rows and512KiB multi-byte input. Reject repeated/ambiguous local DST conversion instead of guessing; accept only normalized instants in canonical rows.
- [x] Run UNIT filters; observe failures from missing parser/money/CSV behavior.
- [x] Implement strict parsing, canonical immutable normalization and exact conversion. CSV validation retains row/physical-line numbers, executes no formula and returns explicit missing-mapping errors. Cooperative checkpoints bound large normalizations by AbortSignal when invoked server-side; no full rejected payload in error logs.
- [x] Run UNIT, `npm run typecheck`, scoped ESLint and a staged secret scan. Expected all targeted assertions pass; no provider configured.
- [x] Commit the independently usable contracts/conversion helpers with Jose's mapped identity.

### Task 2: Deterministic finance and sales calculations

**Files:** Create `business/finance.ts`, `sales.ts`, `calculations.test.ts` and `src/test/fixtures/rondo-business.ts` (fictional data/oracles only).

**Interfaces:** `calculateFinance(input:AdmittedBusinessScope,scenario:BusinessFinanceQuery['scenario'],signal?:AbortSignal):FinanceMetrics`; `calculateSales(input:AdmittedBusinessScope,signal?:AbortSignal):SalesMetrics`. `AdmittedBusinessScope` from contracts contains only complete selected version records, exact query boundaries and qualifier metadata; calculations cannot widen it or query a database.

- [x] Add independent worked fixtures: opening100000+posted50000-fee1500-refund5000=143500; pending7000 and void/reversed records excluded. Reported143000 yields difference-500 and no cash scenario. Missing anchor gives null balance, not0. Selected20000 obligation and10000 assumed collection yield133500 only from a reconciled143500 anchor, explicitly conditional. Shared-location cash must not be allocated. Sales10000-1000+900=9900; partial refund2000-200+180=1980 gives net merchandise7200,tax720,collections7920;fee300 gives net receipts7620,not profit. Cover cancellations, valid complete zero records, large integers, revised identities, mixed currencies, timestamps at both window endpoints and a DST day.
- [x] Run tests and watch arithmetic/qualifier failures.
- [x] Implement exact per-currency arithmetic, conservation findings and source-as-of qualification. Count excluded rows; no caller-defined trusted amounts, FX or zero substitution. A discrepancy is reportable, not a parser exception or financial clearance.
- [x] Run Task1/2 UNIT plus typecheck/scoped lint. Include maximum input/cancellation tests with a cooperative checkpoint and unchanged20-second API budget.
- [x] Commit calculations and fictional oracle witnesses; these are deterministic tests, not model grades.

### Task 3: Published-window selection and primary reporting perimeter

**Files:** Create `business/scope.ts`, `scope.test.ts`; extend contracts with `AdmittedBusinessScope`, `BusinessCoverageMap` and explicit unavailable reasons.

**Interfaces:** `validateBusinessMap(map:BusinessCoverageMap,catalog:BusinessCatalog):ValidatedBusinessMap`; `selectBusinessScope(query:BusinessQuery,catalog:BusinessCatalog,map:ValidatedBusinessMap,observedAt:string,signal?:AbortSignal):BusinessScopeAdmission`. Result is complete admitted records+all contributing version IDs or an explicit unavailable reason; no truncated metric-ready scope.

- [x] Test January+February and exact January correction, changed-boundary overlaps, a missing middle window, boundary duplicates/revision conflicts, POS+accounting primary overlap, corroborating-only imports, a new active unmapped location, shared account ownership and separate currencies. A SOURCE inspection must stay a source subtotal; Owner-declared finance perimeter must never claim discovery of unknown accounts. Historical freshness expiry cannot pass CURRENT use.
- [x] Run tests RED before selection/perimeter code.
- [x] Implement disjoint-window and primary/corroborating selection, exact complete-scope admission and location/account provenance. Whole-company selection comes from the server-reviewed map, not model-supplied source IDs. Latest obligation/receivable identity is selected once by eligible source observation/revision; conflicting equal identities fail closed. No inferred account allocation or overlapping total.
- [x] Run Tasks1–3 UNIT/typecheck/lint, including200/201 locations,400/401 map cells and expiry at the exact boundary.
- [x] Commit this pure admission layer.

### Task 4: Immutable database custody, revision guards and quotas

**Files:** Create proposed migration0067 and `business/store.server.ts`, `store.integration.ts`; modify `db/migrations/order.ts`, `src/test/integration/local-postgres.ts`, `src/test/migration-order.test.ts`, `src/lib/company-bootstrap/manifest.generated.ts`, `vitest.owner-advisor-integration.config.mts` (add only `business/*.integration.ts`). Use `node scripts/onboarding-manifest.mjs --write` only after intentional DDL.

**Interfaces:** `BusinessStore(advisor:AdvisorStore,env:Record<string,string|undefined>)`; `available(signal)`, `catalog(signal)`, `reserveOperation(command,hash,signal)`, `readOperation(id,signal)`, `readVersion(id,signal)`, `readMap(id,signal)`, `reserveInspection(identity,queryHash,context,signal)`, `completeInspection(identity,result,fence,signal)`, `readInspection(identity,signal)`, `writeGuards():SqlStatement[]`. Persist workspace/Owner/session-bound operations, source definitions, immutable source/map versions, active window pointers, record-identity digests, read receipts, inspection provenance and tombstones. No table name supplied by a caller.

- [x] Write actual owned-SQL tests for Owner/company/session denial; immutable rows/digests; same ID+payload replay versus different payload conflict; same record/revision/different content conflict;20-source/20-draft/200-version/100000-row limits; publishing/discard/erasure frees the appropriate payload/draft capacity without recycling operation identity; receipt recovery after caps; source/map atomicity; exact-window correction retains February; foreign IDs and trigger-induced rollback. Tests deliberately hold contended locks and abort to prove release within1.5s+request deadline. New fixture schema uses the reviewed canonical append order, not test-only hand-applied DDL.
- [x] Run new SQL tests RED and canonical migration/bootstrap units.
- [x] Implement additive schema/guards. Serialize workspace NO KEY UPDATE first, then owner guards and business advisory/state/source rows; no SHARE→UPDATE lock upgrade. Separate catalog changes from published evidence revision so staging a draft does not stale current answers. Publication/map/deletion advance effective evidence revision. Store full payloads only in version/inspection rows; content-free operation identities remain recoverable after erasure. Never refund/reuse a completed operation slot.
- [x] Run SQL plus canonical units/manifest check/typecheck/lint. Verify intentionally changed generated manifest against actual ordered SQL; do not patch expected hashes alone.
- [x] Commit schema/custody and literal migration-order mirror together; no external DB migration.

### Task 5: Owner source/map lifecycle and complete review

**Files:** Create `business/context.server.ts`, `service.server.ts`, `service.integration.ts`; extract generic shared Owner context to `owner-investigation-context.server.ts`, retain `weekly-context.server.ts` compatibility exports and existing sentinel behavior; add context equivalence tests.

**Interfaces:** `businessSourceService(proof:SessionMutationProof,ex:SqlExecutor,env:Record<string,string|undefined>,signal:AbortSignal,value?:unknown):Promise<BusinessApiResult>`; `readBusinessVersion(proof,ex,env,signal,sourceId,versionId):Promise<BusinessVersionView>`; `readBusinessEvidence(advisor,query,env,signal,{origin?,occurrence?,sourceSlots?}):Promise<BusinessReadResult>`; `captureBusinessContext(advisor,origin,env,signal)` and context guards reuse the same admitted memory/profile/notebook/knowledge projection and time boundaries already tested for weekly.

- [x] Add service SQL tests for stage→complete read→acknowledged exact publish; missing/foreign/expired receipt and source revision conflict; original-operation lost-reply retry; two Owners can read shared versions but cannot adopt pending approval; simultaneous publishers/withdraw/delete; PARTIAL versus complete-zero import; publishable reconciliation discrepancy; map revision changes; source/canonical location mutation; feature-off recovery. Deleting a source wipes version and structured inspection payloads/caches, while content-free operations survive; chat/provider prose retention stays separate and explicitly disclosed.
- [x] Observe RED then extract context without changing weekly semantics; old weekly tests must still pass before relying on the shared module.
- [x] Implement all lifecycle commands atomically with five-minute full-read receipts and15-second private leases. Only exact-window replacement is allowed; source deletion retires dependent map/inspection eligibility. Authoritative map changes use stage/read/acknowledged publication, never an unreviewed edit. Errors expose row/field/reason codes, not credentials or raw failed payloads.
- [x] Run all Owner SQL (including old weekly/knowledge), Tasks1–3 UNIT, context equivalence/type/lint. Verify unrelated history and all prior scheduling/publication/notification tables remain unchanged.
- [x] Commit the runnable Owner service separately from HTTP/model integration.

### Task 6: Private HTTP routes, flags and connector adapter boundary

**Files:** Create `business/http.server.ts`, `http.test.ts`, `http.integration.ts`, `connector.server.ts`, `connector.test.ts`; routes `src/app/api/owner/advisor/business/route.ts` and `business/sources/[sourceId]/versions/[versionId]/route.ts`. Modify feature registry/examples/tests, `scripts/onboarding-inventory.check.mjs`, `docs/handoffs/onboarding-entrypoint-inventory.json`, owned app harness flag options/tests; no new Vitest project.

**Interfaces:** `businessHttp(request:Request):Promise<Response>` calls Task5; canonical private header `x-nevora-business-evidence:1`. Flags: `ownerAdvisorBusinessImports=NEVORA_OWNER_ADVISOR_BUSINESS_IMPORTS_ENABLED`, `ownerAdvisorBusinessRetrieval=NEVORA_OWNER_ADVISOR_BUSINESS_RETRIEVAL_ENABLED`. `ReadonlyBusinessConnector` accepts trusted source/account scope and an approved secret-reference handle server-side and returns typed version pages; no arbitrary URL, credential value or public network command. Synthetic contract fixtures only; no real registered provider.

- [x] Write strict-origin/header/auth/body/UTF-8/input-size/abort/disabled/missing-schema tests. Use actual route+SQL to test512KiB and1001 rows, partial-stream cancellation, incomplete connector pagination, changed page revision, duplicate page rows and unknown account scopes. Exact-version navigation is inert plain text/no-store/nosniff; current company Owner required and deleted source denied. Removing either new inventory entry must fail the boundary gate.
- [x] Observe RED; implement bounded adapter and routes. One20-second deadline starts before authentication/body read. GET catalog and version reads stay bounded; new writes require import flag, model reads require retrieval flag, and minimal operation recovery remains available under parent/current Owner authority when off. Partial connector snapshots are never publishable; configuration is not authentication or refresh success.
- [x] Run HTTP units/SQL and owned-harness environment tests. Pin all flag combinations: imports enables maintenance; retrieval enables model reads; either flag permits Owner queries and eligible published citation reads, while drafts/historical administration require imports. Both off permit only minimal recovery under the parent/current Owner gate. Ensure ambient keys/providers cannot leak into test runtimes; no migrations from build/start scripts.
- [x] Run inventory11+new negative tests, release-engineering/type/lint/secret scan. Expected every existing rule remains enabled and zero new runtime entrypoints unclassified.
- [x] Commit transport/flags/contracts; record no real adapter or credential activation.

### Task 7: Read-only model tools, typed metrics and complete answer fencing

**Files:** Create `business/tools.server.ts`, `business/fence.server.ts`, `business/model.integration.ts`, `business/tool-contracts.test.ts`; modify adviser `contracts.ts`, `tools.server.ts`, `loop.server.ts`, `workflow-contracts.ts`, `decision.ts`, `decision-metrics.ts`, `service.server.ts` and generic settlement commentary in `store.server.ts`. Add `investigation-fence.server.ts` for fixed-order composition; keep legacy wire forms when both new flags are off.

**Interfaces:** Model tools `business_finance` and `business_sales` take Task1 `BusinessFinanceQuery`/`BusinessQuery`, never writer commands. `BusinessToolRuntime` carries admitted original request/Owner context; trusted tool occurrence comes from the loop even when weekly is off. `businessInspectionId({workspaceId,ownerId,requestId,occurrence,tool}):string` derives a UUIDv4-shaped identity from a domain-prefixed canonical SHA-256 tuple. `readBusinessTool(advisor,call,runtime,{sourceSlots,occurrence},signal):Promise<ToolResult>` returns bounded typed business evidence and exact private citations. `prepareBusinessInvestigationFence(...):Promise<InvestigationFence>` prepares readonly assertions for every observed query. `InvestigationFence` supplies before/after statements, earliest expiry and checkFlags; composition is business then weekly with the workspace mutation-strength lock first.

- [x] Test missing/mismatched/forged typed financial references; exact currency/unit/window/scope binding; single-day decision cannot claim month totals; no caller amount or current-cash proof from an unreconciled/shared source. Exhaust normal tool/source/serialization budgets without raising them. Unselected observations still fence settlement. Mutate source, active location set, coverage map, role, session, published guidance or memory applicability during provider I/O and final SQL; every stale answer/replay must fail closed with no publication or history append.
- [x] Observe RED with scripted fictional providers and real SQL; deny all unowned external fetches.
- [x] Integrate feature-on tool/schema extensions. Bind stored inspection identity to workspace,Owner,original investigation and trusted occurrence; bounded provider retry cannot choose a new identity or duplicate quota. All contributing source/window versions, reviewed perimeter and current location fingerprint participate in before/after settlement and replay guards. Do not re-import for validation. Source-derived turns stay out of reusable history via the existing generic settlement mechanism; preserve prior ordinary history exactly. Strip private inspection references from all public responses.
- [x] Run old Owner tools/loop/weekly/knowledge units plus full Owner SQL. Include a mixed weekly+finance+sales investigation, flag-off cached answer, source deletion, forged persisted refs, context-day transition and trigger-induced final rollback. Actual model score remains unrun.
- [x] Commit integration; hand Claude exact additive public response/citation parser contracts before UI changes. New private version href is `/api/owner/advisor/business/sources/<uuid>/versions/<uuid>` with no query/fragment/external host.

### Task 8: Real API evidence, final review and B2 handoff

**Files:** Create `docs/handoffs/2026-11-16-rondo-business-evidence-backend.md`, `...-ui-contract.md`, owned raw/hash evidence and `src/test/integration/owner-advisor-business-browser.integration.ts`. Update browser config, source matrix/program progress and source-based guides only for actual implemented behavior. Preserve old weekly evidence.

- [x] Test actual authenticated Next routes in Chromium/WebKit from the existing AI manager page: stage JSON/explicit CSV, full read, exact publication, map publication, cross-source query, lost committed reply with same-ID recovery, withdraw/delete/revocation and both flags off. No new screen is claimed; Claude's B2 UI implementation is separate. Bind screenshots/reports/source hashes and prove zero payments/orders/notifications/publications outside these evidence records.
- [x] Run affected units/full Owner SQL/canonical bootstrap/type/lint/safe build and full unit/release-engineering suites. Rebuild/qualify all six guide PDFs legitimately from the final committed source; retain failed logs and existing integration-only skips separately. Use lossless file/sha256 arrays for copied source manifests and preserve original raw reports.
- [x] Dispatch one fresh final code reviewer per Native execution on the most capable available model, exact base/head/diff and failure classes. Fix Important/Critical findings in one regression-led pass and rerun affected gates; do not repeatedly dispatch per-task reviewers or claim independent release certification.
- [x] Deliver exact B2 UI/API contract to Claude, including default-off gates, complete review, irreversible-source deletion disclosure, operation recovery, publication/perimeter states and strict private citation URLs. Source/backend changes remain Codex-owned. Reconcile fresh Development/Phase5 ownership before any future assembly or push; no shared push/deployment from this local approval.
- [x] Commit honest evidence and update50-case map only where actual readers now exist. Keep dedicated50-case fixtures/oracles and all independent scores explicitly prepared/unprepared/unrun as supported; unit counts or scripted answers do not become10/10 grades. Complete the local plan ledger only after its evidence gates pass.

## Self-review

One dependency chain is intentional: finance and sales share source/version custody,
perimeter admission and settlement; they are separate pure files, not competing
release projects. Every spec section maps to a task: parsing/CSV1; calculations2;
perimeter/windows3; schema/quotas4; lifecycle/recovery/privacy5; HTTP/flags/connector6;
model/freshness/metrics7; QA/UI handoff/release qualification8. All five review-focus
conditions have concrete test owners. Interfaces above have one defining task;
unchanged weekly aliases and legacy feature-off schemas remain compatibility gates.
The approved scope excludes real provider activation and B2 screen implementation.
