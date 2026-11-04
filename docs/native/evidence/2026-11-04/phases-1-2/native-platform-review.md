# Native platform capabilities — whole-change review

Date: 2026-11-04. Reviewer: native_platform_review. Read-only implementation review; this report is the only authored repository artifact.

- codeQualityStatus: BLOCK
- recommendation: REQUEST_CHANGES
- reportPath: .omo/evidence/native-platform-capabilities-code-review.md
- blockers: H1–H5 below. Executor has been notified; subsequent fixes are not approved by this report.

## Scope and evidence

Reviewed the uncommitted platform change against HEAD `9a46ccf76f2b1385c74181fce56377de68472dca`, including untracked Java/Swift capability, registration, transport, key, Firebase/service and policy files; device client/runtime/settings and integration changes; manifests/build configuration/association templates; new tests. Existing server checkpoint was not re-reviewed wholesale, but its installation repository was consulted to verify client protocol integration. Sources were still being edited by the parent after findings were communicated; references describe the candidate initially inspected, not an approval of later edits.

Plan: `docs/superpowers/plans/2026-11-04-native-platform-capabilities-plan.md`. Spec: `docs/superpowers/specs/2026-11-01-native-employee-owner-design.md`. Progress/notepad: `docs/native/evidence/2026-11-04/phases-1-2/progress.md`. Inspected root AGENTS.md, package scripts, executive operating model and CTO/CISO/technical-assurance/governance perspectives. `omo-agent-toolkit ulw-loop status --json` returned `ULW_LOOP_PLAN_MISSING`; fallback report location used.

Checks actually run with stripped environment:

- `node node_modules/vitest/vitest.mjs run src/lib/native-shell/device-client.test.ts src/lib/native-shell/device-runtime.test.ts src/components/native-shell/device-settings.test.tsx`: 3 files / 9 tests pass.
- `swift test --package-path native/ios`: 21 tests pass, exit 0. These compile the policy/core package, not UIKit/WebKit transport/coordinator integration.
- `git diff --check`: exit 0.
- Inspected Android `native/android/app/build/test-results/testDebugUnitTest/TEST-*.xml`: 14 tests, zero failures/errors, timestamps 2026-11-04 19:06:03 UTC. This was artifact inspection, not a reviewer Gradle rerun.
- Isolated Node/tsx probes against the actual exported runtime/controller (no network or accounts): removing `AbortSignal.any` produced `AbortSignal.any is not a function`; delivering valid replies to two live runtimes sharing one Android port resolved only the second runtime; server-active/local-null generation produced `revoked`, then failed detach recovery and persistent `error` after refresh. The last probe used a fake native unavailable reply matching the inspected native generation guard, not actual device execution.

No physical-device, provider, signed, hosted, release, independent QA or security certification. No push/merge/deployment. Existing intermittent Android accessibility issue remains open in the progress artifact. Full app role journeys and actual native transport races were not independently executed here.

## CRITICAL

None established.

## HIGH

### H1 — Fresh Android installations cannot request notification permission through the UI

`native/android/app/src/main/java/com/velani/nevora/development/NativeCapabilitiesHandler.java:77` checks `areNotificationsEnabled()` before the API33 runtime-permission branch. On a fresh API33+ install, notifications are disabled until permission is granted, so hello returns `denied`, never `default`. `src/lib/native-shell/device-client.ts:28` publishes denied; `src/components/native-shell/device-settings.tsx:15` only renders Turn on for ready. The implemented requestPermissions branch is unreachable through this normal first-enrollment flow.

