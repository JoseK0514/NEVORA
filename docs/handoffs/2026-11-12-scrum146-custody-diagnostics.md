# SCRUM-146 workforce custody diagnostics

Development is Jose's primary operating/acceptance release under the November
12 policy. Codex owns backend/hosting and Claude owns UI. Main and public
production still require approval of an exact verified release.

## Change and evidence

Application commit `9c6423e93a3c565da1be2f502407615fc32e92de` adds fixed, bounded
classifications when a managed cycle cannot prove outer cleanup. The host emits
only source identity, profile position, canonical command, phase and an enum:
process cleanup unknown, invalid/malformed output, receipt binding mismatch,
worker cleanup unknown or invocation exception. It never records child output,
workspace IDs, receipt contents, credentials or exception text. Existing cleanup,
binding, process-group, cancellation and exclusive-lock decisions are unchanged.

The regression first failed because no diagnostic existed, then passed. Five
focused suites passed 57 tests; type checking and lint on the changed files
passed. The actual compiled host acceptance passed on exact 9c6423e93, covering
closed HTTP startup/shutdown, private-health denial, absent public execution,
source mismatch, compiled enrolled-profile validation, mixed-custody denial and
the actual extracted monitor ZIP.

The broader unit run recorded 12,654 passed, 895 pending/skipped, one failed and
55 other cases not counted as passes (13,605 reported total). Its sole failure
was the manual publication's stale application hash after this code change.
All six PDFs and their manifest were regenerated with the existing pinned
Playwright 1.62.1 builder against committed 9c6423e93. The final focused run,
including actual manual/PDF qualification and the five operations suites, passed
58/58 with no skips. The original broad-run failure is preserved, not relabeled
as a successful whole-suite rerun.

Local receipts are under the current chat's `work/`: `scrum146-unit-tests.json`,
`scrum146-final-focused-tests.json` and `scrum146-managed-acceptance/`. These
results are author implementation evidence, not independent audit closure.

## Hosted status remains open

The previous source32 host test completed both original fictional companies'
empty-queue payroll invocations and one real same-source restart, with signed
2-of-2 health. Later control quota failures retained host marker
`e2049b2c-bb21-41dc-bbe9-fcd2f8835f18`. This change does not establish why that
historical outer custody was unconfirmed. Inner failed/cleanup-confirmed receipts
alone are insufficient to clear the marker. It remains untouched.

No company SQL, quota, enrollment, Render processing, schedule, notification or
host lock was changed by this diagnostic work. Source32 hosting remains closed
and suspended. Earlier source32 hosted/CI receipts do not qualify this new
candidate. A new hosted test must first bind the exact candidate throughout the
participating host/native functions and satisfy current source/CI gates.

Current metadata-only counters: control 21,600 active / 5,440 compute seconds,
with operator quotas 21,600 / 5,400; company A 10,332 active with restored quota
7,200; company B 8,280 with restored quota 3,600. All are Free projects. These
operator caps are below the documented Free allowance; no plan upgrade is
proposed or authorized. Increasing them still needs a new explicit finite
test authorization because the previous exact window has closed.

A possible next packet is at most 20 minutes on the same host and two fictional
companies, with enrollments/processing closed by minute15 and suspension/cap
restoration by minute20. Maximum extra active time: 1,200 seconds per project;
temporary absolute caps: control22,800 active/5,740 compute, A11,532 active,
B9,480 active, preserving the earlier A12,000/B9,600 outer ceilings. Recheck
metadata immediately before proposing/executing it. Restore original caps on
all three projects. This paragraph is a proposal, not approval or permission to
resume the host. Do not recover a marker without complete paused-host identity,
private-file, bound receipt and empty-queue evidence; preserve unknown custody.

CTO/technical assurance: observability gap addressed; historical cause unresolved.
CISO/policy controls: retain strict custody and private data boundaries.
Program/governance: source work verified locally; hosted acceptance is a BLOCKER.
No independent finding is self-closed. Payroll PDF/share, web notification and
reminder delivery, named on-call/backup response and joined Owner/UI acceptance
remain open under SCRUM-146/SCRUM-190. No further real mail, Stripe action,
company creation, paid plan, main or production change is authorized here.
