# Development Assembly Implementation Plan

> For agentic workers: execute inline with superpowers:executing-plans; obtain a fresh read-only whole-branch review before shared-branch publication.

**Goal:** Assemble the latest existing release parts into development, preserve their intent and history, and record a repeatable source inventory so later work does not start from obsolete branches.

**Architecture:** Use an isolated branch based on origin/development d4b01453f7fabaa7ac739d049934527b6b366310. Merge the existing PR16/database-rehearsal candidate first, then current source branches with explicit conflict reconciliation. Publish to development only after integration verification and review; main and the deployment hold remain unchanged.

**Tech stack:** Git/GitHub, Next.js 16, React 19, TypeScript, Vitest, Node test runners and disposable PostgreSQL fixtures.

**Spec:** Jose's October 21 instruction to assemble the separate parts, corrected explicitly to development rather than main; existing docs/execution/final-release-checklist.md controls production readiness separately.

## Global constraints

- Preserve existing worktrees, independent findings and accepted application behavior.
- No force-push, production deploy/migration, live notifications, customer-data tests or paid changes.
- Reconcile current release work; retain held SaaS and unrelated prototypes as separately identified branches.
- Do not weaken failed assertions or transfer earlier candidate test results to the assembly.
- Keep vercel.json git.deploymentEnabled false.

## Review focus

- Later UI merges must retain backend authorization, deletion and passkey contracts.
- Manager fixes and Signature styles must coexist across roles and screen sizes.
- Migration0034 must precede0035 and both must belong to the canonical non-held manifest.
- Test/preview changes must retain isolated fixtures, privacy checks and owned cleanup.
- New remote commits must be detected before development publication, rather than silently omitted.

## Tasks

1. [ ] Inventory all current remote branches, merge ancestry and overlaps. Record each as included, superseded/contained, or held with a reason.
2. [ ] Merge the PR16 rehearsal source, latest auth/components/dark UI, Manager and confirmation fixes, PR18 backend, D4/preview/runbook and test/CI repairs. Inspect each conflict and preserve both intended behaviors.
3. [ ] Complete integration seams: canonical0034/0035 classification, matching EN/ES busy copy and source inventory/update instructions. Add regression checks for any new logic.
4. [ ] Install locked dependencies, run full unit/type/lint/build and relevant migration/source/release checks; exercise affected isolated database/browser checks. Retain exact commands, failures and cleanup evidence.
5. [ ] Obtain a fresh review, address material integration findings, fetch source heads again, publish a reviewable integration PR and merge the authorized result into development. Verify remote development and unchanged main, deployment hold and retained source coverage.

## Execution ledger

- Initial: current shared development is clean at d4b01453; main is7ffd013e and is an ancestor. No active worktree is attached to this chat; native managed worktree created for this task.
- Ruling: existing CI/release failures are preserved as baseline evidence; development assembly is not production certification. Diagnose integration regressions and report unresolved release gates explicitly.
- Ruling: no new general approval is required for the assembly or development merge; Jose explicitly requested both. The earlier main target was superseded by his correction to development.
