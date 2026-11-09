# Independent Employee mobile planning UI — final bounded review

**UI recommendation: GO WITH CONDITIONS for this bounded local UI gate. Fidelity recommendation: APPROVE.** UI-01 through UI-04 and UI-RUNTIME-01 are **CLOSED**. No open CRITICAL/HIGH/UI blocker remains. The full combined suite, independent code/QA closure and release gates remain separate conditions.

Final reviewed candidate `9034533e0e8a55e5e168affcccbb90b850ddeee8` (product bytes unchanged from `fd5e89adc9edfb3f478a642dce1c0eaee3f53bd7`), branch `codex/employee-mobile-planning-20261027`. The visual fixes entered at `1b51dbc6`; `95aae39b` only corrects the test order around a full-page navigation; `fd5e89ad` adds a nonvisual selection marker and binds browser readiness to the intended selection. I inspected these diffs rather than accepting a claim of unchanged output.

## Findings and closure

### CRITICAL
None found.

### HIGH
- **UI-01 CLOSED:** `planning.css:4–6` now defines a shared token-driven two-segment control with a 44px minimum target and a visible selected wash. Personally viewed corrected time-off tabs in `confirmation/chromium-timeoff-empty.png` and corrected availability tabs in `verification/chromium-availability-conflict.png`, `verification/webkit-availability-weekly-dark-320.png`, and `verification/firefox-availability-usual-dark-390.png`. The actual test asserts target height and differing selected background. Both underlying links retain `aria-current`.
- **UI-RUNTIME-01 CLOSED at9034533e:** The earlier fd5 verification completed all60 scenario records but failed on two WebKit pageerrors from notifications/Home and a Firefox error-boundary console diagnostic during the first hard navigation away from sign-in. That failed evidence remains under `verification/`; it is never relabeled passed. I inspected the full fd5..903 diff: only the browser prerequisite changed to await actual visible Home ready/partial and the time badge before starting planning. No product or diagnostic allowlist changed, and the strict unexpected-runtime-error assertion remains intact. The independently executed fresh affected case passes in50.697s with63 scenario records (21 per engine), zero pageerrors and no unexpected console errors. This supports closure for the tested settled-sign-in planning journey; it does not certify every possible interrupted-startup path.

### MEDIUM
- **UI-02 CLOSED:** `availability.tsx` uses `planningHoursIssue` to identify exact day/period/field, opens its disclosure and focuses it, and supplies `aria-invalid` plus the error ID in `aria-describedby`. Time-off validation now provides its associated field-specific message too. `verification/chromium-availability-invalid-friday.png` visibly focuses Friday's second start field with the Friday overlap error. The actual browser assertions require focus on that exact field, invalid marking and error association in all three engines; earlier valid Monday no longer receives the error focus.
- **UI-03 CLOSED:** `planning.css:7–8` gives the planning notice a 12px token gap and resets its heading margin. Personally inspected `verification/chromium-availability-conflict.png`: “Keep my edited days” and “Use saved hours” now have clear separation. The rendered geometry assertion requires at least 8px; the stylesheet supplies the system's 12px spacing.
- **UI-04 CLOSED:** A partial-day date label spans the grid; Start/End remain paired below it. Personally inspected `verification/chromium-timeoff-partial-form-light-430.png` and `verification/firefox-timeoff-partial-form-text-200.png`. The actual browser geometry assertions require date above the interval and aligned Start/End at430px in both themes; enlarged text stacks controls without horizontal overflow.

### LOW
None open in this bounded confirmation.

## VERIFIED evidence and limits

- Evidence root: `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-planning/verification/`.
- Independently compared **1,961 source-manifest inputs against the frozen working tree: zero SHA256 mismatches**, checkpoint fd5e89ad. Source remains live React/native DOM with reused token-driven Requests/response primitives. No raster substitute, custom parallel theme or external component dependency was added.
- Inspected `results.json`, the actual browser assertions and `.superpowers/sdd/employee-mobile-planning-plan/browser-verification.log`. There are **60 completed scenario records, 114 captures and 72 primary contrast samples (6.089–13.845:1)**. All three engines reached desktop preservation and authority-loss scenarios. These counts do **not** turn the failed orchestration into a pass.
- Personally opened verification images: Chromium conflict, invalid-Friday, partial-light430; WebKit weekly-dark320; Firefox partial-200% and usual-dark390. Also personally opened confirmation timeoff-empty and failure screenshots. Prior12 reviewed initial captures and the approved creation reference remain documented below. I do not claim to have manually viewed every generated image.
- The corrected navigation oracle now waits for the specific selection rather than accepting the prior ready panel. The mounted “Make another request” path is exercised before the full legacy-link load; the fresh form is then exercised after that full navigation. Original own-note, exact URL, receipt/list focus and permission assertions remain. Previous failed captures/logs are retained under `confirmation/` and `accepted/` (the latter directory name does not imply acceptance).
- Physical iOS/Android keyboards, native pickers, safe areas and VoiceOver/TalkBack are not certified by desktop-engine emulation. Whole-phase completion, hosted integration, production authorization and broader code/security gates remain separate.

