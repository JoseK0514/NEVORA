# NEVORA commerce backend

This is an API and bounded worker, not a UI. Claude owns the Velani and NEVORA screens. The service uses a **separate PostgreSQL catalog**; each application company still has its own database and deployment. Nothing here provisions paid cloud resources or enables a subscription in production.

## Commands

Run from the repository root with Node 24 and `npm ci`:

- `npm run commerce:api`: standalone API. Public signup is off unless explicitly enabled.
- `npm run commerce:worker -- once`: process one durable job. A scheduler must invoke this repeatedly; it is not a daemon.
- `npm run commerce:worker -- reconcile`: recover missing checkout responses and refresh subscriptions from Stripe. Schedule separately, suggested every 15 minutes. Prints `{checked,failed}` and exits 1 on partial failure after attempting every business; alert and retry failures.
- `npm run commerce:operator -- migrate`: initialize an explicitly selected **empty, dedicated** catalog. This is not an application migration and never uses `DATABASE_URL`.
- `npm run commerce:operator -- register-slot`: register an approved, empty company database and its already prepared application deployment.
- `NEVORA_TEST_PG_BIN=/path/to/postgres/bin npm run test:commerce:owned`: create a fresh loopback PostgreSQL cluster, run commerce integration tests, then stop and remove only that cluster. Refuses application/catalog database environment variables. The default suite skips these SQL tests without its explicit owned runner.

Use a private environment/secrets store. If loading a private file, invoke Node's `--env-file=/private/path` explicitly; no real `.env` files are committed or copied. Never paste credentials or activation links into logs or chat.

## Catalog process configuration

| Variable | Meaning |
|---|---|
| `NEVORA_COMMERCE_ENVIRONMENT` | Explicit `development`, `staging` or `production`. Development databases must be loopback; staging requires its isolated principal and matching UI origin. |
| `NEVORA_COMMERCE_DATABASE_URL` | Separate catalog database. Production requires `sslmode=verify-full`. Never an existing customer's database. |
| `NEVORA_COMMERCE_ENCRYPTION_KEY` | Approved-store generated 32-byte base64 AES key. Preserve securely; rotation needs a re-encryption procedure. |
| `NEVORA_COMMERCE_ORIGIN` | Exact API origin; HTTPS outside local development. |
| `NEVORA_COMMERCE_UI_ORIGIN` | Frontend origin, default `https://www.thevelani.com`. Verification and Stripe return pages live here. |
| `NEVORA_COMMERCE_ALLOWED_ORIGINS` | Additional exact browser origins, comma separated. API and UI origins are included automatically. No wildcard. |
| `PORT` | API port, default 3100. |
| `NEVORA_COMMERCE_SIGNUP_ENABLED` | Exact `true` to accept new public signup. Default off. Production signup requires configured mail delivery. |
| `STRIPE_SECRET_KEY` | Approved-store `rk_test_` restricted sandbox key preferred; `sk_test_` also accepted. Live `rk_live_`/`sk_live_` requires production plus explicit live flag. Never use an MCP OAuth token as a runtime key. |
| `STRIPE_ACCOUNT_ID` | Expected merchant `acct_…`; required when staging/production billing is configured. Runtime verifies the current account before provider operations or reconciliation. |
| `STRIPE_PRICE_SMALL`, `STRIPE_PRICE_TEAM` | Two Stripe monthly USD Prices: 1900/2900 minor units, quantity one. The adapter verifies actual price terms before checkout. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for this environment's webhook endpoint. |
| `NEVORA_COMMERCE_STRIPE_LIVE_ENABLED` | Explicit `true` plus production environment required before a live key is accepted. This is not production authorization. |
| `NEVORA_COMMERCE_TAX_ENABLED` | Exact `true` opts new checkout intents into Stripe Tax; omitted/`false` keeps it off. Invalid values fail startup, even before a Stripe key is configured. |
| `NEVORA_COMMERCE_TAX_CODE` | Owner-approved `txcd_` plus eight digits; required only when Tax is enabled. Actual Product classification is verified. Do not copy a fixture code as a business decision. |
| `NEVORA_COMMERCE_TAX_BEHAVIOR` | Owner-approved `inclusive` or `exclusive`; required with Tax. Each configured Price must match; `unspecified` is rejected. |
| `NEVORA_COMMERCE_MAIL_ENABLED` | Exact `true` to enable the SMTP adapter; default off. |
| `NEVORA_COMMERCE_SMTP_HOST`, `_PORT`, `_USER`, `_PASSWORD` | Approved SMTP configuration. Only port 465 or 587; TLS required. |
| `NEVORA_COMMERCE_MAIL_FROM` | Approved transactional sender. No real test messages were sent. |
| `NEVORA_COMMERCE_OPERATOR_APPROVED` | Exact `true` required for production operator commands, after separate environment authorization. |

