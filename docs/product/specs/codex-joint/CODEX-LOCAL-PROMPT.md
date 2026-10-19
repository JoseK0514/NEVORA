# Codex, on Jose's Mac: unblock the swap flow and steady the previews

You're Codex, working on NEVORA (Next 16 / React 19, Postgres) on Jose's Mac. The repository is `/Users/josek0514/Desktop/NEVORA-UI-READINESS`.

**What's going on:**
- You own the backend: server routes and actions, SQL, `src/lib/data/*`, auth, payroll, notifications and email, and the local database tooling.
- Claude owns the UI. Six Claude chats are rebuilding every screen right now, each in its own git worktree under `.claude/worktrees/` with its own local preview and database.
- Your job is to remove two blockers that are slowing them down today. Stay out of their way.

## Rules (all of them apply)

**Where you work:**
- Work in a new worktree on a new branch, `codex/local-unblock`, cut from `claude/premium-phase-1`: `git worktree add .claude/worktrees/codex-local -b codex/local-unblock claude/premium-phase-1`.
- Commit locally only. No push, no merge, no deploy.

**What you must not touch:**
- **Running previews and other chats' files.** Don't stop, restart or write to any running preview, and don't edit files in other worktrees. The six chats' previews are frozen during their inspection rounds.
- **Files the running previews load.** Don't edit `/Users/josek0514/Desktop/NEVORA-UI-READINESS/src/test/integration/*` in the main checkout, or anything under `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/parallel/`. The running previews import those files. Make your changes in your own worktree and describe what should be applied there and when.
- **UI files:** `src/components/**`, page JSX in `src/app/app/**`, and any `.css`.
- **`seed-extra.mts`.** The Claude coordinator owns it. Give it the exact rows to add instead.

**Data and secrets:**
- Fictional local data only. Nothing leaves the machine.
- Never print or commit a password. Each preview's password is in `<PREVIEW_OUT>/evidence-*/access.json`. Read it from the file only.

**Resources:**
- The Mac is heavily loaded (load average around 28). Run one browser at a time, and only one preview of your own.

## Your own preview, for reproducing problems

Start it from the main checkout and keep it in the background. It prints `PREVIEW_READY <url>` after a few minutes.

```
cd /Users/josek0514/Desktop/NEVORA-UI-READINESS
PREVIEW_OUT=/tmp/codex-preview node --import tsx .claude/parallel/preview/preview-runtime.mjs
```

Then add the extra test data and sign the accounts in:

```
PREVIEW_OUT=/tmp/codex-preview node --import tsx .claude/parallel/scripts/seed-extra.mts
PREVIEW_OUT=/tmp/codex-preview node .claude/parallel/scripts/login.mjs AUDIT-E AUDIT-SWAP AUDIT-M QAOWNER
```

**Accounts:**
- `AUDIT-E`: employee.
- `AUDIT-SWAP`: works only next Saturday and Sunday.
- `AUDIT-M`: manager.
- `QAOWNER`: owner.

**Database access:**
- The database name is in `<PREVIEW_OUT>/evidence-*/owned-next-*/ownership.json` (`identity.name`).
- The cluster is `/private/tmp/nevora-ui-preview-<first 10 hex characters of the name's 12-character suffix>`. Its port is line 4 of `data/postmaster.pid`.
- Connect as user `nevora_audit` with no password.
- The app was copied from the clean source in `.claude/parallel/preview/src` (commit 8c4dd50). To run your branch's code, `rsync` your worktree's `src/` into `<PREVIEW_OUT>/evidence-*/owned-next-*/app/src/`, excluding `lib/db.ts`. `.claude/parallel/scripts/sync.sh <worktree> <PREVIEW_OUT>` does exactly that.

## Task 1: the swap blocker (do this first)

