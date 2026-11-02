# NEVORA native Employee and Owner release design

Date: November 1, 2026 (America/Puerto_Rico). Design owner: Codex. Product authority: Jose.
Status: **approved by Jose** ("Approve design and proceed"). Product implementation may proceed within this scope; external account/device/distribution gates remain.

## Intent and confirmed scope

Jose asked Codex to carry out the native-app readiness work for iOS and Android, then specified **Employee and Owner** for the first native release. When asked about shared versus separately rebuilt screens, Jose delegated the recommendation. Codex recommends the shared-interface architecture below, following the later October 25 foundation. This document does not claim Jose separately approved an unwritten architecture.

Deliver the current Employee and Owner workflows inside installable native applications, with reviewed native lifecycle, links, notifications, documents and platform integration. Keep the existing Next.js UI, business rules, cookie sessions and server authorization as the application source of truth. Do not redesign screens or create a parallel payroll/scheduling/authentication implementation.

The end state includes implementation and automated verification, a hosted fictional integration candidate when its environment is approved, release configuration/disclosures, and signed internal testing artifacts once required account access is supplied. Public store distribution, production cutover, real notification sends and final physical-device acceptance remain explicit external gates, not statuses inferred from a successful build.

## Current evidence and source custody

- New clean detached worktree based on freshly fetched origin/development **1e6f35ab9731234fc765aa18ee817cb196459e2e**. The primary checkout remains untouched.
- Existing iOS foundation: /Users/josek0514/.codex/worktrees/nevora-native-foundation-20261025/Fuel Scheduler, detached HEAD46e202786863279302026ee03a0e225c359fa55c, with staged/unstaged/untracked work deliberately preserved. Its pause asked for Claude's web work to finish. The latest development merge includes Claude's selected release and handoff; Jose's current instruction restarts native work, with reconciliation required before reuse.
- That newer foundation already has a UIKit/WKWebView container, versioned read-only session compatibility route, exact-origin/lifecycle policies and fixtures. Previous final UI/full-suite failures remain historical open evidence to reproduce and resolve; they are not inherited as green.
- Older cross-platform employee POC remains read-only reference. It has local-debug-only native session bridges and only a few screens, so its evaluation endpoints/security restrictions will not be repurposed for production.
- Xcode27.0, iOS26.5/27.0 simulators, Android SDK/adb37.0.1 and the Nevora_Pixel_7_API_36 emulator are available. This does not establish signing accounts or physical-device access.
- Development source inventory currently fails: unclassified AI-owner, claude/employee-mobile-phase2-20261027 and codex/release1-db-rehearsal-20261101; six active remote heads against a three-branch ceiling. Preserve all heads/worktrees. No ceiling increase or deletion is authorized. Local native work can be prepared in isolation; integration/push must not claim this gate is green until dispositions and policy are reconciled.
- Phase3 production database work is separate and complete. Neither that new project nor the old production project supplies test credentials/data for this task. No app binding is changed.

Before adopting old native files, record their actual working-file hashes and differences from the fresh base. Import only the relevant native sources/new compatibility contract, accommodate current web changes, and keep the original worktree intact. Do not copy its old application snapshot or obsolete test changes over development.

## Approaches

### A. Shared hosted interface in native containers — recommended

Extend the existing direct iOS WKWebView foundation and add a matching Android WebView application. Native code owns device lifecycle and constrained capabilities; the current HTTPS Next.js application renders both roles and enforces every business permission.

Benefits: one interface/authorization model; existing Employee/Owner workflows and later accepted web fixes carry forward; no duplicate wage or scheduling code. Tradeoffs: first release is online-first, depends on the selected backend, and needs real platform testing and credible native behavior/store review.

Use documented platform loading, navigation and persistent browser-data APIs. Do not ship Capacitor's development-only server.url or debug cleartext settings. Sources: https://developer.apple.com/documentation/webkit/wkwebview, https://developer.apple.com/documentation/webkit/wkwebsitedatastore, https://developer.android.com/privacy-and-security/risks/unsafe-uri-loading, https://capacitorjs.com/docs/config.

### B. Bundled Capacitor/React or fully native screens — not selected

The old POC demonstrates native networking and secure storage, but a complete separate interface would require reproducing the current server-rendered Next.js workflows and keeping two interfaces/contracts aligned. This is a substantially larger product-maintenance commitment. Retain the POC as evidence, not as a shortcut around its debug-only boundary.

## Release scope and user continuity

Employee coverage: activation/sign-in/recovery, Home, schedule/planning, requests/exchanges/time off, own time/history, messages/updates, own pay/documents, profile/preferences, passkey management and deletion-request access where enabled in the current application.

