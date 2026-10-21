# Task 2 — clean-page browser contracts

Status: implementation and covering verification complete; ready for task review, not release approval. Tracked-edit freeze released after final4 cleanup. Owner: browser_contract_rewrite. No application, dependency, schema, workflow YAML or policy edits; package validation list changed only as authorized; no push/merge/deploy. Existing independent UI exit remains NO-GO with open P1/P2 findings. All five Phase E suites have 14/14 passing cells across stated checkpoints; no required suite remains incomplete, but no single full 70-cell run at final HEAD was claimed. Controller’s final hosted CI is still required.

## Scope and controls

Six browser files plus the authorized package.json CI check-list entry changed against `62cb5dd76aea255fb464163ad1ae76d4e0e1a0fb`: Phase D harness; Phase E Home, attention and navigation scenarios; shared contrast measurement and its regression tests. Current clean candidate: `14a7acf76749e040e1ad78b652fdeef5af7eccae`.

Applied executive operating model/CTO/Governance, systematic-debugging and verification-before-completion: preserve business/security controls, reproduce old selectors, compare rendered source, use isolated fictional fixtures, maintain failing evidence and exact checkpoint custody. No exception or Jose approval requested. Independent audit findings cannot be self-closed by this task.

## Implementation and self-review

- Timecards: select real employee row and use actual detail dialog for approve/finalize/reopen, explicit status definition and refresh. Preserves immutable revision deep equality, stale-source rejection, actor boundaries and export integrity.
- Insights: current Hours by person heading, Period details disclosure and Export menu; preserves unpublished disclosure, neutral CSV/PDF/print checks, offline/403 clearing and Lead denial.
- Corrections: actual canonical Inbox detail link leads to attendance review. The route still exists and is functional. Queue scoped to visible `main .manager-corrections` after confirming duplicate hidden surface; exact correction ID focus and protected queue lifecycle preserved. Initial suspicion of missing workflow was disproven; not an app blocker.
- Inbox: canonical mixed-source counts/deduplication retained. UI rows compared to actual current-week response; historical-period API assertions remain. Added current-week completed fictional entry because fixed September fixture falls outside current Inbox week, then remove it after scenario. Pointer correction and native keyboard timecard links preserve exact employee/period context and focus.
- Request-note contract: HANDOFF.md592–608 and README section5 explicitly authorize `request.note` in selected management Inbox detail. Replaced obsolete blanket absence with exactly one authorized TIME_OFF note, excluded from compact fields/other items; selected detail intentionally shows it; private correction reason remains excluded. Offline/reconnecting/503/403 clear rows/counts/note DOM and text. Restricted-location and Employee/Lead denial covering tests retained and executed.
- Clocker/recovery: current Connect tablet, Enter your PIN, Recovery email/code, How you verified them, Issue recovery code and Sign in with new password labels. Receipt status is Recorded action found (not old heading). Missing receipt remains explicitly unconfirmed and does not cancel request. All exactly-once uncertain-intent recovery, immutable receipt, duplicate-focus/no-extra-read, blur-clearing, session invalidation, reused/expired code and identical known/unknown202 assertions retained. Only owned fictional SMTP.
- Home/attention: specific unpublished-location note replaces generic partial warning; full source-failure/cap disclosure remains. Current schedule removal is actionable required review with exact canonical week; no compact consent and other requests preserved. Current confirmed heading is You’re up to date. Empty week asserts seven unpublished day labels, no fabricated Off, no confirm and specific status. Published-empty D fixture now calls canonical publishScheduleWithRevision so publication history exists.
- Native disclosure: wait for actual links visible/hidden after keyboard Space/Enter close/open and animation; no forced clicks or keyboard removal. Navigation devtools close is conditional when WebKit already closed panel; app native navigation checks remain.
- Contrast: >=4.5 remains unchanged in normal/hover/pressed/focus. New helper measures actual ancestor gradient geometry and alpha overlays with conservative sRGB channel bounds. Unsupported images/compositing or crossing foreground/background bounds throw a measurement limitation. Legacy solid-only read produced false1.1:1; all 56 engine/width/state measurements pass; worst tested ratio 4.938449529801125 (WebKit 1024 hover; white foreground255/255/255 over conservative composited background52.6448/122.9402/120.3002). Chromium 320 normal/focus6.9857 and hover/pressed5.277. Gradient source is employee-home-reviewed.module.css209; white12% hover/active overlay259/261. All raw rendered/composited samples/layers live in safe checks JSON. Four deterministic helper regressions cover21:1 solid, worst gradient failure, alpha hover and unsupported image rejection. At root’s explicit scope extension, package.json test:release-engineering now includes the regression .check.mjs, so existing validate CI exercises it without new jobs/dependencies. `npm run test:release-engineering`:56/56 PASS. The helper also runs through existing Phase E Home CI browser invocation. This is bounded computed-style measurement, not pixel raster or arbitrary CSS certification.
- No remaining exact Sign In browser selectors; existing Sign in already correct, no unnecessary edit.

