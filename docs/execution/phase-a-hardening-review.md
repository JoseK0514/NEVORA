# NEVORA Phase A independent review and controlled hardening

Recommendation: **READY FOR CHATGPT TECHNICAL REVIEW** after the single local commit and clean-status gate recorded in `final-repository-state.json`. This is a technical-review handoff, not Jose acceptance or production certification.

## Repository identity

- Branch: `codex/nevora-phase-a-hardening-review`.
- Isolated worktree: `/Users/josek0514/.codex/worktrees/nevora-phase-a-hardening-review/Fuel-Scheduler-`.
- Exact reviewed candidate and hardening commit parent: `1074557cf86eb045eb3da1f4f0b646ad7b8c005e`.
- Exact candidate parent / preserved Phase 5 checkpoint: `50407eb38e4f60ebb9c50f7bf5b62a13c323244b`.
- Approved Phase 4 / full Phase 5 review base: `6c0f2b77b6186c4cd86db7e97f869ea831ee32b0`.
- Reviewed full range 6c0f2b7→1074557 and focused range 50407eb→1074557, then the complete hardening delta.
- Final commit and clean status: recorded after the single local commit in external `final-repository-state.json` and chat.
- No edits to preserved Phase 4, stopped Phase 5, candidate source, development, main or unrelated Phase B worktrees. Exact protected HEAD/status checks are in `final-verification-summary.json`.

## Review control and findings

Three independent read-only specialist audits preceded implementation. Findings were deduplicated and independently proved by source, pure reproductions, actual PostgreSQL or actual authenticated Next/browser evidence. One implementation owner made all product corrections. A separate whole-branch reviewer inspected the final delta and re-ran their original three SQL probes; no additional confirmed open defect remained in that source review. External evidence is preserved at `/Users/josek0514/.codex/visualizations/2026/10/04/nevora-phase-a-hardening`.

| Finding | Severity | Confirmed defect and correction | Regression/evidence |
|---|---|---|---|
| H01 | MAJOR | Different owning weeks could swap through canonical server commands. Shared final-ledger evaluator now rejects at proposal and finalization, while same-week cross-location overnight swaps remain valid. | Original `workflow-sql-proof.out`; new hardening SQL proposal/ACCEPT/MANAGER_APPROVE no-side-effect cases and valid overnight control. |
| H02 | MAJOR | Old displayed timezone/episode/revision could pair with a newer fingerprint. Display reader includes this context in its same SQL read; both visible slots must match canonical terms before forms use fingerprints. Human timezone context is visible. | Original pure/SQL seam proof; source/target SQL interleavings; page tests; actual browser timezone and material-term seams. |
| H03 | MAJOR | ID-only callout could bind to newly changed terms. Submitted report requires reviewed fingerprint/assignment episode. Mounted reason/details are retained; refresh requires another deliberate submission. Urgent reporting retains its approved availability. | Original ID-only SQL proof; six material-change regressions; parser rejection; actual browser stale rejection, retained input, reviewed refresh and successful resubmission. |
| H04 | MAJOR | Proven stale OPEN offers retained participation while Cancel/Manager Close were hidden. Guarded maintenance atomically retires proven stale new-style offers, records immutable stale reason, cancels intent and releases participation. Authorized Cancel/Withdraw/Close remain independent of transfer eligibility; unknown legacy is not auto-retired. | Actual original UI/SQL; concurrent worker single event, rollback, renewed participation and legacy-close SQL; actual browser Cancel/Close. |
| H05 | MAJOR | Revoked location access still disclosed peer shift details. Discovery now requires current active self-service role/workspace/location access; target terms independently enforce discovery access; swap eligibility uses the shared evaluator. Authorized participant history remains. | Original security SQL and Next RSC proof; revoked/never-eligible/inactive/forged access SQL; actual HTML/RSC absence and valid cross-location control. |
| H06 | MINOR | Historical snake_case snapshots lost time/position/Lead facts. Reader normalizes legacy/current facts and preserves unknowns without rewriting history. | Actual historical9→0010 upgrade with both slots/callout/deleted source; sparse/current history cases. |
| H07 | MINOR | Known pretransaction DST errors falsely claimed unknown commit, and status closure was blocked. Strict absolute boundaries apply to transfers/approval; invalid transfer planning is truthful, while closure and reviewed inability reporting do not invent an instant. Genuine ambiguous COMMIT reconciliation remains. | Nonexistent/ambiguous New York SQL cases, zero transaction/operation for rejected transfer, successful close and existing response-loss race tests. |
| H08 | MINOR | Harness allowed an evidence child named `..evidence`. Path containment checks components and canonical ancestors. | New pure path tests cover root, child, dotdot-name, symlink parent and real sibling, without starting Next. |
| H09 | MINOR | Historical APPROVED callout falsely displayed Released for a current responsible assignment. `releaseApplies` uses existing episode/terms policy; UI distinguishes historical approval from current release. | Legacy missing context and same-owner material edit SQL; employee/manager presentation assertions and actual narrow browser state. |
| H10 | MINOR | Long explanatory prose in the control grid stretched mobile buttons to 108/144px. Prose is in assignment copy; existing CSS and 44px peer controls retained. | Preserved original 320px screenshot; markup test; new actual exact geometry checks across seven widths. |
| H11 | MINOR | OTHER reason accepted missing/blank/whitespace/two-character details despite the approved trimmed >=3 validation. Shared parser/form restore it with accessible conditional validation and retained input, preserving existing maximum bounds. | Original independent SQL repro; parser/SQL zero-side-effect and three-character control; independent final original probe; actual browser zero POSTs for invalid details and valid submission. |
| H12 | MINOR | Managers saw generic review copy without the concrete permitted exception reason. Finite manager-only copy now comes from the shared evaluator/current or recorded manual policy; it is outside controls. Unknown mandatory rules remain blocked. | Original independent overtime repro; manual/recorded-manual/overtime, revoked authority/unknown-rule SQL; manager markup and actual manager browser inspection. |
| H13 | MINOR | Final decision history recorded only creation policy revision. Prospective existing immutable event metadata now records evaluated policy/profile/configured-rule version references from the same final guarded snapshot. No private values, invented versions, history rewrite or migration. | Original Owner revision1→2 probe; auto/manager decisions, intervening Owner revision3 guard retry and rollback SQL; independent final original probe; finite UI history projection excludes metadata. |

