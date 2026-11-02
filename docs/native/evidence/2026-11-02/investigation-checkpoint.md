# Debug Journal — native Android system UI and WebView AX
Started: 2026-11-02T05:03:16.856823+00:00
Goal: finish approved native Employee/Owner implementation without weakening privacy or test gates.

## Environment
- Worktree: /Users/josek0514/.codex/.chatgpt-projects/g-p-6abf0d9359708191a1e72c421bc4de9d/work/nevora-native-employee-owner-20261101
- HEAD: f4687c2ef0cb48d456a80689bb4dee91d09149a2; existing local changes intentionally preserved in debug-orthogonal-base, diff SHA256 9a425aac8e433b366f236400a772529f036e9fc668649e3a669c7202aeb72562. No commits during this debug investigation.
- Node24.19.0; Python3.9; Java Android API26 min/target36; AGP8.13/Gradle8.14.3; UiAutomator2.4.0.
- Owned active API32 emulator5556, Google APIs arm64r8, WebView120.0.6099.193. Exact identity in android-privacy-emulator.json. Owned API36 emulator5558 stopped after AVD-name proof; WebView133.0.6943.137. No user device mutation.
- Fixture loopback origins/ports per invocation; fictional employees/password only. No production env/database/provider.
- Existing retained evidence and prior failed hypotheses are in .superpowers/sdd/2026-11-01-native-foundation-plan/progress.md and ax-artifact-classification.json; source refs in task-4-whole-foundation-review.md.
- References read: debugging SKILL; 00-setup,03-flaky-triage,02-investigate,04-oracle-triple,node runtime,browser-qa. Android SDK UI/ART/native compositor are the actual boundary; existing instrumentation+emulator capture is authoritative. A desktop browser substitution cannot reproduce native system/navigation/AX bugs. No Node/Chromium attach yet under this skill.

## Hypotheses (unproven)
1. SDK observability / native shell action completion differs from assertion assumptions. Distinguish: exact hierarchy and OS state at failed Home/Recents wait versus actual OS screenshot; fix: correct observations.
2. WebView renderer/provider loses subtree across full-document navigation. Distinguish: renderer AX tree versus Android provider tree at same failed document; fix: provider integration (only if demonstrated).
3. Test-harness inherited OS/process/source state is wrong. Distinguish: fresh guest/process/owner/source plus focus/window/view IDs and monotonic timeline; fix: owned preconditions.

## Failed hypothesis rounds
- More than two prior rounds and >2h total; invoke exactly one Oracle Triple now. Not another code review, no implementation delegation.
- Focus/title/client-cache/AT-sensitive filtering/renderer-force mode did not reliably fix genuine missing nodes. Label-only link matching was a separate proven defect, already fixed.
- Software draw hypothesis control failed even before drawing, so it is not established. Home precondition helps first Recents but Home following Recents still fails. UiDevice.pressHome boolean is event-observation status, not end-state proof; false can occur when already Home (observed1000ms event timeout). Keep actual UI conditions.

## Artifacts to revert / preserve
- [ ] .debug-journal.md and new debug artifacts: archive findings into durable native evidence, then remove this journal only when investigation done.
- [ ] debug-orthogonal-base: preserve until all debug deltas accounted for; never restore whole source files from HEAD.
- [ ] Any future instrumentation/CDP ports/child processes must be journaled before creation. Device actions stay with root only.
- [ ] d1_diagnosticRecentsBeforeAndAfterSoftwareDraw is pre-skill diagnostic, not mandatory9-case acceptance. Remove only after its useful assertions are retained in permanent privacy regression and its results archived.
- [ ] Retained source/fixture privacy marker and secure-window assertions are intended regression changes, not disposable debug logs.

## Findings
See exact saved instrumentation/XML/PNG under recorded roots. Native current app code is unchanged for AX investigation. Four Important review fixes: Back validated real backend f4687c2e l73jIg17+3+cold; cancellation/label guards RED→GREEN; old-Android secure-window branch added after real flag RED, complete privacy/fixture verification still red.

## Oracle Triple Round1
Pending three independent read-only framings. Root controls devices and edits; no extra subagents.

