# Bounded CI spending controls

Jose approved reducing repeated GitHub Actions execution after the October 23 usage review: 19 full CI runs and two diagnostics, approximately2256 rounded job-minutes. This change implements that direction without changing release acceptance or account billing settings.

## Approach and scope

Use draft PRs for cheap preflight checks. Marking a PR ready, updating a ready PR, pushing development/main, or explicitly dispatching CI runs the complete existing release suite. Returning a PR to draft cancels its old run and returns to preflight. All same-ref CI runs cancel superseded runs; different branches remain independent. Full checks cannot start until preflight passes.

Alternative considered: omit expensive suites based on changed paths. Rejected for release candidates because dependency and evidence custody can cross those paths. Documentation-only draft updates receive cheap preflight; ready candidates still receive all checks. Reusing historical green evidence across different commits is excluded.

The existing final phase-e-evidence job continues to reject failed, cancelled, skipped and missing mandatory jobs. A draft preflight is deliberately not a successful release verdict; its final gate explains that full checks were deferred and remains failed. GitHub also prevents draft merging. Ready-for-review and converted-to-draft events are explicit triggers. workflow_dispatch is an explicit full-run option.

Implementation uses the existing Node24/YAML stack: one small event policy script, its behavioral tests, the CI workflow, and updated execution-contract tests. Keep all existing test commands, assertions, exact-SHA/artifact/teardown checks, job budgets, role permissions and deployment hold. No subscriptions, metered AI, remote inference, production changes, branch-protection changes or account budget changes.

## Verification and limits

Test event decisions, malformed PR metadata, actual output-file writes, current workflow conditions/dependencies, all mandatory failure states and readiness triggers. Run affected release-engineering checks and workflow syntax lint locally. Do not launch a paid full suite to test cost avoidance. Hosted scheduling behavior remains unverified until this reviewed change is explicitly published. Commit/publish require Jose's explicit direction; no commit was requested for this new CI task yet.

Engineering/Governance position: preserve release controls, defer draft expenditure and fail closed. Source base is freshly fetched origin/development739165b2. Active Communications and Owner AI branches remain separate; do not rewrite or cancel their runs.
