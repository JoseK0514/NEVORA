# Independent Employee mobile creation UI review — closure

- **UI recommendation: GO WITH CONDITIONS** for this bounded local UI gate.
- **Fidelity recommendation: APPROVE.** No open CRITICAL/HIGH/UI blocker.
- **Reviewed candidate:** `2db6f316a30ca308aad79b71bc46fa59e7329fbd`, branch `codex/employee-mobile-creation-20261027`, base `f3a72860`.
- **Scope:** Employee/Lead mobile swap creation, cover offer creation, Unable-to-work submission, their shared native task route and own receipt destination. This is not an approval of all remaining Phase2, Phase3, production, or desktop redesign.
- **Independence:** Reviewer changed only this report, its mandated evidence copy and review evidence logs. No product/test/config fixes implemented. Findings and closure below are reviewer-authored.

## Final test-only lineage — independently verified

UI approval and UI-01/02/03 closure extend to **`351e33a1a7ecb04dfb6de01a9674953ea7eff903`**. Independently inspected the full diff from approved2db6f316: only `src/components/employee-mobile/creation-view.test.tsx` changes, renaming the verified-empty test and removing one already-green exact-sentence pause-copy assertion. The underlying private-fact-release/changed-binding/module-off tests remain, as do the actual native browser boundary and fresh-read assertions. No product, style, authorization or browser-test behavior changed.

Independently byte-compared13 reviewed product files through `git show` at both commits (creation view/controller/CSS/operation, shared exchange view/sheet, creation model/server reader, both task pages/intercept layout, AppShell/app layout): all identical. Repository-wide name-status confirms no other changed file. The copy itself remains exactly as reviewed; UI-03 closure rests on inspected product wording and actual pause/recovery behavior, not keeping a brittle wording-only assertion permanently. No additional product replay is warranted solely by this test-only deletion. Prior10-test evidence remains an accurately dated historical run, not a claim of the new test count. Fresh combined QA evidence must identify351e33a1 separately; this lineage note does not claim that run has completed.

## Findings by severity and closure

### CRITICAL
None found. Actual controls are live React/native DOM, not screenshot substitutes.

### HIGH
**UI-01 — CLOSED (evidence correction, not custom product trapping).** Initial final run at8125d881 failed at `src/test/integration/employee-mobile-creation.integration.ts:59` while asserting every Tab remained inside the native modal. Retained diagnostic traces prove Chromium's Tab5 moved into browser chrome (`hasFocus:false`, BODY), and the app correctly released private facts. That did not establish a background-page focus escape. I reviewed the bounded assertion correction: document-owned focus must remain inside; browser departure must pause/release facts; actual pointer return must cause a fresh protected GET, followed by native Tab within the dialog. Escape and explicit My schedule still require exact visible originating-shift focus. No custom Tab trap was added and no failure capture was removed.

Fresh accepted run at2db6f316 passes all three engines. Its22 focus observations show Chromium/WebKit chrome departure plus successful fresh read/re-entry, and Firefox's document focus remaining within the task. Both dismissal assertions passed in every engine. `browser-accepted.log` records1/1 orchestration passed in115.96s. The previous failed assertion remains in `browser-final.log` and `focus-diagnostic.log`. This closes the keyboard-evidence blocker for the stated local contract; it does not claim testing physical-device or screen-reader behavior.

### MEDIUM
None demonstrated in the inspected bounded implementation and actual captures.

### LOW
- **UI-02 — CLOSED:** Duplicate verified-empty swap explanation (`creation-view.tsx:33,44`, `employee-creation.server.ts:60`) now renders once when a checked notice already supplies the explanation. Independently rerun regression proves exactly one occurrence. Failed discovery remains distinguishable from verified empty and retains a separately permitted cover link.
- **UI-03 — CLOSED:** Pause copy at `creation-view.tsx:30` now says “Reconnect or return to this page to refresh.” It no longer incorrectly attributes all blur/pagehide pauses to connectivity. Independently rerun regression covers this wording. Source still clears private view facts while paused.

## VERIFIED — system and rendered UI

