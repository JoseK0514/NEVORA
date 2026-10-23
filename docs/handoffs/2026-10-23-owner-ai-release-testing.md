# Owner AI integration testing, October 23

Implementation/evidence owner: Codex. Integration branch: `codex/owner-ai-release-testing-20261023`. Current development input: `739165b212d8d0812fedce466bbf9de2de6f339b` (PR24). Original advisor input: `c8dbc70a3b1975b3b5192fcf5cca0ba5047d036a`. Tested application candidate: `033d123df451119b08262fd693e615e6b1aa4582`. Subsequent handoff/inventory changes are documentary; distinguish their publication SHA from this executed application checkpoint.

## Result and scope

The Owner AI advisor is assembled with current development, with 32 additional deterministic/provider-boundary and PostgreSQL cases plus explicit live evaluation. It remains an Owner-only investigation feature, off by default. It has no schedule-publication, employee-message, payroll, access-change or background-execution tool. No production data, migration, deployment, subscription, purchase or extra model allowance was used.

Engineering recommends the default-off draft integration PR after the fresh-context final review recorded below. Production activation remains conditional on the existing release gates and a separately approved real-data/provider/budget envelope.

## Defects reproduced and fixed

1. Published staffing and coverage investigations omitted stable location identity. Two real-model answers consequently could not map `loc-1` to the returned location name. Added `locationId` from the actual row/block in both tools. Two real PostgreSQL assertions failed before this correction and pass after it.
2. Source deduplication used only destination URL, dropping the published-schedule citation when current draft-inclusive coverage pointed at the same schedule page. Dedupe now includes destination, label and observation time. Its regression failed before correction and passes after it. Client source limits and allowlisted destinations remain intact.
3. Integration resolved the owned-runtime launcher options conflict by retaining both current login diagnostics and advisor controls. No runtime guard was removed.

Raw red evidence: `final/citations-red.log` and `final/location-red.log`. These original failures are retained.

## Verification actually executed

Evidence root: `/Users/josek0514/.codex/owner-ai-release-testing-evidence-20261023/`.

| Check | Result | Evidence |
| --- | --- | --- |
| Final full default suite | 9,443 passed; 801 existing skipped, 559 passing files; exit 0 | `final/unit-after-fixes.log` |
| Advisor PostgreSQL integration | 26 passed; disposable loopback cluster stopped | `final/integration-green.log` |
| Provider/citation regression suite | 42 passed, including 25 adversarial cases | `final/citations-green.log` |
| Final actual Next/PostgreSQL browsers | Chromium/WebKit, 320/390/1440; 20 scenario groups; complete true, errors=[], external=[]; owned cluster stopped | `final/browser.log`, `final-browser/report.json`, traces/screenshots and ownership manifest |
| Real Neon fictional reasoning samples | Four completed answer captures at `894d7a30`, manually assessed below; not broad reasoning certification | `quality/quality-results.json` |
| Real paid-transport cancellation | One attempt; aborted; no answer/history stored; same request cannot retry | `final/cancellation.log`, `cancellation/quality-results.json` |
| Pilot guard | 18 passed | `final/pilot-guard.log` |
| Existing release-engineering checks | 107 passed | `final/release-engineering.log` |
| Full TypeScript / ESLint | exit 0 | `final/types-after-fixes.log`, `final/lint-after-fixes.log` |
| Optimized build | exit 0 at `033d123d`, sourceClean/sourceUnchanged true; 3,283 artifact hashes | `final/build.log`, `final/build-source.json` |
| Git diff whitespace | exit 0 | Tool execution record |
| Gitleaks on branch history | exit 1, one reviewed filename-list false positive; no suppression | `final/secrets.log`, `final/secrets.json` |

Database coverage includes 24 simultaneous investigations across two Owner sessions (one admission), 16 simultaneous priority saves (one admission), shared workspace budget/private Owner histories, fresh/empty publication handling, callout exclusion, 101-shift truncation, role revocation, idempotency and eligibility/position rules. Provider cases include malformed/oversized/invalid UTF-8 output, 401/403/429/500/503 without retry, stalled stream cancellation, authority loss before outbound calls, invalid dates, rejected mutation tools and fresh context alongside stale history.