## Oracle Triple Round1 synthesis
All three reports are terminal, read-only. A/B/C agree selected blank card is AndroidX EmptyActivity, NOT NEVORA. mlhoi9ym XML has NEVORA clipped at right; mpyljarw actual screen-off PNG also centers helper with NEVORA clipped left. Withdraw every earlier blank-NEVORA interpretation; neither image proves app privacy. No source/controller fix inferred. A/C agree failure observer may be later/different generation; B/C require independent renderer-vs-provider AX data. All agree overview presence does not prove settled task/transition; mpyljarw XML even exposes overview+hotseat simultaneously. UiAutomation executeShellCommand does not expose exit status. Three candidate axes retained: scene identity/observer side effect; system-input/Quickstep transition; renderer/provider boundary. Failed-round counter reset0.

## Planned artifacts before next diagnostic query
- [ ] ShellInstrumentedTest.java: temporary lifecycle/task/view/document identity logs; passive PNG/XML BEFORE scenario.onActivity observer; direct provider host count; system-state snapshots around diagnostic navigation; deliberate failure-only bounded hold ONLY when explicit observer argument set. Preserve original failure booleans and all deadlines. Restore only debug deltas from preserved baseline after findings, retaining permanent privacy regression.
- [ ] native/android/test-ui.py + test_ui_runner.py: explicit transport-only observer flag, backend rejects it before tools; report observer/qualification truthfully; pass matching diagnostic argument. These may be promoted as safety tooling, no hidden runtime override.
- [ ] observe-renderer-ax.mjs scratch: pass explicit diagnostic flag, record target metadata, own ephemeral DevTools forward only, remove after observation, never qualify resulting run.
- [ ] SDK output .superpowers/.../orthogonal-query.log + external result roots: retain provenance and bounded observations; archive then clean only owned diagnostics.
- [ ] No mutation to production native app, database, providers or user device. No commits while debugging skill is active. Existing accepted execution plan remains authority after debugging ends.

### Round1 runtime values (m4acdikt)
- Diagnostic9-case run:8passed, privacy d failed Public Home positive control, no AX failure -> renderer cause still unjudged. Explicit observer=true/diagnostic-renderer-observation, no transport qualification.
- key3 before: Launcher mResumed=false,mHasWindowFocus=false,mState:Overview,isInTransition:false; PortalActivity task93 mResumed=true,mHasWindowFocus=false; mCurrentFocus=null.
- key3 after: command NEVORA_KEY_EXIT=0; Launcher mResumed=true,mHasWindowFocus=true,mState:Overview,isInTransition:false; PortalActivity paused. Thus overview existence did not prove foreground/settled Recents, and shell status0 did not prove Home end state. Hypothesis narrowed, no application navigation patch inferred.
- Core1.7.0 exact cached manifest/bytecode verified by boundary agent: EmptyActivity/EmptyFloatingActivity have no excludeFromRecents. Their NEW_TASK+resumed-broadcast+finish-broadcast lifecycle protocol does not inspect Recents membership. Bootstrap can host a startActivityForResult target and must NOT be blanket-excluded. Current tests use ordinary launch.

## Next scoped identity correction (journal before edits)
- [ ] Add test-APK-only manifest excludeFromRecents for EmptyActivity and EmptyFloatingActivity, not Bootstrap or production app. This addresses proven helper-card pollution only, not a claimed Home fix.
- [ ] Runner replaces only its explicitly named instrumentation test APK after selected-emulator/ownership checks; preserve target app/cookies. This retires old helper tasks from prior test manifests; never uninstall target app.
- [ ] Privacy regression caches PortalActivity task ID at launch, requires sole own recent task matches that ID/component, and requires sole NEVORA snapshot card fully centered/visible before interpreting pixel absence. All snapshot/control assertions retained. If identity can't be proved, fail, never accept a blank unrelated card.
- [ ] Run same diagnostic matrix; no qualification from observer mode. Keep Home end-state failure if it persists. No commits while debug skill active.

### Renderer/provider comparison (83BlJw /4ay1pd9j)
PID14599 task113: Fictional_Home_before_observer.xml and Fictional_Home.xml each have0virtual descendants; matched CDP target same PID/fixture /app reports18renderer nodes including heading and3links. No intervening lifecycle change before observation; native window/view/doc focus=true; same attached view10306392/token23951594,timeOrigin1793596660488.5. After CDP and2s retention Android remains empty. PID15375 task123 similarly renderer has3links while Android omits Renderer control. Captures are diagnostic-only; no post-attach recovery converted to pass. This localizes observed loss downstream of the renderer for the captured scene, without proving a specific cache mechanism.
Identity correction run verified actual app task115 and full centered thumbnail bounds173 342 907 1973. Home positive-control still failed (separate system-navigation behavior), so identity correction is not claimed as its fix. No complete privacy qualification.

