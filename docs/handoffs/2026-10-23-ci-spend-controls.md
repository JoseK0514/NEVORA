# CI spending controls: local verification

Owner: Codex. Branch: `codex/ci-spend-controls-20261023`, based on freshly fetched development `739165b212d8d0812fedce466bbf9de2de6f339b`. Jose explicitly authorized committing and opening the draft development PR on October23. This document records local verification; hosted publication and behavior require the separate PR/run receipt. The change becomes development-wide only after integration.

Jose approved reducing repeated Actions expenditure. The October23 review counted19 full CI runs and two diagnostics since midnight PuertoRico, approximately2256 rounded job-minutes, including669 on cancelled runs. These are calculated job timestamps, not an invoice; current API authorization does not expose billing. No account budget, subscription, active workflow run, production environment or other agent's branch was changed.

## Implemented behavior

- Draft PR updates run one cheap preflight: fixed Node24, locked dependencies, policy/CI contract tests. Expensive unit/build/database/browser jobs defer. The final release verdict explicitly fails with a draft explanation; cheap checks are not release acceptance.
- Ready-for-review PRs and their updates run all existing mandatory release jobs. Development/main pushes retain full checks. All heavy leaves require successful preflight and a full-run decision.
- Ready-for-review and conversion-to-draft events trigger CI even without a new commit. Same-workflow/ref concurrency cancels superseded runs while different PRs/branches remain separate.
- Existing commands, failure assertions, exact-SHA custody, artifacts/retention, runner/job budgets, read-only permissions and global deployment hold remain intact. The unchanged final verifier rejects failed, cancelled, skipped, neutral and missing mandatory jobs.
- AGENTS.md records draft-first iteration, batching fixes, avoiding duplicate dispatches and retaining matching-candidate release checks. Ready PRs still trigger full checks even for documentation updates; path-based release exemptions were deliberately excluded.

An explicit workflow_dispatch event is supported by the policy, but **GitHub only exposes manual dispatch when the default branch has that trigger**. The repository default is main, which does not have it today. Mark a stable PR ready for full verification now; this work does not authorize updating main to enable the future manual option.

## Verification and review

The original workflow failed the new scheduling-contract assertions before implementation. One scoped reviewer found H1: adding preflight to the browser aggregate's needs changed the JSON dependency envelope, which the existing strict aggregate rejects. Root added a regression calling the real consumer validator with the workflow's actual dependency envelope and observed `Missing/extra matrix dependency` with the incorrect wiring (`aggregate-consumer-red.log`, 10passed/2failed). Restoring the sole matrix dependency and gating draft scheduling directly on event metadata makes it pass. The existing assertions now live in exported verifyMatrixDependency, called unchanged by the actual aggregate and the regression. Its toJSON(needs) envelope and strict matrix/artifact validation remain intact. Per the native execution workflow, root covered this one material fix with RED/GREEN and the complete affected suite; the review report remains explicitly pre-fix, not a purported approval of the final snapshot.

Final local results: policy/contract12 passed; release-engineering108 passed; scoped ESLint and gitdiffcheck exit0. Official actionlint1.7.12 passed; its release archive SHA256 was verified against the GitHub release metadata. Shellcheck was unavailable and not claimed. No full application/browser/database suite or paid Actions workflow was launched for this tooling-only change.

Actual commands, exits, full logs and six changed control-file hashes: `/Users/josek0514/.codex/ci-spend-controls-evidence-20261023/verification.json` and adjacent logs. Original review: `.omo/evidence/ci-spend-controls-review.md`. Red H1 log: external evidence directory `aggregate-consumer-red.log`.

Engineering/Governance position: bounded draft expenditure with unchanged final release acceptance. No risk exception or independent QA certification claimed. Hosted event scheduling/cancellation remains unverified until publication. Development's existing lack of configured required-status branch protection was observed read-only; this change preserves CI/policy checks and does not claim to add server-enforced merge protection.

## Activation and next gate

Jose's “Let's do it” authorizes the verified commit and draft development PR. Verify its cheap hosted preflight, with expensive gates deferred and the final draft verdict explicitly not release acceptance. Keep any conflict with the active Communications/Owner AI work scoped; refetch development before integration. Mark the stable PR ready for one full current-candidate CI run and require all mandatory results before integration. No main merge or production deployment is authorized. Rollback is a normal reviewed revert of these CI controls; existing application/data behavior is unaffected.
