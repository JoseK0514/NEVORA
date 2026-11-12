# Plan-change Spec review

codeQualityStatus: BLOCK
recommendation: REQUEST_CHANGES

Reviewed `git diff 11042d6a5...9771521bb` (single commit `9771521bb`) against the tracked completion plan's “Additional approved plan-change policy.” Application checkout was clean. No application changes, provider operations, or hosted certification.

## CRITICAL
None.

## HIGH
**Unpaid trial upgrades grant Team capacity.** New `services/commerce/plan-change.ts:58` admits `trialing` subscriptions, while the shared projection at `services/commerce/stripe.ts:330-334` retains previous capacity only if `business.paidThrough` is truthy. A Small trial has no paid history; when hosted confirmation changes its subscription price to Team, sync chooses Team even with zero paid invoices. This contradicts the spec: “paid upgrades apply after successful payment” and “prevent granting larger capacity from an unpaid upgrade.” Trial preservation does not authorize bypassing the paid-upgrade rule.

Independent reproduction invoked the actual `StripeBilling.syncSubscription` with a fictional Small-trial business (`paidThrough:null`), current Team provider price, and an empty paid-invoice list. Observed `{limit:30, plan:'team', paidInvoices:0, originalPlan:'small'}`. No network/database calls occurred. The added unpaid-upgrade tests first seed Small paid coverage, so they miss this branch.

Required fix: retain the existing plan for an upward change without qualifying paid coverage even when there is no prior payment; preserve legitimate initial trial-plan assignment and the original trial deadline. Add a real catalog/SDK regression for a Small trial changing to Team with no paid history, followed by qualifying payment. If free trial upgrades are intended instead, that is a policy change requiring explicit scope reconciliation.

## MEDIUM
None.

## LOW
None.

## Evidence and perspectives
Inspected `plan-change-green.txt` (156/156) and `plan-change-typecheck.txt`; these are executor receipts, not independently rerun suites. Reviewed API tests, SDK fixtures, configuration enforcement and projection code. Reapplied the loaded remove-ai-slops and programming perspectives: no deletion-only/prose/tautological tests or unnecessary boundary parsing identified; the material gap is missing behavior coverage above.

Target-only configuration checks enforce unchanged billing anchor, continued trial, immediate invoicing and renewal downgrade scheduling. Hosted behavior, live activation and actual financial acceptance remain separate gates.

Blockers: close the HIGH unpaid-trial capacity defect with regression evidence.
