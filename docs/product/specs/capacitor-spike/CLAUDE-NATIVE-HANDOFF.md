# NEVORA native prototype handoff

Jose said “Let’s get it done” after reviewing the native transition. This work
implements the isolated feasibility prototype described in the existing Capacitor
PRD. It does not authorize deployment, signing-account changes or store submission.

## Where the work is

- Isolated detached worktree: `/workspace/NEVORA-native`.
- Fresh development base: `1e6f35ab9731234fc765aa18ee817cb196459e2e`.
- New code is entirely under `native/`; reports are in this directory.
- Root app package, auth, database, CI workflows and deployment settings were not
  intentionally changed. No new branch, commit, push, merge or deployment.
- The original `/workspace/NEVORA` checkout and marketing work remain separate.

## Read first

1. `build-report.md` for actual final evidence and remaining questions.
2. `implementation-review.md` for independently rechecked source defects.
3. `acceptance-matrix.md` for the seven spike questions and updated assumptions.
4. `native/README.md`, `native/ios-notes.md`, `native/android/IMPLEMENTATION.md`.

## What to preserve

- Default app is a packaged, explicitly fictional device-check fixture. It must
  never be described as full NEVORA, working authentication or offline attendance.
- Local-runtime mode accepts only explicit loopback debug targets. Keep
  `server.url` an origin and `server.appStartPath` a separate route; a path in the
  origin triggers Capacitor Android's weaker legacy bridge fallback.
- Do not dismiss a route-owned dialog with direct `.close()`. Preserve cancellation
  and animation. Select the focused modal, not the last dialog in DOM order.
- Android uses debug-only loopback cleartext, no backups, no data transfer, no
  release variants. The fixture and local-runtime modes have separate Back owners.
- iOS Dynamic Type applies to the packaged fixture only; real app text conversion
  remains its own work. History swipe is deliberately still unverified/off.
- No native push or WebAuthn credential operation is claimed. Browser Web Push and
  existing account-deletion requests are foundations, not store acceptance.

## Next implementation and verification

- On a macOS runner, run the unsigned simulator build and fix actual compiler or
  simulator defects. Do not mark iOS ready from Linux plist/source checks.
- Exercise the real local NEVORA fictional runtime in native views: password
  sign-in, restart/session cookie, sign-out, sheets, keyboard and background return.
- Use Android `adb reverse` with localhost; changing auth to accept arbitrary
  emulator/remote origins is not a shortcut.
- Q1 needs supported WebView/native credential APIs and verified associated domains.
- Q2 needs real-app service-worker/network-failure tests; packaged assets are not
  evidence of server-rendered offline functionality.
- Q3 Live Activity experiment is source-only outside build targets. Wire a debug
  widget extension and test the fictional start/end lifecycle on the Mac.
- Complete native large-text, keyboard, accessibility and performance checks.
- App-store identities, 1024px icon exports, privacy answers, operator deletion
  fulfillment, signing, beta upload and reviewer workspace remain separate steps.

The GitHub workflow under `native/ci/` is an unactivated template. It contains no
credentials and has not run remotely. Do not silently move it into release CI.
