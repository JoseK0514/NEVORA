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


## Subsequent D2 authority-read attribution repair

The earlier standalone66 CI did not qualify: its source-bound D2 artifact
13977774358 records281checks followed by one final unexpected native diagnostic.
The heading/link-focus assertions passed. The manager's own authority-read
produced WebKit's access-control diagnostic while a real same-URL document reload
was pending (sequence2, age93ms). The native observer recorded a plain own
`authority-read`, with no JavaScript window error. No Playwright request reached
normal ingress, so the earlier record did not prove its method. The failed record
is retained in `authority-ci-witness.json`; it is not relabeled passed.

QA commit `7ba6cc6154757938fe6b6f736bbcc77fc5c3842d` adds explicit authority-read attribution only when its
owned native controls verify, the current source document has exactly one
pre-fetch-proven own GET with no body, and its real document navigation remains
pending. A separate fixed binding/token prevents cross-resource attribution.
The hardened notification witness is reused with its original default behavior.
There is no path-regex exemption or change to application UI, worker guards,
assertions or recovery timeouts. Method/body/query ambiguity, overlapping reads,
missing native or method proof, successor-document reads and actual window
exceptions remain fatal and are exercised by the controls.

The regression failed before attribution existed, then passed. Final native
qualification passed56WebKitcases:17original notification,17notification with
both witnesses installed, and22composed authority cases. All52related node
regressions, the CI contract and ESLint passed. Independent follow-up review is
CLEAR/APPROVE with zero remaining findings and independently repeated all56cases.
Its composition coverage suggestion was addressed before freezing this repair.
Reports are `authority-code-review.md`, `authority-native-controls.json` and
`authority-local-qualification.json` in the adjacent evidence directory.

Full exact-source D2 and final combined candidate/development Actions remain
required after this documentation/manual freeze. Candidate40155983 and its
artifacts remain unchanged; its Home Chromium failure is separately owned by the
hosting chat. The earlier EEE development communications failure is also retained:
an unchanged local14-cell/156-check run passed, but its original Linux CI cause
remains unproven. No speculative communication/Home fix, blind retry, main push
or hosted activation is implied by these local QA results.
