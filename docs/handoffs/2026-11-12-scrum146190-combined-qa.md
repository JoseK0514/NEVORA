# Combined SCRUM-146 / SCRUM-190 QA and hosting handoff

Development is Jose's primary operating and acceptance release under the
November 12 policy. Codex owns backend/hosting and Claude owns application UI.
Main and public production still require approval of the exact verified release.

## Combined source and ownership

The hosting chat, **Complete SCRUM-190 backend work**
(`01a1d0e8-1551-7613-9b22-6469eee3fd72`), published the receipt-drain repair
in development `eee76416ec8d06435e73c3ecde9a77752ec0d446`. This combined
candidate preserves that repair, its actual-process regression, custody
diagnostics and state-release handling unchanged.

QA commit `2470b37f746f82ebaa751e9c593c1f53c5baf927` adds only the four-file
test/workflow change described below. The duplicated diagnostic implementation
from the earlier SCRUM-146 candidate is not added to this combined release.
Its original candidate tags and failed evidence remain available.

Jose explicitly approved direct coordination and combining the work in
`call_f512bcff2ae44e19a3ac145f9442bc3b`. The QA chat owns this candidate,
manual refresh, local qualification and candidate Actions. The hosting chat owns
the final development fast-forward, actual development gate readback and all
hosting, quotas, enrollments, marker inspection/recovery and provider execution.
It must independently verify the frozen combined SHA and artifacts first.

The QA chat's separate twenty-minute approval
`call_4a4ca27626d940e991d66491ce654905` remains unused and is not added to or
transferred into the hosting chat's separately approved combined window. No
workforce SQL, quota, enrollment, host resume, lock or provider mutation occurred
in the QA chat. Render was visibly suspended with the original saved settings
after the unsaved settings-import preparation was discarded.

## Proven D2 test-readiness race

Original candidate `f13614ae3a7aa661abbccc7c0643005d6e28fd0f` failed
[CI43281545099](https://github.com/JoseK0514/NEVORA/actions/runs/43281545099)
in the existing D2 native Correction-link focus assertion. Artifact13975425824
retains the actual WebKit witness: documentFocused=true, linkFocused=false,
activeTag=H1. The unchanged `CorpHoursFrame` effect focuses `hours-title` after
ready content commits; the harness had focused the link before that effect.

`scripts/d2-hours-route-focus.mjs` observes the actual ready frame, exact entry
and native heading focus before the harness focuses the Correction link. It
shares the original fifteen-second route budget, removes its observers/timer on
completion and never focuses an element or dispatches input. The original native
link-focus assertion and single Enter remain unchanged. No application UI code
or assertion/timeout weakening is included.

The real Chromium/WebKit regression reproduces the earlier visible-only
readiness false positive and checks delayed heading focus, foreign route,
missing focus and expired deadline. The same regression now runs before the
existing full D2 workflow step.

## Evidence and pending release gates

Independent code review is CLEAR / APPROVE with no blockers, scoped to the
four-file QA diff. It independently reran the Chromium/WebKit regression.
One nonblocking suggestion is an additional loading-to-ready fixture while the
heading already has focus. The full review and local qualification receipt are
in `scrum146190-combined-evidence-20261112/`.

- Combined source: native focus regression passed Chromium and WebKit; related
  deadline/foreground/native-focus checks passed46/46.
- Combined source: managed-runtime tests passed12/12, including the preserved
  actual-process receipt-drain regression. Type checking passed.
- All six manuals and their manifest were rebuilt with pinned Playwright1.62.1
  from committed2470b37f. Actual manual/PDF qualification passed1/1.
- Earlier standalone QA source66bfaacf passed the full isolated PostgreSQL D2
  run282checks/zeroerrors. Its owned cluster was stopped and its own disk mount
  ejected. This result is not relabeled as a combined-source hosted run.
- Standalone source66 validation reported12,655passed/895skipped unit tests,
  type/lint/build success and zero vulnerabilities in both dependency audits.
  Its candidate workflow remains separate from the combined candidate gates.

Evidence is retained under the QA chat's
`/Users/josek0514/Documents/Codex/2026-11-12/ple/work/`:
`scrum146-ci-failure-phaseD/`, `scrum146-local-d2-fixed.log`,
`scrum146-combined-deadline-tests.log`, `scrum146-combined-focused.json`,
`scrum146-combined-manual-verification.json`, `scrum146-combined-types.log`
and `scrum146-combined-manuals.log`. The source-bound candidate tag/Actions and
the hosting chat's execution receipt record the final frozen release identity.

Hosted acceptance has not occurred at this documentation snapshot. Source32's
retained marker remains untouched; its historical trigger is still unproven.
The hosting chat must use the exact combined source, fresh provider/queue/lease/
process evidence and its existing finite authorization. No simultaneous run or
reuse of older labeled ZIPs is permitted. Do not self-close independent findings.
Payroll/share, notifications, billing/provider and joined Owner/UI acceptance
remain open until the responsible owner records actual evidence in SCRUM-190
and SCRUM-146. Rondo/SCRUM-155 has a separate Velani repository and receipt.