## Validation custody

All runtime browser work uses existing pinned Playwright1.62.1/axe4.11.0 and owned PostgreSQL16.15, isolated loopback DB/app/SMTP with outbound traffic blocked. Reports declare local versus hosted limitations and clean source SHA. Phase E source manifests verify tracked hashes before/after cells. Earlier passing E comms/calendar scripts and all app files are unchanged by later D/attention commits; final hosted combined-candidate CI remains controller work.

Final invocations use `NEVORA_TEST_PG_BIN=<existing16.15 runtime> NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE=$PWD/tools/ci-browser-runtime/package.json`, plus explicit `PHASE_D/E_EVIDENCE_DIR` and `PHASE_D/E_EXPECTED_SHA=$(git rev-parse HEAD)`:
- `node scripts/phase-d-owned.mjs browser` — final4: 201 checks PASS (Chromium 101/WebKit 100; Chromium alone generates PDF using its supported page.pdf API, while both verify print content), errors 0 (10 recorded WebKit API network cancellations kept separately), clean 14a7acf76749e040e1ad78b652fdeef5af7eccae; isolated run and owned cleanup completed. Earlier final1: 101 Chromium checks PASS; first WebKit page.goto load timeout, overall failed. Owned Next log: timecards200 in1.24s, then first webmanifest dev compilation16.8s versus15s load timeout. Contention remains a hypothesis; isolated final2/final4 passed that navigation; no timeout increased.
- `node scripts/phase-e-owned.mjs browser --suite all` at715ba991:28 cells PASS (all Chromium Home/comms/calendar/navigation), attention320 failed obsolete empty status assertion. Nonzero preserved. Not a70-cell pass.
- `--suite communications` and `--suite calendar` at75d565cb:each14/14 PASS with both engines/all7 widths. Unchanged suite/app evidence retained; no repeated full run solely for later D changes.
- Final standalone Home/navigation/attention runs at 688279ce: each 14/14 PASS, zero errors. All 70 Phase E suite/cells covered across explicitly identified checkpoints; not a single final-candidate all-suite run. Later changes touch only D harness and the authorized package check list; source-custody.json proves retained files/app unchanged.
- `node --test scripts/browser-contrast.check.mjs`:4/4 PASS.
- `npx vitest run src/lib/data/action-request-facts.server.test.ts`:3/3 PASS.
- `node scripts/phase-c-clocker-postgres.mjs vitest.management-profile-integration.config.mts`:10/10 PASS, includes owner note visible/restricted location omitted.
- `npx vitest run src/app/api/manager/action-center/route.test.ts`:13/13 PASS, includes unauthenticated401 and Employee/Lead403 before private sources.
- Node syntax/eslint all changed scripts and git diff --check PASS; exact invocation/exit metadata retained.

## Evidence and remaining gate

Durable evidence: `/Users/josek0514/.codex/visualizations/2026/10/20/01a15962-cdee-7dd0-8a92-023551b076fb/browser-contracts`. Each named e-/d- run directory contains its report and captured artifacts; covering-checks contains exact static/test logs, suite-summary, source-custody and contrast-summary. artifact-manifest.json records provenance and hashes. All listed success criteria are binary assertions in run reports/check lists; screenshots accompany viewport/state scenarios. `d-final4/report.json` is the final successful D evidence; d-final1/2/3 retain failed-run evidence. Excludes copied source/node_modules/Postgres data/env/session/cookie/connection files and token-bearing recovery/calendar images. Reports/check summaries/screenshots contain fictional fixtures only; source custody recorded by hashes. Intermediate failed runs are retained, not relabeled passes. Root owns task review, next server-contract task and full hosted candidate integration. No genuine new app defect established in adapted scenarios; independent existing P1/P2 findings remain open.

## Source references and final review

Privacy: `docs/product/specs/codex-joint/HANDOFF.md:592`, `README.md` section5, `src/lib/data/action-request-facts.server.ts`, its test line8, `src/test/integration/management-profile.integration.ts:53`, and `src/app/api/manager/action-center/route.test.ts:10`.

Corrections: `src/lib/action-center/project.ts:21` and `intelligence.ts:258` preserve `/app?view=attendance#correction-ID`; app/page.tsx55–57 redirects only retired views; manager-dashboard.tsx225–227 renders ManagerTimeCorrections. Browser assertions verify ready canonical API and exact request focus after Inbox detail action; screenshots capture focused correction and authorized selected note. No missing workflow reproduced.

