# CI spending controls code review

- codeQualityStatus: BLOCK
- recommendation: REQUEST_CHANGES
- Snapshot: uncommitted working diff and new files in `/Users/josek0514/.codex/worktrees/ci-spend-controls-20261023/Fuel Scheduler`, detached HEAD `739165b212d8d0812fedce466bbf9de2de6f339b`. This is not commit approval.
- Goal: defer expensive draft PR checks, preserve complete ready/manual/push verification and mandatory release acceptance.
- Scope inspected: `.github/workflows/ci.yml`, `scripts/release-ci-contract.check.mjs`, new `scripts/ci-cost-policy.mjs` and `scripts/ci-cost-policy.check.mjs`, plus relevant aggregate consumers. Read spec and plan in `docs/superpowers/{specs,plans}/2026-10-23-ci-spend-controls*.md`, AGENTS, package scripts and applicable executive/engineering/governance skills.
- ULW status returned `ULW_LOOP_PLAN_MISSING`; fallback report path used. No notepad path was supplied. No application, workflow or test files edited by reviewer.

## CRITICAL
None found.

## HIGH

### H1: Full release runs always fail browser aggregation due to the additional dependency

`.github/workflows/ci.yml:478` changes the `phase-e-ui` dependencies to `[preflight, phase-e-ui-suite]`. Line 504 still passes all of `toJSON(needs)` to `scripts/phase-e-browser-evidence.mjs aggregate`. That consumer at `scripts/phase-e-browser-evidence.mjs:119` asserts that the keys are exactly `['phase-e-ui-suite']`. The successful preflight key is therefore rejected as an extra matrix dependency. Ready PRs, manual dispatches, and development/main pushes cannot achieve release acceptance even if all expensive tests pass. This also spends the full suite budget before failing.

Reproduction: evaluated the actual aggregate function body extracted from its source in a Node VM with `PHASE_E_CI_NEEDS_JSON` containing successful preflight and successful phase-e-ui-suite results. It immediately raised `Missing/extra matrix dependency`, showing extra `preflight`, before reaching artifact operations. This is a bounded local reproduction of the consumer check, not a hosted workflow or full aggregate execution.

Required fix: reconcile the new dependency payload with the aggregate consumer while retaining strict matrix success and artifact validation. Add a regression exercising the real consumer with the workflow's new dependency shape; merely pinning the new YAML dependency list is insufficient. Existing policy/contract and release-engineering suites pass despite this failure.

## MEDIUM
None independently identified. The missing integration coverage is part of H1 rather than a duplicate finding.

## LOW
None requiring action.

## Skill-perspective check

Ran read-only remove-ai-slops and programming perspectives after consulting `/Users/josek0514/.codex/plugins/cache/sisyphuslabs/omo/5.1.30/skills/remove-ai-slops/SKILL.md` and the adjacent `programming/SKILL.md`.

No deletion-only, requested-removal-only, prompt-prose, tautological, or gratuitous normalization tests/code were found. Event JSON parsing and draft-type validation occur at the external GitHub event boundary and directly serve the fail-closed requirement. The small policy helper supplies a meaningful unit-test seam; CLI tests check actual output-file writes. Workflow assertions inspect machine-consumed scheduling contracts, not prose. However, the changed dependency assertion and unchanged consumer are inconsistent: under the programming perspective, green contract pins do not establish end-to-end behavior. H1 records the demonstrated correctness failure and the coverage needed, rather than demanding unrelated cleanup or broader abstractions.

## Verification and limits

Reviewer independently ran:
- 11 policy/contract checks: pass. Artifact: `.omo/evidence/ci-spend-controls-review-policy-tests.log`.
- 107 release-engineering checks: pass. Artifact: `.omo/evidence/ci-spend-controls-review-release-tests.log`.
- `git diff --check`: pass.
- Actual aggregate-body dependency reproduction: confirmed H1, described above.

Inspected full tracked diff and both new script files. Existing heavy-job test commands, permissions, artifact settings, job budgets and deployment hold are unchanged. Ordinary heavy jobs depend on successful preflight with full output; matrix aggregation and final mandatory-job rejection remain fail-closed. Draft failures are intentional per spec. Same-ref concurrency is scoped by workflow/ref and event readiness triggers are present.

Parent-reported RED run, ESLint and actionlint results were not independently verified from artifacts at report time and are not used as approval evidence. No hosted runs, remote mutations, deployments, billing changes, or paid verification were performed. Actual hosted scheduling remains unverified. Engineering/Governance recommendation: NO-GO for this snapshot; release impact BLOCKER until H1 is fixed. Owner: implementation agent; next gate: targeted RED/GREEN regression and revalidation of the consumer contract. No policy exception or production authorization is implied.

## Blockers

- H1: reconcile aggregate needs payload and strict dependency validator, with meaningful consumer regression evidence, before approval.

## Root correction after this pre-fix review

H1 was reproduced through the actual exported consumer validator using the workflow dependency envelope: aggregate-consumer-red.log records Missing/extra matrix dependency, 10 pass / 2 fail. Final workflow restores needs=[phase-e-ui-suite] and gates draft aggregation directly on the GitHub event; the same strict matrix validation is called by aggregate and the regression. Final policy/contract12 and release-engineering108 passed; lint/actionlint/diff exit0. No re-review or final commit approval is claimed. Detailed evidence and activation hold: docs/handoffs/2026-10-23-ci-spend-controls.md.
