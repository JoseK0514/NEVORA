# Clocker iPad Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax. Do not delegate unless Jose authorizes it or applicable instructions require it.

**Goal:** Integrate the reviewed Clocker interface with Nevora's real services for shared iPads, with Owner-only administration and truthful recovery.

**Architecture:** Retain the existing Next routes, device/PIN cookies, guarded punch service and ledger. Port scoped presentation and locale behavior; add narrowly bounded durable recovery, review-request and PIN-operation contracts where the prototype cannot supply real evidence. Keep the prototype frozen as a reference.

**Tech Stack:** Existing Next16.4.2, React19.3, TypeScript, CSS modules, regular Phosphor icons, PostgreSQL transaction executor, Vitest and owned Chromium/WebKit QA. No new UI framework, paid service or metered generation. The reference photo decoder dependency must be explicitly verified/declared before adoption; its old comment is not installation evidence.

**Spec:** [photo-policy.md](../../product/clocker-ipad/photo-policy.md), [integration-map.md](../../product/clocker-ipad/integration-map.md), [DESIGN.md](../../product/clocker-ipad/DESIGN.md), [coverage.md](../../product/clocker-ipad/coverage.md), and [ipad-acceptance.md](../../product/clocker-ipad/ipad-acceptance.md). The map distinguishes observed source behavior from this proposed implementation. Base inspected: `dfdcefa0edc9d02bad5edf79b2b5a9587b194eb2`.

## Global constraints

- Clocker only. Preserve other Owner/Employee/access/schedule/payroll work and current Company authorization controls.
- Owner-only administration at every entry/read/write/final awaited guard. Tablet employees receive only their PIN-derived authority.
- Preserve frozen visual roles, defaults `#0b6e69` / `#f4f7f6`, system type, official wordmark, regular Phosphor,48px actions and64px keypad keys. Honor explicit company branding locally; no global style reset.
- Hard30-second verified limit bounded by server expiry; warning in last10 seconds;20-second partial-PIN clearing; receipt return within8 seconds or earlier privacy expiry.
- Each company Owner chooses Off/On and independent photo events; Off/unselected actions never open the camera. No Manager/employee policy edits or cross-company photo access. Capture readiness is separate from a saved preference.
- Original command ID/payload, expected versions, strict receipt parsing, bounded transport and no-store responses stay authoritative. Missing receipt never alone means failed/cancelled.
- No real customer data, secrets, SMS/email, production enablement, main merge or production deployment. Physical-iPad acceptance is a separate recorded gate.
- New schema is additive. Existing time/receipt/audit history remains intact. Proposed0038/0039 and photo-adoption migration filenames must be rechecked against freshly fetched development before allocation; update this plan if another branch reserves them.

## Review focus

1. PIN reset/re-PIN/replacement while a command is unresolved: never replay an obsolete command; preserve reference and check canonical receipt first. T2/T4/T5/T7.
2. iPad tab closure, quota failure, two tabs or storage eviction: save/read back atomically before sending; never lose a conflicting original or claim offline success. T2/T9.
3. Owner session expiry/downgrade during slow work: no private metadata/ledger disclosure or write after authority is lost. T1/T6/T7.
4. Lost PIN-save/review-request response: exact operation evidence, idempotent handoff and truthful unknown; no version-based guess or duplicate mutation. T6/T7.
5. Photo policy changes, denied camera, Spanish/enlarged UI and backgrounding: no capture under stale policy, no leaked preview and no duplicate/lost punch when photo fails; non-photo layout remains reachable. T3/T4/T5/T8/T9.

---

### Task 1: T0 — Establish the isolated implementation base and baseline

**Files:** existing repository `AGENTS.md`, `package.json`, `scripts/development-source-inventory.mjs`, `docs/handoffs/2026-10-21-development-assembly-sources.json`; this plan and pinned inventory.

**Interfaces:** consumes freshly fetched `origin/development`, existing working agreements and approved prototype SHA; produces a clean isolated implementation worktree and baseline evidence tied to its commit.

