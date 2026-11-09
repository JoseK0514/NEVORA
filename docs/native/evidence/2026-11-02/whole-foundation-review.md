# Fresh whole-foundation review

Reviewer: /root/native_foundation_review (gpt-6-astra, fresh context, read-only).
Range: 1e6f35ab9731234fc765aa18ee817cb196459e2e..4f08af809dd775ba6e78097b7f1dd58465a8b3eb.
Verdict: Ready to merge: No. Critical: none established. Important: four. No overall native-readiness or release approval.

## Strengths
Browser cookies remain authoritative; markers do not grant access. Release origin policies reject userinfo/numeric/local origins. Lifecycle generation checks prevent abandoned views being restored. Native CSP and real redirect controls, named backend checks and source/artifact receipts provide independent boundaries. Reviewer rehashed every retained E5qtaP iOS and ek9VuD Android SDK artifact: all matched. Each backend result has 18 checks and three SDK cases; native product sources unchanged since those checkpoints. Retained evidence verification is not a fresh SDK run.

## Important findings
1. Android API26–32 private snapshot barrier missing (PortalActivity.java:56). minSdk26 but screenshot suppression API33+ only. onPause cover/destroy does not synchronize compositor snapshots. AOSP12 snapshots visible tasks independently of an app cover acknowledgement. Establish persistent supported secure-window fallback before private content on older APIs; retain lifecycle invalidation. Add older-runtime screen-off/recents regression proving private content absent. Reviewer performed no older-runtime reproduction. Primary evidence: https://github.com/aosp-mirror/platform_frameworks_base/blob/android-12.0.0_r1/services/core/java/com/android/server/wm/TaskSnapshotController.java#L627 .
2. Android Back bypasses local sheets (PortalActivity.java:49). Availability Monday is local state without history entry; QuietSheet handles cancellation. Current Back calls goBack directly. Can leave Availability and discard draft. Reproduce actual Back closing Monday, retaining /app/availability and draft, next Back navigating normally. Narrow current-modal handling must preserve origin/lifecycle boundaries. Foundation requirement, not deferred polish.
3. SDK cancellation settles before exit (scripts/native-build.mjs:24). AbortError rejects/closes log FD immediately; no confirmed child/SDK descendant exit. Outer native-owned.mjs:188 can report ownershipClosed=true while build remains. Read-only fake-primitives reproduction on actual function: promiseSettledBeforeExit=true; logDescriptorClosedBeforeExit=true; exitListenerStillPending=true. Retain lease, await bounded confirmed termination, report unclosed ownership if unprovable. Never kill unrelated shared services. Cancellation/timeout regressions with delayed exit required. Primary https://nodejs.org/api/child_process.html .
4. Fixture link target uses text only (ShellInstrumentedTest.java:58). u7gvtbbu/Renderer_control.xml has zero exact visible text matches but one content-desc="Renderer control" at [21,437][330,490]; Renderer protected in 8if_pq78 same class. Exact visible accessible-name link matching + real pointer click + unchanged deadline; name-only-node regression required. Body text assertions separate. Does not explain genuinely missing nodes: 8if_pq78/Fictional_Home.xml virtual root has zero children; 8p5bylbg/Renderer_control.xml lacks Renderer control entirely. Preserve those separately unresolved.

## Minor
native/ios/test-ui.py:126 default transport acceptance only checks passedTests>0. Record selected identifiers and distinguish focused diagnostic from full seven-case transport, or partial results lack a self-contained qualification boundary.

## Checks and limitations
Source inspection, artifact/hash comparisons, XML predicates and in-memory cancellation reproduction. No builds/device changes/full suite rerun by reviewer. lbd3m1my independently has nine passing default-mode tests and cold XML; one pass does not explain intermittency. Current-head full/native validation, genuine missing-tree cause and source-inventory reconciliation remain open. No origin/credential bypass established.

## Declined to judge (exhaustive)
- APNs/FCM, installation enrollment, token ownership/rotation/revocation/retry/generic payloads: StageB.
- Capability bridge schema/origin/main-frame/replay defenses: StageB.
- Universal/app/invitation links and association deployment: StageB. Browser activation then native sign-in is narrower evidence.
- Protected documents/download/share/temp cleanup: StageB; foundation denial is not acceptance.
- Native passkey registration/sign-in/recovery/revocation: device/association work.
- Full Employee/Owner route/action coverage beyond representative journeys: subsequent matrix.
- Physical TalkBack/VoiceOver, keyboard/text scale/insets/connectivity/supported OS: later acceptance. Older Android privacy finding is not waived.
- Exact genuine empty-tree cause: insufficient evidence; no filtering/focus/renderer explanation established.
- Current-route preservation on resume: discretionary, fresh Home reconstruction documented.
- Signing, icons, privacy manifests/disclosures, deletion fulfillment, signed archive/AAB/internal upload: StageC/account gates.
- Hosted HTTPS/environment/hosting/DNS/provider credentials/real sends: isolated environment/account path.
- Production/store release and source inventory: separate authorization/integration.
- Phone punches/geofencing/offline punches/widgets/Live Activities: explicitly excluded.

Assessment: fix four Important findings and rerun complete relevant scenarios before foundation completion. StageB/C required. Original review package: review-1e6f35ab..4f08af80.diff; full reviewer message retained in conversation.
