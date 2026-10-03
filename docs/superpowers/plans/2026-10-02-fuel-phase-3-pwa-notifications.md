# Fuel Phase 3 PWA and notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task after Jose reviews this plan and selects the execution method. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing Fuel portal installable and establish authenticated, durable, privacy-safe Web Push for existing tasks and targeted reminders.

**Architecture:** Existing business repositories commit their changes, publication snapshots and notification intents atomically, then return without contacting push providers. A trigger-agnostic worker revalidates current business state, owns delivery leases and bounded retries, and uses existing PostgreSQL records; scheduler adapters only invoke it. Installation/device setup belongs to the existing portal profile disclosure, with an online-first worker scoped to `/app` and no Clocker involvement.

**Tech Stack:** Existing Next.js 16.3.6, React 19.3.0, TypeScript, Neon serverless 1.1.0 HTTP transactions, Vitest 5.0.2, raw CSS, maintained `web-push`, standard Node crypto/HTTPS, and existing local browser QA tooling. Development-only `pg`/types provide the disposable PostgreSQL adapter and `tsx` provides the bounded TypeScript worker command; select compatible maintained versions during the approved dependency task, with no Next/React/Neon upgrade.

**Spec:** `docs/superpowers/specs/2026-10-02-fuel-phase-3-pwa-notifications-design.md`, approved with the latency/logout clarifications committed as `582a368f4e5898602068a3fb195089d5b1821b64`.

**Status:** Approved by Jose for Subagent-driven execution on 2026-10-02. Tasks require fresh implementer/reviewer gates. Implementation remains local, with one final implementation commit after verification; activation remains separately authorized. Checkboxes and the execution ledger record actual progress, not verification by document authorship.

## Global Constraints

- Work only on `codex/fuel-phase-3-pwa-notifications` in `/Users/josek0514/.codex/worktrees/fuel-phase-3-pwa-notifications/Fuel-Scheduler-`; exact product base is `e27bcfdf895c72d2af469766d9b94af0dad900c8`. Preserve every other checkout.
- No push, merge, deployment, live migration, paid provisioning, public tunnel, staff campaign or Phase 4. Do not upgrade Vercel, provision another scheduler or create an HTTPS test environment.
- Preserve the Phase 0–2 UI contract. Raw CSS only; no new palette, navigation destination, inbox, chat, activity dashboard, scheduling policy, automatic swaps/coverage or timekeeping behavior.
- `/clocker/2` and `/clocker/110` remain entirely outside Phase 3. No metadata/setup, registration, prompts, subscription enrollment, employee notification flows, caching or offline substitution on either route.
- Business change and notification intent commit atomically. If intent persistence fails, the business transaction fails too. A failed or rolled-back business transaction never creates a successful-change notification.
- Business actions return their successful result after commit, without provider calls, device fan-out or retries. Default to **no post-commit request-path kick**; no unawaited serverless promise is the reliability mechanism.
- Authentication/session termination takes priority over notification cleanup. Clear the authentication cookie even when cleanup fails; preserve unresolved server cleanup for safe reconciliation without foreign-account inheritance.
- Session-derived identity only. Subscription secrets/private keys never enter client responses, logs, screenshots, fixtures or this plan. Preview/test never uses production subscriptions or credentials.
- Worker policy is trigger-agnostic. No Vercel SDK/header/environment dependency in the core. Hosting limitations/options are documentation; activation remains separately authorized.
- `America/Puerto_Rico`; Monday-through-Sunday workweeks. Routine quiet hours are 21:00 inclusive to 07:00 exclusive. At most one routine reminder per unresolved item/account/Puerto Rico day.
- Availability: one reminder approximately 24 hours before the actual deadline; after closure, one grouped manager summary. Acknowledgement: one follow-up 24 hours after the relevant meaningful publication, only while outstanding.
- Delivery: at most five attempts, approximately 1/5/15/60-minute retry delays after the initial attempt, bounded jitter/Retry-After and source expiry. Two-minute leases; defaults of ten devices/batch, concurrency two, twenty-second budget, eight-second attempt deadline.
- Outbound delivery defaults off. Real provider delivery and physical iPhone/Android tests remain pending until Jose authorizes an HTTPS environment and deliberately opted-in test account/device.
- Prepare migration `0007_portal_web_push.sql` only during implementation; depend on 0001–0006 and do not apply to existing Neon/dev/production. A clearly disposable loopback PostgreSQL database with fictional records is the only permitted integration target.
- One final local implementation commit: `feat: add installable Fuel portal and web push`. Do not amend previous commits. The user requirement overrides the skill's usual per-task commit preference; record task test results until the final checkpoint.

## Review Focus

1. A push provider never responds: business actions still complete, and worker timeout/retry remains bounded — Tasks 5, 6, 8.
2. Logout during a notification-table/storage outage: authentication cookie clears, old display generation is suppressed, incomplete cleanup stays explicit, and a second account cannot inherit enrollment — Tasks 3, 4, 11.
3. An identical employee shift set appears in a newer two-location revision: acknowledgement and reminder budget remain valid, while genuinely affected former/new assignees are selected — Tasks 1, 5, 7.
4. A claimed delivery is followed by resolution, access loss, account switching or lease takeover: revalidation/conditional completion cancels stale work without trusting a previous read — Tasks 2, 3, 8.
5. A push opens through expired login or a portal tab navigates to Clocker while offline: restore only an authorized safe destination, and pass Clocker traffic through unchanged — Tasks 4, 9, 11.

## Evidence and file map

Read the approved spec and nearest AGENTS.md before execution. The baseline scripts contain no migration hooks. Baseline lint/typecheck, 35 files/230 tests and credential-free build previously passed; these are **not** new Phase 3 verification. Actual hosting was inspected as Hobby with no configured cron jobs; do not infer a paid entitlement from execution capacity.

Paths below are relative to the isolated worktree above. New production files have one responsibility; existing repositories keep their existing public business APIs where possible.