- [ ] Fetch origin, inspect task attachments/worktrees and preserve active work. Create/reuse an isolated worktree at the current remote development head; do not implement in the detached inspection checkout or stale local `development`.
- [ ] Reconcile the recorded source-inventory failures with the integration owner before any assembly. Rerun `npm run check:development-sources`; record real result. Do not auto-merge or delete unrelated branches to obtain green.
- [ ] Inspect current scripts/test runner and verify an existing local PostgreSQL binary directory. Use the owned runner, no application credentials. Its guard rejects `DATABASE_URL`; never feed a hosted URL or destructive production teardown flag.
- [ ] Run baseline compiler and focused existing Clocker unit/owned tests; record failures before edits. Include current company-access PIN/recovery tests, since their allowed-manager policy intentionally changes in T1.
- [ ] Add implementation evidence/this plan to the worktree's scoped handoff location; record actual branch/base and one commit per independently verified task. No push/merge/deploy implied.

**Gate:** baseline evidence exists; latest source is pinned. A non-green global source inventory blocks assembly, not read-only planning or isolated UI development.

### Task 2: T1 — Enforce Owner-only Clocker administration end to end

**Modify:** `src/lib/clocker/pin-authority.server.ts`, `src/lib/clocker/recovery-review.server.ts`, `src/app/app/employees/[employeeId]/clocker-pin/{page.tsx,actions.ts}`, `src/app/app/clocker-recovery/page.tsx`, `src/app/api/manager/clocker-recovery/route.ts`, Clocker entry points in `src/lib/navigation.ts`, `src/components/{employee-directory,mobile-home-overview,manager-dashboard}.tsx`, `src/app/app/employees/{page.tsx,[employeeId]/page.tsx}`.

**Create:** `vitest.clocker-owner-policy-integration.config.mts` selecting the named Owner-policy and Company access regressions, retaining existing aliases/timeouts/serial execution.

**Tests:** existing `src/test/integration/company-access-{pin-management,recovery-calendar}.integration.ts`, `clocker-manager-scope.integration.ts`, `clocker-recovery-review.integration.ts`, PIN action tests, navigation/component tests; add `src/test/integration/clocker-owner-policy.integration.ts` and `src/lib/clocker/owner-policy.test.ts` if a shared presentation helper is needed.

**Interfaces:** retain `ClockerOwnerProof`, `SessionMutationProof`, `pinManagementAccess`, `pinActorAssertion`, `readClockerRecoveryReview`; current Owner checks supplement existing Company/session/workspace guards. Presentation helper, if used: `canManageClocker(role: UserRole): boolean` returns true only for OWNER and never substitutes for server checks.

- [ ] Write failing tests for direct MANAGER/EMPLOYEE/LEAD page/action/service access, forged body role/employee, cross-workspace requests, and Owner downgrade/expiry after a lock/read wait. Assert no PIN/audit mutation or private result after denial.
- [ ] Run the focused tests and confirm the new Owner-only expectations fail on the existing manager-admitting code.
- [ ] Tighten role checks and late SQL assertions locally to OWNER. Keep existing guard/recheck ordering, strict input and origin validation. Leave global manager role constants and unrelated account recovery/Timecards permissions intact.
- [ ] Hide only Clocker PIN/recovery entries for non-owners. Keep Team, account recovery and other authorized tools. Split the directory's combined recovery prop if necessary so hiding Clocker does not remove account recovery.
- [ ] Rerun the focused policy/navigation suite and owned Clocker/Company access integration. Update tests whose intentional manager-allow expectation contradicts Jose's explicit Owner-only policy; preserve their race and revocation assertions. Commit only this policy slice.

### Task 3: T2 — Persist exact recovery records across iPad tab closure

