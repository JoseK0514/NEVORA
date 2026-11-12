# Spec review — billing completion

codeQualityStatus: WATCH
recommendation: REQUEST_CHANGES

Scope: fixed diff `d80da2a35b586378b59bdadc5e989baffe430165...8610a89eb943566f6fa60ca497754eac0eebe27c`. Read AGENTS.md, completion plan, commerce README, November 7 commerce and November 9 website contracts. No application edits or provider actions. ULW status returned ULW_LOOP_PLAN_MISSING, so this is the required fallback report path.

## CRITICAL
None.

## HIGH
None.

## MEDIUM
- **Unrelated subscription risk events never reach operator audit.** `services/commerce/stripe-risk.ts:60-61` throws when an otherwise valid same-merchant subscription has no `nevora_business_id`. The plan requires “durable, deduplicated review routing without issuing refunds or inventing an automatic suspension policy.” Unlike one-off invoices and unknown valid business IDs, this legitimate unbound subscription cannot reach the merchant-scoped unresolved audit at lines 65–76; worker retries cannot repair absent product metadata. A shared merchant can receive these events independently of NEVORA. Treat absent NEVORA metadata as unresolved merchant review, while preserving rejection of contradictory customer/mode/identity information. Add a real-SDK/catalog regression for this case.

Direct isolated reproduction called `reviewStripeRisk` using a fictional paid InvoicePayment → subscription invoice → same-customer subscription with `metadata:{}`. Result: `{error:'stripe_risk_identity_mismatch', auditReached:false}`. No network or database was used.

## LOW
None.

## Verification and skill perspectives
Loaded and applied `remove-ai-slops` and `programming`: no deletion-only, prose-pinning, tautological tests, or unnecessary production parsing found in the reviewed changes. Provider validation and browser-field projection protect actual trust boundaries. Tests exercise retry stability, pagination, atomic audit writes, authority expiry, Owner generation and recovery write denial.

Inspected `commerce-green.txt` (123 passed), `recovery-green.txt` (53 passed), and `typecheck.txt` under `.omo/evidence/payments-billing-20261111/`; these are executor receipts, not independent reruns. Reviewed tests and reproduced the finding independently. No claim of full-suite, hosted, UI, inbox, operator or production acceptance. Final root/build qualification remains the parent's responsibility.

Trial, paid-invoice access, assisted setup, bounded recovery and Owner/company isolation remain consistent with this backend scope. Velani invoices retain owner-reviewed Dashboard authority. No new UI is required by this pass.

Blockers before approval: resolve the MEDIUM risk-routing gap above and provide its regression evidence.


# Bounded reassessment — 39bf092e686a550b62c2247ef7640f04246dc638

codeQualityStatus: CLEAR
recommendation: APPROVE
blockers: []

The original MEDIUM finding above is preserved as historical REQUEST_CHANGES and is now resolved for this bounded diff (`8610a89eb943566f6fa60ca497754eac0eebe27c...39bf092e686a550b62c2247ef7640f04246dc638`). At `services/commerce/stripe-risk.ts:62`, absent product metadata now continues to the existing merchant-scoped unresolved audit. Subscription identity, mode and customer checks still precede this branch; malformed nonempty business metadata still fails closed.

Inspected the added real catalog/SDK regression at `services/commerce/stripe-risk.integration.test.ts:82`. It verifies processed work, a null-business unresolved audit, and unchanged customer/subscription bindings. This is behavioral regression coverage, not an implementation-mirroring test. The already-loaded remove-ai-slops and programming perspectives were reapplied; neither perspective identifies a violation in this bounded fix.

Inspected executor receipts `merchant-risk-red.txt` (new regression fails with retry_scheduled; 123 other tests pass) and `merchant-risk-green.txt` (124/124 pass), plus `typecheck.txt`. Independently reran the earlier fictional-adapter reproduction against the corrected function: it now emits `[null, "stripe_risk_unresolved:charge.refunded:evt_external:ch_external"]`, without provider/database calls. The owned SQL suite was not independently rerun.

Remaining CRITICAL: none. HIGH: none. MEDIUM: none. LOW: none in this bounded reassessment. This closes the Spec-axis finding only; full release, generated manuals, hosted UI/inbox/provider/operator acceptance and production authorization remain separate gates. No application or Standards-report edits.
