# Full NEVORA iOS and Android Launch Implementation Plan

> **For execution:** Use superpowers:executing-plans to work through the checked steps, loading applicable repository skills. Delegation or a different execution method requires separate authorization. This document is a proposed program plan; no implementation, branch creation, merge, environment activation, or publication has occurred.

**Goal:** Deliver the existing full NEVORA application on iOS and Android with role-appropriate employee, lead, manager and owner workflows, production-capable native integration, verified privacy/safety controls and accepted store builds.

**Architecture:** Retain Next.js/Neon as the backend and web application. Extend the bundled React/Capacitor frontend into a production mobile application, sharing framework-independent UI/domain contracts where practical and calling server-owned services through dedicated authenticated APIs. Native code owns session credentials and platform capabilities; business decisions and authorization remain on the server.

**Tech Stack:** Existing Next.js 16.3.8, React 19.3.0, TypeScript, Neon/PostgreSQL and Capacitor 8.5.3 prototype; Swift/iOS and Java/Android platform projects. Keep the source branch's locked dependency and Node 24.19.0 baseline until an intentional compatibility change is reviewed.

**Spec / requirements:** Jose's request for the full app in this conversation; the [October 18 source audit](</Users/josek0514/.codex/.chatgpt-projects/g-p-6abf0d9359708191a1e72c421bc4de9d/docs/audits/2026-10-18-nevora-mobile-launch-readiness.md>); the existing [single-company delivery scope](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/work/nevora-native-poc-ui-readiness/docs/execution/single-company-20261012.md>). This is a launch program plan, not a claim that each subsystem has an approved implementation specification.

**Planning date:** October 18, 2026, America/Puerto_Rico.

## Global constraints

- Full app means existing role-appropriate web capabilities. It does not mean every role gains every action.
- Preserve one configured company per database and the paused SaaS scope. No public workspace provisioning is added.
- Preserve current Clocker device enrollment, PIN, location, role and server authorization restrictions. Personal-phone punch permission is not implied by mobile availability.
- Preserve the current web experience, DESIGN.MD, approved page references, fonts, icon family and business behavior while adapting presentation and transport.
- Keep payroll visibility capability-based; full app availability does not grant payroll access.
- The prototype's local-only endpoints and debug transport are evaluation controls. Production gets reviewed adapters; those controls are not simply removed.
- All test data is fictional in an ownership-verified non-production environment. No real SMS/email, customer-data mutation, production credentials, paid services or metered analysis without the required authorization.
- Keep analytics/replay off pending the existing consent/data-minimization review.
- Existing uncommitted work and worktrees are preserved. All implementation uses an isolated checkout.
- Preserve Vercel's existing automatic-deployment hold. Preview and production changes remain explicit environment actions.
- Migrations, rollback, exact-SHA CI, hosted verification and independent release review remain required. No main merge or production publication without Jose's explicit authorization.

## Review focus

Each of these has an owning acceptance scenario below:

1. An account loses authority while a request is in flight: no private result or write survives the revocation (Tasks 2, 4, 5 and 11).
2. A timeout occurs after a write commits: retry/restart resolves the original operation without duplicate punches, requests, publication or payroll actions (Tasks 3-5 and 9).
3. A signed mobile client remains installed through a backend upgrade: protocol compatibility and controlled minimum-version behavior preserve supported clients (Tasks 2, 10 and 12).
4. Logout or deletion occurs with notifications, downloads or cached screens present: credentials, private state and delivery ownership are cleared or revoked without affecting another account (Tasks 2, 5, 6 and 8).
5. A phone uses a different timezone or large text and resumes across a business-day boundary: company-time semantics, focus, visible actions and current data remain correct (Tasks 3, 4, 9 and 11).

## Branch recommendation

**Working branch: propose creating `codex/nevora-mobile-launch` in a new managed worktree from current `origin/development`, then integrate the verified full-app `origin/NEVORA-UI-READINESS` source.**

Verified branch evidence:

