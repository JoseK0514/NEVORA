# UI-010 / UI-011 native payroll review and private statements

Spec: frozen Finance core UI_CORE_READY_CONTRACT.md at 420daae98ce039cbade7ca2641a141c580243ee8 (custodied in task-root native-ui-evidence/frozen-contract). The Owner native payroll directive and approved bounded UI integration govern. Isolated base 2360b6012432d776460e7067a32ca06905374f8f = exact root bfa3d853 + frozen UI017. Preserve all earlier candidates and live preview. No push/merge/deploy or independent finding closure.

## Context and Global Constraints

Own existing payroll/My Pay components, client decoders, styles, and UI tests. Do not modify Finance backend/predicate, peer helpers, package files, migrations, payroll calculations, publication, roles or settings/profile authoring. UI016 boundary fields remain DRAFT. Keep Inter, Phosphor, approved tokens and restrained existing motion. Source authority determines workflow; current capability determines access. Null amounts mean unavailable, never zero. Opaque revision/review token must be transmitted unchanged. Preserve original history and existing retry/recovery safeguards. Approval does not assert ready PDF, delivery, payment, statutory accuracy or production readiness.

### Task 1: Decode native review and private history

Ownership: components/payroll/api.ts and api tests; additive browser-safe local portal response type only.
Interfaces: frozen PayrollRunsResponse, PayrollRun/native ready results, PayrollDocument and portal-statements envelope; no changes to authoritative backend types.
1. Add failing tests for native true capability, blocked-null vs invalid fabricated totals, ready breakdown preservation, malformed native result, portal envelope and published own documents. Expected: native true and portal envelope currently fail.
2. Accept boolean capability, validate consumed run/native/document fields at the unknown response boundary without computing amounts or authorizing access. Recognize portal-statements version and retain safe document metadata; reject invalid native monetary states. Expected: new and existing decoder suites pass.
3. Run task verification, commit. Expected: contract tests pass without backend/package changes.
Task verification command: `npm test -- src/components/payroll/api.test.ts --maxWorkers=2`

### Task 2: Source-aware review, actions and confirmed feedback

Ownership: payroll-runs, bounded native review component, workflow-status, use-payroll and relevant UI tests/styles.
Interfaces: Task1 native response; existing usePayrollOperation exact-body retry/receipt/current-scope contract; backend PREPARE/RECALCULATE/APPROVE/CORRECT_NATIVE and existing worker jobs.
1. Add failing real-render tests for native blocked guidance/no money/import, ready regular/OT/tax/YTD/source review, revision approval controls, automatic publication state, linked correction and historical provider import. Expected: current native render requests provider input, lacks blocked labels/details and offers payment export.
2. Render actual recorded-source results, actionable blockers and recalculation. Preserve provider-only historical workflow. Native correction uses reason and expectedRevision with no entered money. Approval retains current review token; worker/publication and safe failed-job retry remain distinct. Render capabilities canReview/canApprove and resource freshness gates. Expected: tests pass; no client calculation or native payment controls.
3. Retain confirmed receipt through refresh failure, handle stale/conflict feedback and revoke private data on refresh/offline/hidden lifecycle using existing hooks. Add failing behavioral browser coverage where hooks require a real DOM. Expected: confirmed receipt cannot become an invitation to duplicate a completed action; pending retries use exact reference/body.
4. Verify and commit. Expected: unit/render suites and typecheck pass; source authority routes correct actions.
Task verification command: `npm test -- src/components/payroll --maxWorkers=2`

### Task 3: Private statement viewing and scoped portal history

Ownership: MyPay, shared document presentation, bounded portal statements component and UI tests/styles.
Interfaces: Task1 document decoders; existing own/portal list and authenticated inline/attachment endpoints; Task2 run lineage for authorized portal context.
1. Add failing real-render tests for distinct safe view/download links, unpublished availability, own history and scoped portal metadata. Expected: existing statement UI only downloads and has no portal history.
2. Reuse one document presentation; construct protected URLs from document IDs. Keep sensitive data loading/unavailable/empty distinct and clear on lost access. Display linked correction context from authorized runs without inventing unavailable document metadata. Expected: existing download preserved; private view and readable history work on mobile/desktop.
3. Owned fictional production HTTPS browser: Chromium/WebKit at 320/390/768/820/1024/1440; native blocked→recalculate→review→approve→worker→published and correction history; own and scoped Manager/Owner identical stored inline/download bytes; foreign/revoked denial; pending/interrupted/exact retry/stale/conflict/refresh failures/keyboard/axe/nooverflow. Native fixture explicitly documents conditional midnight assumptions, not legal defaults. Expected: real workflows pass, no backend weakening or sends; missing manual/physical/statutory coverage remains disclosed.
4. Run full suite, typecheck/scoped lint and one fresh final whole-branch review. Record all failed attempts/held tests, exact source hashes and UI-only commits. Expected: no new failures; evidence identifies exact source and independent acceptance remains open.
Task verification command: `npm test -- src/components/payroll src/lib/data/employee-notification-list src/lib/data/portal-notification-list --maxWorkers=2`

## Review Focus

Native true decoding; source-authority-specific actions and null monetary states; complete ready breakdown/privacy; exact opaque revision/token and retry body; no native import/payment commands or statutory activation; stale/role revocation and receipts after interrupted/confirmed writes; protected view/download/whole-run portal footprint; original document history and linked replacement preserved; six widths, both engines, keyboard/axe and trustworthy evidence. UI016/employer/workweek/daily invariance/independent statutory activation remain separate gates. Do not certify them with conditional fictional fixtures or screenshots.
