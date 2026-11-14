# Payments and billing backend completion — November 11, 2026

Scope: resume SCRUM-174/169 backend work from freshly fetched development `d80da2a35b586378b59bdadc5e989baffe430165`. Preserve Claude's UI, the three permitted branches, private source, approved trial/access rules and production controls. This detached worktree owns only billing backend/recovery integration, tests and handoff. Production activation, live prices, Tax registration/collection and actual customer invoices remain separately gated.

## Work

- [x] Inspect source, Jira, prior sandbox receipts, current account and development inventory. Stripe connector currently exposes only Velani LLC sandbox `acct_1UZZK1HT1nhEuOJ2`, livemode=false. Inventory passes 73 classified sources / three branches. Existing sandbox webhook is disabled; do not describe it as active.
- [x] Reproduce missing current-workplace time-zone behavior: five of six approved status tests fail against unchanged development. Preserve RED receipt.
- [x] Recover the three previously approved server fixes `ab9375d7b`, `2558bebc3`, `341066bd3` onto current development without importing an old whole tree. They restore billing locale, current-workplace time zone, retry-compatible Portal parameters and bounded tablet recovery paths. Focused 29/29 tests pass.
- [x] Complete the authenticated Owner status bridge and recover the already-approved presentation contract from `1ea5511a`, adapting it to current isolated-company and current-authority lifetime checks. Do not overwrite current enrollment/credential controls.
- [x] Preserve recovery access for Owner billing/payroll export and Employee own statements, with operational mutations still restricted. Keep the existing paused Clocker key, including short `main` keys, across recovery.
- [x] Inspect Stripe risk-event and operator-review handling against official current-version documentation; implement missing durable, deduplicated review routing without issuing refunds or inventing an automatic suspension policy.
- [x] Run owned PostgreSQL/Stripe-SDK scenarios, relevant auth/route/gate regressions, typecheck/lint and the full root suite. Review the final diff independently and commit source/evidence in the detached checkout.
- [x] Write the final API/UI handoff, current runtime/provider configuration facts, rollback, exact source identity and remaining hosted/business gates. Distinguish sandbox/source qualification from live activation.

## Controls and rulings

- Engineering: retain existing Checkout/Customer Portal/transactional queue architecture and immutable provider idempotency inputs. Missing integration is not a reason to rebuild billing.
- Security: current Owner and company installation must remain valid before and after remote I/O. No cross-company credentials, full environment dumps, public tokens, arbitrary redirect targets or provider error secrets.
- Product: 30-day no-card trial, assisted setup above 30 and restricted export/my-pay recovery retain their approved meaning. A new refund or cancellation policy is not inferred from this task.
- Governance: code and isolated verification are authorized; source-bound CI/development delivery and production have distinct gates. No production deployment, Shopify publication, real charge/invoice/email, new subscription or Tax activation during local qualification.
- QA uses disposable loopback PostgreSQL and fictional Stripe network fixtures; never production credentials. Existing provider/inbox tests stay tied to their recorded source.
- The existing server patches were absent from current development, despite historical local delivery. Cherry-pick only those commits; preserve all newer source around them.

Ledger and receipts: `.omo/evidence/payments-billing-20261111/`. Claude owns visual implementation against the resulting contract.

## Qualification progress

### Additional approved plan-change policy

Jose approved self-service plan changes: paid upgrades apply after successful payment; downgrades take effect at renewal. Real charges remain disabled during setup. Trial deadlines must not move.

Stripe rejected listing both existing monthly prices on their shared product in one Portal configuration (duplicate interval). Its documented renewal downgrade feature requires the same product. Preserve the default card/invoice/cancellation configuration and use two nondefault, target-only configurations with hosted `subscription_update_confirm` flows. Both were created in the sandbox only; runtime activation and actual hosted acceptance remain distinct gates.

- [x] Add a current-Owner `/v1/plan-change` contract, server-side target configuration selection, renewal/paid policy validation, immutable provider retry identity and bounded errors.
- [x] Reproduce and prevent granting larger capacity from an unpaid upgrade or a negative credit line on an otherwise paid invoice. Verify trial preservation, renewal downgrade, headcount and identity/authority guards.
- [x] Independently review the added policy work, regenerate source-bound guide provenance, rerun qualification and record precise provider/hosting limits for Claude.

Final local qualification: owned commerce **159/159**, focused company recovery **53/53**, root **12,639 passed / 895 skipped / zero failures** (851 passed files, 33 skipped). Typecheck, lint (one pre-existing warning), production dependency audit (zero vulnerabilities) and source-bound optimized build pass. Standards CLEAR; Spec CLEAR after its independently reproduced trial-capacity finding was fixed and independently reassessed. Guides are rebound to runtime `6db25fed8`; application hash `912a4daeb3484c0a80f6c65e402968bf68b6a0316fe0fd2a071a3507939e8d14`.

Final contract and compact receipts: `docs/handoffs/2026-11-11-codex-to-claude-payments-billing.md` and `docs/handoffs/billing-evidence-20261111/`. Exact-SHA CI/development delivery remains separate from hosted/source/config activation and genuine sandbox confirmation/queue acceptance. No live customer, invoice, email or charge was created. Do not treat this checklist as production certification.

CI follow-up: candidate `72b8eb01a` failed the strict onboarding inventory on two new paths; remaining CI was canceled after preserving the failure. Corrected with explicit dispositions and a new inventory regression, not an exemption. Added missing native POST admission and paired configuration-name admission only for `commerceapi`; other roles still deny those names. Independent Spec/Standards reviews CLEAR. Native184/184, inventory8/8, commerce159/159 pass at corrected runtime `6db25fed8`. Local DB onboarding234 and CompanyAccess516 plus exchange pass; missing pg_dump clients/output-directory constraints were environment failures, preserved separately. The final enrollment/workforce components passed using external evidence directories. A complete combined local runner pass is not claimed. Replacement source qualification/CI follows this correction.

- Owned PostgreSQL + real Stripe SDK: **123/123**. Owner/status/recovery focused tests: **53/53**. Typecheck passes. Real provider network is replaced only by explicit fictional fixtures; no live payment, email or customer data test.
- Checkout integration labels are generated inside the persisted immutable intent, not on transport retries. Existing saved intents remain unchanged. An assertion first failed with a missing identifier, then passed after adding it.
- Initial root suite: **12,624 passed / 869 skipped / 1 failed**, solely `src/test/manual-publication.test.ts` because runtime source changes invalidate the R32 application hash. Regenerate the six guide PDFs with the existing offline builder from clean committed application source, then rerun without weakening that check. Source compile also caught a typed-array formatting issue; it was corrected and typecheck rerun successfully.
- Fresh public checks: commerce readiness/plans return 200 with www CORS, status without a bearer returns 401. Stripe account discovery exposes sandbox only; its old webhook is disabled, Customer Portal permits payment-method/invoice access and end-of-period cancellation but not plan/quantity changes, and Tax settings are pending `head_office`. These are observed preparation facts, not live billing qualification.

Replacement local qualification at documentation checkpoint `7b8280f68` / runtime `6db25fed8`: root12,639 passed,895skipped,zero failures; types/lint/build pass, sourceUnchanged=true. This supersedes the earlier root/build receipt while retaining original failed CI and local runner artifacts. No application source changed after the independent native follow-ups. Ordinary development delivery and exact-SHA CI remain the next source gate; production stays closed.
