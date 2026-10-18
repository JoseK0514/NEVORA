# NEVORA iOS and Android launch readiness
Audit date: October 18, 2026 (America/Puerto_Rico).

## Recommendation

**NO-GO for store submission in the audited state.** A native employee prototype exists for iOS and Android, with useful session and navigation work. It is deliberately restricted to local evaluation and is not a production mobile application yet.

The first priority is to establish one release candidate and connect the agreed native workflows to reviewed production APIs. Public privacy/support pages, deletion, applicable moderation, native release configuration, and device acceptance evidence follow. Biometrics and Live Activities are optional enhancements.

This is a source/readiness audit, not independent production certification. No application code, customer data, external account settings, branch tips, or deployment configuration was changed.

## Source identity and custody

| Source | Identity | What was inspected |
|---|---|---|
| GitHub development | `b58496b84b21690f7be22474f7570da2d81af6c3` | Live `git ls-remote origin refs/heads/development` matched the local remote-tracking ref. Tracked application code, routes, notifications, Clocker recovery, package scripts and CI were inspected from this commit. |
| Main local checkout | `development`, `0516b7dcbb07a10d926cc5c53f3b650343cad9bd` | Behind GitHub development. Existing untracked `.omo/` was preserved. It was not used as the current launch baseline. |
| Native prototype | `codex/nevora-cross-platform-poc-20261014`, based on `b58496b8` | [Prototype source](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/work/nevora-cross-platform-poc/apps/employee-poc>). The entire `apps/` directory, prototype routes/helpers/scripts are untracked; `src/test/integration/owned-next-app.ts` already has modifications. They were preserved. No corresponding remote branch was returned by the targeted live lookup. |
| Newer web/UI source | `codex/nevora-native-poc-ui-readiness-20261014`, `33b6dfa0f92f47b3c8b417aba57f52108589bc69` | [Web/UI checkout](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/work/nevora-native-poc-ui-readiness/README.md>). This snapshot is 270 commits ahead of the audited development commit. It includes Profile, Updates, communications, and a local Home preview. Targeted privacy/deletion/moderation/provider inspections were made here too; the whole branch was not functionally recertified. Correction verified during October 18 planning: the matching GitHub branch is `NEVORA-UI-READINESS` at this exact SHA. The local `codex/...` branch name is not the remote branch name. |
| Isolated audit snapshot | Detached `b58496b8` | [Audit checkout](</Users/josek0514/.codex/worktrees/nevora-mobile-launch-audit-20261018/README.md>). Exact copies of selected prototype files were added only here for checks. Six selected source-file hashes matched the originals. Existing dependencies were reused; no dependency installation occurred. |

The newer web/UI source and the native prototype are separate work. Passing development CI does not cover the uncommitted native application or the newer UI source.

## Status definitions

- **Implemented:** source exists; this does not by itself mean production-tested.
- **Partial:** useful implementation exists, but important launch work remains.
- **Absent in audited code:** no matching implementation was found in the inspected source; an external website or account setting may still exist.
- **Unverified:** requires hosted, device, account, or store evidence not established by this audit.
- **Conditional:** becomes a launch requirement if the associated feature ships.

## Prioritized execution checklist

