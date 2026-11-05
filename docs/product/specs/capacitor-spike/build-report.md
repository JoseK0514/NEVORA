# NEVORA native prototype — cloud build report

Date: November 2, 2026. Base: freshly fetched development
`1e6f35ab9731234fc765aa18ee817cb196459e2e`.

## Verdict

**Continue platform validation.** The Android packaged prototype compiles; iOS
source is prepared. This is not a completed native transition or a store-ready
release. The seven-question spike cannot receive a Go verdict from browser tests
or source inspection alone.

## Implemented

- Isolated Capacitor 8.6.0 project with pinned dependencies and its own lockfile.
- Android and Swift Package Manager iOS projects, provisional `com.nevora.spike`
  identity and NEVORA Preview display name.
- Packaged fictional device-check screen with existing brand assets, dialogs,
  keyboard form, local marker, passive API diagnostics and relative-size text.
- Local-runtime configuration for the existing Next.js app/fictional Home. Remote
  and production hosts are rejected; the origin and launch route remain separate.
- Android local-runtime Back handling respects focused modal ownership and the
  app's cancellation/animation path. Packaged content uses its own App listener.
- Debug-only loopback HTTP exceptions, excluded backup/device transfer, and
  disabled release variants. No native auth bypass or new backend endpoint.
- iOS fixture Dynamic Type source, scoped Debug transport settings, programmatic
  controller and source-only Live Activity experiment outside the build target.
- Build scripts, an inactive GitHub Actions template, acceptance matrix, review,
  and Claude handoff. No signing-account or CI configuration was changed remotely.

## Evidence obtained

| Check | Result and scope |
|---|---|
| Native project TypeScript | Passed |
| Vite build | Passed; packaged fixture assets generated |
| Configuration + fixture Back checks | 10 passed |
| Exact Android Back policy checks | 9 passed |
| Chromium fixture flows | 4 passed at 320/390/768/1440px; includes 200% root text, readable reflow, modal Escape/focus, keyboard input clearing, marker reload/clear |
| Independent review | Origin/route bug and wrong-modal bug corrected and rechecked; reverse-DOM-order modal reproduction passes |
| Android packaged build | `:app:assembleDebug` passed using Java 21 JDK, API 36, AGP 8.13 / Gradle 8.14.3 |
| APK signature | Debug APK v2 signature verifies; not a production signing identity |
| APK content | `com.nevora.spike`; no remote server in default package; native Back asset matches reviewed source |
| Release build guard | `:app:assembleRelease` is unavailable because release variants are disabled; expected rejection confirmed |
| Existing NEVORA Home | Local `/ui-preview/home` returned HTTP 200 in Chromium, no page errors; this is the existing fictional preview, not authentication or native evidence |
| Production dependency audit | npm reported zero vulnerabilities for the prototype's production dependencies |
| iOS structure | Plist/storyboard/asset JSON parsing and source API inspection only |
| iOS build | Not run: the build command reports that macOS/Xcode is required |

Native emulator and local-runtime build results are recorded in the final run
addendum below. Browser checks do not establish native keyboard, gesture, cookie,
passkey, screen-reader, or offline behavior.

## Seven feasibility questions

| PRD question | Status |
|---|---|
| Q1 Passkeys | Existing web client/server identified. Native credential create/get, verified domains and platform support unverified. No credential was created. |
| Q2 Service worker/offline | Packaged assets exist; real-app service-worker/offline recovery and iOS App-Bound behavior unverified. |
| Q3 Live Activity | Source experiment and wiring notes prepared outside targets. Not compiled, wired or demonstrated. |
| Q4 Beta readiness | Android debug package built; iOS project and readiness matrix prepared. Device signing, store records, privacy answers, review workspace and uploads remain open. |
| Q5 System text size | Browser fixture at 200% passes. iOS bridge is source-only; OS-to-WebView behavior and real app fixed-pixel text remain unverified. |
| Q6 Back/sheets | JavaScript policy passes focused regression and browser reproduction. Native dispatcher, gesture and IME behavior remain unverified; iOS history swipe remains off. |
| Q7 Account deletion | Existing request UI/server and official store guidance reviewed. Request handling is not completed erasure; operator fulfillment evidence remains necessary. |

## Scope and release impact

No production data, databases, credentials, email, push subscriptions, signing
accounts, deployment, store submission, commit or remote branch change was used.
The original app checkout remains separate. This isolated prototype has no impact
on Release 1 until separately reviewed and integrated. Its development base must
not be treated as the frozen Release 1 candidate.

Governance recommendation: continue the prototype with the listed technical
conditions; **not ready for native release**. No policy exception was taken.

## Reproduction and handoff

Use `native/README.md`. Final logs/screenshots accompany the source handoff.
First next gate: compile/run iOS on macOS and execute native device scenarios on
an accelerated Android runner or phone, then test actual NEVORA's owned fictional
authentication/session flows. See `acceptance-matrix.md` for exact criteria.

## Final run addendum

- **Both Android configurations compile.** The local-runtime variant uses
  `http://localhost:3000` plus `/ui-preview/home` in `server.appStartPath`.
  Its first real build exposed a manifest merge conflict with Capacitor's generated
  Cordova project. An explicit merge override preserves the application's
  `usesCleartextTraffic=false`. The successful APK's compiled XML confirms that
  value, disabled backups, deny-all base network policy and only exact localhost,
  127.0.0.1 and 10.0.2.2 Debug HTTP exceptions. No wildcard or global HTTP allowance.
- **Default package restored and rebuilt:** `NEVORA-device-prototype.apk`,
  4,048,616 bytes. SHA-256:
  `392de2db78af9165b6d95c4ac2cabf561929e442696b88e7a32933b23fdf6ec6`.
  Its embedded config has no remote server. Back-policy bytes match the reviewed
  source. APK signature verification passed again after the final rebuild.
- **Android native execution is unverified.** This cloud host has no `/dev/kvm`.
  An API 36 emulator was installed and attempted with software acceleration off.
  ADB eventually connected, but Android's package service remained unavailable;
  APK installation failed with `Can't find service: package`. No app launch,
  native screenshot, native Back or process-restart success is claimed.
  `tests/android-device.mjs` is a prepared, syntax-checked opt-in runner for an
  operational owned emulator; it was not run successfully here.
- **iOS is uncompiled.** The platform script exits before any build/sync on Linux.
  The prepared CI file remains an inactive template; no hosted jobs ran.
- **Verification totals:** 19 configuration/navigation policy checks plus four
  Chromium flow checks passed. The regular `npm test` skips browser checks unless
  its explicit local URL is set; the separate recorded browser run has four passes
  and zero skips. Root app tests and existing failing Release 1 CI were not rerun.
- Temporary Next.js-generated `next-env.d.ts` changes from the local preview were
  restored. All tracked base application files remain unchanged. No commit/push.

The distributable APK contains the fictional device prototype only. The separate
local-runtime APK is retained as internal build evidence and is not the download.
