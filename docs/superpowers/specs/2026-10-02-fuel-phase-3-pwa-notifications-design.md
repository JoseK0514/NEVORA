# Phase 3: installable Fuel portal and targeted Web Push

Date: 2026-10-02. **Status: written design approved by Jose, including the delivery-latency and logout clarifications below; implementation-plan review is still required.** This document does not claim implementation or activation.

## Intent and boundaries

Make the existing portal installable, notify the correct person about a meaningful existing workflow event, open the relevant authenticated task, and stop reminders when that task is resolved. Management handles exceptions through its existing pages.

Use standards-based Web Push and the existing Fuel identity. No SMS/email integration, native application, inbox, chat, activity dashboard, automatic scheduling/swaps/coverage, new eligibility policy, or Clocker changes. Preserve the Phase 0–2 UI contract. No push, merge, deployment, live migration, paid provisioning, public tunnel, or staff campaign is authorized.

Written-spec approval permits the implementation-plan checkpoint. Implementation follows review of that plan and selection of its execution method. Approving either document does not authorize spending or activation.

## Verified starting point

- Branch: `codex/fuel-phase-3-pwa-notifications`.
- Worktree: `/Users/josek0514/.codex/worktrees/fuel-phase-3-pwa-notifications/Fuel-Scheduler-`.
- Exact base: `e27bcfdf895c72d2af469766d9b94af0dad900c8`.
- Its history includes Phase 0 `08e6386`, Phase 1 `4bd66c8` and `6d644c3`, and Phase 2 `bb3c95d` and `e27bcfd`; ancestry was checked locally.
- The desktop worktree tool failed because its calling clone lacks this object. The worktree was created from the verified Phase 2 repository, with no substitution from development.
- Other checkouts were preserved, including the dirty primary development checkout. This worktree was initially clean. Existing dependencies were copied locally without adding or changing versions; no product dependency was installed for design work. An initial dependency symlink was rejected by Turbopack and replaced with that local copy.
- Unchanged baseline: **lint, typecheck, 35 test files / 230 tests, and production build passed**. The build ran with `DATABASE_URL` removed from its environment. Next's generated `next-env.d.ts`/`tsconfig.json` edits were restored; application/configuration files remain identical to the base. These are baseline checks, not Phase 3 implementation, database, browser or device tests.

Applicable instructions: `~/.codex/AGENTS.md`; Superpowers brainstorming and worktree skills; Fuel Scheduler UI, auth-access, data-integrity, and regression-protection skills. Read `docs/ui/fuel-ui-contract.md` and `docs/architecture/fuel-automation-charter.md`. Current user approval of Phase 0–2 supersedes older pending-approval wording in those historical documents; their design and phase boundaries remain binding.

## Inventory and reuse

| Existing piece | Evidence at the base | Phase 3 treatment |
| --- | --- | --- |
| App Router | Next 16.3.6 / React 19.3.0; `src/app/app/layout.tsx` | Keep versions and `/app` role-aware entry; add portal-only metadata and setup controller |
| Authentication | `src/lib/auth/session.ts`, `src/app/login/actions.ts`; hashed opaque sessions, 14-day expiry, HttpOnly cookie, active-account check | Reuse identity and role checks; add installation detachment and validated login return destination |
| Roles / navigation | `src/lib/auth/permissions.ts`, `src/lib/navigation.ts`, `src/components/app-shell.tsx` | Employee/Lead self-service and Owner/Manager review remain unchanged; no new primary destination |
| Profile/settings | Shell's desktop profile and Employee mobile More profile; Owner-only `/app/settings` | Use profile disclosure for personal device settings; do not turn Owner business settings into employee settings |
| Publication history | `src/lib/data/publication-revisions.ts`, `src/lib/assistance/publication-diff.ts` | Reuse immutable snapshots, revision identities, and per-employee differences across both locations |
| Acknowledgements | `src/lib/data/acknowledgements.ts`, `src/lib/assistance/acknowledgement-state.ts` | These records, including equivalent unchanged employee shift sets, remain the acknowledgement truth |
| Notification events | `src/lib/assistance/notification-events.ts`, `src/lib/data/notifications.ts`; unique `event_key`, recipient, action link, read state | Extend this system into the durable outbox; no second notification inbox or event ledger |
| Availability | `schedule_week_settings`, submissions, existing Normal Availability and exceptions; `availability-submissions.ts`, `week-settings.ts` | Use actual deadline and submission marker; zero available hours with a submission is not missing |
| Requests | `requests.ts`, `exchanges.ts`, `callouts.ts` and their existing server actions | Attach transactional intents to successful state transitions; manual approvals remain mandatory |
| Manager attention | `src/lib/assistance/manager-actions.ts`, existing manager lists | Reuse review items and coverage evaluation, grouping push summaries; no notification-log dashboard |
| Scheduling | Phase 2 eligibility/coverage engine, `src/lib/date-utils.ts` | Reuse configured data and Puerto Rico time; do not invent coverage windows or new scheduling rules |
| Database | Neon serverless 1.1.0, parameterized queries, atomic CTEs and `sql.transaction` | Reuse HTTP batch transactions, advisory locks and bounded version retries |
| Assets / styles | `public/images/fuel-logo.png`, `BrandMark`, `NavIcon`, scoped raw CSS | Derive icon exports from the approved logo; keep palettes, typography, and control geometry |
| Hosting | Fuel Vercel dashboard, linked project `fuel-scheduler` | Hobby; Fluid Compute enabled; `iad1`; 1 vCPU / 2 GB; cron feature enabled but no jobs configured |