## Next bounded layout toggle probe (before edits)
- [ ] PortalActivity.java temporary DEBUG-only pre-reveal width/height/visibility log, then run existing focused c baseline with GONE. Hypothesis: GONE initial layout has0size when native provider first caches nodes; INVISIBLE preserves measurement without painting or exposing private content. Distinguish pre-reveal geometry and same c failure across one-line visibility toggle/reversal. Do not ship on correlation/single green. No timeout/assertion/control change. Keep privacy Else flag and Back fix untouched.
- [ ] layout_gone_red.log / layout_invisible_probe.log and own SDK receipts; retain each result, no retries-as-qualification. If it does not toggle, restore only visibility constant; no guessed cache workaround.

### Layout first toggle
Baseline yb46yr91: c fails Expected visible text:Fictional Home24.424s; beforeReveal visibility8,width0,height0 on first document. One-line INVISIBLE probe lnz7vzta: c complete pass (Back/recreate/logout/recreate), default provider/no observer/no runtime flags; first/fresh-view beforeReveal visibility4,width1080,height2295. SourceHash94caa2f52f69324569e766ec767a5b2893030c81b3d2c898c72deb32fc71d16a. Still correlation until reversal. Next restore only GONE and rerun same focused owner test; all other source/environment unchanged.

### Layout reversal result
GONE reversal v5pi9axh passed the same focused c test. Therefore initial0geometry is observed but NOT a confirmed AX cause. Restored GONE; INVISIBLE is not retained as a fix. Boundary source classification investigation pending. No workaround/qualification inferred from one green.

## Next actual user-workflow regression (before edits)
- [ ] Move the existing successful public Home capture control to the verified starting Home state (same capture assertion, before private launch). After protected Recents capture, resume by tapping the exact verified NEVORA task, rather than introducing an unrelated Home calibration transition.
- [ ] Existing d will revoke the fictional session while that exact task is in Recents; returning via its real card must show sign-in and no old private Home. This adds real OS resume/revocation coverage; existing lifecycle surrogate tests remain. Same TaskID/card/full-view identity and private-marker controls stay mandatory. No timeout increase, assertion retry or native business API bypass.
- [ ] Source privacy-flow-red.log and owned SDK results; production app stays unchanged for this RED.

## Confirmed new lifecycle defect RED
privacy-flow-red.log /1zigy83c: exact own task135 and centered bounds173 342 907 1973 verified twice. Revoke-all returned204 while that task was in Recents. Tapping its actual card returns old Fictional Owner Home, not sign-in (31.174s assertion failure). Passive pre-observer AX includes Owner heading/private marker; fixed document observation remains /app,titleLength36,window/view/docfocus=true. This is not an empty-tree failure. Current activity only retires onPause; Recents can remove focus while leaving it resumed, so returning never calls onResume activation. Captured m4acdikt state supports that exact lifecycle gap.

## Next minimal fix (before edits)
- [ ] PortalActivity.java: track resumed + focus-validation-needed. Focus loss while resumed retires old browser/generation immediately; focus gain while resumed revalidates through fresh protected navigation. Resume waits for actual window focus; preserve unconfigured cover. Destroy cannot reactivate. No shared web/privacy bypass or cookie extraction.
- [ ] privacy-flow-green.log: same real Recents/revoke/card-return assertions unchanged. Full native/backend suites still required afterward. Keep initial visibility GONE because layout cause is unconfirmed. DEBUG geometry logger remains temporary until cleanup.

### Lifecycle GREEN and planned reversal
373mth3m: same d complete pass, platform-default/no observer/no flags, sourceHash4f4f432af8a5a0eed57270e1fdde2560d96014ecc34a6f531645d611e935f2cc. It verifies exact target task, private marker render, old-OS secure snapshot, server revocation while Recents, actual card return to sign-in, power-off/return, recreate/logout. Original 1zigy83c failed specifically with old Owner /app still present. Before accepting root cause, save the corrected PortalActivity bytes, reverse only focus lifecycle callbacks/fields, rerun same d, then restore only if reversal source hash unchanged. Full9 default still required. No layout fix retained.
- [ ] focus-lifecycle-fixed.java private backup in scratch + privacy-focus-reversal.log; preserve audit hashes then remove backup at cleanup.

