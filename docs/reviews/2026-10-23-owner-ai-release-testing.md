# Owner AI final engineering review — 2026-10-23

- codeQualityStatus: WATCH
- recommendation: APPROVE
- blockers: []
- Scope: development integration of the bounded Owner investigation increment; no production or independent QA/UI certification.
- Reviewed HEAD: 033d123df451119b08262fd693e615e6b1aa4582.
- Base: 739165b212d8d0812fedce466bbf9de2de6f339b.
- Report: .omo/evidence/owner-ai-release-testing-code-review.md.

## Review basis

Read repository AGENTS, package scripts, design specification, development handoff, prior whole-feature engineering review and pilot review context. Examined the base-to-HEAD change inventory and the application authority/store/migration/provider/tools/contracts/HTTP/controller/lifecycle/rendering/navigation changes, owned-runtime option integration, new adversarial/release/live tests and existing behavioral assertions. No source edits, inference, broad test reruns, ref fetches, or process interference. This report is the only reviewer write. ULW status returned ULW_LOOP_PLAN_MISSING, so the fallback evidence path is used. No current coordination notepad was supplied; historical review references its progress.md.

## CRITICAL

None found.

## HIGH

None found.

## MEDIUM

M1 — Existing oversized UI modules remain a maintainability follow-up. `src/components/owner-advisor/advisor.tsx:1` measures 301 nonblank/non-line-comment lines; `src/components/owner-advisor/controller.ts:1` measures 344. The screen combines briefing, transcript, editor and lifecycle wiring; controller combines authority leases, operation fencing and revision edits. Both exceed the loaded skills' 250-line criterion. Preserve existing state-machine regression coverage when splitting along responsibilities. This is carried forward from the prior review; no demonstrated new correctness failure justifies raising its severity or blocking this bounded integration.

## LOW

L1 — Checked assertions and catch-all cleanup deviate from the strict programming perspective. Examples: `src/components/owner-advisor/public-response.ts:89` and `src/lib/owner-advisor/service.server.ts:112`. Public response assertions follow actual boundary checks; cleanup preserves the original failure and the database lease bounds a failed cleanup. These are follow-up typing/observability improvements, not evidence of an authority bypass. Do not replace the repository stack or add validation dependencies solely to match skill defaults.

## Skill-perspective check

Ran remove-ai-slops and programming perspectives from `/Users/josek0514/.codex/plugins/cache/sisyphuslabs/omo/5.1.30/skills/`, including TypeScript README. Consulted NEVORA executive operating model, CTO, CISO, technical assurance and governance skills. Both perspectives flag M1; programming also flags L1 and minor existing test fixture casts. No deletion-only, requested-removal-only, prompt-prose-pinning or tautological tests were found in the reviewed changes. Tests exercise state transitions, hostile boundary inputs, actual disposable PostgreSQL concurrency and visible behavior. Provider transport injection is an appropriate no-cost seam, not evidence that a real model obeys instructions. Production parsing and normalization are at HTTP/provider/tool trust boundaries and justified by the goal. No unnecessary production extraction or generic abstraction was identified.

## Correctness and specification assessment

The bounded investigation specification is substantially met. Owner/Company Access checks are server-owned and repeated across asynchronous work; persistence is workspace/Owner scoped. Database transactions enforce operation ownership, optimistic priority revisions, one running workspace investigation and the UTC daily request cap. The controller retains its edit-base revision and requires explicit review again after subsequent drift. Private state retirement and fresh post-operation reads remain intact. Feature/provider activation defaults off; provider endpoint, redirects, deadlines, response sizes, tool names and arguments are bounded. Tools do not mutate business records.

Location IDs now survive published and coverage tool projections. The change supplies missing relational context without adding another data query. Citation identity includes href, label and observation time, preserving published versus draft-inclusive evidence. The client allows eight sources and the loop allows eight total tool calls, each returning one source, so this does not create a source-count contract regression. Source destinations remain allowlisted; rendering escapes text and uses index keys rather than duplicate href keys.

The owned-runtime change adds explicit advisor options while retaining existing initializer/mail/payroll options and avoiding ambient provider credentials in ordinary runs. The migration remains additive and classified in the disposable adapter. No deployed migration or production activation is established here.

## Evidence inspected independently

Evidence root: `/Users/josek0514/.codex/owner-ai-release-testing-evidence-20261023/`.

- `final/unit-after-fixes.log`: 9,443 passed, 801 skipped, 559 passing files. This supersedes the earlier 9,442 result.
- `final/integration-green.log`: 26 actual disposable PostgreSQL tests passed, including seven release tests; owned cluster teardown recorded.
- `final/citations-red.log`, `final/citations-green.log`, `final/location-red.log`: observed failing regression output before corrections and subsequent passing focused/integration logs.
- `final-browser/report.json` and `final/browser.log`: complete, 20 Chromium/WebKit scenario groups, Owner/Manager/Employee, 320/390/1440 widths; no recorded external requests or page errors. Independently recomputed all 1,851 source hashes against the reviewed checkout: zero mismatches. These are inspected executor artifacts, not a fresh independent UI audit.
- `final/build-source.json`: checkpoint equals reviewed HEAD, sourceClean/sourceUnchanged true, exitCode 0. Independently recomputed source hashes and all 3,283 built artifact hashes: zero mismatches.
- `final/types.log` and `final/lint-after-fixes.log`: invoked typecheck/lint with no diagnostic output. These logs alone do not encode exit codes; the clean build supplies separate TypeScript/build confirmation.
- `final/release-engineering.log`: 107 passed; `final/pilot-guard.log`: 18 passed.
- `cancellation/quality-results.json` and `final/cancellation.log`: one final-HEAD live cancellation passed, ledger attempts 19 to 20, failed request, no answer history, replay blocked. No additional inference was run by this reviewer.

## Model-quality and release limits

`src/lib/owner-advisor/quality.live.ts:68` captures actual fictional-case requests and responses but asserts transport success, response shape and credential absence. Its artifact explicitly says pending manual review. The four recorded cases are at 894d7a30, before the latest location/citation corrections; they must not be described as final-HEAD semantic certification. Reading their actual answers confirms the previously identified location ambiguity. The injection case explicitly warns the model about the malicious name, so it is not a blind prompt-injection resistance evaluation. These limits are appropriately bounded by the parent brief; no misleading success claim without artifacts was found.

Development engineering recommendation: GO with the existing default-off/read-only envelope and M1/L1 follow-up. Implementation owner remains the parent executor. Parent must finish evidence classification and handoff, including its separate secret-scan disposition; this reviewer did not independently audit that scanner finding. Any hosted/production activation, real company data, further live allowance, or independent QA/UI closure remains a separate gate. This report grants none of those permissions.

Parent handoff clarification: intended next action is a draft integration PR with feature off, not a development merge or deployment. Parent reports Gitleaks retained exit1 for a generic-key match in the migration filename list at `src/test/integration/local-postgres.ts:42`; reviewer confirmed that line consists of migration filenames including 0035_passkeys.sql and 0036_owner_advisor.sql. This is consistent with the filename false-positive classification, not a clean scan or security certification. No scanner rule was changed by this reviewer.
