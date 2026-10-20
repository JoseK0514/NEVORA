# Communications runtime-error scoped review

- specStatus: PASS
- codeQualityStatus: CLEAR
- recommendation: APPROVE
- blockers: []
- Reviewed range: e746ba122d181074b635afab5400036b78e13557..0e040bbaf7df9fd51c06bbd5df720519874ee86b
- Tested implementation: 24509647e46a149d3afa7af2a7b328fa16e3f04c
- Scope: three executable/test files and the Communications handoff. This is an amendment review, not overall CI or release approval.

## Findings by severity

CRITICAL: None in this bounded diff.
HIGH: None in this bounded diff.
MEDIUM: None in this bounded diff.
LOW: None requiring a change.

The prior overall final-gate rejection remains in force. The four hosted Communications page errors have an unknown application cause. Neither local success nor a diagnostic category establishes harmless cancellation. All 70 required hosted cells, zero runtime errors, ownership/source verification and the evidence rollup remain mandatory.

## Code and spec assessment

scripts/phase-e-browser-qa.mjs:13 introduces a real shared observation boundary used by the primary and Communications manager contexts. Registration occurs before page creation, so subsequent pages are observed too. The observer keeps a cell-local starting offset and rejects new errors. At lines 161-166 the runner awaits context close, checks errors, checks source/ownership, and only then marks the cell passed. The final whole-run zero-error assertion remains.

scripts/phase-e-communications-browser-scenarios.mjs:19 registers the manager context before its first page, and line 40 checks runtime errors and manager external-request failures after manager teardown. Existing U01-U11 workflow, current-authority and private-lifetime assertions remain. No application, data-access, migration, retry, timeout or CI coverage change appears in the full diff.

The new runtime projection persists only static categories, allowlisted stage/name/cell values, role, page index and phase. It does not persist original error messages, URLs, stacks, actors or payload hashes. Network, abort, module and unknown categories all fail acceptance. Existing manager request-failure diagnostics are outside the new observer and unchanged; this review does not certify every pre-existing diagnostic field as newly sanitized.

## Independent artifact checks

Evidence root: /Users/josek0514/.codex/visualizations/2026/10/20/01a15962-cdee-7dd0-8a92-023551b076fb/ci-e-communications

- Read both handoff copies, full executable/test diff, surrounding runner/teardown logic, safeBrowserFailure, probe source, custody verifier, package scripts and AGENTS.md.
- Recomputed all 10 evidence-index.json artifact SHA-256 hashes: all match.
- Recomputed all 2,931 source hashes against Git blobs at the tested implementation: no mismatches.
- Checked all 1,493 runtime mirror entries. The two expected deviations are src/lib/db.ts and next-env.d.ts; their bytes match the recorded substituted DB and generated-types hashes. Read the existing verifier's approved-adapter/generated-reference checks.
- Git confirms the implementation-to-handoff descendant changes only the report document.
- browser-report.json records exactly 14 passed Communications cells across both engines and all seven widths, zero errors and ownershipClosed true. Each cell retains 11 checks, or 12 for the audience-change widths.
- Read runtime-observer-probe.mjs and its result: both engines capture real asynchronous exceptions on two pages, redact the fictional private sentinels, reject acceptance after context closure, and close browsers. The second error is deliberately emitted under the context-close phase before closure; it is not evidence that browser closure caused an exception.
- Read regression-red.log: 2 failed / 6 passed because the new observer export was absent. Read regression-green.log: 8 passed. This RED establishes absent diagnostics behavior, not reproduction of the hosted application fault.
- Recomputed types/lint/unit log hashes from gates/local-summary.json, all matching with exit 0. Inspected unit footer: 7,403 passed, 801 skipped; 450 passed files, 27 skipped. Read release-checks.log: 61 passed, no failed/skipped.
- Read closure-check.json: 265 observed owned processes absent, ports 57881 and 57920 not connectable, both ownership receipts closed. These are retained closure observations, not a newly rerun process check.
- Inspected the earlier downloaded hosted browser-report.json: 59 attempted executions, failed overall, two generic errors each for Communications WebKit390 and WebKit430 even though those cells were marked passed. This directly supports the diagnostic and acceptance defect.

No tests, browsers, application servers or database runtimes were launched by this reviewer. This review independently inspected and hashed existing evidence; it does not claim an independent test rerun. LSP was unavailable and installation previously declined; recorded project typecheck passed.

## Skill-perspective check

Loaded and consulted omo:programming, its TypeScript reference, and omo:remove-ai-slops before judging test relevance and maintainability. Applied the overfit/slop pass to the full changed test and harness code. No deletion-only, removal-verification, tautological, prompt-prose, implementation-constant-only tests or untyped assertion escape hatches were introduced. The tests exercise event delivery, privacy projection, cell isolation and rejection; EventEmitter is a narrow real event source, supplemented by actual-browser evidence.

The observer is a justified shared seam, and message classification belongs at the browser-error evidence boundary. No unnecessary production extraction/parsing/normalization was added. The files remain below 250 nonblank/noncomment lines (186/41/44 under the measured heuristic). No material violation of either skill perspective was found. Existing compact scenario formatting does not justify an unrelated refactor.

## Permitted next step and limits

The unchanged reviewed executable bytes, with report-record documentation, may proceed to the separately reviewed capacity task and a newly built hosted CI candidate. This approval does not authorize production or close the unknown hosted runtime cause, macro capacity failure, seven independent exit findings, Schedule performance acceptance or migration preparation/application authorization. The existing overall CI rejection and release NO-GO remain until their respective gates are satisfied.