| Task | Files created / modified | Responsibility |
| --- | --- | --- |
| 1 | Create `src/lib/notifications/{types,policy,recipients,payloads,destinations}.ts`; extend `src/lib/assistance/notification-events.ts` | Pure event/recipient/reminder/privacy/link contracts, reusing current publication and acknowledgement helpers |
| 2 | Create `db/migrations/0007_portal_web_push.sql`, `src/lib/data/notification-transactions.ts`, `src/lib/data/push-subscriptions.ts`, `src/lib/data/push-deliveries.ts`; extend `src/lib/data/notifications.ts` | SQL transaction composition, existing-table outbox, ownership records and delivery leases |
| 3 | Create `src/lib/notifications/{config,installation,subscription-service}.ts`, `src/app/app/api/push/{status,subscribe,unsubscribe,test}/route.ts`; modify `.env.example` | Authenticated installation lifecycle and protected device mutations |
| 4 | Create `src/lib/notifications/logout.ts`, `src/app/app/notifications/open/route.ts`; modify `src/lib/auth/session.ts`, `src/app/login/actions.ts`, `src/app/login/page.tsx`, `src/app/activate/actions.ts`, `src/app/activate/page.tsx` | Sign-out priority, recovery receipt, account-switch fencing and safe login return |
| 5 | Modify `src/lib/data/{publication-revisions,schedules,acknowledgements}.ts`, `src/app/app/schedule/{actions,acknowledge-actions}.ts` | Atomic published-write snapshots/intents; shared locking/version checks; equivalent acknowledgements |
| 6 | Modify `src/lib/data/{requests,exchanges,callouts}.ts`, `src/app/app/requests/actions.ts`, `src/app/app/exchange/actions.ts`, `src/app/app/exchange/callout/actions.ts` | Existing successful request transitions and participant/manager intents |
| 7 | Create `src/lib/notifications/reminders.ts`, `src/lib/data/notification-state.ts`; modify `src/lib/data/week-settings.ts` and affected availability/deadline actions | Due reminder materialization, cancellation, current-state revalidation and manager grouping |
| 8 | Create `src/lib/notifications/{provider,worker,worker-auth}.ts`, `src/app/api/internal/notifications/{dispatch,reminders}/route.ts`, `scripts/fuel-notification-worker.ts`, `package-lock.json`; modify `package.json` | Independent bounded delivery/retry worker and replaceable invocation adapters |
| 9 | Create `src/lib/notifications/manifest.ts`, `src/app/fuel-portal.webmanifest/route.ts`, `public/fuel-portal-sw.js`, `public/fuel-portal-offline.html`, `public/icons/fuel-{192,512,maskable-192,maskable-512,apple-180}.png`; modify `src/app/app/layout.tsx`, `next.config.ts` | Portal metadata, branded assets, strict worker scope/cache/update lifecycle |
| 10 | Create `src/components/{portal-device-setup,portal-signout,schedule-publication-change}.tsx`, `src/lib/notifications/device-state.ts`; modify `src/components/app-shell.tsx`, `src/app/globals.css`, `src/app/app/schedule/page.tsx`, `src/app/app/requests/page.tsx`, `src/app/app/exchange/page.tsx` | Compact setup/settings, local logout suppression and authenticated contextual change disclosure |
| 11 | Create focused tests listed per task, `src/test/fixtures/fuel-portal-notifications.ts`, `src/test/integration/{notifications.integration.ts,local-postgres.ts}`, `vitest.notifications-integration.config.ts`, `scripts/verify-fuel-phase-3.mjs`, `docs/architecture/fuel-phase-3-activation.md` | Genuine SQL integration, browser/worker regression evidence and activation handoff |

Employee request rows are rendered directly in `src/app/app/requests/page.tsx` and `src/app/app/exchange/page.tsx`; add anchors there. Existing `src/components/manager-time-off.tsx` and `src/components/manager-shift-requests.tsx` already contain contextual request ids/selected rows; reuse them without restructuring. No replacement request UI is allowed.

## Shared interfaces

Define these once in Task 1's `types.ts`; later tasks consume them. These are notification projections of existing records, not replacement employee/schedule/availability models.

```ts
type PushEnvironment = "test" | "production";
type SourceKind = "SCHEDULE" | "TIME_OFF" | "EXCHANGE" | "CALLOUT" | "AVAILABILITY" | "MANAGER_SUMMARY" | "SELF_TEST";
type SourceRef = { kind: SourceKind; id: string; version: string };
type NotificationIntent = NotificationEvent & {
  environment: PushEnvironment;
  source: SourceRef;
  effectiveVersion: string;
  purpose: "EVENT" | "REMINDER" | "SUMMARY" | "TEST";
  urgency: "normal" | "high";
  dueAt: string;
  expiresAt: string;
  itemKeys?: readonly string[];
};
type RecipientAccess = {
  employeeId: string; role: UserRole; active: boolean;
  allowedLocationIds: readonly string[];
};
type PushEnvelope = {
  notificationId: string; kind: string; ownershipGeneration: string;
  expiresAt: string; tag: string; title: string; body: string;
};
type SqlStatement = { text: string; values: readonly unknown[] };
type SqlExecutor = {
  query<T>(statement: SqlStatement, signal?: AbortSignal): Promise<T[]>;
  transaction(statements: readonly SqlStatement[], signal?: AbortSignal): Promise<unknown[][]>;
};
type SourceCheck = {
  deliverable: boolean; reason: string; effectiveVersion: string;
  expiresAt: string; destination?: string;
};
type ProviderResult =
  | { kind: "accepted" }
  | { kind: "retry"; errorClass: string; retryAfterSeconds?: number }
  | { kind: "invalid_subscription" }
  | { kind: "failed"; errorClass: string };
type WorkerReport = {
  claimed: number; accepted: number; retried: number; failed: number;
  expired: number; cancelled: number; noSubscription: number; disabled: boolean;
};
type NotificationPolicy = {
  timeZone: "America/Puerto_Rico";
  quietStartHour: 21; quietEndHour: 7;
  availabilityLeadHours: 24; acknowledgementDelayHours: 24;
  managerCollectionMinutes: 5; urgentLeadHours: 12;
  maxAttempts: 5; retryMinutes: readonly [1, 5, 15, 60];
  leaseSeconds: 120; batchSize: 10; concurrency: 2;
  budgetMs: 20000; attemptDeadlineMs: 8000;
};
```

`NotificationEvent` is the existing assistance type. `UserRole`, `PublishedShiftSnapshot`, `PublicationRevision`, `TimeOffListItem`, `ExchangeRecord`, `CalloutRecord`, `WeekSettings`, `AvailabilitySubmissionListItem` and `EmployeeAcknowledgementState` retain their existing source definitions. `SourceSnapshot` is a discriminated union using those existing records: schedule with previous/current snapshots and revision; Time Off/exchange/callout with the corresponding record; availability with week settings/submissions; manager summary with existing `ManagerActionItem[]`. Each contains `SourceRef` and read/version metadata needed for guards; do not use unvalidated arbitrary JSON as current business state.

`NotificationConfig` contains `featureEnabled`, `deliveryEnabled`, `testDeliveryEnabled`, `testAccountIds`, `environment`, `portalOrigin`, `policy`, and optional server-only `workerSecret`, `vapidPublicKey`, `vapidPrivateKey`, `vapidSubject`, `subscriptionEncryptionKey`. `readNotificationConfig(env)` validates these fields from the spec's configuration names. Client status is a separate projection. No client imports a server configuration/secret module.

`WorkerDeps` consists of `clock: () => Date`, validated `NotificationConfig`, `DeliveryRepository`, `SubscriptionRepository`, `NotificationStateRepository`, `PushSender`, `signal?: AbortSignal`. Repository and sender method contracts are established below; neither Next requests nor cron details enter `WorkerDeps`.

## Task 1: Pure event, reminder, privacy and destination rules

**Files:** New Task 1 modules; existing `src/lib/assistance/notification-events.ts`. Tests: `src/lib/notifications/{policy,recipients,payloads,destinations}.test.ts`, extend `src/lib/assistance/notification-events.test.ts`.

**Interfaces:**

- `buildNotificationIntents(input: { before?: SourceSnapshot; after: SourceSnapshot; actorEmployeeId?: string; recipients: readonly RecipientAccess[]; environment: PushEnvironment; now: Date; policy: NotificationPolicy }): NotificationIntent[]` in `recipients.ts`.
- `nextRoutineTime(now: Date, policy: NotificationPolicy): Date`; `planReminder(input: { intent: NotificationIntent; now: Date; resolved: boolean; policy: NotificationPolicy }): NotificationIntent | null`; `retryDecision(input: { attempt: number; now: Date; expiresAt: Date; result: ProviderResult; deliveryId: string; policy: NotificationPolicy }): { retryAt?: Date; terminal?: "failed" | "expired" }` in `policy.ts`.
- `buildPushEnvelope(intent: NotificationIntent, ownershipGeneration: string): PushEnvelope` in `payloads.ts`; uses fixed approved generic titles/bodies, never copies the internal event body.
- `safeNotificationOpenPath(notificationId: string): string | null`; `safeReturnTo(candidate: string | undefined): string | null`; `destinationForSource(source: SourceSnapshot, recipient: RecipientAccess): string | null` in `destinations.ts`.