Owner coverage: the current authorized Home, scheduling/team, time review, payroll/export, insights, company/location/position/team configuration, Company & Access, Clocker administration and account/preferences workflows. Underlying feature/provider flags stay authoritative; native packaging does not enable unconfigured AI, email, payroll delivery or other services.

EMPLOYEE and OWNER are the first native acceptance roles. MANAGER/LEAD are not added to native release qualification. Existing web roles and server permissions remain unchanged. A native presentation/admission check should explain unsupported roles rather than imply their account is invalid. Any native marker is presentation context, never an authentication credential or authorization bypass.

Location Clocker tablets stay on their existing web/kiosk flow. This work does not add employee phone punches, geofencing, offline punch capture, new payroll policy, widgets or Live Activities. Existing desktop/mobile web/PWA support continues.

## Application structure and environment boundaries

- Keep iOS under native/ios and Android under native/android, with platform policy/lifecycle tests and explicit build configuration.
- Exactly one configured backend origin per build. Release requires a non-loopback HTTPS DNS origin with no credentials/path/query/fragment. Debug HTTP is limited to explicit owned loopback/emulator routes. No implicit production fallback, broad navigation allowlist or disabled TLS validation.
- Use the existing versioned /api/mobile/v1/session contract, reconciled with current getSession behavior. Responses contain only protocol/state/capability metadata needed by the shell, no user profile, token, cookie, password or business data. Reject foreign origins/selectors; errors mean unavailable, not signed-out success. Incompatible changes receive a new version.
- Persistent WebKit/Android browser cookies remain authoritative. Do not extract HttpOnly cookies or introduce a second native bearer-session system. All protected reads/commands keep current server checks and CSRF/origin guards.
- Native role admission and UI qualification do not broaden any existing web role. The chosen unsupported-role treatment must not modify employee/account role data.
- Keep native features capability-negotiated so older web/native versions fail clearly and safely.

## Lifecycle, navigation and privacy

Cover private content before background/app-switcher capture. Invalidate stale callbacks. On foreground and cold start, revalidate through a fresh protected same-origin document before revealing private content. Transport failures show retry/unavailable; they never display a stale private page or falsely sign the user out.

Preserve a validated current route in memory when practical. Do not add persistent private drafts/caches to rescue navigation. Existing server-backed drafts continue through the shared UI; unsent data must not be silently claimed saved.

Allow only the exact configured origin internally. User-initiated external HTTPS links open a separate system browser without app cookies/headers. Deny foreign POSTs, untrusted subframes/redirects, arbitrary schemes, file access and mixed content. Native pending links must pass the same origin/path policy after session validation.

Back closes the current sheet/dialog when applicable, then navigates history, then follows platform app-exit behavior. Retain visible navigation controls. Preserve zoom, accessible labels/focus, 44px targets, keyboard handling, safe areas, reduced motion and OS text scaling; change web CSS only for reproduced native problems and preserve default-size appearance.

## Native capabilities and narrow bridge

The older foundation intentionally has no script-message bridge. Native push/documents may require a new one; add only a separately reviewed, versioned capability channel, not a generic native method executor.

Every capability message must be bound to the configured HTTPS origin, trusted main frame, current page/lifecycle generation, strict schema, bounded size and explicit user action where relevant. Never expose session cookies, credentials, arbitrary URL/file/network operations or raw native evaluation to JavaScript. Presentation markers/nonces are not substitutes for server authorization.

Passkeys remain the existing web/server implementation. Prepare AASA/Android association declarations and capability configuration from actual team/package/domain inputs. Prove registration, sign-in, recovery and revocation on supported devices; do not call web unit coverage proof of native Face ID/passkey support.

Protected pay/export documents must retain current authorization. Use the WebView's authenticated browser flow and constrained platform download/share handling; never work around authentication by copying cookies or putting credentials into URLs. Bound content type/size/origin, use protected temporary app storage, require a deliberate share action and clean temporary files. Prefer explicit reauthentication in the system browser over an insecure transfer fallback.

## Native notifications

Implement APNs for iOS and FCM for Android as separate transports behind the existing durable notification-intent, preference, expiry and authorization model. Web Push remains supported; native registration is not a web-push subscription.

Add bounded native installation/token ownership records and delivery receipts as needed in append-only development migrations. Select the authoritative migration order and disposable test chain deliberately. No migration runs against production in this work.

