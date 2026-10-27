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
