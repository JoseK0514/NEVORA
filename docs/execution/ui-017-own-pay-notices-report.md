# UI-017 own pay-statement notice adapter

Isolated UI adapter prepared from the frozen UI-015 delivery source. Finance retains publication/current-role/recipient/location authorization. This increment does not claim acceptance against Finance's pending final predicate.

## Source / scope

Branch `codex/nevora-own-pay-notices-ui-20261012`, code checkpoint `bf91d4058328e74c1613927f6e25c50956b8d5c1`, base `a44fce7c3b0470aa9250f983d64d79c22f5371ef`. Separate clone `ui-own-pay-notices`; UI-015 and the synthetic b6e7c44 preview remain unchanged. No push/merge/deploy, new dependencies, schema changes, real sends or production data.

Only production change: `src/lib/data/employee-notification-list.server.ts`. Add PAYROLL_STATEMENT to supported own sources, register the exact imported `payrollNoticeReadSql(id,recipient)` in the common finite replay manifest, project its metadata after canonical authorization, and include observed read_at in candidate membership. Payroll deliberately has no generic SourceSnapshot; no fake source or private financial snapshot is constructed. Source-read failure is unavailable, not an all-clear list. Final protected observation and in-memory canonical replay remain mandatory with no executor fallback.

The directly relevant new test file exercises the actual repository source check with a transport-contract fixture; it does not pretend to evaluate Finance SQL. The carry-forward Time Off fixture was adjusted to recognize the expanded discovery metadata SELECT; its assertions and 64-read limit remain intact.

## Requirements / disposition

| Requirement | Disposition |
|---|---|
| Own Employee/Lead notices missing | Corrected in adapter; baseline browser reproduced zero unread/partial despite actual own published notice |
| Own Manager/Owner notices | Existing path preserved; all four roles pass actual legacy-assembly browser checks |
| Canonical source/template | Exact two-argument Finance query common to protected manifests; no custom payroll authorization |
| Final authority/replay | Current source/version/intent/session changes deny or omit; no fallback reads after final observation |
| Minimal private notice | Constant pay-statement label, timestamp, own notification ID, safe protected open href and read/action states only; no salary/tax/HR values or payment assertions |
| Destination | Existing protected open path rechecks source and opens My Pay |
| Read / acknowledgement | Observed notification read_at is distinct from explicit announcement acknowledgement and statement availability; no new read mutation capability |
| Other supported sources | Existing SourceSnapshot/receipt projection unchanged; Time Off capacity/confirmation and other regression suites retained |
| Finance final native boundary | Pending frozen final predicate and independent assembled privacy/coverage acceptance |

## Evidence actually run

- RED adapter: 8 failures / 8 passing tests before implementation. Ordinary manifest rejected the query and Employee/Lead own positives failed.
- Affected suites: 73/73 passing in seven files.
- Baseline production HTTPS browser at `4d25ee9a`: actual published Employee/Lead notices existed, but bell exposed zero unread and partial coverage; both failing reproductions retained.
- Candidate production HTTPS browser at `bf91d405`: 48 passing role × engine × width surfaces (Owner/Manager/Lead/Employee; Chromium/WebKit; 320/390/768/820/1024/1440), keyboard bell/open navigation, My Pay destination, whole-page axe WCAG A/AA, no horizontal overflow/page errors. Three additional actual API/open checks passed (foreign open, observed read state, unknown/superseded source).
- Two initial negative harness assumptions failed and remain retained: attempting to delete an immutable publication was correctly blocked; Employee→Lead is still an authorized own reader and did not revoke access. No application/control was changed to accommodate those assumptions. Corrected negative harness uses normal generation/publication and actual deactivation.
- Corrected negative-only browser: 5/5 passing at the same source, including real generated/unpublished → normal publication and account deactivation. Owned source/mirror custody and PostgreSQL teardown pass. The earlier negative run also retained one harness return-shape error; it was corrected against the actual period-close contract without changing the application.
- Full default suite: 7,421 passing / 801 console-reported skipped, 409 files passed / 27 skipped, exit 0. Another 55 held native Portal fixture assertions are not reported as executed successes.
- Typecheck/scoped lint: exit 0; actual command completion receipts are in `ui017-evidence/command-exits.json`.
- Fresh whole-branch review: WATCH / APPROVE for independent combined QA, no blockers; reviewer independently reran 73/73 affected tests. Two test-quality findings are deferred as Minor after grading current user impact; original severity labels remain preserved in the raw report. No production changes followed review.