`/health` is process liveness. `/ready` verifies catalog installation. Neither proves Stripe authentication, SMTP deliverability, deployment acceptance or production readiness.

## Approved capacity

Provisioning follows `docs/product/multi-company-database-per-company-20261021.md`, not held/shared tenancy migrations. An operator separately prepares and authorizes one empty database and one deployment per company, each with its own keys, worker credentials and configuration.

Registration reads `NEVORA_SLOT_ID`, `NEVORA_SLOT_ORIGIN`, `NEVORA_SLOT_DATABASE_URL`, `NEVORA_SLOT_INSTANCE_SECRET`. The instance secret is an independent 32-byte base64url token from the approved secrets store. Do not reuse it across slots. Registration verifies the target is empty, stores its connection and instance secret encrypted, and prevents duplicate database identities and origins. No production slot was registered here.

Catalog creation, slot registration and company installation reject PostgreSQL maintenance databases and objects in any non-system schema. The installer repeats the check inside its transaction, because a previously empty slot may have changed. Connection URLs reject target-overriding query parameters such as `host` or `dbname`; production requires certificate verification and development remains loopback-only.

The company deployment must use this release and its assigned database and have:

- `NEVORA_COMMERCE_ENABLED=true` (leave absent for every existing unenrolled installation).
- `NEVORA_COMMERCE_API_ORIGIN`, `NEVORA_COMMERCE_INSTALLATION_ID`, `NEVORA_COMMERCE_INSTANCE_SECRET` matching the registered slot.
- `NEVORA_COMMERCE_UI_ORIGIN` matching the trusted Velani frontend for this environment. Set the staging origin explicitly; do not send staging handoffs to production.
- Its own `FUEL_PORTAL_ORIGIN` and normal per-company runtime configuration, selected from the release runbook. Do not copy another company's credentials.

Email-only signup and one-time verification do not accept a provisioning credential. Only the verified owner can submit the business details and credential through `/v1/setup`; repeated identical submissions queue one job, and conflicting replacements are refused. This prevents an earlier unverified signup from choosing a later verified owner's password.

A worker claims capacity under catalog locks, installs the canonical migration chain and Owner credential, and creates a durable installation binding in the **same company transaction**. Its authenticated readiness probe must confirm the deployment's business/installation binding before the trial starts. A failed probe retries the same installation; it never resets a database or extends the trial. The temporary owner password hash is removed from the catalog after readiness. With no approved capacity, setup stays pending and retries with backoff.

The application gate enforces access on operational HTTP requests and the supported payroll/notification worker entrypoints. Existing auth, role checks and export checks remain mandatory. Restricted access still permits sign-in/recovery, billing handoff and payroll record recovery, including `POST /api/timecards`, `GET /api/payroll-export/profiles` and `POST /api/payroll-export`. Payroll finalization and export-profile mutation stay gated. Protected app responses are 402 `subscription_required` or 503 `billing_status_unavailable`; Claude implements their presentation. Capacity triggers serialize new employee activation within an enrolled database and do not deactivate existing staff when a plan changes. The authority also reads actual active non-Owner headcount: an ineligible lower band restricts operations with `reason=employee_limit_exceeded` while preserving billing/export recovery. No automatic charge or staff deletion resolves a mismatch.

