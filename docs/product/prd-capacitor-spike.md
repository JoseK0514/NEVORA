# PRD: Capacitor spike (two weeks)

- **Cycle:** 1, PRD step. Written 2026-10-17 by the Product Manager.
- **Approval:** direction §5 decision 2. Jose approved Capacitor loading the live Next.js app as the app-store route, **for a two-week spike only**, on fictional data, on 2026-10-17 (`docs/product/direction.md`, "Checkpoint 1 decision"). The build decision comes after the spike. Anything that needs Jose's own accounts waits for him to do it or to authorise it explicitly.
- **Sources:** competitive C §5, C §8 (route comparison, thresholds T1 to T3, spike items a to d), C §10; trends T §3.3, T §3.9, T §4; direction §2.3 A11, A12, §5 decisions 2, 5 and 7.
- **Status:** ready to plan. This PRD defines a time-boxed investigation, not a product release.

## Contents

1. Summary
2. Problem
3. Users and platforms
4. The seven questions: stories and acceptance criteria
5. States the spike must exercise
6. Out of scope
7. Dependencies, safety and Jose-only steps
8. Metrics
9. Plan, slices and checkpoints
10. Exit criteria and the go/no-go report
11. Open questions

---

## 1. Summary

The UI Engineer builds a throwaway Capacitor shell for iOS and Android in an isolated worktree. The shell loads the local NEVORA fictional runtime, and the engineer answers seven questions that decide whether a store build is worth it. Local work runs on simulators and the emulator. Steps that need Jose's Apple Developer or Google Play Console account, a hosted test domain, a TestFlight or Play upload, or a message to Apple are marked **Jose-only** and wait for his explicit go-ahead. The spike ends with a go, no-go or re-plan report. Nothing is merged, committed, published or sent.

## 2. Problem

- **NEVORA has no store app.** All eleven competitors ship native apps rated 4.4 or higher, and employers tell staff to "download" an app (C §8 reason 2).
- **The route has known unknowns.** C §8 picked Capacitor over the live Next.js app because it is the only route that passes all three thresholds (T1 a credible path through Apple guideline 4.2, T2 one UI codebase, T3 keeps the accessibility we verify). It also names the risks no one has tested: passkeys inside WKWebView, the service worker under App-Bound Domains, a Live Activity, and a TestFlight submission. Direction §5 added three checks: OS text size reaching the web view, Back closing sheets, and Apple's account-deletion rule (5.1.1) for employer-created accounts.
- **Facts about today's code** (C §8):
  - Next.js 16 App Router with server rendering: 51 pages and 60 route handlers. A static export won't work, so the shell loads the HTTPS app.
  - A PWA with manifest, offline page and web push (`public/fuel-portal-sw.js`, scope `/app`).
  - No WebAuthn code in `src/` (T §3.1).
  - `package.json` has no Capacitor dependency.
- **Local tools available** (checked 2026-10-17): Xcode 27.0 with iOS 26.5 and 27.0 simulator runtimes; an Android SDK with an `android-36` Google APIs image and the AVD `Nevora_Pixel_7_API_36`; Java. CocoaPods isn't installed, so the shell uses Swift Package Manager, which Capacitor 8 supports and Ionic recommends before 2 Dec 2026 (C §8).

## 3. Users and platforms

| Who | What they need from the spike |
|---|---|
| Jose | A clear go, no-go or re-plan, the cost of the build, and a list of what he must do himself |
| UI Engineer | A bounded task list with pass and fail rules |
| Product Designer | Evidence that the shell keeps NEVORA's look, accessibility and trust traits (scorecard re-score of A11 and A12) |
| Employees, managers, Owners | Nobody uses the spike build. It decides whether they get store apps |