- [x] Write table-driven failing tests named `publication_selects_only_affected_authorized_accounts`, `equivalent_personal_revision_preserves_reminder_budget` and `actor_success_is_not_redundantly_notified`: active/eligible recipients, two-location first publication, reassigned/removed assignees, unchanged/note-only republication, actor-success suppression, Employee/Lead reminders and Manager/Owner review. Reuse `diffPublishedShifts`/`buildAcknowledgementState`; test a newer globally different revision with identical personal shifts retains the effective version and reminder budget.
- [x] Add exact timing assertions: Puerto Rico 20:59/21:00/06:59/07:00; Sunday/Monday UTC conversion; one reminder at deadline minus 24 hours; near deadline produces at most one; quiet deferral past closure expires; acknowledgement follow-up capped at next shift/seven days/week end; only an actual changed shift/coverage start within 12 hours is urgent.
- [x] Assert stable environment/source/recipient event keys, no same-item/day repetition, payload containing none of a fixture's medical note/name/PIN/earnings, and rejecting external/protocol-relative/encoded traversal/lookalike/duplicate-query destinations. Valid encoded values in approved query parameters must remain valid; do not reject ordinary URI encoding indiscriminately.
- [x] Run `npm test -- src/lib/notifications src/lib/assistance/notification-events.test.ts`; expect new behavioral assertions to fail before implementation.
- [x] Implement the signatures above, reusing existing helpers. Extend existing builders rather than creating a second event vocabulary; retain their existing callers/tests. Specify routine bodies from the approved generic open-to-review copy.
- [x] Run the same command; require all assertions to pass. Record evidence, without a task commit.

## Task 2: Atomic outbox SQL, subscription schema and leased deliveries

**Files:** Task 2 file-map entries. Tests: `src/lib/data/{notifications,push-subscriptions,push-deliveries,notification-transactions}.test.ts`. Genuine PostgreSQL assertions also enter Task 11's integration suite.

**Interfaces:**

- `neonNotificationExecutor(): SqlExecutor` in `notification-transactions.ts`, using the existing `getDb()` and `sql.transaction`, with ordered parameterized statements and transaction-level abort signals.
- `notificationIntentStatements(intents: readonly NotificationIntent[]): SqlStatement[]`; `cancelNotificationStatements(source: SourceRef, recipientId?: string): SqlStatement[]` in the existing notification repository. Business callers append these to their transaction, never invoke a separately committed `createNotification` afterward.
- `SubscriptionRepository`: `enroll(input: OwnedEnrollment): Promise<DeviceStatus>`; `detach(input: InstallationProof): Promise<CleanupResult>`; `listActive(recipientId: string, environment: PushEnvironment): Promise<PushSubscriptionRecord[]>`; `invalidate(subscriptionId: string, generation: string): Promise<void>`; `reconcile(receipt: VerifiedCleanupReceipt): Promise<CleanupResult>`.
- `DeliveryRepository`: `materialize(intentIds: readonly string[]): Promise<void>`; `claim(input: { now: Date; limit: number; leaseSeconds: number; mode: "new" | "retry" | "all" }): Promise<DeliveryClaim[]>`; `finish(claim: DeliveryClaim, result: DeliveryCompletion): Promise<boolean>`; `release(claim: DeliveryClaim): Promise<boolean>`; `cancelForGeneration(installationHash: string, generation: string): Promise<void>`.
- `PushSubscriptionRecord` contains internal id, authenticated employee id, installation hash, environment, endpoint fingerprint, encrypted material, generation, consent/session proof and status. `DeliveryClaim` contains delivery/intent/subscription ids, generation, lease token, lease expiry, attempt count and intent. `DeliveryCompletion` contains one documented terminal/retry state, optional next-attempt time and coarse error class; no provider response body. `OwnedEnrollment`, `InstallationProof`, `VerifiedCleanupReceipt`, `DeviceStatus` and `CleanupResult` are defined in Task 3.

- [x] Write failing tests named `outbox_statements_share_business_transaction`, `historical_notifications_are_not_replayed` and `stale_lease_cannot_finish`: intent statements participate in the caller's batch, conflict keys include environment, historical rows are excluded from push, and lease completion requires matching token/generation. Include interruption/reclaim and no-active-subscription outcomes.
- [x] Run `npm test -- src/lib/data/notifications.test.ts src/lib/data/push-subscriptions.test.ts src/lib/data/push-deliveries.test.ts src/lib/data/notification-transactions.test.ts`; require the new assertions to fail initially.
- [x] Prepare **unapplied** migration 0007. Extend `notifications` with environment/source/effective-version/purpose/due/expiry/urgency/cancellation/state/item-key metadata, defaulting old rows to non-push. Add `push_subscriptions` and `push_deliveries`, unique active installation/environment and active endpoint/environment ownership, unique intent/subscription/generation delivery identity, state/expiry constraints and due/lease indexes. Use existing employees FK; no replacement event/employee/schedule tables.
- [x] Store associated enrollment session hash as a comparison proof, **not a foreign key that makes session deletion depend on push-table cleanup**. Dispatch checks whether that session record was removed/revoked; ordinary session expiry alone does not erase deliberate device consent. Normal authenticated renewal can refresh proof only for the same verified owner. Use no cascading push-side operation in auth session termination.
- [x] Implement repositories and ordered SQL adapter. Transaction claims use `FOR UPDATE SKIP LOCKED`, database time and a two-minute lease. Finish/release use the lease token and expected generation; superseded attempts cannot overwrite recovered work. Persist no-subscription outcomes in the existing recipient intent state rather than inventing a delivery to a nonexistent device.
- [x] Run the focused tests and `npm run typecheck`. Require passes; record mocks as mocks. Actual rollback/uniqueness/locking remains unproved until Task 11 runs against disposable PostgreSQL.

## Task 3: Authenticated device ownership, endpoints and self-test

**Files:** Task 3 modules/routes and `.env.example`. Tests: `src/lib/notifications/{config,installation,subscription-service}.test.ts`, `src/app/app/api/push/push-routes.test.ts`.

**Interfaces:**