**Create:** `src/lib/clocker/recovery-journal.ts`, `src/lib/clocker/recovery-journal.test.ts` (pure record/migration checks), `src/lib/clocker/recovery-journal.browser.ts` (IndexedDB adapter).
**Modify:** `src/lib/clocker/punch-client.ts` only to expose/reuse strict record parsing without loosening it; `src/components/clocker-punch-panel.tsx`; owned browser checks.

**Interfaces (proposed):** `openClockerJournal(): Promise<ClockerJournal>`; journal methods `read(locationKey,subject): Promise<PendingPunch|null>`, `saveExact(locationKey,pending): Promise<void>`, `resolveExact(locationKey,pending,resolution: 'recorded'|'reviewed-context'): Promise<void>`, `references(locationKey): Promise<{commandId:string|null;action:string|null}[]>`, `close(): void`. Retain existing `PendingPunch`/`PunchCommand` shapes. Historical reviewed references are non-authorizing evidence, not replayable commands.

- [ ] Add browser failures for close/reopen, two competing same-subject saves, different subjects, corrupted legacy bytes, blocked/quota storage, and resolution of a changed record. Assert no execute request before exact transactional save/readback.
- [ ] Implement an IndexedDB transaction with one pending slot per location/opaque subject; repeated identical saves succeed, different unresolved payloads refuse overwrite. Do not store PINs, cookies, names, full views or authorization secrets. Reject malformed records using the existing parser.
- [ ] Copy v1/v2 session records transactionally, verify exact readback, then retire only the exact migrated bytes. Preserve corrupt/conflicting legacy data for assistance. Do not bulk-clear storage on logout or re-enrollment.
- [ ] Keep old-credential subject records as reference-only for Owner review; never attach them to a new subject by employee name or location. Persist resolution history only after validated receipt or explicit proven obsolete-context review.
- [ ] Run pure parser/migration tests and owned Chromium/WebKit journal scenarios; verify a double-click/two-tab race cannot allocate two replacements or overwrite an unresolved reference. Commit the journal slice.

### Task 4: T3 — Integrate the visual foundation, setup and locale contract

**Modify:** `src/app/clocker/[location]/page.tsx`, `src/components/clocker-{shell,setup,icon,language}.tsx`, their scoped CSS modules and `src/components/clocker-language.test.tsx`.
**Create:** `src/components/clocker-v2.module.css`, `src/components/clocker-copy.ts` and copy tests; use a small Clocker-local presentation context only if it removes repeated props.

**Interfaces:** preserve current exported component props and append optional presentation/locale configuration. `ClockerLocale = 'en'|'es'`; `clockerText(locale,key,params?)` resolves complete visible and accessible text. Proposed server UI switch `NEVORA_CLOCKER_UI_V2==='true'` affects presentation only; default false. Keep punch-enablement flag independent.

- [ ] Add failing render/browser assertions for reviewed normal/stacked layout, full Spanish setup/error/accessibility labels, no glossary, scoped default/custom-brand rendering and feature-disabled state.
- [ ] Port the approved shell/task geometry and regular icons into CSS modules. Use the frozen component roles; no standalone HTML/store, sample clock or sample employees enter the app. Keep actual timezone, dynamic active location, official wordmark and company logo.
- [ ] Use prototype defaults for the Clocker default brand; preserve explicit non-default company overrides with existing `isDefaultBrand`/`clockerBrandStyle`. Do not edit shared portal palettes/fonts or change unrelated Signature surfaces.
- [ ] Preserve prepare/redeem/status and confirmed portal-session revocation; success waits for cookie readback. Map real unavailable/expired/cookie failures to truthful localized text. Locale selection is a language choice, not added authority; storage-blocked locale falls back in memory.
- [ ] Run compiler, locale/render tests and owned setup journeys in Chromium/WebKit. Confirm V2-off retains prior presentation and V2-on uses the approved reference. Commit this presentation slice.

### Task 5: T4 — Add secure continuation and partial-PIN privacy

