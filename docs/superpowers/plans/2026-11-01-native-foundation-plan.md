# Native Employee and Owner Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Run the existing Employee and Owner application safely inside current-source iOS and Android containers, with tested session/origin/lifecycle contracts and isolated full-backend journeys.

**Architecture:** Reconcile the preserved October25 WKWebView foundation with current development and add a parallel Android WebView shell. Existing browser-owned cookie sessions, Next.js screens and server business authorization remain authoritative. Native push, links/documents/association integrations follow in stageB; this foundation is not the entire native-readiness task.

**Tech Stack:** Existing Next16/React19/TypeScript/Vitest/PostgreSQL; Swift5/UIKit/WebKit/Swift Package tests/XCTest; Android Java17/AGP8.13.0/Gradle8.14.3/API36 with WebView and JUnit/instrumentation. Preserve existing pinned packages; install only missing official dependencies.

**Spec:** docs/superpowers/specs/2026-11-01-native-employee-owner-design.md, approved by Jose.

## Global Constraints
- First native qualification: EMPLOYEE and OWNER; existing MANAGER/LEAD web permission model unchanged.
- One shared current interface; no second payroll/auth/scheduling implementation.
- No production credentials, database writes, app binding/deployment, paid service activation or real messages in tests.
- Release: explicit HTTPS DNS origin; reject userinfo, path/query/fragment, loopback/IP aliases, mixed content and TLS bypass. Debug allows only explicit owned local routes.
- Cookies remain in browser-owned storage; no cookie extraction/native bearer duplicate.
- Preserve all staged/unstaged source work in the old foundation and POC; capture/recheck hashes before adoption.
- New work stays detached on current development; no new named branch. Inventory6>3 remains an integration blocker, not waived.
- Do not claim fixture tests are physical-device, full-app, hosted, signing, store or independent QA acceptance.
- Use exact frozen/current server-context preload for standalone TypeScript runtime. Inspect package scripts before builds/tests.
- Design approval already includes proceeding. Plan/task decomposition does not create another scope approval gate.

## Review Focus
- A disguised localhost/credential-bearing origin must never become a Release backend (Tasks2/3 policy tests).
- A background/resume or response race must never reveal previous-account private content (Tasks2/3 lifecycle tests).
- Native unsupported-role presentation must not change ordinary web authorization or turn a marker into a credential (Task1).
- User links/new windows/subframes/download MIME must not escape origin policy or forward app credentials (Tasks2/3; full file support stageB).
- Fixture/evidence concurrency and encoded worktree paths must not produce false green results (Task4).

## File Responsibilities
- src/lib/native-shell/context.ts: pure presentation marker and EMPLOYEE/OWNER admission policy.
- src/lib/native-shell/context.test.ts: policy regressions.
- src/app/api/mobile/v1/session/route.ts + route.test.ts: compatibility protocol without identity/credentials.
- src/app/app/layout.tsx + src/components/native-shell/unsupported-role.tsx: native-only unsupported-role presentation using actual session; existing web role paths preserved.
- native/ios: reconciled old core/controller/project/fixture/tests; no overlay of unrelated application code.
- native/android: independent small platform container with policy, lifecycle, configuration and tests.
- scripts/native-owned.mjs and src/test/integration/native-shell.integration.ts: explicit disposable full-backend and source custody verification.
- docs/native: current runbook, evidence manifests and remaining native readiness gates.

### Task 1: Session compatibility and native role presentation

**Files:** Create context module/tests, versioned route/tests and unsupported-role component. Modify app layout narrowly after authenticated session exists.

**Interfaces:** nativeContext(userAgent:string|null):boolean recognizes exact versioned NEVORA native marker for presentation only. nativeRoleSupported(role:UserRole):boolean is true only for EMPLOYEE/OWNER. GET session returns {protocolVersion:1,state:'authenticated'|'unauthenticated'|'unavailable'|'denied'} with 200/401/503/400-or403; no profile, id, token or hash. Existing getSession remains authority.