- `readNotificationConfig(env: Record<string, string | undefined>): NotificationConfig` in `config.ts`; missing/invalid delivery configuration disables sending and never exposes values.
- `validatePushSubscription(value: unknown): ValidatedSubscription` in `subscription-service.ts`, enforcing strict body keys, 8 KiB maximum request body, 4096-byte endpoint maximum, optional finite expiration, URL-safe key decoding, 65-byte uncompressed P-256 public key and 16-byte authentication secret. Reject malformed shapes before encryption/storage.
- `validatePushEndpoint(candidate: string): URL` in `subscription-service.ts`; the same function is required by Task 8 at dispatch.
- `readInstallationProof(cookies: CookieReader): InstallationProof | null`; `createInstallationProof(): InstallationProof`; `sealCleanupReceipt(receipt: VerifiedCleanupReceipt, key: Uint8Array): string`; `openCleanupReceipt(value: string, key: Uint8Array, now: Date): VerifiedCleanupReceipt | null` in `installation.ts`. Use standard crypto and a purpose-separated receipt signing key derived from the existing subscription-protection key; no new paid store.
- `InstallationProof` contains server-generated random installation token/hash; no client-selected employee id. `OwnedEnrollment` contains server-derived `SessionEmployee`, installation proof, session hash, environment and validated subscription. `VerifiedCleanupReceipt` contains opaque installation/session hashes, issued/expiry instants and expected generation when known; no employee detail or push secrets. Receipt expires no later than the former session's maximum 14-day lifetime.
- `DeviceStatus = { supported: boolean; enabled: boolean; ownershipGeneration?: string; vapidPublicKey?: string; configurationAvailable: boolean; testAllowed: boolean }`. `CleanupResult = { status: "complete" | "pending"; generation?: string }`; do not claim completion on timeout.
- `handlePushMutation(request: Request, operation: "subscribe" | "unsubscribe" | "test"): Promise<Response>` uses existing session/cookie ownership, never request-body identity. `GET status` returns only `DeviceStatus`; all other mutations use authenticated same-origin JSON POST and `Cache-Control: no-store`.

- [x] Write failing tests named `forged_identity_is_rejected`, `foreign_endpoint_cannot_be_rebound`, `same_owner_enrollment_is_idempotent` and `stale_generation_is_rejected`: forged `employeeId`/installation fields; inactive/missing session; origin/content-type/body-size violations; foreign installation/endpoint; duplicate same-owner subscription; multiple devices; stale-generation tabs; valid/invalid/expired cleanup receipts and mixed environments. Verify duplicate enrollment is idempotent while foreign ownership fails. With feature disabled and no pending receipt, status/logout must require no push-table access or push credentials.
- [x] Add endpoint attacks: HTTP, alternate port, credentials, fragments, IP/private/local hosts, lookalike suffixes and redirects. Allow only reviewed HTTPS/443 Google/Mozilla host/path pairs and label-boundary `*.push.apple.com` provider endpoints. Record the allowlist evidence in the activation runbook; unknown providers remain unsupported, never automatically trusted.
- [x] Test encrypted material round-trip/tampering, sanitized error outputs, no endpoint/auth material in status/logs, and durable once-per-five-minute self-test throttling. Self-test targets only the authenticated current test installation; production/disabled/foreign/test-account mismatch is refused.
- [x] Run `npm test -- src/lib/notifications/config.test.ts src/lib/notifications/installation.test.ts src/lib/notifications/subscription-service.test.ts src/app/app/api/push/push-routes.test.ts`; require initial failures.
- [x] Implement the interfaces and routes. Enrollment/detachment locks the installation/endpoint identity, advances ownership generations on detach, cancels device work and never rebinds foreign records. Standard AES authenticated encryption protects stored subscription material; receipt signing uses standard Node primitives, not Web Push crypto. Missing encryption/signing configuration cannot prevent ordinary logout.
- [x] Add only configuration **names/defaults** from the spec to `.env.example`, with separate test/production guidance and feature/delivery/test flags default false. No real key generation, secret-store edits, live enrollment or provider contact.
- [x] Re-run focused tests/typecheck; record passes. Add PostgreSQL uniqueness/multi-device ownership cases to Task 11.

## Task 4: Logout priority, reconciliation and safe authenticated return

**Files:** `src/lib/notifications/logout.ts`, `src/lib/auth/session.ts`, login/activation actions/pages, `/app/notifications/open/route.ts`. Tests: `src/lib/notifications/logout.test.ts`, `src/lib/auth/session.test.ts`, `src/app/login/actions.test.ts`, `src/app/app/notifications/open/route.test.ts`.

**Interfaces:**

- `terminatePortalSession(input: { sessionToken?: string; installation?: InstallationProof; cookies: CookieWriter; deps: LogoutDeps }): Promise<CleanupResult>` in `logout.ts`. `LogoutDeps` supplies an independent bounded session-delete operation, subscription cleanup/reconciliation, receipt sealing and clock; it never contains a push sender.
- Preserve `destroySession(): Promise<void>` as the existing action-facing API; delegate to the bounded termination path and always clear `fuel_session` in `finally`. `login`/activation keep their authorization behavior, adding validated `returnTo` only.
- `reconcilePendingInstallation(cookies: CookieReaderWriter, config: NotificationConfig): Promise<CleanupResult>` uses verified Task 3 proof/receipt before enrollment/new login ownership changes.
- `GET /app/notifications/open?notificationId=…` returns a redirect or generic unavailable response. Use a **Route Handler**, not a page: it must perform safe login-return handling without the authenticated `/app` page layout redirect discarding the destination. It reads current persisted recipient/source and existing role permissions before redirecting.

- [ ] Write failing logout tests named `cleanup_rejection_does_not_block_signout`, `cleanup_timeout_does_not_block_signout`, `session_revocation_survives_push_transaction_failure` and `outage_receipt_cannot_transfer_ownership`: successful cleanup, cleanup rejection, hung cleanup, session-delete rejection and complete storage outage. Fake timers must show cookie deletion and `/login` exit regardless of push cleanup. Assert other devices remain active, pending cleanup is not falsely reported complete, and no provider is invoked. Include signing-key misconfiguration and JavaScript-disabled native sign-out.
- [ ] Assert stale/forged receipts cannot detach a newer generation/other account; valid old proof is idempotent; server session deletion can succeed when push cleanup fails; worker sees the missing session proof and suppresses that installation. Storage recovery reconciles the old proof before fresh opt-in; DB outage never authorizes foreign re-enrollment.
- [ ] Test signed-out safe return through login/activation, current owner success, wrong user, deleted request, superseded revision, changed role/location and denied source access. Taps must invoke **zero** business mutations. Existing login defaults still redirect to `/app`.
- [ ] Run `npm test -- src/lib/notifications/logout.test.ts src/lib/auth/session.test.ts src/app/login/actions.test.ts src/app/app/notifications/open/route.test.ts`; require initial failures.
- [ ] Implement separate auth and notification cleanup attempts under a shared **one-second maximum cleanup budget**, with abortable database transport. Clear the auth cookie in all cases, set the opaque pending receipt when needed, and redirect without waiting for push/provider activity. Both DB operations are independently attempted; notification failure cannot roll back session deletion. If receipt signing is unavailable, retain the existing opaque server-issued installation proof for healthy lookup rather than minting an unverifiable claim. Never return a false global-revocation claim during complete storage failure.
- [ ] Process pending cleanup on healthy status/enrollment/login/unsubscribe requests. A pending browser proof keeps its old generation locally suppressed; another account cannot reuse its subscription. The worker cleans records with removed associated sessions even if the browser never returns. If both durable operations failed, record the documented recovery limitation rather than invent an in-memory revocation guarantee.
- [ ] Implement safe route handler and hidden validated login/activation return fields using Task 1 destinations. Re-run tests/typecheck; prove permission behavior remains unchanged.

## Task 5: Publication and all schedule writers commit intents atomically

**Files:** Task 5 existing repositories/actions. Tests: `src/lib/data/publication-revisions.test.ts`, `src/lib/data/schedules-notifications.test.ts`, `src/app/app/schedule/actions.test.ts`; extend existing acknowledgement tests.

**Interfaces:**