| Platform | Spike coverage |
|---|---|
| iOS app | Capacitor shell on the iOS 26.5 and 27.0 simulators. Physical iPhone only if Jose authorises a signed build (Jose-only) |
| Android app | Capacitor shell on `Nevora_Pixel_7_API_36`. Physical phone through `adb` if Jose plugs his in |
| Desktop web | Unchanged. The report confirms the web app needs no change for the shell |
| Mobile web | Unchanged. Used as the comparison for each question |
| PWA | Unchanged. The report states that the PWA stays supported after any store app (direction §4) |

## 4. The seven questions: stories and acceptance criteria

Each question gets a verdict in the report: **Yes**, **Yes with a workaround** (named, with cost), **No**, or **Not answered** (with the blocker, usually a Jose-only step).

### Q1. Passkeys inside the iOS web view

*As Jose, I want to know whether passkeys work inside the app's web view, so that the later passkey phase (direction item 3) can plan for the store app.*

- **AC1.1** Given the shell on the iOS simulator, when it loads a throwaway WebAuthn test page in the worktree (a fictional relying party, no NEVORA sign-in change, no credential table), then the report records whether `PublicKeyCredential` exists and what `isUserVerifyingPlatformAuthenticatorAvailable()` returns.
- **AC1.2** Given the same page, when it calls `navigator.credentials.create()` and `.get()`, then the report records whether the system passkey sheet appears, whether a credential returns, and the exact error if not.
- **AC1.3** Given WebAuthn in WKWebView needs an associated domain (`webcredentials:`) with an `apple-app-site-association` file on an HTTPS domain and Jose's Apple team ID, when the local test can't satisfy that, then the report marks the final check **Jose-only** and lists the exact steps: team ID, entitlement, test domain, AASA file contents.
- **AC1.4** Given Android, when the same page runs in the shell's WebView, then the report records whether WebView WebAuthn support (AndroidX WebKit) and Digital Asset Links are needed, and what a full test would require.
- **AC1.5** Given a plugin alternative (native `ASAuthorization` or Android Credential Manager through a Capacitor plugin), when the web route fails, then the report names one maintained plugin, its licence and last release date, and doesn't install it beyond the worktree.

### Q2. The service worker under App-Bound Domains

*As Jose, I want to know whether the PWA's service worker works in the iOS shell, so that offline pages and the later offline Clocker (B6) can run there.*

- **AC2.1** Given the shell on iOS with `WKAppBoundDomains` in `Info.plist` and `limitsNavigationsToAppBoundDomains` on, when it loads `/app`, then the report records whether `/fuel-portal-sw.js` registers with scope `/app`.
- **AC2.2** Given the worker registered, when the engineer stops the local server and reloads, then the report records whether the branded offline page (`public/fuel-portal-offline.html`) appears.
- **AC2.3** Given App-Bound Domains allow at most 10 domains with no wildcards (C §8), when the report lists every origin the app must load inside the web view (portal, Clocker origin, anything else found in the network log), then it states whether NEVORA fits.
- **AC2.4** Given links that leave NEVORA (payroll provider documents, calendar subscriptions), when tapped in the shell, then the report records whether they open in the system browser and never load inside the web view.
- **AC2.5** Given `localhost` may not count as an app-bound domain, when the local test can't run for that reason, then the report says so and marks the check **Jose-only** (it needs an HTTPS test domain). The engineer doesn't edit `/etc/hosts` or any system setting to work around it.
- **AC2.6** Given Android, when the shell's WebView loads `/app`, then the report records whether the worker registers and the offline page appears.
- **AC2.7** Given push, when the worker registers, then nobody subscribes to push or sends a notification. Push is out of the spike (section 6).

### Q3. One Live Activity

*As Jose, I want one working Live Activity on the simulator, so that I can judge the native work behind A12 before scoring it again.*

