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
- One focused rerun of those three files is complete: **122 passed / 4 timed out**. Employee Home passes 2/2. The planner repeats its unchanged 300-second timeout (398,713ms complete test), and typed-backfill passes 65/68 with three 5-second timeouts, including different cases from the full run. No owned browser preview or build ran alongside it. Existing limits/assertions were unchanged; this is still a failed gate. Raw retry JSON, log and errors are preserved. Planner source and its test match the coordinator/backend blobs; that comparison does not prove a merge regression or waive the timing failure.
- No browser checks were run on this frozen snapshot. Another active publishing task has broader browser evidence on its separate `98b037b` integration; a [secondary artifact review](../merge-3-coordinator-backend/secondary-review/README.md) explicitly names that different SHA. Its 256 checker cells and 60 rendered samples are not transferred to `bf6c030`. Publication and fresh gates remain with that task.

## Boundaries and pending work

No deployment, production change, tunnel or notification delivery. Device access remains the proposal in STATUS.md, awaiting Jose's explicit approval. Profile's initial read waits for its verified merge, and dead Settings CSS waits for Wave C plus the class-use search. Lint cleanup is already separate commit `9df0f47` in the candidate ancestry. Profile `ea58610` now has a verified Mac zero exit ([source reports](../readiness/profile-ea58610/README.md)); the other five still await verified complete zero exits. A partial round or a requested exit is not zero. The final every-page/five-area sweep, build, full suite and production-erasure gate remain separate.
