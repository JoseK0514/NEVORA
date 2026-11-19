# Phase 4/5 follow-ups: handoff (Claude, Nov 17, 2026, 21:30)

## Where the work is

| | Commit | State |
|---|---|---|
| GitHub `claude-codex-collab-nevora` | `d6bfdc77` (Phase 7) | Does **not** have the work below yet |
| Local branch `claude-p45` | `002fcf08` | 7 commits on top of `d6bfdc77`, **not pushed** |
| Local backup | `claude-p45-pre-rebase` (`550c90fb`) | The same work before the rebase onto Phase 7 |
| Development / main | `22107a24` / `46d6dc76` | Unchanged |

Worktree: `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-CLAUDE-CODEX-COLLAB/fae20d8b-48ae-43e1-821b-9f413a9f952c/scratchpad/p45`.
The branch also lives in the main repository (`NEVORA-CLAUDE-CODEX-COLLAB/.git`), so it survives if the scratchpad is cleared.

## The 7 local commits (on top of Phase 7)

1. `794bc587` EM-008: to-do rows stay 72px from 768px (title gets "…", chip on the title line). The shared tap-area probe in
   the browser tests now brings a control into view before measuring (it read 36px only because the page had scrolled).
2. `ed7bdc61` Tracker: EM-008 and EM-014 closed with the decisions.
3. `607ac53e` Mobile access: on Welcome in phone landscape the card covered the wordmark and language pill; the band keeps
   its 56px there. Two browser checks updated to Phase 5's approved sign-in pages.
4. `89b473b4` Decisions: one partly-published sentence on Home and Schedule (published first); activation button "Set up
   account" / "Configurar cuenta"; one "Sign in" on the reset finish; sign-in proof rows on desktop only. The reply-time
   line is unchanged (it matches the Support page and the policy).
5. `c2e423e4`, 6. `b5d926df` Lifecycle browser test follows Phase 6's Clocker PIN form, tablet setup and kiosk.
7. `002fcf08` Tracker: EM-018 closed.

Already on GitHub from earlier today (`21aa6fec` and before): PB-014 wording, non-Owner billing link, deletion browser test
on B2 screens, support email hyphen, Codex's touch-target rule and Home fix from candidate 02, closure test settling.

## Decisions taken (all per DESIGN.MD)

| Item | Decision |
|---|---|
| Language pill | Kept 36px drawn, 48px tap area ("hit area at least 44px at any drawn height") |
| EM-008 | 72px rows wherever the Review pill shares the line (measured 820–1440) |
| EM-014 | Approved range format kept; "9:30 AM – 5:30 PM" breaks before the dash in a day block (needs ~128px, has ~121) |
| EM-018 | "Your Main Office shifts are published. West Office hasn't published this week yet." everywhere |
| Activation button | "Set up account" (repeats the title) |
| Reset finish | One way on: the filled Sign in button |
| Proof rows | Desktop only |
| Reply time | Unchanged: same aim as the Support page and policy |

## Checks on the combined source (Phase 7 + the 7 commits, `002fcf08`)

| Check | Result |
|---|---|
| Typecheck | Clean |
| Mobile access browser | 5/5 |
| Combined UI browser | 5/5 |
| Employee closure browser | Passed |
| Account recovery SQL | 20/20 |
| Unit tests | 15,300 pass; 1 fails: the manuals guard (manuals not yet rebuilt for Phase 7 + these commits) |
| **Account deletion browser** | **24/25: after "‹ Profile", focus does not land back on `#b-profile-account-deletion`** (line 91). Passed before Phase 7. |
| **Lifecycle (step4)** | **Failed at line 192: one `employee_sessions` row remains for EMP-1 where 0 are expected.** Passed before Phase 7. |

Before Phase 7 arrived, every suite above passed (`claude-p45-pre-rebase`).

## Left to do, in order

1. Find out whether the two failures are Phase 7 regressions (likely: focus return after Phase 7's motion, and a session
   that a Phase 7 change keeps or recreates) or timing. Fix in the app if they are real; never relax the checks.
2. Rerun deletion and step4, then rebuild the manuals:
   `node scripts/manuals/build-manuals.mjs --date <date>` and `node scripts/manuals/check-manuals.mjs`.
3. Push `claude-p45` to `claude-codex-collab-nevora` as a fast-forward (check the remote has not moved again first).
4. After Phase 8 (final verification, the other chat) lands, one full final run on the finished branch for Codex.

## How to run the checks on this Mac

```
export NEVORA_TEST_PG_BIN=/Users/josek0514/.codex/native-runtime/nevora-backend-integration-20261108-0w4zx1gf/pg-tools/bin
export NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE=/Users/josek0514/.codex/worktrees/nevora-e2e-collaboration-20261116/tools/ci-browser-runtime/package.json
unset DATABASE_URL
NEVORA_EMPLOYEE_DELETION_EVIDENCE=<dir outside repo> node scripts/payroll-postgres.mjs vitest.employee-mobile-deletion.config.mts
NEVORA_STEP4_EXPECTED_SHA=$(git rev-parse HEAD) NEVORA_STEP4_EVIDENCE=<dir outside repo> node scripts/step4-local-acceptance.mjs
```

The harnesses need a clean, committed tree. Logs from tonight's run: `scratchpad/p45-logs/p7-*.txt`; step4 detail in
`scratchpad/p45-evidence/p7/step4/owned-run.log`.

## Still open (not UI fixes)

- Spanish read-through by a native Puerto Rico speaker; Privacy/Terms translation needs counsel.
- Server work for Codex: password rule (NIST SP 800-63B), emails, reset-code check, payroll 403 after commit, Rondo
  operation budget, picomatch audit blocker on Development.

Release sequence unchanged: integrate and verify on Development; promote the exact verified release to main only after
Jose approves.