All 13 confirmed defects are corrected and verified. **No confirmed BLOCKERS, MAJORS or MINORS remain open.** Final browser disposition is recorded below. Full structured dispositions, exact affected source paths and regression references are in [finding-dispositions.json](/Users/josek0514/.codex/visualizations/2026/10/04/nevora-phase-a-hardening/finding-dispositions.json). O01 acceptance-map overclaim for A005 is corrected to the actual cross-owning-week rejecting assertions. O02 is intentionally not redesigned: complete-history snapshot growth remains a measured capacity risk; retention or locking redesign needs separate review, and no customer SLA was invented.

## Fresh final verification

The following counts are complete final executions, not planning scenarios or previous self-review counts. Focused RED/GREEN logs remain separate and are not added again to these totals.

| Gate | Result |
|---|---|
| Full unit suite | 1,372 passed, 0 failed/skipped; 129 files. `npm test -- --reporter=json --outputFile=<external>/unit.json --maxWorkers=2`. |
| Shift-change PostgreSQL | 163 passed, 0 failed/skipped; 14 files. Includes 36 race tests + 3 completion-race tests and 34 new hardening SQL tests. |
| Protected generation PostgreSQL | 144 passed, 0 failed/skipped; 3 files. |
| Workspace/foundation PostgreSQL | 71 passed, 0 failed/skipped; 2 files. |
| Notification PostgreSQL | 77 passed, 0 failed/skipped; 1 file. Fake transport; no provider delivery. |
| Notification/foundation configuration | 6 + 8 passed. |
| `npm run lint` | Passed. |
| `npm run typecheck` | Passed before and after Next-generated config restoration. |
| `npm run build` | Passed. No migration in build script; no live credentials. |
| `git diff --check` | Passed; final staged diff/commit status also recorded. |

Exact argv, exits, output, test assertions and per-run source hashes are in `final-gates-v2/commands.json`, individual reports/logs and `final-verification-summary.json`. Each of the 12 final gate entry manifests matches the final 489-file source manifest SHA256 `c76dd6ecea6172ab30e4aef84248ef2577ce9a3b29257864c28f6c2add4d184d`. Build changed only Next-generated next-env/tsconfig; generated bytes were archived and exact entry bytes restored, followed by a passing typecheck. The eventual additional final handoff document is documentation only; exercised product/test/config bytes are unchanged.

Initial failed runs are retained in `final-gates/`: render-time Date.now lint and missing test component alias were corrected without disabling rules/assertions. Two timeouts under overlapping owned heavy workloads passed serially with unchanged scenarios/limits: 50 workers/7 days/20 locations at 73,659ms against 120,000ms, and New York/20 arbitrary locations PostgreSQL at 7,009ms against 15,000ms. No scheduler/planner code or timeout was changed. This supports a resource-contention explanation; it is not production capacity proof.

