# NEVORA subscription backend

Approved source: Jose's conversation on 2026-11-07: implement all backend before Claude implements UI. Velani is the sales site; Stripe is billing; NEVORA owns accounts and access. No UI changes, real messages, real charges, cloud provisioning, production migration or deployment are authorized by this build.

## Behavior

- Email-only signup followed by verified owner business/credential setup, 30-day no-card trial beginning only after successful provisioning. Owners reuse the same credentials in the company app. No Shopify account is required.
- One complete package: USD 19/month for 1-15 active employees, USD 29/month for 16-30; larger teams require an assisted quote. Owners are not billed as employee seats.
- Secure owner-only checkout and billing portal. Early checkout preserves the original trial deadline. Cancellations retain paid-through access. Failed renewal grace is seven days. Expired accounts retain billing/export recovery access; this work never deletes business records.
- Preserve the supported one-company database/deployment architecture. The worker claims explicitly approved empty installation slots, installs the frozen schema and initial owner, and records a durable business binding. With no capacity the request stays pending, never falsely ready. Operators authorize each slot; no automatic metered cloud creation.
- A separate PostgreSQL commerce catalog holds signup, hashed credentials/tokens, slot allocation, subscription snapshots and durable jobs. Database connection credentials and installation secrets never come from browser input. The verified owner supplies their own application password. Secrets are encrypted at rest. No production application database fallback.
- Signed Stripe events enqueue work; the worker retrieves authoritative Stripe subscription state, tolerates duplicates/out-of-order deliveries, and periodically reconciles. Checkout return URLs never grant access.
- Existing installations keep their current behavior unless explicitly enrolled and enabled. Enrolled app HTTP and worker entrypoints enforce the server billing gate, with per-installation authentication and no cross-business selectors from clients.

## Delivery and verification

Codex owns backend/schema/tests/operator tooling and a full API/fixture handoff. Claude owns every screen and visual/email presentation. Verify pure policy, HTTP transport, actual isolated PostgreSQL persistence/concurrency, fresh company provisioning, Stripe adapter contracts and existing application regressions. Keep configuration and production activation steps distinct from local verification.