| Source | Observed SHA | Recommended use |
|---|---|---|
| GitHub `development` | `b58496b84b21690f7be22474f7570da2d81af6c3` | Development lineage and eventual PR target. The main local development checkout is older, at 0516b7dc. |
| GitHub `NEVORA-UI-READINESS` | `33b6dfa0f92f47b3c8b417aba57f52108589bc69` | Full-app application baseline after fresh regression/migration verification. Verified descendant of development: 0 commits behind, 270 ahead. |
| Local `codex/nevora-native-poc-ui-readiness-20261014` | Same `33b6dfa0` | Convenient source inspection checkout for that full-app baseline. |
| Local `codex/nevora-cross-platform-poc-20261014` | Based on `b58496b8`, with uncommitted prototype additions | Source for selected Capacitor projects, secure-session implementation and native test patterns. Curate and reconcile; preserve the original work. |
| `main` | `7ffd013e39a9763a0655aa092b159dea4cbbfb50` | Production promotion target after final release gates and authorization. |

The remote full-app branch **does exist**. A fresh all-heads lookup corrected the earlier audit's narrower remote-lookup statement. No GitHub Actions runs were returned for exact 33b6dfa0 in the planning check; its launch CI status remains unverified. Development's older green CI cannot cover the 270 additional commits.

At the observed SHAs, bringing the UI branch into a new branch based on development can fast-forward. Refresh remote identity and ancestry before doing it; if either branch has moved, reassess the delta instead of forcing the old sequence. Review the 270-commit application/schema delta as a baseline integration, not as merely visual changes.

Keep the work in small reviewed commits/PRs and synchronize with development as work lands. The proposed branch is the initial integration lane, not permission to keep a months-long divergent release. Use a frozen release branch/tag only when feature parity and acceptance gates are met.

## Architecture decision and tradeoffs

Recommended: retain Capacitor with packaged local React assets, production native transport and shared backend services. It builds on the existing prototype and allows secure session ownership, native notifications and platform navigation.

Two alternatives were considered:

- Loading the live website as the application would preserve server rendering, but would require a separately reviewed hosting/bridge design and still leave minimum-functionality and offline concerns. Capacitor documents server.url as a live-reload facility not intended for production.
- Rewriting the product in React Native, Flutter or separate Swift/Kotlin interfaces would create a much larger UI migration without removing the backend authorization/compliance work.

The selected approach still requires frontend adaptation. Next.js cookies, request-dependent routes and Server Actions cannot simply be statically exported. Reuse existing client presentation and services through explicit contracts; do not copy server modules or secrets into the bundle. This is a technical recommendation, not approval of a product rewrite.