**Modify:** `src/components/clocker-pin-gate.tsx`, `clocker-pin.module.css`; add `src/components/clocker-privacy.ts` with pure deadline/resume helpers and tests. Extend punch-panel props only for handoff of opaque subject/task mode.

**Interfaces:** `verifiedDeadline(confirmedAt:number,expiresAt:string): number = min(confirmedAt+30000, parsedServerExpiry)`; held unsent mode contains only opaque subject, mode and required current-state binding. Existing clear queue, epoch, server clear/readback and `onDone` remain authoritative.

- [ ] Add failing20-second partial-input, final10-second warning, hard-deadline, delayed-clear/verify response, different-person continuation and background/pageshow tests. Assert old async results cannot restore identity or enable a punch.
- [ ] Implement warning/Continue securely without extending authority. Clear DOM/identity first; await protected server clearing before re-enabling PIN. Any failed clear blocks further use with an actionable status.
- [ ] After fresh PIN and validated current state, resume only the same subject's still-valid unsent break/clock-out mode. A changed entry/break/type/context returns to fresh status or explicit recovery; never restore a command or PIN. Different actor always starts fresh.
- [ ] Preserve Escape, pagehide, persisted pageshow and document-visibility clearing; use absolute timestamps on resume rather than assuming background timers fired. Clear partial digits after20 idle seconds with focus retained.
- [ ] Run deadline/helper tests, owned actual transport privacy tests and fake-clock browser assertions; reserve real sleep/lock/tab-switch checks for T9. Commit privacy changes.

### Task 6: T5 — Connect reviewed action/recovery screens to the existing punch engine

**Modify:** `src/components/clocker-punch-panel.tsx`, `clocker-punch.module.css`, `src/lib/clocker/punch-client.test.ts`; create `src/components/clocker-recovery.tsx` if rendering extraction is needed. Preserve exported panel entry.

**Interfaces:** existing `ClockView`, `makePunchCommand`, `postPunch`, `parseReceiptReply`, `canRetirePendingPunch` plus T2 journal. Add explicit `review-current` view mode; no prototype outcome enum becomes server authority.

- [ ] Add failing state/action/receipt checks, on-break cancellation, translated unknown/stale/auth/storage cases, same-UUID retry, and PIN-reset/replacement combined-context regressions. Include real lock-barrier tests proving a late old command cannot commit before any retirement is offered.
- [ ] Port action hierarchy, break selection, confirmation and receipts. Use server `allowedActions`, configured break snapshots, `breaksOff`, actual `performedAt` and workspace timezone. Use Cancel clock-out or Stay on break accurately; remove competing success privacy copy.
- [ ] Keep exact save-before-send and original command. Never replay under a new `verificationId`, allocate a replacement on timeout, treat a200 malformed payload as success, or infer failure from absent receipt.
- [ ] Read fresh state then receipt as current protocol requires. Recorded receipt wins. Only if existing guarded context/state makes a later original commit impossible, offer explicit Review current status; retain its reference in T2 history after confirmation. Otherwise remain unknown or offer exact safe retry under the original valid context.
- [ ] Add compact Owner handoff/return-to-PIN without administration navigation. Preserve another employee's independent journal slot. Run unit, inherited-punch/transport and owned UI tests for send/check/retry/expiry/duplicate submit; commit.

### Task 7: T6 — Integrate Owner devices, break settings and truthful PIN operations

**Modify:** existing `clocker-device-manager.tsx`, `clocker-break-types.tsx`, `clocker-pin-form.tsx`, Owner settings pages/actions, `src/lib/clocker/{pins,pin-authority}.server.ts`, employee profile PIN row. Create `src/components/clocker-owner-nav.tsx` and scoped Owner CSS; new Owner PIN-index route `src/app/app/settings/clocker/pins/page.tsx`.
**Create (proposed, recheck numbering at T0):** `db/migrations/0038_clocker_pin_operation_reference.sql`; update `db/migrations/order.ts` and affected owned fixture migration lists. Add `src/lib/clocker/pin-operations.server.ts`, `src/test/integration/clocker-pin-operations.integration.ts`, and metadata-list tests.

