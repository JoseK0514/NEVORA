# Fresh Stripe review and single fix pass

Reviewer: stripe_runtime_final_review, read-only fresh context. Range ad7417dd938ef34da9322fd19240fc6b6b64ddae..47b5954d43738e19acc9dccf093c11e95bd89139. Verdict: ready to merge with fixes; keep Tax off. No independent release/hosted certification.

## Important findings confirmed and fixed

1. Paid renewal could extend coverage after Stripe disabled automatic tax for invalid location. Sync now obtains the expected Tax choice from the sealed original intent, accepts paid coverage only from completed/enabled invoice Tax calculations, preserves previously verified coverage, commits deduplicated operator exceptions, then returns retry-required. Legitimate zero-tax completed calculations remain valid. Current subscription Tax disablement is also flagged. Audit is insert-only for the restricted API principal; namespaced receipts in the existing event dedup table prevent repeated audit rows without broadening grants.
2. A committed immediate Checkout intent could bypass Product classification validation after a failure before the first provider creation. Tax-enabled replay now first recovers any existing recent provider session for that business/operation, then revalidates the original saved price and Tax snapshot before a new POST. Changed configured IDs cannot stand in for the saved price. Ambiguous/multiple/truncated provider results fail closed. Lost acknowledgements recover the original session without another creation POST.

Regression evidence: review-fixes-red.log (four failures), review-saved-price-red.log (one failure), review-restricted-role-red.log (two failures, including saved-price case). Final owned PostgreSQL + actual SDK65/65 pass; TypeScript/lint pass. Six new owned scenarios cover Tax-disabled renewal, failed invoice calculation, restricted principal audit, pre-creation classification drift, lost-response recovery and saved-price substitution. No production permissions/schema changes. No second reviewer was dispatched; the executor verifies the one fix pass with regression and full-suite/build evidence.

## Declined to judge and executor dispositions

- Hosted restricted-key permissions, signed webhook delivery and protected payment journey: remain required acceptance gates, no hosted GO. Cost if incorrectly waived: unverified payment delivery/authorization behavior could be launched.
- Actual registrations and merchant policy: remain owner/adviser decisions; collection stays off. Cost if incorrectly assumed: wrong tax treatment. No legal determination, registration or policy exception accepted.

No Minor findings were reported. No Important finding was waived.

## Provider-side limitation

Stripe documents that invalid location can cause automatic subscription invoices to finalize without Tax and disable Tax on the subscription: [customer location and invoice finalization](https://docs.stripe.com/tax/customer-locations#handle-invoice-finalization-errors). The application can preserve correct entitlements, flag/retry and require operator review; it cannot undo a provider-side charge already collected. Before enabling Tax, verify this scenario against genuine sandbox lifecycle events, approve the collection/alert/reconciliation procedure and restore valid location/Tax settings through the approved operational process. Do not auto-refund, silently discard Tax, or self-close an unresolved financial exception.
