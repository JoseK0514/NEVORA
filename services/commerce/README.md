# NEVORA commerce backend

This is an API and bounded worker, not a UI. Claude owns the Velani and NEVORA screens. The service uses a **separate PostgreSQL catalog**; each application company still has its own database and deployment. Nothing here provisions paid cloud resources or enables a subscription in production.

## Commands

Run from the repository root with Node 24 and `npm ci`:

- `npm run commerce:api`: standalone API. Public signup is off unless explicitly enabled.
- `npm run commerce:worker -- once`: process one durable job. A scheduler must invoke this repeatedly; it is not a daemon.
- `npm run commerce:worker -- reconcile`: refresh known subscriptions from Stripe. Schedule separately, suggested every 15 minutes.
- `npm run commerce:operator -- migrate`: initialize an explicitly selected **empty, dedicated** catalog. This is not an application migration and never uses `DATABASE_URL`.
- `npm run commerce:operator -- register-slot`: register an approved, empty company database and its already prepared application deployment.
- `NEVORA_TEST_PG_BIN=/path/to/postgres/bin npm run test:commerce:owned`: create a fresh loopback PostgreSQL cluster, run commerce integration tests, then stop and remove only that cluster. Refuses application/catalog database environment variables. The default suite skips these SQL tests without its explicit owned runner.

Use a private environment/secrets store. If loading a private file, invoke Node's `--env-file=/private/path` explicitly; no real `.env` files are committed or copied. Never paste credentials or activation links into logs or chat.

## Catalog process configuration

| Variable | Meaning |
|---|---|
| `NEVORA_COMMERCE_ENVIRONMENT` | Explicit `development` or `production`. Development databases must be loopback. |
| `NEVORA_COMMERCE_DATABASE_URL` | Separate catalog database. Production requires `sslmode=verify-full`. Never an existing customer's database. |
| `NEVORA_COMMERCE_ENCRYPTION_KEY` | Approved-store generated 32-byte base64 AES key. Preserve securely; rotation needs a re-encryption procedure. |
| `NEVORA_COMMERCE_ORIGIN` | Exact API origin; HTTPS outside local development. |
| `NEVORA_COMMERCE_UI_ORIGIN` | Frontend origin, default `https://www.thevelani.com`. Verification and Stripe return pages live here. |
| `NEVORA_COMMERCE_ALLOWED_ORIGINS` | Additional exact browser origins, comma separated. API and UI origins are included automatically. No wildcard. |
| `PORT` | API port, default 3100. |
| `NEVORA_COMMERCE_SIGNUP_ENABLED` | Exact `true` to accept new public signup. Default off. Production signup requires configured mail delivery. |
| `STRIPE_SECRET_KEY` | Test key for development. No connected account or live credentials were configured by this implementation. |
| `STRIPE_PRICE_SMALL`, `STRIPE_PRICE_TEAM` | Two Stripe monthly USD Prices: 1900/2900 minor units, quantity one. The adapter verifies actual price terms before checkout. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for this environment's webhook endpoint. |
| `NEVORA_COMMERCE_STRIPE_LIVE_ENABLED` | Explicit `true` plus production environment required before a live key is accepted. This is not production authorization. |
| `NEVORA_COMMERCE_MAIL_ENABLED` | Exact `true` to enable the SMTP adapter; default off. |
| `NEVORA_COMMERCE_SMTP_HOST`, `_PORT`, `_USER`, `_PASSWORD` | Approved SMTP configuration. Only port 465 or 587; TLS required. |
| `NEVORA_COMMERCE_MAIL_FROM` | Approved transactional sender. No real test messages were sent. |
| `NEVORA_COMMERCE_OPERATOR_APPROVED` | Exact `true` required for production operator commands, after separate environment authorization. |

`/health` is process liveness. `/ready` verifies catalog installation. Neither proves Stripe authentication, SMTP deliverability, deployment acceptance or production readiness.

## Approved capacity

Provisioning follows `docs/product/multi-company-database-per-company-20261021.md`, not held/shared tenancy migrations. An operator separately prepares and authorizes one empty database and one deployment per company, each with its own keys, worker credentials and configuration.

Registration reads `NEVORA_SLOT_ID`, `NEVORA_SLOT_ORIGIN`, `NEVORA_SLOT_DATABASE_URL`, `NEVORA_SLOT_INSTANCE_SECRET`. The instance secret is an independent 32-byte base64url token from the approved secrets store. Do not reuse it across slots. Registration verifies the target is empty, stores its connection and instance secret encrypted, and prevents duplicate database identities and origins. No production slot was registered here.