Important gaps confirmed in source: notification builders and `createNotification` are currently not invoked by business workflows. Publishing already records a snapshot atomically, but published shift mutations/exchange outcomes do not consistently create revisions. Several actions blanket-clear acknowledgements. There is no manifest, service worker, subscription persistence, delivery worker, or scheduled reminder processor in this base. Historical architecture documents describe intent, not verified live delivery.

## Approach comparison

| Approach | Trade-off |
| --- | --- |
| **Recommended: existing PostgreSQL notification outbox + trigger-agnostic bounded worker** | Reuses existing events/data, requires no notification vendor or queue service. A compatible scheduler supplies invocation cadence without owning notification policy or delivery state |
| Separate managed queue/scheduler | Can improve dispatch latency but adds another service, credentials, costs and operational boundary; do not provision in this phase |
| Hobby daily processing only | No upgrade cost, but cannot meet timely retry/deadline requirements. This is not an acceptable substitute for the requested behavior |

Prepare the recommended application architecture locally after the design and plan checkpoints are approved. Leave outbound delivery and scheduler activation disabled. Vercel Pro is one documented activation option, not an architectural dependency or an approved spending decision. Do not add an incompatible high-frequency cron configuration to the current Hobby project.

## Architecture and file boundaries

Pure policy stays in `src/lib/assistance/notification-events.ts` and focused `src/lib/notifications/` modules for recipient selection, reminder timing, privacy-safe payloads, safe destinations, endpoint validation and retry decisions. They take explicit business state and a clock; they do not read React state or call a provider.

`src/lib/data/notifications.ts` owns outbox persistence. New focused subscription/delivery repositories own device records and leases. Existing publication/request/availability repositories own the business writes and their notification intents in the same transaction. Server actions remain authorization/input adapters, not duplicate rule engines.

Proposed affected boundaries, to be refined in the reviewed implementation plan:

- `src/app/app/layout.tsx`, `src/components/app-shell.tsx`, a focused portal device-setup component, scoped additions to `src/app/globals.css`.
- `src/app/manifest.ts`, `public/fuel-portal-sw.js`, `public/fuel-portal-offline.html`, generated `public/icons/fuel-*` exports; targeted headers in `next.config.ts`.
- `src/lib/notifications/*`, `src/lib/data/notifications.ts`, new subscription and delivery repositories; extend existing event builders.
- `src/lib/data/publication-revisions.ts`, `schedules.ts`, `requests.ts`, `exchanges.ts`, `callouts.ts`, `week-settings.ts`, `acknowledgements.ts` and their affected actions.
- `src/lib/auth/session.ts`, `src/app/login/actions.ts`, `src/app/login/page.tsx`, activation return handling where needed.
- Authenticated `/app/api/push/*` route handlers for configuration/status, subscribe, unsubscribe and self-test; `/app/notifications/open` as a redirect guard, **not an inbox**.
- A protected `/api/internal/notifications/dispatch` endpoint and `/api/internal/notifications/reminders` endpoint, plus a bounded local worker entry for disposable tests.
- Minimal contextual before/after disclosure within the existing schedule acknowledgement area; request row anchors/focus for safe deep links. No other page restructuring.
- Migration `0007_portal_web_push.sql`, `.env.example` names only, package/lockfile for maintained `web-push` and its TypeScript types if required, focused tests and a handoff/activation runbook.

No framework/PWA wrapper, UI library, new icon family or Web Push crypto implementation is needed.

## Transactional business events

Reuse `notifications` as the per-recipient durable intent. Extend its metadata with environment, source kind/id/version, due time, expiry, urgency, cancellation and processing state. Preserve `read_at` compatibility, but never equate it with schedule acknowledgement. Existing historical rows are not opted into push or replayed.

**The business change and its notification intent must commit atomically in the same database transaction. A failed or rolled-back business transaction must never create a successful-change notification.** If intent persistence fails, the associated business transaction fails too; an after-commit best-effort intent insert is not an acceptable substitute.

The write pattern is:

