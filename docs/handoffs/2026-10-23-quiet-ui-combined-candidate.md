# Quiet v4 combined development candidate

Status: assembled locally; not pushed, opened as a PR, merged, or deployed. Full matching cloud acceptance is pending. Jose requires Claude's visual style to remain intact and additional application changes to be presented first.

## Inputs and preservation

- Development base: `8d4a3792aceb9cd56e7e33ce318f4d5e9a74f9bb`.
- Claude UI and four review repairs: `3103829366dbf27b21c0860a7ef13fc458648563`, descended from `34a974d87c5842934bc06721381c7f9a5299c4dd`.
- PR29 supervision/diagnostics/dependency repair: `2ea580d623c76dd7d717492d209552461b5b4a28`.
- Already implemented, locally reviewed retirement correction: RED `7127ab2a569817f792704ad3b407042a20871ad5`, GREEN `3a90919b3de7d40adb82ede2884fedd6dd3196bf`. Its three files were included by merge, preserving their original commits.
- Local branch: `codex/quiet-ui-development-20261023`, in the attached verify-preview-33 worktree. The intended publication uses the inactive owned `codex/premium-backend` remote by normal fast-forward to preserve six active branches. Its old `2d425b4b19ad86e9b19e23498e92269e871f2a1f` ancestry is retained by an explicit history-only merge; its 2,042 unique historical documentation paths are not overlaid onto current development. Original historical files remain recoverable from that ancestor.
- The held draft spending-controls PR27 is excluded. Claude's branch and PR29's branch are preserved.

All input merges were clean. Comparing `src/app`, `src/components`, `src/lib`, `public` and DESIGN.MD against310 shows only one Codex test change: removal of the blanket lifecycle-effect catch in `timecards.batch.test.tsx`. Application implementation, styling, assets and legal policy facts are unchanged from Claude's310.

## Review and local evidence

The source review finds the full shift records restored, phone bulk controls restored, and canonical support response/address restored. The new device tests exercise handlers through a modeled hook/ref/effect host. They are useful unit coverage but do not independently prove real browser focus or every device operation. Claude's Chromium screenshots at390/1440 and explicit gaps remain in `docs/product/specs/owner-v4-quiet/codex-review-1/README.md`; no WebKit/full-suite acceptance is inferred.

One new test helper at310 silently caught every effect exception. Codex removed the catch, retaining the same effects and assertions. All focused tests still pass; unexpected lifecycle exceptions now fail the tests. No production change was needed. Open-cover deep links still start collapsed; the shift facts are reachable manually. This is retained for follow-up rather than changing Claude's UI without discussion.

Actual command, after fresh `npm ci --ignore-scripts --no-audit --no-fund` (431 packages, pinned Vitest5.0.5, Node24.19.0):

```
npx vitest run src/components/timecards.batch.test.tsx src/components/manager-workflows.test.tsx src/components/clocker-device-manager.test.tsx src/app/legal-pages.test.tsx src/test/phase-e-retirement.test.ts src/test/phase-e-root-exit.test.ts src/test/phase-e-root-group-process.test.ts src/test/phase-e-process.test.ts src/test/phase-e-runner.test.ts --maxWorkers=1 --reporter=dot
```

Result: nine files,224 tests passed, zero failed, duration56.07s. This includes the130 process tests and Claude's focused UI regressions. The existing legal-page Link mock emitted a React warning about `prefetch=false`; the command passed, but this is not represented as a warning-free run. No full local unit/build/browser matrix was run. Claude's9,502-pass full-suite report remains his reported evidence, not Codex's execution.

`npm run check:development-sources` initially reported the advanced Claude head and missing assembly input. After reconciling the actual source heads and intended existing assembly remote, it passes:56 classified sources, six active branches, exact archives, included-source ancestry and current development verified. `git diff --check` passes.

Code review artifacts in `.omo/evidence/`:
- `owner-v4-quiet-31038293-code-review.md`: source closure of original H1/M1/M2; test-harness issue and coverage limitations recorded.
- `retirement-3a90919b-and-test-closure-code-review.md`: APPROVE for the bounded retirement correction and blanket-catch removal, no blockers in that scope. Not cloud/release acceptance.

Independent original retirement runtime evidence remains external at `/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/qa/retirement-3a90919b-independent/`:130 passing native/control tests, zero failures/skips, exact source custody, with explicit Darwin/Linux-model limitations. Existing live ownership, observer-error, stderr, identity, ancestry, registration and cleanup controls remain mandatory. Historical cloud timing is not proved by this mechanism reproduction.

## Remaining CI and proposed additional application behavior

PR29's workflow40035586510 is failed. SQL supervision, WebKit Reports navigation, and Attention fixture setup are distinct primary failures; aggregate/evidence failures are downstream. Older successful jobs do not certify the combined source.

1. SQL supervision: bounded root/member retirement correction3a is included and its focused controls pass locally. Fresh native Linux SQL and mandatory cloud acceptance remain required.
2. Reports: an independent actual Next/WebKit control reproduced a destination being superseded by source access recovery. Equal destination latency without recovery passed. Prototype `c62a68c763edbaf3300e9e9720a62da98af09dac` coordinates native Next Link navigation with protected recovery: private source content still retires immediately, but the source's router refresh/replace waits for navigation settlement. The prototype's separate bounded WebKit control passes both equal-delay and recovery arms under the original15-second helper deadline, with zero source requests while held and source private content retired before destination release in the recovery arm. This does not establish the original cloud timing or combined-source readiness.
   - Proposed application paths: `src/components/app-shell.tsx`, `src/components/company-access/scoped-read-frame.tsx`, new `src/components/app-navigation.tsx`, `src/components/navigation-link.tsx`, and `src/lib/navigation-coordinator.ts`, plus regression tests/harness. No CSS, palette, typography, icons or layout change is proposed.
   - The prototype is NOT included. Jose's answer to the additional-behavior question is pending. Do not merge/edit this application behavior while that approval is pending. It also needs review against310, preserved privacy/lifecycle negative controls and actual combined-source testing before publication.
3. Attention: failure occurred during post-start owned fixture seeding, before any browser cell/launch. Exact query and wait cause are unknown. Preserve the5s SQL timeout and all failures; next diagnostic must identify the operation safely, without query values, credentials, raw SQL activity text or error suppression. This is not an unclassified WebKit runtime error and not a proven recurrence of historical QA-AT01. Do not claim fixed from an unrelated passing run.

## Next gates

Await Jose's additional Reports behavior decision while completing independent CI diagnostic/review work. Coordinate a stable combined candidate before opening one development PR, avoiding a second UI-only full run. Freeze exact source; then run all12 required cloud jobs, including types/lint/full units/production build/audits, the SQL jobs, Attendance/remediation/D2/Clocker browser, all70 Phase E cells, and both evidence gates. New failures remain fatal and must be diagnosed; one planned full run is not a guarantee that no evidence-backed rerun will be needed.

After successful reviewed PR gates, integrate only into development and verify its actual push gates before promoting a fresh isolated DEV Preview. Keep the NEVORA public alias and verify the new deployment's own URL/workspace before promotion. Current accepted rollback is `dpl_3i9LDQMt67MNd5n9hLqZRUVfUt6f`; recheck actual alias state first. No production, hosted database/migration writes, real delivery or paid inference actions are authorized here. The separate default-off advisor0036/0037 hosted migration/activation remains outside this candidate's incidental deployment actions.
