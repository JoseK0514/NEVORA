# Native Employee and Owner execution checkpoint

Updated November2, 2026. **Implementation in progress; native release blocked.**
Jose approved the [shared-interface design](../superpowers/specs/2026-11-01-native-employee-owner-design.md) with "Approve design and proceed." The scope remains Employee and Owner on iOS and Android. Account/device/provider/hosted/distribution gates are separate.

## Current implementation

[PlanA](../superpowers/plans/2026-11-01-native-foundation-plan.md) Tasks1-3 are implemented: state-only session compatibility, native role presentation, direct WKWebView/Android WebView containers, constrained origins/navigation, browser-owned cookies, lifecycle invalidation and fail-closed release configuration. Earlier baseline evidence is under [November1](evidence/2026-11-01/).

Task4 remains in progress. Disposable full Next/PostgreSQL runners and actual Employee/Owner journeys exist. Earlier iOS/Android runs each passed 17 backend checks plus 3 native journeys; Android also verified a real process restart. These are historical results, not certification of current uncommitted bytes.

The single fresh [whole-foundation review](evidence/2026-11-02/whole-foundation-review.md) reported 4 Important findings. Modal Back, cancellation ownership and exact accessible-name targeting have committed corrections. Older-Android secure-window and newly reproduced Recents focus-loss corrections are uncommitted. [Correction evidence](evidence/2026-11-02/foundation-corrections.md) retains RED/GREEN/reversal proofs, failures, withdrawn screenshot interpretations and unresolved limits. No independent audit closure is claimed.

## Latest verification

- Default Android 16/WebView 133: all 9 fixture cases and actual Owner process restart passed. Default Android 12L/WebView 120:7/9 passed; missing accessibility nodes remain intermittent. A registered-consumer comparison also failed at the same missing Sign out target. No mode/provider workaround is retained.
- Actual older-Android Recents/session revocation passed its focused regression; reversing only the focus fix restored the old private Owner page. The test proves the actual application task, rendered private marker and capture controls.
- Final Android JVM 6/6, Debug/unsigned Release and lint passed: 92 tasks, 0 lint errors, 7 recorded warnings. Release manifest/DEX checks passed; no HOME query, debug origin or diagnostic service is present. The APK remains unsigned.
- Python runner/HTTP fixture 17/17 and Node ownership/build guards 13/13 passed.
- Current full repository Vitest passed 10,653 tests in 700 files (403.51s, maxWorkers1), with 801 existing skips in 27 files and no failures. Database/provider credentials were stripped.

Current iOS full fixture passed all 7 cases (bsi1fbmb), with an independently checked identifier tree. Current typecheck and full ESLint passed. Final production build and fresh full-backend qualification remain pending a clean committed candidate. The production helper rejected the uncommitted candidate before creating resources; its failed attempt is retained. Earlier Swift and unsigned iOS Release results apply to unchanged native app sources; they were not rerun here. A focused iOS fixture pass is not proof of its entire 7-case matrix; the review's Minor reporting limitation is deferred and remains explicit.

## Source and release boundaries

Worktree is detached at f4687c2ef0cb48d456a80689bb4dee91d09149a2, based on development 1e6f35ab9731234fc765aa18ee817cb196459e2e. Privacy corrections/evidence are committed locally as 025c172c8ae50eefedfd00e9c48d2adfe480feb1. Subsequent capability checkpoints remain local. No merge, push, native deployment, signing or upload occurred.

Original iOS checkout remains at 46e202786863279302026ee03a0e225c359fa55c; [all 24 custody hashes rechecked unchanged](evidence/2026-11-02/preserved-source-recheck.json). The original primary checkout, source mirror and both production Neon projects remain outside native verification. Test data/providers are fictional/local.

Development-source inventory remains red: 6 active remote branches versus the permitted 3, including unclassified sources. Preserve them; no deletion, new named branch, merge or push can bypass that gate.

## Next work and pending input

The debugging skill's repeated-round escalation requested a priority choice: continue independent capabilities while retaining the Android release blocker (recommended), or concentrate on Android investigation first. Jose then asked what comes next. The builder continues the already approved independent server capability work; this is a work-order choice, not approval of Android risk. The Recents fix and passing checks remain preserved, and no diagnostic run is active; no supported-OS reduction, test waiver or release acceptance is inferred.

StageB is underway in the [native push custody plan](../superpowers/plans/2026-11-02-native-push-custody-plan.md). Its first server-only step implements strict P-256 registration proofs, purpose-separated encrypted token material and public byte vectors. All 86 focused and 10,733 default tests passed (801 existing skips); typecheck/changed-source lint passed. These primitives are not connected to app routes, a database, native permission handling or providers. Durable registration/rotation/revocation, dispatch, the constrained bridge, links, document handling and complete role journeys remain required. [Interface/API research](evidence/2026-11-02/capability-interface-research.md) is preparation for their executable plan, not a completed capability. StageC hosted/device integration and store-readiness preparation also remain required. Signing, physical passkeys/accessibility, real enrollment/sends and distribution need their actual external inputs and controlled-test authority.

Legal publisher/Apple Developer/Google Play account status and available physical devices were requested separately and remain unverified. Never request passwords or signing keys in chat. Do not report the overall native task complete after the foundation or turn unavailable account/device gates into assumed success.