### Lifecycle reversal confirmed
die03on0 same d fails at actual Recents card return, expected sign-in; both passive and observed XML retain Fictional Owner Home + private marker, not empty AX. 30.809s, sourceHash debe0451562a89e98525bb18f6dcd6f1554ebdb1e922c2f94be92cd15fcfc806. Exact focus-only reversal reproduces original defect. Restoring fixed bytes only after both custody SHA256 checks; next full9 platform-default/no observer and cold process check.
- [ ] privacy-focus-full32.log / owned SDK results; no other source mutation during run.

Full32 attempt dh6bb6dr stopped before SDK build: supplied nonexistent /Library JDK path. No tests ran. java_home verifies installed JDK at /Users/josek0514/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home. Correct environment only; retain failed log, new privacy-focus-full32-sdk.log for actual run.

### Full32 current fix result / next boundary experiment
wvs5_i1y:7/9 pass including actual d privacy/Recents/revoke/card return25.643s; e and f fail visible sign-in with correct /login loaded/focused and absent provider subtree. Focus privacy fix holds; AX unresolved. No full qualification.
Oracle boundary source found UiAutomation flags0 suppress bound accessibility services; API32 manager returns empty list, explaining Chromium any=false. UiAutomator2.4 Configurator default0; every direct getUiAutomation no-arg also requests0.
- [ ] registered-consumer-baseline byte backups/custody; temporary test-only service class+XML+manifest, flags-consistent automation helper, explicit diagnostic-only control/registered driver arms. No production app change. Test service has no node retrieval/gesture/touch exploration capabilities; only package-filtered scrolling events, generic feedback, no event logging.
- [ ] Paired A-B-A focused e: same non-suppressing automation flags, only registered service changes. Save exact secure-setting presence/value, append only own component, restore after compare against expected mutation. Verify exact AVD name/owner marker and no current services before operation; fail closed on mismatch. No runtime flags/provider changes or qualification. If A does not fail, experiment inconclusive; never cherry-pick.
- [ ] qa-consumer diagnostic logs and source hashes; archive findings then remove all temporary deltas using custody.

Consumer arm A r_s085jd passed focused e, while Chromium any=false/screenReader=false and saved services absent/enabled0. Thus A did not reproduce; paired cause inference is already inconclusive. Run B only to verify proposed registered-consumer state is real, then A reversal to verify settings restoration; no claim of AX fix or qualification regardless of outcome.

Consumer B connected real no-op service PID19765; Chromium target19801 observed any=true/screenReader=true, tool/spoken/touch/gestures/passwordOnly=false. Focused e passes, driver reports exact settings restored. This proves the diagnostic manipulation changed the intended boundary, not the AX cause because A passed. Next A reversal, then remove temporary service/driver/flags; preserve ordinary test privacy regressions.

A reversal focused e also passes. A-B-A is inconclusive for failure cause; registered-consumer changed state as predicted but no red baseline in that selection. No service or flags adjustment is retained as a product/QA fix. Saved exact experiment source/custody, then restore3 pre-experiment file bytes and delete2 exact known new files. Settings restored to absent services/enabled0; next fresh API36 default qualification on corrected product source.

Stopping exact marker/name-verified API32 AVD5556 after experiment source/settings restored; preserve its metadata/data for evidence. Fresh boot existing owned API36 AVD5558 from native-owner.json custody. No user AVD touched.

### Cleanup of temporary source diagnostics (before final API36 run)
Keep confirmed focus/privacy fix and actual task/marker/public-control regression, exact HOME debug query/helper-only exclusions/test APK retirement, and parent refusal of diagnostic reports. Remove speculative pre-reveal logger, diagnostic d1, lifecycle/state/cache observer instrumentation, explicit observer CLI/hold/extra safety test (feature itself removed). Keep ordinary failure PNG/XML capture. Report rendererObserver=false explicitly; no observer entry point remains. Archive exact pre-cleanup source and hashes first. No product workaround for AX.
- [ ] cleanup-source-before directory hashes; archive summaries into durable evidence before final scratch cleanup.

Clean-source API36 px6do2j2 full9+external Owner cold restart PASS, sourceHash5e07536731d9a4cbe6049c32bb27698c3984b9c2d79cc6be40d78d121988f09a; platform-default133/noflags/noobserver.13 Node +17 Python guards PASS. Stop exact owned5558 and boot exact owned5556 for same cleaned-source API32 verification (prior API32 run used removed debug source); no rerun-as-fix claim for AX.
- [ ] privacy-focus-full32-clean.log; preserve result, no source changes while run.

