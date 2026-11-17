# Rondo company knowledge code review

Reviewed the uncommitted candidate against detached base 48bd4cad1d5ac59b073c7a1cb7d6b6660a197f17 and docs/superpowers/specs/2026-11-15-rondo-company-knowledge-design.md. References below identify the reviewed version before remediation. No release certification. Reviewed production code, SQL, tests and UI contract. No ULW plan exists.

## CRITICAL

None identified.

## HIGH

1. src/lib/owner-advisor/store.server.ts:86 checks the completed fingerprint before acquiring the workspace advisory lock inside db/migrations/0036_owner_advisor.sql:23. An overlapping completion holds that lock with an uncommitted tagged result. A feature-off replay sees running in the outer statement, waits for the lock in the volatile reserve function and can then read the newly committed tagged result. Serialize the outer check and reserve, and verify with two database connections and controlled lock release.
2. src/lib/owner-advisor/tools.server.ts:93 nests the existing briefing under operationalBriefing. src/lib/owner-advisor/decision-metrics.ts:22 expects counts and date directly on data. With the flag enabled and an empty library, typed staffing metrics from the mandatory operational briefing are rejected. Preserve the operational contract and exercise the real tool output through typed metric rendering.
3. src/lib/owner-advisor/company-knowledge-reader.server.ts:50 supplies all eligible document titles on each search even for zero matches, outside the citation and byte budgets. Publish twenty documents with individually distinguishable titles and inspect repeated no-match payloads. An Owner-authored title is content. Remove the catalog or account for each exposed source and its bytes.

## MEDIUM

1. src/lib/owner-advisor/company-knowledge.server.ts:75 omits the knowledge revision from the persisted fingerprint. A completed ask followed by a draft edit replays and keeps history because the active version set is identical, whereas the same revision change invalidates in-flight settlement. Persist the originating revision in the comparison to meet the spec's replay requirement.
2. src/lib/owner-advisor/company-knowledge.server.ts:70 computes next effective transition without review_due. Line 75 excludes reviewOverdue from replay identity. An old answer that says review is current can replay after the review deadline. Keep the source eligible and invalidate observations whose advisory status changed. Verify both reuse and in-flight cases around that deadline.
3. src/lib/owner-advisor/service.server.ts:68 checks knowledge and then computes the observation stamp in a separate transaction based only on session expiry. A response one second before knowledge expiry can give the consumer fifteen seconds of validity. Guard the returned observation and cap its lifetime at the next change. src/components/owner-advisor/controller.ts:97 consumes that stamp.
4. Test perspective check ran using remove-ai-slops and programming, including its TypeScript reference. src/lib/owner-advisor/company-knowledge-advisor.integration.ts:40-41 pins specific prompt fragments. Lines 33-37 return a predetermined synthetic answer, so the assertion of zero shifts at line 44 never exercises a prohibited tool call. Keep assertions for real retrieval and exact citations, and use a scripted attempted write and observable rejection for authority coverage. src/lib/owner-advisor/company-knowledge.test.ts:51 mirrors an implementation constant already covered by behavioral integration tests. Unbounded title extraction above also violates the remove-ai-slops perspective.

## LOW

None additional.

## Checks

Personally ran git diff --check and the two focused unit files company-knowledge.test.ts and company-knowledge-runtime.test.ts. The tracked whitespace check passed and all 14 unit cases passed. Read the owned integration tests. Parent-managed SQL and full-suite runs were not independently rerun. No remote or live model activity.

## Result

codeQualityStatus BLOCK. recommendation REQUEST_CHANGES. Resolve the three HIGH findings and verify on the revised candidate. Root owns remediation and can retain this report as the pre-fix record.