The company deployment must use this release and its assigned database and have:

- `NEVORA_COMMERCE_ENABLED=true` (leave absent for every existing unenrolled installation).
- `NEVORA_COMMERCE_API_ORIGIN`, `NEVORA_COMMERCE_INSTALLATION_ID`, `NEVORA_COMMERCE_INSTANCE_SECRET` matching the registered slot.
- Its own `FUEL_PORTAL_ORIGIN` and normal per-company runtime configuration, selected from the release runbook. Do not copy another company's credentials.

A worker claims capacity under catalog locks, installs the canonical migration chain and Owner credential, and creates a durable installation binding in the **same company transaction**. Its authenticated readiness probe must confirm the deployment's business/installation binding before the trial starts. A failed probe retries the same installation; it never resets a database or extends the trial. The temporary owner password hash is removed from the catalog after readiness. With no approved capacity, setup stays pending and retries with backoff.

The application gate enforces access on operational HTTP requests and the supported payroll/notification worker entrypoints. Existing auth, role checks and export checks remain mandatory. Expired access still permits sign-in/recovery, billing handoff and listed read-only payroll export/document paths. Protected app responses are 402 `subscription_required` or 503 `billing_status_unavailable`; Claude implements their presentation. Capacity triggers serialize new employee activation within an enrolled database and do not deactivate existing staff when a plan changes.

## Billing operations

Stripe API and webhook endpoint version: `2026-10-28.endive`, SDK 23.1.0. Subscription contracts belong to Stripe; billing access is a server projection in the catalog. Checkout returns never grant paid access. Signed events enqueue durable work; workers retrieve subscription and paid invoice state after taking the business lock. Reordered events are not replayed as facts. Grace starts from the source renewal invoice and does not restart on retry.

For an owner subscribing during the trial, Checkout setup mode collects and authorizes the payment method, then the worker creates the subscription with the **original** trial deadline. This avoids Checkout subscription mode's minimum 48-hour trial constraint. After trial expiry, normal subscription Checkout charges immediately. Only supported-price paid invoice periods grant paid access; zero-value trial invoices do not.

Subscribe/portal calls require an owner commerce bearer and an idempotency UUID. A business has at most one current open checkout. Invoice/customer/subscription ownership is checked against persisted business identity, not buyer-supplied email or redirect parameters. Stripe return URLs contain a one-time, one-hour billing handoff in the fragment so Claude can restore the same billing session; the handoff itself conveys no payment proof.

Configure Stripe Customer Portal for the two approved prices, quantity one, payment methods/invoices, and end-of-paid-period cancellation. Do not enable arbitrary quantity/other price changes, pause policies or unapproved discounts. Configure collection retries to allow the seven-day recovery window. Refund/dispute decisions remain operator procedures; this release does not automatically delete records, issue refunds, or invent retention policy.

Keep webhook and worker processing enabled after closing signup. Inspect durable job state and the audit table for capacity, readiness or billing failures. Mail is at-least-once delivery: a worker crash after SMTP acceptance can resend the same one-time link. Consumed/expired links are not mailed; completed job payloads are purged. Failed jobs retain encrypted payloads and retry with bounded backoff. Provider errors are reduced to bounded codes, not secret-bearing logs.

## Activation and rollback

Before any real launch: verify Stripe account/test-mode checkout, approved SMTP with an explicitly approved test inbox, worker scheduling, exact deployment SHA, database separation/backup restore, ingress/client-IP rate limiting, current retention/commercial notices and cost per company. The built-in rate limiter uses the socket peer and does not trust arbitrary forwarded headers; choose an ingress strategy before public-scale signup. None of these external states is established by local tests.

Start with isolated owned fixtures, then an authorized non-production pilot. Existing customers are not automatically enrolled. Stop new signup with `NEVORA_COMMERCE_SIGNUP_ENABLED=false` if needed while retaining billing webhooks and recovery workers. Do not disable the application billing gate to bypass an incident; restore the verified release/configuration or use an explicitly approved entitlement correction. Back up the catalog and encryption key before migrations. No billing action deletes company databases. Restore code and catalog together if rolling back; never reassign an occupied slot.

API contracts and Claude's UI handoff: `docs/handoffs/2026-11-07-commerce-backend.md`.