- [ ] Add context tests: Employee/Owner true, Manager/Lead false; missing/forged partial marker false; native marker never changes the role result. Add route tests from preserved foundation first, adapting expected supported roles and privacy/error assertions.
- [ ] Run focused Vitest against a minimal unimplemented route/context and observe assertion failures, not an unrelated environment/import error.
- [ ] Implement minimal context/route. getSession errors sanitize to unavailable503. Query selectors400, cross-site/foreign origin403, no-store/private/VaryCookie headers. Do not serialize session employee.
- [ ] Add native-only layout presentation: evaluate actual session plus native marker; unsupported native roles receive a clear web-use/sign-out path using existing logout semantics. Ordinary web layout and business permission checks are unchanged.
- [ ] Run focused tests, typecheck and current relevant layout/role regression tests. Required independent cases: unauthenticated, expired/revoked, outage, native employee/owner, native unsupported role, ordinary web Manager/Lead. No auth operation is trusted because of UA.
- [ ] Commit this bounded contract.

### Task 2: Reconcile and verify iOS foundation

**Files:** Adopt only native/ios source/project/fixtures/tests from preserved custody manifest; existing no-page-entrance-motion test fix only if still needed on current base. Add current native marker and role journeys to fixtures.

**Interfaces:** BackendPolicy(origin:mode:) exact-origin guard; navigation(to:method:userInitiated:mainFrame:); SessionStatus.decode(statusCode:data:); ShellLifecycle.activate/suspend/accepts; endpoint from Task1.

- [ ] Recheck old source hashes and copy only reviewed files into the isolated checkout, never modifying old checkout or overwriting unrelated current web code. Keep source-adoption receipt.
- [ ] Run existing seven Swift core tests. Add failing tests for canonical/default ports, uppercase/trailing-dot/IPv6/numeric-loopback aliases, userinfo, foreign POST/subframe/new-window behavior, mismatched status/state, oversized JSON and stale tickets if missing.
- [ ] Correct only reproduced policy/lifecycle defects. Release cannot accept any local alias; Debug exceptions remain exact/test-only. Add the versioned native UA marker without changing web cookie handling.
- [ ] Reconcile controller lifecycle and retain fail-closed cover/retry behavior. Fresh same-origin protected navigation validates cookies; a credential-free probe alone never establishes authentication.
- [ ] Reproduce the saved keyboard-focus XCTest failure using per-run fixture ports. Fix deterministic fixture readiness/interaction or real app behavior without weakening assertions, sleeps-as-proof or shared state.
- [ ] Run swift test --package-path native/ios, python3 native/ios/test_fixture.py; deterministic project regeneration/diff check; Debug and unsigned Release simulator builds. Run fixture UI tests on one owned simulator only, record unavailable GUI/lock states honestly.
- [ ] Verify no cookie getter/native token extraction or developer-origin Release override exists. Commit evidence and source separately from historical reports.

### Task 3: Android counterpart with matching contracts