| Priority | Work | Current evidence | Completion criterion | Suggested owner |
|---|---|---|---|---|
| P0 | Establish the release candidate | Development, the newer web/UI branch, and uncommitted native work are separate. | Select and integrate the approved web/native scope, commit the native source, freeze an exact candidate, and run the relevant CI on that candidate. | Engineering/release |
| P0 | Implement production native networking and authentication | iOS throws outside DEBUG; Android rejects non-debug builds. Both use local-only HTTP origins. The prototype server rejects production, hosted requests, and non-loopback databases. | Add reviewed production API/session adapters, HTTPS origin configuration, authorization, revocation, error recovery, and hosted verification. Preserve the evaluation boundary around the existing POC endpoints. | Mobile/backend |
| P0, scope-dependent | Complete the actual mobile product scope | The native client has Home, Schedule, read-only Profile and logout. It does not expose the complete web app. Only EMPLOYEE/LEAD can authenticate through its login endpoint. | Define whether launch is an employee schedule viewer or a broader NEVORA app, then implement and accept every advertised workflow. Add native activation/recovery/password-change paths where applicable. Include manager functionality only if in scope. | Product/mobile/backend |
| P1 | Privacy, support and deletion | No public privacy/terms/support routes or linked deletion flow found in the inspected development/POC sources; targeted newer-UI checks found the same gaps. | Public privacy and support/contact URLs linked in app and listings; actual account-deletion initiation and completion with disclosed retention; web deletion request path where Google policy applies. | Product/privacy/backend/web |
| P1, conditional | UGC safety | The newer UI branch has communications/Updates. Existing withdrawal and access-denied states are not abuse reporting or user blocking. | If UGC ships, implement the applicable reporting, filtering/moderation, blocking, accepted-use policy and response process. Do not treat an author withdrawing their own message as abuse moderation. | Product/backend |
| P1 | Store-ready native release projects | POC name and bundle/package ID remain; no configured iOS development team or Android release signing configuration found; no app-owned privacy manifest, entitlements, export flag, or native push setup found. | Final app identity/assets, signed archive/AAB, applicable manifests/SDK audit, permissions, encryption declaration, privacy forms and review metadata. Verify SDK/runtime compatibility. | Mobile/release/privacy |
| P1 | Current release acceptance on devices | Current focused unit tests and JS build pass. Earlier iPhone/Android evidence exists; saved iPad runs failed. | Test the frozen release build on physical iOS/Android devices and every supported form factor, including auth lifecycle, network failure, accessibility, navigation and all advertised actions. | QA/mobile |
| P1, product-dependent | Native notifications | Existing provider/client use Web Push, VAPID and service workers. No native APNs/FCM client/sender integration was found. | If native alerts are in launch scope, implement permission/enrollment, backend delivery, token ownership/rotation/revocation, taps, account switching and failure handling for both platforms. | Mobile/backend |
| P1, product-dependent | Offline punches | Web offline fallback and durable pending Clocker command recovery exist; native POC has no punch workflow. | Explicit offline product policy. If punches can be captured offline, prove persistence, exact retries, deduplication, authorization/session expiration and reconciliation through restart/reconnect. | Product/mobile/backend |
| P2 | Face ID/passkeys, haptics, Live Activities | Not found in the inspected native app. | Implement only for an approved product need; these are not individual prerequisites for store approval. | Product/mobile |

P0 means a structural blocker to the proposed production mobile release. P1 covers submission or release acceptance work, with conditions called out. P2 is optional scope.

## Original 19-item checklist, checked against code