1. Read required business state and its exact version; calculate recipients/differences using the existing pure helpers.
2. In one existing-driver transaction, acquire the common workweek/request lock, recheck the read version and expected status, perform the business change, record any publication snapshot, and insert notification intents plus future reminders.
3. If a version guard fails, abort the whole transaction and recompute, with at most three attempts. Intents must be conditional on the successful returned mutation, never merely on entering an action.
4. Commit the business change and durable intents, then return the successful business result. External delivery proceeds independently. A failed transaction leaves no success intent. Provider errors affect delivery records only.

Every application writer touching the same published week must use the same lock/version protocol; lock multiple weeks in sorted order. Reuse and consistently update each affected schedule's existing `updated_at` as a write version, including draft shift writes, and guard the read version vector alongside the latest revision and request status. A draft edit racing publication must trigger recomputation, not an outdated snapshot or recipient list. SQL reads in later statements see earlier writes in the same transaction. Do not rely on data-modifying CTE siblings seeing one another's updated tables: use their `RETURNING` values or separate ordered statements.

Publishing, published insert/update/delete, existing manual exchange completion and approved callout effects record the actual immutable state. Draft edits do not emit publication events. Unchanged republication and note-only unrelated edits do not notify employees or reset reminder budgets. Copy Last Week keeps its existing behavior; if it touches an already published week, its ordinary writes use this same notification boundary, without adding copy automation.

Preserve explicit acknowledgement actions. Replace blanket invalidation on affected published writes with the existing revision-equivalence logic: an unaffected person's prior acknowledgement remains valid; a genuinely changed assignment requires review. This implements the existing acknowledgement contract, not a new acknowledgement workflow.

## Event / recipient / destination matrix

All recipients must be active and currently authorized. Self-service reminders target Employee/Lead only; Manager/Owner actions use existing management authorization. Manager access is currently role-wide: do not invent a separate location permission model. Employee dispatch also rechecks current role/location eligibility and source ownership where relevant. A removed assignment can notify its former owner while that person still has applicable access.

| Meaningful event | Recipient | Existing task / expiry |
| --- | --- | --- |
| First relevant published assignment set | Included active accounts, determined from actual snapshots | `/app/schedule?week=…`; seven days at most, never beyond that week's end |
| Published assignment changed/removed/reassigned | Only affected prior/new assignees from both-location differences | Same schedule; generic push, before/after inside authenticated page; superseded employee versions cancelled |
| Schedule acknowledgement outstanding | Scheduled Employee/Lead whose existing acknowledgement state still needs review | Same schedule; bounded follow-up below |
| Availability nearing deadline | Active Employee/Lead whose submission marker is missing | `/app/availability?week=…`; deadline is hard expiry |
| Availability closed with missing submissions | One grouped summary per authorized Manager/Owner | Existing Manager Availability; no employee nag after closure |
| Time Off approved/declined | That request's owner | `/app/requests?tab=my&requestId=…`; maximum 72 hours |
| Swap participant response needed | Target participant while `EMPLOYEE_PENDING` | `/app/exchange?tab=requests&requestId=…`; source/target shift start or 72 hours, whichever earlier |
| Swap response declined / manager decision / confirmed manual coverage outcome | Relevant other participant, or both participants for a manager-confirmed outcome | Existing requests/history tab; skip redundant notice to the actor about their own successful action |
| Pending leave/callout or `MANAGER_PENDING` exchange | Authorized reviewers, grouped within a five-minute collection window | Existing relevant Manager review route; suppress if already resolved |
| Open coverage or configured coverage/Lead gap requiring attention | Authorized Manager/Owner only | Existing exchange/schedule route; stop when filled/cancelled/resolved or period passes |
| Callout decision | That callout's owner | Existing Shift Requests route; no absence reason in push |

Initial publication is evaluated per recipient's prior/current published shift set, not simply whether some other location previously published that week. Stable identities use the source transition/version and recipient. Outcomes with the same meaningful transition are idempotent.

No redundant requester submission push, broad employee coverage broadcast, invented future automation event, target-hours preference alert, missing-configuration nag campaign, or punch discrepancy alert. Future phases may supply successful transitions to these same builders, without implementing their workflows now.

## One low-noise reminder policy

One server-side configuration owns defaults; no browser timers. Reuse `America/Puerto_Rico` and Monday-through-Sunday workweeks. Persist UTC instants, evaluate quiet hours/calendar-day limits in Puerto Rico, and inject the clock in tests.