- **AC3.1** Given a Swift ActivityKit widget extension in the worktree's iOS project, when the engineer starts it from a local debug control with fictional data, then the lock screen and Dynamic Island show "Main Office · starts 8:00 AM" and nothing else. No pay, hours or names appear (T §3.9, HIG Live Activities 2026-10-13).
- **AC3.2** Given the activity, when its fictional shift ends or 8 hours pass, then it ends, following HIG's 8-hour limit.
- **AC3.3** Given the simulator's Larger Text setting at the largest standard size and the first accessibility size, when the activity shows, then the report includes screenshots and notes any clipping.
- **AC3.4** Given the activity, when the engineer checks Reduce Motion, Increase Contrast and the Accessibility Inspector labels, then the report records the results. VoiceOver itself can't run on the simulator; the report lists it as owed.
- **AC3.5** Given how the activity would start in a real build (from the web page through a plugin call, or by push-to-start through APNs), when the report describes it, then it estimates the work for both and notes that APNs needs a server sender, a backend phase not yet approved (direction §5 decision 3).

### Q4. TestFlight submission readiness

*As Jose, I want a complete readiness checklist, so that a TestFlight build is one decision away and not a week of surprises.*

- **AC4.1** Given the iOS project, when the engineer builds for the simulator, then it builds with no warnings the engineer can't explain.
- **AC4.2** Given the readiness checklist, when the report fills it, then each line says **ready**, **gap** (with an estimate) or **Jose-only**:
  - bundle ID and display name; app icons (1024px and the icon set) from existing NEVORA assets in `public/icons/`; launch screen in the masthead teal;
  - privacy manifest (`PrivacyInfo.xcprivacy`) with the required-reason APIs the shell and plugins use;
  - a draft of App Privacy answers, marked for privacy review before anyone submits them;
  - export compliance (encryption) answer;
  - guideline 4.2 mitigations present in the spike build, from C §8: native push, passkey or biometric sign-in, a Live Activity, offline punches, Spanish. The report marks which exist and which wait for their own phases;
  - review notes and a fictional review workspace that Apple's reviewers can reach;
  - signing certificate and provisioning profile (Jose-only);
  - App Store Connect app record (Jose-only);
  - archive and upload to TestFlight (Jose-only, explicit authorisation).
- **AC4.3** Given Android, when the engineer builds a debug APK and, optionally, a release bundle signed with a local throwaway key, then the report covers the Play internal-testing equivalents: package name, Data safety form draft (privacy review), target API level, and the Play Console steps (Jose-only).
- **AC4.4** Given a review workspace must be hosted to be reachable by Apple, when the report describes it, then it marks hosting as a Jose-only deployment decision. It also names migrations 0031 and 0032, which must apply to any database a store build points at (direction §5 decision 7).

### Q5. Text size reaching the web view

*As an employee who uses large text, I want my phone's text setting to reach NEVORA inside the app, so that I can read it without zooming.*

- **AC5.1** Given the iOS simulator's Larger Text setting, when the shell loads a page already moved to `rem` by `prd-phone-foundations.md` (at least slice 1 and one page slice), then the report records whether text grows with no extra code.
- **AC5.2** Given it doesn't, when the engineer tries the candidate mechanisms one at a time, then the report records for each whether text grows, whether the default look changes, and the cost:
  - the shell reads the content size category and sets the root font size;
  - the `@capacitor/text-zoom` plugin;
  - `font: -apple-system-body` on the root (see `prd-phone-foundations.md` Q3).
- **AC5.3** Given Android's font size and display size settings, when the shell's WebView loads the same page, then the report records whether text grows and how (WebView text zoom or root size).
- **AC5.4** Given the winning mechanism, when the page runs at the largest standard size and the first accessibility size, then it meets `prd-phone-foundations.md` AC1.5 (no sideways scroll, no clipping, targets 44px or more).
- **AC5.5** Given phone foundations hasn't shipped a page slice by spike day 3, when Q5 starts, then the engineer uses a test page in the worktree with `rem` type and says so in the report.

### Q6. Back closes sheets

*As an employee on Android, I want Back to close the menu I opened inside the app, so that I don't leave the page or the app by accident.*