| # | Item | Status and evidence | What remains |
|---|---|---|---|
| 1 | Public privacy policy | **Absent in audited code.** Route inventory and literal-link searches found no policy page or app link. [Login footer](</Users/josek0514/.codex/worktrees/nevora-mobile-launch-audit-20261018/src/app/login/page.tsx:75>) renders [BrandLegal](</Users/josek0514/.codex/worktrees/nevora-mobile-launch-audit-20261018/src/components/brand-legal.tsx:3>), which contains copyright/ownership only. Targeted newer-UI searches found no policy link either. | Publish the actual policy and link it in app and store metadata. External public website availability was not checked. |
| 2 | Terms/use policy | **Absent in audited code.** Files named `shift-changes/terms.ts` represent scheduling terms, not a legal policy. | Add NEVORA terms/acceptable-use policy and acceptance where required for contributed content. A custom /terms route is not universally mandated by Apple. |
| 3 | Support/contact | **Absent in audited code.** No public support/contact route or app support link found. | Publish monitored contact/support details and use the URL in listing/review metadata. |
| 4 | Account/workspace deletion | **Absent in audited code.** [POC Profile](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/work/nevora-cross-platform-poc/apps/employee-poc/src/main.tsx:459>) offers sign-out only. [Newer web Profile](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/work/nevora-native-poc-ui-readiness/src/app/app/profile/page.tsx:13>) has account/calendar/notification/session UI without a deletion flow. [Workspace settings](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/work/nevora-native-poc-ui-readiness/src/app/app/settings/workspace/page.tsx:18>) edits workspace configuration. | Implement actual user deletion and associated data handling. A request can be asynchronous but must lead to deletion. Define lawful retention and timing. Owner workspace deletion is a separate product/data lifecycle decision, not automatically the same store requirement. |
| 5 | Review workspace/accounts | **Partial locally; hosted unverified.** Fictional POC employees and test schedules exist in [Local fixture runner](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/work/nevora-cross-platform-poc/scripts/native-poc-backend.mjs:29>). The native [login role restriction](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/work/nevora-cross-platform-poc/src/app/api/native-poc/login/route.ts:40>) rejects OWNER/MANAGER. | Provide stable hosted fictional reviewer access for every role actually shipping. Manager credentials cannot review this employee-only native app. Local fixture credentials and /ui-preview/home are not hosted review access. |
| 6 | No purchase/upgrade UI | **No billing/pricing/IAP implementation found** in the inspected app sources/packages. Calendar subscriptions are unrelated to paid subscriptions. | Keep the actual employer-paid/access model consistent with applicable store billing rules. The absence of purchases is not a blanket store prohibition on future billing. |
| 7 | Report/hide abusive content | **Absent; conditional on shipped UGC.** [Communications commands](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/work/nevora-native-poc-ui-readiness/src/lib/communications/types.ts:1>) and [Update detail controls](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/work/nevora-native-poc-ui-readiness/src/components/communication-detail.tsx:81>) support reading/acknowledgement/withdrawal, not an abuse-report/block flow. | Implement the applicable safety controls if Updates, team messages, exchange text or other UGC is included. Read-only schedule viewing does not make all future messaging requirements automatically in scope. |
| 8 | Native push | **Web foundation only.** [Provider](</Users/josek0514/.codex/worktrees/nevora-mobile-launch-audit-20261018/src/lib/notifications/provider.ts:3>) imports web-push. [Client](</Users/josek0514/.codex/worktrees/nevora-mobile-launch-audit-20261018/src/lib/notifications/device-client.ts:325>) calls Notification and registers a service worker. The newer UI provider remains web-push. Prototype package has Capacitor App and a custom session plugin, not a push plugin. No google-services.json found in the Android app. | Native delivery/enrollment and backend integration for APNs and Android, if native alerts ship. |
| 9 | Face ID/passkeys | **Absent; optional.** No biometrics/passkey implementation found in inspected POC sources/dependencies. | Defer unless approved for launch. Native secure storage already provides a useful foundation. |
| 10 | Offline punches/offline page | **Partial.** [Service-worker fallback](</Users/josek0514/.codex/worktrees/nevora-mobile-launch-audit-20261018/public/fuel-portal-sw.js:87>) handles GET navigation failure and serves a static offline page. [Clocker command recovery](</Users/josek0514/.codex/worktrees/nevora-mobile-launch-audit-20261018/src/lib/clocker/punch-client.ts:77>) stores pending commands and preserves exact recovery intent. | This is not a native offline punch implementation or proof of offline acceptance. POC has no punches; its bundled UI shows a connection/retry error. Decide and test the intended offline behavior. |
| 11 | Live Activity | **Absent; optional.** No ActivityKit implementation found. | Defer unless there is an approved need. |
| 12 | Native feel | **Partial and further along than the original list.** [Android Back handler](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/work/nevora-cross-platform-poc/apps/employee-poc/src/main.tsx:98>) closes details, returns Home, then minimizes. Modal focus restoration, safe-area CSS, icons and launch resources exist. | Verify iOS gestures, external-link routing when links are introduced, cold-start appearance, keyboard, system Back on release builds and physical devices. No haptics or explicit swipe-close implementation found. |
| 13 | System text size/accessibility | **Partial/unverified.** Semantic buttons/labels, focus restoration and reduced-motion CSS exist. [POC CSS](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/work/nevora-cross-platform-poc/apps/employee-poc/src/ui.css:4>) uses text-size-adjust:100% and many fixed pixel font sizes. No explicit Dynamic Type/font-scale bridge found. | Observe actual iOS/Android font-size changes and VoiceOver/TalkBack on all shipped screens. Fixed pixels alone do not prove failure, but code does not establish support. |
| 14 | Privacy manifest | **App-owned manifest not found** in POC iOS source. SDK dependencies may carry their own manifests; their compliance was not certified. | Review app required-reason API use plus SDK manifests/signatures; add valid app declarations as applicable. |
| 15 | App Privacy labels | **Unverified outside source.** No third-party analytics/tracking SDK is declared in either inspected application package. That does not establish all data practices. | Audit the actual release binary, web content and services; complete Apple labels and Google Data safety for the data actually shipped. Do not automatically declare payroll/uploads if the release viewer never accesses them, or label account-linked data as anonymous. |
| 16 | Permissions | **Appropriate minimal POC surface, broader scope unfinished.** [Android manifest](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/work/nevora-cross-platform-poc/apps/employee-poc/android/app/src/main/AndroidManifest.xml:38>) requests Internet. The schedule viewer has no camera/photo/upload or native notification features. | Add purpose strings/prompts only for features requiring access. Prefer system pickers for uploads. Test denied/revoked access. Do not add camera/photo permissions solely because another web module has uploads. |
| 17 | Encryption/export answer | **Release declaration not found.** [iOS Info.plist](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/work/nevora-cross-platform-poc/apps/employee-poc/ios/App/App/Info.plist:27>) contains local-network POC settings and a localhost backend origin; no ITSAppUsesNonExemptEncryption key was found. | Determine the correct answer from the completed iOS release and SDKs; configure it accordingly. HTTPS through OS networking is typically exempt from documentation, but the current POC is not a reviewed HTTPS production build. |
| 18 | Icons/launch/screenshots/rating | **Partial.** Native AppIcon, Android launcher and launch/splash assets exist; saved simulator/emulator screenshots exist. [Capacitor identity](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/work/nevora-cross-platform-poc/apps/employee-poc/capacitor.config.ts:3>) remains com.velani.nevora.poc / NEVORA POC. | Final app identity and visual review; screenshots of the final release using fictional data; accurate age/content ratings. Existing screenshots do not prove store metadata is complete. |
| 19 | Developer accounts/signing/app record | **Unverified account state; prototype configuration incomplete.** iOS project uses automatic signing but no DEVELOPMENT_TEAM was found. [Android release build type](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/work/nevora-cross-platform-poc/apps/employee-poc/android/app/build.gradle:20>) has no release signing configuration. | Verify Apple and Google organization/account state, registered IDs, capabilities, signing and app records; produce signed store artifacts. No store account was accessed in this audit. |