**The symptom:** signed in as `AUDIT-E`, `/app/exchange/swap?sourceShiftId=audit-next-0-1` (AUDIT-E's shift next Monday) says "No shifts to swap". No swap target is ever offered to any fictional employee, so the inspectors can't test the choose, compare and send steps.

**What's known:**
- `listSwapTargets()` in `src/lib/data/exchanges.ts` returns candidates. Other employees' published shifts in the same week include `AUDIT-SWAP`'s Saturday and Sunday shifts, `x-swap-5` and `x-swap-6`.
- The page (`src/app/app/exchange/swap/page.tsx`, around lines 46–57) then drops every candidate. Either `readShiftChangeTerms()` doesn't match, or `readShiftChangeAvailability(proof, {kind:'PROPOSE_SWAP', …})` in `src/lib/data/shift-changes.ts` returns `allowed:false`.
- The workspace policy is `{"swap":{"mode":"AUTOMATIC_WHEN_VALID","submissionAdvanceMinutes":0,"completionAdvanceMinutes":0}}`, so the deadline isn't the cause.
- The seeded shifts are plain SQL inserts with `assignment_origin='MANAGER'`. `assignment_episode_id` is set by default, and `terms_revision` is 1 or 2. The weeks are published with `publishScheduleWithRevision()`.

**What to do:**
1. Find the exact refusal: the issue codes from the evaluation, or which terms check fails.
2. **If it's missing test data** (for example availability windows, weekly hour settings, eligibility, or a revision snapshot that doesn't include the new shifts), write the exact SQL rows, or the exact helper calls from `src/test/integration/*`, that `seed-extra.mts` should run so at least one valid swap pair exists for `AUDIT-E` next week. Prove it on your preview: the swap page lists at least one target.
3. **If it's a server bug,** fix it on your branch, add tests, and explain it.

**Done when:** the reason, the proof and the exact data or code fix are in your report.

## Task 2: previews failing under load

**The symptom:** with several previews and many browsers running, the dev server sometimes answers reads with HTTP 500. The errors are statement timeouts, or "Workspace configuration is unavailable". This happened on `/app/schedule` and on `/api/manager/attendance`. When the Mac is quieter, the same pages load fine.

**What to do:**
1. Reproduce it on your own preview only: drive concurrent load, for example 8–12 parallel page loads of `/app/schedule` as `AUDIT-E`.
2. Find the cause in the local transport and configuration reads: `src/test/integration/owned-pg-transport.ts`, `src/test/integration/local-postgres.ts`, `.claude/parallel/preview/owned-preview-app-dev.ts`, and the workspace configuration read in `src/lib/**`. Look at pool size, statement timeout, and connection reuse per request.
3. Propose the smallest change that makes local previews hold up under parallel testing, without changing production behaviour. Put it on your branch, or as an exact patch for the files the previews load.

**Done when:** the reproduction, the cause and the change are in your report. Also say when a change to a file the previews load can be applied safely, for example at each chat's next round break.

## Task 3: snapshot and restore. Deferred by Jose (Oct 19); don't do it today

Kept for later joint testing. The description below is for reference only.

Write a script, on your branch under `scripts/` or as a proposed file for `.claude/parallel/scripts/`. It snapshots a preview's database right after seeding and restores it on demand, keyed by `PREVIEW_OUT`. With it, each real submission test (Save, Approve, Decline, Publish, Submit, Delete, Copy week) can run end to end on fictional data and then be reset.

Prove the database belongs to that preview before touching it, exactly as `seed-extra.mts` does: `ownership.json` root under `PREVIEW_OUT`, the database name pattern, and the cluster's `owner` marker matching. A reset once hit the wrong database, so this guard is required. Test it only on your own preview.

## Not yours (don't duplicate)

- **Built, production-mode previews:** Claude is doing these.
- **The cloud Codex's items:** the error switch, email and push capture, the Owner and Manager Profile data, and the test runs.

## Report

Write `docs/product/specs/codex-joint/LOCAL.md` in the main checkout. For each task: what you found, the files changed (branch and commit), the tests run with their results, and exactly what the Claude coordinator should change in `seed-extra.mts` or the preview tooling. Then tell Jose it's ready.
