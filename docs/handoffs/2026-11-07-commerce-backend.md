# Claude handoff: NEVORA signup, trial and subscription UI

## Ownership and state

Jose authorized Codex to build the backend first, then Claude implements **all UI**. Velani is the sales/frontend website; Stripe handles subscriptions; each NEVORA company remains an isolated installation. This handoff does not authorize production publishing, live charges, real messages or changes to existing customer installations.

Backend is in `services/commerce/`, with the company-side bridge under `src/app/api/commerce/` and server access enforcement under `src/lib/commerce/`. The backend supplies no HTML pages. Follow the Velani brand and existing design system; use unpublished previews and Jose's review workflow.

See `services/commerce/README.md` for configuration, verified-vs-unconfigured boundaries, job operation and rollback. The approved spec is `docs/superpowers/specs/2026-11-07-subscriptions-backend.md`.

## Customer flow and page contract

1. Velani Plans → **Start 30-day free trial** → email signup form.
2. Verify email via a single-use link, then collect the business details and chosen password in an authenticated setup form. Submit `/v1/setup`; pending → provisioning → ready. No password or company configuration from an unverified request is used to provision an account.
3. Show the business's own application URL, Owner employee ID `OWNER`, and trial deadline. The owner signs into NEVORA with that ID and the password chosen during verified setup. Employees join through the company; they do not purchase subscriptions.
4. Owner's in-app Subscribe action calls the company handoff endpoint, opening Velani Plans with `#handoff=...`. Exchange it once for a billing session.
5. Create Stripe Checkout and navigate to its returned URL. An early subscriber keeps the original trial deadline. No card is required to start a trial.
6. On return, exchange the new `#handoff=...` and poll status. A return or checkout session ID is **never** proof of payment. Pending updates should remain an honest processing state.
7. Manage Billing opens Stripe Customer Portal; its return uses the same secure handoff pattern.

Reserved frontend routes on `NEVORA_COMMERCE_UI_ORIGIN` (default Velani):

| Route | UI responsibility |
|---|---|
| `/pages/nevora-start` | Email signup; after verification, authenticated company/credential setup. Plans may link here. |
| `/pages/nevora-verify#token=…` | Consume verification/sign-in link, scrub fragment; if setup is required, collect the authenticated setup form before polling pending/ready status. |
| `/pages/plans#handoff=…` | Existing Plans page: exchange owner handoff, then show the applicable monthly package/subscribe action. |
| `/pages/nevora-billing` | Recover billing session from fragment or request a sign-in email; show status and portal action. |
| `/pages/nevora-billing-return` | Restore billing session from fragment and poll authoritative status. |

New Shopify pages/templates need Claude's unpublished preview work and Jose's eventual publishing approval. They do not exist as shipped UI in this backend change. A plain marketing Plans visitor without an owner handoff should start a trial or request a billing sign-in email; never accept a workspace/customer/price ID from the URL as authority.

## Transport

Use the configured commerce API origin, not a guessed live endpoint. All responses use JSON and `Cache-Control: no-store`. Browser POSTs require an exact allowed `Origin` and `Content-Type: application/json`. CORS allows Authorization and Idempotency-Key; there are no cross-site authentication cookies. Keep `accessToken` in memory only; never localStorage, analytics, logs, query strings or Shopify customer fields. Scrub link fragments immediately. If the page reloads after a link was consumed, request a fresh billing link or restart from the signed-in company app. No Shopify login/SSO is required.

Errors: `{ "error": { "code": "…" } }`. Render a bounded friendly message, preserve entered non-secret form values when appropriate, and do not invent successful payment or completed setup.

### Public/account endpoints

| Method/path | Request | Success |
|---|---|---|
| `GET /v1/plans` | none | `{currency:"usd",trialDays:30,plans:[{key:"small",employees:15,amount:1900},{key:"team",employees:30,amount:2900}]}`. Amounts are cents per business/month. |
| `POST /v1/signup` | `{email}` only | 202 `{state:"check_email"}` for both new and existing addresses; intentionally no account enumeration. |
| `POST /v1/login-link` | `{email}` | 202 `{state:"check_email"}` whether or not that account exists. |
| `POST /v1/verify` | `{token}` from email fragment | `{accessToken,expiresIn:28800}`. Link is single-use, signup verification expires in 24h; a requested sign-in link expires in 30m. |
| `POST /v1/handoff/exchange` | `{token}` from `#handoff` | `{accessToken,expiresIn:28800}`. Company handoff expires in 2m; a Stripe-return handoff in 1h. Single-use. |
| `GET /v1/status` | Bearer accessToken | Status JSON below. Poll boundedly (suggest 3 seconds while setup/payment is pending), pause when hidden/offline, stop on terminal/auth errors. |
| `POST /v1/setup` | Bearer plus verified setup JSON below | 202 `{state:"setup_accepted"}`. Same payload is idempotent; a different payload after acceptance returns 409 `setup_already_submitted`. |
| `POST /v1/logout` | Bearer, `{}` | `{state:"signed_out"}`. Clear private client state. |

