# Approved backend repair scope

Initial base: freshly fetched development `d8f35da69810550c71b4193069f17d5efd5fc060`; rebased without conflicts onto current development `4ef5f606932cff46932db78d1076d423bb98778e`. Execute in this detached worktree; preserve the repository's three-branch policy. Claude owns all UI. Jose explicitly approved approving leave with tracked staffing repair on November 9, 2026.

## Design

1. Admit only the platform-supplied exact immutable Vercel Preview hostname in addition to the explicit single-company origin. Production and isolated-workspace authority are unchanged. Keep intent, JSON, actor, scope, session and revision controls. Add private, nonsecret failure classification for Claude without breaking existing response bodies.
2. Build staffing-repair items from the durable approved request and the latest immutable whole-week published snapshot. The approval's recorded reviewer owns repair; task identity is request plus source shift, stable through reload/retry. Draft edits cannot clear a task. Only a published change or canonical released callout removes the overlapping obligation. This reuses durable source custody instead of creating a second mutable task ledger with a dismiss button that could conceal an unresolved conflict. Never expose leave reasons to scoped management or other employees.
3. Provide authorized manager and own-employee read contracts for pending conflict disclosure and approved repair state. Add approved conflicts to the existing management action source and preserve current source/session lifetimes. No role expansion and no UI edits.
4. Provide coverage aggregates from canonical schedule-health segments, weighted by required staff/position/lead minutes; unknown denominators remain unavailable. Claude replaces row-count arithmetic with this contract.
5. Record candidate-specific capability holds and exact schema evidence. No optional-feature activation, provider sends, production migration, production deployment or policy expansion.

## Execution and evidence

- [x] Origin regression RED, implementation, focused GREEN including production/isolated negative cases.
- [x] Staffing projection RED/GREEN: full/partial/multi-day/overnight/cross-location, stable identity and owner, no reason leakage.
- [x] Real owned PostgreSQL RED/GREEN: approve through canonical writer; preserve published assignment; ignore draft repair; clear only after publication; scoped/own/denied/revoked authority; fail closed on unavailable source.
- [x] Read API admission/session/selector tests; manager action integration.
- [x] Coverage RED/GREEN: segmentation invariance, staffing/position/lead shortfall, missing configuration.
- [x] Full default test suite, typecheck, lint, appropriate SQL suites and clean build; retain actual failures and skips.
- [x] Review whole diff against this scope; write source-specific contract and release handoff for Claude.

Release impact: CONDITION until the combined client is integrated and authenticated hosted acceptance passes. Backend implementation evidence cannot close independent QA/UI findings. No approval for main or production is inferred.