Permission/enrollment is initiated in context by the signed-in user, with OS denied/revoked states handled. Register through the authenticated web session with existing CSRF/origin controls. Bind to installation/current employee/workspace/session authority, prevent cross-account rebinding/replay, and revoke enrollment when session/account authority is revoked. Token rotation, account switching, stale registrations and queued deliveries all require tests.

Delivery rechecks active ownership, preferences/quiet hours, consent, expiry and revocation. Use bounded retries/leases/failure status; do not promise exactly-once provider delivery. Lock-screen payloads are generic and omit names, pay, schedules and private message text by default. A tap resolves an opaque intent through current server authorization; it is not a raw arbitrary URL or access grant.

Provider credentials stay in approved stores. Build transport tests with fake local providers; no real APNs/FCM sends, device enrollment or provider account changes occur merely to get tests green. Actual enrollment/delivery to Jose's devices waits for the corresponding account/device action and explicit controlled-test approval. Paid plans are not authorized by this design.

## Staging and verification

Use invocation-owned fictional employees/workspaces and disposable local PostgreSQL with external delivery and metered AI disabled. Inspect scripts before execution; prevent inherited production credentials. The completed production bootstrap/accepted rehearsal remain evidence, not mutable native test fixtures.

Verification layers:
1. Preserve/reconcile the existing iOS tests and reproduce its outstanding failures on the new source.
2. Real backend contract/session/role and migration tests on isolated PostgreSQL, including expiry/revocation and unauthorized reads.
3. Swift and Android policy/core tests, Debug/unsigned Release builds and fixture UI tests.
4. Actual Employee/Owner journeys inside both containers against the full Next.js backend, including activation/login/recovery/logout, role/session changes, requests, time/pay reads and authorized documents.
5. Native provider/bridge tests for origin confusion, iframe injection, replay, lifecycle races, token ownership, retry and logout.
6. Physical iPhone/Android acceptance: accessibility, keyboard/safe areas/Back, interrupted connectivity, passkeys, files, app/background/restart, notification tap and account switching.
7. Release manifests/disclosures/artifact checks and signed internal builds, followed by explicit internal-distribution approval.

An approved isolated HTTPS staging origin is required for hosted/associated-domain tests. Prepare the configuration and environment identity evidence first; do not reuse existing Preview or production bindings blindly. External-host writes, DNS/capability changes and credentials require the actual account's authorized path. Do not buy a service or change Vercel Production as a prerequisite shortcut.

Use native fixtures/simulator/emulator evidence for what they actually prove. Device-only or credential-dependent checks remain explicitly unverified until performed; never replace them with a successful compile.

## Release/account preparation and external inputs

Prepare final app identity/icon/launch assets, privacy manifests and required-reason API inventory, Android network/backup/export/permission settings, dependency review, current App Privacy/Data safety worksheets, actual privacy/support/deletion URLs, reviewer instructions and fictional review accounts. Reconcile policy statements with the real deployment and the verified seven-day restore setting; old snapshots/backup retention still needs its own policy decision. A deletion-request UI is not proof of completed deletion fulfillment.

Default milestone is internal beta, not public submission. Actual Apple/Google organization/team/app-record state, final bundle/package IDs, signing credentials, associated-domain ownership, APNs/FCM configuration and physical-device access have not been verified. Prepare account-ready instructions and unsigned artifacts, then obtain the missing inputs privately. Public/unlisted/custom distribution is settled at the store gate; it does not block local implementation.

Separate statuses in every report: implemented, automatically verified, device-verified, signed, uploaded, reviewed, deployed. No store acceptance is promised by a wrapper; see https://developer.apple.com/app-store/review/guidelines/ and https://developer.apple.com/help/app-review/before-submitting-for-review/test-compatible-devices.

## Delivery and acceptance gates

A. Reconciled native foundation and executable local Employee/Owner journeys on current development.
B. Android parity and constrained native capabilities, with isolated provider/backend tests.
C. Hosted/device integration, signed internal artifacts and accurate store-readiness package after account/environment inputs are available.
D. Explicit internal upload/testing authority, then store and production release decisions.

The builder chooses routine implementation details within these constraints and records meaningful deviations. Do not merge/push a new application branch, raise the three-branch ceiling, erase old work, alter either production database, enable analytics/replay, activate paid hosting/monitoring or send real messages as part of local implementation.

Roll back by pausing native feature flags/distribution while preserving web access. Backward-compatible adapters can be disabled independently. Forward migrations retain their receipts; never erase adoption/audit history or improvise destructive undo SQL.

Design acceptance: Jose approves the shared-interface Employee/Owner scope and the controlled native-capability expansion. Code/build work proceeds after that approval; external account/device/distribution gates remain separately evidenced rather than guessed.