All runtime data is owned, fictional local PostgreSQL. Build runs the exact committed source mirror with only owned DB transport substitution, production secure cookies and a test-only loopback TLS certificate. No external sends or notification dispatcher; local payroll fixture worker only generates/publishes fictional documents and enqueues local notices. Real predicate results here refer to the unchanged legacy backend in this clone, not the final native Finance candidate.

Evidence: task-root `ui017-evidence/`; harness `ui017-browser.mjs`. `preserved-contracts.json` verifies eight unchanged Finance/source/open/API/UI modules. Each owned mirror records source hashes and teardown. Root implementation report and `ui017-evidence/handoff.json` identify the exact code checkpoint and final documentation-only delivery tip. Raw review, disposition and execution ledger are preserved in `docs/execution/ui-017-review-evidence/` and the external evidence directory.

## Leadership / controls

CPO: bounded existing workflow repair; no new workforce/payroll features. CTO: canonical imported interface and final replay, minimal change. CISO: metadata only, recipient source authority, denial after discovery, final Finance coverage remains a privacy gate. Delivery: isolated adapter candidate and frozen source handoff; coupled acceptance pending. Governance: GO WITH CONDITIONS for local preparation, no release authority or material exception. Technical assurance: preserve immutable publication truth and validate negative cases through normal creation rather than bypassing controls.

## Remaining gates

Finance core commit `268a769ea1477a281f0c8711127df53ca2c0f367` and root assembly `efb7ffda79e4e5555f0f0faf16224ee302e719d9` are now identified; their stable handoff/API contract is being sealed. They are not imported or modified by this candidate. Final assembly must use that exact current-role/publication/employee-document/location predicate and coverage evidence. Assemble this UI increment with that backend, rerun positive/negative/replay cases, and obtain independent privacy/UI/QA acceptance. Existing UI-010/UI-011/UI-016 remain DRAFT. Physical devices, manual screen readers, native zoom and hosted/production readiness are not certified here.

Employee/Lead generic Mark read controls are not added by this adapter. Their existing explicit notification/announcement action behavior is preserved. This candidate introduces no payment wording, management grants or broader statement access.

## Rulings made

1. Separate clone protects the frozen policy candidate/preview; cost: disk and a separate integration increment.
2. Prepare the adapter against the unchanged Finance query interface while final authorization is pending; cost: assembled privacy acceptance remains open.
3. Preserve explicit read/acknowledgement controls and use observed read metadata; cost: no new Employee/Lead generic Mark read controls in this increment.
4. Use normal fictional generation/publication for the unpublished negative and actual account deactivation for access loss; cost: extra local fixture work. Neither immutable ledgers nor legitimate self-access are weakened.

## Final review / deferred minors

The final protected query assembly and recipient binding were inspected as correct by a fresh reviewer. The new transport fixture should additionally assert the canonical final SQL and exact document/recipient parameter slots; its discovery-shaped synthetic facts cannot certify the final Finance boundary. Remove its unnecessary `as never` cast in future test-quality work. Both are deferred Minor for current user impact, without changing the raw reviewer grades. No blocking production defect was found, no fix pass or second review was needed, and no independent acceptance gate is self-closed.

Reviewer areas set aside are explicit rulings: exact final Finance authorization, full native generation coverage, generic Employee/Lead Mark read capability, hosted readiness and complete pixel fidelity each remain bounded or pending, with costs recorded in the final disposition and execution ledger. The foreign fixture is discovery-time denial, not proof of a later intent reassignment race.

The branch is retained locally as the Owner instructed. The original public synthetic preview remains on b6e7c44; neither this increment nor UI-015 is represented as already included in that preview. No required Owner decision is needed to preserve this review candidate. The next gate is exact Finance assembly plus independent UI/privacy/QA acceptance.
