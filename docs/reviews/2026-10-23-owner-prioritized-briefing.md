# Owner prioritized briefing — independent code review

codeQualityStatus: BLOCK
recommendation: REQUEST_CHANGES

Reviewed checkout: `/Users/josek0514/.codex/worktrees/owner-prioritized-briefing-20261023/Fuel Scheduler`
Reviewed range: `055a383df5727526656c7cce423d5cfea57e4cee..c81f46a5e8d1922148d417dd7ffb2a7f15f43d0a`.
Plan: `docs/superpowers/plans/2026-10-23-owner-prioritized-briefing.md`.
Notepad: `.superpowers/sdd/2026-10-23-owner-prioritized-briefing/progress.md`.
Diff: `.superpowers/sdd/2026-10-23-owner-prioritized-briefing/review-055a383d..c81f46a5.diff`; independently inspected Git range and changed source/tests.
The ULW status command returned ULW_LOOP_PLAN_MISSING, so this report uses the required fallback path. No implementation, index, HEAD, branch, or prior evidence was modified.

## Findings

### CRITICAL

None found.

### HIGH

1. **Removing today's coverage window can falsely resolve its tracked shortage.** `src/lib/owner-advisor/briefing.ts:39` and `:51` treat covered health blocks as sufficient proof without retaining whether the tracked window still exists. The canonical health calculator intentionally creates blocks from active shifts when a day has no windows; its setup check only requires some window for the location on any weekday. Reproduced with real `calculateScheduleHealth` and `deriveAttention`: Friday 08:00–18:00 window requires two people, location default requires one, one assigned employee, and a Saturday window also exists. Track the Friday shortage, then remove only the Friday window. Result: `reviewed[0].state = "resolved"`, `partial = false`, `items = []`, although staffing did not improve and the tracked rule was removed. The UI reports that current planning records meet rules for the tracked periods. This directly breaks the approved prohibition on resolving removed subjects. Preserve/check canonical window provenance before asserting resolution; test removed and moved same-day windows while other weekdays remain configured.

### MEDIUM

2. **Changed setup subjects retain dismissal.** `src/lib/owner-advisor/briefing.ts:90` hashes only setup issue codes, omitting the affected position/window identity. Reproduced by dismissing an invalid position requirement for `missing-A`, then replacing it with an invalid requirement for `missing-B` using the canonical calculator. Both produce one `POSITION_REQUIREMENT_INVALID`; the fingerprint remains identical, `hidden = 1`, and `evidenceChanged = false`. The Owner's earlier triage silently hides a newly changed setup issue. Include stable relevant subject selectors/evidence in the fingerprint, preserving the grouped public card. Add a behavior regression proving a changed subject reappears.

3. **Projection publishes unreviewable coverage cards without marking the size failure.** `src/lib/owner-advisor/briefing.ts:99` adds every block to proof and `:113` does not account for the persistence ceiling; `src/lib/owner-advisor/store.server.ts:99` rejects proof lengths above 1000. Independently reproduced with the actual health calculator: 1001 adjacent one-minute draft commitments for one employee, location minimum two, and a 00:00–16:41 coverage window produce 1001 uncovered segments. Projection returns one visible card, proof length 1001, and `partial = false`. This is below the 3000-row source and 10000-block read ceilings, but Track/Later/Not relevant always fail with `limit`; the shared error even suggests asking a narrower investigation question. Align projection and persistence limits, safely coalesce equivalent intervals where semantics permit, or expose an honest partial/unreviewable state with a useful source action. Do not truncate resolution proof silently. Cover both accepted and oversized boundaries.

### LOW

None independently actionable beyond the residual concerns below.

## Verification and evidence

