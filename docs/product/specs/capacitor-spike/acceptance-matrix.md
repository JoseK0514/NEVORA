# Native prototype acceptance matrix

Date: 2026-11-02. Application source inspected: `1e6f35ab9731234fc765aa18ee817cb196459e2e` (`development`).

This is a source and policy review, not device certification. Native compilation, emulator results and implementation changes belong in `build-report.md`; no native checks are marked passed here. The prototype uses fictional data in the detached worktree. It does not authorize production, store submission, real messages, or account changes.

## Existing foundation and corrected assumptions

The October 17 [spike PRD](../../prd-capacitor-spike.md) is the starting scope. Several assumptions predate the current application:

| Earlier premise | Current source evidence | Consequence for the prototype |
|---|---|---|
| No WebAuthn implementation | `src/lib/passkeys/client.ts` registers and signs in with `navigator.credentials.create/get`; `src/lib/auth/passkeys/service.server.ts` checks the configured RP ID, origin and user verification. | Reuse and validate the existing contract. Do not rebuild authentication or weaken origin checks to make the shell pass. |
| Account deletion must be designed | `/app/account/delete`, `/account-deletion`, and `src/lib/account-deletion/requests.server.ts` already implement a password-confirmed request and receipt, session revocation and status recovery. | Verify discoverability, shell navigation and fulfillment. Receiving a request is not completed erasure. |
| More is a popover sheet | `src/components/app-shell.tsx` now links to `/app/more`; `QuietSheet` still powers modal and intercepted-route sheets elsewhere. | Back from More follows page history. Back from an open modal closes the modal first. Test both. |
| A Mac and configured emulators are available | This cloud workspace is Linux; the October 17 workstation inventory describes a different machine. | Record cloud build evidence separately from macOS/iOS and physical-device evidence. |
| Existing offline support means offline app data | `public/fuel-portal-sw.js` caches only public offline assets and supplies a branded fallback when a navigation fetch fails. | Offline acceptance is an honest reconnect state. It does not establish cached schedules or queued punches. |
| Existing notifications cover native delivery | Current client uses browser PushManager and the server uses `web-push`. | APNs/FCM registration and native delivery remain a later integration. Do not subscribe or send during this spike. |

## Seven questions and evidence to collect

| PRD question | Required demonstration | Current finding and remaining dependency |
|---|---|---|
| Q1 — Passkeys | Capability probe; register/sign in/cancel; inspect exact origin/RP result; password fallback; restart and sign-out behavior on both platforms. | Browser implementation exists. Android WebView needs supported WebAuthn configuration and Digital Asset Links. iOS needs the associated-domain/signing configuration and WKWebView verification. A capability boolean alone is not a successful ceremony. |
| Q2 — Service worker and navigation boundary | In the app web view, record registration and scope, public-cache contents, offline reload, reconnect and sign-out. Open an external link and confirm it leaves the privileged web view. | Test the actual served `/app` runtime, not only bundled diagnostics. iOS App-Bound Domains and the final HTTPS origin remain unverified. Never cache authenticated pages, payroll PDFs or API responses to make offline appear functional. |
| Q3 — Live Activity | Fictional start time/location on lock screen and Dynamic Island; start/end; no employee name, hours or pay; text-size and accessibility screenshots. | Requires ActivityKit extension and macOS/iOS execution. Source preparation or a mock is not a working Live Activity. Push-to-start is outside the spike. |
| Q4 — Distribution readiness | Explainable iOS simulator build, Android debug build, package/icon inventory, privacy manifest review, test instructions, and explicit ready/gap status for signing and store forms. | An APK proves compilation only. A debug bundle identifier and icon do not reserve a store identity. No store approval or signed iOS artifact is inferred. |
| Q5 — OS text size | Compare default and enlarged OS text in the actual NEVORA screens; no clipped text/actions, sideways scrolling, or inaccessible fixed-height controls. | A `rem` diagnostic page can test the bridge, as allowed by AC5.5. It does not establish that NEVORA's remaining fixed-pixel text follows the setting. |
| Q6 — Back, sheets and keyboard | Android button and gesture; iOS edge swipe; open/close modal and nested surface; page history; root behavior; keyboard visible; interrupted close animation; focus and scroll recovery. | Preserve application cancel semantics. `QuietSheet` handles the dialog `cancel` event, animates, updates React state and may call `router.back()`. Calling `dialog.close()` alone bypasses that path. |
| Q7 — Account deletion | Apply current published requirements to activation and account setup; check in-app and external-web paths; demonstrate receipt and a separately operated fulfillment process using fictional records. | Request flow exists. Store applicability for employer-created accounts is not explicitly resolved by the cited policies. Do not assume exemption. See the policy review below. |

## Integration details that can change the outcome

### Authentication and app links

- Development `passkeyConfig` accepts only the hostname `localhost`; it rejects `10.0.2.2`. Android can use `adb reverse` with a localhost URL for the unchanged local contract. This does not replace the signed HTTPS association test.
- `src/lib/auth/passkeys/http.server.ts` enforces the configured same-origin request boundary. A native plugin that changes the WebAuthn client origin would require an explicit design review and exact origin validation; do not broaden the allowlist as a workaround.
- Native deep links must land only on owned, allowed routes. Activation/reset fragments carry secrets: never log, echo, persist or send them to diagnostics. Exercise cold start, warm start, expired link and sign-in return routing with fictional links.
- Keep external origins outside the Capacitor bridge. A URL typed by a tester must not become an unrestricted native-plugin-enabled browsing surface.
- Existing deletion actions record `channel: "web"`. Accurate native channel attribution is a later contract decision, not a reason to accept a caller-provided identity or bypass server session checks.