## Final verification — personally inspected

- Fresh artifacts: `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-planning/independent-qa/planning/`. I read `results.json`, the enclosing `independent-qa/integration.log`, source manifest, ownership file and the unchanged strict diagnostic assertion.
- **63 completed records, 114 captures, 72 primary contrast samples, minimum6.089 and maximum13.845:1.** Chromium, WebKit and Firefox all complete the own-request, availability, draft, focus, narrow/enlarged, deadline, desktop-preservation and authority-loss paths. Four negative-path console errors correspond to deliberate dropped responses/401 authority loss. Three WebKit development CSS preload warnings remain; no “zero console messages” claim is made. There are zero pageerrors and zero unexpected console errors.
- Independently SHA256-compared **all1,961 source-manifest inputs** against the frozen903 working tree: **zero mismatches**. The owned runtime reports `closed:true`, `sourceVerified:true`, `mirrorVerified:true`. The sole fd5..903 diff is the explicit login-settlement prerequisite described above.
- Personally opened fresh screenshots: `chromium-availability-invalid-friday.png`, `chromium-availability-conflict.png`, `webkit-timeoff-partial-form-light-430.png`, `firefox-availability-weekly-text-200.png`, and `firefox-authority-denied.png`. These reconfirm exact invalid-field focus, spaced conflict choices, coherent date/time grouping, selected-tab reflow and removal of private editors on access loss. Prior light/dark320/390/430 verification captures remain applicable because product bytes are unchanged.
- **Remaining conditions:** the full combined58-case suite is still running at this report time; this review only confirms its affected planning case has passed. Independent code/QA final closure, physical iOS/Android native keyboard/picker/safe-area checks, VoiceOver/TalkBack, hosted integration and release authorization remain outside this bounded UI approval. No production deployment or whole Employee-mobile completion is claimed.

---

## Retained initial review — historical, superseded by the confirmation review above

The following section preserves discovery evidence. Its original open findings and original recommendation are not the current finding statuses.

# Independent Employee mobile planning UI review

**UI recommendation: NO-GO. Fidelity recommendation: REQUEST_CHANGES.**

Initial review, 2026-10-27. Candidate `8c8c55b2642e324dd980b7fe0d7fc91084c4313e`, base `4e622abd`, branch `codex/employee-mobile-planning-20261027`. This review covers Employee/Lead mobile time off and availability only. The reviewer has not modified application files, run another Next server, or changed git state. Findings and eventual closure remain independently owned.

## Findings by severity

### CRITICAL

None found in the inspected UI implementation. Live React and native form controls render the interface; there is no screenshot substitute.

### HIGH / BLOCKER — UI-01: filter navigation is unstyled and visually ambiguous

`src/components/employee-mobile/timeoff.tsx:40` and `src/components/employee-mobile/availability.tsx:41` use `em-request-tabs`, which has no definition in the loaded Employee styles. Actual run-2 captures show “WaitingDecided” and “Usual weekBy week” as adjacent plain text. There is no visible selected state or separation, and the links do not inherit the approved 44px control target. This breaks the established control system in two core navigation paths.

Close with a shared token-driven filter/segmented-navigation primitive, distinct current state, consistent spacing and >=44px targets. Verify both filter groups in actual rendered light/dark mobile and enlarged-text states. `aria-current` alone does not fix the visible problem.

### MEDIUM / ISSUE — UI-02: invalid availability sends focus to the first day, not the erroneous day

`src/components/employee-mobile/availability.tsx:51` chooses the first `input[type="time"]` on any time-validation failure. If Friday overlaps while Monday is valid, Monday opens and receives focus. This makes the employee search for the actual problem. The generic error also lacks a field-specific `aria-invalid`/`aria-describedby` relationship. Time-off fields at `timeoff.tsx:33–38` likewise have an alert but no field error association.

Close with deterministic identification of the invalid day/interval, opening its disclosure and focusing the relevant invalid control, plus linked error information. Actual browser verification should introduce an invalid Friday interval while earlier days remain valid; source inspection alone is insufficient closure.

### MEDIUM / ISSUE — UI-03: conflict-decision controls touch

`src/components/employee-mobile/availability.tsx:46` places the two full-width “Keep my edited days” and “Use saved hours” controls directly adjacent. `requests.css:46` supplies notice decoration but no action-group gap. `run-2/chromium-availability-conflict.png` visibly shows touching borders. The controls represent different decisions and need the established token spacing between them. Check recovery notices using the same anatomy as part of closure.

### MEDIUM / ISSUE — UI-04: partial-day interval is split across unrelated rows

Additional inspection before confirmation freeze: `timeoff.tsx:36` puts Date, Start time and End time in the same auto-fit grid. `chromium-timeoff-partial-form-light-430.png` shows Date beside Start time, followed by End time alone on the next row. The interval's paired controls should sit together: a full-width date followed by the Start/End pair, stacking the pair when narrow or enlarged. This preserves the logical reading order and the existing availability interval anatomy.

### LOW