**Interfaces:** `listOwnerClockerPinStatuses(proof:ClockerOwnerProof,executor?): Promise<{employeeId:string;firstName:string;lastName:string;active:boolean;configured:boolean;version:number}[]>` (one scoped metadata query using existing employee directory filters/order, never crypto fields). The save action requires an `operationId` UUID. Extend the trusted service input with optional `operationId?:string`; generate a fresh UUID for existing internal callers that omit it. Every new event has a unique operation reference; only the action-originated reference is known to the browser. Keep all existing service argument ordering/types. `readClockerPinOperation(proof,employeeId,operationId,executor?): Promise<{state:'recorded';version:number;currentVersion:number}|{state:'unknown'}>`; protected failure is unavailable/forbidden, not success.

- [ ] Add failures for unset/inactive/unavailable metadata, default hard-coded Set removal, archive-edit preservation, lost PIN-save response, duplicate operation ID rollback, newer PIN version and Owner loss after commit/read waits.
- [ ] Port Owner controls into existing authenticated routes. Devices preserve version/rotation/revoke semantics; break editor preserves actual active state and snapshots. PIN list links to the existing person-specific route; no duplicate credential store or public roster.
- [ ] Add nullable unique operation UUID to append-only PIN events; old rows remain untouched. Each new PIN write and operation event commit atomically. Reused operation IDs cannot cause a second change or be rebound to another person. Never store or return plaintext PINs, hashes or operation fingerprints to the browser.
- [ ] Clear secrets before network submission as current form does. Lost reply retains only operation reference/target/current expected version; Check save status uses exact event evidence. Missing evidence stays unknown; a committed older event plus newer metadata is disclosed as superseded, not “your PIN is active.” No automatic resend. Apply current Owner/Company/workspace guards on final lookup/write.
- [ ] Run device/form/break/PIN tests and owned operation/authorization cases. Verify additive migration on existing audit data and rollback compatibility; commit the Owner slice. No hosted migration.

### Task 8: T7 — Provide the real cross-device Owner review handoff

**Create:** `src/app/api/clocker/[location]/review/route.ts`, `src/lib/clocker/review-requests.server.ts`, `src/test/integration/clocker-review-requests.integration.ts`; proposed additive `db/migrations/0039_clocker_review_requests.sql` and ordered/fixture registration. Add `src/app/api/owner/clocker-recovery/route.ts` only as an Owner-named alias to the protected existing handler.
**Modify:** `clocker-recovery-review.tsx`, Owner review page and employee handoff component; existing recovery service/route tests.

**Interfaces:** `requestClockerReview(identity:ClockerIdentityProof,input:{requestId:string;commandId:string|null},executor?): Promise<{state:'saved';requestId:string}>`; `listClockerReviewRequests(proof:SessionMutationProof,input:{cursor?:string;limit?:number},executor?): Promise<OwnerReviewRequestPage>`. Define `OwnerReviewRequestPage = {requests: {requestId:string;commandId:string|null;requesterId:string;requesterName:string;deviceName:string;locationName:string;requestedAt:string}[];nextCursor:string|null;observedAt:string;validForMs:number}` in the service. Use stable requestedAt/requestId cursor ordering, default page size50/max100, and the existing Company/session freshness protocol (at most15000ms). Request body never chooses employee/device/workspace. It is an assistance request, not evidence that a punch existed or failed.

