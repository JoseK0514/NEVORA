# Native fresh final review — reviewer business_final_review

Reviewed16f7c038fdf68adb25f9f1fcfa2caecc92531027..5669ffe780e55a4e505dce81bfd6a52f1a0d5efe, plus test-only b0332ae9. Package exact diff verified. Verdict: With fixes. No Critical; five Important, two Minor. Reviewer ran TSX reproducers and inspected SQL/browser tests; did not independently rerun those suites. Evidence: final-review-reproducer.cjs, final-review-observations.log, final-review-source-evidence.txt.

Important1 scope.ts:78: CURRENT freshness omits requested window end, letting an old subwindow closing balance appear current. Include requested end, preserve historical mode and reject current cash rendering.
Important2 finance.ts:21: outer anchors allow opposite monthly discrepancies to cancel into reconciled cash/scenario. Preserve constituent-window reconciliation and shared-boundary continuity.
Important3 parse.ts:80/82: requiring occurredAt and postedAt in one window excludes cross-month posted movements. Assign posted movements by postedAt; validate occurrence independently and count once.
Important4 root store.server.ts:206 / migration0067:203: source deletion leaves structured businessEvidence in completed advisor request result. Atomically invalidate/scrub structured receipts while denying replay and preserving unrelated ordinary history.
Important5 finance.ts:52 / sales.ts:15: net-only output omits required separate inflow/outflow and sale/refund amounts/counts. Add exact breakdowns and verify Owner/model paths.
Minor1 migration0067:166: stage map counts maps twice, denying quota before200 retained payloads. Count once, test mixed199/200.
Minor2 csv.ts:63 / parse.ts:104: duplicate record detection loses offending row/physical line. Preserve safe location diagnostics.

Strengths: exact-window pointer publication; overlapping primary coverage rejection; full-read Owner/session/digest/revision receipts; all-observed-query fences; history preservation.
Declined to judge: hosted migrations/real connectors need separate environments/accounts; actual-model reasoning scores need actual evaluations; Claude B2 screens and ongoing Task8 docs/guides outside application review. Root accepts these boundaries; no omitted local backend behavior is excused. Reviewer recommended readiness after Important fixes and regressions, not hosted certification. One root regression-led fix pass follows; no second reviewer.
