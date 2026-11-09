# 46 DevOps and Release Engineer — release readiness (CI, env, migrations, deploy, monitoring, branches)

**Verdict.** The UI is not what blocks the release. Operations are. Production's database sits at about migration 0002, and the release needs roughly 34 more migrations. Nothing exists to apply them to an existing database, and the rollback plan only covers 0033. On top of that, three candidate branches have drifted apart, CI hasn't been shown green on any of them, and there is no error reporting or alerting once the app is live. Until these are closed, the moved date is a NO-GO for operations, even though the CI design itself is strong.

## Recommendations

1. **Write and rehearse a real upgrade path for production: 0002 → current chain.**
   - *Why:* The handoff on `claude/release-integration` says prod (Neon branch `main`) is at about 0002 and "needs 0003–0034 as one step". `scripts/company-setup.ts:133-157` only installs a fresh, empty database: it refuses an existing schema, and its migration list is hand-ordered. There is no ledger table that records which migrations have run. `origin/development` has 7 duplicated number prefixes (0023, 0024, 0025, 0026, 0027, 0031, 0032), and the order isn't the filename order. Development also adds `0031_native_payroll` and `0032_company_access_invitations`, and the compliance branch adds `0034`. None of these are in the handoff's count. `0019` and `0033` don't wrap themselves in BEGIN/COMMIT. `DEPLOY-RUNBOOK.md` step 4–5 still assumes "chain through 0032, apply 0033", so the runbook is stale.
   - *Fix:* Use one ordered manifest file that setup, tests and prod all read. Add a `schema_migrations` ledger. Write a scripted upgrade that runs in one transaction. Rehearse it on a Neon branch copied from prod, against the frozen SHA.
   - *Note:* No migration past 0002 has reached prod yet. This is the last cheap moment to renumber the duplicates into a clean sequence.
   - *Impact:* High. *Effort:* M. *Owner:* Backend, with Jose authorising the run.

2. **Treat rollback as a database restore and plan it that way.**
   - *Why:* `0008_workspace_positions.sql:21-22` makes `locations.workspace_id` and `clocker_key` required (NOT NULL). `0023` and `0025` add more required columns. After migrating, the currently deployed app is not safe on the new schema, so "redeploy the previous SHA" does not roll back cleanly.
   - The runbook's rollback section (DEPLOY-RUNBOOK.md, "Rollback, including 0033") only covers 0033.
   - *Fix:* Take a Neon restore branch right before the run and rehearse restoring it. Write down the data-loss window (writes made after the release) and who decides. Agree a go/no-go time limit for rolling back.
   - *Impact:* High. *Effort:* S–M. *Owner:* Backend + Jose.

3. **Freeze one release candidate.**
   - *Why:* The candidate lines have drifted:
     - `origin/development` has 157 commits that `claude/clean-manager` lacks. It is also missing the 7 confirmation-round UI fixes (a141b351…ac895632) plus 898e99d4, 054aa3d4 and 30058003, all of which are on `claude/release-integration`.
     - `origin/codex/release-candidate` has 12 commits found nowhere else and is 242 behind development.
     - `claude/nevora-compliance` (with 0034) has one known conflict, in `auth-refinement.css`.
     - `origin/main` is at 7ffd013e from 2026-09-30, about 1,100 commits behind.
   - *Fix:*
     - Merge the 10 release-integration commits that development lacks into development.
     - Merge compliance only when Jose says go.
     - Cut `release/<date>` from development. CI already triggers on `release/**`.
     - Freeze that SHA. Any later change becomes a new candidate.
   - *Impact:* High. *Effort:* S. *Owner:* Backend (integration) + Jose (go).

4. **Get exact-SHA CI green on the frozen candidate before go.**
   - *Why:*
     - `ci.yml:4-7` push triggers don't include `claude/**`, and `codex/**` only partly. The clean-manager and release-integration heads have no CI run of their own.
     - The development handoff (`docs/handoffs/2026-10-20-new-ui-to-development.md`) records CI run 39409730347 failing at d5e6e6f3 (SCRUM-77..80). The new head "still needs its own CI results".
     - Handoff §3 says `scripts/phase-d-browser-qa.mjs` (past line 105) and the Phase E Manager checks still look for the old markup.
     - Scripts still click a "Sign In" button that is now "Sign in" (`scripts/company-setup-qa.mjs:139,155,160`).
     - The `phase-e-evidence` job fails if any job was skipped or failed, so these block correctly.
   - *Fix:* Update the selectors. Don't weaken the checks.
   - *Impact:* High. *Effort:* M. *Owner:* Backend (CI) + UI (selector updates for the new markup).

