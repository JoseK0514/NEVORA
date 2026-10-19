# Backend integration — independent verification snapshot

Local snapshot **`bf6c030e79c10bd4e115f15dadc80b59bc194ba2`**, Git tree **`4553beec8ab73db129d9d3d1c74d99636148ddcc`**, at `/workspace/nevora-rc-backend`. Parents: coordinator refresh `25dca8d` and backend `c6a5954`. It retains the already-published Wave A `c05e0c7` and lint-only `9df0f47`. No newer Wave A UI commit was admitted without zero exit evidence.

This is a local verification snapshot; another authorized release task owns publication of its integration (`98b037b` at its last report). The current public head will be compared when it lands. Do not substitute this snapshot's results for a different source tree or imply a published/zero candidate.

## Source-owner resolutions

- Wave A `7679133` ROUND.md explicitly resolves the Coverage test conflict in favor of Wave A. That file is byte-identical to the existing candidate test (blob `18e3861`), so the choice preserves current assertions. The new Wave A app changes remain excluded.
- Root layout is exactly the coordinator's code below the comment block in `8c4264c`'s RESOLVED-src-app-layout.tsx.txt. Both supplied prescriptions are retained under `source-prescriptions/`.
- The premium stylesheet equals the coordinator version at merge time (`8c4264c`, blob `ecf0761`); later coordinator changes are not silently injected into a frozen test run.

## Validation so far

- Locked install: pass, 410 packages.
- TypeScript: pass.
- Full lint: pass, 0 errors and 0 warnings.
- Full default Vitest, one worker: **7,332 passed / 4 failed / 801 skipped / 55 pending** (8,192 total). All four failures are timeouts: Employee Home's former-authority reply case; the 20-location planner; and two typed-backfill cases. All 12 process-cleanup cases pass. Full raw JSON and each error are preserved in evidence/.
- Correction to the earlier planning checkpoint: 184,537ms measured the first planning call. The test also repeats the plan for determinism; the complete test exceeded its unchanged 300,000ms limit. The console measurement did not establish a passed test. No green gate is inferred from it.
- The three affected files are being rerun once, with one worker and the existing limits. No browser preview or build is running alongside this retry.
- Browser checks follow the full run to avoid CPU interference. Availability plus Home/Inbox/More for all roles and backend reads remain required here; old diagnostic results are not silently transferred.

## Boundaries and pending work

No deployment, production change, tunnel or notification delivery. Device access remains the proposal in STATUS.md, awaiting Jose's explicit approval. Profile's initial read waits for its verified merge, and dead Settings CSS waits for Wave C plus the class-use search. Lint cleanup is already separate commit `9df0f47` in the candidate ancestry. All six chats still await complete verified zero exits; a partial round or a requested exit is not zero. The final every-page/five-area sweep, build, full suite and production-erasure gate remain separate.
