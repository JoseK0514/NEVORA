# Commerce recovery negotiation correction

codeQualityStatus: CLEAR
recommendation: APPROVE
blockers: []

Reviewed uncommitted src/lib/commerce/access.ts and src/proxy.commerce-recovery.test.ts over fd1414247334839391dc37f3f4ac83a8559757d7 in the root-owned worktree. No source edits made.

## Findings by severity
CRITICAL: none. HIGH: none. MEDIUM: none remaining. LOW: none requiring correction.

## Resolution and evidence
The prior ambiguous-header blocker is resolved. Positive-quality application/json, +json and text/x-component take precedence over HTML/navigation. Presence of the RSC header also prevents a document redirect. Explicit HTML with zero, malformed or duplicate q parameters no longer qualifies, including when Sec-Fetch-Mode is navigate. Positive valid weighted/case-insensitive HTML still redirects. The gate continues to exclude API paths and writes and forwards only the bounded reason to same-origin billing recovery.

Inspected work/recovery-negotiation-red.log: all20 conflicting/refused negotiation cases fail against the earlier classifier (303 instead of402/503), while the retained controls and positive cases remain present. Independently ran the six focused commerce/proxy/status suites after correction:98/98 passed, including44 proxy cases. git diff --check passed. Existing22 proxy controls were retained; the additions assert observable response status/body/location behavior for both authority-denial states, plus two valid HTML quality cases. No assertions were weakened.

Programming and remove-ai-slops perspectives loaded in this session were applied. Accept quality handling is a small, justified parser at the request representation boundary, needed to distinguish actual admitted HTML from excluded HTML. No speculative abstraction, duplicate production normalization, deletion-only test, prose pin or tautological assertion introduced. No material skill-perspective violation remains.

Approval is limited to this correction and supersedes the classification blocker in work/recovery-patch-review.md. The missing billing/paused UI, current session/role composition, full candidate/development gates, refreshed source-bound artifacts and hosted acceptance remain separate outstanding work. No DB/provider/browser/CI mutation or independent-audit closure occurred. Root retains assembly and hosting custody.
