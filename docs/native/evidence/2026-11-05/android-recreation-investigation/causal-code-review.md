# Android recreation accessibility diagnostic review

Status WATCH. APPROVE for the bounded diagnostic experiment. Release acceptance remains blocked. Reviewed detached 434f6f4fd849f32533691bd87b674843ef1f9600 and the working diff in ShellInstrumentedTest.java. No device action, SDK tests, or production edits by reviewer. git diff --check passed. No ULW plan exists. This is a code review, separate from independent certification.

## CRITICAL

None in the diff.

## HIGH

None in the diagnostic diff. Reproduction remains a release blocker against the original acceptance criterion. The missing Home/Sign out assertions must stay active.

## MEDIUM

The two failing controls have different observed tree shapes. In the candidate repeat-2 XMLs, the document exposes zero *serialized* children. AndroidX AccessibilityNodeInfoDumper.java:100–111 skips null and invisible children. ShellInstrumentedTest.java:187–191 measures the host's child count. It does not measure the inner virtual document's child count. In the stock control Sign_out.xml and Sign_out_after_content_event.xml, the inner document has six serialized children and the Fictional Home heading is present. A stock consumer also loses an actionable target, but attribution of both failures to one provider defect would outrun these observations. The stock Activity's onDestroy also calls destroy while attached; PortalActivity.java:178 removes the old view first. Align stock teardown before relying on a stronger common-cause conclusion.

## LOW

ShellInstrumentedTest.java:182–196 invokes scenario.onActivity and provider methods before the exception guard. A disappearing Activity or a provider exception could mask the original missing-text assertion with a diagnostic failure. If retaining this helper, enclose the synchronous diagnostic call in the exception guard, preserve interruption, and retain the original assertion message. This cannot convert a red test into a green test.

## Scope and test relevance

Loaded remove-ai-slops and programming. The latter has no Java-specific chapter. Applied the shared behavioral-test and unnecessary-complexity criteria. No deletion-only, mirrored-constant or tautological test was added. The fixed strings identify the fictional fixture and generated boolean observations. Production code and test acceptance did not change. Neither skill perspective yields a blocking finding. No blocker to running this diagnostic. The diff adds post-failure observation only and supplies no corrective behavior.

## Next discriminating experiment

On a separate replay retain the failed outcome, then before any provider call or cache clearing record the raw UiAutomation document childCount and, for each reported index, whether getChild returns null, invisible, or visible. Capture class/visibility/bounds for the fictional fixture. Compare the raw shape in whole-document and missing-button failures. Run the same probe against the form node on the latter. This can discriminate an absent edge from a failed lookup or visibility filter. If the raw count is zero, a separate provider-side probe of the virtual document can further localize it. Keep the original qualifier unchanged. The AndroidX polling helper requests fresh window roots each pass (Elements.kt:49–66, UiDeviceExt.kt:215–229, UiDevice.java:1495–1518), but that path still runs through the same UiAutomation service. Cache clearing only establishes that this intervention did not recover the target. Pinned Chromium WebContentsAccessibilityImpl code at 1215–1258 and 2237–2240 distinguishes host population from cached virtual-node population. Direct provider/retail accessibility acceptance remains open.

## Artifacts inspected

- Candidate runtime directory: /Users/josek0514/.codex/native-runtime/nevora-android-axfix-20261105-6a31fbbd. See repeat-2/logcat.log, repeat-2/Fictional_Home.xml, repeat-2/Fictional_Home_after_client_cache_clear.xml, androidx-src, chromium-149.0.7827.5-ax.java, and reference-source/native/android/app/src/debug/java/com/velani/nevora/development/StockWebViewActivity.java.
- Stock reference failed canonical run: /var/folders/4b/9tfty_tx1vdg9pg02qrgnr2r0000gn/T/nevora-native-android-b1ig5zn7/instrumentation.log, Sign_out.xml and Sign_out_after_content_event.xml. Cycle 4 failed exact visible Sign out.
- Prior experiments and scope: docs/native/android-recreation-accessibility-followup.md and docs/native/android-foundation-decision.md.

## Follow-up review of the November 5 evidence packet

**WATCH / APPROVE for diagnostic use.** No blocker to the diagnostic patch. Release acceptance remains blocked. No device access or account inspection by reviewer. Both previous review findings are addressed for the scope claimed.

