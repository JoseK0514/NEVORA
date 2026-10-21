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

1. [x] Inventory all current remote branches, merge ancestry and overlaps. Record each as included, superseded/contained, or held with a reason.
2. [x] Merge the PR16 rehearsal source, latest auth/components/dark UI, Manager and confirmation fixes, PR18 backend, D4/preview/runbook and test/CI repairs. Inspect each conflict and preserve both intended behaviors.
3. [x] Complete integration seams: canonical0034/0035 classification, matching EN/ES busy copy and source inventory/update instructions. Add regression checks for any new logic.
4. [x] Install locked dependencies, run full unit/type/lint/build and relevant migration/source/release checks; exercise affected isolated database/browser checks. Retain exact commands, failures and cleanup evidence.
5. [ ] Obtain a fresh review, address material integration findings, fetch source heads again, publish a reviewable integration PR and merge the authorized result into development. Verify remote development and unchanged main, deployment hold and retained source coverage.

## Execution ledger

- Initial: current shared development is clean at d4b01453; main is7ffd013e and is an ancestor. No active worktree is attached to this chat; native managed worktree created for this task.
- Ruling: existing CI/release failures are preserved as baseline evidence; development assembly is not production certification. Diagnose integration regressions and report unresolved release gates explicitly.
- Ruling: no new general approval is required for the assembly or development merge; Jose explicitly requested both. The earlier main target was superseded by his correction to development.
- Assembly progress: merged rehearsal0484eba1, latest Signature1cc08277, backendb5f474e3, Manager837b13ad, D4 3e3021e4, full preview6d67e362, runbook88584132, test repairsac534771, CI fixes9220b210 and preview followups985c8a7a. The Manager confirmation release branch898e99d4 was already contained by the rehearsal input.
- Ruling: retain both backend login admission budgets and passkey-enabled shared admission; deletion refusal/session revision guards remain. Preserve Signature layouts, dark mode, policy links and native canonical PDF view/download.
- Ruling: Timecards keeps PR16's later read-sequence, finite-expiry, inactive-view and stale-response controls. These already preserve unchanged background selections; pause still clears private notes rather than reviving unverified drafts from the older Manager refresh implementation.
- Ruling: preserve newer held-response Home/attendance evidence, cancellation accounting and shared rendered-contrast checks while retaining stronger rendered-control geometry and diagnostic records from older followups. Do not restore older pre-Signature markup.
- Focused verification:29 checks ran;26 passed. D4 classification/drift checks failed for missing0034/0035, and the error retry unit harness needs the newly integrated router dependency. These are the next integration fixes.
- Focused fixes: canonical0034/0035 and bilingual busy-budget page copy added; retry harness updated for the router. All31 focused assertions pass across7 files. Later combined lint/type failures were duplicate Home helper import and .mts specifiers in root-scoped diagnostic tests; both corrected without exclusions.
- Final source assembly also contains the later clean-UI/browser diagnostic repairs at0affe6ec, profile9935bad0, and inspection/SaaS planning documents33a71167/13f0ba64/145fa06e. The43-head disposition inventory retains historical evidence and held bootstrap/prototype work without activating it. Its5 negative/positive checks and live head/ancestry check pass.
- Fresh checks so far: lint and root typecheck pass; rehearsal safety17/17; release-engineering69/69; passkey PostgreSQL34/34 with owned cluster stopped. Full unit/SQL/browser/build verification remains in progress. The first browser invocation correctly refused uncommitted source and stopped its owned cluster; retry only after this source checkpoint is committed.
- Verification terminal:9,284 unit passes/801 existing skips; lint/types/build pass. Payroll36, Foundation281, authority46, Company Access496 plus separately correct-family36, and fixture diagnostics2 pass. Combined Chromium/WebKit browser passes40 scenario records. Extended PhaseD passes82 checks then an old Device name locator fails; setup passes8 core database checks then an old employee-form selector fails. Generation175/176 stops at the inactive-workspace error classification expectation. These failures stay open for release, with no assertion weakening or full-suite credit. See the dated assembly handoff for exact limits and retained evidence.
- Review: fresh read-only code review approves development integration at d10e4adc and bounded script follow-up at db4c7ecf; no new integration blockers. Nonblocking Timecards maintainability debt is recorded. All production/independent release gates remain open as applicable; this integration does not waive them.