- [ ] Add failures for wrong/unregistered device, expired identity, forged identity fields, overlong/invalid UUID input, reused request ID/different payload, response loss, Owner downgrade during list/receipt read and a reference whose ledger identity differs from the requester.
- [ ] Persist only the explicit employee-requested handoff, idempotently keyed by requestId and derived scope. Schema carries original command UUID when readable; an unreadable journal can request tablet assistance without fabricating a punch UUID. Do not create a request merely because an error screen was viewed.
- [ ] Owner sees requested-review list and canonical receipt lookup from a separate authenticated context. Keep requester identity distinct from ledger evidence, Owner-only freshness guards and read-only Timecards handoff. Checking cannot replay a punch, clear the employee journal or correct time.
- [ ] Default employee handoff is compact/collapsed and dismissible; copy fallback works even when network request confirmation is unknown. Clearly label review-request versus clock-action references. Dismissal changes presentation only. No real notifications, analytics or remote command controls.
- [ ] Run owned cross-context idempotency/response-loss/role/freshness tests and migration tests. Confirm the legacy manager-named route uses identical Owner-only protection. Commit.

### Task 9: T8 — Add company Owner photo customization and the selected-event capture flow

**Reference-only adoption:** `work/clocker/integration-20261027/photo-reference/`, commit `ecd06408dbc36cace68eebb68c5fcff07c66ecfe`. Read [photo-policy.md](../../product/clocker-ipad/photo-policy.md) before adapting this work; do not merge the branch wholesale.

**Adopt/adapt:** `src/lib/clocker/photo-server/{contracts,validation,settings-types,service,sql-repository,authority.server,runtime.server,decode}.ts`, `src/lib/clocker/photo-client/{camera,settings,session}.ts`, `src/components/clocker-photo/{photo-settings,notice-settings,photo-notice,punch-photo-flow,photo-review}.tsx`, existing photo route/settings files from that branch. Include required direct helper imports/tests from the branch after tracing dependencies; never fill a missing provider with an in-memory success fallback.
**Modify:** `src/components/clocker-punch-panel.tsx`, Owner Clocker navigation and shared scoped styles/copy; existing owned browser runner. Port existing camera/notice/review components to the agreed foundation rather than retaining the branch's separate visual world.
**Create:** focused `src/test/integration/clocker-photo-owner-policy.integration.ts`, `clocker-photo-command-link.integration.ts` and `clocker-photo-lifecycle.integration.ts`; add photo cases to `scripts/clocker-ipad-ui-qa.mjs`. Adopt private SQL from `db/clocker-photo/storage.sql` through the repository's current migration order (candidate `db/migrations/0040_clocker_photo_policy_evidence.sql`, recheck allocation at T0). Update only required fixtures/package/lock entries after verifying actual dependencies and current schema.

**Interfaces:** reuse `PhotoPolicy` / `PhotoPolicyUpdate` (`expectedVersion,enabled,events,retentionDays,failureBehavior`), the four `PHOTO_ACTIONS`, `ClockerPhotoService.managementPolicy(proof)` / `savePolicy(proof,input)` / `status(proof,input)` / `upload(proof,input,bytes,contentType,snapshot)` and `PunchPhotoSession(context,bindings,environment?)`. `PhotoManagementProof` must be created by the actual current server session/company resolver, not parsed from request JSON. `getClockerPhotoRuntime(): ClockerPhotoRuntime|null` remains unavailable until a real current-proof transport/repository/lifecycle provider is bound. `PhotoLifecycleProvider(scope): Promise<PhotoLifecycleDisclosures|null>` must describe actual cleanup/backups.