- Reviewed the change from base through accepted candidate, including component tree, styles, responsive wrappers, shared sheet return path, minimal protected view, payload/operation owner and browser/component tests. `CreationView` reuses shared `RequestShiftSlot`, `SheetCancel`, Requests heading/body/notice/primary/secondary/footer styles, native fieldset/radio/textarea and Phosphor CaretLeft. No new image-based UI, custom theme, paid component code, dependency or parallel mock data tree appears in this diff.
- Approved reference is the scoped `docs/product/specs/employee-mobile-teal/README.md` plus `.21st/design.json`2026-10-27 decisions and personally viewed prior accepted `employee-mobile-responses/accepted/details/chromium-incoming.png`. Older global DESIGN.MD remains desktop authority. The new cards, inset, typography roles, section rhythm, quiet supporting ink, single teal primary, borders, button geometry and navigation match this specific approved system.
- `creation.css:1–28` fences the change behind Employee mobile. Colors, spacing, typography, radius, focus and primary-control styling derive from --em tokens/shared styles. Local radio/textarea minimum geometry does not create a separate palette or type scale. Rendering is live, content-sized and reflows rather than using screen coordinates.
- Own reviewed source details are first; source and target dates/times/locations/roles are distinguishable. Overnight shifts explicitly give next-day end details. Native radio groups require a deliberate target/reason; Other note is associated with its label/hint/error, bounded to300 characters. Plain consequence text explains continued assignment and required consent/review. Error presentation remains inline and restrained.
- Changed-source notice requests explicit review without discarding the mounted note. Current authority loss withholds fields/actions. Uncertain submission uses the original operation recovery; canonical receipt provides one clear own-detail action and focuses its heading. UI never claims that merely sending a request changes the assignment.
- Actual accepted evidence covers three engines, all three forms, Light/Dark at320/390/430,200% root text, touch-height checks, and native focus.54 measured primary text/background pairs are6.089–13.845:1; do not mislabel these as measurements of every UI element. Selected images show readable error/secondary text, intact wrapping and navigation clearance. Full-page captures naturally show the fixed navigation at the capture viewport position; 200% screenshots and actual scroll-to-footer assertions confirm reachable content.
- Desktop-preserved actual screenshot shows incumbent desktop form; source responsive adapter retains those children. This does not certify unrelated desktop workflows.

## Evidence personally inspected

Paths below are relative to `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying` unless prefixed by repository path.

- Fresh actual browser `outputs/employee-mobile-creation/accepted/creation/results.json`:40 named checks,192 generated captures,54 primary contrast samples,22 focus observations. I inspected the test assertions and results, not just the success claim.
- Fresh screenshots personally opened with image viewer: `chromium-intercepted-swap-viewport.png`, `chromium-swap-light-390.png`, `webkit-cover-dark-320.png`, `firefox-report-validation-dark-390.png`, `chromium-cover-text-200.png`, `webkit-report-validation-text-200.png`, `firefox-swap-text-200.png`, `firefox-report-reconciled-viewport.png`, `chromium-report-changed-shift.png`, `webkit-authority-denied-viewport.png`, `chromium-desktop-preserved-viewport.png`, all under the accepted/creation directory above. These span all forms/engines and representative narrow, enlarged, error, receipt, privacy and desktop surfaces; I do not claim manual inspection of every one of192 images.
- Retained earlier screenshots and logs listed in initial record below, including the failing initial final capture and prior accepted reference.
- Independent command: `./node_modules/.bin/vitest run src/components/employee-mobile/creation-view.test.tsx src/components/employee-mobile/creation-operation.test.ts src/lib/employee-creation.test.ts` — **3 files10 passed,0 skipped** on accepted candidate. Repository log `.omo/evidence/employee-mobile-creation/ui-review-unit-accepted.log` (initial8-test run also retained).
- Personally recomputed SHA256 for **1,943 source-manifest inputs:0 mismatches**, checkpoint2db6f316. Repository `.omo/evidence/employee-mobile-creation/ui-source-hashes-accepted.json`. Accepted owned runtime `owned-next-6f0fLb/ownership.json` reports closed/sourceVerified/mirrorVerified and released derived runtime artifacts. This reviewer independently verified source hashes; mirror close checks were performed by the owned-runtime harness.
- Accepted run has no page errors. Nine WebKit development CSS preload warnings and three deliberate negative-path console errors remain in raw results; no blanket “zero console output” claim is made.

## RISK / remaining conditions

No open UI findings in this bounded candidate. The full48-test combined regression rerun, independent QA/code closure, hosted integration, physical iOS/Android safe-area/keyboard checks, VoiceOver/TalkBack and release authorization are separate gates. At this report time the corrected affected browser suite has passed; do not relabel the earlier47/48 full suite as green. This reviewer did not independently replay the whole authenticated browser journey; the reviewer independently ran focused tests, inspected actual rendered artifacts/test assertions, and verified source custody. No push/merge/deploy or production action is certified. Remaining Phase2 and Phase3 scope stays gated.