Recovery receipt status: `src/components/clocker-recovery-review.tsx:167`; reset messages: `src/components/account-recovery.tsx:35`. Unpublished Insights message: `src/components/reports.tsx:203` inside native Period details. Final harness foregrounds manager, waits open property, exact scoped status and rendered text; old immediate main.innerText read intermittently missed open content in WebKit. D final3 retained 132 checks/nonzero. Its generic failure screenshot was the stale Lead page and is excluded from diagnosis.

D final2 retained 166 checks/nonzero. Screenshot shows protected paused clearing after native Tab from final footer Refresh, not absent API data. Final traversal starts first real row, uses existing macOS WebKit Alt+Tab convention and asserts document focus plus Inbox containment. Final4 passes all 201 checks at 14a7acf7, including native focus, exact unavailable disclosure, selected-note clearing and full recovery on both engines.

## Commit inventory

- `579818ba` test: adapt browser contracts to clean manager surfaces
- `89de07f5` test: scope sheet status and await disclosure visibility
- `0024c9f1` test: follow current report disclosure and review labels
- `75d565cb` test: assert current Insights protected-state headings
- `f8b03d05` test: measure gradient contrast and current schedule receipt state
- `cba5dcc8` test: accept already closed owned WebKit devtools menu
- `c3351552` test: verify canonical removal review and active correction tab
- `33efd282` test: scope current correction queue and unpublished review source
- `715ba991` test: follow Inbox actions and wait for native disclosure transitions
- `688279ce` test: preserve authorized Inbox details and clean recovery contracts
- `4fdd623b` test: prove Inbox privacy clears selected request details
- `fba40843` test: retain native Inbox focus and gate contrast regressions
- `14a7acf7` test: await foreground Insights disclosure content


---

# Task 2 correction round 1 — M1

Status: implementation and affected verification complete; ready for scoped re-review. Custody freeze released. Base14a7acf76749e040e1ad78b652fdeef5af7eccae; clean implementation commit 6eb1c074bb3cdf8285cf96eb79829021a99e5142. Only scripts/browser-contrast.mjs and scripts/browser-contrast.check.mjs changed. No app, package, workflow, dependency or assertion-threshold changes.

M1 reproduced before implementation: `node --test scripts/browser-contrast.check.mjs` returned exit1, original4 PASS/new3 FAIL (contrast-m1-red.log). New scenarios cover transparent black gradient over same-element white background and black ancestor; constant50% black gradient over same-layer white; varying-alpha stops retaining a transparent endpoint. The original helper incorrectly omitted the same-layer white paint.

Fix: each background now paints background-color over ancestor first, then background-image over that color. Pseudo overlays use the same paint order. Varying-alpha linear gradients conservatively use the entire stop range rather than narrowing by incorrect unpremultiplied interpolation. Full-transparent white-on-white and the varying-alpha white endpoint fail closed as a measurement limitation; they cannot return a passing ratio. Constant50% black on white produces RGB127.5 and ratio between3.97 and4.5 as expected, despite a black ancestor. Uniform-alpha current Home gradient still uses bounded local geometry.

Verification: after fix, exact same regression command exit0,7/7 PASS (contrast-m1-green.log). `npm run test:release-engineering` exit0,59/59 PASS (release-engineering-m1.log), including these7 tests in existing CI. Syntax, eslint and git diff --check all exit0 (static-checks.json). Home assertion stays >=4.5 for normal, focus, hover and pressed. Browser run: existing owned PostgreSQL16.15 and Playwright1.62.1, `PHASE_E_EVIDENCE_DIR=/tmp/nevora-verify-33-browser-e-home-m1 PHASE_E_EXPECTED_SHA=$(git rev-parse HEAD) node scripts/phase-e-owned.mjs browser --suite home` with existing runtime environment variables from Task2 brief. PASS14/14 cells (Chromium7/WebKit7), zero errors, clean exact checkpoint6eb1c074bb3cdf8285cf96eb79829021a99e5142. Owned runner exited0 and closed its resources. All56 rendered state ratios remain>=4.5; worst 4.938449529801125 at webkit 1024 hover. Full colors/composited samples in rendered-contrast-summary.json and per-cell checks.

Evidence accounting: original artifact-manifest.json has370 copied-artifact entries. Original durable-inventory.json has390 entries: the same370 plus20 listed in inventory-reconciliation.json (covering logs/summaries, manifest itself, scoped logs, curated paused screenshot, PDF and report). Both were independently hashed in this round: zero missing files and zero hash mismatches. These are two explicitly different inventories, not a claim that artifact-manifest contains390. Original evidence and original durable report remain unchanged; this supplement records correction-round evidence separately.

Limits: conservative computed-style sRGB bounds, not arbitrary CSS/pixel certification. Unsupported or foreground-crossing combinations fail closed. No D or other E browser rerun: their harnesses and app files are unchanged; prior exact-checkpoint evidence remains valid for that scope. Final combined hosted CI and existing independent UI NO-GO findings remain open. Re-review required before this finding is closed.
