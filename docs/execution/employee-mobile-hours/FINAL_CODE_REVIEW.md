# Employee mobile Hours — final whole-change code review

Reviewer: independent fresh-context code-review agent. Date: 2026-10-27.

**Current finding status: HCR-01 CLOSED by bounded follow-up at `9f36e71c09edf36d831466ed4cd44b0f30e4b7db`.** This closes the source/recovery defect only. The original review below remains historical evidence; its merge-blocking HCR-01 assessment is superseded by the closure addendum. Whole-batch QA, three-engine acceptance and release readiness are not approved here.

Reviewed branch `codex/employee-mobile-hours-20261027`, base `1f88fc70e4ea8d5f2cf1727f5f2384fa280ee58e`, head `7efc194a8e72c0df866649ca6e84831876446806`. Review package: `.superpowers/sdd/plan/review-1f88fc70..7efc194a.diff` (SHA256 `3059568b5164d167a86d99cec61345081100c75e759b1c6d00b8041c3480798f`). Working tree was clean at source inspection. This report is the only reviewer-authored file; no application/test changes, runtime launches, pushes, PRs or deployments.

Read the repository AGENTS, plan, teal spec, progress ledger, requesting-code-review reviewer instructions, relevant executive engineering/security/assurance/governance skills, changed production and test files, and the surrounding canonical readers, private lifetime controller, authorization guards and correction SQL/replay paths. Existing reports and test logs were treated as observations to inspect, not authority.

## Strengths

- Own identity comes from the server session. The private route binds the view header to that session; guarded database reads recheck the exact current Employee/Lead role, workspace and session. The response and client decoder bind view/selection and a finite lease. No caller employee selector was introduced.
- The adapter retains canonical recorded-time, effective-timecard and correction sources. Submission uses the existing correction service and adds admission after its employee lock. Original own REQUESTED events bypass only new-source equality; the core operation fingerprint still rejects a changed command, and current session checks still apply.
- Raw punches are not edited by the new mobile submission code. Manager approval/finalization remains on existing paths. Optional exact request and entry selectors remain inside employee/workspace predicates.
- Correction intent is cloned/frozen and duplicate sends are serialized. Source changes require deliberate draft review. Pause clears rendered private data while retaining mounted in-memory state. Desktop content and manager routes are retained structurally; new CSS is restricted to the employee mobile scope.

## Issues

### Critical

None identified in this source review. This is not a security or production certification.

### Important — HCR-01: original-operation recovery disappears when the edit is no longer eligible

Primary location: `src/components/employee-mobile/hours-corrections.tsx:40` (early return) and `:56` (unreachable retry control). Supporting locations: `src/lib/employee-hours-draft.ts:11`, `src/components/employee-mobile/hours.tsx:32`, `:35`, `src/lib/data/time-corrections.server.ts:94`, and `db/migrations/0017_missing_time_supersession.sql:196`.

Scenario:

1. An active Employee/Lead opens an approved missing-time request A and submits replacement B.
2. B commits, but its response is lost. The mounted operation retains B with `status: unknown`.
3. Before checking that result, a manager approves B. A's adjustment is no longer a leaf. The next protected read returns A with no `currentAdjustmentId` and changed effective context. Removing A's location eligibility while the employee remains active provides another trigger for the same problem.
4. `resolveHoursEdit(snapshot, 'missing:'+A.id)` returns null. The form returns `HoursUnavailable` before reaching its pending/unknown operation controls.

The binary source observable is that `Check submission status` is unreachable, although `operation.uncertain` remains true. `onSubmit` refuses every new proposal, and another edit links back to this same unavailable recovery page. Refresh cannot restore eligibility after supersession. The employee cannot reconcile the existing submission within this mounted lifetime; abandoning the page discards the original operation owner instead of resolving it.

The server already supports the required recovery: the stored B event admits replay and the supersession SQL returns its original event before validating a *new* target adjustment. New-edit eligibility must not gate recovery of an existing operation. Render retained pending/unknown operation recovery before resolving a fresh form source, while preserving the current authority/lease admission. Do not reconstruct or resend a new command.

Required regression: lose the committed replacement response, approve that replacement, refresh or soft-navigate away/back, and check the original submission. Assert the recovery button remains available, exactly one B request exists, the same operation ID is replayed, and the receipt/detail reflects current approved state. Also cover loss of location eligibility without loss of own-read/session authority. The submitted browser test covers lost entry response and approved missing replacement separately, not this combined transition.

### Minor

None added by this code review. Independent visual findings belong to their author's report and are not certified or regraded here.

## Evidence and limits

This is a static code review under the caller's source/runtime freeze. No fresh unit, SQL or browser execution was performed by this reviewer. The following evidence is captured here so the finding does not depend on an unrecorded claim:

| Scenario/check | Invocation inspected or run | Binary observable | Artifact |
| --- | --- | --- | --- |
| Exact candidate/source custody | `git rev-parse HEAD`; `git status --short`; `git diff --stat 1f88fc70..7efc194a`; `shasum -a 256 .superpowers/sdd/plan/review-1f88fc70..7efc194a.diff` | Exact head above; clean tree before report; 35 files, 665 insertions/28 deletions; hash above | Review package plus this report |
| HCR-01 eligibility transition | `nl -ba src/lib/employee-hours-draft.ts`; `sed -n '90,125p' src/lib/data/time-corrections.server.ts`; inspected leaf view and supersession SQL | Null current adjustment, changed base or missing eligible location makes the missing-edit resolver return null | Source at reviewed head; captured excerpts below |
| HCR-01 recovery reachability | `nl -ba src/components/employee-mobile/hours-corrections.tsx`; `nl -ba src/components/employee-mobile/hours.tsx` | Early return precedes retry; uncertain original continues blocking new submissions | Source at reviewed head; captured excerpts below |
| Diff whitespace | `git diff --check 1f88fc70e4ea8d5f2cf1727f5f2384fa280ee58e..7efc194a` | Exit 0, no output | This report records the observed result |
| Existing SQL evidence inspection | `cat .superpowers/sdd/plan/sql-third.log` and read its six scenario implementations | Log reports 6/6 with owned cluster stopped; no combined HCR-01 scenario | `.superpowers/sdd/plan/sql-third.log`; `src/test/integration/employee-mobile-hours-sql.integration.ts` |
| Existing focused unit evidence inspection | `cat .superpowers/sdd/plan/current-unit.log` and read relevant tests | Log reports 5 files/17 tests; no recovery-render eligibility test | `.superpowers/sdd/plan/current-unit.log`; reviewed unit sources |

Captured decisive source statements:

```text
employee-hours-draft.ts:11
if(request?.kind==='MISSING_ENTRY'&&request.status==='APPROVED'&&request.currentAdjustmentId&&!request.baseChanged&&request.context.state==='confirmed'&&snapshot.locations.some(l=>l.id===request.locationId))return ...;
employee-hours-draft.ts:12
return null;

hours-corrections.tsx:40
if(!info||!readyDraft)return <HoursUnavailable ... onRefresh={onRefresh}/>;
hours-corrections.tsx:56 (later in the function)
isActive&&uncertain ? ... <button ... onClick={onRetry}>Check submission status</button> ...

hours.tsx:32
if(!edit||!panel.allowed()||operation.pending||operation.uncertain)return;
```

Source SHA256 values: `hours-corrections.tsx` = `dc7eb7d9cf62581611cb45431aa6d16ec520c00fa7c31f551cf2f46e63dfebc6`; `employee-hours-draft.ts` = `c1a7e872d6f57b06381c8bf0ba582651ae9f866340989e11cecd6bf9919d3b17`; `time-corrections.server.ts` = `53be1569cb961db562a021ccb54d653dbc7fc2233a920ff201886bd71f2196c4`; supersession migration = `2a35c4e3180c3294c7197af56415b231bf66a0b30417000e08de17d161ef8fea`.

The passing logs above were read directly, but are not claimed as reviewer-executed verification or proof of every plan criterion. The current browser run and broader unit run were still being handled by the executor. Exact older-than-window request/target behavior, true concurrent lock races, complete failure-state coverage, and browser recovery of HCR-01 require explicit final validation evidence; source reasoning alone does not certify them.

## Declined to judge

- Persistence after full reload or unmount: the approved plan explicitly resets a fresh lifetime; this review evaluates recovery while the operation owner remains mounted.
- Raising existing history/source limits or introducing pagination: the plan explicitly retains/discloses existing limits. Exact selectors were reviewed for scope, not as an authorization to redesign those limits.
- Physical-device/assistive-technology certification and hosted/assembled/CI/production readiness: explicit separate gates outside this local review.
- Final visual fidelity and the running browser matrix: owned by independent UI/QA and the executor's frozen validation run; no rendered acceptance is inferred from CSS inspection or partial artifacts.

## Assessment

**Ready to merge: No — HCR-01 requires a fix and regression evidence.** The canonical service and authorization integration are sound in the inspected paths, but an employee can become stuck with an unresolved committed replacement. Complete the single remediation pass, preserve original operation identity, and run the relevant frozen regression scenarios before claiming this batch complete. Remote push pause and production restrictions remain in force. No Jose policy exception is needed for this bounded corrective work.

## Bounded HCR-01 closure addendum — 2026-10-27

The executor requested verification of **only HCR-01**, not another whole-change audit. I inspected current source, the failing reproducer, green test log, the implemented browser scenario, captured browser results/screenshots, and source custody. No application/test changes or application runtimes were launched by this reviewer. Only this owned report was updated; unrelated `.21st/design.json` and independent review work were preserved.

### Fix verified