- Availability: one routine reminder due 24 hours before the actual deadline. If created inside that interval, schedule one eligible reminder at the next allowed time, never several catch-ups. If quiet-hour deferral reaches or passes closure, expire it.
- After closure: one grouped missing-submission summary per week/deadline version and manager. Recheck actual missing markers before dispatch. Deadline edits cancel/reconcile old intents without creating catch-up bursts.
- Acknowledgement: one follow-up 24 hours after the relevant meaningful publication, only while acknowledgement is outstanding and an upcoming assigned shift remains. Expire at the next relevant shift start or seven days/week end, whichever earlier. A publication too near the shift receives the initial event, not accelerated catch-up reminders.
- Routine quiet hours: 21:00 inclusive to 07:00 exclusive. Routine unresolved-item reminders: at most one per Puerto Rico calendar day across all installations of that account.
- Manager routine review notifications collect related pending items over five minutes. A stable summary key and per-item/day source keys in the existing notification metadata prevent repeat reminders for the same unresolved items; summary construction shares a manager/day transaction lock. No additional reminder ledger/table is needed. Different genuinely new items can enter a later grouped summary. Do not expose counts/names on the lock screen.
- Urgency is limited to an actual changed published shift or unresolved coverage period beginning within 12 hours. Those messages may be dispatched outside routine quiet hours, with expiry no later than the affected start. Ordinary requests/publications and every reminder remain routine. Urgency is a provider hint, not a promise to bypass OS settings.

Immediately before each attempt recheck source state, current access, submission/acknowledgement and effective publication version. A globally newer revision with the same employee shift set preserves acknowledgement equivalence and the original follow-up budget; a changed employee version supersedes old pending notices/reminders. Stop on resolution, filled/cancelled shifts, expired source, inactive account or lost access. Revalidation is mandatory even if cancellation was already recorded during the business write.

## Subscription ownership, permission and privacy

Add `push_subscriptions`: internal id, authenticated employee FK, server-generated installation-token hash, environment, endpoint fingerprint, protected subscription material, ownership generation, active/detached/invalid status, consent/update/expiry times and self-test throttle. Unique active installation/environment and endpoint ownership prevent duplicates. One account can have multiple installations.

Use a cryptographically random HttpOnly/Secure/SameSite installation cookie; the client does not choose an employee id or claim another installation. Return device status/public VAPID key only, never endpoints, auth material or private key. Enforce origin, JSON type/size, valid key encoding/length, active session and installation ownership on mutations; reject forged account fields. Use the existing session as identity.

Endpoint validation at enrollment **and dispatch** permits HTTPS/443 only, no credentials, fragments, IP literals or arbitrary hostnames. Use a reviewed provider allowlist with exact Google/Mozilla hosts and label-boundary Apple push subdomains plus provider path rules; unrecognized providers get a graceful unsupported explanation. Never accept an unrestricted client URL, follow redirects, or let the client configure a proxy. Tests cover lookalike domains and private/local destinations.

Store subscription material encrypted with standard authenticated encryption using Node's maintained crypto primitives and a dedicated server-side key; endpoint fingerprints support uniqueness without logging URLs. Web Push encryption/VAPID uses maintained `web-push`, not custom crypto. Key rotation requires controlled re-enrollment/retention handling, documented before activation. Log only internal delivery identifiers, coarse status and bounded counts; redact provider bodies/URLs.

On subscribe, an existing foreign-owned endpoint/installation is rejected rather than rebound. Account switching detaches the previous browser installation server-side, clears its local ownership generation/visible local notifications where possible, and requires a fresh explicit opt-in and fresh browser subscription for the new account. Concurrent stale tabs cannot restore the prior ownership because server session/installation generation must match.

**Authentication/session termination takes priority over notification cleanup.** Explicit logout always clears the authentication cookie and exits the signed-in application, independently of bounded server-side session-revocation and push-detachment attempts. A notification table error, timeout or unavailable provider must not prevent signing out. When the database is available, detach this installation, advance its ownership generation and cancel pending device deliveries transactionally; revoke the authentication session independently so failure of that push transaction cannot roll session termination back. Never contact a push provider to complete logout. Other opted-in devices are unaffected.

Attempt client unsubscribe, clear matching local notifications and mark the old installation generation suppressed locally; failures must not trap the user in the application. Retain only a server-verifiable, opaque pending-cleanup receipt/installation proof when reconciliation is incomplete, with bounded lifetime and no subscription secrets or employee details. On the next healthy request, reconcile that receipt before enrollment or account switching; the worker also reconciles detached/invalid installations and rejects generations whose associated authentication session was explicitly revoked. Reconciliation is idempotent. The installation cookie supports cleanup even after the old session expires. A new account must obtain a fresh explicit opt-in and fresh subscription; an unresolved or foreign-owned installation/endpoint cannot be silently rebound or inherited.

Dispatch revalidates current ownership generation, account/access and revocation state immediately before delivery and fails closed when that state cannot be read. Do not describe pending server cleanup as completed: if all durable storage is unavailable, browser sign-out/local suppression can succeed while server revocation/detachment still awaits healthy infrastructure and receipt reconciliation. Already accepted provider messages may be in flight; local generation checks suppress stale-account display where possible. No claim of instantaneous global revocation during a complete storage outage. This recovery limitation never permits cross-account inheritance or weakens enrollment ownership checks.