Verified setup example for `POST /v1/setup`, **fictional data only**. The server supplies the email from the verified session; the browser cannot select another billing owner:

```json
{
  "password": "a-user-chosen-secret-not-a-shared-example",
  "firstName": "Taylor",
  "lastName": "Example",
  "phone": "7875550101",
  "businessName": "Example Shop",
  "timeZone": "America/Puerto_Rico",
  "locationName": "Main",
  "employeeCount": 10
}
```

Password: 12–256 characters. Phone: ten-digit North American number, optional leading 1. Named IANA timezone. `employeeCount` is an initial estimate 1–30; the billing adapter reads actual active non-Owner headcount from the company server before selecting a price. More than 30 requires assisted setup/quote, not a fabricated self-service price. Business/name fields reject control characters and have bounded lengths.

Status example:

```json
{
  "businessId": "22222222-2222-4222-8222-222222222222",
  "businessName": "Example Shop",
  "setup": "ready",
  "applicationUrl": "https://company-a.example.test",
  "ownerEmployeeId": "OWNER",
  "trialEndsAt": "2026-12-07T12:00:00.000Z",
  "paidThrough": null,
  "plan": null,
  "state": "trial",
  "operational": true,
  "billing": true,
  "export": true
}
```

`setup`: required, pending, provisioning, ready. `required` means show the verified business/credential setup form; it is not a running trial. A pending setup has no application URL and no running trial. No capacity is a recoverable pending state, not success. `state`: trial, paid, grace, restricted. Show the returned deadline in the owner's timezone. Billing/export fields describe entitlement only; original role/data authorization is still enforced. Do not display an application-ready CTA before `setup=ready`.

### Billing endpoints

Both require `Authorization: Bearer accessToken`, JSON `{}`, and a client-generated UUID in `Idempotency-Key`. Retain the same key when retrying an uncertain request. The backend selects customer, company and price; do not submit Stripe IDs, amounts or a business ID.

| Method/path | Success |
|---|---|
| `POST /v1/checkout` | `{url}` for Stripe-hosted checkout. Navigate only to the returned Stripe URL. Repeated/concurrent requests reuse the open checkout. |
| `POST /v1/portal` | `{url}` for Stripe Customer Portal. |

One complete package: USD 19/month for 1–15 employees, USD 29/month for 16–30; Owner accounts excluded. No annual plan at launch. Current staff is not deactivated on downgrade; activating additional staff beyond the selected cap is rejected in the database until the owner changes plan. Explain cancellation as access through the paid period. Renewal grace is seven days. No charge/payment/tax-filing promises beyond subscription billing; NEVORA payroll still calculates statements, not employee payments or payroll tax filing.

### Company-side bridge

`POST /api/commerce/handoff` on the **company's own application origin** uses its existing authenticated Owner session and same-origin header. It returns `{url:"https://www.thevelani.com/pages/plans#handoff=…"}`. Employees/Managers cannot mint it; authority is rechecked after the network call. This is the only in-app step needed to open Velani billing; no integration secrets appear in client code.

`GET /api/commerce/facts`, `POST /api/commerce/policy`, and catalog `/internal/*` are authenticated server-to-server APIs. **Never call them from the UI or embed their secrets.**

### Expected failures/states

- 400: invalid signup/email/password/phone/timezone, assisted_quote_required, invalid_or_expired_link, invalid_json, idempotency_key_required.
- 401: unauthorized/expired billing session → obtain a new link; do not loop retries.
- 403: origin_denied/origin_required or company owner_required.
- 409: setup_pending, setup_already_submitted, subscription_sync_pending, use_billing_portal, subscription_required, customer_reconciliation_required. Keep pending state or offer the appropriate portal/support action.
- 413/415: body_too_large/json_required.
- 429: rate_limited → pause and allow a later retry; no automatic retry storm.
- 503: signup_unavailable, billing_unavailable, installation_unavailable, invalid_billing_price, temporarily_unavailable → explain unavailability and retry the **same** operation when safe.
- Enrolled company operational routes: 402 subscription_required or 503 billing_status_unavailable. Show Owner billing recovery; employee views direct the employee to their employer. Do not expose billing-owner secrets or change role permissions.

## UI acceptance and release boundaries

Claude verifies desktop/mobile, keyboard/focus, loading, empty, verification failure/expiry, capacity pending, network uncertainty, successful trial setup, checkout cancellation, payment processing/decline, grace and restricted access. Use the actual NEVORA brand/current screenshots and fictional fixture businesses. No real email/SMS, paid checkout, customer records or live signup tests without the required explicit authorization and approved inbox.

Backend local verification includes the full application unit suite, owned PostgreSQL signup/provisioning/Stripe lifecycle scenarios, direct company API authorization, HTTP transport, type checking, lint and application build. SQL fixtures create and remove only new owned loopback databases. Stripe tests use SDK transports returning fictional API responses and signed test events; they are **not** live Stripe account verification or hosted acceptance. Final counts/review notes are recorded in `docs/handoffs/2026-11-07-commerce-verification.md`.