- **CRITICAL / HIGH:** None in the updated diff or retrospective causal claims.
- **MEDIUM:** Plan the provider comparison to avoid a confound. Prefer matched repetitions on the exact same API37.1 Play image and settings, with factory149 present and verified before updating the provider. A comparison to the previous API36/37.2 Google SDK runs changes both platform image and WebView. If a factory run is unavailable, label a newer-provider pass as compatibility evidence and keep attribution open. Do not run UI tests during private sign-in.
- **LOW:** ShellInstrumentedTest.java:182–198 caps logged nodes and lookups per parent separately. The upper bound on child lookups is substantially greater than 256, and counts of null/invisible children sample the first 256 indices per parent. This does not affect the captured zero-child node or gate. Describe the cap precisely if documenting it. The existing screenshot/XML evidence path can still throw on retention failure at line 168. The *new* helpers guard diagnostic exceptions.
- The raw API36 failure log shows a visible outer WebView with one child and a visible inner WebView with child count zero before client cache clearing. The DOM callback reports complete and focused with Home/Sign out present. The post-clear search still fails. In a separate observer-only run, host id -1 returned one child and id 112 repeatedly returned zero, directly inside delegate.createAccessibilityNodeInfo before returning the original object. The packet distinguishes these observations and the stock control's different shape. Runtime minimum, assertion timing, production lifecycle and qualification criteria are preserved.
- The pinned source shows process scope at 149 (web_contents_accessibility_android.cc:789) and WebContents scope at 157 (lines 795 and 975). The upstream review is a plausible lead. The packet correctly withholds specific patch attribution.
- Verified all eight decompressed log hashes against raw-artifact-compression.json and both live source hashes against build-verification.json. The archived instrumentation source matches its live counterpart. The private postreview-build JUnit XML totals were 26 tests with zero failures, errors or skips. git diff --check passed. No device or build rerun by reviewer.
- Programming and remove-ai-slops criteria reapplied: observations have a specific causal purpose, add no tautological tests, and cannot satisfy the frozen failing predicate. Neither skill perspective yields a blocking finding.

Follow-up evidence is under docs/native/evidence/2026-11-05/android-recreation-investigation, particularly raw-repeat36-5/logcat.log.gz, provider-repeat36-1/logcat.log.gz, diagnostic-source/PortalActivity-provider-observer.java:242–259, upstream-source.json, and build-verification.json.

## Final implementation review, approved four-component WebView floor

**WATCH / APPROVE for the production guard.** No code blocker. This reviewed working diff follows detached checkpoint 434f6f4fd849f32533691bd87b674843ef1f9600. The final committed-candidate checks are being run separately by the executor.

- **CRITICAL / HIGH:** None.
- **MEDIUM:** The active staging proposal still specifies androidMinimumWebViewMajor 149 at native/staging/environment-plan.json:95. Its README identifies it as the current proposal. This can send a staging operator to an unsupported provider. Record the entire approved version string. No repository code reads that individual key.
- **LOW:** docs/native/android-accessibility-runtime-correction-proposal.md:23–25 still asks for Jose's decision and application of the patch, although its first paragraph records both as complete. Update when finalizing the execution packet.

The production change parses the Android package's bounded numeric version string at its existing boundary. Matching all four components precedes early comparison, so a newer major cannot admit a malformed suffix. Eight-digit limits prevent integer overflow. Comparison accepts the exact approved build or a numerically newer tuple and rejects 156.0.8078.49. Both pre-probe and pre-WebView production guards still call this policy. No lifecycle, authorization, cookie, URL or renderer behavior changed.

The two profile predicates establish an outdated test environment. The UI tests still perform actual update-screen and browser checks. The original recreation assertion and observation cadence are unchanged. The programming and remove-ai-slops perspectives were reapplied. The literal version fixtures exercise the previously accepted broken provider, premature release of an earlier patch, lexical ordering mistakes and malformed package input. They do not reproduce the comparator algorithm. No skill violation or unnecessary production abstraction identified.

Reviewed actual candidate-build JUnit XML (28 tests, 0 errors/failures); private candidate-red.json and candidate-patch-red.json identify both documented errors in earlier drafts. Reviewed play156-repeat-result.json with 20 successful attempts, sampled AndroidJUnit output in attempts 0 and 19, full Play156 receipt (10 + independent cold restart), rollback series with genuine instrumentation failure, and current-missing-provider-result.json with failed precondition. The compared binary/source receipt explicitly predates the newly enforced guard; it is runtime discrimination evidence. Chromium156 source invokes CreateScopedModeForProcess; attribution to the later per-WebContents patch would be unsupported. No device, SDK, or account action performed by reviewer. git diff --check passed.

Source/evidence root: /Users/josek0514/.codex/native-runtime/nevora-android-axfix-20261105-6a31fbbd. Public decision/evidence entry points: docs/native/android-accessibility-runtime-correction-proposal.md and docs/native/evidence/2026-11-05/android-recreation-investigation/README.md. Review approval covers the guard implementation; supported and absent-provider matrix, clean-head backend, physical, and release gates retain their distinct verification states.
