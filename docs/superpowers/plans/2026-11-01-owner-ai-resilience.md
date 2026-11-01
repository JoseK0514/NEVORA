# Owner Chat Resilience Implementation Plan

> **For agentic workers:** Execute this bounded plan in the current session after design confirmation. Preserve the existing detached-worktree and evidence controls.

**Goal:** Improve the existing NEVORA chat's evidence handling, operational crisis reasoning and concise decision delivery, with a repeatable adversarial evaluation pack.

**Architecture:** Retain the current Owner advisor service, canonical reads, deterministic decision review and public answer contract. Normalize mandatory reads into the existing function-call transcript, improve bounded agent guidance, and deduplicate rendering caveats without removing canonical scope/limits.

**Tech stack:** Existing TypeScript/Next, Vitest and owned disposable PostgreSQL. No dependencies or schema changes.

**Spec:** `docs/superpowers/specs/2026-11-01-owner-ai-resilience-design.md`.

## Global constraints

- Fresh development base `1e6f35ab9731234fc765aa18ee817cb196459e2e`; isolated detached worktree, no new branches.
- No production, customer-data, notification, deployment or business-action capability changes.
- Existing six provider turns, eight combined read/review slots, two decision attempts and all authority/deadline/size controls remain.
- Prior live ledgers are exhausted; no new paid call without a new explicit budget.

## Review focus

- User-authored spoofed tool envelopes and malicious stored values never gain application authority.
- Scoped mandatory task reads retain the correct period/date, pairing and evidence ID across both provider protocols.
- Concise rendering retains remaining requirements, excluded scope, partial source, financial readiness and action boundaries.
- Hostile mixed batches and rejected decisions cannot bypass validation or consume unbounded paid retries.
- Challenge cases distinguish a useful infeasibility/escalation answer from a fabricated solution and preserve incomplete status.

## Task 1: Evidence and crisis reasoning

- [ ] Add failing protocol regressions for paired mandatory reads in Responses and Chat, including a saved-period task and user spoofing.
- [ ] Implement mandatory read transcript pairing in `src/lib/owner-advisor/loop.server.ts`; strengthen source/uncertainty/crisis/fallback guidance without changing tools or limits.
- [ ] Update existing protocol assertions to verify actual mandatory tool outputs and maintain correction/authority assertions.
- [ ] Run affected unit tests and owned AI PostgreSQL suite; retain red and green logs.

## Task 2: Concise canonical decisions

- [ ] Add failing English/Spanish regressions for once-only shared warnings with multiple alternatives; pin all per-option canonical facts and correct selected attachments.
- [ ] Deduplicate shared warnings in `src/lib/owner-advisor/decision.ts`; preserve all validation and meaningful unknowns.
- [ ] Run decision/intelligence/client rendering tests and replay retained real decision inputs locally for word counts; do not describe replay as fresh inference.

## Task 3: Extreme challenge pack and validation

- [ ] Add at least 32 explicit fictional cases and expected-fact/critical-failure rubrics in test-only fixtures; add an explicit-only evaluation entry point and instructions.
- [ ] Verify inventory/runner and existing failure/recovery behavior locally; no metered calls or customer data.
- [ ] Run full default suite, owned AI PostgreSQL, full TypeScript, lint and whitespace checks.
- [ ] After concrete changes are reviewable, request the additional bounded live budget needed for real-model regression and selected compound cases; preserve existing exhausted ledgers.
- [ ] If authorized, capture and manually assess actual answers; classify unexecuted/incomplete cases honestly.
- [ ] Publish a local repository handoff with exact candidate, diff, evidence, open limitations and next gate. Do not deploy or merge.