- Preserve `publishScheduleWithRevision(input): Promise<{ published: boolean; revision?: PublicationRevision }>` and existing `insertShift`, `updateShift`, `deleteShift` action contracts; extend repository arguments with server-derived actor context where genuinely required.
- `commitPublishedWeekChange(input: { weekStarts: readonly string[]; actorEmployeeId: string; sourceType: RevisionSourceType; sourceId?: string; build: (snapshot: GuardedWeekState) => WeekMutationBatch }, executor?: SqlExecutor): Promise<WeekMutationResult>` in `notification-transactions.ts`. `GuardedWeekState` contains both-location schedule versions, latest revision, current shifts and recipient access. `WeekMutationBatch` contains ordered SQL mutation statements plus anticipated after-state; `WeekMutationResult` reports committed/unchanged revision information, never provider status.
- Use Task 1 builders and Task 2 intent statement composition. No delivery/worker imports in business actions.

- [ ] Write failing tests for first publication, affected-only republish, other-location change, removal/reassignment, note-only edit, no-op republish, draft edit, approved callout status changes, and relevant Lead/location changes. Verify unaffected acknowledgements survive and only meaningful personal changes reset their reminder version.
- [ ] Add writer races: draft insert/update/delete vs publication, two managers publishing, multi-week manual swap and guarded version conflict. Lock every affected week in sorted order; detect changed versions and recompute at most three times. No outdated snapshot/recipient list may commit.
- [ ] Add `publish_returns_without_provider_contact` and corresponding create/update/delete tests. Inject a provider that never resolves and assert it is never called by any schedule action. Commit response/redirect and durable intents complete without waiting for dispatch. An outbox-insert failure must throw/rollback the **whole** business transaction. Minimal assertion shape:

  ```ts
  const { send, createPushSender } = vi.hoisted(() => {
    const send = vi.fn(() => new Promise<never>(() => {}));
    return { send, createPushSender: vi.fn(() => ({ send })) };
  });
  vi.mock("@/lib/notifications/provider", () => ({ createPushSender }));
  // Existing action test mocks the repository commit and Next redirect.
  await expect(publishScheduleAction(formData)).rejects.toMatchObject({ destination: expectedSuccess });
  expect(createPushSender).not.toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();
  expect(transactionStatements).toContainEqual(expect.objectContaining({ text: expect.stringContaining("INSERT INTO notifications") }));
  ```

  The transaction recorder comes from the repository test executor; action tests also inspect the actual import/call boundary, so an unused fake provider is not the only evidence.
- [ ] Run `npm test -- src/lib/data/publication-revisions.test.ts src/lib/data/schedules-notifications.test.ts src/app/app/schedule/actions.test.ts src/lib/data/acknowledgements.test.ts`; require new failures.
- [ ] Implement shared advisory-lock/version protocol using ordered Neon batch statements. Touch schedule `updated_at` for every draft/published writer and use explicit guard failure to abort/retry the whole batch. Insert actual immutable snapshots after guarded mutations, then intents/reminders; do not assume data-modifying CTE siblings can read each other's writes.
- [ ] Route all ordinary schedule insert/update/delete and current Copy Last Week writes through the same boundary. Keep current copy eligibility/partial-success behavior; do not implement new copy automation. Avoid duplicate notifications from a second revision written by an action afterward.
- [ ] Remove action-level blanket `clearWeekAcknowledgements` calls on affected writes; retain the exported compatibility helper if other callers still need it. Use existing equivalence evaluation and transactional reminder cancellation instead. Do not auto-acknowledge anyone.
- [ ] Re-run focused tests and existing scheduling-rule/copy/publish-readiness/role suites. PostgreSQL rollback and race proof is mandatory in Task 11; mocks alone do not prove this boundary.

## Task 6: Existing requests/manual outcomes produce correct intents

**Files:** Task 6 repositories/actions. Tests: `src/lib/data/requests-notifications.test.ts`, `src/lib/data/exchanges-notifications.test.ts`, `src/lib/data/callouts-notifications.test.ts`; extend `src/app/app/exchange/actions.test.ts` and create `src/app/app/requests/actions.test.ts`, `src/app/app/exchange/callout/actions.test.ts`.

**Interfaces:** Preserve existing public functions `createTimeOffRequest`, `reviewTimeOffRequest`, `createCoverageOffer`, `claimCoverage`, `createSwapProposal`, `respondToSwap`, `denyExchange`, `approveCoverageExchange`, `approveSwapExchange`, `cancelExchange`, `createCallout`, `approveCalloutAndOpenCoverage`, `denyCallout`, `cancelPendingCallout`. Their persistence uses Task 2 SQL composition and Task 5 week mutation transaction for published effects. Server-derived actor/authorization context must not be replaced by body identity.

- [ ] Write failing tests for each successful/failed/status-raced transition. Time Off/callout decisions notify the owner; swap-response requests notify the target; participant declines/outcomes notify relevant participants without redundant actor-success notices. Pending review/open coverage only queues grouped authorized Manager/Owner attention.
- [ ] Assert no success intent after failed mutation, no changed state after outbox failure, no duplicate outcome after repeated guarded decision, no employee broadcast for open coverage, and no confirmation before existing manager approval. Keep actual existing server authorization/eligibility checks and no automatic approvals.
- [ ] Test published manual swap/coverage/callout changes use the same snapshots/locks as Task 5, cancel superseded reminders and preserve unaffected acknowledgements. Assert provider methods are never invoked even with an indefinitely stalled fake provider.
- [ ] Run `npm test -- src/lib/data/requests-notifications.test.ts src/lib/data/exchanges-notifications.test.ts src/lib/data/callouts-notifications.test.ts src/app/app/exchange/actions.test.ts src/app/app/requests/actions.test.ts src/app/app/exchange/callout/actions.test.ts`; require initial failures, including `time_off_decision_returns_without_provider_contact` and `failed_decision_has_no_success_intent`.
- [ ] Compose guarded mutation and event/reminder/cancellation statements in one transaction per current successful transition. Keep existing user-facing success/error behavior; detailed reason/management note remains authenticated only. Remove duplicate action-level acknowledgement invalidation after published outcomes.
- [ ] Re-run focused, exchange-validation, marketplace, role and Phase 2 scheduling-rule suites. Add rollback/repeated-decision concurrency cases to Task 11.

## Task 7: Central reminder processing and latest-state revalidation

**Files:** `src/lib/notifications/reminders.ts`, `src/lib/data/notification-state.ts`, existing week-settings/availability/deadline actions. Tests: `src/lib/notifications/reminders.test.ts`, `src/lib/data/notification-state.test.ts`, extend availability/deadline/acknowledgement action tests.

**Interfaces:**

- `NotificationStateRepository.readSource(source: SourceRef): Promise<SourceSnapshot | null>`; `check(intent: NotificationIntent, recipientId: string, now: Date): Promise<SourceCheck>`; `listReminderCandidates(now: Date, limit: number): Promise<SourceSnapshot[]>`; uses current actual repositories/tables, not copied notification payload as business truth.
- `runReminders(deps: Omit<WorkerDeps, "sender">): Promise<WorkerReport>` in `reminders.ts`. It only persists/reconciles intents and manager groups, never calls the provider.
- Deadline edits, availability submission and schedule acknowledgement add cancellation/reconciliation statements to their existing transaction. Scanner revalidation remains mandatory even when immediate cancellation succeeded.

