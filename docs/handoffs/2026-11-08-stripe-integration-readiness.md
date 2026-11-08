# Stripe integration readiness — Velani and NEVORA

Jira: [SCRUM-174](https://thevelani-team.atlassian.net/browse/SCRUM-174). Codex owns logic; Claude owns UI. This continuation starts at ad7417dd938ef34da9322fd19240fc6b6b64ddae. No other chat, shared branch, production deployment or Velani theme was changed.

## Delivered

1. User-requested setup order completed: CLI1.55.8 -> Codex agent plugin82fd64bc -> official MCP planner. Verified account `acct_1UZZK1HT1nhEuOJ2`, Velani LLC sandbox, livemode=false. Accepted guide `iguide_61ViylNn83ZdXlB0f41HT1nhEuOJ2`; exact initial/accepted JSON retained under `.omo/evidence/stripe-velani/2026-11-08/`. Earlier UnknownTool diagnostics are historical and resolved.
2. Velani bespoke projects: owner-reviewed Dashboard invoices and Hosted Invoice Pages. No public inquiry/chat billing API or invented real quote. A fictional sandbox USD1 invoice was finalized with `auto_advance=false`, never sent; its recipient uses the non-deliverable `example.invalid` domain. Hosted page creation is verified, not payment completion.
3. NEVORA: existing bounded no-card trial, genuine Owner authority and fixed monthly source plans preserved. Restricted sandbox/live key prefixes are recognized with existing live safeguards. Hosted billing requires an explicit expected merchant account; account mismatch fails before checkout, portal or reconciliation. Failed lookup can retry; a successful lookup is shared per runtime. Price mode is checked before checkout and paid-access reconciliation.
4. Optional Tax implementation defaults OFF. Explicit code and inclusive/exclusive policy are required; Product/Price configuration is checked. Immediate subscription Checkout supports automatic tax/address/tax IDs. Early setup Checkout collects/stores address without unsupported automatic-tax/tax-ID fields; deferred creation uses the authenticated encrypted original intent's Tax terms. Flag changes never silently tax an old Tax-off intent or remove authorized Tax. Classification changes/missing location fail closed; successful reconciliation never treats return URLs as payment.

Implementation commits: d3183f687 (runtime/account),92ab07740 (installed SDK current-account types),bf9573bfd (conditional Tax). No dependency or schema change.

## Provider sandbox evidence

See `stripe-evidence-20261108/sandbox-readiness.json` for IDs and bounded receipts. Payment URLs, API keys, client secrets and signing secrets are excluded.

- Source-priced Small/Team test prices: USD19/29 monthly, quantity one. Tax behavior is deliberately `unspecified` until approved, and automatic tax is off. These sandbox objects do not authorize live commercial terms.
- Actual setup-mode required billing-address/customer-update parameters accepted by Stripe.
- Actual immediate subscription session accepted with the sandbox monthly price and Tax disabled. No card entered and no payment completed.
- First/default sandbox Customer Portal configured and session accepted: payment methods, invoice history and end-of-period cancellation enabled; plan/quantity changes, pause, public login and unrelated customer updates disabled. No live portal configuration changed.
- Fictional invoice first correctly rejected a missing email; after adding a non-deliverable fictional address, draft/item/finalize succeeded without an email-send call or automatic collection. The fixture amount/due date are not real approved quote terms.
- Tax Settings are `pending` with `head_office` missing; zero sandbox registrations. Jose answered real registrations **Not sure yet**. Sandbox state is not evidence of legal obligations. No head-office data, tax code, jurisdiction, registration, filing service or paid Tax plan was set.

## Verification and limits

RED/GREEN logs retained in this plan's `.superpowers/sdd/2026-11-08-stripe-runtime-tax/` workspace until final review; durable evidence is copied into the Stripe evidence directory before cleanup. Runtime tests first failed4/7; merchant/price scenarios failed3; reconcile entry guard failed separately. All pass after implementation. Conditional Tax scenarios first failed6; final owned PostgreSQL + actual SDK fixture suite passes59/59. Integrated onboarding-commerce PostgreSQL acceptance passes17/17, including current Owner, isolation, trial and signed lifecycle cases. TypeScript and lint pass.

The initial broader root run reported three unchanged5second timeouts and one dependent mock-state failure while another worktree's suite also ran. Both affected unchanged files pass82/82 in isolation with unchanged assertions/timeouts. Full rerun and source-custodied build results are recorded below when completed; do not infer them from targeted checks.

These are distinct states: MCP OAuth authenticated; provider parameter acceptance verified; application code fixture-tested; hosted runtime not verified. The deployed isolated staging source remains81d3d1d07; this new Stripe code is local/detached and has not been deployed or pushed. Prior independent/UI release gates remain open.

## Hosted acceptance gates and next action

- Securely configure a least-privilege sandbox runtime key in the dedicated staging secret store as `STRIPE_SECRET_KEY`, never in chat. MCP OAuth cannot be extracted or substituted. Required capabilities are in `services/commerce/README.md`; account-read capability must be tested with the actual key.
- Bind `STRIPE_ACCOUNT_ID=acct_1UZZK1HT1nhEuOJ2`, the two receipt price IDs, explicit staging environment and the correct endpoint signing secret. Never reuse a live key or another account's webhook secret. Do not enable public signup/mail/live payment flags merely because these variables exist.
- Stripe must reach `POST /api/billing/webhooks/stripe` (standalone API: `/webhooks/stripe`). Current Vercel SSO blocks unauthenticated provider requests. Retain protection; no bypass key, share link, exception or policy change was made. Choose/review narrowly scoped signed-webhook ingress before endpoint activation. API version must match2026-10-28.endive; subscribe to used checkout completion/async-success, subscription and invoice events. Real signed delivery/replay/retry acceptance remains required.
- Configure/verify private billing worker and reconciliation scheduling, protected application readiness and SMTP/provider onboarding dependencies. Then test the actual A/B Owner journey, trial subscription, verified invoice payment, failed renewal/recovery/cancellation and isolation with fictional data. Claude's finished screens and browser/mobile/accessibility acceptance are separate.
- Before enabling Tax, confirm actual registrations/merchant scope with the owner/adviser, head-office address, product classification, inclusive/exclusive policy and commercial wording, then demonstrate a sandbox taxable/non-taxable result for approved jurisdictions. Existing intents/subscriptions require an explicit migration decision; toggling the flag does not rewrite them.

Engineering recommendation: proceed with sandbox credential/ingress acceptance. Security position: retain account/mode/Owner/signature gates and SSO; no exception accepted. Governance: GO WITH CONDITIONS for local preparation, BLOCKER for hosted/live launch. Codex owns backend follow-through; Claude owns UI; Jose controls Tax/business decisions and production authorization. Rollback: stop new checkout creation, retain worker/webhook reconciliation and original encrypted intents, restore verified code/configuration; never delete/recreate customers/businesses to retry uncertain payment state.

Once Tax-enabled intents exist, retain a Tax-aware worker during rollback until those intents are reconciled or explicitly expired. Do not downgrade their processing to the older Tax-unaware implementation; that would drop authorized Tax terms.
