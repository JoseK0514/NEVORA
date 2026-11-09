# Native foundation correction evidence

Status: implementation and verification in progress. This is a checkpoint, not
release approval. The accepted design still requires native capabilities and
release preparation. No production binding, database, provider or store changed.

The single fresh whole-foundation review covered development
`1e6f35ab9731234fc765aa18ee817cb196459e2e` through
`4f08af809dd775ba6e78097b7f1dd58465a8b3eb`. Its four Important findings, one
deferred Minor finding and exhaustive limits are retained in
[the original review](whole-foundation-review.md). No independent audit closure
or second review is implied by the correction work below.

## Important corrections

1. **Android 26–32 snapshots:** persistent `FLAG_SECURE` is established before
   content. API33+ retains recents screenshot suppression. Actual API32 Owner
   authentication followed by the secure-window assertion failed before the
   change (`4at0r63b`, 5.418s). The older-OS tradeoff is that screenshots and
   screen sharing of the app are blocked. Physical OEM acceptance remains open.
2. **Android Back and drafts:** commit `f4687c2e` closes the current shared
   dialog through its existing Escape behavior before history/exit. The callback
   checks the exact origin, browser, lifecycle ticket, document generation and
   URL. Actual full-backend Employee flow failed before the fix (`ijHR6A`), then
   passed while retaining Monday's edited availability, performing the next
   history Back and verifying the later save in SQL (`l73jIg`).
3. **SDK cancellation:** commit `a6f1e63e` awaits process closure and preserves
   private receipts when descendant ownership cannot be proved. Three delayed
   cancellation/timeout tests failed before the fix; the combined safety suite
   then passed 13/13. A real delayed child proof waited 253ms and observed the
   child's exit; descendant closure remained conservatively unproved. Unknown
   shared SDK processes are never terminated to manufacture cleanup success.
4. **Exact accessible link names:** the same commit accepts visible exact text
   or exact content description for link targeting. The label-only regression
   failed in `f1infg_2` and passed in `zcyc7kwb`. Body assertions remain separate.
   This does not explain missing accessibility subtrees.

## Additional actual Recents regression

The strengthened older-OS test proves the launched activity's task ID and sole
application task/component, then requires its actual NEVORA snapshot card to be
centered and fully visible. AndroidX EmptyActivity helpers are excluded from
Recents in the test APK only; Bootstrap and the application are not excluded.
The runner retires only its test APK, preserving the app and browser cookies.
The exact HOME visibility query is debug-only.

A fictional Owner-only magenta marker is positively rendered by the WebView
after a visual-state callback. Public Home screenshot capture is a separate
positive control. The correctly identified protected snapshot must either deny
readback or contain zero marker pixels. The test revokes the session while that
task is in Recents and taps its actual card, rather than simulating only a
lifecycle callback. It also covers power off/on, recreation and logout.

That test exposed a real additional privacy defect. Android can remove window
focus for Recents while leaving the activity resumed. Code that retires the
document only in `onPause` can return the old private page without validation.
`1zigy83c` failed with the old Owner page and private marker still present after
revocation. The focus-aware fix passed the same complete test in `373mth3m`.
Reversing only its fields/callbacks reproduced the old Owner page in `die03on0`
(30.809s). Fixed and reversed source custody hashes were checked before restore.

The corrected controller retires the browser/generation on focus loss while
resumed and requires fresh protected navigation when focus returns. Resume
waits for real window focus; destroyed activities cannot reactivate. It does
not export cookies, cache private drafts or grant authority through native UA.

## Accessibility remains a separate unresolved gate

Three observed classes are distinct: label-only link names (corrected), an
entire absent provider subtree, and one absent link among present descendants.
Captures matched a current focused/visible/loaded `/app` or `/login` document
to the same renderer process. One comparison had 18 renderer AX nodes including
the expected heading and three links while Android exposed zero virtual
descendants before and after the observer. No generic app workaround is retained.

Titles, focus-only explanations, client cache refresh, data-sensitive filtering,
forced renderer mode and a GONE/INVISIBLE geometry probe did not establish a
reliable cause. The geometry reversal passed too. Explicit renderer flags are
diagnostic, not qualification; backend acceptance rejects overrides/observers.

UiAutomation suppresses registered services by default, so Chromium can see no
registered consumer despite automation being enabled. A test-only no-op service
with no content retrieval or gestures changed Chromium's consumer/screen-reader
classification as predicted. The focused A–B–A scenario passed in every arm,
making its causal result inconclusive. Exact emulator settings were restored,
and that temporary service was removed. Stock WebView does not opt into the
separate five-second auto-disable mechanism in either inspected provider version;
that timer is not an explanation for these failures.

Clean-source default API36 WebView 133 passed all nine fixture cases and actual
Owner process restart (`px6do2j2`, source hash
`5e07536731d9a4cbe6049c32bb27698c3984b9c2d79cc6be40d78d121988f09a`).
Clean-source API32 WebView 120 passed seven of nine (`jrbwotin`): Employee Home
nodes were absent; Owner completed the Recents/revocation/power/recreation steps
and later lacked the Sign out pointer target. These are retained failures, not
passes or retries to be hidden. The subsequent full-matrix control (`70chz3a1`) and registered-consumer arm
(`c8j6p096`) each passed eight of nine, failing at the same Employee Sign out
target after recreation. In the registered arm, the actual target process had
one bound service and Chromium reported consumer/screen-reader state enabled.
Thus registration/mode is not a sufficient fix. Both arms used the same source
hash `4883e953452710b99ca1072e9ea243fdb621f5ff20b419f51245d157f7cea709`.
No further reversal run was useful because the intervention did not remove the
failure. The temporary service/flags/driver source was removed using custody;
settings returned to absent services and accessibility-enabled0, the exact test
APK was uninstalled, and the exact owned emulator stopped.