Sources: [Capacitor configuration](https://capacitorjs.com/docs/config), [Next.js static-export limitations](https://nextjs.org/docs/app/guides/static-exports).

## Delivery gates and dependency order

`G0 verified full-app baseline -> G1 release-capable authenticated slice -> G2 complete functional parity -> G3 compliance and release acceptance -> G4 beta acceptance -> G5 authorized launch`

- Tasks 1-2 establish P0 foundations.
- Tasks 3-5 complete full-app functional parity.
- Tasks 6-9 can be scheduled alongside feature ports after Task 2 contracts are stable; each still has its own acceptance gate.
- Task 10 starts early for account/environment custody and finishes after the release surface stabilizes.
- Tasks 11-12 consume the complete, frozen candidate.
- Every gate is **planned**, not passed. Implementation, verification and release acceptance are tracked separately.

## Proposed file and ownership map

Existing source links refer to the full-app or prototype checkouts. Paths under apps/mobile, src/lib/mobile and docs/mobile are proposed new files on the integration branch.

| Area | Existing source / proposed ownership |
|---|---|
| Baseline/release | Existing [package scripts](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/work/nevora-native-poc-ui-readiness/package.json>), [CI](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/work/nevora-native-poc-ui-readiness/.github/workflows/ci.yml>), [deployment hold](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/work/nevora-native-poc-ui-readiness/vercel.json>), [release checklist](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/work/nevora-native-poc-ui-readiness/docs/execution/final-release-checklist.md>); create docs/mobile/source-baseline.md and docs/mobile/release-evidence.md. |
| Mobile application | Curated successor of [employee prototype](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/work/nevora-cross-platform-poc/apps/employee-poc>) at apps/mobile; own its package, Capacitor/native projects, src/app.tsx, src/navigation.ts, src/native/transport.ts and src/features/. No desktop/Tauri deliverable is added. |
| Transport/auth | Existing [session service](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/work/nevora-native-poc-ui-readiness/src/lib/auth/session.ts>), [permissions](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/work/nevora-native-poc-ui-readiness/src/lib/auth/permissions.ts>); create src/lib/mobile/contracts.ts, http.server.ts, auth.server.ts and explicit src/app/api/mobile/v1/ adapters. |
| Employee workflows | Existing src/app/app/profile, schedule, availability, requests, exchange, notifications, updates, my-time and my-pay; native components under apps/mobile/src/features/employee/. |
| Manager/owner workflows | Existing src/app/app/page.tsx, employees, schedule, settings, account-recovery, clocker-recovery and src/lib/data/manager-dashboard.ts; native components under apps/mobile/src/features/management/. |
| Attendance/finance/documents | Existing src/lib/clocker, time-corrections, timecards, payroll, payroll-export, reports and period-close; native components under apps/mobile/src/features/time-pay/ and platform file adapters. |
| Privacy/deletion | New public src/app/privacy/page.tsx, terms/page.tsx, support/page.tsx, account-deletion/page.tsx; new src/lib/account-deletion/ and public/mobile authenticated deletion adapters; shared app entry points in Profile/Settings. |
| Moderation | Extend src/lib/communications and its UI/API adapters; own new src/lib/moderation/ commands, queue and tests. |
| Native push | Existing src/lib/notifications; new native providers/installations adapters there plus apps/mobile/src/native/notifications.ts and platform entitlements/configuration. |
| Evidence/tests | New docs/mobile/feature-parity.md, api-contract.md and acceptance-matrix.md; tests colocated with production modules and native/UI scenarios under scripts/mobile/ and platform test targets. |

Keep server APIs and web Server Actions as separate adapters over the same domain operations. Extract narrow reusable services only when a workflow needs it. No unrelated data-layer or design-system rewrite is part of this plan.

## Task 1 — P0: preserve work and verify the full-app baseline

**Owner:** Engineering/release. **Inputs:** live branch SHAs, existing worktrees, package scripts. **Output:** G0 baseline record and a tested integration branch.

- [ ] Refresh development/UI remote refs and record exact SHAs, merge base and uncommitted source inventory. Preserve the complete native POC and existing test-harness changes with hashes/recoverable source custody before importing selected files.
- [ ] Create the proposed isolated mobile integration branch from current origin/development. Integrate the full-app UI source with preserved history after reviewing the delta and current single-company instructions.
- [ ] Inventory schema changes and release controls. Numeric migration prefixes repeat across 0023-0027; derive an explicit dependency order and verify fresh-install and upgrade parity. The test migration list is evidence, not authorization to migrate a hosted database.
- [ ] Inspect scripts/environment before execution, install the locked baseline in the isolated checkout, and run the existing CI-required checks. Record failures as baseline issues and fix them in bounded commits without weakening tests.
- [ ] Ensure exact-candidate CI runs through a PR targeting development or reviewed CI trigger changes. Keep automatic Vercel deployment disabled and confirm the local preview route is disabled in release configuration.

**Gate G0:** Exact source identity, migration order and current baseline results are recorded. Web workflows still work against fictional isolated data. No new mobile feature starts by silently accepting an unverified 270-commit baseline.

**Verification commands:** npm test -- --maxWorkers=1; npm run typecheck; npm run lint; npm run build; npm run test:notifications:qa; npm run test:foundation:qa; npm run test:release-engineering; governed PostgreSQL/browser jobs, including test:clocker:owned, test:release:postgres, Phase D/E and test:payroll:owned where applicable. Use the scripts' explicit owned-environment requirements; review full CI workflow conditions rather than assuming every job runs on the new branch.

## Task 2 — P0: production native shell, contracts and all-role authentication

**Owner:** Mobile/backend/security. **Depends on:** G0. **Output:** G1 production-capable vertical slice.

- [ ] Create docs/mobile/feature-parity.md: enumerate every current application route/action, supported roles, domain service, existing API or Server Action, mobile destination, and acceptance scenario. Include preview-only routes as non-production and feature-gated routes with their current gating.
- [ ] Define versioned MobileBootstrap, MobileCapabilities, MobileError, CommandOutcome and per-feature request/response contracts in src/lib/mobile/contracts.ts and docs/mobile/api-contract.md. Bootstrap returns the authenticated role and server-derived capabilities, never a session token/hash. Command outcomes distinguish committed, rejected, conflict and unknown; operation IDs are reused only for exact retries.
- [ ] Curate the native prototype into apps/mobile, remove desktop coupling from the mobile build, and preserve the useful Keychain/Keystore behavior. Native transport accepts an enumerated endpoint/action set and configured HTTPS backend, not arbitrary JavaScript-supplied URLs.
- [ ] Add explicit production auth/session/bootstrap adapters under src/app/api/mobile/v1/. Reuse current credential/session and transactional authorization logic for OWNER, MANAGER, LEAD and EMPLOYEE. Include activation, password-change-required, recovery, expiry, suspension and logout states.
- [ ] Define and test the native request/CSRF/replay boundary separately from browser-only Origin controls. Native headers or user-agent strings are not authentication. Do not relax existing browser route guards to accommodate the app.
- [ ] Prove session persistence and revocation, bounded requests, error sanitization, protocol-version rejection and private-state clearing. No credentials/session tokens enter React storage, logs, crash payloads or returned JSON.
- [ ] Exercise a Release configuration on both platforms against an isolated HTTPS backend: employee login/read schedule; manager/owner login and an authorized schedule mutation; employee denial of that mutation; logout/restart. The evaluation-only endpoints remain unavailable in hosted/release mode.

**Gate G1:** Both release-configured apps launch and communicate without localhost/debug dependencies, and the first read/write slice obeys current server authority.

**Test ownership:** src/lib/mobile/auth.server.test.ts, http.server.test.ts, contracts.test.ts; owned API integration cases; Swift/Android credential-lifecycle tests. Include revocation during blocked transactions and timeout-after-commit recovery.

## Task 3 — P0: employee and lead workflow parity

**Owner:** Mobile/employee-feature engineering. **Depends on:** G1.

- [ ] Port Home, schedule/week navigation, shift details, Profile and calendar subscriptions using real authorized reads.
- [ ] Port availability, time-off submission/withdrawal, callouts, swaps and other current exchange/requests actions. Reuse service validation and current revision/assignment context.
- [ ] Port Inbox/notifications and Updates read, compose, edit, withdrawal and acknowledgement actions allowed by the current role. Carry moderation integration from Task 7 before accepting UGC for launch.
- [ ] For workflows currently exposed only as Server Actions, extract a shared command service and give web/mobile separate adapters. Share presentation where practical; keep Next.js server dependencies out of the mobile bundle.
- [ ] Test published versus draft visibility, self-only selectors, stale schedule/revision conflicts, process restart, duplicate taps, business timezone and day rollover.

**Done:** Every employee/lead row in the parity matrix has observed success, empty, loading, error, unauthorized and recovery behavior on both mobile platforms. Time/pay rows close in Task 5.

## Task 4 — P0: manager and owner workflow parity

**Owner:** Mobile/management-feature engineering. **Depends on:** G1 and the scheduling contracts used in Task 3.

- [ ] Port Manager Home, action center, management Inbox/Updates and operational queues with freshness/authority behavior preserved.
- [ ] Port schedule creation/editing, generation, templates, copy, coverage, review and publication. Use current preview/version/receipt semantics for destructive or bulk actions.
- [ ] Port time-off/exchange decisions, employee directory/profile/create/edit, assisted account recovery and allowed calendar revocation.
- [ ] Port Owner Settings: workspace, locations, positions, breaks, scheduling/company policies, device administration and access-controlled payroll settings.
- [ ] Test manager-versus-owner denials, final-owner protection, role demotion during save, employee reassignment, conflicting publication and stale/unknown operation recovery. Verify all changes through a fresh authorized read.

**Done:** All management/settings parity rows close without granting broader access or bypassing current transactional checks. Owner account/workspace deletion is added under Task 6.

## Task 5 — P0: attendance, payroll, reports and private files

**Owner:** Time/pay engineering and mobile. **Depends on:** G1 and relevant Task 3/4 screens.

- [ ] Port My Time, correction/missing-time submission, management review, attendance, timecards and Clocker recovery.
- [ ] Support Clocker setup/PIN/punch/break workflows only under the existing enrolled-device/location policy. If the app offers a registered Clocker mode, isolate its identity and logout/clear-data behavior from ordinary employee sessions.
- [ ] Port My Pay, permitted payroll review/import/receipt workflows, exports, reports and period close. Preserve capability gates and the distinction between recording payment information and actually sending a payment.
- [ ] Add platform document/photo pickers where current workflows need uploads. Enforce server file limits/type checks and authorization. Support protected downloads/share/export through short-lived controlled file access, not tokens in URLs or globally readable storage.
- [ ] Test duplicate/uncertain punches, locked payroll periods, reopen/version races, role loss during export/download, malformed/oversized files and interrupted upload. Use only fictional records; no real payments or provider deliveries.

**Gate G2:** The complete route/action parity matrix is accepted for all four roles on both platforms. No implemented web feature is silently omitted from the advertised full app. Device-restricted actions remain restricted.

## Task 6 — P1: public policies, support and real account deletion

**Owner:** Product/privacy/backend/web/mobile. **Depends on:** G1; can progress alongside Tasks 3-5.

- [ ] Create public privacy, terms/acceptable-use, support and account-deletion resources. Confirm the actual company identity, support destination and retention schedule before publication; draft copy is not legal approval.
- [ ] Add discoverable links in native Profile/Settings and the web app. Make support and deletion instructions usable after logout/uninstall.
- [ ] Implement authenticated account deletion initiation, identity confirmation, a durable request/processing record, completion status and disclosed timing/retention. A request must lead to actual deletion; deactivation or a message to the employer alone is insufficient.
- [ ] Revoke sessions, native/browser installation ownership, calendar/private file access and applicable downstream data. Separate protected legal/payroll records from data eligible for erasure and document backup expiry behavior.
- [ ] Implement the Owner workspace closure/delete workflow separately, including last-owner/transfer, affected employees, pending exports, retained records and clear irreversible-action confirmation. Do not silently delete a workspace merely because an employee deletes an account.
- [ ] Test unauthorized requests, repeated requests, worker retry/partial failure, held records and completion after uninstall. Verify a non-app web deletion request path under applicable Google policy.

**Done:** Policies describe observed release behavior; both in-app and applicable web requests produce the documented deletion outcome. Retention choices are resolved before launch rather than invented in code.

## Task 7 — P1: workplace content safety

**Owner:** Communications/backend/product/support. **Depends on:** G1 and communication contracts.

- [ ] Add server-authorized content/user reporting from Updates, Inbox interactions and applicable exchange text. A reporter cannot inspect another reporter's private record.
- [ ] Add a moderation queue, current-role controls, removal/restriction actions, audit trail and a named support response owner. Handle reports involving a workspace administrator.
- [ ] Add applicable abusive-user blocking/filtering behavior and accepted-use policy enforcement. Specify how peer-contact blocking coexists with mandatory operational notices; do not quietly suppress required schedule/pay communications.
- [ ] Test reports against withdrawn/deleted/stale content, repeated reports, manager access loss, cross-account access and action after a report is submitted.
- [ ] Review the completed behavior against current Apple/Google UGC requirements and provide review instructions demonstrating it.

**Done:** The shipped content surfaces have functioning safety controls and an operational response process, not only buttons or author withdrawal.

## Task 8 — P1: native push for iOS and Android

**Owner:** Mobile/notifications backend. **Depends on:** G1 and accepted notification destination contracts.

- [ ] Integrate a compatible maintained Capacitor native push plugin. Configure APNs and Android delivery through the selected existing service/account; no new paid provider is assumed.
- [ ] Extend the existing notification worker/provider abstraction with native installation registration, environment separation, token encryption/rotation, ownership and revocation. Reuse existing recipient/policy checks.
- [ ] Request permission at a relevant user action; provide denied/revoked settings behavior and Android channels. Keep sensitive payroll/employee details out of lock-screen payloads.
- [ ] Route taps into typed, authenticated mobile destinations; reauthorize before showing current content. An identifier in a notification never grants access.
- [ ] Test foreground/background/terminated delivery, delayed/out-of-order/expired alerts, logout/account change, token replacement and role revocation. Use fictional-device enrollment and explicitly authorized delivery tests only.

**Done:** Schedule, request, communications and applicable time/pay notifications work on both release builds with proven ownership cleanup. Analytics is not enabled as a side effect.

## Task 9 — P1: native behavior, accessibility and offline/recovery policy

**Owner:** Mobile/product/QA. **Depends on:** G1; complete after feature ports.

- [ ] Apply the established design system across mobile screens; verify safe areas, keyboard/focus, Android Back, iOS navigation/sheet dismissal, modal focus restoration, cold-start colors and external browser routing.
- [ ] Implement and observe operating-system text scaling, VoiceOver/TalkBack labels/order, usable large-text layouts, contrast, touch targets and reduced motion.
- [ ] Recommended initial attendance policy: preserve online submission authority and durable recovery of uncertain commands; show an honest offline state for unavailable operations. Do not silently accept/backdate wholly new offline punches.
- [ ] If offline punch capture is required for launch, make it a separate attendance-policy/design task before release: define client/server timestamps, eligibility, encrypted persistence, expiry, exact retry/deduplication and manager reconciliation. That capability remains a launch blocker until explicitly accepted.
- [ ] Test app process death, suspend/resume, network changes, credential expiry, midnight/DST, device timezone changes and stale caches. Prevent private screens/data from resurfacing after logout/deletion.
- [ ] Keep Face ID/passkeys and Live Activities outside the critical path. Haptics can be a small enhancement after reliable punch confirmation; it must not imply a failed/unknown punch succeeded.

**Done:** Every shipped screen is usable under the device/accessibility matrix and accurately represents offline/uncertain outcomes.

## Task 10 — P1: environment, migrations, signed builds and store custody

**Owner:** Release/backend/mobile, account owner and privacy. **Starts after:** G0; finishes after G2 and Tasks 6-9.

- [ ] Early in the program, verify Apple/Google developer account type, organization verification, identifiers, required testing-track eligibility and existing account access. Resolve costs/paid memberships with Jose rather than buying them.
- [ ] Select explicitly isolated development/review environments. Record backend origin, database identity/schema, migration ordering, provider sandbox settings, worker deployment and rollback/restore evidence. Never infer that a Preview database is non-production.
- [ ] Assign final package/bundle IDs and NEVORA display branding; configure signing in approved secret stores, release-only HTTPS endpoints and debug-feature exclusion. Final IDs must be checked against actual registered app records.
- [ ] Add app/SDK privacy manifest and required-reason checks, applicable iOS entitlements, Android permission declarations, encryption/export answer, native-library compatibility checks and Android 16 KB verification.
- [ ] Complete native CI jobs for web assets/contracts, Swift/Android builds, unit/native UI suites and artifact identity. Record backend SHA, mobile SHA/build numbers, packaged asset hashes, API version and supported backend/client version window.
- [ ] Produce a signed iOS archive and Android App Bundle. Review screenshots/icons/launch screens and accurate privacy labels/Data safety, content/age ratings, support/deletion URLs and applicable billing disclosures.
- [ ] Provision a hosted fictional review company with employee, lead, manager and owner test coverage; submit only the credentials/instructions needed to review the shipping roles. Ensure credential changes/MFA do not lock reviewers out.
- [ ] Stage the compatible backend before store binaries, and verify the previously supported mobile build still works. Database changes use reviewed additive rollout where possible; roll-forward/rollback is rehearsed before a destructive transition.

**Gate G3:** A signed, reproducible candidate has all required implementation and compliance evidence, isolated hosted verification, and no unresolved mandatory release finding.

## Task 11 — P1: device acceptance and beta

**Owner:** Independent QA/UI, with engineering remediation. **Depends on:** G3.

- [ ] Freeze the candidate and run the existing final-release checklist plus the full mobile role/action matrix. Source changes produce a new candidate and rerun affected gates.
- [ ] Run actual Release builds on physical iPhone and Android devices, a lower-resource Android device and every supported tablet/form factor. Resolve the earlier iPad failures; do not count the old iPhone/Android results as current evidence.
- [ ] Exercise fresh schema and upgrade schema, real hosted Neon transport, all role denials/revocation races, retry/idempotency, uploads/exports, notification taps, deletion, moderation, large text and offline/restart behavior.
- [ ] Distribute through TestFlight and Play testing tracks under the user's authorized accounts. If the new-personal Google account gate applies, complete its current required tester/continuous-duration conditions and production-access review.
- [ ] Triage beta defects, fix within scope, freeze a successor and repeat the impacted acceptance cases. Record privacy-safe crash/support diagnostics without enabling unreviewed analytics/replay.
- [ ] Obtain independent QA/UI findings against exact artifacts and resolve mandatory blockers. Operating implementation staff do not self-close independent findings.

**Gate G4:** Current beta evidence supports the advertised full app and the exact candidate, with all blocking findings closed and residual non-blocking risks documented.

## Task 12 — submission, authorization and controlled launch

**Owner:** Release/account owner/support; Jose authorizes production. **Depends on:** G4.

- [ ] Finish store listings, reviewer notes and credentials, privacy/permission/encryption answers and platform screenshots for the actual shipping build. Document the employer-paid access model and current moderation/deletion features.
- [ ] Confirm public/managed distribution choice, supported countries/devices and final support/retention arrangements. Default recommendation is a public business app with authenticated employer-provisioned access, subject to the user's distribution needs.
- [ ] Submit accepted builds for store review when authorized; address review feedback using a new identified candidate when code changes.
- [ ] Present exact backend/mobile artifacts, test evidence, open non-blocking risks, monitoring/support ownership, migration status and rollback plan for Jose's final production/publication authorization.
- [ ] After authorization, promote through the governed development/release/main path, deploy the compatible backend and use controlled store rollout. Keep release control and feature flags explicit.
- [ ] Verify install/update, real sign-in, core role workflows, delivery and support after release with approved synthetic accounts. Monitor meaningful failures and halt rollout if required.
- [ ] Maintain backward-compatible APIs until supported installed versions have migrated. Rehearse backend rollback, store rollout halt and emergency-feature disable; installed binaries cannot be assumed to disappear after a rollback.

**Gate G5:** Production release is authorized, accepted artifacts are published/deployed as intended and approved post-release checks are observed.

## First execution slice

Start with Task 1 only: preserve source custody, establish the integration branch, review the full-app delta and produce G0 baseline evidence. Then Task 2 proves one production-capable employee and manager/owner read/write slice on both platforms before the broad feature ports.

The first useful milestone is G1, not an app icon or uploaded prototype. The final milestone remains full G2 parity plus the G3-G5 compliance, beta and authorized-release gates.

## Decisions recorded as recommendations

| Decision | Recommendation / resolution point |
|---|---|
| Source and branch | New codex/nevora-mobile-launch from development lineage, integrating current verified NEVORA-UI-READINESS. |
| App approach | Bundled Capacitor/React client and shared authenticated backend services. |
| Role scope | All four existing roles; actual capabilities and device restrictions preserved. |
| Company model | Existing single-company delivery; SaaS remains paused. |
| New offline punches | Separate explicit policy task if required; initial recommendation is online writes with durable uncertainty recovery. |
| Biometrics/Live Activities | Optional after critical launch work. |
| Distribution/accounts/IDs | Verify with actual account state in Task 10; finalize distribution in Task 12. |
| Retention/support | Product/privacy/account owner resolves and records real obligations and operating contacts in Tasks 6-7 before publication. |

These recommendations need no answer to make this plan reviewable. They must be confirmed or revised at their owning execution gate before dependent implementation or external actions.

## Planning verification and remaining uncertainty

Planning rechecked live GitHub branch heads, ancestry and package/release configuration; read the current single-company scope, auth/origin boundaries, route/API inventory, service ownership, migration names, CI/release controls and official Capacitor/Next.js guidance. No application test suite or native build was rerun while writing this plan. The earlier audit's 206 focused tests and prototype web-assets build remain scoped to that audited snapshot.

No branch was created or merged, no source was ported, no environment/store account was changed and no deployment was made. All task boxes remain unchecked.

## References

- [Source audit](</Users/josek0514/.codex/.chatgpt-projects/g-p-6abf0d9359708191a1e72c421bc4de9d/docs/audits/2026-10-18-nevora-mobile-launch-readiness.md>)
- [Full-app branch workflow and scope](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/work/nevora-native-poc-ui-readiness/README.md:3>)
- [Mandatory final-release checks](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/work/nevora-native-poc-ui-readiness/docs/execution/final-release-checklist.md>)
- [Current release-control path](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/work/nevora-native-poc-ui-readiness/docs/execution/phase-c-release-control.md>)
- [Capacitor configuration](https://capacitorjs.com/docs/config)
- [Capacitor security guidance](https://capacitorjs.com/docs/guides/security)
- [Native push plugin](https://capacitorjs.com/docs/apis/push-notifications)
- [Next.js static-export limitations](https://nextjs.org/docs/app/guides/static-exports)
- [Apple SDK requirements](https://developer.apple.com/news/upcoming-requirements/?id=04282026a)
- [Google target API requirements](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en-en)

