# Independent UI-R1 focus correction recheck

Date: 2026-10-30. Independent reviewer; no implementation performed.
Correction candidate: `f446b8c896725212aafccf462236b4b5bcf0c096`.
Original reviewed candidate: `ecc247062363a8e5b93719ee0c3f26dae4710ae8`.
Original independent code/UI/QA reports remain unchanged. This is a separate record; UI-R1 is not yet closed.

## Initial source assessment and preserved intermediate evidence

Correction source is limited to `src/components/owner-advisor/notebook-panel.tsx`: all four Add/Edit openers remember their invoking control; an effect keyed only to editing-state entry/exit focuses the first textarea on entry, and restores a connected/enabled/rendered trigger (or a rendered same-panel control/summary) on exit. It does not run on typing or a notebook refresh while editing, and has no unmount cleanup that refocuses retired private content. It leaves authority, revision/conflict and mutation ownership unchanged.

Author RED at `a8ea3286/browser-red-01` is preserved: exit1, ordinary Chromium390 Edit goal left focus BODY, field y4095.42–4181.42 in844px viewport. Author first corrected browser run at `f446b8c8/browser-green-01` has a real WebKit1440 failure: focused=true, visible=false, textarea y812–898 in844px viewport. The actual viewport screenshot confirms a partially clipped field. This evidence is not silently counted as green.

Independent expanded probe is running under `/workspace/nevora-evidence/owner-ai-validation-20261030/independent-f446b8c8/focus-01`, using new owned Next/PostgreSQL and the unchanged candidate. It checks all goal/task Add/Edit entry points, ordinary click and keyboard Enter, Tab sequence, Save/Discard return focus, real polling during a stale draft, removed-trigger fallback, and private signout retirement. Final results and recommendation will be appended after terminal evidence; no success inferred mid-run.

Historical full-unit evidence now inspected at ecc24706: execution exit0, 10297 passed,801 skipped,55 pending assertion statuses, zero failed. The 55 pending assertions are not relabeled todo. Corrected-candidate SQL terminal evidence is 44/44, exit0. Corrected full-unit/browser completion is not yet established in this intermediate section.

## Independent expanded probe — terminal result

`independent-f446b8c8/focus-01/vitest.json` reports **success=false, one failed test**; runner process exited1 and logged owned cluster shutdown. The assertion failed on WebKit1440 ordinary **Edit goal** at external probe line34: focus poll had succeeded, then full-field viewport visibility was false. `webkit-failure.png` is an actual viewport screenshot and independently shows the textarea clipped by the lower viewport edge, matching the author's failure. This occurred even with fresh navigation at the desktop width. The original UI-R1 is **not closed**: native focus fixed keyboard targeting, but did not reliably reveal the editor field.

The partial `focus-01/report.json` retains31 completed checks: all four goal/task Add/Edit entries by ordinary click/keyboard Enter and Save/Discard return focus in Chromium390/1440; real automatic refresh preserves focus and draft and blocks stale Save; removing the invoking item yields live visible same-panel fallback; Chromium simulated explicit signout retires the private panel. WebKit390 completed all four entry/return checks plus refresh/conflict and removed-trigger fallback. Later WebKit1440 checks and WebKit signout did not run after the failure. No external requests or page errors were recorded. This is partial evidence, not a passed matrix.

Author `f446b8c8/browser-green-01` terminal execution is exit1, both suites failed: the notebook visibility assertion described above, and legacy browser suite timeout at240000ms. The legacy timeout is a distinct unresolved execution result, not inferred to be an application regression or waived by historical passing evidence. An independent exact notebook-suite rerun remains active for further confirmation; source remains frozen until owned runtimes close.

## Independent exact-suite confirmation and final recheck verdict

The second independent invocation, `independent-f446b8c8/notebook-01`, also completed with exit1, zero passed/one failed. Its WebKit1440 ordinary editor-entry JSON records **focused=true, visible=false, top812, bottom898, viewport844**. This exactly reproduces the author failure in the real original notebook suite. Both independent owned Next runtimes are closed with sourceVerified=true and mirrorVerified=true; both owned PostgreSQL runners logged shutdown. Only approved DB/generated-type substitutions were used. Source/index/ref/HEAD were not changed by this reviewer.

**UI recommendation: NO-GO at f446b8c8. UI-R1 remains OPEN (Important/P2), partially corrected.** Focus targeting is improved, but the first editable field must be deliberately revealed fully and reliably, including WebKit desktop; native focus scrolling alone is insufficient. Retain the bounded entry/exit effect, draft/poll behavior, fallback and private retirement while correcting reveal behavior. Reproduce all four entry points and Save/Discard returns on the next immutable candidate, including the stopped WebKit1440/privacy cases. No new implementation was performed here.

**QA recommendation: NO-GO for final local bounded acceptance at f446b8c8.** The mandatory UI gate remains open and the exact-candidate legacy browser timeout must be resolved or reproduced with a justified execution diagnosis. Corrected SQL44/44 is VERIFIED; the completed historical full-unit result is VERIFIED as historical evidence. Corrected full-unit terminal evidence was still unavailable at this final recheck cutoff and is not counted as complete. No Critical/backend authorization defect was demonstrated by this correction review.

These recommendations concern the local bounded increment only. Actual assistive technology, physical mobile devices/virtual keyboards, CI/hosted parity, production rollout/migration/rollback and paid-model reasoning remain outside the reproduced evidence. The user-space WebKit host-cache preflight exception remains disclosed; real engine execution occurred. Future whole-plan/action/monitoring capability is not a condition for this bounded notebook fix. Original reports/findings and all failed/partial artifacts remain intact.
