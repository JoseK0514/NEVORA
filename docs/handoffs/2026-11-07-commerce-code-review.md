# Commerce backend review

Reviewed detached HEAD ed00a517d7a4d19d67f0eb6e630ee04ac21cc795 against e2872f30. Code quality BLOCK. Recommendation REQUEST_CHANGES.

## Critical

- Cross-business billing handoff. src/app/api/commerce/handoff/route.ts:39 checks the Owner's session in the connected application database, while line 20 requests a handoff for the installation configured in the environment. With A's credentials and B's database, B's Owner obtains A's billing session. The facts endpoint checks the local binding but the handoff does not. Verify the local installation ID, secret hash and business alongside the session before releasing the proof. services/commerce/store.ts:253 also accepts allocated installations before readiness.

## High

- services/commerce/config.ts:33 checks the URL hostname while pg accepts a host query override. I ran the installed pg-connection-string parser on postgresql://localhost/x?host=remote.example and it selected remote.example, without networking. Development migration/registration can target a remote database and bypass the production approval guard. Validate the effective driver target or reject target-overriding connection parameters. Use that same identity in slot fingerprints.
- services/commerce/provision.ts:145 calls the installer without repeating the non-system schema check from registration. scripts/company-setup.ts:153 checks only public. If another application creates a private-schema table on a previously empty approved database, the worker still installs a company there. services/commerce/operator.ts:21 also accepts a database containing an existing application's private schema or public functions/views. Apply dedicated-database checks at each mutation boundary, including system maintenance databases.
- src/lib/commerce/access.ts:74 allows GET payroll export, but src/app/api/payroll-export/route.ts:5 only implements POST. The normal flow also needs POST /api/timecards and GET /api/payroll-export/profiles (src/components/payroll-export.tsx:72,110). Restricted Owners cannot export. Keep existing role/scope checks and exercise the real recovery flow with a restricted account.
- services/commerce/stripe.ts:155 refuses all checkout if a subscription ID exists. Line 407 rejects subsequent subscription IDs. After canceled or incomplete_expired, owners cannot restart billing. Permit a new verified successor, retain prepaid coverage and reject late predecessor events. Stripe confirms an already canceled subscription cannot be reactivated. https://docs.stripe.com/billing/subscriptions/cancel
- services/commerce/stripe.ts:208 regenerates expires_at on every call but line 222 reuses the Stripe idempotency key. A successful remote create followed by lost response or failed catalog commit makes the same operation fail with changed parameters. Computing exactly 30 minutes locally also leaves no transit/clock margin against Stripe's minimum. Persist a stable operation/session before remote create or recover an ambiguous create; ensure one open remote checkout across new operation IDs. https://docs.stripe.com/api/idempotent_requests and https://docs.stripe.com/api/checkout/sessions/create
- services/commerce/stripe.ts:472 aborts the reconciliation sweep on its first bad account. An unavailable installation at line 454 can prevent every later healthy business from recovering a missed payment event and eventually restrict a paid customer. Isolate retries by business while reporting failures.
- services/commerce/stripe.ts:454 applies a lower cap even if 16–30 existing employees are active; provision.ts:174 explicitly exempts existing active employees from the trigger. Self-service Portal downgrades, or hiring between the checkout count at stripe.ts:170 and policy push, allow 30 active employees to run indefinitely on the 15-seat price. The spec sets prices by active population. Preserve existing staff and reject/compensate ineligible downgrades or require a supported transition that enforces the commercial terms.

## Medium

- services/commerce/stripe.integration.test.ts:217 depends on state.returnUrl populated only by the preceding test. Several later tests rely on its catalog checkout and later tests' billing transitions. Individual filtered regressions do not establish their preconditions. Use per-scenario fixtures or one explicit lifecycle test.
- src/app/api/commerce/handoff/route.ts:50 always returns the production Velani origin even when the commerce UI origin is an authorized staging or local surface. A non-production account handoff leaves its environment and cannot be exchanged on production. Build the destination from the configured trusted UI origin.

## Low

No additional minor findings.

## Verification and scope

Reviewed the specified range, spec, plan, ledger, operator/API handoffs, local SDK and relevant Next/SQL/application call sites. The catalog uniqueness constraints, purpose-scoped one-time token consumption and transactional company binding are concrete strengths. The referenced /tmp/nevora-commerce-catalog-isolation-green.log reports 30 passing tests; the earlier task-5-tests.log reports 10,995 passing and 820 skipped. These were inspected executor artifacts. I did not rerun the full suite or treat the logs as proof of provider behavior.

Consulted remove-ai-slops and programming. The access test at src/lib/commerce/access.test.ts:38 mirrors the incorrect method allowlist, locking in the actual export failure. The Stripe tests contain order-dependent state. The 488-line StripeBilling module combines commands and reconciliation and exceeds the programming skill's size guidance; its size alone is not a release blocker. No deletion-only test found.

## Declined to judge

- Frontend/email presentation belongs to Claude.
- Real Stripe account settings, SMTP delivery, ingress identity, worker scheduling, provisioned capacity and deployment activation require external setup; the review covered backend behavior using local source, fixtures and provider documentation.
- Refund/dispute and long-term retention policy require operator/product decisions explicitly reserved in the handoff.
- Public-route Server Action replay was considered; the local action manifest showed only login/logout shared with public routes. No billing bypass was established from that path.