### Clean32 result / one full-matrix registered-consumer experiment
jrbwotin:7/9 pass. c fails Home; d passes actual private marker/Recents/revocation/card return/power off/recreation and fails final Sign out target. Full32 remains red. Current API36 full9+cold is green; no AX cause claim.
Focused consumer A-B-A never reproduced; it proved only consumer-state toggle. Full9 is the observed failing owner scenario. Run exactly one full9 A-B-A with consistent non-suppression flags and otherwise identical native/fixture/test source, actual manager consumer count and same-PID Chromium state recorded. This is an experiment, not retries for acceptance. All reports diagnostic. Auto-disable hypothesis is ruled against by exact stock WebView candidatefalse; do not claim 5s timer explains it.
- [ ] registered-consumer-full-baseline custody and temporary class/XML/helper/driver again; preserve3 pre-experiment bytes, no product changes. full-qa-consumer-{A,B,A-reversal}.log; then restore exact files/remove2 new files.

Full consumer A70chz3a1:8/9 pass; c fails exact Sign out after recreation, absent AX target. All native targets assert manager bound-consumer count0 with consistent DONT_SUPPRESS flags; no overrides. This is reproduced full-matrix baseline. Run B once identical source; only saved/owned registered-service settings change. Preserve runtime log before next arm.

### Full consumer result / restore / escalation
A70chz3a1 and Bc8j6p096 both8/9 pass; same c exact Sign out target absent. B targets assert bound count1 and same-PID Chromium any=true/screenReader=true, proving manipulation active despite failure. B reports qaSettingsRestored=true, noflags. Registered-consumer presence/mode is NOT a sufficient fix. No A2 needed because B did not toggle failure; avoid redundant rerun.
Read Phase5 escalation after second failed post-synthesis round; asked user priority (continue independent capabilities with release blocked vs Android-only investigation). No supported-OS reduction, test waiver or release acceptance requested/inferred. Await answer for dependent B implementation. Continue cleanup and already-authorized verification.
Preserve exact experimental3+2 sources/custody, restore3 baseline bytes/delete2 exact files. Remove unused os import introduced only by removed observer safety test. Final native app still only confirmed FLAG_SECURE/focus fixes; marker/task/privacy regression remains.

Source/settings restored; retire exact test APK to remove disabled diagnostic service binary, verify no test package remains, stop exact owned5556. Next Android JVM/Debug/unsignedRelease/lint uses private marked external build directory with allowlisted environment; no provider/DB credentials.

Final Android build yvsokd7o PASS92tasks/6JVM tests; lint0errors7warnings retained. Release artifact guards pass, SHA256cc8fc488419ef545497d5b7496c6781077624a6bae02f48a319b17aa9d44400f; no HOME queries/test services/debugorigin/cleartext/backup/debug strings. AndroidX adds its declared signature-level dynamic receiver permission and DUMP-protected profile receiver; one-off Internet-only inspection assumption was corrected from actual manifest, not an application/test relaxation. apksigner correctly rejects unsigned artifact MissingMETA-INF/MANIFEST.MF; no signed-build claim.
- [ ] final-repository-unit.log: run full default Vitest maxWorkers1, allowlisted tool environment, no own SDK/servers running. Keep any failures, no timeout/assertion changes.

Current full repository Vitest PASS:700files/10653tests,27files/801pre-existing skips,403.51s, maxWorkers1; no own SDK workload. No assertion/timeout changes.
- [ ] final-ios-fixture.log: actual full7 simulator fixture cases on exact owned6E2DA181-CD13-4815-A2B1-8AF1CBC15AC2; shared fixture now includes Owner private marker. Boot only after exact saved UUID/name proof. No signing/device/provider access.

Final iOS fixture bsi1fbmb full7 PASS; independently extract/assert exact7 source XCTest method names, all Passed, not relying on driver passedTests>0 Minor limitation. Archive result/summary/identifier tree/log; no backend/physical/signing qualification. Shut down exact owned simulator before production build.
- [ ] final-production-build.log / marked external clone from existing reviewed production-build.mjs; no source changes until source-custody result closes.

Final production attempt did not start a build: free-space precheck observed2.9GiB; shell newline erroneously still launched helper, whose clean-source guard rejected current uncommitted candidate before resource creation. No new production mirror exists. Keep both failure facts; do not bypass clean-source or free-space gates. Next run typecheck/ESLint directly with stripped environment (no build or migrations); production/full-backend remain pending a clean candidate.

## Continuation
Jose asked what comes next. The builder resumes the already approved independent server capability work; this is not a risk acceptance or an Android fix. All diagnostics remain stopped; missing-node investigation and foundation release gate remain open. No commit is made from this debugging run.
