# Neon staging hosting implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Finish the already approved Stripe/onboarding hosting preparation using existing Neon/Vercel accounts, without paid Render resources.

**Architecture:** Keep the protected Next.js UI/API on Vercel. Run a narrowly scoped Stripe-signed receiver and separate platform-authenticated bounded queue/reconciliation/provisioner functions on the existing fictional Neon staging branch. Existing PostgreSQL jobs and leases retain ownership of retries and idempotency; triggers only wake the workers.

**Tech Stack:** Node24, Stripe23.1.0, PostgreSQL17, @neon/functions0.11.0, esbuild0.28.2, Vitest5.0.5.

**Spec:** Existing docs/handoffs/2026-11-08-stripe-runtime-tax-spec.md and docs/runbooks/self-service-onboarding.md; this addendum specifies deployment adapters, not new product behavior. Jose's latest direction is to finish without the proposed Render expense. Preserve the approved native execution method rather than asking again about the same backend scope.

## Global constraints

- Detached c3a64722d continuation; preserve current owned documentation edits. No new branches, pushes, merges, live/production changes or Claude UI edits.
- Existing staging project damp-haze-17022523, branch br-hidden-mud-bbnc2fxk, org org-wild-heart-93376487, aws-us-east-1, Free plan. Functions and Triggers list APIs returned successfully and empty on this exact branch.
- No paid Render services, account upgrades, AI usage, new datastores, external queue or analytics. Stay within existing free quotas. Triggers start disabled; do not leave a recurring loop running against the short staging database quota.
- Signed receiver gets only its catalog API capability and signing secret. No Stripe API key, provider management, enrollment or SMTP capability. Override both automatically injected generic database URLs with an unusable non-secret URL before deployment.
- Queue/reconciliation and provisioner are separate functions with separate secret snapshots. Never add provider management/private enrollment credentials to Vercel or the receiver.
- No real email except the already approved support@thevelani.com test recipient; Tax/live/signup/provider enablement remains off until the relevant actual gates pass.
- Browser transfer of an existing credential to a new Neon destination requires specific action-time confirmation under its policy. Prepare/review code and exact destinations first. No credential values in source, logs, Jira or receipts.
- Native Neon receiver is sandbox only. Production edge abuse controls and any necessary staging app-to-app SSO accommodation remain explicit gates, not silent exceptions.

## Review focus

1. Public requests cannot impersonate a Neon scheduler; proxy stripping must be tested on the deployed service, not inferred from local parser behavior.
2. Signature verification, raw-body limit, environment/mode and path/method checks precede database work; malformed/expired/live events cannot enqueue.
3. Automatically injected default database credentials never broaden a function's capability.
4. Duplicate runs reuse existing durable job/lease semantics; failure responses expose only bounded codes and always close short-lived pools.
5. Provisioner bundle includes the exact canonical SQL assets at the runtime-relative path; missing/changed SQL fails the manifest check rather than installing another schema.

### Task 1: Bounded Neon HTTP adapters

Files: services/commerce/stripe-webhook.ts; services/commerce/stripe.ts; services/hosted/neon/handlers.ts; services/hosted/neon/handlers.test.ts; package.json/package-lock.json.

Interfaces: parseStripeWebhook(raw, signature, secret, live) returns a verified Stripe.Event; enqueueStripeWebhook(store,event) preserves the existing durable event projection. createWebhookHandler(env,enqueue) validates a staging-only signed POST before enqueue. createScheduledHandler(role,env,run) validates a Neon schedule delivery for the fixed role, then runs one bounded callback. Disabled handlers never initialize database/provider capabilities.

- [ ] Install pinned SDK. Add failing security/side-effect tests for missing/expired/tampered/live signatures, oversized bodies, bad methods/paths, unbound deployment environment, forged/inconsistent/malformed triggers, wrong task and safe errors.
- [ ] Implement minimal handlers and extract existing webhook persistence unchanged; run focused tests and owned commerce SQL/SDK regressions.
- [ ] Commit implementation and record commands/results.

### Task 2: Role-specific entry points, bundle custody and closed hosted probes

Files: services/hosted/neon/*.entry.ts; scripts/build-neon-onboarding.mjs; services/hosted/neon/README.md; docs/handoffs/stripe-evidence-20261108/neon-hosting.json.

Interfaces: four separate fetch entry points, no generic task selector. Bundle output is outside source, rooted at index.mjs with a nested bundle preserving canonical SQL relative paths. Receipt records commit/tree, all bundle/asset SHA256 values and no environment values.

- [ ] Implement factories that create/close catalog pools only after authentication and use existing workerOnce/reconcile/runProvisionerOnce. Reuse source-pinned canonical SQL assets for provisioning; no migrations during build.
- [ ] Build and exercise artifacts with all enablement off; verify SQL asset hashes and raw HTTP behavior. Run typecheck, lint, full root suite and owned onboarding-commerce regressions; perform one fresh review of this continuation, with one Important/Critical fix pass.
- [ ] Deploy only closed staging adapters with generic database injection overridden and no real secrets. Verify actual native endpoints reject forged scheduler headers. Create schedules disabled only after source/role verification.
- [ ] Update Jira and handoff; request the exact new secret destinations only after these artifacts are concrete. Actual credential auth, signed provider delivery, worker effects, A/B Owner journey and Claude UI remain open until observed.

## Evidence and decision record

Provider documentation read: Neon Functions overview/runtime/environment/deploy/trigger pages and current pricing; Vercel Schedules limits and private function targets. Neon Free includes Functions capacity/invocations. Existing Vercel team remains Hobby with SSO ALL. Neon role-scoped functions avoid new Vercel projects or protection changes; account access does not prove deployed behavior.