- [ ] Write failing tests for Off and all15 nonempty event subsets, enabled-with-no-events rejection, per-company isolation, MANAGER/EMPLOYEE/direct API denial, late Owner downgrade and stale/concurrent policy saves. Assert the correct policy survives readback, including an uncertain save. These are policy/configuration tests, not a real camera test.
- [ ] Integrate company-specific Owner settings: Off by default, visible independent event choices, retention within the supported1–30-day range and assistance contact/instructions. Preserve saved choices. Make initially selected actions visible before On is saved; do not select/activate hidden events. Settings Off and runtime unavailable are different messages. No per-person/location override or strict clock-blocking option is invented.
- [ ] Replace the inherited authority binder with current workspace/session/device/PIN proof handling and all existing before/after-await guards. Adopt private evidence schema only after reconciling current columns/constraints. Verify the decoder's direct dependency/runtime support, encoded dimensions/size, actual decoding and metadata removal. No public image URLs, trusted browser IDs, hosted credentials or paid storage setup.
- [ ] Wire the selected-event flow after PIN verification: effective policy and current notice → explicit front-camera gesture → capture → existing exact original punch → separate photo status. Off or unselected actions use the normal path without `getUserMedia`. Preserve strict JPEG/receipt checks; live image bytes stay out of the durable recovery journal. Stop all camera tracks and discard previews on capture, cancellation, identity change, expiry/backgrounding or updated Off policy.
- [ ] Test policy/notice changes while camera opens, PIN reset/rotation during capture, delayed permission grants, cancellation and a photo linked to a different command/person/company. Revalidate policy/notice at upload. Denied/unavailable capture follows existing `ALLOW_WITH_EXCEPTION` plus assistance; no new strict enforcement policy. Time/photo states remain distinct: uncertain clock result reconciles before any retry; committed time plus missing photo retries the photo only, never a second punch.
- [ ] Implement private Owner review/removal and verified cleanup/backup disclosures using current source contracts. Test shorter retention shortening existing expiry, longer retention never extending old expiry, and no late-upload resurrection of removed/expired evidence. Off prevents new collection without claiming immediate erasure of all retained/backup data. Photo cleanup never edits recorded time. Saving settings does not itself activate collection.
- [ ] Run selected policy/client/service tests and owned PostgreSQL/Chromium/WebKit cases using fictional image fixtures only. Record native decoder, schema, lifecycle and current-company proof adoption evidence. Keep capture unavailable if any required provider/readiness is unverified. Commit this photo integration slice; no real employee-photo collection or production activation is authorized by the test task.

### Task 10: T9 — Verify the integrated iPad experience and prepare a reviewable release candidate

**Modify:** existing owned QA scripts only where needed; add `scripts/clocker-ipad-ui-qa.mjs`, `--ipad-ui` dispatch in `scripts/phase-c-clocker-postgres.mjs`, and relevant focused browser tests. Evidence under the integration worktree's scoped Clocker handoff directory; update this acceptance sheet with actual results.

**Interfaces:** consumes T1–T8 and existing `createOwnedNextApp`/fixtures. The runner starts its own loopback app/DB and cleans up only its owned temporary resources. Tests never connect to an existing customer's app/database.

- [ ] Run compiler/lint and focused unit tests. Run owned Clocker, inherited transport/recovery, PIN operation, review-request and Company access tests. Preserve non-Clocker assertions; report actual failures rather than weakening tests/snapshots.
- [ ] Run owned Chromium/WebKit UI journeys: setup→PIN→clock/break/receipt, unavailable/empty/disabled states,12000ms transport loss, original-ID retry, Owner photo combinations, camera/policy/partial-upload failure, partial PIN/privacy, English/Spanish, keyboard/focus and resize. Verify no unexpected external requests/runtime/hydration errors.
- [ ] Check768×1024,820×1180,1024×768 and1366×1024 viewports plus200% text. At1024×768 the collapsed handoff Continue must remain inside the viewport; the enlarged768×1024 initial PIN task must appear before scrolling. Verify safe areas and no global style leaks.
- [ ] Execute [ipad-acceptance.md](../../product/clocker-ipad/ipad-acceptance.md) on real named devices/versions against an isolated accessible test environment, not `127.0.0.1` on the Mac. Do not expose a local server publicly or weaken HTTPS/origin/security controls to make this test work. Safari tab and Home Screen web-app mode are both required across representative iPad families (Jose’s clarified requirement).
- [ ] Review one bounded normal/exception/enlarged screenshot batch against the frozen prototype; fix material findings together and confirm once. Obtain separate final UI/QA review before release. Record which evidence is actual iPad versus automated WebKit.
- [ ] Confirm development-source reconciliation, additive migration order, safe feature-flag default and rollback. Prepare a development PR/review packet only when implementation is complete. Attach every created PR to the task. No merge to main or production deployment without explicit authorization.