---

# Retained initial independent review

Reviewer: independent UI/fidelity agent. Scope: swap/cover creation and Unable-to-work submission only. Base f3a72860; initial candidate 8125d881ac9f3924852a2855b99ee647893492ab. This is an interim evidence record; final approval awaits corrected native keyboard evidence and the fresh whole matrix.

## Initial findings

- **HIGH / BLOCKER UI-01:** The fresh final creation browser journey stops in the intercepted native task keyboard sequence. `outputs/employee-mobile-creation/final/creation/results.json` records only two checks and no contrast matrix; `chromium-failure.png` shows the still-open task paused. `src/test/integration/employee-mobile-creation.integration.ts:59` asserts containment after eight real keyboard steps; the terminal full log records47/48 passed and fails the containment assertion at line59:749. Root is diagnosing the exact cause. Do not claim this run passed or the final keyboard gate is closed based on run-2. Approval is withheld pending diagnosis, retained failing evidence, and fresh actual browser evidence.
- **LOW / ISSUE UI-02:** A verified-empty swap emits the identical empty notice twice: `src/components/employee-mobile/creation-view.tsx:33` emits `read.check.notice`, and line44 adds the empty-target notice; `src/lib/data/employee-creation.server.ts:60` supplies the same text. Render a single authoritative empty explanation. This unnecessarily repeats content in a simple task.
- **LOW / ISSUE UI-03:** `src/components/employee-mobile/creation-view.tsx:30` says “Return online” for every pause, although `creation.tsx:30` also pauses on blur/pagehide. Copy should describe pause/resume without asserting connectivity loss. This is visible in the fresh failing screenshot.

## Verified so far

- Real React/native form tree: CreationView, shared RequestShiftSlot, SheetCancel, native fieldsets/radios/textarea, original Phosphor icon. No pasted screenshot/background stand-ins or new component package.
- Scoped palette/type/spacing/geometry use existing --em tokens and shared Requests styles. Native control geometry is locally specified but does not introduce a competing visual system.
- Inspected actual run-2 images: Chromium light390 swap; WebKit dark320 swap; Chromium cover, report Other validation, changed overnight shift, reconciled receipt; Firefox320 200% root text. Matches accepted teal hierarchy, sufficient task grouping, clear assignment-retention consequences and restrained validation presentation. These are prior-candidate visual evidence, not final-matrix certification.
- Independently ran creation-view, creation-operation and employee-creation tests:3 files8 passed,0 skipped. Log `.omo/evidence/employee-mobile-creation/ui-review-unit.log`.
- Source review confirms required explicit target choice, current source fingerprint re-review, no automatic assignment success, private draft absent on paused/denied/binding mismatch/module-off, receipt focus intent and exact own-detail destination.

## Scope limits

No independent authenticated end-to-end replay has been run by this reviewer. Browser artifacts and test source are being inspected personally. No production/device/assistive-technology certification. Phase3 and remaining Phase2 workflows remain separate gates. No application/test/config edits by reviewer.

Independent custody check: SHA256 recomputed for all1,943 source-manifest files at initial candidate,0 mismatches. Evidence `.omo/evidence/employee-mobile-creation/ui-source-hashes-initial.json`. Accepted reference image `outputs/employee-mobile-responses/accepted/details/chromium-incoming.png` personally inspected.

## Diagnostic interpretation (reviewer-authored)

Personally inspected `outputs/employee-mobile-creation/focus-diagnostic/results.json`: tabs0–4 are within the native dialog (Back, radio, primary, alternate action, Refresh). Tab5 reports `document.hasFocus=false`, BODY active and paused view. This proves a browser-chrome boundary, not an in-document background escape. UI-01 is therefore an evidence blocker: the original test overstates the native-dialog contract. Correct verification must preserve strict containment while the document owns focus and verify release/resumption at the native browser boundary. Do not introduce a custom keyboard trap purely to satisfy an inaccurate assertion. The previous failing assertion and captures must remain retained.

Parent proposed a bounded test correction, explicit pause/private-fact-release checks when chrome takes focus, real pointer return followed by native keyboard interaction, and unchanged Escape/Back origin restoration assertions. Closure remains subject to inspecting actual fresh results; no assertion is considered passed from this proposed correction alone.
