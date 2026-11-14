# Owner Simplicity Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement the approved bounded plan in this chat. No competing chat or implementation agent is needed.

**Goal:** Deliver a small roster-import backend and confirmed clarity corrections for Claude's existing UI integration.

**Architecture:** Parse and preview bounded CSV/TSV, then compose the existing canonical employee creation statements into one Owner-authorized onboarding mutation and durable import receipt. Reuse current company capacity triggers, invitations and setup contracts. No schema/service expansion.

**Tech Stack:** Existing TypeScript, Next.js, PostgreSQL and Vitest dependencies.

**Spec:** ../specs/2026-11-14-owner-simplicity.md

## Global constraints
- Detached development-base checkout; preserve parallel work and Claude UI.
- No production/provider/customer-data changes or metered AI calls.
- Read package scripts before running; own all local test resources.
- New profiles do not create credentials or send invitations.
- Do not change plan, trial, access or payroll policies.

## Review focus
- Quoted delimiters, BOM, Unicode, malformed CSV and bounded input.
- Duplicate IDs/emails and ambiguous or inactive catalogue references.
- Partial writes, concurrent capacity changes and lost commit replies.
- Stale setup versions and revoked/cross-company authority.
- Missing information must not be represented as zero, none or paid.

## Task 1 — Atomic roster import
Files: create src/lib/onboarding/roster.ts, roster.server.ts, roster-http.server.ts and their focused tests; add preview/commit routes below src/app/api/onboarding/roster; extract canonical creation preparation in src/lib/company-access/employee-profile.server.ts; extend src/test/integration/onboarding-people.integration.ts.

Interfaces: previewRoster validates CSV/TSV against readOnboardingSetup; saveOnboardingRoster consumes OnboardingCommand<{people: canonical person payload[]}>. A root command binds the complete normalized payload, deterministic child operations retain canonical employee receipts, and one existing onboarding receipt commits all rows or none. Return standard OnboardingResult plus created IDs on saved results.
- [x] Write parser/import tests and observe red failures.
- [x] Implement bounded parsing and canonical preview.
- [x] Extract canonical creation statement preparation without changing single-person behavior.
- [x] Implement the atomic Owner import and same-origin HTTP adapters.
- [x] Pass focused units and real owned PostgreSQL tests including 30 staff, replay, rollback and capacity rejection.
- [x] Commit the independently checked import.

## Task 2 — Confirmed data clarity
Files: relevant existing data producers and associated tests only; concise factual corrections in existing consumers are allowed without layout/style changes. Remaining translation/hierarchy goes to Claude.
- [ ] Reproduce position-source failure and ambiguous calendar payment wording.
- [ ] Preserve unavailable state, use scheduled-payday wording and clarify headcount populations without changing policy.
- [ ] Pass affected tests and record UI-only requirements.
- [ ] Commit checked corrections.

## Task 3 — Verification and handoff
- [ ] Run the repository test command, type checks, lint and build appropriately; record every failure/skip.
- [ ] Run the isolated people/setup/invitation journey and relevant existing Rondo local suites, respecting costs and scope.
- [ ] Publish docs/handoffs/2026-11-14-owner-simplicity.md with exact API examples, tests, source and remaining Claude/browser/hosted work.
- [ ] Keep development merge subject to exact-source checks and existing branch policy; no main or deployment.