Expired portal sessions do not by themselves erase deliberate device consent; generic notifications can still arrive for that installation, but opening protected details requires login. Deactivation and lost role/location access suppress delivery at dispatch, and stale subscriptions are revoked/cleaned. Permission changes reconcile on portal open/visibility; unsubscribe works immediately. Provider 404/410 clears invalid subscription material. No promise that already delivered OS notifications can always be recalled.

Default-off delivery, environment-scoped rows/keys and a separate test database prevent preview using production subscriptions. Do not replay historical outcomes to a newly opted-in device. Later due reminders may target a new device only when their task is still outstanding.

## Durable delivery and execution

Add `push_deliveries`, unique by notification intent + subscription generation. It stores status, attempt count, due/expiry time, lease token/lease expiry, provider acceptance time and coarse error class. Statuses: queued, processing, provider accepted, retry pending, failed, expired, cancelled, no active subscription. Recipient-level no-subscription outcomes are recorded without fabricating provider acceptance.

Claim due rows atomically with `FOR UPDATE SKIP LOCKED` and a two-minute lease; commit claims before contacting a provider. Only the matching lease token can finish that attempt. Expired leases recover after interruption. Repeat business/task/access checks after claiming and just before sending. A last-moment state change or ambiguous provider acceptance remains possible; document it rather than claiming exactly-once delivery.

Five attempts maximum: initial attempt, then approximately 1, 5, 15 and 60 minutes with bounded deterministic jitter. Honor bounded `Retry-After` within event lifetime. Retry network ambiguity, 408/429 and provider 5xx; 404/410 invalidates that subscription; permanent request/configuration errors fail without retry storms. Do not let one device failure prevent other devices' delivery.

Use explicit short provider TTL bounded by event expiry, stable privacy-safe notification tag/topic, and persistent acceptance state to reduce duplicates. The Web Push library creates standards-compliant request details; a reviewed HTTPS transport provides an absolute abort deadline, restricted destination, no redirects and bounded response bytes. Socket timeout alone is not a full-request deadline.

**Business-action latency must not depend on push-provider response time.** Publish Schedule, Time Off decisions, request decisions and schedule changes commit their business change and durable notification intent, then return the successful business result. Their request path never waits for employee-device fan-out, provider delivery or retry processing. External delivery runs independently in the durable worker; provider latency cannot make a manager wait while devices are contacted.

Separate prompt event dispatch from retry scanning and due-reminder processing. An optional post-commit worker kick may enqueue/invoke a supported independently executed worker only if demonstrably nonessential and constrained to a negligible request-time budget; it must not execute device delivery inline. This phase defaults to no request-path kick until a compatible mechanism and latency evidence exist. Failure or absence of a kick leaves intents durable and does not alter the successful business result. No unawaited serverless promise, browser timer or in-memory queue is the reliability mechanism.

**Push-provider delivery, retries and failures occur outside the business transaction.** Provider calls never execute while the publication/request transaction is open. Once that transaction commits, provider failure cannot roll back a valid schedule publication, request decision or other business action, and must not be presented as failure of the committed action. Delivery state records the separate failure for retry or expiry.

Worker batches default to at most ten devices, concurrency two, twenty-second processing budget and eight-second attempt deadline; stop starting work when insufficient budget remains and release unattempted claims. Use Node runtime and explicit endpoint budgets within host limits. Both internal endpoints require a configured server-only bearer secret, timing-safe validation, no public session fallback and no cache. Missing secret means denied access. Workers return aggregate technical outcomes only.

## Scheduler independence

**Notification/event architecture is separate from scheduler integration. Vercel Pro is not a hard dependency.** The reusable server worker owns due-intent selection, reminder revalidation, leasing, provider dispatch, retry decisions, cancellation and expiry. Its callable entry points receive explicit configuration, repositories, provider transport and clock/budget inputs; they do not depend on Vercel request headers, cron expressions, platform SDKs or platform-specific environment variables.

Protected HTTP handlers and a bounded Node worker entry are thin invocation adapters around the same worker. A Vercel cron adapter may invoke those handlers; another compatible, separately authorized scheduler may invoke the same protected HTTPS endpoints or run the same Node entry in an appropriate server environment. Replacing the scheduler changes invocation/configuration only, without rewriting events, recipient rules, subscriptions, outbox records, leases, reminder policy or delivery/retry logic.

Due times, retry times, expiry and completion are persisted in PostgreSQL rather than owned by a scheduler's timers or memory. Prompt dispatch is an independent worker invocation, never inline delivery in a business request; periodic retry scans and due-reminder processing use the same reusable core with separate invocation schedules. Cadence, credentials and execution budgets must be verified for whichever activation option is chosen. No scheduler, paid upgrade or service is provisioned by this design checkpoint.

## Installation and device UI