- [ ] Write failing tests named `zero_hour_submission_is_not_missing`, `quiet_deferral_past_deadline_expires`, `resolved_source_cancels_due_reminder` and `unchanged_personal_revision_keeps_followup_budget`: submitted zero hours vs missing, normal-plus-weekly overrides, future/past/removed/edited deadline, Employee/Lead eligibility, near-deadline/quiet-hour expiry, unchanged personal revision, outstanding/completed acknowledgement and all resolution/access-loss cases in the spec.
- [ ] Test a late invocation cannot emit several catch-ups; re-running the scanner produces the same keys; at most one routine item/day/account across devices; one after-close summary per actual deadline version/manager; grouped pending items do not repeat under overlapping workers. New genuinely distinct items can enter a later group.
- [ ] Test configured coverage/Lead gaps use existing schedule-health/manager-action helpers. Filter out hour-target/configuration nag/punch items, and do not invent FUEL – 110 weekday expected windows or staffing periods. Source resolved/filled/cancelled/superseded immediately before dispatch must suppress the intent.
- [ ] Run `npm test -- src/lib/notifications/reminders.test.ts src/lib/data/notification-state.test.ts src/app/app/availability/actions.test.ts src/app/app/schedule/settings/actions.test.ts`; require initial failures.
- [ ] Implement centralized policy with injected clock and actual deadlines/submission markers. Manager grouping uses stable item/day keys in existing notification metadata and a manager/day advisory lock, without another reminder ledger. Scan bounded relevant configured weeks/periods; missing deadlines/configuration produce no fabricated campaign.
- [ ] Add transactional cancellation to resolution paths; retain repeated worker checks. Re-run tests and Phase 2 availability/role suites, recording mocked boundaries.

## Task 8: Independent, bounded delivery and replaceable worker invocation

**Files:** Task 8 modules/routes/script; `package.json`, new `package-lock.json` (the baseline has no tracked lockfile). Tests: `src/lib/notifications/{provider,worker,worker-auth}.test.ts`, `src/app/api/internal/notifications/worker-routes.test.ts`.

**Interfaces:**

- `PushSender.send(input: { subscription: ValidatedSubscription; payload: PushEnvelope; ttlSeconds: number; urgency: "normal" | "high"; topic: string; signal: AbortSignal }): Promise<ProviderResult>` in `provider.ts`.
- `createPushSender(config: NotificationConfig): PushSender` in `provider.ts` is the worker adapter's factory; business actions never call it. `createWorkerDeps(config: NotificationConfig, clock?: () => Date): WorkerDeps` in `worker.ts` wires the real repositories/sender for invocation adapters, with an injected default clock and no HTTP or platform-specific arguments.
- `runDispatch(input: { mode: "new" | "retry" | "all"; deps: WorkerDeps }): Promise<WorkerReport>` in `worker.ts`; Task 7 `runReminders` is separate.
- `authorizeWorker(request: Request, configuredSecret?: string): boolean` in `worker-auth.ts` compares bearer credentials in constant time and fails closed. Routes map requests to fixed core entry points and return aggregate reports only.
- `scripts/fuel-notification-worker.ts` accepts `dispatch` or `reminders`, resolves server configuration and invokes the same core. It is a bounded manually invoked/local-test entry, never an always-on Mac production scheduler.

- [ ] Write failing tests named `provider_acceptance_is_not_acknowledgement`, `hung_transport_aborts_at_deadline`, `invalid_subscription_is_cleaned` and `http_and_cli_adapters_share_worker`: provider accepted vs seen/acknowledged; network/408/429/5xx retries; 404/410 invalidation; permanent/config errors; Retry-After/jitter/lifetime; never-resolving transport abort; one failed device not blocking other devices; no active subscription; disabled flags/environment mismatch. Require an 8-second absolute deadline and maximum 32 KiB response bytes. Bound Retry-After to 60 minutes and deterministic jitter to 10% of the base delay, always expiring rather than sending past source lifetime.
- [ ] Write lease/revalidation tests for two workers, stale completion token, interruption/reclaim, resolution/access loss/owner switch after claim, superseded/expired event and retry cancellation. An ambiguous acceptance may retry with the same tag; do not assert impossible exactly-once OS display.
- [ ] Test batch ten/concurrency two/twenty-second budget/eight-second attempt deadline, releasing unattempted claims when remaining budget is insufficient. Test unauthorized/missing-secret endpoints and identical decisions through HTTP vs local invocation adapters. Fake clock/provider/repositories belong in tests, not production in-memory queues.
- [ ] Run `npm test -- src/lib/notifications/provider.test.ts src/lib/notifications/worker.test.ts src/lib/notifications/worker-auth.test.ts src/app/api/internal/notifications/worker-routes.test.ts`; require initial failures.
- [ ] Add maintained `web-push` and needed types after inspecting current official release/engine compatibility; pin the selected version in the lockfile. Add development-only `tsx` for `notifications:worker` (`tsx scripts/fuel-notification-worker.ts`) and `pg`/types for Task 11's explicit SQL integration script. Use the maintained library's standards-compliant request generation, then a reviewed Node HTTPS transport with an absolute abort deadline, no redirects, same endpoint validator and response-byte cap. Never implement Web Push encryption yourself or print keys.
- [ ] Implement independent worker claim/revalidate/send/finish using Task 2 repositories and Task 7 state checks. Missing access/config/state fails closed; provider calls occur after claim commit and outside all business transactions. Persist retries/expiry and sanitize error classes.
- [ ] Implement Node-runtime dispatch/reminder endpoints and CLI adapter. A Vercel `CRON_SECRET` alias, if ever activated, stays in configuration/auth adapter only; core receives explicit configuration. Add no active cron configuration and no request-path delivery/kick. Other compatible schedulers can use the same authenticated endpoints.
- [ ] Re-run tests/typecheck. Verify business repositories/actions import no sender/dispatch implementation. Record actual provider delivery as **not performed**.


**Execution clarification (Clocker scope):** The pinned Next.js root file-based manifest convention would inject a manifest link into Clocker as well. Serve a regular public manifest endpoint and explicitly link it only from the `/app` layout. Verify real Next HTML for both Clocker routes; do not add a root file-based manifest or compensate by editing Clocker. This implements the approved isolation requirement without changing product scope.

## Task 9: Portal manifest, safe public assets and service worker

**Files:** Task 9 file-map entries. Tests: `src/lib/notifications/service-worker.test.ts`, `src/lib/notifications/manifest.test.ts`; real browser registration/cache checks in Task 11.

**Interfaces:** `manifest()` returns Next `MetadataRoute.Manifest`; portal registration uses script `/fuel-portal-sw.js`, scope `/app`, and exact path checking. Worker message envelopes are versioned `SET_OWNER`, `SUPPRESS_OWNER`, `UPDATE_WAITING` with opaque generation only; enrollment and logout messages never contain employee/subscription secrets. Push/click handlers consume Task 1 `PushEnvelope` and construct the fixed safe open route.