Android explicitly documents fresh-install notifications as off by default: [notification permission](https://developer.android.com/develop/ui/views/notifications/notification-permission).

Fix: distinguish requestable runtime permission from actual blocked app/channel state before collapsing manager state to denied. Exercise fresh grant, dismissal, denial and settings revocation on API33+ with a local native permission seam/emulator; no provider delivery is needed.

### H2 — Native settings fail throughout supported iOS16–17.3

`src/lib/native-shell/device-runtime.ts:33` unconditionally calls `AbortSignal.any`. The app declares iOS16 (`native/ios/NEVORA.xcodeproj/project.pbxproj:108`; Package.swift also iOS16). WebKit added this API in [Safari17.4](https://webkit.org/blog/15063/webkit-features-in-safari-17-4/). Every status/challenge request on older supported WebKit throws before fetch, leaving settings in error. Reproduced by removing the API in the local runtime probe. Existing evidence uses iOS27, not this minimum.

Fix: compatible AbortController composition with bounded deadline and listener/timer cleanup; test without the newer static API. Do not silently raise the supported OS floor.

### H3 — A successful turn-off loses the receipt required to turn alerts on again

`src/lib/native-shell/device-client.ts:54` requires a detach reply's generation to equal the old expected generation. The actual server creates a new generation when detaching (`src/lib/data/native-installations.ts:185`, completion receipt around line209). Consequently normal successful detach is reported as an error until a later status refresh.

More seriously, iOS removes metadata on `complete` (`native/ios/App/NativeCapabilitiesHandler.swift:103`); Android does the same in `NativeCapabilitiesHandler.java:34`. The next enrollment therefore sends null at `device-client.ts:43`. The server's issue guard (`native-installations.ts:101`) only permits null when no installation row exists; detach retains a tombstone row with its new generation. The ordinary on→off→on sequence cannot reenroll.

Fix: retain the returned tombstone generation as the installation revision (separate from active enrollment state), honor the actual detach response contract, and prove on→off→on through the real repository contract. Also cover missing detach responses; merely correcting the equality assertion is insufficient.

### H4 — Lost enrollment/rotation replies strand an active installation

`native/ios/App/NativeCapabilitiesHandler.swift:73` and Android `NativeCapabilitiesHandler.java:102` persist generation only after a valid completion reply. Suspension cancels IO and retires those callbacks. The server can already have committed before response loss/cancellation. On return, authenticated status returns active generation while native metadata is null/older; `device-client.ts:28` displays revoked and offers turn-off. Native iOS line82 and Android line71 reject that reviewed server generation because it differs from local metadata. Enable refuses active server ownership at `device-client.ts:42`. Rotation repeats this problem with a stale non-null generation, and stale tap generation checks also prevent opening those notifications.

Fix: recover through a bounded server-authorized/key-proven path or retained idempotent receipt, without treating browser-provided metadata as proof of enrollment. Preserve account/session and stale-confirmation fences. Test server commit followed by dropped response, suspend/restart, rotation, account change and subsequent explicit detach/re-enrollment. Cancellation does not roll back server state.

### H5 — Multiple Android settings controllers overwrite the sole reply listener

`src/lib/native-shell/device-runtime.ts:17` assigns `android.onmessage` per runtime; each runtime owns a separate pending map. `NativeDeviceSettings` creates a runtime on every mount (`src/components/native-shell/device-settings.tsx:31`). On a wide Employee layout, AppShell mounts the native popover (`app-shell.tsx:496`, `employee-mobile/device-owner.tsx:64`) while the device-alerts page independently mounts another settings component. Responses for the first instance now enter the second pending map and are dropped. Closing/unmounting the second does not restore the first listener (`device-runtime.ts:41`). This also arises during responsive transitions; the popover is absent in the narrow layout, so the finding is specifically the concurrent wide-layout path, not every mobile mount.

The isolated probe delivered both correct reply IDs and observed `{aResolved:false,bResolved:true}`. Fix with a shared per-document dispatcher/controller or an enforced single owner; independent disposal must not steal other subscribers' replies. Test two live consumers and navigation/unmount/remount using the Android transport seam.

## MEDIUM

### M1 — Actual native transport and coordinator behavior lacks the planned fake-IO tests

`native/ios/App/NativeRegistrationRequest.swift` and `native/android/app/src/main/java/com/velani/nevora/development/NativeRegistrationRequest.java` implement the actual network/cancellation paths, but the new native tests exercise policy, proof bytes and request/reply construction. No test references either actual transport class. Likewise permission lifecycle and native generation persistence are not exercised by those pure tests. The passing counts therefore do not establish timeout, redirect, streaming response bound, canceled callback, or commit-before-response behavior promised by plan Task3. H1/H3/H4 illustrate concrete consequences of this gap.

Add local fake-IO or URLProtocol/connection seams around the real transport/coordinator, with no provider/account activity. Check closed fixed endpoints, no cookies, exact-once terminal reply, delayed/chunked oversized responses, redirects, cancellation and persistence outcomes. Keep claims explicit until this exists.

### M2 — Dead document-policy implementation and tests do not protect the chosen fallback

`native/ios/Sources/NevoraShellCore/NativeCapabilities.swift:22` and Android `NativeCapabilities.java:30` define document type/size policy used only by their tests. Production delegates route to browser reauthentication without invoking these helpers. The safe browser fallback is permitted by the spec, but these unused native-file validators and their green tests create maintenance work and can be mistaken for verification of real document handling.

Remove unused speculative policy if native file handling is deferred, or clearly establish its real production responsibility. Test the actual browser fallback route selection and user action, including existing blob export paths, instead of relying on unconnected helper coverage. No cookie-copy/download workaround is requested.

## LOW

The new client/coordinator code is heavily compressed into multi-statement lines, making generation transitions, async guards and error handling difficult to audit. Format touched logic and use small explicit typed state transitions where useful; avoid a broad architecture rewrite. Static UI assertions about absent installation/test-notification copy add little behavioral coverage, though the current-generation/pending-action visibility assertions are relevant UI behavior. No deletion-only production-change test or natural-language prompt test was found.

## Skill-perspective pass

Loaded `/Users/josek0514/.codex/plugins/cache/sisyphuslabs/omo/5.1.30/skills/remove-ai-slops/SKILL.md` and its sibling `programming/SKILL.md`. Both perspectives ran over production and tests. Boundary validation of native envelopes/challenges, streamed response bounds and golden serialization is justified by the trust boundary; it is not gratuitous parsing. Tests for foreign frames, replay and malformed requests test behavior, not just constants. Violations are the unused document validation/test island (M2), insufficient real coordinator/transport behavior coverage (M1), and compressed readability noted LOW. No fixes or skill-directed refactors were performed because this assignment is read-only.

## Recovery proposal assessment

The executor's proposed retention of active/complete receipts and same-employee/session off-status revision is directionally consistent with H3/H4, provided detached revision is never displayed as active enrollment and current-generation confirmation remains fenced. A reviewed detach generation can be signed without adopting it as native active state: SQL must still compare that generation atomically and the native key must match the scoped challenge.

Do not silently redefine `expectedGeneration:null` as an unconditional overwrite or retry with whichever revision is newest. If cross-account or missing-tombstone recovery needs discovery, make reconciliation explicit: an authenticated fresh challenge captures the current revision for the supplied installation public key, binds it to the new account/session and operation ID, then requires the corresponding native signature and atomic revision check at completion. Any concurrent change after issuance must conflict, never be retargeted. Test stale confirmations, lost detach acknowledgments, account A→B, and key mismatch. Same-account status recovery alone does not solve the cross-account lost-receipt case. This is design guidance, not approval of an uninspected server protocol change.

## Positive controls and limits

Inspected code keeps provider tokens and private-key operations native; browser status/challenge uses its own session; completion uses fixed cookie-free endpoints with redirects refused and bounded response bytes. Origin/main-frame checks, per-page replay IDs/nonces and lifecycle invalidation are present. Key scopes include origin/environment/app ID; default push configuration and Firebase auto-init/analytics metadata fail closed. Association/entitlement examples retain explicit placeholders. These are code-inspection findings, not proof that all runtime security controls have passed adversarial device tests.

Browser document reauthentication is an acceptable scoped fallback and avoids exporting cookies. Actual preview/share remains unqualified. Full local role journeys, minimum-version native behavior, the existing accessibility blocker, provider/hosted/physical/account/signing evidence and source-inventory reconciliation remain separate gates. Implementation owner: parent executor. Next gate: fix H1–H5 with meaningful regressions and complete the promised local integration evidence; this report does not authorize release or accept exceptions.