Earlier blank-card interpretations from `mpyljarw` and `mlhoi9ym` were withdrawn:
they centered an AndroidX helper while NEVORA was clipped at the side. Neither
is privacy evidence. Earlier unverified manual blank-card observations likewise
do not replace the task-identity-controlled regression above.

## Verification and remaining gates

Current cleanup guard run: 17 Python tests passed (runner9 + fixture8); combined
Node runner/build tests passed 13/13. Current full-backend and iOS fixture checks remain pending. Android JVM/Debug/unsigned Release/lint passed 92 tasks (6 JVM tests, zero lint errors, seven recorded warnings). The current repository suite passed 10,653 tests in 700 files, with 801 existing skips in 27 files and no failures (403.51s). Earlier backend successes and the earlier 10,653-test run are historical
evidence, not verification of uncommitted current bytes.

The deferred Minor finding is iOS transport reporting: a focused pass is not
self-contained proof of the complete seven-case matrix. Final evidence must
include actual selected identifiers/counts; the reporting limitation stays named.

Source inventory remains red (six active remote branches versus the permitted
three, including unclassified sources). No branch is deleted, recreated, merged
or pushed to bypass it. Hosted HTTPS identity, associations/passkeys, real
APNs/FCM enrollment/sends, physical accessibility, signing and store distribution
remain separate gates. Legal publisher/account and physical-device inputs were
requested; passwords and signing material must not be sent in chat.

[Artifact index](artifact-index.json) contains source result paths and SHA256
hashes of the bounded logs, reports, hierarchies and fictional images retained
under this directory. [Ledger checkpoint](foundation-ledger-checkpoint.md)
preserves prior rulings and their costs. Later receipts must update this status
without erasing failed evidence.

Priority decision requested after the debugging skill's repeated-round escalation:
continue independent capabilities while retaining the Android release blocker,
or concentrate on this investigation first. No answer has been received at this
checkpoint. Necessary cleanup and foundation verification continue. This does
not ask for or imply a supported-OS reduction or release waiver.

Primary source checks: [Android 12L service-list suppression](https://android.googlesource.com/platform/frameworks/base/+/refs/tags/android-12.1.0_r1/services/accessibility/java/com/android/server/accessibility/AccessibilityManagerService.java#912),
[Instrumentation connection flags](https://android.googlesource.com/platform/frameworks/base/+/refs/tags/android-12.1.0_r1/core/java/android/app/Instrumentation.java#2189),
[Chromium120 consumer classification](https://chromium.googlesource.com/chromium/src/+/refs/tags/120.0.6099.193/ui/accessibility/android/java/src/org/chromium/ui/accessibility/AccessibilityState.java#667),
[Chromium133 auto-disable eligibility](https://chromium.googlesource.com/chromium/src/+/refs/tags/133.0.6943.137/content/public/android/java/src/org/chromium/content/browser/accessibility/WebContentsAccessibilityImpl.java#801).
These source checks explain experiment conditions; they do not establish the
installed provider's missing-node mechanism.

Final iOS fixture bsi1fbmb passed all seven source test identifiers, independently
extracted from xcresult with every result Passed; source hash
63322e19f225fbbea8b0740af1b0ce063ff4ca5300437f6e1f5b4840ba044b45.
The driver reporting Minor is still deferred; this receipt explicitly verifies
the full matrix. The exact owned simulator was shut down afterward.

Current TypeScript (noEmit/incrementalfalse) and full ESLint passed with stripped
environment. The attempted production helper refused the uncommitted candidate
before creating a mirror/build; a preceding free-space check observed2.9GiB.
The shell incorrectly continued to that helper after the precheck failed; the
clean-source guard prevented resource creation. Preserve the failure log and
require both guards before the next attempt. Production build and fresh backend
qualification remain pending; no gate was relaxed.

Next narrow Android discriminator, if investigation remains the chosen priority:
a temporary delegating AccessibilityNodeProvider can record naturally requested
virtual IDs, null/child counts and expected-label match booleans before framework
serialization, returning the same objects unchanged. Forward all five public
methods and preserve delegate/null identity. No reflection, node mutation,
bruteforce IDs, added privileges or reread-as-pass. Pair the trace to current
view/document/task and retain the original failed assertion. This has not run;
it would distinguish provider output from downstream cache only, not establish
Chromium's internal cause. Chromium's findByText returns an empty list and is
not a valid alternative lookup.

All owned emulators/simulator and test drivers are stopped. Temporary registered
accessibility service source/settings/APK and speculative application logging
are removed. Active-plan evidence/custody scratch is preserved because Task4 and
the investigation remain open. No commits, merge, push, deployment, signing or
upload occurred in this correction checkpoint.