- [ ] Write failing tests named `manifest_preserves_portal_identity`, `private_responses_never_enter_cache` and `clocker_is_not_intercepted`: stable id/start/scope `/app`, full name/short name, standalone display, espresso `#2b1a12`/ivory `#fffdf9`, icon dimensions/purpose and portal-only metadata links. Assert neither Clocker layout nor the root layout gains portal setup/manifest metadata.
- [ ] Exercise worker code in a test harness: exact `/app` and `/app/*` navigation, prefix lookalikes, `/clocker/2`, `/clocker/110`, auth/API/RSC traffic and HTTP errors. Private responses are never put in CacheStorage; connection failure alone uses the static fallback; POST/approvals/punches always go to network without offline success.
- [ ] Test allowlisted offline HTML/icon cache only, malformed/expired/wrong-generation push suppression, fixed-origin click target, notification clearing on detach, normal waiting lifecycle, no `skipWaiting`/forced reload and retirement of Fuel-owned caches only.
- [ ] Run `npm test -- src/lib/notifications/service-worker.test.ts src/lib/notifications/manifest.test.ts`; require initial failures.
- [ ] Implement root-served worker with explicit registration scope and exact-path checks in every relevant handler. Cache only self-contained offline HTML and named Fuel icons. Add safe no-cache worker/manifest headers and explicit public fallback behavior; leave private auth/data response caching unchanged and unhandled by the worker.
- [ ] Export logo-based 192/512 ordinary/maskable and Apple 180 icons with approved safe padding using existing local image export tools. This is technical brand-asset export, not a new logo or design. Inspect generated icons and confirm maskable bounds.
- [ ] Add metadata/viewport theme only to `src/app/app/layout.tsx`. Re-run tests/build checks; actual registration, synthetic browser push and waiting-update checks remain separate Task 11 evidence.

## Task 10: Compact device setup and existing contextual task UI

**Files:** Task 10 entries; `src/test/fixtures/fuel-portal-notifications.ts`. Tests: `src/lib/notifications/device-state.test.ts`, `src/components/portal-device-setup.test.tsx`, `src/components/portal-signout.test.tsx`, `src/components/schedule-publication-change.test.tsx`, extend shell tests.

**Interfaces:**

- `deriveDeviceState(input: { capabilities: DeviceCapabilities; permission: NotificationPermission | "unsupported"; standalone: boolean | "unknown"; server: DeviceStatus; dismissed: boolean }): DeviceSetupState` in `device-state.ts` is pure and exhaustive for unavailable/install/ready/enabled/denied/revoked/pending/error states.
- `PortalDeviceSetup({ role }: { role: UserRole })` consumes authenticated status/routes and local opaque dismissal/generation state; no employee id is sent as identity. Only an explicit Enable handler calls `Notification.requestPermission()` before asynchronous preflight could break the gesture.
- `PortalSignout` preserves the current native/server-action sign-out fallback while attempting bounded unsubscribe/local generation suppression/notification clearing; server termination never depends on JS cleanup success.
- `SchedulePublicationChange({ changes }: { changes: readonly PublicationChange[] })` renders a small collapsed authenticated disclosure with existing typography; it is not an inbox.

- [ ] Write failing state-machine tests named `permission_is_requested_only_from_enable_gesture`, `instructions_do_not_claim_installed`, `not_now_persists_without_nagging` and `denial_is_not_reprompted`: default/granted/denied/unsupported/revoked/unknown standalone/install-event cases and persistent Not Now. Assert reading instructions does not set installed state, permission is never requested on mount, denied permission never re-prompts, and only an explicit Enable gesture requests it.
- [ ] Test exact approved setup copy, equal peer actions, retained navigation/roles, test button only for current opted-in authorized test installation, provider accepted copy never claiming received, turn-off/failed server cleanup states and native logout fallback. Long labels/errors retain input/focus.
- [ ] Run `npm test -- src/lib/notifications/device-state.test.ts src/components/portal-device-setup.test.tsx src/components/portal-signout.test.tsx src/components/schedule-publication-change.test.tsx src/components/app-shell.test.tsx`; require initial failures.
- [ ] Implement profile disclosure placement: desktop existing profile; Employee/Lead mobile More profile; Manager/Owner existing mobile profile/role affordance. One dismissible offer uses that surface after authentication, not a banner/dashboard/nav destination. Do not mount anything in Clocker. Prepare status/capability config before enabling permission action; new account requires fresh opt-in.
- [ ] Use existing raw scoped classes/tokens, 44px minimum/22px capsules/12px 600 centered labels, equal peer sizing and current Manager espresso/Employee action pairing. Preserve hover/pressed/focus/disabled contrast and safe-area/content clearance. No global CSS palette/submit overrides.
- [ ] Add collapsed actual before/after details only for authorized employee shifts. Add `id="request-<id>"` and `tabIndex={-1}` to existing employee rows in the two verified request pages; validated links retain current `requestId`/tab context and the matching fragment. Use existing selected-row/anchor patterns, without new pages, request workflow changes or mutation on notification opening.
- [ ] Re-run tests/typecheck; browser interactions, geometry, loading/error/success/dismissal, keyboard, bottom-nav clearance and screenshots must pass Task 11 before the implementation checkpoint.

## Task 11: SQL integration, responsive/protected evidence and local handoff

**Files:** Task 11 entries; `package.json`/`package-lock.json` only for explicit test scripts/development test adapter. Evidence/screenshot output stays outside the product tree in a new Phase 3 QA directory; no edits to earlier evidence or unrelated worktrees.

**Interfaces:** `createDisposableNotificationDatabase(): Promise<{ executor: SqlExecutor; connectionString: string; dispose(): Promise<void> }>` in `src/test/integration/local-postgres.ts`. It accepts only `FUEL_TEST_DATABASE_URL` targeting loopback and a fresh `fuel_phase3_test_` database, verifies a disposable marker, and refuses `DATABASE_URL`, remote hosts, existing/customer databases and missing consent to destructive test teardown. The harness applies the repository's exact 0001–0007 SQL sequence **only there**, seeds fictional `QA-` accounts and uses dedicated clients for concurrency. Reuse the production SQL statement batches through the local `pg` adapter; do not replace transactional behavior with mocks.

