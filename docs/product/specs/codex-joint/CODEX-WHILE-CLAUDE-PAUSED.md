# Codex: carry the release for about 90 minutes while Claude is paused

October 19, 2026, about 4:30 PM. Claude's usage limit resets in about 1.5 hours, and the Claude chats may pause until then. Keep going with everything below. **Same bar, same rules as before** (`INSPECTION-BRIEF.md`, `CODEX-ROLLING-MERGE-PROMPT.md`). Run tasks in parallel, one preview and one worker per branch.

## 1. Publish the candidate (first)

1. Sync the coordinator: `claude/premium-phase-1` at its latest. It is at 676358c or newer, and supersedes 5f6ed19 and 4d469a4.
2. Integrate backend `da2a4e5`, with the approved Profile alert wording.
3. Merge Profile `ea58610`, which is verified zero. Then make the authorized `readManagementProfile` initial-read commit in `manager-profile.tsx`.
4. Gates: typecheck, lint, the full tests, and checks.
   - Rerun load timeouts (planner 300s, backfill 5s) alone with one worker before counting them.
   - Push `codex/release-candidate`.
5. Post the candidate SHA and gate results in `STATUS.md`.

## 2. Run every pending exit round, in parallel

| Chat | Branch at | Note |
|---|---|---|
| Phase 3 | `claude/premium-phase-1` 676358c | Exit round 5. `docs/product/specs/premium-phase-3/ROUND.md` lists what to re-check. |
| Wave A | `7f75dc4` | Exit round |
| Wave B | `564d193` / `9bd265e` | Exit round 4. Its ROUND.md names the commit. |
| Wave C | `5f7c166` | Exit round 4. Finish your sweep. |
| Desktop | `8012d97` | Exit round 5. Its ROUND.md names the commit. |

Each chat may also be running the same round on the Mac. Whichever reports zero first counts: a chat's ROUND.md with `status: zero` is enough to merge.

## 3. Merge each chat that reaches zero

Merge each one into the candidate, run the gates and the combined check, and push. This is the same as `CODEX-ROLLING-MERGE-PROMPT.md`.

## 4. Fix small UI findings yourself, on the candidate only

**Only if Jose has said yes to this item.** While the Claude chats are paused, a P1 or P2 your inspection finds would otherwise wait 90 minutes. You may fix it **on `codex/release-candidate` only**, under these rules:
- Fix only findings named in an inspection report. Make the smallest change that meets the brief (the kit roles, `keepWhole`, the 15px floor, 44px targets, the wording rules).
- One commit per finding, titled with the finding ID. Rerun the affected checks.
- Never touch `claude/*` branches.
- List every such commit in `STATUS.md` under "Candidate-only UI fixes for Claude to review". Claude reviews each one when it's back, and the owning chat ports it or replaces it.
- Don't redesign anything. Don't change payroll or legal wording. Don't change server behaviour beyond your own backend scope.

## 5. Combined check of the merged candidate

As chats merge, run the combined five-area check on the candidate. Look especially for differences between chats: two versions of a control, spacing that changes between pages, different words for the same thing. File the findings under `release/merge-<n>-<chat>/`, naming the owner.

## 6. Device access: prepare it, don't start it

Keep the proposal ready in `STATUS.md`. **Nothing is exposed until Jose approves in chat.**

## When Claude is back

At the top of `STATUS.md`, write a short "Claude, start here" list:
- what merged
- what's at zero
- what's open, by owner
- any candidate-only UI fixes to review
