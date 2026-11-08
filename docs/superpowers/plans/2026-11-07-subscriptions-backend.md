# NEVORA Subscriptions Backend Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement task-by-task. Claude owns UI.

**Goal:** Deliver signup, isolated provisioning, trial and Stripe billing APIs plus an integration handoff.

**Architecture:** Separate commerce catalog and HTTP service. Existing per-company app stays isolated; approved inventory slots and a durable worker perform setup. Stripe Checkout and Customer Portal are external billing surfaces.

**Tech Stack:** Node 24, TypeScript, PostgreSQL, Stripe SDK, Vitest, existing company installer.

**Spec:** docs/superpowers/specs/2026-11-07-subscriptions-backend.md

## Global Constraints

No UI, real messages, real charges, cloud resources, production migration or deployment. Detached worktree from origin/development. Preserve other sessions. Credentials stay private. Fail closed on authority or configuration failures. No shared application databases.

## Review Focus

Duplicate signup/verification/provisioning must not create duplicate businesses. Expired or stolen tokens cannot attach another business. Reordered billing events cannot revoke current paid access. Partial provisioning must resume without touching unrelated databases. Billing outages must not bypass server enforcement or accidentally enroll existing installations.

### Task 1: Policy and security primitives

Files: services/commerce/model.ts, security.ts and corresponding tests.
Interfaces: validated signup input, access projection, token hashing/encryption, environment configuration.
- [ ] Write and run failing tests for trial boundaries, paid-through, seven-day renewal grace, validation and token tampering.
- [ ] Implement minimal policy and crypto helpers; run `npx vitest run services/commerce/model.test.ts services/commerce/security.test.ts`.
- [ ] Commit verified task.

### Task 2: Catalog and account HTTP API

Files: services/commerce/schema.sql, store.ts, service.ts, http.ts, server.ts and tests.
Interfaces: signup/verify/login/status, authenticated owner sessions, durable mail/provision/billing jobs, approved installation inventory.
- [ ] Exercise signup, token consumption, origin/authorization, rate limits and concurrent claims against isolated PostgreSQL.
- [ ] Implement transactional catalog and bounded HTTP adapters; run commerce unit and owned integration suite.
- [ ] Commit verified task.

### Task 3: Company provisioning and app enforcement

Files: services/commerce/provision.ts, worker.ts, operator.ts; bounded company installer extension; src/lib/commerce and src/proxy.ts.
Interfaces: approved slot claims, resumable installation binding, ready workspace and trial dates, signed installation access status and owner handoff.
- [ ] Write failing tests for installation races, nonempty database refusal, same-job recovery and disabled/enrolled gate behavior.
- [ ] Install through canonical migration order and apply backend access enforcement without UI changes; verify on local PostgreSQL.
- [ ] Commit verified task.

### Task 4: Stripe lifecycle

Files: services/commerce/stripe.ts and lifecycle tests; worker billing/reconciliation paths.
Interfaces: server-selected prices, idempotent checkout/portal sessions, verified webhook intake, authoritative subscription snapshots.
- [ ] Test customer/checkout ambiguity, early subscription, duplicate/reordered events, identity mismatch, renewal failure and cancellation.
- [ ] Implement Stripe adapter and durable synchronization; run commerce unit/integration tests.
- [ ] Commit verified task.

### Task 5: Handoff and full verification

Files: docs/handoffs/2026-11-07-commerce-backend.md, services/commerce/README.md and fictional fixtures.
Interfaces: exact endpoint/request/response/error/state contracts for Claude; operator setup/rollback and environment inventory.
- [ ] Run full default tests, typecheck, lint and build; record exact results and remaining limitations.
- [ ] Obtain whole-change code review and fix important findings with regression tests.
- [ ] Commit handoff and report verified code separately from external configuration and deployment.