## Browser and protected evidence

Fresh actual application results:

| Evidence group | Result and exact scope |
|---|---|
| Canonical authenticated Chromium | **65/65 PASS**, no uncaught errors; includes 42 seven-width UI cases plus real authenticated journeys. |
| Canonical authenticated WebKit | **65/65 PASS**, no uncaught errors; same journey/UI scope. |
| Independent hardening supplement | **23/23 PASS**, including timezone display seams, callout input retention/review/resubmit, required OTHER validation, stale recovery, peer HTML/RSC privacy and approved-release copy. |
| Separate genuine Manager supplement | **5/5 PASS**, DB-verified MANAGER accounts in both engines exercise stale Close and concrete pending-policy reason; 44px controls. |
| Protected same-input current states | **218/218 exact unmasked pairs**, no browser errors: Login; Employee/Lead Home, Schedule, Availability, Time Off, My Time; Owner-session management Dashboard, Schedule, Availability, Time Off; both Clocker routes in landscape/portrait. |
| Additional populated published Schedule | **56/56 exact unmasked pairs**, no browser errors: Employee, Lead, Owner and genuine Manager × seven widths × two engines. Explicit existing `?week=2026-10-12`; actual published assignment IDs, date, time, location and position asserted. |

Widths: 320, 375, 390, 430, 768, 1024, 1440. Clocker: 1024×768 and 768×1024 for `/clocker/2` and `/clocker/110`, both engines. Recovery controls were measured at 44px, keyboard/focus-visible state checked, and final controls scrolled above navigation with no horizontal overflow. Chromium uses Tab; WebKit's tested native full keyboard navigation uses Option+Tab. This is browser-engine evidence, not physical keyboard/device certification.

All six final scratch-runtime inputs match the recorded frozen source; only `src/lib/db.ts` is intentionally substituted inside the owned runtime. Their ownership records verify shutdown/DB teardown. Exact input source/fixture hashes and commands are retained, including `final-app-core-commands.json`, `independent-ui-verification.json` and `ui-execution-commands.json`. The independent whole-branch reviewer also inspected these reports and hashes. Root independently recomputed both unmasked RGBA comparisons into separate `*-root-recheck.json` outputs without overwriting QA evidence.

The original 218-state fixture has empty current-week schedules because its published assignments are in the future week. Its scope is stated honestly; the additional 56 populated pairs close that specific gap. Current-state fixture input SHA256: `3896bfa3692c094597b6b00503cf3c8676b996286e5550a4326e21696a85df81`. Populated normalized render-input SHA256: `425c37a2e06fb25f2e24a4dff9757e8eab7f19ddb84a5f1040335a3f9e9aab2b`. Clocker browser Date alone is fixed equally for baseline/candidate at `2026-10-04T16:00:00Z`; the server business clock was not faked.

Role attribution is explicit: original supplement H12 and H04 management captures used OWNER sessions even where check names said Manager. Original files remain immutable; `ui-role-attribution-correction.json` records the correction, and the separate actual-Manager run proves the MANAGER branches. Protected management captures also use Owner; populated variants include genuine Manager. The browser H12 reason case is configured manual policy; overtime reason is independently proved by actual SQL, not claimed as a separate browser journey.

Earlier browser failures remain separate: initial selectors expected underscore timezone labels, an unscoped alert matched Next's empty route announcer, and WebKit navigation used the wrong native key convention. The first final H03 attempt checked old DOM immediately after refresh; the external driver now awaits the actual RSC response and rendered reviewed time, preserving original assertion and source. Corrected full execution passes; no application assertion, baseline or product code was weakened to turn those driver failures green.

Actual Next development runtime, real session cookies/RSC/Server Actions and owned PostgreSQL were used. Only the scratch runtime's database transport is adapted to local PostgreSQL; production Neon is not exercised. Browser requests to nonlocal services were blocked and providers disabled. Source manifests record the exercised source and exact fictional fixture inputs. All pending/loading/error/stale/refresh/success checks are actual application behavior, not screenshot-only proof.

Fresh protected comparisons are candidate107→final hardening, not a rewrite of old Phase4→Phase5 evidence. Historical original attribution remains **179/182 exact original pairs, three Chromium Schedule pairs differing by 12 pixels each**. A **separate unchanged-source repeat** varied by 30 pixels at two widths. The archive-integrity report verifies original files/hashes; this is not a fresh execution or a claim all earlier visual pairs are exact. No baseline was overwritten or pixels masked.

