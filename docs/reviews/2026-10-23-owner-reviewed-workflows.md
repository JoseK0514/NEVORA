# Whole-branch engineering review

Base: 055a383df5727526656c7cce423d5cfea57e4cee
Head: e1fcb9898e0cbd5cf6b7be5726490c73e5df61b7
Scope: prioritized briefing, private triage, exact coverage proposals/publication consent, recorded bilingual attendance/payroll review, supporting contracts/UI/tests/migration.

codeQualityStatus: BLOCK
recommendation: REQUEST_CHANGES
reportPath: .omo/evidence/owner-reviewed-workflows-code-review.md

## Strengths

- Scheduling remains the write authority. Proposals use canonical eligibility and actor/workspace/source-bound reviews; confirmation revalidates and publication requires explicit server-enforced consent. PostgreSQL tests exercise duplicate confirmation, stale/revoked authority, published revision creation and draft no-notification behavior.
- Payroll deliberately stays unverified. The server projection and UI distinguish stored status/rule revision from current financial approval; finalized timecards are labelled historical. The payroll query selects bounded public facts, sanitizes exception categories, and excludes monetary/private fields. This is an honest implementation of the documented boundary.
- Private briefing choices use owner/workspace isolation, request replay and expected revisions. Previously reported resolution/fingerprint/proof-limit issues have corresponding changes and discriminating regressions.
- New structured actions originate in server evidence, not provider prose; executable review hints are excluded from provider input. Existing authorization, no-store transport and lifecycle retirement are retained.

## Issues

### Critical / CRITICAL
None identified.

### Important / HIGH — Published consent composition creates invalid HTML and an unstable accessible name
Location: src/app/app/schedule/new/page.tsx:102–105. Notice renders children inside a paragraph (src/components/wave-a/parts.tsx:28), so the new paragraph becomes nested paragraph markup and causes hydration repair/errors. The checkbox is inside an implicit label; validation inserts its error immediately after the input (src/components/form-validation.tsx:64), changing that label’s accessible name after the required-field error. This affects the central explicit-consent interaction. The clean browser run at the reviewed head fails at owner-advisor-browser.integration.ts:199 after submitting unchecked consent; browser-clean.log records the exact checkbox locator timeout. Parent independently identified the same defect; code inspection confirms both causes.

Fix: keep prose-only Notice composition; place consent in valid form markup with a stable explicit label/id and associated validation description. Preserve unchecked initial state and server consent enforcement. Add a discriminating render regression and rerun the actual invalid-submit → keyboard-consent → canonical-save browser path. Do not weaken the accessible-name assertion.

### Important / MEDIUM — Missing coverage setup is omitted from partial evidence
Location: src/lib/owner-advisor/tools.server.ts:156–160 and 241–248.

The partial flag considers uncovered-block count/null rules but ignores health.setupIssues. A location with no coverage windows and no shifts has COVERAGE_NOT_CONFIGURED and zero blocks, so preparation returns partial=false and zero proposals without explaining that requirements could not be assessed. The conversational tool sees the same apparently complete empty result. The UI’s generic suggestion to check missing inputs does not restore the missing source-state distinction.

Reproduction run by reviewer: calculateScheduleHealth with one active/configured-staffing location, no windows/shifts, and date 2026-10-23 produced {setupIssues:[COVERAGE_NOT_CONFIGURED],blocks:[],advisorPartial:false}. Include canonical setup failure in partial handling and add a no-window/zero-block service regression. This is a source completeness bug, not a request to calculate additional eligibility.

### Minor / LOW
- src/components/owner-advisor/attention.tsx:12 retains the past deferred-until label after an expired deferral reappears. Existing handoff explicitly records this; it does not falsely resolve the issue.
- src/lib/owner-advisor/briefing.server.ts:19–22 extracts the complete historical canonical scheduling source before applying its cap. Existing handoff records the growth/latency risk. No new claim of bounded SQL extraction should be made.

## Skill-perspective check

Loaded and consulted remove-ai-slops and programming from /Users/josek0514/.codex/plugins/cache/sisyphuslabs/omo/5.1.30/skills/. Applied their overfit/test relevance and needless complexity criteria to production and tests. No new deletion-only tests, removal-pinning tests, tautological tests, natural-language prompt tests, or tests merely mirroring implementation constants were found. Tool-name assertions cover the actual allowed machine API; UI copy assertions accompany observable rendering and real browser paths, rather than pretending to prove model behavior. SQL fixture modernization preserves transactional wait barriers and zero-delta assertions. Input/output parsing serves actual trust boundaries; canonical adapters and privacy projection serve the approved goal. No additional material violation under either perspective identified. Existing casts/non-null assertions and compact variant branches follow surrounding conventions; this review does not prescribe an unrelated rewrite.

## Evidence inspected / executed

Read AGENTS.md, operating-model/CTO/CISO/technical-assurance skills, requesting-code-review template, both workflow plan and progress rulings, prior briefing handoff, git diff for the entire requested range and relevant canonical callers.

Reviewer reran: npx vitest run src/lib/owner-advisor/briefing.test.ts src/lib/owner-advisor/workflows.test.ts src/lib/owner-advisor/loop.test.ts src/components/owner-advisor/attention.test.tsx src/components/owner-advisor/controller.test.ts src/components/owner-advisor/render.test.tsx src/lib/data/coverage-repair.server.test.ts — 7 files, 75 tests passed, exit 0.

Inspected raw logs under .superpowers/sdd/2026-10-23-owner-reviewed-workflows/: default-pre-review.log (9466 passed/801 skipped), postgres-final-pre-review.log (37 passed), coverage-postgres-current-barriers.log (39 passed), engineering-pre-review.log (110 passed), typecheck-final-pre-review.log and lint-pre-browser.log (no diagnostics). These are executor evidence, not suites independently rerun by this reviewer. browser-pre-review.log is invalidated by source mismatch; browser-clean.log is a real failure, not a pass. default-clean.log was still incomplete when inspected. No independent QA/UI certification is claimed.

ULW status returned ULW_LOOP_PLAN_MISSING; report uses required fallback path. The progress ledger is the supplied notepad. No production code, tests, index, HEAD or branch state changed by review; this report is the sole review artifact.

## Declined to judge

- Live model answer quality: no additional inference budget and no live-provider evidence; deterministic workflow behavior and provider boundary code were reviewed.
- Hosted/integrated/production acceptance and independent QA/UI certification: separate gates outside this local engineering review.
- Recalculation/current financial-rule verification in this read tool: explicitly deferred to canonical Payroll by the approved plan, with truthful unverified labels; not treated as missing implementation.

## Assessment

Ready to merge: No, with fixes and verification required.

Fix the consent interaction and incomplete-source reporting, then complete clean-source browser verification and preserve raw evidence. Existing source-inventory integration blockers remain separate. No push, integration or deployment authorization is implied.

Blockers: published-consent markup/accessibility defect; no passing clean-source browser evidence for the new workflows at reviewed head. The MEDIUM source-completeness issue should be corrected in the authorized final fix pass.
