# External calculation and NEVORA statements implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline. Jose approved this direction and implementation on Nov 15; no repeated approval is needed for this bounded engineering work. Customer activation, final payroll/legal wording and production remain separately gated.

**Goal:** New payroll work uses externally calculated amounts while NEVORA validates, reviews and shares statements.

**Architecture:** Reuse NEVORA_PAYROLL_IMPORT_V1, population/time-close checks, immutable approvals and publication. Introduce an explicit server-side calculation mode at every calculation entrypoint; table existence must not choose product scope. Preserve historical native data and payroll authorization.

**Tech stack:** Existing TypeScript/Next/Postgres service and worker, owned payroll/browser fixtures. No new tax/payment service or storage provider.

**Spec:** Jose's Nov 15 approval in `docs/handoffs/2026-11-15-inspection-backend-intake.md`; Claude's incoming scope in `docs/handoffs/2026-11-15-claude-inspection-backend-source.txt`.

## Constraints and review focus

- Development is the acceptance line; no customer activation, main or production change.
- Preserve Employee own-published-document access and current Owner/Manager scopes. Native Manager scope administration is authorization, not tax calculation; do not disable import-mode Manager access by indiscriminately blocking saveNativeProfile.
- Preserve saved-operation replay, approved history, existing statement bytes and worker leases. Never convert an existing native run into an imported run in place.
- Arithmetic reconciliation is not tax/accountant validation. Explicit native fixture opt-in is not customer authorization.
- Final statement strings/new template versions need existing Jose/counsel review. No retroactive document rewrite.

## Task 1: Calculation policy at read and prepare boundaries

**Files:** Create `src/lib/payroll/calculation-mode.ts` and its test; modify `src/lib/payroll/service.ts`, `worker.ts`, `contracts.ts`, `.env.example`; extend `src/test/integration/payroll-native.integration.ts`, `configurable-payroll.integration.ts` and relevant owned fixtures.

**Interface:** `readPayrollCalculationMode(env: Readonly<Record<string,string|undefined>>): 'external'|'native_provisional'`. Only exact NEVORA_PAYROLL_CALCULATION_MODE=native_provisional permits native calculation; missing/invalid values select external. NEVORA_PAYROLL_ENABLED stays independent. Native availability requires both mode and schema.

- [x] Add failing pure cases for absent/invalid/external/native_provisional values. Add owned database cases with native tables installed: default PREPARE creates a PROVIDER_IMPORT draft awaiting amounts, without native capture or native YTD writes.
- [x] Add the same assertion for worker PREPARE, retaining lease, same-period idempotency/races and receipts. Run red, add the checks, rerun green.
- [x] Pin only intentionally native fixtures to native_provisional with cleanup between tests. Keep every native test/assertion. Document external mode without activating a host.

## Task 2: Native mutation guards with preserved history/authority

**Files:** Modify `src/lib/payroll/service.ts`, `native/source.server.ts`, `native/profiles.server.ts`; extend existing native/configurable-payroll SQL tests; document the refusal code for Claude's wording map.

- [x] Add failing owned cases: external mode refuses RECALCULATE/CORRECT_NATIVE and approval of an unapproved native run; direct native capture cannot bypass mode; native tax/wage/opening-YTD writes cannot reactivate calculations. Recheck normal authentication and scope before mutation.
- [x] Preserve saved actor-scoped receipt recovery/replay after a mode change and Manager scope administration used by imported payroll. Historical published native statements retain identical bytes and current employee/management access rules.
- [x] Implement bounded guards; run history, scope, ledger, correction, receipt and worker suites. Do not delete the engine, rewrite approved runs, invent paid states or suppress pending-job failures.

## Task 3: External statement journey and UI contract

**Files:** Extend `src/test/integration/configurable-payroll.integration.ts`, `payroll-fixture.ts`, relevant payroll browser harness and the contract handoff. Documents remain in `src/lib/payroll/documents.ts` under version/immutability rules.

- [x] Exercise approved hours → export → external amount import → review → approve → PDF → explicit/configured publication → own employee download, using fictional people and no external money/mail/tax effects.
- [x] Pin exact USD minor units/source references. Reject wrong periods/paydays, missing/duplicate/foreign employees, noncanonical money, unreconciled deductions/net and changed-source approval. Preserve concurrent tabs, replay and lost responses.
- [x] Prove a 2027 imported payday for a closed period never invokes native 2026 rules. Corrections are separately reviewed replacements; show differences in approved amounts without asserting money was paid or settled.
- [x] Hand Claude exact capabilities/refusals, import/review/share actions and employer responsibilities. Do not imply arbitrary CSV/PDF/provider compatibility beyond structured import.
- [ ] Run focused/full required tests, owned payroll suites, typecheck/lint, browser/mobile/keyboard/failure states and exact combined-development qualification. Rebuild source-qualified manuals after application commits. Report code/local/hosted/copy/activation states separately.

The independent implementation is in qualification. Local SQL proves external preparation/import/approval/publication/download, native refusals, receipt/history preservation and a 2027 payday. Combined browser/manual/QA-driver acceptance remains held until Claude supplies the exact reviewed and pushed collaboration SHA, per Jose’s Nov 15 clarification. No production or customer activation is authorized.
