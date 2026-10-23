# Independent Attention diagnostic/privacy review — 4789a761

Candidate: `4789a761e054d8f98cb6877d2dc9324cfc52f538`; compared with `1a9c03515fb8beb74404a0021d1f9df6360f8a4e`.

codeQualityStatus: **WATCH**
recommendation: **APPROVE diagnostic-only instrumentation**.
blockers: **[]** in this bounded diagnostic patch. **QA-AT01 and mandatory cloud acceptance remain open integration blockers.** This is not a fix or closure verdict.

## Scope and evidence

Verified clean HEAD at 4789a761. Entire diff changes only `scripts/phase-e-attention-browser-scenarios.mjs` (21 added lines, one replaced line). Inspected complete diff and surrounding operation/rollback flow, actual `safeEvaluationFailure`, navigation snapshot implementation, disposable PostgreSQL executor, unchanged driver timeout, and independent `qa-attention-93b38fec-investigation.md`. Diff whitespace check passes. No runtime, test, build, external request or HEAD/source mutation was performed; parent’s active full replay was not disturbed.

## Controls remain intact

The actual unavailable alert wait remains unchanged at the driver's 15,000ms default (`scripts/phase-e-browser-qa.mjs:216`). The new catch runs only after that assertion fails. It collects evidence and rethrows the original error; diagnostic errors are represented as bounded safe categories/booleans and do not turn the scenario green. Existing pageerror classification is unchanged.

Operation identity assertion, Retry confirmation action, success assertion, and exactly-one canonical operation assertion remain at scenario lines 107–109. The actual exclusive locks and final ROLLBACK/end are unchanged. Capture at lines 95–105 occurs before that finally releases the blocker. No unavailable/unknown equivalence, timeout widening, automatic retry, response fulfillment, or suppression was introduced.

## Privacy and capture bounds

New request observers persist only stage, relative time, event kind and HTTP status. They inspect next-action presence but do not persist its value, URLs, headers, request or response bodies. The navigation snapshot contains phase/sequence/history count/age, not internally tracked source/destination URLs. DOM capture persists boolean alerts/success, busy attribute and authority input COUNT; it does not persist authority values, operation IDs, form contents or session proof. `safeEvaluationFailure` returns allowlisted name and classified kind without raw error text.

The PostgreSQL query returns only wait-event categories and aggregate connection counts, scoped to the owned database and excluding its own diagnostic connection. It does not select SQL text, user names, connection strings, PIDs, authority or row values. `q` uses a separate fresh client with 3-second connection timeout and 5-second server statement timeout (`local-postgres.ts:102`); it is not run on the connection holding the lock. DOM read has a 5-second deadline and screenshot a 5-second timeout. These are post-failure collection limits, not extra time to pass the failed 15-second assertion. There is no single overall diagnostic wall-clock budget, and database bounds rely on the existing local executor/server timeout rather than an additional client-side race; do not describe the whole capture as a five-second operation.

Failure screenshots intentionally capture the visible fictional owned-test page, as existing scenario screenshots already do. They do not serialize hidden authority form fields. They can contain fictional displayed operational data, so their provenance must stay tied to owned test data; this review does not authorize using this collector against real customer pages.

## Findings by severity and interpretation limits

CRITICAL: none new.
HIGH: none new.
MEDIUM: none new.
LOW / diagnostic limitations: response/request-finished observations are stage-scoped and uncorrelated across multiple server actions; aggregate wait categories do not identify a particular blocked action. No safe application result/error-code event was added. Those facts may narrow the failed layer but cannot alone establish causality or that a finished HTTP response contained unavailable. Event records also have no explicit array cap (the scenario is finite; this is nonblocking for the owned bounded replay). Preserve these limits when interpreting any resulting artifact.

Reapplied loaded programming/remove-ai-slops perspectives: this is targeted failed-scenario observation, with sanitized boundary extraction and existing helpers. It does not add production parsing or needless product complexity, brittle prompt assertions, implementation-constant tests or untyped escape hatches. The catch preserves the original failure; no new material skill-perspective issue is identified.

## Verdict and remaining gates

Approve running this diagnostic-only candidate within already authorized owned fictional QA. Existing unchanged application code findings/closures remain scoped as before, but the new independent Attention failure overrides any suggestion of whole-release readiness. Root cause remains unestablished. A green replay alone is not causal closure of an intermittent failed mandatory gate.

Keep QA-AT01 open until independent QA accepts discriminating evidence, any justified smallest correction, full 14-cell verification and exact-candidate mandatory cloud success. Preserve failed cloud evidence and diagnostic failures. Development integration, matching development CI, approved isolated hosted setup/database and migration/rollback evidence, new inference budget and separate production authorization remain required. This is code/privacy review of diagnostics, not security certification or authorization to waive a release gate. Only this separate report was written; all prior reports and other agents’ work were preserved.