- Ran `npx vitest run src/lib/owner-advisor/briefing.test.ts src/components/owner-advisor/attention.test.tsx`: 2 files, 11 tests passed. These tests do not cover the three reproduced cases.
- Ran two read-only `node --import tsx --input-type=module` reproductions against the real exported projection/calculator in this checkout. Observed results are recorded above; no implementation test file was added. Reproduction 1 used Friday/Saturday windows and a single 08:00–18:00 shift, then substituted invalid position requirements A/B. Reproduction 2 used 1001 adjacent minute intervals starting midnight local, with one eligible employee and required staff two.
- Inspected `/tmp/nevora-owner-briefing-all-unit.log`: 9454 passed, 801 skipped; `/tmp/nevora-owner-briefing-all-pg.log`: 30 passed; `/tmp/nevora-owner-briefing-engineering.log`: 110 passed; `/tmp/nevora-owner-briefing-foundation.log`: 281 passed. These are inspected executor artifacts, not independently rerun full suites.
- Inspected typecheck/lint logs and build output. No new error was present in their supplied output; only the focused tests above were rerun by this reviewer.
- `/tmp/nevora-owner-briefing-browser.log` has a completed failure: `src/test/integration/owner-advisor-browser.integration.ts:213`, expected the Not relevant today button to own focus after Tab, received false. One test failed. Cause is not established from the log alone. This is an unresolved acceptance check, not a claimed product defect or passing cross-browser certification.
- Subsequently inspected `/tmp/nevora-owner-briefing-keyboard-probe.log`: the isolated native-button probe reports Tab focusing summary, Alt+Tab focusing Dismiss, and explicit tabindex making Tab focus Dismiss. This supports the parent's WebKit/macOS navigation explanation and a platform-specific test-key correction; the actual application rerun is still required.
- Migration 0037 is listed in canonical order, disposable migrations, and manual upgrade schema parity chain. Scope stays additive.

## Skill-perspective check

Ran the remove-ai-slops and programming review perspectives after loading their actual SKILL.md files under `/Users/josek0514/.codex/plugins/cache/sisyphuslabs/omo/5.1.30/skills/`. Also consulted repository operating-model, CTO, and CISO skills.

No new deletion-only tests, prompt-prose pins, tautological expected outputs, or tests whose sole purpose is mirroring an implementation constant were identified. Source/URL parsing is at the browser/server boundary and is justified. The meaningful tests cover projection behavior, malformed links, private persistence, revision contention, and fresh reads. Their passing results are insufficient for removed-window and changed-subject semantics, as the reproductions demonstrate.

Both perspectives flag the unnecessary breadth of the planning read as a residual concern: the on-open/poll path serializes the entire generation source (including historical publication and operation/event tables) before applying its 3000-row cap and then mapping one week. Unrelated historical growth can disable coverage and unbounded extraction precedes the cap. This is not an additional approval blocker here because capped-source partial behavior is explicitly allowed by the scoped plan, but it should be recorded as a known limitation rather than described as a bounded SQL read. Dense positional construction in `briefing.ts:60` and broad recovery in `briefing.server.ts:31` are maintainability review triggers; the latter intentionally provides partial-source degradation, and subsequent original-authority checks remain in place. No speculative refactor or test deletion is recommended.

## Residual concerns and declined judgments

- Existing guarded transactions re-check original Owner/Company Access before and after writes; no introduced authorization bypass was found. Replay is scoped by Owner/request/hash; write revision comparison is serialized. I did not independently rerun a revocation interleaving against PostgreSQL.
- Review history is count-bounded to 50, while 14-day cleanup runs only during a new disposition write. Inactive Owners' old reviews/receipts can therefore persist beyond 14 days. No strict wall-clock deletion guarantee should be claimed.
- Expired deferrals become visible but follow-through text still says “Deferred until [past timestamp]”; this is a small clarity concern, not a false resolution.
- Position IDs participate in coverage evidence even when labels match; no same-label fingerprint collision was found there. Setup evidence has the separate defect above.
- Removed/inactive locations and unknown attendance subjects have explicit conservative handling. Expired dates are not resolved merely by their expiry.

Declined to judge:
1. Production/hosted readiness, real paid inference, external communications, and independent QA/UI certification; these are outside this engineering review.
2. Final application keyboard acceptance after the proposed platform-specific test-key correction; the inspected isolated native-button probe supports that explanation, but does not replace the application rerun.
3. Strict retention compliance beyond the implemented write-triggered cleanup; no external retention policy was supplied.

## Blockers

1. Fix the false resolution on removal/movement of tracked coverage windows and add a discriminating regression.
2. Invalidate setup suppression when its affected canonical subjects change.
3. Reconcile readable/projected proof sizes with review persistence and truthful partial/error behavior.
4. Rerun the authorized browser acceptance suite after the supported platform-specific keyboard-test correction; do not report application acceptance as green based on the isolated probe or unit results.

Verdict: REQUEST_CHANGES. The strong existing test results and retained authorization controls do not override the reproduced false-resolution defect.
