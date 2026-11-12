# Codex → Claude: payments and billing backend — November 11, 2026

## Scope and source

Codex owns this backend; Claude owns the Shopify and NEVORA UI. Start integration
from current development plus this candidate, preserving Claude's newer UI. Do
not import an old whole tree. The candidate starts at development
`d80da2a35b586378b59bdadc5e989baffe430165`; final runtime source is
`ed5715fc0ceac9b2b50dd358f4d7e65c1e22f56d`. Subsequent guide/evidence commits do
not change the application. The guide manifest records application hash
`23590db7820530c6b9af243d1261145320ee9a5f27e319a862d98edfedb6c4b7`.

This is implementation and isolated qualification, not live billing activation.
Jose approved self-service **upgrades after successful payment and downgrades at
renewal**, with real charges disabled during setup. The original 30-day no-card
trial deadline stays fixed. No retention/deletion timer is introduced.

## Company app contract

- `GET /api/commerce/status`: current signed-in Owner only, current company and
  installation authority before/after remote I/O, no-store. Returns the public
  `CommerceStatus` from `src/lib/commerce/status.ts`: `state`, `operational`,
  `trialEndsAt`, `paidThrough`, `graceEndsAt`, `plan`, `employeeLimit`,
  `activeEmployees`, `reason`, `billing:true`, `export:true`. Secret installation,
  Stripe and catalog identities are not browser fields.
- `POST /api/commerce/handoff`: keep the existing same-origin, current-Owner
  mutation contract. Navigate to the returned trusted `/pages/plans#handoff=…`
  URL. Do not construct your own business/customer identifiers or billing URLs.
- The restricted-workplace recovery gate admits the existing billing/export
  paths and `/app/my-pay` and its statement reads. Normal authorization at those
  routes still applies. It does not authorize writes or arbitrary descendants.
- Build the agreed shell-free billing/export layout and `/app/billing` screen
  against these contracts. Those UI screens are not created by this backend work.
- Clocker recovery uses `/clocker/access/paused?from=…` and retains the original
  `/clocker/<key>` path, including short `main` keys. Do not replace it with a
  dynamic location slug named `paused`.

## Website billing contract

Use the configured commerce API origin. Exact allowed Origin, JSON content type,
Bearer authorization and `Idempotency-Key` headers apply. Keep access tokens in
memory, scrub fragments immediately, and never send them to analytics/storage.

1. Exchange `#handoff` once with `POST /v1/handoff/exchange`, `{token}`. Use its
   `{accessToken,expiresIn:28800}` for billing calls. Recover through a fresh
   signed-in Owner handoff after token/link expiry.
2. `GET /v1/status` remains the access/payment presentation authority, including
   the current workplace's `timeZone`. Poll boundedly while reconciliation is
   pending; stop on authentication/terminal errors and pause when hidden/offline.
3. Existing `POST /v1/checkout`, `{lang?:"en"|"es"}`, returns `{url}` for initial
   enrollment. Existing `POST /v1/portal`, same body, returns `{url}` for cards,
   invoices and end-of-period cancellation. Preserve language and operation key
   on transport retries; legacy Portal request parameters remain compatible.
4. New `POST /v1/plan-change`:

   ```json
   {"plan":"team","lang":"es"}
   ```

   Use a new UUID `Idempotency-Key` for the reviewed logical action. Success:

   ```json
   {"url":"https://billing.stripe.com/…","plan":"team","effective":"after_payment"}
   ```

   Small returns `plan:"small", effective:"period_end"`. Navigate to the returned
   Stripe-hosted confirmation, which shows price/proration details and handles
   payment/authentication. Neither creating that URL nor returning from Stripe
   proves payment, confirmation or a scheduled change. Keep displaying the last
   authoritative plan until reconciliation updates it. Stripe shows the actual
   scheduled downgrade confirmation; this API is not a schedule editor.

Errors are `{error:{code}}`. Handle `invalid_plan`/`invalid_language` (400),
`unauthorized` (401), and these bounded conditions:

| Code | Status | UI action |
|---|---:|---|
| `subscription_required` | 409 | Initial enrollment instead of changing a plan |
| `plan_already_selected` | 409 | Refresh authoritative status |
| `plan_employee_limit` | 409 | Small requires at most 15 active non-Owners |
| `assisted_quote_required` | 409 | Teams above 30 require approved assistance |
| `payment_required` | 409 | Resolve outstanding invoice through existing billing |
| `subscription_change_pending` | 409 | Existing schedule, pending update, cancellation or delinquency needs resolution first |
| `idempotency_conflict` | 409 | Changed inputs cannot reuse the old action key |
| `billing_binding_changed` | 409 | Reopen from the current Owner/company session |
| `plan_changes_unavailable` | 503 | Target configurations are not activated |
| `plan_change_policy_unavailable` | 503 | Provider configuration failed policy verification; contact support |
| `temporarily_unavailable` | 503 | Preserve inputs; retry the same operation boundedly |

An Owner-only workplace (zero non-Owners) may change plans. A downgrade requires
the count to fit when requested. If it grows above 15 before renewal, the smaller
paid plan's existing capacity gate restricts operations at effectiveness; export
and own-pay recovery remain. No employee is removed automatically. Existing
trial/paid capacity is retained until qualifying positive paid replacement
coverage; legitimate initial Team trials still receive their initial tier.