## Additional platform and product gaps

- **Hosted/release execution is intentionally blocked.** [iOS native origin](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/work/nevora-cross-platform-poc/apps/employee-poc/ios/App/App/NevoraSession.swift:23>) throws in non-debug builds. [Android native request](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/work/nevora-cross-platform-poc/apps/employee-poc/android/app/src/main/java/com/velani/nevora/poc/NevoraSession.java:41>) rejects non-debug builds and allows the emulator host only. [Server evaluation boundary](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/work/nevora-cross-platform-poc/src/lib/native-poc/http.ts:15>) requires a development runtime, explicit local opt-in, owned identity and loopback database. This is intentional prototype isolation, not a defect to bypass.
- **Native feature parity is limited.** [Native screen list](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/work/nevora-cross-platform-poc/apps/employee-poc/src/main.tsx:7>) contains only Home, Schedule and Profile. The [native adapter](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/work/nevora-cross-platform-poc/apps/employee-poc/src/session.ts:32>) exposes only login/home/logout. No native activation, reset access, forced password-change, time punches, requests, exchange, Updates/Inbox, payroll or management flows are implemented in this client.
- **Android target API is already configured.** [variables.gradle](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/work/nevora-cross-platform-poc/apps/employee-poc/android/variables.gradle:1>) sets compile/target SDK 36 and minimum SDK 24. Signed release compatibility, native-library 16 KB page-size checks and physical-device coverage remain unverified.
- **iOS toolchain is available.** This audit observed Xcode 27.0, build 27A266a. That is tool availability, not a signed release archive or successful device run.
- **Google web deletion path is absent in source.** Add a prominent working web request path when the account-creation policy applies, including access after uninstalling.
- **Google submission forms need verification.** Data safety, App access, content rating, target audience, ads status and applicable permission declarations are outside the inspected code.
- **Testing-track eligibility depends on the actual account.** Check whether the new-personal-account closed-testing gate applies; do not assume it applies to an organization account.
- **Deep links and auth lifecycle need release evidence.** Activation/reset links, notification taps, session expiry, account suspension, password-change requirements and logout must be accepted through the native client, not inferred from the web implementations.

