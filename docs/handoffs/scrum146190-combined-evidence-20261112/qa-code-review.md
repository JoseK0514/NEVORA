# Combined QA code review

codeQualityStatus: CLEAR
recommendation: APPROVE
blockers: []

Scope: committed diff eee76416ec8d06435e73c3ecde9a77752ec0d446..2470b37f746f82ebaa751e9c593c1f53c5baf927, exactly .github/workflows/ci.yml, scripts/d2-hours-route-focus.mjs, scripts/d2-hours-route-focus.check.mjs, scripts/phase-d2-ui-remediation-qa.mjs. HEAD independently confirmed at reviewed head. Existing publication PDFs/manifest modifications left untouched. No notepad path supplied. ULW status returned ULW_LOOP_PLAN_MISSING, so fallback report location used.

## Findings
- CRITICAL: none.
- HIGH: none.
- MEDIUM: none.
- LOW: scripts/d2-hours-route-focus.check.mjs:13-34 does not directly exercise a focused, exact-entry heading whose frame is still loading and then becomes ready. The production helper correctly checks ready at scripts/d2-hours-route-focus.mjs:12; an additional behavioral fixture transition would protect that requirement against future removal. Nonblocking coverage suggestion.

## Evidence and correctness
- Independently inspected the entire four-file diff, package scripts, repository AGENTS.md, native focus owner in src/components/employee-mobile/hours-corp.tsx:59-61, context construction in src/components/employee-mobile/hours.tsx:47, existing deadline wrapper and CI browser-runtime setup.
- The helper is observational: visible connected heading, ready frame, matching entry segment, document foreground and actual activeElement are required. It installs observation listeners before checking and removes listeners/timer on settlement. It never focuses the application or dispatches input/events. Parsing the existing context attribute is required to distinguish the selected entry, rather than unnecessary production parsing.
- The original strict link-focus assertion and single Enter remain unchanged. The new deadline is fixed at 15 seconds before entering the route; the helper shares that absolute deadline rather than granting a fresh interval. Earlier locator/navigation calls retain their existing individual timeouts; this change does not introduce a hard cancellation of every preceding call, but cannot accept late heading readiness after the absolute deadline.
- The two explicit heading.focus calls in the regression fixture simulate the application's real delayed focus behavior. They are not added to the application scenario or observer.
- No application UI, worker receipt-drain repair or diagnostics changed in the reviewed diff.
- Retained ../scrum146-ci-failure-phaseD/nevora-d2-browser-evidence/report.json independently inspected: checkpoint f13614ae3a7aa661abbccc7c0643005d6e28fd0f, failure at original remediation line 164, WebKit documentFocused=true/linkFocused=false/activeTag=H1. Consistent with the existing postcommit frame focus effect.

## Checks actually run
NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE=/Users/josek0514/.codex/worktrees/nevora-hosted-closeout-20261112/tools/ci-browser-runtime/package.json node scripts/d2-hours-route-focus.check.mjs

Exit 0. Chromium and WebKit both passed delayed heading observation, foreign entry rejection, missing focus rejection, expired deadline rejection and single Enter navigation. Browser runtime version assertion passed at 1.62.1. This report records the independently executed result; no separate run log was created.

Read ../scrum146-local-d2-fixed.log: 282 checks and zero errors at earlier standalone checkpoint 66bfaacfceb5401a325cfd578caff0cfbddb301a. This is prior-candidate evidence, not a full combined-head run. Did not independently run the reported 46 other tests or full D2.

## Skill-perspective check
Loaded remove-ai-slops and programming SKILL.md from the installed OMO 5.1.30 skills, plus Superpowers requesting-code-review and repository executive operating model / CTO skills. Applied their overfit, unnecessary complexity, boundary, and regression-test perspectives. No material violation found: no deletion-only/prose/tautological regression tests, no production extraction, no unsafe type escape, and the helper provides a real native-browser test seam. The compact JavaScript style matches adjacent QA scripts. The low-priority missing ready-state transition coverage is noted above.

## Verdict and limits
Ready for the next combined-candidate verification gate within this QA-only scope. This is not independent hosted QA, an audit certification, or deployment/development-push approval. Full application acceptance on the exact combined candidate remains outside this review. No provider calls, deployment, branch/index movement, implementation edits, or publication-file changes performed. Only this required review artifact was written.