## Provider preparation and activation gates

Authenticated account exposed by the connector: **Velani LLC sandbox**
`acct_1UZZK1HT1nhEuOJ2`, `livemode:false`. No live account/charge is qualified.
Actual sandbox readbacks are in `billing-evidence-20261111/portal-configurations.json`.

- Small price `price_1UZb7JHT1nhEuOJ2MsMXV7Gf` ($19/month), Team price
  `price_1UZb7KHT1nhEuOJ22VvjXawN` ($29/month), existing shared product
  `prod_VamgO8BiGYi6XU`.
- New nondefault sandbox configuration variables to activate in an isolated
  runtime: `STRIPE_PORTAL_SMALL_CONFIG=bpc_1UamoYHT1nhEuOJ2tpWyNfeQ` and
  `STRIPE_PORTAL_TEAM_CONFIG=bpc_1UamopHT1nhEuOJ2VUltf4hz`. These are public
  configuration IDs, not API credentials. Both are required together. Runtime
  verifies merchant/mode, target product/price, fixed quantity, unchanged anchor,
  `always_invoice`, `continue_trial`, renewal price decreases and current Owner.
- Default configuration `bpc_1UZb8kHT1nhEuOJ2AgU9chpR` was left unchanged. Stripe
  rejected two same-product monthly prices in one config. Target-only deep links
  preserve the existing catalog and its same-product renewal downgrade behavior.
- The runtime restricted key additionally needs Customer Portal configuration
  read access. Durable risk review needs Charges and InvoicePayments read access.
  No key/permission was created, copied or broadened in this change.
- Existing staging receiver `we_1UZdvpHT1nhEuOJ29Goa80ES` was observed **disabled**.
  Deployment/source custody, fresh sandbox hosted confirmation, signed delivery,
  queue/reconciliation scheduling and restricted-key permissions remain required
  before activation. Do not enable the historical receiver blindly.
- The located staging project `damp-haze-17022523`, branch
  `br-hidden-mud-bbnc2fxk`, still lists older commerce deployments and lacks both
  new Portal variable names. No new source/config was deployed here. Production
  commerce API readiness/plans returning 200 and an anonymous status 401 prove
  reachability only. They do not qualify payment processing or this source.
- Tax remains **off**. Sandbox Tax settings are pending a head-office address;
  merchant classification/registration and genuine jurisdiction verification
  are unresolved. Do not advertise Tax enabled or infer live status from sandbox.
- Keep a staging `commerce_api_url` out of a published Shopify theme. Do not
  populate Production, publish a theme, merge main or enable live Stripe here.

## Durable processing and Velani invoices

Signed risk events `charge.refunded`, `charge.dispute.created` and
`radar.early_fraud_warning.created` now enter deduplicated encrypted jobs and
audits. Resolve through Charge → PaymentIntent → all InvoicePayments pages →
Invoice → Subscription, validating merchant/mode/customer/company. Missing legacy
application bindings produce unresolved merchant review; contradictory identity
fails closed/retries. No automatic refund, suspension or deletion is inferred.

Velani bespoke projects retain the selected **Owner-reviewed Stripe Dashboard
invoice / Hosted Invoice Page** workflow. Approve client/project, quote,
milestones, currency, due date and Tax treatment before finalizing or sending a
real invoice. Drafts use `auto_advance=false`. The public client-hub inquiry and
Rondo have no invoice/payment authority. No new automated invoice API, real
invoice, real email or customer charge was created by this work.

## Verification, ownership and rollback

Owned disposable PostgreSQL with real Stripe SDK and fictional HTTP transport:
**159/159 passed**, including payment failure, credit/zero lines, no-paid-history
trial upgrades, legitimate initial trials, renewal projection, headcount,
identity/mode/configuration guards, replay/conflict and Owner revocation. Focused
company status/recovery: **53/53 passed**. Standards and Spec reviews are clear;
the Spec review's original trial-capacity finding and its independently approved
fix remain preserved. No hosted/live certification is implied.

Final root/build/check receipts and reviewer reports are alongside this handoff
in `billing-evidence-20261111/`. Raw RED/green runs remain in the checkout's ignored
`.omo/evidence/payments-billing-20261111/`. See `qualification.json` for the exact
local source, executed counts, skips and remaining gates. Candidate/development
delivery and exact-SHA CI are separate from hosted runtime activation.

Disable both new Portal configuration variables to stop new plan-change flows.
Existing Stripe sessions/schedules require separate operator review; do not
cancel customer schedules as rollback. Preserve the webhook/queue for legitimate
existing billing. No schema migration or existing customer/data conversion is
needed. Revert the bounded source commits together if rolling back; keep the
legacy Portal parameters and existing isolation controls.

Next owners: Codex qualifies/deploys the isolated backend when environment gates
are satisfied; Claude implements the UI against this fixed contract and performs
combined desktop/mobile/error/keyboard acceptance with Codex. Jose retains
production publication, real-invoice and live-charge approval.

Official behavior references: [Portal deep links](https://docs.stripe.com/customer-management/portal-deep-links),
[renewal downgrades](https://docs.stripe.com/customer-management/configure-portal),
[subscription webhooks](https://docs.stripe.com/billing/subscriptions/webhooks),
[Tax setup](https://docs.stripe.com/tax/set-up).