## Billing operations

Stripe API and webhook endpoint version: `2026-10-28.endive`, SDK 23.1.0. Subscription contracts belong to Stripe; billing access is a server projection in the catalog. Checkout returns never grant paid access. Signed events enqueue durable work; workers retrieve subscription and paid invoice state after taking the business lock. Reordered events are not replayed as facts. Grace starts from the source renewal invoice and does not restart on retry.

For an owner subscribing during the trial, Checkout setup mode collects and authorizes the payment method, then the worker creates the subscription with the **original** trial deadline. This avoids Checkout subscription mode's minimum 48-hour trial constraint. After trial expiry, normal subscription Checkout charges immediately. Only supported-price paid invoice periods grant paid access; zero-value trial invoices do not.

Subscribe/portal calls require an owner commerce bearer and an idempotency UUID. A business has at most one current open checkout. Its encrypted request parameters and 45-minute expiry are committed before calling Stripe; retrying a lost response reuses exactly those parameters and the provider key. Reconciliation can recover the provider-created session. An expired operation returns `checkout_expired`; start a new operation rather than changing an uncertain one. Invoice/customer/subscription ownership is checked against persisted business identity, not buyer-supplied email or redirect parameters. A verified successor may replace a canceled or `incomplete_expired` subscription; late predecessor events cannot replace it. Previously paid capacity is retained until the replacement price has paid coverage. Stripe return URLs contain a one-time, one-hour billing handoff in the fragment so Claude can restore the same billing session; the handoff itself conveys no payment proof.

Configure Stripe Customer Portal for the two approved prices, quantity one, payment methods/invoices, and end-of-paid-period cancellation. Do not enable arbitrary quantity/other price changes, pause policies or unapproved discounts. Configure collection retries to allow the seven-day recovery window. Refund/dispute decisions remain operator procedures; this release does not automatically delete records, issue refunds, or invent retention policy.

### Restricted-key capabilities and Tax activation

Limit the runtime key to current-account read, Prices/Products read, Customers read/write, Checkout Sessions read/write, SetupIntents read, Subscriptions read/write, Invoices read and Billing Portal Sessions write. Verify the precise Dashboard permission labels and actual sandbox acceptance; a missing capability fails closed. The API and private worker need the same verified account and approved prices; neither needs Tax registration writes, payouts, refunds, invoice send/finalize, or access to unrelated accounts. Keep the webhook signing secret separate from the API key. A successful account check is shared per runtime; failed checks retry. No API request is made for an unsigned webhook.

Jose has not confirmed tax registrations. **Keep Tax disabled.** Before opt-in, confirm merchant/legal-entity scope, registered jurisdictions, head-office address, Product classification, Price inclusive/exclusive behavior, customer location and consent/commercial wording; review any applicable Stripe Tax pricing separately. Read Stripe Tax Settings and registrations, and prove a sandbox tax result for an approved jurisdiction. A configured tax code or zero calculated tax does not establish collection obligations. No registration or paid Tax plan is created by this service.

When enabled, immediate subscription Checkout collects/stores billing address and optional tax ID and uses `automatic_tax`. Early setup Checkout collects/stores the address, shows the authorized amount plus/inclusive of applicable tax, and does not send unsupported `automatic_tax` or tax-ID fields in setup mode. The worker reads Tax terms from the encrypted original intent, revalidates Product/Price classification, and creates the deferred subscription with the original choice. Changing the runtime flag affects new intents only; pending old intents and existing subscriptions are not migrated. Missing location, classification drift or provider errors block creation and retry rather than silently disabling Tax. Retain/reconcile uncertain sessions before rotating price IDs or changing classification. Enabling/disabling Tax in settings does not rewrite an already accepted checkout.

Saved Tax-enabled Checkout retries recover an already-created provider session before any new creation; otherwise they revalidate the saved price and classification. Renewal coverage requires an enabled, completed invoice Tax calculation when the original intent authorized Tax; completed zero-tax results are valid. A disabled/failed Tax outcome retains previously verified coverage, records a deduplicated `stripe_tax_*_review` audit event and returns `stripe_tax_review_required` for retry/operator attention. No audit-read privilege is added to the API principal. An application gate cannot undo a Stripe-side charge already collected; genuine renewal-failure acceptance and an approved operator procedure are prerequisites for Tax activation. See `docs/handoffs/stripe-evidence-20261108/review.md`.

