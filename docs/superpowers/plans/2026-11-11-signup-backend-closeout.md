# Signup backend closeout

Resume Jose's approved self-service onboarding scope. Codex owns backend; Claude owns UI. Base: freshly fetched development d80da2a35b586378b59bdadc5e989baffe430165, detached isolated worktree. Spec: docs/superpowers/specs/2026-11-07-self-service-owner-onboarding-design.md. Preserve the existing v1 API and 30-day no-card trial.

## Constraints

Do not edit Claude UI, billing-owned files, another worktree, native apps, main, the website CTA or public admission. Do not reuse production credentials for local QA, create another company, or raise resource budgets/creation allowances as a test. Existing approved support inbox is support@thevelani.com. Distinguish deployed signup source3922df940 from development d80; neither's receipts substitute for the other.

## Task 1: Correct registration HTTP network admission

Files: src/lib/onboarding/registration-http.server.ts; its new focused registration-http.test.ts; src/test/integration/onboarding-registration.integration.ts.

Interfaces: Request -> trusted hosting-edge client address -> existing durable registration IP/email/platform admission counters. Use only a validated Vercel-supplied address when the server declares VERCEL=1. Ignore generic forwarded hints and all headers outside that hosting boundary; malformed/missing addresses retain the conservative shared fallback. Canonicalize IPv6 so textual variants share the same budget. No raw IP is added to persisted rows, responses or logs.

1. Add HTTP argument-boundary regressions and real owned-database cases for unrelated addresses, one-address exhaustion/spoofed hints, unknown-edge fallback and privacy. Expected: the current handler fails the unrelated-address and argument-boundary assertions.
2. Make the smallest handler change, preserving registration operation identity, anti-enumeration, origin guards, existing per-email/platform limits and unknown-delivery behavior. Expected: new and existing focused tests pass.
3. Commit the bounded implementation after its focused tests pass. Expected: immutable source, no UI/billing/environment mutation.

## Task 2: Qualify backend and reconcile hosted evidence

Interfaces: the unchanged v1 contract and same-source registration/provisioning/activation/setup/people/invitation services.

Run the committed clean-source onboarding acceptance, relevant units, type/lint and source-bound build with isolated owned PostgreSQL and provider delivery off. Read the actual production project/function/schedule/config receipts through existing accounts, without widening permissions or copying secrets. Complete any authorized owned-fixture mail check if secure normal authentication is available; otherwise retain the exact remaining hosted acceptance without inventing a pass. Expected: actual reports distinguish tested, deployed and activated states; public signup remains closed.

## Task 3: Whole-change review and Claude/Jira handoff

Read the complete diff and exact qualification receipts through one fresh reviewer. Correct material findings once with regression proof. Publish one repository handoff with live URLs, API/operation/retry/409/202/cookie contracts, backend evidence, deployment/source state and remaining Claude/browser/activation gates; update SCRUM-190 without reopening completed development tickets. Existing development integration authorization applies only after required checks pass. No production deployment or public activation is inferred from local success.

## Review focus

Challenge forged forwarding headers; real Vercel versus direct requests; missing/invalid/multiple IP values; IPv4/IPv6 canonicalization and shared-network false lockout; per-address/per-email/platform durable counters and concurrency; no raw address/secret disclosure; unchanged operation replay, one-use verification/Owner activation and uncertain email/provider outcomes; exact source/environment custody; no accidental admission/CTA/provider activation.