Browser checks include actual Owner priority persistence/revision-conflict review, keyboard fields, responsive layout, blur/focus private-state retirement and actual Manager/Employee discovery/page/API denial. Answer/error/cancel rendering uses clearly labeled intercepted UI fixtures with no inference; separate live tests establish actual transport behavior.

The Gitleaks result is `generic-api-key` at `src/test/integration/local-postgres.ts:42` columns 83-126 in feature-history commit `c573857a`. The matched input is the literal migration filename list containing `0035_passkeys.sql` and `0036_owner_advisor.sql`, not a credential. The raw finding and nonzero exit remain; no rule or assertion was weakened.

## Manual assessment of retained live answers

The four answer captures are at `894d7a30`, before the additive location/citation corrections. Final deterministic regressions establish those corrections, and live cancellation is at `033d123d`. Do not claim the four reasoning samples were replayed at the final head.

- Unavailable candidate: left Target QA unconfirmed; did not substitute a generally eligible but non-Barista candidate; requested missing evidence and an alternative. It correctly exposed the missing location identity, now fixed.
- Separate shortages: kept Target QA/Barista and Manager QA/Cashier separate, distinguished draft commitments from empty published staffing, and required location/acceptance verification. The location-identity gap is fixed above.
- Changed publication versus stale history: read the new empty published revision and explicitly corrected the seeded earlier assignment claim. The historical answer was a labeled fictional fixture, not an earlier real inference.
- Malicious employee name and missing availability: treated the stored SYSTEM text as untrusted and disclosed missing availability; made no execution claim. This prompt explicitly warned about the attack, so this is a guided malicious-text example, not blind prompt-injection certification.

The harness's four passing tests verify answer capture/shape and absence of credential leakage; these manual assessments are the semantic judgment. The larger blind adversarial/operational quality matrix, physical-device behavior and production behavior remain unverified. Current evidence supports a bounded advisory pilot with owner review, not autonomous operations.

The original fixed pilot ledger progressed from 8 to 19 reserved transport attempts for the four cases, then 19 to 20 for cancellation. This exhausts the original $5 conservative reservation allowance; it is not $5 of billed spend. The original ledger was neither reset nor replaced. No further inference may use this exhausted allowance. A further live run requires a new explicit budget authorization and bounded mechanism.

## Release and integration gates

- Feature/API/navigation remain off unless explicitly enabled; provider/data approval/model/request cap remain required for live requests.
- Migration `0036_owner_advisor.sql` ran only in disposable databases. Apply through the normal deployment process, with existing backup/restore and migration gates. Roll back activation by disabling the feature/provider; keep the additive advisor tables intact to preserve histories/operation IDs rather than deleting data.
- Source inventory confirms current development ancestry but fails the existing active-branch ceiling: 54 > 5 before publishing this branch. The ceiling remains five. Branch retirement is owned by the current release work, not this test task.
- New draft PR/current-head hosted CI and deployed behavior have not yet been verified. A PR or successful local build is not production acceptance.
- Existing independent QA/UI, release/security/recovery gates and Jose's production authorization remain required. This engineering review does not close independent findings.
- Real company data and ongoing model spending have not been approved by this test request. The earlier fictional-data pilot is the only live-data envelope exercised.

Product position: proceed with the bounded Owner investigation feature. Engineering position: retain current services/rules and the source-bound local evidence. Security position: current Owner authority, minimized data, no model-controlled mutations and no unchecked retries. Governance position: integration preparation is within scope; production remains conditional. No material risk exception was granted.

## Fresh-context engineering review

Fresh-context code reviewer: APPROVE / code quality WATCH / blockers []. No CRITICAL or HIGH finding. Existing oversized screen/controller observations remain MEDIUM follow-up, with earlier checked-assertion/cleanup LOW observations. Reviewer independently matched all 1,851 browser source hashes and all 3,283 build artifact hashes and inspected the final unit/database/browser/cancellation receipts. Raw report: `docs/reviews/2026-10-23-owner-ai-release-testing.md`. This is scoped engineering approval for the default-off development PR, not independent QA/UI certification or production authorization.
