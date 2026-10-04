# NEVORA Phase 3 activation evidence

This runbook records the completed local implementation and its activation boundaries. No delivery environment, provider enrollment, live migration or physical-device verification has been activated.

## Task 3 endpoint allowlist evidence (2026-10-02)

`src/lib/notifications/subscription-service.ts::validatePushEndpoint` is the shared enrollment/dispatch validator. It makes no network requests. Require HTTPS with only default/explicit 443, no credentials, fragment, query, backslash, encoded path tricks, IP/local host or lookalike suffix. Preserve complete validated URLs internally; never log or expose endpoints. Unknown providers/paths remain unsupported until explicitly reviewed.

| Provider | Reviewed production host/path | Primary evidence |
| --- | --- | --- |
| Chromium / Google | exact `fcm.googleapis.com`, `/fcm/send/<opaque-token>` and `/wp/<opaque-token>` | [Chromium official push constants](https://chromium.googlesource.com/chromium/src/+/refs/tags/141.0.7390.94/components/push_messaging/push_messaging_constants.cc) declares both production prefixes. Its staging/preprod prefixes are excluded. |
| Mozilla | exact `updates.push.services.mozilla.com`, `/wpush/v1/<opaque-token>` and `/wpush/v2/<opaque-token>` | [Mozilla HTTP endpoint documentation](https://mozilla-services.github.io/autopush-rs/http.html) documents the production host and `/wpush/v1/` family; [Mozilla primary security report](https://bugzilla.mozilla.org/show_bug.cgi?id=1865488) records the `/wpush/v2/` subscription form. The validator permits the reviewed v1/v2 versions only. |
| Apple | DNS label boundary subdomains of `push.apple.com`, nonempty provider path | [WebKit Meet Web Push](https://webkit.org/blog/12945/meet-web-push/) explicitly instructs endpoint allowlists to accept any subdomain of `push.apple.com`. Root domain and lookalikes are excluded. |

Dispatch validates again immediately before sending and disables HTTP redirect following; an allowed endpoint redirecting elsewhere is never trusted. Endpoint and redirect behavior is covered with local transport doubles. No provider request was made.

## Installation and protection handoff

The signed/encrypted HttpOnly installation cookie is renewed for 365 days by authenticated status/enrollment; this deliberately outlasts the ordinary 14-day portal session. Its random token hash and generation are server-issued. Session expiry alone neither detaches an installation nor changes device consent. Active same-owner enrollment supplies the current client `ownershipGeneration`, preserves the server generation and consent, and renews only encrypted material/session association. Endpoint replacement rotates generation; detach/invalid tombstones require explicit fresh opt-in and a new server-issued installation proof. Foreign installation/endpoint ownership is refused.

Pending-cleanup receipts contain only opaque installation/session hashes, environment/generation and issued/expiry dates. Standard AES-256-GCM protects receipt contents; an HKDF purpose-separated HMAC-SHA256 signing key authenticates the envelope. Lifetime is bounded to at most 14 days and verified before reconciliation; installation cookies and subscription material use separate HKDF/AAD purposes. At-rest material is bound to environment, installation hash and ownership generation. Worker decryption must supply those current record fields. Key rotation needs controlled retention/re-enrollment authorization before activation; do not silently accept an old protected record under a new key.

Session-cookie clearing/revocation and login/account-switch orchestration reconcile a valid receipt before switching/enrolling, issue a fresh proof only after verified cleanup when the prior installation belongs to another account, and require a fresh browser subscription/explicit opt-in. An invalid, expired, unavailable-key or unreconciled receipt fails closed for enrollment; authentication termination must remain independent. The final session path preserves independent authentication termination.

`DeviceStatus.dismissalScope` is used solely as a local preference key for Not Now. It is an opaque server-derived HMAC bound to authenticated account+installation, created by status before opt-in; it is never an identity, installation proof or authorization credential. Browser capability checks remain client-side; server `supported` reports server feature/configuration availability.

Task 11 executed the emitted SQL against disposable loopback PostgreSQL with fictional records, covering: synchronized same-owner fresh-enrollment and generation-rotation races, foreign-account races for the same installation and for a shared endpoint across installations (one exact persisted winner, one conflict), sequential ownership refusal, multiple installations, independent environments, stale generation/tombstone refusal, atomic self-test throttle + outbox rollback, exact current-subscription SELF_TEST targeting, and session-expiry/renewal consent preservation. No existing remote database was read or migrated for this task.

## Final Phase 3 operating contract

The product is **NEVORA**, the module is **Workforce**, and Fuel Coffee Drive is the workspace. Install icons derive from the official NEVORA symbol; the wordmark preserves its original navy lettering and cyan A detail. The regular `/fuel-portal.webmanifest` route is linked only by the authenticated `/app` layout. Its name/short name are NEVORA, id/start/scope are `/app`, theme is `#20232D`, and background is `#F6F6F8`. There is no root file-based manifest. `/clocker/2` and `/clocker/110` receive no portal setup, prompts, metadata, enrollment, caching or offline substitution.

Implementation is prepared locally. Outbound delivery and scheduler activation remain **off**. No migration has been applied to an existing development, Neon or production database. Task 11 applies exact migrations 0001–0007 only to newly created, ownership-marked `fuel_phase3_test_*` databases on loopback and drops those databases after testing. Its local `pg` transport proves the executed PostgreSQL statements; it does not prove the production Neon HTTP transport or a real authenticated Next-to-database flow.

| Source/event | Authorized recipients | Timing and end condition |
| --- | --- | --- |
| First meaningful published assignment / changed assignment | Affected active assignees, including still-authorized former assignees | Commit-time intent; urgent only for actual changed published work beginning within 12 hours; at most seven days/week end |
| Outstanding acknowledgement | Employee/Lead with outstanding personal effective revision and upcoming assignment | One follow-up after 24 hours; stops on acknowledgement, meaningful supersession or next shift start |
| Availability deadline | Active Employee/Lead without submitted marker, including valid zero-hour submissions as completed | Approximately 24 hours before actual deadline; never after closure; one per item/account/workspace-local day |
| Closed availability | Current Manager/Owner reviewers | One grouped summary per deadline version; current missing submissions rechecked |
| Time Off outcome | Request owner | Successful approved/denied transition; at most 72 hours |
| Swap response | Target participant | While `EMPLOYEE_PENDING`; before affected shift start or 72 hours |
| Exchange/callout outcome | Relevant participant(s), excluding redundant notice to successful actor | Existing successful transition only; request/current access rechecked |
| Pending review / open coverage / configured coverage gap | Current Manager/Owner reviewers | Five-minute collection for routine groups; distinct-item day budget; stop when resolved or coverage period begins |
| Explicit self-test | The signed-in test account's current installation and generation only | Five-minute throttle, no fan-out; queued is not received |

Business writes, immutable publication snapshots, cancellations and intents commit atomically. There is no provider call, fan-out, retry or background-promise reliability dependency in a business request. Workers revalidate current source, access, effective revision, consent/session association and generation immediately before sending. Provider acceptance is not display, seen/read, acknowledgement, submission or completion. Notifications never include private shift details, employee names, absence reasons or counts on the lock screen; details stay inside the authenticated destination.

Routine quiet hours are 21:00–07:00 in the persisted configured workspace timezone; Fuel remains `America/Puerto_Rico`. Workers load that workspace policy before reminders/dispatch; local-day budgets and strict source-boundary conversion use the same zone. Malformed, nonexistent or ambiguous legacy civil boundaries suppress the affected work rather than guessing an instant. Default dispatch uses ten deliveries per batch, two lanes, two-minute database-time leases, a twenty-second invocation budget, and an eight-second attempt deadline. There are at most five attempts with roughly 1/5/15/60-minute retry intervals, bounded jitter and Retry-After. Original source expiry is never extended. A lost provider response or an abort after database commit remains ambiguous; lease tokens, generation checks and stable tags support recovery without an exactly-once display promise. A trigger's cadence adds latency to these minimum due/retry times; no precise delivery-time guarantee is made.

## Configuration and activation prerequisites

Names only; values belong in the approved secret/environment store:

- `PUSH_FEATURE_ENABLED`, `PUSH_DELIVERY_ENABLED`, `PUSH_TEST_DELIVERY_ENABLED`
- `PUSH_ENVIRONMENT`, `PUSH_TEST_ACCOUNT_IDS`, `FUEL_PORTAL_ORIGIN`
- `PUSH_VAPID_PUBLIC_KEY`, `PUSH_VAPID_PRIVATE_KEY`, `PUSH_VAPID_SUBJECT`
- `PUSH_SUBSCRIPTION_ENCRYPTION_KEY`, `NOTIFICATION_WORKER_SECRET`
- Existing application `DATABASE_URL` and session configuration remain unchanged.

Before any activation, obtain separate authorization for the target HTTPS environment, the database migration/rollback review, deliberately opted-in fictional test accounts/devices, provider calls, and any cost-bearing scheduler/plan. Confirm the repository's actual current hosting entitlement. The previously observed Hobby cadence cannot meet the required timely retry/deadline behavior; an optional Pro plan or a compatible independently authorized scheduler must provide an appropriate cadence. Do not add a high-frequency cron to Hobby, use a Mac background scheduler as production infrastructure, or provision/upgrade anything through this runbook.

The core is trigger-agnostic. A separately approved scheduler can invoke authenticated `GET` or `POST` on `/api/internal/notifications/dispatch` and `/api/internal/notifications/reminders` using the configured bearer secret, or use `npm run notifications:worker -- dispatch` / `-- reminders` in an approved runtime. The adapter supplies invocation; it does not replace source checks, quiet hours, budgets or leases. Preserve aggregate-only reports and no-store responses. Do not log bearer values, endpoints, key material, installation/session hashes or recovery receipts. Unauthenticated/missing configuration returns unavailable/disabled behavior, never implicit delivery.

## Migration and rollback review

For Phase 3, apply 0007 only after the target has the repository's exact 0001–0006 dependencies and after separate migration authorization. It extends the existing notification outbox and adds subscription/delivery tables and indexes; historical notification rows remain `legacy` and are not replayed. Inspect constraints, existing data/index names, backup/restore capability and deployment compatibility before live migration. Build/start have no migration hooks. The disposable integration helper rejects `DATABASE_URL`, remote hosts, an existing database, an unrecognized ownership marker and missing teardown consent.

For a live rollback, first disable delivery and enrollment, stop future invocations, and allow active worker budgets/leases to expire. Retain existing tables/history and encrypted ownership evidence until a reviewed retention/migration plan authorizes changes. Reverting application code does not authorize dropping notification data or clearing pending receipts. Do not infer migration reversibility from a disposable database teardown.

VAPID rotation changes the subscription's application-server key and requires deliberately coordinated browser re-enrollment; do not silently reuse subscriptions tied to an old key. Subscription encryption/receipt keys are purpose-separated and bound to environment/installation/generation. The implementation reads one configured key, not a multi-key rotation ring. Plan retention/re-enrollment before rotation. Losing that key makes protected material and receipts unreadable; it fails closed and requires reviewed recovery rather than bypassing ownership or deleting unresolved evidence.

## Logout, browser coordination and recovery limitations

Authentication-cookie clearing and independent session revocation take priority over push-table/browser cleanup. Current and protected associated former sessions are revoked independently; healthy recovery retires every verified signed obligation. Bounded recovery saturation, missing keys and invalid/expired receipts remain fail-closed for enrollment. Natural cookie/session expiry alone does not revoke device consent. A native sign-out form must continue when browser storage, service workers or cleanup fail. An already displayed OS notification cannot be reliably recalled.

Native enrollment/unsubscribe is serialized with an exclusive origin-wide Web Lock. Storage writes require verified readback. Missing Web Locks or failed storage coordination makes setup unavailable or prevents destructive cleanup; signout/server detachment remain available. The callback holds the lock until the actual native promise settles, even after the UI stops waiting. A queued lock request is canceled after 2.5 seconds. The enrollment UI wait is bounded at twenty seconds; those limits are not claims that the browser operation completed.

An opaque `fuel-portal-subscription-operation` marker protects against document teardown releasing a lock before native completion is known. Only observed settlement and successful marker clearing recover automatically. Reload, account switch, Not Now and Turn Off never silently reset an unresolved marker. Turn Off detaches server delivery authorization; it cannot prove physical browser unsubscribe or resolve a lost native operation. The UI now states this distinction and preserves recovery guidance when settings reopen.

Deliberate recovery requires first establishing that the old native operation can no longer affect the installation, then a separately reviewed browser installation reset/recreation and fresh explicit opt-in. There is no automatic marker-reset button. Never clear the signed server receipt as a UI convenience or infer that resetting one browser tab resolves other tabs/devices.

## Service-worker retirement

Serve the same script URL/scope with its reviewed retirement flag enabled after disabling server enrollment and dispatch. Let the normal waiting lifecycle complete after users save work and close portal tabs; never force `skipWaiting`, claim or reload an unsaved page. Retirement removes only the public offline-cache family and unregisters itself. Opaque suppression/ownership state remains to fence delayed notifications. Merely rolling application files back does not unregister an installed worker; retain the retirement script through the agreed client-update window.

## Evidence boundaries and physical acceptance checklist

The Task 11 report records commands, counts, file manifest, logs and screenshot indexes separately for:

1. Unit/mocked tests: deterministic policy, action and adapter assertions.
2. Disposable SQL: actual ordered PostgreSQL statements and independent connections; no Neon HTTP transport proof.
3. Fictional browser fixtures: actual React hydration and real Web Locks with explicitly doubled browser permission/native push APIs and server responses; no authenticated database persistence proof.
4. Actual local service worker: real registration, exact `/app` scope, nested control, CacheStorage/IndexedDB, offline pass-through/fallback, waiting update and retirement. Actual Next Clocker/login HTML is checked separately with no real credentials.
5. Synthetic push: Chromium CDP delivery into the unmodified local worker. Native `showNotification` invocation is observable; headless OS retention is unstable. Click uses an explicitly synthetic event and notification/lifetime doubles with real worker ownership and client navigation. This is neither a native notification click nor an OS-display claim.
6. Real provider: **not performed; pending separate authorization**.
7. Physical iPhone/Android: **not performed; pending separate authorization**.

After separate authorization, use the approved HTTPS environment, deliberately opted-in test account and actual device. On iPhone, verify Safari Add to Home Screen/Open as Web App and launch from that icon before requesting permission; on Android, verify install/standalone identity using the supported browser. On both platforms, close the app, lock the screen, send only the authorized self-test, observe whether the notification appears, tap it, and check expired-session login restoration plus current source/access authorization. Verify denied/revoked permission, logout/account switch, current generation and absence of private lock-screen details. Record platform/browser versions and outcomes. Device emulation, queued delivery, provider acceptance and local synthetic tests never substitute for these steps.


Brand correction (2026-10-03): public app name/short name are NEVORA. Original symbol and navy/cyan wordmark are derived from `public/images/nevora.png`; technical Fuel/NUVORA identifiers remain unchanged. Public asset cache v3 uses the existing waiting/update lifecycle with the same seven-public-asset allowlist. The generated offline fallback embeds the original public icon/wordmark bytes so its branding works during complete disconnection; no private content is embedded. Regenerate only that markup with `npx tsx scripts/render-nevora-offline.tsx`. No ownership, delivery, worker-trigger or private-cache policy changes are included. Fresh visual evidence is a candidate baseline pending Jose review.


## Workspace foundation activation dependency (2026-10-03)

The current foundation application additionally requires prepared migration 0008 after exact 0001–0007. Its workspace/location/position queries are not compatible with a target stopped at 0007. Fuel timezone/location keys and historical rows remain unchanged; review legacy `NOT VALID` name constraints without modifying historical bytes. No live migration, backup/restore or Neon transport was exercised. Separately authorize the exact environment and coordinated application/migration rollout; preserve data and disable outbound flags on rollback while reviewing compatibility.

Current local evidence is recorded in the [foundation QA review](../ui/2026-10-03-nevora-foundation-review.md). Its full SQL suites use owned loopback databases and include 0008. Older Task 11 references above describe the historical Phase 3 verification, not the later foundation Task 11. The foundation's actual native service-worker checks preserve exact `/app` scope and verify `navigator.serviceWorker.controller === null` on Clocker; global registrations may still exist on that origin. Fixture native-push doubles are distinct from actual worker/cache/lifecycle and from unperformed physical/provider tests.

Runtime environment/security configuration remains independent of workspace policy loading for enrollment, logout and session termination. A workspace lookup failure cannot block logout. Fresh-customer production provisioning/schema distribution is deferred; the generic SQL fixture is test-only. No scheduler, subscription, paid plan, real push permission/enrollment or delivery has been activated.
