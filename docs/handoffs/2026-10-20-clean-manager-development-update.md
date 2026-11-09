# Latest clean Manager UI: development candidate

Jose requested moving the new UI to development. This candidate updates the earlier development UI integration; it does not authorize production promotion.

## Source and scope

- Development base: `d4b01453f7fabaa7ac739d049934527b6b366310`.
- Verified UI/QA source: `c3fcc75fa8e8e2a9e8389d8684f2329d2d10b3c1`, the head of draft PR #13.
- Integration branch: `codex/clean-ui-development-20261020`.
- Worktree: `/Users/josek0514/.codex/worktrees/verify-preview-33/Fuel Scheduler`. The earlier source branch and its evidence remain preserved.

The candidate brings the confirmation-round UI fixes, keyboard/focus and overflow improvements, approved-absence roster projection, availability-deadline section and return destination, rewritten browser contracts, runtime diagnostics, dependency patch and migration runbook into the current development backend.

Four merge conflicts were resolved deliberately:

- Package scripts retain development's native payroll worker startup and add the contrast regression checks.
- Schedule tests retain the current Company Access and Manager-only read assertions and add the approved-absence fixture.
- Scheduling rules read workspace, week and deadline inside `withOperationalCompany`, return those values with the scoped snapshot, and retain `ScopedReadFrame` retirement.
- Scheduling rules tests retain both branches' coverage and add a denial case proving workspace/deadline reads do not execute without current authority.

Existing development payroll wording is retained. The incoming desktop payroll label change is excluded because payroll wording needs Jose's separate approval. No application API route, Company Access implementation, payroll service or migration is changed relative to the development base. Separate compliance migration `0034` is not integrated.

## Verification

Evidence directory: `/Users/josek0514/.codex/visualizations/2026/10/20/01a15962-cdee-7dd0-8a92-023551b076fb/clean-manager-development-update`.

- Locked dependency installation with lifecycle scripts disabled: passed; zero audit findings.
- Typecheck and repository lint: passed.
- Release engineering regressions: 66 passed, zero failed.
- Production build and development-marker exclusion: passed; 2,547 artifacts scanned.
- Production and full dependency audits at the existing severity thresholds: passed; zero findings.
- Full unit suite: passed; 514 files and 9,095 tests passed, zero failed. The existing 27 files / 801 prerequisite skips and 55 pending assertions remain outside acceptance evidence.
- Hosted CI and browser acceptance: pending on this integration's own SHA. Historical results on PR #13 are not acceptance for the merged source.

## Boundaries and next gate

Engineering: preserve development's backend and scoped data lifetimes while integrating the verified UI source. Codex owns the integration and evidence.

Security/governance: no authorization controls or failed assertions are relaxed. Only fictional local/CI fixtures are permitted. Existing UI, Schedule performance and migration approval gates remain open. Prior PR #13 WebKit runtime and Inbox-clear failures remain findings until a matching current run proves otherwise.

Development's base CI was already failing: [run 39427239840](https://github.com/JoseK0514/NEVORA/actions/runs/39427239840). Its failed validation, attendance, Phase E and release PostgreSQL gates are not closed by this merge or by passing local checks.

Push only the owned integration branch and review against `development`. Do not push `main`, promote the production draft PR, change deployment configuration, deploy, migrate any hosted database or send notifications. `vercel.json` still disables Git deployment. No production authorization has been given.

Rollback before integration: retain the candidate branch without changing development. After an authorized development integration, revert the integration through the normal development review path; no database rollback is required.