At `src/components/employee-mobile/hours-corrections.tsx:41`, an active pending/unknown original operation now renders its recovery section before the new-edit `!info || !readyDraft` early return at line 42. The retry delegates to the existing operation owner; it neither constructs a fresh command nor relaxes `panel.allowed`/current session admission. The original receipt path still precedes both branches. Consequently a source that no longer resolves as a new edit cannot remove this existing operation's recovery control.

### Inspected evidence

Artifact root below: `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/`.

| Scenario | Invocation/source inspected | Binary observable | Captured artifact |
| --- | --- | --- | --- |
| Missing editable target with uncertain original operation | Vitest test `keeps original-operation recovery reachable after its fresh edit source disappears`, `src/components/employee-mobile/hours-records.test.tsx` | RED fails because rendered HTML has only `Try again`; GREEN reports 3 files/10 tests passed. Current test asserts `Check submission status` present and `Send correction request` absent. | Worktree `.superpowers/sdd/plan/recovery-red.log` and `recovery-green.log` |
| Lost committed missing-time replacement, then eligibility loss | Frozen `employee-mobile-hours.integration.ts` missing-time segment: intercept action with `route.fetch()` then abort response, query committed replacement, DELETE eligibility, Refresh | Chromium and WebKit reach the recovery button with no new-submit control. Actual screenshots show that button. | `outputs/employee-mobile-hours/browser-fifth/results.json`; `chromium-ineligible-original-recovery.png`; `webkit-ineligible-original-recovery.png` in that same directory |
| Same unresolved replacement, then approved supersession | Same segment: restore eligibility, approve committed replacement, Refresh, click original recovery | Chromium and WebKit complete the segment after the original source ceases to be a leaf; the test waits for `Correction recorded`, asserts dropped response, and asserts exactly one replacement request in PostgreSQL before recording the successful scenario. | Same `results.json` has the completed missing-time scenario for both engines; `chromium-superseded-original-recovery.png` and `webkit-superseded-original-recovery.png` |
| Source custody to the follow-up candidate | `git diff c0c1d6c8a0eca7594f0669984cc62535287a864c..9f36e71c`; `shasum -a 256` on current and owned-copy recovery/operation source | Browser-fifth manifest pins `c0c1d6c8a0eca7594f0669984cc62535287a864c`. The only subsequent change to `9f36e71c` is the later account-switch test's `about:blank` step; application source and this recovery scenario are unchanged. Recovery component and operation source hashes match the owned copy exactly. | `outputs/employee-mobile-hours/browser-fifth/owned-next-0juqLQ/source-manifest.json` and its `app/src/components/employee-mobile/` source copy |

I directly opened `chromium-ineligible-original-recovery.png` and `webkit-superseded-original-recovery.png`, rather than accepting their names as proof. Both show the original-submission recovery section and `Check submission status` action. I read the actual scenario assertions and result entries before attributing the receipt/database-count observations to that completed segment.

Evidence hashes: RED log `006dda8a1db56ca6bcf842d284fcc400b6ef7e25a87712bf4ac6e258a452b609`; GREEN log `73ecfd21b93e30758b0d0a5b5bc8049d27ab555be20e09028223cc37316252fb`; browser-fifth results `4c4ed8d30f2209d2d51cc00aa895a2d80e358aee8129821c4e234912c57e06b8`; source manifest `21e8b9a0f32268a8a08fb0a7fb16b823157b8a32c4fab5f731744f117ed5cb64`. Matching current/owned application hashes: `hours-corrections.tsx` = `057b583c10598ed66187d25086cc4ddd51cc4367d319979b88cd11e823675987`; `hours-operation.ts` = `8c66b8d8da0c456fbe2cd70f3da7ea6067779b9c289b4884b3499c62f1ccca2a`.

### Closure and remaining validation boundary

**HCR-01 is closed.** The reported blocked-recovery condition has an explicit RED→GREEN reproducer, a source fix preserving original identity/current admission, and completed real Chromium/WebKit scenario evidence for both disappearing-source triggers. This conclusion does not treat the entire browser-fifth suite as passing: that run failed later during fictional account switching, and Firefox HCR-01 completion is not claimed here. Eligibility-loss evidence proves retry reachability; the actual retry in this combined scenario occurs after eligibility restoration and approved supersession, so replay while eligibility remains absent is not claimed as browser-tested.

At follow-up inspection, `outputs/employee-mobile-hours/independent-qa/hours/results.json` contained only 12 Chromium checkpoints through break correction, and `independent-qa/integration.log` reported the Hours browser test failed before the replacement scenario. That run is not closure evidence and is not three-engine acceptance. Independent QA/executor retain responsibility for diagnosing and completing the full frozen suite. This bounded finding closure does not waive that gate, approve unrelated changes, certify current approved-detail navigation after the replacement receipt, or authorize push/merge/deployment.