- [ ] Create failing integration cases named `outbox_failure_rolls_back_publication`, `failed_mutation_has_no_notification`, `draft_publication_race_recomputes_snapshot`, `foreign_installation_is_not_inherited`, `push_cleanup_error_cannot_rollback_session_delete` and `concurrent_workers_claim_disjoint_deliveries`: business/outbox rollback when intent insertion fails; failed business mutation leaves no intent; publication version races across both locations/draft edits; repeated decisions; enrollment uniqueness/foreign ownership; logout session-delete independence and healthy receipt reconciliation; two concurrent worker claims/lease takeover. Add `npm run test:notifications:integration` targeting `*.integration.ts` through a dedicated config. Missing disposable PostgreSQL must fail this explicit command with a clear prerequisite, never silently pass/skip it.
- [ ] Inspect available local PostgreSQL tools. Use an existing local/open-source runtime if present; no hosted database or paid signup. Run the explicit integration suite and require actual SQL assertions to pass. If unavailable, report the blocker/evidence gap and do not claim fixtures prove concurrency or migration application. Do not apply migration 0007 anywhere else.
- [ ] Capture the exact `e27bcfdf895c72d2af469766d9b94af0dad900c8` source into a read-only external baseline archive. Reuse the existing Phase 2 loopback Vite/fictional-data harness pattern; do not use its older parent archive as the Phase 3 baseline. Use the same data/time/browser settings for both versions. Hydrate actual new client components; static rendering alone cannot prove permission/logout behavior.
- [ ] Build `scripts/verify-fuel-phase-3.mjs` to run only against deliberate loopback fixtures using existing browser dependencies. Viewports: 320/375/390/430/768/1024/1440. Chromium and WebKit where available. Compare Manager Dashboard/Time Off/Availability/Shift Requests; Employee and Lead Home/Schedule/Availability/Time Off/Shift Requests/My Time; both Clocker routes including 1024×768 and 768×1024. Retain existing role regression tests and compare additional Schedule/Employees/Templates/Scheduling Rules surfaces touched indirectly by shared dependencies.
- [ ] Use two comparison modes: feature disabled/setup dismissed with unchanged ordinary data must match baseline; enabled profile affordance/contextual disclosure permits only the explicitly approved component regions. Never blanket-mask a page or update protected snapshots to hide a regression. Require unchanged Clocker pixels/DOM/geometry/styles and zero registration/prompt/device calls, including portal-to-Clocker navigation/offline requests.
- [ ] Exercise setup states with browser permission/install API doubles and real component hydration: supported/unsupported, default/granted/denied/revoked, true/unknown standalone, Not Now across reopen, account switch, Turn Off, test throttling, loading/error/success, keyboard focus/dismissal and unsaved form. Measure centered/equal 44px controls, active small text at least 4.5:1, mobile safe areas/no horizontal overflow, and final content able to scroll above bottom navigation.
- [ ] Separately run actual local browser service-worker registration at `/app` and nested destinations, scope inspection, offline fallback, no private CacheStorage writes, update waiting and rollback/unregister. Synthetic Chromium push can use the documented DevTools `ServiceWorker.deliverPushMessage`; label it synthetic and assert envelope/tag/generation/click behavior. This proves neither provider delivery nor a physical device. Never add a production test-message bypass to the worker.
- [ ] Capture approved setup/settings at 390px and 1440px for Employee/Lead and Manager/Owner, install instructions, denied/error/focus states, and the small actual schedule-change disclosure. Inspect images; do not generate/rewrite screenshots to pass comparison. Provide local loopback preview URLs and explicitly label fictional-data fixtures.
- [ ] Run `npm run lint`, `npm run typecheck`, `npm test`, explicit SQL integration suite, browser/protected checks and `env -u DATABASE_URL npm run build`. Inspect scripts first, use no real credentials, and rerun typecheck after restoring only any generated build declaration/config edits. No migration hooks may be introduced into build/start.
- [ ] Write `docs/architecture/fuel-phase-3-activation.md`: event/recipient/reminder matrix, latency/logout limitations, environment/config names only, encryption/VAPID rotation and key-loss behavior, migration dependency/order/rollback review, trigger-agnostic invocation/adapter instructions, Hobby cadence limitation, optional Pro/compatible scheduler activation subject to separate cost authorization, safe worker retirement and server disable switches. Do not add a live cron job or pretend current Hobby meets required cadence.
- [ ] Report seven separate evidence categories: unit/mocked; disposable SQL integration; fixture browser; actual local service worker; synthetic push; real provider; physical iPhone/Android. Last two remain **not performed/pending separate authorization**. Physical phone instructions require an approved HTTPS environment/test account/device, Home Screen verification, app closed, lock screen, tap/login/access checks and both platforms; never infer success from emulation.
- [ ] Inspect diff/file manifest and worktree; confirm only Phase 3 scope, no secrets/unrelated changes/applied migrations/activation. If all applicable checks pass and remaining physical activation limits are honestly documented, create the **one** local implementation commit `feat: add installable Fuel portal and web push`, report exact SHA/files/results/screenshots/preview/prerequisites and stop. If SQL or required responsive/security checks fail/unavailable, report that limitation before claiming verified completion.

## Verification commands and result semantics

All commands below are execution-stage instructions; **none was run as new Phase 3 verification while writing this plan**.

```sh
npm run lint
npm run typecheck
npm test
npm run test:notifications:integration
node scripts/verify-fuel-phase-3.mjs
env -u DATABASE_URL npm run build
git diff --check
git status --short
```

Integration requires a verified disposable local target supplied through `FUEL_TEST_DATABASE_URL`; never fall back to `DATABASE_URL`. Browser verification requires deliberately started loopback base/current fixtures and local output paths. These scripts must refuse remote targets. Configure no shell substitutions that expose secret values.

Passing unit tests means the exercised behavior passed with mocks; passing SQL integration means the checked-in SQL ran against disposable PostgreSQL, not Neon production or the Neon HTTP transport end to end. Browser fixtures do not prove real authentication/database persistence. Actual worker registration/cache tests do not prove OS delivery. Provider accepted is not seen/read/acknowledged/completed.

## Spec coverage and self-review

| Approved requirement | Owning tasks / evidence |
| --- | --- |
| Existing contracts/version/auth/navigation/data reuse | Global Constraints, file map, Tasks 1–7 |
| Atomic business change/snapshot/intent, rollback/version races | 2, 5, 6, 7, 11 SQL |
| No user latency dependency on provider; no unreliable promise | 5, 6, 8; stalled-provider assertions, default no kick |
| Active session-derived multi-device ownership, endpoint security | 2, 3, 8, 11 |
| Logout priority, incomplete cleanup, account-switch fencing | 3, 4, 10, 11 |
| Correct recipients and unchanged-publication suppression | 1, 5, 6 |
| Quiet hours, deadlines, version equivalence, grouping/cancellation | 1, 7, 8 |
| Bounded/concurrent durable delivery, ambiguous provider outcomes | 2, 8, 11 |
| Replaceable scheduler, no paid activation or Mac scheduler | 8, 11 runbook |
| Installation identity/assets/gesture/device settings | 3, 9, 10, 11 |
| Privacy, safe deep links, login restoration, no tap mutation | 1, 4, 8, 9, 11 |
| Online-first/cache allowlist/update/retirement | 9, 11 actual worker |
| Clocker exclusion and approved UI/role regressions | 9, 10, 11 protected comparisons |
| Minimal unapplied migration and no customer test data | 2, 11 disposable-only harness |
| Honest physical/live testing boundary and activation handoff | Global Constraints, 11 |
| One local implementation commit; no Phase 4 | Global Constraints, 11 |

Planning self-review completed: existing request/auth paths were checked, the nonexistent employee request component was excluded, core/adapter signatures were reconciled, default-off/logout limits were made explicit and each spec section maps to the tasks above. This is document review, not evidence that future code/tests pass. No implementation/subagent dispatch is authorized by that self-review. The remaining gate is Jose's review of this plan and execution-method choice.

## Technical references for execution

Use current official documentation during implementation while retaining the approved repository versions/contracts. References consulted for planning:

- [Neon driver configuration](https://github.com/neondatabase/serverless/blob/main/CONFIG.md): parameterized batch transactions and abortable fetch options. The local SQL adapter does not prove hosted transport behavior.
- [DevTools ServiceWorker protocol](https://chromedevtools.github.io/devtools-protocol/tot/ServiceWorker/): synthetic local push injection is browser test evidence only.
- [WebKit Web Push requirements](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/): supported Home Screen context, permission gesture and Apple provider domain requirements.
- The approved spec contains the remaining Next.js, Web Push, service-worker and Vercel primary references.

## Review checkpoint

Stop here. Do not execute Task 1, install a dependency, generate product assets, prepare/apply a migration, start a server/HTTPS environment or configure a scheduler until the implementation-plan review gate is complete. Jose may select Native execution or Subagent-driven execution; preserve that choice. Any later real-delivery/physical-device/paid-hosting activation still requires its separate authorization.
