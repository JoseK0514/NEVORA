# Employee mobile Passkeys

Implemented in the local React prototype at **Your account → Security → Passkeys**. The saved-record example is open in the existing Employee browser tab. Default entry starts with an empty sample list.

Final HTML SHA-256: `ca06758a67f8669c9d3302dff4421e758b148ada97a8833b2cd39beb93495bb2`.

## Behavior and source boundaries

The read-only development source at46e202786863279302026ee03a0e225c359fa55c permits own-account passkey listing, supported-browser registration and confirmed removal, including the last key. Nine frozen files and hashes are in `work/employee-mobile/references/passkeys-source/manifest.json`. The actual application checkout remains clean and unchanged at that detached revision.

The prototype uses only name, added date and last-used date. A new fictional record says “This device” and “Not used yet.” Feature-off hides the Profile entry. Denied/foreign/expired/disabled account fixtures withhold records and actions. Unsupported browsers retain own-list management but cannot add. Loading/failed reads withhold changes and offer an explicit check/retry.

Setup uses a clearly labeled sample confirmation; removal names the chosen key and initially focuses Keep. Cancellation changes no records. Unconfirmed results block further changes until the sample list is refreshed; registration is never blindly repeated. Sign-out clears private metadata and pending work, and epoch/authority checks reject stale completions. No rename, other-employee selector, management/security-policy editor or biometric settings are exposed.

No WebAuthn, native biometric prompt, credential creation/removal, real sign-in, permission request, remote API, notification, cookie or private-data persistence occurs. Real authentication integration must retain server-enforced session proof and account ownership; the local model is not proof of server security.

## Verification actually run

- Strict TypeScript and source/saved/served build comparison pass.
- **31 focused browser groups in each Chromium/WebKit/Firefox**, plus319 existing groups in each, produce350 groups per engine. Final-hash results and logs live in `work/employee-mobile/evidence/passkeys-pass/` and [checks.json](checks.json). No runtime errors, credential/permission calls or external/mutation requests were captured by focused instrumentation.
-13 pure passkey model groups pass: independent own/account/proof/feature/read gates; supported setup vs own removal; foreign filtering; cancellation; single completion; stale IDs; last-key removal; failed/uncertain changes; refresh recovery; interruption; lost authority; sign-out/epoch clearing. Existing model suites also pass.
- Light/Dark captures at320/390/430/884px and200% text cover metadata, sheets, controls and recovery.27 passkey PNG hashes and origins are verified. At884px, evidence is the430px app-element crop from that viewport. Enlarged sheets use separate content/action scroll views.
- A reproduced BODY-focus gap and WebKit Tab continuation failure were corrected without weakening assertions. Added assertions check focused/visible recovery heading, one-Tab Refresh focus/visibility for add/remove in both themes at200%, and retained refresh-error notice focus.
-21st search metadata informed reuse of existing primitives; no component installation or paid generation. Review reports5 files,0 findings. Existing detector hook reported no deterministic issues.
-77 public rasters have current origin metadata and verified hashes. Source modules remain below250 nonblank/noncomment lines; Light/Dark palette and frozen Owner foundation are unchanged.

## Review and handoff

The initial independent full source/screenshot review and followup are retained under `.omo/evidence/employee-passkeys-*`. The [final verdict](passkeys-ui-review.md) scores both the MEDIUM recovery-focus issue and LOW directional-copy issue resolved. This is a bounded verdict pass, not an independent browser/device or screen-reader certification. The [design record](passkeys-design-record.md) compares the extension to incumbent tokens and primitives. Substitute UI reviewer/documenter roles were used because the skill’s named roles are unavailable.

Changed implementation: `src/Passkeys.tsx`, `PasskeyHelp.tsx`, `Passkeys.css`, `passkeys-model.ts`, plus Profile/App/model/session/build integration, all under `work/employee-mobile/`. Published artifact and previews are under `outputs/employee-mobile/`. No application branch, commit, PR or deployment was created. Next user action: review the interactive local Passkeys screen; live-auth integration remains a later implementation step.