Manifest identity: full name `Centralized Fuel Employee Portal`, short name `Fuel Portal`, stable id `/app`, start URL `/app`, explicit scope `/app`, display `standalone`, Fuel espresso theme `#2b1a12` and ivory background `#fffdf9`. Visible product branding remains unchanged. Export approved logo-based 192/512px ordinary and maskable icons with safe padding, plus a 180px Apple touch icon. Metadata is linked in the authenticated portal layout, not Clocker's layout.

Use the existing profile area as a compact nonmodal device-setup disclosure: desktop profile control, Employee/Lead mobile More profile, and Manager/Owner mobile profile/role control. No primary navigation entry or dashboard section. A one-time dismissible setup offer after authentication uses this same surface; it does not block work or request OS permission. Preserve keyboard focus and avoid opening over an active form interaction.

Flow:

1. **Keep Fuel Handy** — “Add Fuel to your Home Screen for quick access to your schedule.” Use a real deferred browser install event when available. Otherwise show instructions without claiming installation occurred.
2. iPhone/iPad: Share → Add to Home Screen; enable “Open as Web App” if the browser presents it; open Fuel from the new icon. Detect standalone using supported media queries and iOS standalone signal. iOS push setup requires the supported Home Screen context.
3. Android: use the browser's actual install prompt when provided, or its menu instructions. An install event/standalone signal describes observed state only; do not infer installation from someone reading instructions.
4. **Stay Updated** — “Receive important schedule changes and reminders.” Equal 44px **Enable Notifications / Not Now** peers. Request permission directly within the Enable gesture; never on load or after an asynchronous gesture-breaking preflight. Prepare capability/configuration before enabling that action.
5. “Not Now” suppresses automatic offers for that account/installation until explicitly reopened. Denied permissions are never requested repeatedly; give OS/browser settings guidance. Unsupported/revoked/configuration-unavailable states explain the state without blocking the portal.
6. Device settings show enabled/disabled state and **Turn Off**. A **Test Notification** control is available only in deliberately authorized test configuration, for this authenticated account's current opted-in installation, once per five minutes. Production campaigns and arbitrary recipients are impossible through this endpoint.

Reuse existing local action variants, 44px/22px capsule geometry, centered 12px/600 labels, peer sizing, focus, disabled and error states. Scope raw CSS to the setup component. Normal screens with the offer dismissed remain visually unchanged except the approved profile affordance and contextual schedule change disclosure. No personal setup, service-worker registration or subscription prompt in `/clocker/*`.

## Payloads and safe task opening

Use a separate privacy-safe push projection, not the existing builder's body blindly: “Your Fuel Schedule Is Ready,” “Your Fuel Schedule Changed,” “Fuel Request Update,” or “Coverage Needs Attention,” with generic open-to-review text. No names, medical/absence reasons, management notes, PINs, earnings or payroll details. Detailed changes stay behind authentication.

The payload carries a random notification id, validated kind, expiry, stable tag and opaque installation ownership generation. It does not carry a trusted arbitrary redirect or employee id. The worker constructs only the fixed same-origin `/app/notifications/open?notificationId=…` URL after validating the envelope. A tap navigates; it never approves, accepts, acknowledges or punches.

The server guard resolves the persisted recipient and source, checks current identity/access, validates allowed existing routes/query parameters, and redirects to the existing task. If signed out, preserve only this validated local destination through login/activation. Validate the return destination both when rendering the form and after successful authentication; reject external, protocol-relative, encoded and lookalike paths.

A different signed-in user, removed/outdated item or lost access receives a generic unavailable explanation/authorized fallback, without source details. The schedule view exposes a small collapsed “What changed” disclosure using existing revision differences and current employee ownership. Request links use existing `requestId`/tab context and accessible row focus. Do not treat provider acceptance, a tap or `read_at` as task completion.

## Service-worker scope, offline and updates

Register the root-served `fuel-portal-sw.js` with explicit scope `/app`, so the exact `/app` entry and `/app/*` are covered. Because scope matching is prefix-based, every handler independently checks exact `/app` or `/app/…`; lookalikes such as `/application` are pass-through. Clocker and authentication routes are outside operational handling. Test both navigation from inside a controlled tab and fresh direct Clocker entry.

**`/clocker/2` and `/clocker/110` remain entirely outside Phase 3.** Neither route registers the portal worker, links portal PWA setup metadata, shows installation/notification prompts, enrolls a shared-device subscription or starts employee notification flows. Worker handlers pass through Clocker requests without interception, caching or offline substitution, including requests initiated from a previously controlled portal tab. Preserve all Clocker workflows and transactions; protected comparisons must verify both routes and tablet orientations.

Online-first: intercept only safe portal GET navigations, request the network without storing private responses, and return a static public offline fallback only on connection failure. Preserve server HTTP/auth errors and redirects. Never cache schedules, profiles, request details, APIs, RSC responses, login responses, sessions, employee time, or Clocker traffic. No offline mutations, background business sync or fake success.

