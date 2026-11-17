# Rondo business UI contract questions 2–9 — bounded implementation
Date: November 17, 2026. Owner: this Codex chat. Claude retains all UI files.
Baseline: freshly fetched Development e8181384fc98d3c0edd988ae1cfc04819f63d2ee.
Workspace: isolated detached nevora-business-contract-questions-20261117/NEVORA.

Jose explicitly authorized resolving questions 2–9, required backend changes, testing and Development publication. No new branch, UI implementation, production/main promotion, hosted migration/provider activation, real records/messages or model spending is included.

## Decisions and implementation
- [ ] Q2: add active authorized location id/name projections to the maintenance catalog, preserving existing activeLocationIds and includeLocations=false data minimization. Fence returned labels against changes.
- [ ] Q3: return the actual SQL review-handle expiry; keep it distinct from the 15-second response/privacy observation. Read existing expiry columns; no migration expected.
- [ ] Q4: document and test each write's source revision/map revision and exact digest; new sources require sourceId=null/expectedRevision=0.
- [ ] Q5–6: export closed client-safe finding, qualifier, reason, validation field/code and HTTP error code definitions and typed error envelope. Bind actual producers to these definitions and preserve safe detail redaction.
- [ ] Q7: approve memory-only exact payload plus content-free sessionStorage operation metadata scoped to company/Owner/session; specify unknown and post-reload recovery. Prove original-operation recovery without an invented replacement.
- [ ] Q8: confirm /app/ai-manager/business, Claude page/nav ownership, parent/import/retrieval flags and recovery-only behavior. No route/UI file changes here.
- [ ] Q9: define per-action acknowledgement and full reachable bounded review; acknowledgement is an Owner-reported claim, not accountant/provider verification.

## Verification and publication
- [ ] Capture baseline and RED reproductions before production edits.
- [ ] Focused unit/HTTP tests plus real disposable PostgreSQL service/catalog/expiry/revision/role/recovery cases.
- [ ] Full unit suite, typecheck, lint, source inventory, source-qualified six manuals, clean safe build and relevant actual browser/API evidence.
- [ ] Review diff for authorization, privacy, compatibility and exact question coverage.
- [ ] Freeze exact candidate; require existing immutable-candidate CI and all ten current protected Development checks; publish only a non-forced fast-forward, then verify actual Development runs.
- [ ] Update SCRUM-209 and the source-bound Claude handoff with exact answers, examples and shipped SHA.

Runtime risk is additive metadata/types; existing actor/session/context/version/replay fences must remain. No guard, threshold, test assertion or original failure evidence is weakened. Rollback is a reviewed code revert, with prior Development and original operation receipts preserved.

