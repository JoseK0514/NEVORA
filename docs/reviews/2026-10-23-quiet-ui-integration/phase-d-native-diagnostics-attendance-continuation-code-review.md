# Native diagnostics and Attendance evidence continuation review

codeQualityStatus: WATCH
recommendation: APPROVE
blockers: None found in the pending five-file patch. Existing native runtime errors and SQL startup observation failure remain unresolved and fatal; this is publication review, not release certification.

## Scope
Reviewed working diff against HEAD 48c52fe450c7a0c55cfa3f63a5675f6eae79bd1d: .github/workflows/ci.yml, scripts/phase-d-browser-qa.mjs, scripts/phase-d-report-navigation.mjs, scripts/scoped-navigation-browser-check.mjs, scripts/release-ci-contract.check.mjs. No application/CSS diff. Source inspection only; no tests/browser/network/external actions.

## Findings
CRITICAL: None.
HIGH: None in patch.
MEDIUM: None.
LOW: scripts/phase-d-report-navigation.mjs:37 computes sameAddress afresh at request/response/terminal events against the page's then-current URL. A different-address navigation can become sameAddress=true after committing. Interpret only the request event value as the start-time reload indicator; later values mean current-address equality. If downstream analysis expects a stable request property, capture it with requestId at first observation. This does not affect application behavior, classifier eligibility or fatal gates.

## Diagnostic controls
phase-d-browser-qa.mjs installs the window binding/init script before authenticated-context pages navigate. Window errors/rejections append to report.errors as well as the new observation list. Existing pageerrors remain handled by the unchanged API cancellation branch or fatal error branch; the new RSC/framework errors remain in the fatal branch. Precisely: this patch does not newly make every historically excluded /api/ native diagnostic fatal. It does not broaden that exclusion. New document snapshots, native-name boolean and monotonic time add no URLs or input values.

Existing WebKit mechanism calibration runs in separate disposable contexts and validates real thrown/rejected window controls. Only windowObserverVerified is required by the new caller; mechanism-reproduced is recorded, not converted into an application exception. Calibration/setup errors propagate through existing catch/finally. This is valid diagnostic calibration, not proof that the actual role-change errors are harmless. Public recovery context still has its existing pageerror observer and does not get the new window binding; that is outside the role-control coverage, not evidence of global window-observer coverage.

The role case still changes role, dispatches storage, releases the original intercepted RSC, checks employee destination and retired private source, and restores role/access scope. Its new outer finally removes trace listeners even on source-entry/setup failure. Existing mutation cleanup remains awaited. The shared page document observer lasts for page lifetime; browser teardown disposes it. No accumulating observer is installed per role attempt.

observeReportNavigation bounds retained events at64 with dropped count, uses weak request identities, filters navigation events to main frame, and projects static resource categories/status/booleans rather than queries, credentials, bodies or arbitrary URLs. It includes /app requests and same-address document requests without changing browser-navigation-diagnostic.mjs classification logic. Frame events can also be client history commits, so they are not alone document-commit proof. The combination of request IDs, navigation flag, terminals, pageerror monotonic time and window observations improves ordering evidence without proving causality. Existing stage labels remain last-marked phase, not a cause claim.

## Workflow and contracts
All eight guarded execution/receipt steps require !cancelled() and successful attendance_runtime. Runtime installation retains implicit prior-step success, follows browser/runtime setup, and has no continue-on-error. Later independent steps can collect evidence after an earlier failed scenario, while failures remain in job outcome. Owner advisor remains an earlier mandatory fatal step. Existing40-minute job budget and all scenario deadlines remain unchanged; later evidence can still be truncated by the job budget, which is a coverage limit rather than a reason to relax it.

Whole-phase raw errors, remediation runtimeErrors/results, SHA/source custody and UX presence validators remain. phase-e-evidence still depends on six mandatory jobs; the browser matrix feeds its unchanged phase-e-ui aggregator. No leaf/aggregate job or failure predicate was removed, and the all12 publication requirement is not weakened by these step guards. The recursive SQL-report upload remains limited to the long-path startup evidence subtree as reviewed separately.

The added parsed-workflow contract checks all eight exact guards/order, disallows job/step continue-on-error, and checks retained validator expressions. Exact guard checks protect a real execution policy rather than mirror incidental production implementation. Regex presence checks alone cannot establish validator semantics, but the actual unchanged validator bodies were inspected and remain fatal. Existing mandatory-job result-state contracts remain in place.

## Perspectives and limits
remove-ai-slops and programming perspectives applied from previously consulted skills: existing utilities reused, no unnecessary production parsing/abstraction, no deletion-only tests or weakened assertions. No additional runtime success claimed. The upcoming actual cloud trace must establish request ordering and window exception observations; neither calibration nor functional destination passes resolves retained native errors. Prior reports preserved; no-ULW-plan fallback artifact path used.