**Files:** Create native/android/{settings.gradle,build.gradle,gradle.properties,gradle/wrapper/*,gradlew,app/build.gradle}; app/src/main/AndroidManifest.xml; Java package com.velani.nevora.development classes BackendPolicy, ShellLifecycle, SessionStatus, PortalActivity; unit/instrumentation tests and minimal protected app resources.

**Interfaces:** Mirror policy/protocol/lifecycle semantics from Task2; Java BackendPolicy(String origin,boolean debug), contains(URI), navigation(URI,method,userInitiated,mainFrame); SessionStatus.decode(int,String); ShellLifecycle activate/suspend/accepts. No shared native cookie/credential export.

- [ ] Pin official wrapper/tooling already present in the POC; preserve source provenance, distribution validation and use only needed plugins. No Firebase plugin until stageB native push requires it. Debug loopback/emulator exceptions are build-specific; no Release cleartext.
- [ ] Write failing JVM policy/protocol/lifecycle tests covering Task2 adversarial cases and unsupported marker/role states; use explicit checked-in test fixtures, never production URLs.
- [ ] Implement policy/core. Implement Android WebView persistent cookie behavior with third-party cookies off, no file/content access, no mixed content, no broad JavaScript interface and no WebView debug in Release.
- [ ] Implement privacy cover before background, generation invalidation, bounded credential-free probe, fresh protected navigation and unavailable/retry. External user-initiated HTTPS GET uses system browser; redirect/POST/subframe/unsafe scheme denied. Add versioned native UA marker.
- [ ] Add Back/history/exit, safe insets/keyboard and text scaling using platform APIs; visible controls and zoom remain available.
- [ ] Run unit tests, assembleDebug and unsigned Release compilation. Run instrumentation against the owned emulator and invocation-owned fixture for login, both roles, foreground/restart/logout, loss/retry, bad origin and unsupported role. Record all missing device-specific evidence.
- [ ] Commit runnable Android source/runbook and evidence.

### Task 4: Actual backend integration and complete foundation verification

**Files:** Create scripts/native-owned.mjs, src/test/integration/native-shell.integration.ts, suitable native integration config and fixture-role journey extensions. Use existing owned PostgreSQL/Next app helpers rather than inventing a production fallback.

**Interfaces:** runner explicitly selects full current source and unique local database/ports, strips inherited production/provider credentials, uses synthetic EMPLOYEE/OWNER records and normal login. Children receive only owned local settings; scoped teardown preserves other processes.

- [ ] Add runner safety tests before implementation: reject external/prod database, missing explicit environment, unowned ports/processes, unsafe cleanup and a mixed source hash. Two concurrent runs must have separate data/ports/evidence.
- [ ] Implement bounded runner over existing local PostgreSQL/test adapters and authoritative migration order. No real SMS/email/push or AI traffic.
- [ ] Add real backend cases for valid/missing/revoked/expired sessions, EMPLOYEE/OWNER native admission, Manager/Lead web continuity, denied selectors/origins, sanitized unavailable states and private response headers.
- [ ] Run both platform containers against full Next/Postgres, not only the transport fixture: activation/login, role-specific Home/Schedule, an authorized representative Employee and Owner action, session revoke/restart/logout and read outage. Expand matrix for all advertised current routes in stageB integration rather than claiming this sample certifies them.
- [ ] Run repo default unit suite with explicit stripped credentials, typecheck/lint/build and relevant owned SQL/native suites. Preserve original failures and resolve regressions; inherited environmental failures remain named.
- [ ] Obtain fresh whole-change code review. Report separately implemented, local verification, GUI/device unavailable, hosted/signing/store gates, inventory reconciliation and downstream stageB/C work.
- [ ] Commit foundation changes. Do not merge/push/claim total native task complete.

## Subsequent Plans (same approved design; not scope reopening)

StageB native capabilities plan must be written from the actual interfaces delivered above before its code starts:
- Versioned origin/main-frame/lifecycle-bound capability protocol, with no arbitrary evaluation/network/file privileges.
- Authenticated native enrollment repository/service and durable migration appended to authoritative order; encrypted provider material, installation/session ownership, generation/rebind/revocation and retry tests.
- APNs HTTP2 and FCM HTTPv1 transports behind injected provider boundaries, short bounded deadlines and redacted errors; real providers disabled until private credential/device steps.
- Existing notification intent/state/preferences integrated into separate native delivery records. Preserve web push and durable business authority; no exactly-once claims.
- Native permission/status/token rotation, generic payload/tap resolution, account-switch/logout handling.
- Universal/app links and association templates, secure documents/download/share cleanup, passkey/device compatibility, existing UI integration and physical-device matrix.

StageC readiness plan:
- Exact source/backend environment and least-privilege principal selection; independently verified isolated HTTPS fixture deployment before hosted tests.
- Full Employee/Owner native journey matrix and actual device acceptance; no production/customer tests.
- Binary/SDK/privacy/permissions/manifests/assets and policy/deletion fulfillment worksheets.
- Final bundle/package/team/account inputs, signed archive/AAB and controlled internal upload once authority/credentials exist.
- Separate production/store release decision. Code completion does not waive source inventory, account, physical-device or deployment gates.

These later plans are required deliverables of the ongoing task, not optional future offers. No stage is silently omitted because a gate needs user input.
