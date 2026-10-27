# Mobile access submission for Claude inspection

Jose redirected this work to `claude-codex-collab-nevora` for Claude to inspect first. Stop the earlier PR36-to-development merge plan. Do not launch CI, GitHub Actions, deployment, migrations, production changes or a development merge for this submission. This is a review delivery, not release acceptance.

## Source and scope

- Existing collaboration base: `0ac95b51f5bec307733ab78594b851229ca4a5d5`. Its Clocker work is preserved.
- Submitted candidate: `2f6103b10b86848bac59d0a7481e4cbd70265020`, branch `codex/light-default-20261027`, [PR36](https://github.com/JoseK0514/NEVORA/pull/36). PR36 remains draft and unmerged.
- The frozen mobile access/onboarding implementation from PR35 is already in development and in the collaboration ancestry. See `2026-10-26-mobile-access-onboarding-integration.md` for its application handoff.
- The application change in PR36 makes Light the default before paint and during hydration. Explicit Light, Dark and System preferences still work. See `src/lib/theme.ts`, `src/components/theme-switch.tsx`, their regression tests and `2026-10-27-light-default.md`.
- Later PR36 commits add browser-driver ordering controls, disposable PostgreSQL connection/teardown fixes, PIN-test synchronization, complete SQL group receipts and source-inventory records. They do not alter application authentication, permissions, frozen screen markup, database migrations or deployment configuration.

## Existing evidence and its limits

Before this submission, the protected Preview at `https://fuel-scheduler-rfwif57au-josekarlo-5933s-projects.vercel.app/welcome` passed 19 appearance checks across Chromium, WebKit and Firefox at application source `32ce3b5c69234cd0d1bb5bb8f0f8f1eda8ee7ffd`. PR36 application files still match that candidate. All 33 frozen mobile runtime hashes were preserved. The latest prior full run at `8faa749c` passed the other ten jobs, including 192 Phase E SQL cases, but the serial Clocker job exceeded its 30-minute limit; dependent evidence correctly failed.

Local candidate `2f6103b1` completed all four isolated Clocker SQL groups: 129, 120, 142 and 133 cases; 524 total across 35 files. Every leaf reports success, a clean unchanged source and owned-cluster teardown. The aggregate was not executed before Jose stopped further CI work. Also completed before this direction: 168 release-engineering checks, 31 targeted workflow cases, TypeScript and targeted lint. The other 59 workflow cases were intentionally unselected in the targeted local run; no complete local supervisor-unit pass is claimed. These results belong to their original sources, not the combined collaboration tree.

Raw local evidence is in `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/integration-evidence`, notably `pr36-balanced-local-results.json`, `pr36-local-clocker-balanced/`, `pr36-balanced-release-engineering.log` and `pr36-balanced-workflow-unit.log`. Older failures and fixes remain recorded in `2026-10-27-pr36-merge-readiness.md`; its merge plan is superseded by this inspection-first direction.

## Combined-source items for Claude

1. GitHub rejected workflow candidate `2f6103b1` before starting jobs in run `40538135914`: `runner.temp` was used at job-level `env`, where that context is unavailable. Actionlint 1.7.12 reproduced the exact error. This submission moves that one evidence path to the execution step's `env` and adjusts its contract assertion. This correction has not been tested or run in Actions.
2. Collaboration has seven additional Clocker SQL files, so its current complete set is 42 files while the incoming balanced allocation contains 35. The strict allocation gate will fail closed until the seven added files are deliberately allocated and the complete combined suite is verified. Do not omit files, skip tests or widen deadlines to pass. No combined-source SQL acceptance is claimed.
3. The runner conflict was resolved by retaining both the existing `--ipad-ui` route and incoming SQL-group support. The source inventory keeps the collaboration branch as assembly and marks the exact submitted PR36 head as included for inspection; held PR27/33/34 remain excluded. Review these merge resolutions.
4. Inspect the welcome/sign-in, invitation, recovery, sole-Owner assistance, bilingual Help and onboarding flow against the frozen design. Preserve authentication and server authorization. Keep the default bright appearance and deliberate explicit theme choice.

Owner of the next step: Claude inspection. Record findings and proposed corrections first; obtain Jose's later direction before resuming CI, development integration or deployment. Production and `main` are untouched by this delivery. The combined tree has not been tested, deployed or independently certified.
