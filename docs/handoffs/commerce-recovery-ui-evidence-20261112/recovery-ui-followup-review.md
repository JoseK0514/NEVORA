# Recovery UI cleanup and effects follow-up

codeQualityStatus: WATCH
recommendation: APPROVE
blockers: []

Supersedes the cleanup blocker in work/recovery-ui-review.md. Approval is code-review scope, not final candidate/hosted certification.

## Findings by severity
CRITICAL: none. HIGH: none. MEDIUM: none remaining.

LOW: The effects fixture aborts off-origin requests and records completed main-frame navigation. Its unchanged navigation list proves no completed external navigation, but does not by itself prove no attempted external navigation. If a stronger no-attempt claim is needed, record/assert the off-origin request list as well. The actual component's abort/current-controller guard remains present; no production defect established.

## Cleanup correction
The full Next browser test now reuses existing withOwnedTestResources. It registers report first, app.close second, and each acquired browser immediately thereafter. Reverse cleanup closes all browsers, attempts app/database close despite any earlier cleanup rejection, then attempts the report. Failure to read ownership still enters the report-writing finally with failed status/ownershipClosed=false. The utility retains primary and secondary errors and rejects on cleanup failure. Source acquisition precedes registration only by synchronous initialization; app creation has its own existing failure cleanup.

Independently inspected the utility and reran its four failure/lifetime tests:4/4 passed. git diff --check passed. No new cleanup abstraction or duplicated ownership mechanism introduced. Report status must still be interpreted with the outer test runner result: a browser-close failure rejects that run even if app ownership closed successfully.

## Effects coverage credibility
The fixture bundles actual CommerceRecoveryBoundary and BillingRecovery, uses actual React effects and Next's PathnameContext, and observes actual fetch AbortSignals. It exercises mounted operational shell -> recovery unmount -> shell return, disabled loading action, held status abort and held handoff abort after unmount. Responses contain synthetic presentation data and the fixture has no provider/DB connection. It is meaningfully stronger than static render assertions and is not a fake test of duplicated production logic.

Its PathnameContext is directly controlled; it does not drive full Next router caching, server layouts, or the recovery-first window.location.reload path. Therefore it does not close the full cached-router/recovery-first navigation acceptance gap. Catching fulfill rejection after cancellation is appropriate because the real browser request may already be gone. The tests establish native cancellation behavior, not how an intentionally abort-ignoring transport would behave.

## Artifacts inspected
- work/recovery-effects-second.log: one effects test passed. Its report contains both Chromium/WebKit checks, errors[], and the explicit component-fixture/full-router limitation. This run was executed by the coordinator, not independently launched here.
- work/recovery-ui-browser/commerce-recovery/report.json: passed,8 checks across Chromium/WebKit, errors[], ownershipClosed=true. It distinguishes actual local sign-in/unavailable routes from bounded status response fixtures.
- Its source-manifest.json binds d2180f7cd4f7aabcf56026cafd8bb0d2cc12ea98. ownership.json confirms closed=true, sourceVerified=true, mirrorVerified=true and no verificationError. This is evidence for that committed UI source, not a relabeled final combined source.
- Full Next four-width screenshots were not independently visually audited in this review. Browser evidence does not certify live billing, money movement, native devices or hosted acceptance.

Programming and remove-ai-slops perspectives loaded earlier were applied: existing cleanup reuse is appropriate; behavior-based effects tests use actual production components; the NODE_ENV bundler definition is browser-fixture configuration rather than production authorization or status mocking. No material remaining skill-perspective violation. No source edits, DB/browser/provider runs or CI actions performed by this reviewer. Only this report written. Root retains final source/gates/development/hosting custody, and independent audit remains open.