## Verification actually performed

### Fresh checks in the isolated audit snapshot

1. Ran:
   `env -u DATABASE_URL -u FUEL_TEST_DATABASE_URL -u NEVORA_OWNED_APP_DATABASE node node_modules/vitest/vitest.mjs run --no-cache src/lib/native-poc/http.test.ts src/lib/mobile-keyboard.test.ts src/lib/notifications/provider.test.ts src/lib/notifications/service-worker.test.ts src/lib/notifications/destinations.test.ts src/lib/notifications/logout.test.ts src/lib/notifications/config.test.ts src/lib/clocker/punch-client.test.ts`
   Result: **8 files, 206 tests passed**, exit 0.
2. Ran `npm run build` in the isolated employee-poc copy with the same three database variables unset.
   Result: **TypeScript check and Vite web-assets build passed**, exit 0, 24 transformed modules. This was not an iOS archive or Android release build.
3. Checked live development SHA and its GitHub workflow:
   [CI run 37765449581](https://github.com/JoseK0514/NEVORA/actions/runs/37765449581) reports success on exact `b58496b8`, created October 8, 2026. That remote CI does not cover uncommitted POC files or the 270 newer web/UI commits.
4. Compared the audit copies of six selected prototype source files against their originals: all matched. Five selected baseline source files also matched between development and the POC base.
5. Rechecked source checkout status after checks: existing main and POC modifications remained as found.

No real email/SMS, orders, customer-data mutations, paid analysis or production deployment was performed.

### Historical artifacts inspected, not rerun

- [API functional results](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/outputs/nevora-cross-platform-poc/api-functional-results.json>): 10 recorded passing local API scenarios.
- [Android functional results](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/outputs/nevora-cross-platform-poc/android-functional-results.json>): 9 recorded passing emulator scenarios, including native bridge login, own schedule, Back, Keystore persistence and logout across restart.
- [iPhone test log](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/outputs/nevora-cross-platform-poc/ios-tests-final.log:497>): October 14 run records 1 XCTest with 0 failures and TEST SUCCEEDED.
- [Android debug build log](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/outputs/nevora-cross-platform-poc/android-build-final.log:178>) records BUILD SUCCESSFUL.
- [iPad test log](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/outputs/nevora-cross-platform-poc/ipad-tests.log:1320>) records an assertion failure; [iPad diagnostic test log](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/outputs/nevora-cross-platform-poc/ipad-tests-diagnostic.log:501>) records a keyboard-focus automation failure. Neither run establishes iPad acceptance.
- [Historical backend source manifest](</Users/josek0514/Documents/Codex/2026-10-14/we-wi/outputs/nevora-cross-platform-poc/backend/owned-next-vJLA2s/source-manifest.json>) references the same baseline commit, but its prototype HTTP/route hashes differ from the current files; the current helper test is absent from that manifest. Historical API/native passes therefore do not certify the exact current source.

No fresh native simulator/emulator suite, physical-device run, hosted end-to-end test, signed archive/AAB, store-account review, full newer-UI regression suite, full application build, or privacy legal review was performed.

## Handoff

Recommended next action: choose the exact web source and employee/manager mobile scope, then implement the P0 production integration on an isolated branch. The local-only prototype provides reusable work; it does not provide a releasable hosted client.

Engineering owns the production adapters and release projects; privacy/product owns the policies, deletion/retention and UGC rules; QA owns fresh device acceptance on the frozen candidate; the account owner owns developer-account/store verification and final publication authorization.

No implementation commit, pull request, merge, push or deployment was created by this audit. The detached audit checkout remains available for reproducing the focused checks.

## Policy references

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple account deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- [Google account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)
- [Google UGC policy](https://support.google.com/googleplay/android-developer/answer/9876937?hl=en)
- [Apple SDK minimum requirements](https://developer.apple.com/news/upcoming-requirements/?id=04282026a)
- [Google target API requirements](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en-en)
- [Google testing requirements for new personal accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)

