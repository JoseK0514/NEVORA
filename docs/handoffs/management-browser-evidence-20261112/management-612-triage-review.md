# Management 612 timeout triage

codeQualityStatus: WATCH
recommendation: REQUEST_CHANGES (bounded test diagnostics and failure-path robustness; no application fix established)

Scope: read-only review of frozen 612e211c57a7b3866b9174149c8ef4dee7d9670a and retained CI/local evidence. No server, browser, database, provider, CI rerun or source mutation performed. This is not release certification. Programming and remove-ai-slops skill perspectives were consulted and applied: the behavioral assertions are meaningful; no deletion-only or implementation-mirroring test change is recommended, and no production abstraction or parsing change is justified.

## Evidence and limits

- candidate-612-management-failure.log:1622 records the 360000ms global timeout; :1683 records missing results.json. That second error is a downstream evidence failure, not a demonstrated original cause.
- Retained artifact13994987861 digest independently matched bd542a362bba71ecf5d21b0fae460468e3c63c6984ac410404b9d1a5bd4dec1b. Its first Chromium QAOWNER confirmation image is timestamped23:33:04, source manifest23:32:52, versus test start23:32:47 and timeout23:38:48. Startup and initial UI interaction completed. No later capture/results identify the precise stalled await.
- Management ownership.closed=true at23:38:48 lacks sourceVerified/mirrorVerified. owned-next-app.ts writes closed before final source/mirror verification; this is evidence of entering closure, not completed qualification. Delegated suite subsequently passed.
- management-612-reproduction.log records unchanged-source local pass in57.90s. Its results have complete=true, six checks, four captures, errors=[], and18 network failures from the exercised controlled-abort paths. Its ownership has closed/sourceVerified/mirrorVerified=true and derived artifacts released. This is a nonreproduction, not proof the historical cause was fixed or the network was clean.
- development-242-management-passed.log records the same management suite passing in78.17s. Scoped git diff242..612 shows only the two company-access claim test/support files, not application or this management harness.

## Findings

CRITICAL: none established.
HIGH: none established.

MEDIUM — Failure capture can postpone cleanup and obscure the primary failure. src/test/integration/management-close-ui-browser.integration.ts:42,124-125 awaits screenshot and page.evaluate before releasing held route responses or closing owned resources. There is no independent overall capture budget; evaluate has no explicit deadline here. If a browser operation stops responding, this error path can consume the remaining global budget. This is a concrete failure-path vulnerability, not a proven explanation of this CI timeout. Release pending barriers before diagnostic capture, bound optional capture, retain its failure separately, and ensure resource cleanup/reporting still runs. Do not increase the360000ms test deadline or relax UI/SQL assertions.

MEDIUM — Sequential teardown can suppress both evidence and original errors. Same file:125 awaits browser.close, then app.close, then results writing. A rejection in either close skips later steps; an error in finally replaces the original error. Reuse the existing independently attempted owned-resource cleanup utility, preserving primary and secondary failures, and ensure a failure receipt is attempted independently of closure success. Do not mark complete or sourceVerified on incomplete teardown. This source flaw explains how evidence may be lost, but current evidence does not prove a close rejected in the failed CI run.

LOW — Current phase state is not durably recorded. Same file:32,39-42,73-106: surfacePhase appears only when pageerror/requestfailed fires, and results are written last. The fetch/commit barrier only bounds waiting for its committed signal after the keyboard operation; it does not identify which later operation was active at global timeout. Route handler exceptions are not explicitly delivered to the committed promise. The20-second barrier itself is not evidence of a six-minute deadlock. Add a small, capped, durable journal of fixed before/after phase labels and elapsed time around save/fetch/barrier, account replacement, reconciliation/new-punch, failure capture and cleanup. Record fixed failure categories, not request bodies, SQL, cookies, credentials, DOM contents or arbitrary error payloads. Preserve original route errors and application behavior.

## Terminal recommendation

The smallest justified change is test-only bounded phase evidence plus failure-path cleanup robustness, with focused negative controls showing that stalled/throwing capture and failed closes cannot prevent independent cleanup/report attempts or replace the primary error. Keep every existing business assertion and timeout unchanged; freeze a new source if committed and qualify it under the ordinary gates. No speculative application change is justified.

A single preserved unchanged-source failed-job observation could supply another environmental observation if independently authorized, but a pass would not establish the historical cause or cure these evidence-loss paths. Instrumentation offers more diagnostic value than an uninstrumented repeat. This review neither requests nor performs a rerun. Candidate612 remains failed; the local pass cannot waive candidate or actual-development gates.

Blockers to claiming this timeout diagnosed/fixed: exact stalled operation and causal failure remain unknown. Requested diagnostic repair is limited to the two MEDIUM failure-path findings; no production defect is asserted.