- **AC6.1** Given the Android shell, when an employee opens More and presses Back (button and gesture), then the report records what happens by default. Capacitor's default sends Back to web history or exits the app.
- **AC6.2** Given a handler on the Capacitor App plugin's `backButton` event that closes the top open popover or dialog first, when the engineer tests the surfaces listed in `prd-phone-polish.md` Part A, then each closes on Back, and Back with nothing open goes back in history, then leaves the app at Home.
- **AC6.3** Given the iOS shell, when the engineer checks the edge swipe, then the report records whether `allowsBackForwardNavigationGestures` is on and what the swipe does with a sheet open.
- **AC6.4** Given Android's predictive back, when the report covers it, then it states what opting in needs and whether it conflicts with the handler (T §4).
- **AC6.5** Given `prd-phone-polish.md` slice A2, when the spike finishes, then the report says whether the web fix and the shell handler can share one close routine.

### Q7. Apple's account-deletion answer for employer-created accounts

*As Jose, I want to know whether Apple will require in-app account deletion, so that I can plan the privacy and backend work before a submission.*

- **AC7.1** Given App Review Guideline 5.1.1(v) and Apple's published guidance on offering account deletion, when the engineer reads them, then the report quotes the deciding rule in under 15 words, cites the page and the date read, and summarises the rest in its own words.
- **AC7.2** Given NEVORA's account model, when the report applies the rule, then it states the facts it relies on: employees activate accounts their employer created (`/activate`); Owners come from setup (`scripts/bootstrap-owner.mjs`); and whether any in-app path creates an account.
- **AC7.3** Given Google Play's account-deletion requirement, when the report covers it, then it applies the same facts to Play.
- **AC7.4** Given the rule is unclear for this model, when the report needs Apple's answer, then it includes a draft question for Jose to send himself (Jose-only: the engineer sends no message to Apple).
- **AC7.5** Given any deletion feature, when the report recommends one, then it marks it as needing backend, privacy and legal approval (direction §5 decision 5). The spike builds none.

## 5. States the spike must exercise

| State | What the spike checks | Platforms |
|---|---|---|
| Loading | Cold start to Home: time to first paint inside the shell vs Safari or Chrome on the same simulator; no white flash (the launch screen and `background_color` `#FFFFFF` match) | iOS, Android |
| Empty | A fictional employee with no published shift: the calm card renders in the shell | iOS, Android |
| Error | The local server returns 500 for one route: the app's error page renders inside the shell, with no native crash | iOS, Android |
| Offline | Server stopped: the offline page (Q2) or the web view's default error, recorded | iOS, Android |
| Reduced motion | OS Reduce Motion on: `prefers-reduced-motion` reaches the web view; the More sheet and the U7 celebration respect it | iOS, Android |
| Keyboard | Hardware keyboard on the iPad simulator and the emulator: Tab order, focus ring, Esc closing sheets | iOS, Android |
| On-screen keyboard | Focus in a form field: the tab bar hides (the `mobile-keyboard-open` class, `app-shell.tsx:107-136`) and fields aren't covered | iOS, Android |
| Safe areas | Masthead under the status bar, tab bar above the home indicator, Dynamic Island clear | iOS |
| 200% text | Q5 | iOS, Android |
| Screen reader | Accessibility Inspector on iOS; TalkBack on the emulator for the More sheet and the Home pass. VoiceOver on a device is owed | iOS, Android |
| Session | Sign-in on the fictional runtime in development mode; cookie survives an app restart; sign-out clears it | iOS, Android |

## 6. Out of scope

- Any change to NEVORA's server behaviour, routes, data contracts or migrations.
- The passkey auth change (WebAuthn routes, credential table, recovery rules). Q1 uses a throwaway page only.
- Native push, APNs or FCM senders, and any push subscription or notification, real or test.
- Biometric unlock, haptics, pull to refresh, widgets, native tab bars, native search.
- Offline punches (B6) and the Clocker inside the shell.
- Store listings, screenshots for the stores, pricing, and any TestFlight, Play or store submission without Jose's explicit authorisation.
- A hosted review workspace or test domain without Jose's explicit authorisation.
- Account deletion features (backend, privacy and legal).
- Spanish (B5).
- Merging the worktree, adding Capacitor to the main `package.json`, or committing anything.

