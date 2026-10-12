# Payroll workflow UI lane

Status: P1 workflow UI implemented and verified against the published backend. P2 missing-period review and queued-notice contract adoption follows this checkpoint.

Integration owner: **Check findings resolution status**, chat `01a12fbf-5174-7e22-8d66-3aa154492b71`.
UI owner: **Redesign payroll exports**, chat `01a13031-8ae8-7401-bf2c-c5e50fb7347b`.

Published common base: `4386b096ba7f9635771fe5e40a71e5b3f98ad8e9`.
UI branch: `codex/payroll-workflow-ui-20261012`.
UI checkout: `/Users/josek0514/Documents/Codex/2026-10-12/using-the-structure-layout-and-animation-26/work/payroll-workflow-ui`.

The original redesign checkout and its untracked `.impeccable/` metadata are preserved. The common base includes the approved `9851ccf` presentation as `eea9a8a`, findings through `a00fa63`, and single-company inputs through `8950786` as `10277b9`. `PayrollPeriodClose` remains in the export page with its recovery/manifests/handoff behavior.

## Ownership

This lane owns new payroll settings, run/import/review, employee-statement pages/components/styles and browser tests. Backend/schema/API/worker/PDF modules belong to integration. The integration owner explicitly assigned `src/components/app-shell.tsx`, `src/lib/navigation.ts`, `src/components/nav-icon.tsx`, `src/app/app/settings/page.tsx`, `src/app/app/layout.tsx` and relevant tests to this lane. Other engineers' changes must be preserved.

Dedicated UI files:

- `src/app/app/payroll/page.tsx` and route-specific styling.
- `src/app/app/settings/payroll/page.tsx`.
- `src/app/app/my-pay/page.tsx`.
- `src/components/payroll/` for preferences, amount import, exceptions, exact-run review and statement lists.
- `scripts/payroll-workflow-ui-qa.mjs` for real integrated owned browser scenarios.

UI must check the default-off feature and actual server authority before rendering private records. Ordinary Manager time-review access stays separate. Native page navigation should avoid suggesting unavailable functionality; employee self-access derives identity on the server.

## Current contract

The source plan is `docs/plans/2026-10-12-configurable-payroll.md`. It defines `/api/payroll/settings`, `/api/payroll/runs`, `/api/payroll/statements` and authenticated `/api/payroll/documents/[id]`, `x-nevora-payroll: 1`, private/no-store responses, USD nonnegative integer minor-unit strings, a versioned neutral authoritative import, immutable effective-dated preferences/overrides, exact-revision approval and private artifacts. Internal calculation is unavailable; neutral bank outputs are compatibility-unverified.

Definitive `src/lib/payroll/contracts.ts` was published as `4272655` and adopted as `6ffa465`. The backward-compatible provider/channel preferences, `PayrollJob.outcome: NOT_SENT_STUB` and read-header clarification were published as `283f57f` and adopted as `677c4a6`. All XHR GET/POST requests send `x-nevora-payroll: 1`; authenticated attachment navigation uses the document endpoint directly. Internal calculation and verified bank compatibility remain unavailable.

The integration owner established server helpers `payrollFeatureEnabled` and `readPayrollCapabilities` in `src/lib/payroll/service.ts`, with an actual server-derived session proof. Published backend `f1da5a0` was adopted as `b5bdd94`. Disabled navigation preserves the existing shell. Current finance capabilities, rather than Manager role alone, control financial entry points; every current active employee may use self statements.

The UI stores only one opaque operation UUID for recovery. It retains a retry payload only in page memory. A lost response can retrieve the actor-scoped receipt after reload; a missing receipt remains explicitly unconfirmed. Approval includes the exact run revision and review token. A source conflict requires reimport/review; the UI does not compute taxes or net pay. USD display and dollar-form parsing use integer/decimal strings and BigInt, including values beyond the safe Number range.

Provider and bank-channel selectors record preferences only. They claim no connected account, native provider format, bank enrollment, submission or processing. Neutral JSON remains the amount input. Reminder jobs explicitly say delivery is disabled and no reminder was sent, even if stub preparation succeeded. Any future real delivery contract must be separately adopted.

The initial interface inventory/reference/acceptance proposal is saved in the previous UI checkout at `docs/handoffs/2026-10-12-payroll-ui-contract.md`, committed as `558109f`. The integration plan now supplies the common base; that earlier proposal does not override the shared domain contract.

## Preparation and verification ledger

| Work | State | Evidence / dependency |
|---|---|---|
| Isolated common-base UI checkout | IMPLEMENTED | Exact base/branch above, clean tracked source on creation |
| Inherited export/period-close UI baseline | VERIFIED | 47 real Chromium/WebKit checks passed on `4386b09`; source hashes/owned teardown retained under the parent chat work/common-base-browser-evidence |
| Shared field contracts | ADOPTED | `6ffa465`, `677c4a6`; canonical PAYROLL_API_V1 |
| Backend implementation and fixtures | ADOPTED | `b5bdd94`; actual owned PostgreSQL/API/PDF browser exercise |
| New settings/import/review/statement UI | VERIFIED | Exact contracts and server helpers; no backend/schema edits |
| Shared navigation entries | VERIFIED | Default-off paths preserved; actual Manager financial denial and employee self navigation tested |
| Focused display/parser/navigation checks | VERIFIED | 17 tests passed; targeted lint clean; component-only typecheck passed before dependent server route imports |
| New money workflow verification | VERIFIED | 41 checks in Chromium/WebKit; actual stale-source rejection, reimport, lost approval recovery, PDF SHA, separate publication, self-only document access, loading/error/empty and 320–1440px geometry |
| Existing export regression | VERIFIED | 47 Chromium/WebKit checks on this integrated P1 source with feature disabled |
| Full checks | VERIFIED | 214 test files / 2,207 tests; typecheck, full ESLint and production build passed |

P1 evidence lives in the parent chat's `work/payroll-workflow-browser-evidence/report.json` and matching `owned-next-y9sXKi/{browser-report.json,source-manifest.json,ownership.json,next.log}`. The original export regression is `work/payroll-exports-integrated-evidence/report.json`. All records are fictional in owned local PostgreSQL; actual Next routes, workers and PDF bytes were exercised. The parent fixture resolves `server-only` to Next's compiled empty guard solely during fixture setup, matching the existing server test context; the hook is removed before the actual Next runtime. Only the scratch database transport adapter is substituted. The owned app and database were closed after this successful run. No live notice delivery or payment was enabled.

WebKit at 320px initially painted the long native bank-profile selection beyond its label. The select retains native options and keyboard behavior with explicit ellipsis, overflow clipping and a decorative chevron. Mobile field size and viewport checks remain strict and now pass in both engines.

Keep approved DESIGN.MD tokens, local typefaces, Phosphor icons and restrained motion. Desktop uses compact panels and aligned values; mobile uses a natural single column, 16px fields, 44px targets and visible focus. Preserve every original mapping/retry/download/population action while exposing new workflow states only when supported.

No production deployment, notification, bank submission, statutory calculation or independent acceptance is authorized by this preparation.