CacheStorage allowlist: the self-contained public offline HTML and explicitly named Fuel icon exports only, in a versioned Fuel-owned cache. No general runtime asset cache, application chunks, query-bearing image/API URLs or broad precache glob. Local worker storage contains only the opaque device ownership generation needed to suppress stale-account notifications; it is not a private data cache.

Use `event.waitUntil` for push display/notification clicks and subscription reconciliation. Validate and compare the local installation generation before displaying. Clear matching local notifications on detach where possible. Do not depend on a silent push to update operational data.

Updates wait through the normal worker lifecycle. No automatic `skipWaiting`, forced page reload or takeover of an open unsaved form. New versions are backward-compatible with the small push envelope. A waiting-update message may offer reopening Fuel after finishing work, without reloading automatically. Document rollback by serving the previous compatible worker or a same-scope retirement worker that deletes only Fuel-owned caches and unregisters; server-side delivery can be disabled independently. Never unregister another app's workers/caches.

## Database, configuration and hosting activation

Prepare only `0007_portal_web_push.sql`: minimal `notifications` extension, `push_subscriptions`, `push_deliveries`, uniqueness/checks/claim indexes and reminder deduplication fields. Reuse employee, availability, schedule, exchange and acknowledgement tables. Do not backfill old notifications into push. Migration depends on the existing 0001–0006 sequence; **0006 is prepared and unapplied from the prior phase**, and actual remote migration state is not verified. Inspect actual applied state only during a separately authorized activation. Do not apply any migration to existing Neon/dev/production.

Configuration names, never values:

- `DATABASE_URL` — separate environment database.
- `FUEL_PORTAL_ORIGIN` — canonical HTTPS origin; loopback only for disabled/local tests.
- `PUSH_FEATURE_ENABLED`, `PUSH_DELIVERY_ENABLED` — default false; installation metadata/offline behavior can be verified locally without delivery.
- `PUSH_ENVIRONMENT` — server-owned test/production isolation; reject production delivery in preview/test contexts.
- `PUSH_VAPID_PUBLIC_KEY`, `PUSH_VAPID_PRIVATE_KEY`, `PUSH_VAPID_SUBJECT` — runtime configuration, separate keypair per environment; private key server-only.
- `PUSH_SUBSCRIPTION_ENCRYPTION_KEY` — dedicated at-rest key in the approved secret store.
- `NOTIFICATION_WORKER_SECRET` — platform-neutral internal worker authorization, separate per environment. A Vercel cron adapter may map its required `CRON_SECRET` to the same authorized credential; that alias stays in the adapter and does not enter notification business logic.
- `PUSH_TEST_DELIVERY_ENABLED`, `PUSH_TEST_ACCOUNT_IDS` — default false/empty; server-only authorization of deliberately selected test accounts, with delivery restricted to the current opted-in installation.

Hosting evidence: the actual Fuel dashboard showed Hobby, Fluid Compute enabled, `iad1`, 1 vCPU / 2 GB, and an empty Cron Jobs page. The connected Vercel app listed an unrelated project and its project-detail call had an argument-validation defect; hosting facts were confirmed through read-only signed-in dashboard UI instead. No settings were changed. Production currently follows `main`; this task does not modify or deploy it.

Current official Vercel documentation limits Hobby cron to daily runs with up to hourly invocation variance. That cannot provide five-minute retries/reminder processing. Fluid Compute supports the proposed bounded worker execution, but execution capacity is different from scheduler cadence. Do not configure multiple staggered daily jobs to circumvent the plan restriction.

Documented activation options:

| Option | Capability / authorization boundary |
| --- | --- |
| Vercel Pro with five-minute dispatch/retry scans and fifteen-minute reminder scans | One supported option. Current platform price is **$20/month**, including one deploying seat and $20 usage credit; additional seats/usage can cost more. Requires separate spending and activation authorization; it is not a dependency of the notification engine |
| Another compatible scheduler using the protected HTTPS handlers or server-side Node entry | Reuses the same durable worker. Verify actual entitlement, cadence, execution limits, security and cost before proposing activation; do not assume an uninspected service is free or already available |
| Current Hobby daily cron alone | Cannot meet the required retry/reminder cadence; document the limitation rather than silently reducing the requested behavior |

No hosting option is purchased or provisioned here. Do not upgrade Vercel, add a paid service or make a spending decision. No separate Web Push vendor or Apple Developer membership is required for standards-based Web Push. Leave scheduler configuration as documented activation instructions until the chosen option is explicitly authorized and its entitlement is verified.

Activation prerequisites: spec/plan/UI approval; reviewed migration sequence and environment/rollback selection; supported hosting cadence and spending approval; separate protected credentials/database; authorized HTTPS test environment and opted-in test account/device; physical device tests; then separately authorized migration/deployment/opt-in rollout. No always-on Mac production scheduler or public tunnel.