## Database and security boundaries

Migrations 0001–0010 are unchanged by this hardening commit; 0001–0009 are byte-identical to the approved Phase4 base. Existing additive 0010 is reviewed and exercised only in newly ownership-marked disposable local PostgreSQL databases. No new migration was created or applied to an existing/customer/Neon database. Migration0010 SHA256 `0d8b55abe49995204bda9e63492026158b91b8dc4ca414d05c77b595a6474d8e`. Fresh upgrade/schema/transaction tests include historical data preservation, trigger invariants and contradiction rollback.

Independent security review traced current active SQL session/role/access, actor/workspace operation ownership, forged commands, final-write permission checks, peer discovery, private history projection and notification payload boundaries. Confirmed disclosure H05 is corrected and independently exercised. Manager review is not an unknown-rule bypass; Owner-only policy authority remains. Business writes and durable intent are atomic; external delivery is not in the business batch. No blanket production security certification or exactly-once delivery claim is made.

## Performance and remaining limitations

Initial independent fictional candidate sample: 4 employees/1 shift, 10k events +10k operations → source 16,716,382 bytes, guard 18,724,979 bytes, ~431ms local command; zero-history command ~24ms. This is the original review measurement, not a post-hardening production benchmark. Source review confirms the growing complete-history design remains. Separately, the final protected fictional 50-worker/20-location planner test takes about 74 seconds locally; deployment latency/timeout capacity is not certified and no customer SLA was inferred from a test limit. Fresh standard performance sanity tests pass; production workload, serverless transport limits, history retention and capacity SLO remain unproven. Broad locking/retention architecture was deliberately not changed in this bounded pass.

No production Neon equivalence, real notification provider delivery, physical iPad/Safari/iPhone/Android certification, full real screen-reader certification or existing-production backup/restore rehearsal. Real activation remains a separate authorized environment/device/deployment decision. Local screenshots and emulation do not prove closed-app phone delivery. No customer policy values, labor defaults, approval modes or deadlines were changed.

No push, merge, deployment, customer migration, real notification, real publication, DNS change, paid service or provider activation; PhaseB/C not started. Only newly owned disposable resources are shut down; external screenshots, raw failure outputs, hashes, original baselines and review notes remain available.

## Recommendation

**READY FOR CHATGPT TECHNICAL REVIEW.** No confirmed BLOCKERS or MAJORS remain; all eight confirmed MINOR defects are also corrected. Acceptance and deployment remain separate. The final local commit/parent, exact changed files, clean Git status and owned-resource teardown are recorded in external `final-repository-state.json` after committing this document. This document is part of that one commit; no amend or earlier phase rewrite.

[Independent whole-branch review](/Users/josek0514/.codex/visualizations/2026/10/04/nevora-phase-a-hardening/final-independent-review.md) · [Independent UI review](/Users/josek0514/.codex/visualizations/2026/10/04/nevora-phase-a-hardening/independent-ui-verification.md) · [Exact changed-file manifest](/Users/josek0514/.codex/visualizations/2026/10/04/nevora-phase-a-hardening/changed-files-final.md) · [Final verification summary](/Users/josek0514/.codex/visualizations/2026/10/04/nevora-phase-a-hardening/final-verification-summary.json).

Fresh screenshot examples:

- [Employee stale-request recovery at 320px](/Users/josek0514/.codex/visualizations/2026/10/04/nevora-phase-a-hardening/ui-supplement-final2/chromium-h04-stale-cancel-320-viewport.png).
- [Retained inability report and refresh at 390px](/Users/josek0514/.codex/visualizations/2026/10/04/nevora-phase-a-hardening/ui-supplement-final2/chromium-h03-retained-reason-refresh-390-viewport.png).
- [Genuine Manager pending review at 1440px](/Users/josek0514/.codex/visualizations/2026/10/04/nevora-phase-a-hardening/actual-manager-final/chromium-h12-policy-review-reason.png).
- [Populated Employee schedule at 320px](/Users/josek0514/.codex/visualizations/2026/10/04/nevora-phase-a-hardening/populated-schedule-hardening/chromium-320x844-employee-populated-schedule.png).
- [Login at 390px](/Users/josek0514/.codex/visualizations/2026/10/04/nevora-phase-a-hardening/protected-hardening/chromium-390x844-auth.png).

STOP for ChatGPT/Jose technical review. No further implementation or PhaseB/C work is authorized by this handoff.
