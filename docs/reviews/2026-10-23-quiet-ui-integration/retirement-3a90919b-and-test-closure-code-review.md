# Retirement correction and phone-test blocker closure

codeQualityStatus: WATCH
recommendation: APPROVE
blockers: None for the bounded retirement correction and removal of the phone-test catch. Combined release acceptance still requires its mandatory gates and resolution/disposition of the separately open Reports/Attention failures.

## Reviewed scope
Repository /Users/josek0514/.codex/worktrees/verify-preview-33/Fuel Scheduler.
Retirement diff: 2ea580d623c76dd7d717492d209552461b5b4a28 → 3a90919b3de7d40adb82ede2884fedd6dd3196bf.
Combined checkout observed at83b28ac271f5c7f34e555ef19f06e3cd4cf84b82. Its runner, retirement test and fixture match immutable3a byte-for-byte. Working changes at inspection are source inventory and the single test catch removal; neither is represented as a committed immutable fix here. No application edits or Reports prototype reviewed/approved by this report.

## CRITICAL / HIGH / MEDIUM / LOW
No new actionable code defect identified in this bounded change. Prior device-hook simulation and open-cover expansion WATCH notes remain in the310 review; they are not silently closed here.

## Blocking test finding R1: CLOSED by inspection
src/components/timecards.batch.test.tsx:307 now uses `host.effects.map(effect=>effect())` without try/catch. An unexpected effect error propagates from async mountAll to the awaited test rather than disappearing. Cleanup behavior for successful effects is unchanged. This directly addresses R1; it does not turn the manually simulated hook tests into real mounted browser lifecycle tests.
Parent reports224 focused tests on fresh locked dependencies; no raw224-result path was provided in this request, so that count is not independently attested here. The independently opened130-case artifact below is separately verified.

## Retirement controls retained
- The retired-process symbol is opt-in to observation paths. Registration and signal paths do not opt into retirement and do not receive new ownership authority.
- Linux throwing environment reads qualify only for ENOENT/ESRCH plus a clean exact-PID exit observation. EACCES/EIO remain fatal. Missing marker qualifies only with clean retirement proof; a live missing marker remains fatal.
- Non-Linux environment error, diagnostic stderr and nonzero results are rejected. A status1/empty result qualifies only with clean stderr, no error and subsequent clean exit proof. In particular, status0 plus diagnostic stderr cannot flow into successful retirement.
- Root sample retirement requires both root and sampled member to be cleanly absent/zombie. A surviving or uncertain member still fails. Retired samples are discarded, not promoted to root proof, member registration or signalling authority.
- Existing lifetime, group, ancestry, root-parent and strict registered-command checks remain. The initial-root positive-nonzero failure preservation is unchanged. No timeout extension, new broad fallback signal or success rewrite based on eventual cleanup was added.
- Safe observation metadata includes whitelisted phase/reason/errno and PID, not raw environment or command text.

## Independent artifact verification actually performed
Opened receipt.json, closure.json, source-audit.json and focused-results.json under:
/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/qa/retirement-3a90919b-independent/

Parsed raw test JSON: success=true,130 total/passed,0failed,0pending. Receipt records process exit0 and closure on Darwin/Node24.19.0. Compared exact git3a bytes with each retained reviewed source copy; all match:
- scripts/phase-e-owned.mjs — SHA25682a779c01bbea0e3390b96334465d322dafbb4d3dd36c7a09795665ee64b93b9
- src/test/phase-e-retirement.test.ts — SHA256250872bd0b67ac4a81856b33d1102034f4a2b5bed98f1cdb2e5079e064eb0b85
- src/test/fixtures/phase-e-retirement-boundary.mjs — SHA256d6222eb612a404299036e7cec14478181b4bc3a7db467a5deea6af14aefa58fb

Read the security diagnostic-stderr addendum and checked that its reviewed runner/fixture hashes match3a. Its test hash differs from final3a; the independent retained final test copy and result JSON are the evidence for final test coverage, not an assumption that every earlier working review was byte-identical.

Inspected all11 new retirement controls: actual member/root retirement, root with live member, EACCES/EIO, missing marker, failed/stderr/malformed exit observation, root with uncertain member exit, and Darwin environment stderr. Real fixture process identities and exit barriers are used; Linux marker behavior is explicitly simulated on Darwin. Assertions retain final cleanup, no backup cleanup, no individual member signals and negative failure status. Existing119 tests remain in the130-case run.

`git diff --check 2ea580d6 3a90919b`, working diff check, and exact3a runner syntax check passed. No local test suite, owned process fixture, browser, database, or external mutation executed by this reviewer.

## Skill perspective and limits
Previously loaded remove-ai-slops/programming perspectives reapplied. New controls test actual process/observer behavior and rejected failure classes rather than prose, removal, or implementation constants. New parsing is at a process-observation boundary and supports concrete ownership decisions; no needless application normalization added. No new skill-perspective violation found in this scope.

This supports including the bounded repair in a cloud-validation candidate; it does not prove the original Linux cloud failure's exact timing or mark that historical run successful. Native Linux acceptance on the assembled source is still required. The Reports navigation collision is a separate application issue; its prototype is not included or authorized by this review. Existing Attention failure likewise is not closed by process tests. Main/production/database authority is unchanged.

Only this required report artifact was written. ULW plan absent; fallback evidence path used. No notepad supplied.