## Commands for execution, not claims of checks already run

From the implementation worktree:

```bash
npm run typecheck
npm run lint
npm test -- src/lib/clocker/punch-client.test.ts src/lib/clocker/punch-command.test.ts src/lib/clocker/break-types.test.ts src/components/clocker-language.test.tsx
```

After T0 verifies `CLOCKER_PG_BIN` points to an existing local PostgreSQL bin directory, use the runner's owned environment:

```bash
env -u DATABASE_URL -u FUEL_TEST_DATABASE_URL NEVORA_TEST_PG_BIN="$CLOCKER_PG_BIN" node scripts/phase-c-clocker-postgres.mjs vitest.clocker-integration.config.mts
env -u DATABASE_URL -u FUEL_TEST_DATABASE_URL NEVORA_TEST_PG_BIN="$CLOCKER_PG_BIN" node scripts/phase-c-clocker-postgres.mjs --ui
env -u DATABASE_URL -u FUEL_TEST_DATABASE_URL NEVORA_TEST_PG_BIN="$CLOCKER_PG_BIN" node scripts/phase-c-clocker-postgres.mjs --pins-ui
env -u DATABASE_URL -u FUEL_TEST_DATABASE_URL NEVORA_TEST_PG_BIN="$CLOCKER_PG_BIN" node scripts/phase-c-clocker-postgres.mjs --breaks-ui
env -u DATABASE_URL -u FUEL_TEST_DATABASE_URL NEVORA_TEST_PG_BIN="$CLOCKER_PG_BIN" node scripts/phase-c-clocker-postgres.mjs --punch-ui
```

The new `.integration.ts` tests match the existing `clocker-*.integration.ts` config include. T9's `--ipad-ui` command is not available until its dispatch/script is implemented. The default runner does not include all `company-access-*` files. Run the same owned wrapper with `vitest.clocker-owner-policy-integration.config.mts` after T1 creates it; do not silently omit those policy regressions. Inspect any future build/start command before running; no build/config/migration command is executed in the mapping phase.

## Rollback and release boundaries

A UI-only switch can return the previous presentation. Photo preferences remain company-specific and Off by default; activation requires verified runtime/notice/lifecycle readiness as well as the Owner choice. Photo rollback stops collection without erasing clock records or falsely claiming retained/backup images are deleted. It must not reinstate manager Clocker authority or erase journal/time/audit data. Keep additive schema compatible with the prior writer during rollout; rollback does not drop populated tables or clear IndexedDB. A necessary data/schema rollback needs its own reviewed migration and evidence.

No production enablement/origin/PIN-key values have been verified. Isolated tests inject only fictional configuration. Device data can be operationally lost through explicit site-data clearing/OS eviction; owner receipt/Timecards review and clear support guidance are required, not a promise of perfect browser durability.

## Execution ownership and next gate

Implementation owner: the executing engineer/agent in an isolated development worktree. Security/architecture/product positions are synthesized from the repository's relevant leadership skills; no separate director-agent certification is claimed. Independent QA/UI owns its later findings; implementation cannot self-close them.

Current complete: pinned source map, Owner-controlled photo requirement with historical-source reference, proposed interfaces/tasks and iPad-only acceptance matrix. Photo code has not been integrated or activated in this planning phase. Current open: implementation, source-assembly reconciliation, owned integration tests and physical-iPad evidence. No policy exception requested; Owner-only control was explicitly required by Jose. Retention/support policy and actual test-device/environment details must be established before their dependent release steps.

Implementation by the primary agent in this session is the default recommendation because the tasks share security/recovery contracts. No automatic subagent dispatch is authorized by this document. Review the concrete map/plan before schema or application implementation; the user authorized this mapping deliverable, not a production release.
