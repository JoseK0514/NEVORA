# Navigation visibility amendment independent review

- specStatus: PASS
- codeQualityStatus: WATCH
- recommendation: APPROVE
- blockers: []
- reportPath: /tmp/nevora-verify-33-e-navigation-review.md
- fallbackReportPath: .omo/evidence/clean-manager-e-navigation-code-review.md
- releaseRecommendation: NO-GO (unchanged)

## Scope and findings

Reviewed immutable range b258f4a163d1a2ca45e72b49b8fe0530659e34d0..3bb66b295dfd1d1b7a2476c1d2793d821bed60e3 in the verify-preview-33 worktree. HEAD matched the endpoint and tracked status was clean. The full diff contains one executable change, scripts/phase-e-navigation-browser-scenarios.mjs, and the Navigation handoff document. git diff --check passed. Application, controller, authorization, schema and CI workflow bytes are unchanged. Tested executable checkpoint is 8289f8336d534f8abe6039f2f3f6786903d2688f; its descendant adds only the report.

CRITICAL: None.

HIGH: None in this amendment.

MEDIUM: None introduced by this amendment requiring a change.

LOW: scripts/phase-e-navigation-browser-scenarios.mjs:110 now adds a substantial lifecycle scenario to a 225 pure-line module. This is in the programming skill's warning band, below its 250-line defect threshold. If another lifecycle expansion is needed, extract a cohesive scenario then; do not add a speculative abstraction or broad refactor for this approval. Existing compressed formatting makes future lifecycle edits harder to inspect, but no demonstrated correctness defect follows here.

## Behavioral review

The revised scenario retains the protected view's real fetch and AbortSignal, holds an actual authorized old response, dispatches hidden visibility, and asserts abort before dispatch returns. It waits for the actual paused heading within the existing 15-second bound and then asserts zero private rows while the original response remains held and exactly one read has occurred. It releases that response while hidden and checks the paused/no-row state and observed DOM mutations before re-entry. Unexpected fetch, parse and fulfillment failures remain failing assertions with projected diagnostics; a failed original request is the bounded abort exception. There is no transport retry or production scheduling change.

Persisted fictional source exclusion before re-entry makes the fresh empty result distinguishable from the old authorized row. The no-read-mutation query and restoration of the owned source remain explicit. The final diff preserves the existing ownership, navigation/history, role/binding/session refusal, source-expiry, retry, persistence, focus and accessibility assertions. Observer data contain counts, booleans and timing rather than private response contents.

I inspected the unchanged shared controller and panel wiring. pause increments the generation, cancels the request, clears expiry/current state and publishes synchronously; React receives that state through setState. The external direct-controller probe uses the actual source and a transport that ignores abort, then verifies that resolving the old promise publishes no additional state. This supports the distinction between logical invalidation and the later DOM commit without changing the privacy control.

## Evidence independently verified

Evidence root E: /Users/josek0514/.codex/visualizations/2026/10/20/01a15962-cdee-7dd0-8a92-023551b076fb/ci-e-navigation.

- Recomputed all 71 artifact hashes and sizes in E/evidence-index.json: no mismatch.
- Recomputed all 2,928 hashes in E/verified-navigation14/source-manifest.json against the current worktree: no mismatch. The tested-to-handoff Git diff adds only the report, and the SDD report is byte-identical to the durable handoff.
- Checked all 1,493 mirror entries in each of baseline, timing-red and verified-navigation14. The only differences are the two declared substitutions: local PostgreSQL db.ts and Next-generated next-env.d.ts. Their actual hashes match substitutedDbHash and generatedTypeReferences.derivedHash. Inspected post-run custody and ownership receipts.
- Parsed all 14 raw navigation-visibility receipts, rather than relying solely on visibility-summary.json. Every cell records synchronous abort, one held read, zero rows at the paused observation, fulfilled old response, no observed paused-state resurrection through settlement, and a fresh empty re-entry result. The 14-cell browser report records all passes and zero errors.
- The raw dispatch observations retain one row; the first paused commit follows 1-3.2ms later. The original-style separate locator reads zero in every local cell. The timing-red failure is explicitly the deliberately stronger same-task assertion (actual 1, expected 0), not an exact hosted failure reproduction.
- Read controller-probe.mjs and its report; recomputed its actual controller source hash. The retained probe reports synchronous null/paused/aborted and zero states added by old resolution.
- Inspected focused/default test JSON, gate receipts and actual logs: focused 19 passed/0 failed; types and full eslint . exit 0; default units 7,401 passed/0 failed/801 skipped, 450 files passed/27 skipped. These are recorded worker runs at the verified checkpoint; I did not rerun the suites.
- Independently checked all recorded browser resource PIDs from the owned reports: baseline 12, RED 5 and final 12 absent. All six recorded local ports refuse connections; all corresponding ownership receipts are closed. Inspected gate-process closure receipts. No runtime or database was started by this review.
- Read the task brief, SDD/durable handoff, prior whole-branch review and current release ledger. Notepad/context: .superpowers/sdd/CLEAN-MANAGER-VERIFICATION-PLAN/task-2-e-navigation-ci-report.md.

## Skill perspective and limits

Explicitly loaded and consulted programming/SKILL.md and remove-ai-slops/SKILL.md under /Users/josek0514/.codex/plugins/cache/sisyphuslabs/omo/5.1.30/skills/. Applied their behavioral-test, overfit, unnecessary-complexity and boundary criteria to the full executable diff. No deletion-only, requested-removal-only, tautological, implementation-constant or prompt-prose test was added. DOM headings identify real rendered states; they are not prompt tests. Response parsing and observation are required browser-test evidence, not new production parsing. The caught route errors remain failure evidence; best-effort abort cleanup does not convert them to success. No new untyped production escape hatch or unnecessary production abstraction appears. The 225-line warning above is the only new maintainability note; neither perspective supplies a blocking violation. The read-only assignment supersedes skill implementation/refactoring steps.

The unchanged baseline passed 14 cells. Exact hosted cross-process ordering was not reproduced; this is approval of the supported synchronization correction, not certification that hosted Linux CI now passes. Observed commit timings are not a privacy SLO. Synthetic visibility events and the owned local Next/PostgreSQL transport are explicitly limited evidence. No physical-device or assistive-technology acceptance follows.

Only unchanged executable/migration bytes plus review-record documentation descendants are approved to proceed to the final exact-source production build and hosted CI. Root must record source equivalence and obtain all mandatory jobs, full D/D2, all 70 E cells and required rollup acceptance. No additional implementation change is covered by this approval.

All seven independent Manager/Owner exit findings, native text-readability limits, Schedule performance acceptance, migration/recovery and production authorization gates remain open. This review does not close findings or authorize production, main merge, database writes, backup, deployment or notifications.

omo-agent-toolkit ulw-loop status --json returned ULW_LOOP_PLAN_MISSING; the required fallback copy accompanies the requested external report. Only these review artifacts were written.

