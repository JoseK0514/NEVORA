# Incoming commerce recovery patch review

codeQualityStatus: WATCH
recommendation: REQUEST_CHANGES
blockers: Correct ambiguous request classification and add behavioral regression coverage before integrating this patch.

Scope: EEE eee76416ec8d06435e73c3ecde9a77752ec0d446 to90e7b101c90abaddba71039c8ec5350ef045a81b in /Users/josek0514/.codex/worktrees/nevora-subscriptions-backend/NEVORA-UI-READINESS. Clean checkout inspected; no source edits.

## CRITICAL
None.

## HIGH
None. No authentication, role or commerce authorization bypass demonstrated.

## MEDIUM
1. Explicit JSON/RSC requests can receive a document redirect. src/lib/commerce/access.ts:94-96 treats navigate OR any text/html Accept token as sufficient, without excluding explicit JSON/RSC signals or checking HTML q=0. Independently invoked commerceDenial for GET /app/schedule and subscription_required; each of these returned303 instead of the promised402 JSON:
   - Accept: application/json; Sec-Fetch-Mode: navigate
   - Accept: text/x-component; Sec-Fetch-Mode: navigate
   - Accept: application/json,text/html
   - Accept: text/html;q=0
   - RSC:1; Accept:text/html; Sec-Fetch-Mode:cors
   The unavailable branch uses the same classifier and has the same503 contract issue. This can make fetch/RSC consumers follow a recovery redirect and receive the wrong representation rather than the error contract; it is not proof of unauthorized data access. Give explicit JSON/RSC indicators precedence, do not treat excluded HTML as accepted, and retain JSON denial for ambiguous non-document requests. Add both restricted/unavailable behavioral tests for these combinations. The handoff claim that explicit JSON/RSC reads retain their contract is currently too broad.

## LOW
None requiring another change. Missing billing/paused UI and shell composition are explicitly declared handoff dependencies, not hidden completion claims. This backend patch does not establish usable recovery pages.

## Verified behavior and tests
Independently ran the six focused files:76/76 passed, including22 new tests. The test matrix covers plain HTML/navigation, API paths, POST, plain JSON, plain text/x-component, exact billing bypass and failed binding. It omits the conflicting header inputs above; no assertion was weakened. New tests use a narrow isolated-binding seam and a synthetic fetch response; outputs assert status, exact destination/reason, absence of forwarded query data, no-store/no-referrer, and JSON error contracts. These are relevant behavioral tests, not prose pins or deletion checks.

Redirect destination is constructed from fixed /app/billing plus the bounded code and request origin; original query content is discarded. /api and /app/api are excluded from redirects even with navigation headers. Writes remain JSON402/503. Exact GET /app/billing bypasses only commerce binding/gate at the proxy; existing app layout still calls requireSession and requireSessionMutationProof. No new page-level role guarantee is established while the page remains absent. Descendants and writes do not share the new proxy exception. Clocker code is unchanged by this diff.

Read repository instructions, current layout/session boundary, full changed access/proxy files, new tests and handoff. Programming and remove-ai-slops were loaded earlier in this review session and applied: no unnecessary production abstraction, untyped production escape hatch, test deletion or implementation-constant-only coverage introduced. The classifier defect and missing mixed-header coverage are the material issues. No browser/DB/provider execution, deployment, independent audit closure or hosted UI certification performed. Root retains final assembly/development/hosting custody; old04fe layout was not imported.