### Modal navigation

- Prefer the application's existing cancellation path (`requestClose()` where supported, or a cancelable `cancel` event with an appropriate fallback). Preserve handlers that prevent cancellation during a mutation.
- A synthetic Escape key event does not itself invoke browser default dialog behavior. A direct `.close()` can leave application state and route history inconsistent.
- Popovers have their own hide/toggle/focus behavior (`src/components/sheet-gestures.tsx`). Test the topmost visible surface rather than choosing the last matching DOM node blindly.
- After modal dismissal, verify that focus returns to a visible trigger and that scrolling resumes. With no surface open, perform one history step; at the root, use the chosen platform behavior without a loop.

### Offline, resume and privacy

- Keep HTTP 401/403/500 and redirects intact. The current worker catches network failures, not every error response.
- Test process termination/relaunch separately from foreground/background transitions. Recheck the server session on resume and keep sign-out effective after restart.
- The bundled fixture can demonstrate local recovery UI without a backend. It cannot certify cookie persistence, server authorization, actual product offline behavior, or end-to-end payroll.
- Do not put payroll, employee names, credentials or private URLs in native logs, app-switcher diagnostics, lock-screen widgets or notifications used for this investigation.

## Current account-deletion policy review

Official sources were read on 2026-11-02:

1. [Apple — Offering account deletion in your app](https://developer.apple.com/support/offering-account-deletion-in-your-app/): apps with account creation “must also let users initiate deletion of their account within the app.” This is a 12-word quotation. Apple allows a manual process when the completion time and confirmation are communicated. Temporary deactivation alone is insufficient. Legally required retention must be disclosed. The guidance does not explicitly settle employer-created account activation.
2. [Apple — Guideline 5.1.1(v)](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion/): the option should be easy to find; any required web continuation must link directly to the deletion page.
3. [Google Play — Account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en): for apps in scope, provide an in-app deletion path and a functional web resource that lets users request account/data deletion without reinstalling the app. Complete Data safety deletion answers and disclose justified retention. The cited exemptions are specific; ordinary employer-created accounts are not explicitly listed as an exemption.

NEVORA already supplies both route surfaces and explains a target of 30 calendar days plus a retention schedule (`src/lib/legal/policies.ts`). The source deliberately says the request transaction **does not perform later account/data erasure**. Confirm the operator procedure, actual fulfillment, completion notice and retention decisions before claiming store readiness. The source-referenced `docs/compliance/account-deletion-runbook.md` was not present in this development checkout; recover or author that operational evidence separately. Policies and deletion links can be hidden if required production policy facts are incomplete, so verify visibility in the eventual review environment.

A narrow draft question if store applicability remains unresolved: “NEVORA lets workers activate an employer-created account and submit an authenticated deletion request in the app. An operator completes erasure within the disclosed period, retaining only disclosed legally required employment records. Does this satisfy 5.1.1(v) for this account model?” This draft has not been sent.

## Store-readiness checklist

These are acceptance conditions, not claims that the current prototype satisfies them:

- [ ] Choose and reserve the final app identity; separate debug/test identities and signing material.
- [ ] Verify App Store/Play account ownership, certificates, provisioning, upload roles and recovery.
- [ ] Recheck current supported SDK and target-API requirements at submission time.
- [ ] Inventory actual native SDK data access; validate the iOS privacy manifest, required-reason APIs, permission text, App Privacy and Play Data safety answers against behavior.
- [ ] Provide owned, reachable fictional review accounts/workspace with clear reviewer instructions and no production access.
- [ ] Verify deletion paths and operational fulfillment, retention disclosures, privacy/support URLs and English/Spanish copy actually shipped.
- [ ] Demonstrate useful app behavior. Apple [guideline 4.2](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality) evaluates utility and app-like experience beyond a repackaged website; adding a plugin or Live Activity does not guarantee acceptance.
- [ ] Test cold start, slow/offline/error, resume, expired session, account change, logout, larger text, screen readers, reduced motion, keyboard and safe areas on actual iOS/Android hardware.
- [ ] Run the approved internal distribution sequence only after its separate release decision. No uploads or submissions were performed for this review.

## Platform references

- [Android — Authenticate users with WebView](https://developer.android.com/identity/sign-in/credential-manager-webview), read 2026-11-02: Credential Manager dependencies, `WebViewFeature.WEB_AUTHENTICATION`, `WebSettingsCompat.setWebAuthenticationSupport` and Digital Asset Links. Select and pin compatible stable versions during implementation; do not copy documentation beta versions without review.
- [Android — Credential Manager prerequisites](https://developer.android.com/identity/credential-manager/prerequisites), read 2026-11-02: owned HTTPS `/.well-known/assetlinks.json`, exact package name and signing-certificate fingerprints, correct JSON response and association relationships.

## Next acceptance gate

The implementation owner records built artifacts and reproducible test commands in `build-report.md`. QA then executes the platform matrix against those exact artifacts. Missing macOS/signing/domain/device evidence remains **not answered**, rather than a pass derived from the browser or the fixture. Production and store release remain separate from this prototype.