## Verification and handoff contract

Add focused behavior tests, not constant/markup checks:

- Permission gesture and allowed/default/denied/unsupported/revoked states; standalone/install-event truth, iOS instructions, dismissal and device settings.
- Session-derived ownership, forged ids, malformed/larger bodies, origin/CSRF rejection, provider URL lookalikes/private endpoints, encryption/redaction, duplicate/current-generation constraints, multi-device enrollment, logout/expired-session/account-switch races and deactivation/access loss. Prove that push-cleanup failure/timeouts still clear the authentication cookie and return sign-out, local old-generation suppression is attempted, incomplete cleanup remains identifiable, healthy reconciliation is idempotent and another account cannot inherit the old subscription.
- Initial/changed/unchanged/unrelated publications across both locations, before/after ownership, successful/failed transactional outcomes, version guards/retries and equivalent acknowledgements. A never-resolving/slow provider must not delay the business response; business actions must complete without invoking the provider, leaving durable intents for independent processing.
- Deadline/submission-zero-hours precedence, limited acknowledgement reminders, resolution/deadline edits/supersession cancellation, Puerto Rico 21:00/07:00/day boundaries, no catch-up burst and grouped manager summaries.
- Lease recovery and two concurrent workers, duplicate suppression, bounded attempts/lifetimes/Retry-After, provider acceptance ambiguity, invalid-subscription cleanup and no-subscription state.
- Scheduler independence: the same worker produces the same persisted decisions through different invocation adapters; platform-specific authentication/configuration remains outside business policy, and provider failure cannot undo an already committed business action.
- Same-origin deep links, expired login return, forged recipient, removed source, changed user/access, taps without mutations and privacy-safe envelope.
- Actual local service-worker registration/scope at `/app` and `/app/*`, lookalike/Clocker pass-through, push/click event behavior with synthetic fixture events, offline fallback, CacheStorage contents and no private/RSC/auth/API caching; update waiting and unsaved-form preservation.

Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, role regressions and focused new suites. Test real source components in isolated fictional-data browser fixtures at 320, 375, 390, 430, 768, 1024 and 1440px, Chromium/WebKit where available. Capture the unchanged base before editing; compare all Phase 1 Manager, Employee/Lead Home/Schedule/Availability/Time Off/Shift Requests/My Time and both Clocker routes. Test Clocker 1024×768 and 768×1024. Approved setup additions need screenshots of permission/install/error/disabled/focus states, alignment/contrast/safe-area checks and keyboard dismissal.

Disposable local PostgreSQL integration tests must prove atomic rollback, unique enrollment, ownership detachment and concurrent leasing. If that environment is unavailable, report the missing integration evidence; query mocks cannot prove PostgreSQL concurrency or migration application. No existing database may be substituted.

Final evidence must distinguish unit/mocked tests, disposable-database integration, fixture-browser checks, actual local service-worker tests, synthetic push events, real provider delivery and physical iPhone/Android checks. **Local, browser and service-worker tests are not proof of real iPhone or Android delivery.** Real provider delivery, closed-app physical delivery and iPhone Home Screen verification remain pending until Jose explicitly authorizes an HTTPS test environment and an opted-in test account/device. Physical Android verification is also a separate activation step. Do not create a tunnel, public preview or deployment to perform those tests without that authorization, and do not mark unperformed device/delivery checks as passed.

After the approved plan is implemented and applicable verification passes, create one local implementation commit `feat: add installable Fuel portal and web push`, without amending prior phases. Report exact changed files/commits, screenshots/fixture preview, event/reminder matrix, configuration names, unapplied migration dependencies, hosting/cost limitations, test boundaries, physical/live tests pending, activation prerequisites and worktree state. Stop for review; no Phase 4 work.

## Official technical references

Consulted 2026-10-02. Repository code/version remains the implementation baseline; examples with in-memory subscription storage are not suitable here.

- [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps): manifest and standards-based integration.
- [WebKit: Web Push for iOS/iPadOS Home Screen apps](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/): explicit gesture, Home Screen context and Apple provider domains.
- [WebKit: Safari 26 Home Screen behavior](https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/): current “Open as Web App” installation choice.
- [W3C Push API](https://www.w3.org/TR/push-api/) and [Service Workers](https://www.w3.org/TR/service-workers/): subscription/lifecycle/scope behavior.
- [Maintained Node Web Push implementation](https://github.com/web-push-libs/web-push): supported request generation, TTL, urgency/topic and timeout limits.
- [Neon serverless driver](https://github.com/neondatabase/serverless) and [configuration](https://github.com/neondatabase/serverless/blob/main/CONFIG.md): non-interactive HTTP transaction model.
- [Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing), [function limits](https://vercel.com/docs/functions/limitations), [Pro pricing](https://vercel.com/docs/plans/pro-plan): cadence, bounded execution and activation cost.