5. **Wire the Postgres integration suites for this release's features into CI.**
   - *Why:* These suites exist but no CI job, or script called by CI, runs them:
     - `vitest.management-profile-integration` (0033 alert preferences)
     - `native-payroll`, `company-access` and `company-setup` (on development)
     - `configurable-payroll` (only via `payroll-postgres.mjs`, which isn't in CI)
     - `clocker-punch`, `clocker-breaks`, `clocker-c6`
     - `premium-release-integration`, `premium-submissions`, `six-findings`
   - `npm run test:dev:production`, the check that development markers are absent from the build, isn't in CI either.
   - Plain `npm test` skips 27 files and 801 tests that need a database.
   - *Impact:* High. *Effort:* M. *Owner:* Backend.

6. **Add production error reporting and alerting.**
   - *Why:*
     - There is no `src/instrumentation.ts` (`onRequestError`), and no error-reporting or APM package in `package.json`.
     - `console.error` or `console.warn` appears zero times in `src/app` and `src/lib` outside tests.
     - The error boundaries (`src/app/app/error.tsx`, `global-error.tsx`) ignore `error.digest`, so a user can't give support a reference.
     - The runbook's "First hour" depends on someone watching the Vercel and Neon dashboards by hand. No alert is defined.
   - *Fix:*
     - Add `onRequestError` with a log drain that strips personal data.
     - Show the digest on the error screen as "Reference …".
     - Set alerts on the 5xx rate and on the Neon errors 57014 (statement timeout), 53300 (too many connections) and 55P03 (lock timeout).
   - *Impact:* High. *Effort:* M. *Owner:* Backend (instrumentation, alerts), UI (digest line).

7. **Complete the environment inventory (names only).**
   - *Why:* `.env.example` documents 36 names. Production-relevant names used in code but not documented:
     - `NEVORA_APP_DATABASE_URL` and `NEVORA_WORKER_DATABASE_URL` (`src/lib/db.ts:12`, reached through `/api/workspaces/[locator]/session`). That code path depends on the deferred tenancy migrations 0026 and 0027, which are excluded from setup.
     - `NEVORA_PAYROLL_ENABLED` (`src/lib/payroll/service.ts:811`, `store.ts:17`)
     - `NEVORA_UI_PREVIEW_ENABLED` (`src/app/ui-preview/{home,kit}/page.tsx`). It is checked at runtime, not removed from the build, and the absence scan doesn't cover it. If someone sets it in prod, the fictional preview pages are served.
   - *Fix:* Add these to `.env.example` and to the runbook's environment table, each with its required production value or "must be absent".
   - *Impact:* Medium. *Effort:* S. *Owner:* Backend.

8. **Record the live deploy state and pick the deploy and worker host before the freeze.**
   - *Why:*
     - `vercel.json` sets `git.deploymentEnabled:false`, but `origin/main` has no `vercel.json` at all (it was added on 2026-10-08 on the development line). Pushes to main may still trigger Git deploys today.
     - After the merge, deploys become manual. The runbook says this Mac has no Vercel CLI or credentials, and the live project, domains and deployed SHA are unverified.
     - Prod is at about 0002 while `main` already contains 0003 and 0004, so which SHA is live right now is unknown.
     - The workers (`notifications:worker`, `payroll:worker`) are `tsx` scripts. No cron or host is defined (no `crons` in `vercel.json`).
   - *Impact:* High. *Effort:* S. *Owner:* Jose + Backend.

9. **Merge the release gates into one go/no-go sheet for the new date.**
   - *Why:* The gates are spread across several places:
     - `docs/execution/final-release-checklist.md` has 24 open items and 0 closed (FR-AUTH-001 Codex independent review, last edited 2026-10-05).
     - The runbook is stale (rec 1).
     - Other open items: a production build of the merged candidate, Codex review of d462f54, Jose's real-device VoiceOver/TalkBack pass, the scheduling-rules legal wording, and the Schedule load decision (p95 10.6 s at 200 people with 20 concurrent requests, per handoff §2.3).
   - *Fix:* Make one sheet with an owner, status and evidence link for each gate, keyed to the frozen SHA.
   - *Impact:* Medium. *Effort:* S. *Owner:* Product (Jose), with Backend filling in the evidence.

10. **Pin evidence to a SHA, then clear branch and worktree sprawl after release.**
    - *Why:*
      - There are 98 branches and 44 worktrees (one marked prunable), and 23 local branches aren't merged into development.
      - `claude/preview-integration` is 130 commits behind clean-manager. The QA preview ran from a detached scratch worktree (`qa-clean` at e21a3da3), so which build was tested is unclear.
      - The repo pack is 277 MB, with 331 tracked PNGs, including a root-level `ChatGPT Image Sep 28….png`.
    - *Fix:* Tag every tested SHA. Archive or prune the branches after release.
    - *Impact:* Low. *Effort:* S. *Owner:* UI + Backend.

## What's good
- CI hygiene is above average:
  - Actions are pinned by commit SHA, with `permissions: contents: read` and `persist-credentials: false`.
  - Node 24.19.0 is pinned.
  - `npm ci` is used, and audit gates run on both production and dev dependencies.
  - Every build has a source-custody receipt (`scripts/release-build.mjs`).
  - The aggregate `phase-e-evidence` job rejects runs where a job was skipped or failed.
- Risky features have environment kill switches: `PUSH_FEATURE_ENABLED`/`PUSH_DELIVERY_ENABLED`, `NEVORA_CLOCKER_PUNCH_ENABLED` and `NEVORA_PAYROLL_ENABLED`. A dev-marker absence test also runs on the production build.
- `DEPLOY-RUNBOOK.md` is unusually thorough: lock and statement timeouts, exact reversal SQL for 0033, and specific first-hour signals and Postgres error codes to watch. It mainly needs updating for the real 0002 starting point.

## Not checked / limits
- I could not see GitHub branch protection, which CI checks are required, or any CI run results. The only CI run cited (a failure) comes from a handoff doc.
- I could not see the Vercel project, its environment variables, domains or the live SHA, or Neon's schema, backups or PITR retention. The "prod at 0002" fact comes from the Wave C handoff note, not from my own check.
- I ran no builds, tests or migrations. The browser was not used. I printed no secret values; for `.env.example` I extracted names only.
- I did not judge whether the Schedule p95 is acceptable. That belongs to the performance reviewers.