Velani bespoke projects use owner-reviewed Dashboard invoices and the Hosted Invoice Page, as selected by the official planner. Confirm client, approved quote/milestones, currency, due date, merchant identity and Tax policy before finalizing/sending a real invoice. Drafts/preparation use `auto_advance=false`; no public chat/inquiry endpoint has invoice authority. Payment/status truth comes from Stripe, not a successful return URL.

Keep webhook and worker processing enabled after closing signup. Inspect durable job state and the audit table for capacity, readiness or billing failures. Mail is at-least-once delivery: a worker crash after SMTP acceptance can resend the same one-time link. Consumed/expired links are not mailed; completed job payloads are purged. Failed jobs retain encrypted payloads and retry with bounded backoff. Provider errors are reduced to bounded codes, not secret-bearing logs.

## Activation and rollback

### Self-service plan confirmation (November 11)

`POST /v1/plan-change` uses the existing billing Bearer session, exact allowed
Origin, JSON content type and UUID `Idempotency-Key`. Body: `{plan:"small"|"team",
lang?:"en"|"es"}`. It returns `{url,plan,effective:"after_payment"|"period_end"}`.
The response creates a Stripe-hosted confirmation; it does not prove the Owner
confirmed, paid or scheduled anything. Keep the same operation key and language
when retrying. A changed request with the same key fails with 409
`idempotency_conflict`. Legacy `/v1/portal` retry inputs remain unchanged.

The opt-in `STRIPE_PORTAL_SMALL_CONFIG` and `STRIPE_PORTAL_TEAM_CONFIG` must be
distinct target-only configurations. Both are required together; absent values
leave plan changes disabled. Runtime verifies account/mode, approved price and
product, fixed quantity, unchanged billing anchor, `always_invoice`,
`continue_trial` and `decreasing_item_amount` at period end. This preserves the
existing shared-product catalog without altering the default management portal.
The runtime key additionally needs Customer Portal configuration read access.

Small downgrades require at most 15 current active non-Owners; 16–30 uses Team.
Unpaid/open invoices, pending updates, an existing subscription schedule or
scheduled cancellation block another plan change. Resolve those through billing
support/Stripe management first. If headcount grows past Small before renewal,
the existing capacity gate restricts operations when the smaller paid plan takes
effect; export and own-pay recovery remain available. No employee is deleted.
Paid invoice lines must have a positive amount to grant that price's coverage.
During the original trial no early charge or new trial deadline is introduced.

Disabling both new configuration variables stops new plan-change confirmations;
already-open Stripe sessions and provider schedules require separate operator
review. Never cancel a customer's schedule as a code rollback.

Before any real launch: verify Stripe account/test-mode checkout, approved SMTP with an explicitly approved test inbox, worker scheduling, exact deployment SHA, database separation/backup restore, ingress/client-IP rate limiting, current retention/commercial notices and cost per company. The built-in rate limiter uses the socket peer and does not trust arbitrary forwarded headers; choose an ingress strategy before public-scale signup. None of these external states is established by local tests.

Start with isolated owned fixtures, then an authorized non-production pilot. Existing customers are not automatically enrolled. Stop new signup with `NEVORA_COMMERCE_SIGNUP_ENABLED=false` if needed while retaining billing webhooks and recovery workers. Do not disable the application billing gate to bypass an incident; restore the verified release/configuration or use an explicitly approved entitlement correction. Back up the catalog and encryption key before migrations. No billing action deletes company databases. Restore code and catalog together if rolling back; never reassign an occupied slot.

API contracts and Claude's UI handoff: `docs/handoffs/2026-11-07-commerce-backend.md`. Local verification and the review-fix record: `docs/handoffs/2026-11-07-commerce-verification.md`.