No additional low-severity change requested in this initial review. Narrow enlarged text causes ordinary wrapping, including a broken long “Availability” heading; the inspected capture remains readable and contained. This is not evidence of horizontal overflow or a hidden task.

## VERIFIED

- Reference: `docs/product/specs/employee-mobile-teal/README.md`, scoped Employee mobile decision rather than the older global Signature direction. Read repository `AGENTS.md`, `.codex/skills/nevora-independent-ui-oversight/SKILL.md`, `DESIGN.MD` header, `.21st/DESIGN.md` context and prior approved creation review. Personally compared prior `outputs/employee-mobile-creation/accepted/creation/chromium-swap-light-390.png`.
- Real reused system: `PlanningFrame`, `PlanningFeedback`, existing Requests heading/body/list/notice/action/footer and response-status styles, Phosphor regular carets, native date/time/radio/checkbox/textarea/disclosure elements. No newly introduced raster, canvas rendering, asset-backed controls, new type family or parallel theme.
- `planning.css` scopes product layout behind the Employee mobile marker. Colors, typography, spacing, radii, focus and major targets derive from existing `--em-*` tokens/shared classes. Small native-control geometry literals do not create a separate design system. Desktop preservation is represented in the adapter, but this stopped run did not reach its browser verification.
- Apart from UI-01/03, actual inspected captures retain the approved white/canvas surfaces, quiet teal actions/washes, clean title hierarchy, restrained notices and consistent list/disclosure structure. Date/time fields reflow to one column at narrow widths; labels and supporting copy remain readable in light/dark.
- Source clears private editor DOM on pause/access loss through `usePlanning`/`PlanningFrame`, retains draft and original uncertain-operation state only in mounted memory, and uses current protected reads before rendering ready content. This is source evidence, not full authorization certification.
- Reviewed the browser test assertions rather than accepting its labels alone: full/partial form, original lost-response reconciliation, own detail/list focus, withdrawal, usual split periods, pause/recovery, deliberate stale-draft rebase and weekly empty-vs-unsubmitted paths ran before the failure.

## Evidence personally inspected

Evidence root: `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-planning/run-2/`.

- `results.json`, browser assertions in `src/test/integration/employee-mobile-planning.integration.ts`, `.superpowers/sdd/employee-mobile-planning-plan/browser-second.log`, owned-runtime manifest and ownership record. Ownership reports closed/sourceVerified/mirrorVerified; these are harness reports, not physical-device certification.
- Images opened: `chromium-timeoff-empty.png`, `chromium-timeoff-full-form-light-390.png`, `chromium-timeoff-full-form-text-200.png`, `chromium-timeoff-partial-form-dark-320.png`, `chromium-timeoff-partial-form-light-430.png`, `chromium-timeoff-uncertain.png`, `chromium-timeoff-own-detail.png`, `chromium-availability-usual-light-390.png`, `chromium-availability-usual-light-320.png`, `chromium-availability-weekly-dark-430.png`, `chromium-availability-weekly-text-200.png`, `chromium-availability-conflict.png`.
- Independently compared all 1,961 tracked source-manifest inputs against git blobs at recorded checkpoint 8c8c55b2: zero SHA256 mismatches. Results contain 14 completed Chromium checks, 35 captures, 24 primary contrast samples and no pageerror events; the interrupted suite is still not a pass.
- Source reviewed: all new UI components/styles, private-view hook and operation owner, shared Requests/response styling, responsive wrapper and AppShell/layout diff. Existing shared style and approved source were checked directly, not inferred from screenshots.

## RISK / BLOCKER — incomplete confirmation evidence

Run-2 is **not passed**. It stops in Chromium waiting for “Save usual hours” after returning from a closed weekly submission; that selection retains the earlier saved receipt. The log identifies a locator timeout. Whether correction belongs in the expected journey or implementation must be established; do not relabel this run green. WebKit, Firefox, desktop-preserved and final authority-loss paths have not been reached in this run.

Final UI approval needs the material findings above closed and the corrected whole browser journey at a frozen identified candidate, including source custody, narrow/enlarged views, keyboard/focus and remaining engines. Physical iOS/Android native pickers/keyboard/safe areas and VoiceOver/TalkBack remain separate risks; emulated desktop engines do not certify them. No production, hosted deployment, whole-phase completion or permission-security approval is claimed.

---

## Current reviewer-owned status — final bounded UI closure

- UI-01, UI-02, UI-03, UI-04 and UI-RUNTIME-01: **CLOSED**.
- Current UI recommendation: **GO WITH CONDITIONS**. Fidelity recommendation: **APPROVE**. No open CRITICAL/HIGH/UI blocker remains for this bounded batch.
- Candidate: **9034533e0e8a55e5e168affcccbb90b850ddeee8**. The affected independent planning replay passed; the broader58-case suite remains pending at this report time.
- Canonical authored report: `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-app-phase1/docs/execution/employee-mobile-planning/ui-review.md`. The `.omo/evidence/employee-mobile-planning-clone-fidelity.md` copy is byte-identical.