## 7. Dependencies, safety and Jose-only steps

### Where the work runs

- An isolated git worktree (for example `.claude/worktrees/capacitor-spike`). Capacitor's `capacitor.config.ts`, `ios/` and `android/` folders, and the throwaway WebAuthn page, live only there.
- Capacitor packages install into the worktree's `node_modules` from the npm registry. The report lists each package and version; adding them to the main repo is part of the build decision.
- The shell's `server.url` points at the local fictional runtime started per `CLAUDE.md` and `.claude/UI-SETUP.md`, with access details in `.claude/preview-access.md` (never repeated in the report). The iOS simulator reaches `localhost` directly; the Android emulator uses `10.0.2.2` or `adb reverse`. Cleartext http is allowed for the debug build only.
- Development-mode runtime, because production's `Secure` cookie is dropped on local http (DESIGN.MD Owed testing).

### Safety

- Fictional data only. No production credentials or databases.
- No email, SMS or push, real or test.
- No deployment, publishing, push to a remote, or commit.
- No system or security setting changes on the Mac (no `/etc/hosts` edits, no VoiceOver AppleScript permission).
- No paid generation. App icons come from existing assets.

### Jose-only steps

The engineer prepares each step as a short checklist and stops. Jose does it himself or authorises it in chat, one step at a time.

| # | Step | Needed for |
|---|---|---|
| J1 | Apple Developer Program team ID, signing certificate and provisioning profile | Q1 (associated domains), physical iPhone runs, Q4 |
| J2 | An HTTPS test domain serving `apple-app-site-association` and `assetlinks.json` (a deployment) | Q1, possibly Q2 |
| J3 | App Store Connect app record | Q4 |
| J4 | Archive and upload a build to TestFlight (internal testers only) | Q4, if Jose wants the upload inside the spike |
| J5 | Google Play Console app and internal-testing upload | Q4 (Android) |
| J6 | A hosted fictional review workspace | Q4 |
| J7 | Sending the account-deletion question to Apple | Q7, if needed |
| J8 | Running the shell on his own iPhone and Android phone | Device confirmation for Q5 and Q6 |

### Product dependencies

- `prd-phone-foundations.md` slice 1 and one page slice, for Q5 (otherwise AC5.5).
- `prd-phone-polish.md` Part A matrix, for Q6 comparison.
- Migrations 0031 and 0032 applied before any build points at a real workspace (direction §5 decision 7). The spike points at none.

### Constants touched: none

The shell loads the same web UI. Wordmark, teal, Inter, Phosphor, 44px targets, focus rings, reduced motion, B1 branding, payroll copy and navigation stay as they are. The launch screen and icons use the existing NEVORA wordmark and masthead teal.

## 8. Metrics

Measured on simulators and the emulator against the fictional runtime.

| Metric | Why it matters |
|---|---|
| Questions answered Yes, Yes with a workaround, No, Not answered | The go/no-go input |
| Cold start to Home first paint, shell vs mobile browser (median of 5) | The shell mustn't feel slower than the browser |
| Shell size (iOS `.app`, Android APK) | Download cost for employees |
| New native code in the shell (Swift and Kotlin lines, plugin count) | Upkeep cost, the scorecard's Cost line |
| Web code changes the shell needs | T2: one UI codebase. Target: zero, or a short list |
| axe and the U1, U2 flow checks run through the shell's web view where tooling allows | T3: accessibility kept |
| Jose-only steps needed for a TestFlight build | Size of Jose's part |
| Estimated weeks to a first internal TestFlight and Play internal build | Build cost |

