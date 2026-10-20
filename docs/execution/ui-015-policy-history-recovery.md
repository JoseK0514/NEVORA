# UI-015 Company policy recovery execution

Spec: the snapshotted `UI_015_POLICY_HISTORY_RECOVERY.md` under the canonical Company & Access policy-history-recovery handoff. Canonical queue permits preparing the combined candidate before independent acceptance; independent combined QA remains the final gate.

## Context and Global Constraints

Start from completed UI checkpoint b6e7c440f398a95644f8fb714fb9f6ae9065eec3 in a separate clone. Adopt Company commits 411f4bb45f81edef516cca2f1663855021b7726c, 1dc9d5acd530799da453935c79256c4272336aaa and 229f39f03ab0cc9fee7510caac58cde93cd3f7d8 unchanged. Local backend assembly parent is 0f003ee9; preserve its source hashes. Do not touch live preview, initial source/evidence, peer checkouts, backend, shared controls, DEV or MAIN. No push, deployment or release. Native payroll screens remain draft dependencies.

Use the approved Inter/Phosphor/palette/controls. Invalid current is distinct from invalid historical. No raw invalid payload or parser diagnostics in UI. No fallback activation, unknown-field merge, history rewrite, compensation reset, speculative evaluation or new business functionality. Uncertain save retains its exact request only in memory; semantic changes stay frozen until a confirmed outcome. Revoked/private read state suppresses the editor.

### Task 1: Recoverable Owner policy page and editor

**Ownership:** company-policies page, company-policy-editor, scoped company-policies CSS, their tests and UI fixture; execution/handoff evidence only.

**Interfaces:** consume CompanyPolicyHistory/PolicyScopeHistory using type-only client imports; consume readCompanyPolicyHistory on server; unchanged private GET and CompanyPolicyCommand POST. Produce an explicit reviewed same-scope valid replacement draft targeting the actual selected expectedRevision. No shared interface is changed.

1. Add regression tests for valid/invalid/valid page rendering, unavailable initial reads, invalid selected held states, empty revision 0, Owner-private labor summary and immutable historical metadata. Run before code changes. Expected: the strict baseline cannot render malformed history; no recovery workflow exists.
2. Implement typed initial read and generic retryable read failure. Selected-valid editing survives older invalid rows. Invalid-current form is held until Owner explicitly selects a valid earlier same-scope draft and reviews the full replacement. No eligible draft or inactive location stays held.
3. Retain complete validated labor/inheritance choices. Show configured private compensation, rates, budgets and calculation reference for review; no extra authoring. Implement private refresh, real revision receipts, stale draft comparison, exact uncertain retry and authority redaction. Expected: tests pass without backend changes.
4. Run real owned PostgreSQL/Next browser scenarios: malformed latest → explicit review → scalar correction with latest expectedRevision → valid current + retained invalid history; company/location independence; conflict comparison; unconfirmed exact retry after a later revision; read/auth failure; inactive/empty scopes. Inspect 390/820/1440, Chromium/WebKit, keyboard/focus and axe. Original rows must be identical after correction. Expected: normal UI flow passes, no horizontal overflow or automated violations.
5. Run affected parser/history/HTTP/page/editor suites, typecheck, scoped lint and full default suite. Expected: no new failures; report every skipped/held case separately. Commit UI-only increment. Record source, evidence hashes and clean source/preview custody.

**Task verification command:** `npm test -- src/components/company-policy-editor.test.tsx src/app/app/settings/company-policies/page.test.tsx src/lib/business-improvements/company-policies src/app/api/company-policies/route.test.ts src/lib/business-improvements/labor-budget/model.test.ts --maxWorkers=2`.

## Review Focus

Independently inspect numerical scope selection despite timestamp ordering; absent/null versus malformed; same-scope recovery and inactive scopes; complete Owner labor preservation and replacement acknowledgement; exact retry across newer revisions; stale draft comparison/no automatic overwrite; receipt versus current selection; current-cookie denial and no client raw diagnostics; client bundle type-only imports; no initial preview/source changes. Author evidence does not self-close independent NVA-002/UI-015 acceptance.
