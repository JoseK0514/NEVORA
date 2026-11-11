# NEVORA Operations Closeout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the source-owned gaps in R21/R22/R26/R27/R28/R32/R34, qualify them without misrepresenting external operations, and integrate the passing candidate into development.

**Architecture:** Reuse bounded signup admission/capacity code, add a pure read-only operations-evidence validator with a narrow CLI, and deliver a source-bound documentation bundle. Existing private worker/monitor code and the D04 hold remain authoritative.

**Tech Stack:** TypeScript, Next.js, PostgreSQL owned harnesses, Vitest, Node.js 24, existing PDF/browser libraries and GitHub Actions.

**Spec:** `docs/product/operations-closeout-2026-11-11.md`

## Global Constraints

- Three active branches only: development, main, claude-codex-collab-nevora. Work detached; preserve all concurrent source and held UI.
- Codex owns backend/tooling; Claude owns product UI; native and production deployment remain separate.
- No invented D04 duration, named responder, renewal, mailbox delivery, provider approval or production acceptance.
- No actual customer deletion, real message, new paid service, secret transfer or cloud activation from local qualification.
- User authorized execution, tests, Actions and development integration; do not ask to approve the same bounded code work again.

## Review Focus

- A mixed open-signup/inbox configuration must not silently open admission or persist a denied registration.
- Concurrent/unknown provisioning attempts must not exceed or free total capacity incorrectly.
- A case manifest with a foreign binding, expired challenge or missing provider/erasure evidence must never read as operational authorization.
- An earlier screenshot/SOP/source or generated PDF must not be relabelled as a current deployed feature.
- New candidate bytes or concurrent development changes must invalidate stale source/CI publication claims.

### Task 1: Port bounded admission/capacity safeguards

**Files:** `src/lib/onboarding/admission.server.ts`, its tests, registration/config HTTP modules and tests, provisioning store/orchestrator/integration test, provisioner environment allowlist; source-attributed handoff.

**Interfaces:** Existing onboarding v1 API remains unchanged; new admission policy is checked before persistence. Explicit total-project configuration flows through existing provisioner contracts.

- [ ] Copy/adapt the upstream regression tests first and demonstrate rejection on the current source.
- [ ] Port only reviewed backend prerequisites and admission/capacity paths; preserve company access and legal wording.
- [ ] Pass focused unit checks and actual concurrent capacity tests on disposable PostgreSQL; run static checks.
- [ ] Commit only owned files and record exact imported source, tests and external activation limits.

### Task 2: Read-only privacy case and restore review

**Files:** `src/lib/operations/case-readiness.ts`, `case-readiness.test.ts`, `scripts/operations-case-readiness.mts`, a CLI regression, and a runbook/example with fictional opaque references.

**Interfaces:** `reviewOperationsCase(manifest: unknown, expected: CaseBinding, asOf: string): CaseReview`; return only `blocked`/`review_ready`, reason codes, recorded-evidence classification and `canMutate:false`.

- [ ] Add failing regressions for exact binding, required inventory, retained end/hold basis, unresolved provider evidence, wrong/expired withdrawal evidence and unreconciled restored erasures.
- [ ] Implement closed input validation and explicit operation-specific checks. Keep input text out of diagnostics and reject unknown fields.
- [ ] Add a no-network/no-database CLI; prove blocked input exits nonzero and no input secrets are echoed.
- [ ] Pass the full focused set and static checks; commit only owned paths and document attestation limits.

### Task 3: Current web guides and PDFs

**Files:** `docs/guides/web/` reader guides, existing developer/runbook links, `scripts/manuals/` renderer/checks and generated guide manifest/PDFs.

**Interfaces:** Manifest binds source SHA/application content hash, each guide's evidence paths and text/PDF hashes. Renderer uses existing dependencies, local assets and no network.

- [ ] Write Owner, Manager/Lead, Employee and Rondo guides from current paths; provide developer/operations distributions using existing qualified material.
- [ ] Add renderer/manifest regression checks for stale source/doc bytes, missing/empty documents and escaped content; prove them failing first.
- [ ] Generate PDFs with local fonts, source markers and page numbers; inspect page/text/pagination and verify hashes/links.
- [ ] Commit the bundle without overwriting the separate draft SOP or claiming hosted/native activation.

### Task 4: Existing operations qualification and source reconciliation

**Files:** Bounded updates to `ops/workforce/MANAGED-RUNBOOK.md`, the dated managed-runtime handoff, operations closeout handoff, source inventory and existing CI wiring only as required.

**Interfaces:** Existing monitor/enrollment/packaging commands and owned SQL harnesses; exact immutable source/artifact receipts.

- [ ] Reconcile legacy shared-root versus enrolled host custody and preserve dated historical evidence.
- [ ] Run focused existing worker/monitor tests, actual owned SQL and packaged acceptance; classify all seven packages with real receipts and explicit external gaps.
- [ ] Run default/static/build and applicable browser gates, preserving the one-heavy-local-run coordination boundary.
- [ ] Obtain fresh source review, fix meaningful findings with RED→GREEN evidence, then freeze the candidate.

### Task 5: Exact-candidate Actions and development

- [ ] Fresh-fetch origin, reconcile held-source inventory and current protected contexts without changing another chat's freeze.
- [ ] Use the approved existing immutable candidate-tag workflow when available; preserve exactly three branches and all ten protected GitHub Actions contexts.
- [ ] Require all applicable mandatory Actions jobs on the exact candidate to pass; retain failures/artifacts and correct causes without weakening assertions.
- [ ] Re-fetch development; integrate only by ordinary reviewed fast-forward without force/admin bypass. If source advances, reconcile/requalify first.
- [ ] Record development SHA, Actions, package dispositions and actual remaining operations in Jira and a concrete handoff. Main/production remain unchanged.

## Ledger

Discovery: three read-only domain audits completed; source inspection proves R26 integration and R32 delivery gaps. Runtime worker/monitor code exists; actual operator/policy/hosted gates remain open. No source test results are claimed yet.

Task1 progress: a709f3f39 ports12 bounded admission/capacity paths;181 focused units and owned lint pass. Actual capacity SQL remains pending the shared heavy-run slot.

Ruling: include the eight production-provider/profile backend/test paths from3922df9/c256b249 despite the original technical exclusion. Read-only audit proved that explicit resource policy readback was missing and current hosted code could not execute the production provisioner profile. Keep the profile provisioner-only and reject workforce/billing/enrollment production scope. This is necessary source integration under R26, not new production activation. Cost if wrong: a too-broad runtime-profile admission boundary; focused negative profile/resource tests and source review are required.

Task2 local completion:6df067823 adds the read-only case/CLI;24 focused tests pass including the real CLI and an additional review-before-verification RED→GREEN regression. Project typecheck and owned lint pass. No mailbox, withdrawal, deletion or restore was executed.

Task3 content:744eb057d adds six current-source guides and evidence index;92 evidence paths/36 local links checked. PDF/tooling and final qualified distribution remain in progress.

Owner decisions recorded November11: Jose primary, Ilianis Soto secondary,24/7 coverage; critical acknowledgement15minutes and lower-severity1hour, explicitly internal ownership/triage targets. Actual responder access/receipt/drill remains unverified.