## 9. Plan, slices and checkpoints

Ten working days. Each slice ends with a short note in the report. Jose has two checkpoints.

| Days | Slice | Output |
|---|---|---|
| 1 | **Shell boots** | Capacitor project in the worktree; iOS and Android shells load `/app` on the fictional runtime; sign-in works; safe areas checked |
| 2 to 3 | **Q2 and Q6** | Service worker and offline results; Back matrix in both shells; the `backButton` handler |
| 3 to 4 | **Q5** | Text-size results on both platforms |
| 5 | **Checkpoint S1 (Jose)** | Mid-spike note: answers so far, and which Jose-only steps (J1 to J8) he wants to do or authorise in week 2 |
| 6 to 7 | **Q3** | Live Activity on the simulator with screenshots |
| 8 | **Q1** | Local WebAuthn results; with J1 and J2, the full associated-domain test |
| 8 to 9 | **Q4 and Q7** | Readiness checklists for both stores; the 5.1.1 and Play deletion answer; with J3 and J4, the TestFlight upload |
| 10 | **Checkpoint S2 (Jose)** | The go/no-go report |

## 10. Exit criteria and the go/no-go report

The spike ends on day 10 whatever the answers. The UI Engineer writes `docs/product/specs/capacitor-spike/build-report.md`.

### Report contents

1. One-line verdict: **Go**, **No-go** or **Re-plan**.
2. A table of the seven questions with the verdict, evidence (screenshots and recordings in the worktree's evidence folder), workaround and cost for each.
3. The state checks from section 5.
4. The metrics from section 8.
5. The TestFlight and Play readiness checklists.
6. Jose-only steps: done, authorised, or still open.
7. Re-scores of A11 (store apps) and A12 (Live Activity) on the scorecard, for the Product Designer to confirm.
8. A build estimate in weeks, split into shell work, web changes and the backend phases a store build would need (push sender, passkey auth, account deletion).
9. Risks, including the guideline 4.2 rejection risk and what lowers it.
10. Checks not run and why.

### Verdict rules

| Verdict | When |
|---|---|
| **Go** | Q2, Q5 and Q6 are Yes or Yes with a workaround; Q3 is Yes on the simulator; Q4 shows no blocker outside Jose-only steps; Q1 has a credible path (web or plugin); Q7 has an answer or a clear question for Apple; the shell needs no change to NEVORA's web UI beyond a short, listed set |
| **Re-plan** | One of Q1, Q2, Q5 or Q6 is No but has a costed alternative, or key Jose-only steps didn't happen and leave Q1 or Q4 Not answered |
| **No-go** | Two or more of Q1, Q2, Q5 and Q6 are No with no workaround, or the shell needs a second UI codebase (fails T2), or it can't keep the accessibility NEVORA verifies (fails T3). The report then reconsiders the rejected options from C §8 |

## 11. Open questions

| # | Question | Recommendation |
|---|---|---|
| Q1 | Should the TestFlight upload (J4) happen inside the spike or after the go decision? | After the go decision, unless Jose has the developer account ready in week 1. A readiness checklist answers most of Q4 without an upload |
| Q2 | Which test domain for associated domains and App-Bound Domains (J2)? | A dedicated subdomain that serves only the two association files and the fictional runtime, never a production host. Jose decides the host |
| Q3 | Should the spike also try a Trusted Web Activity for Android? | No. C §8 keeps it in reserve only if a Play listing is needed before the spike ends |
| Q4 | Do we test Clocker kiosk mode (Guided Access, screen pinning) in the shell? | No. The Clocker stays in the browser on tablets this cycle; A21 is help text only |

## Decisions (Jose, 2026-10-17)

- **Q1:** the TestFlight upload happens after the go decision, not during the spike.
- **Q2 (open):** the non-production test domain for associated domains. Jose
  provides it before the slices that need it.
- **Jose-only steps J1–J8:** decided at the day-5 checkpoint.
