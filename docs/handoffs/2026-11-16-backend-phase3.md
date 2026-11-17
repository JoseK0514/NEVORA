# NEVORA backend — Phase 3 delivery, November 16, 2026

**Phase 3 complete for local backend implementation, code review, verification and Claude contract handoff.** This delivery is limited to B04, B06, B07, B08/SCRUM-199 and coverage definitions under Jose's Phase 3 assignment. Claude UI adoption, joined Development acceptance, hosted proof and overall release acceptance remain open. Phases 2/4/5 are not taken over.

## Source, ownership and reviewed commit

- Explicit application baseline: `edce7661c211aba588f29bd6d56327fabdc11b47`.
- Phase 1 documentation successor `605de3bb2` was read at `/Users/josek0514/.codex/worktrees/nevora-backend-phase1-20261116/docs/handoffs/2026-11-16-backend-phase1-baseline.md`; its older final phase-number routing is superseded by this assignment. No earlier remote source was substituted.
- Fresh fetched `origin/development`: `22a9d598eb470cd380ee739d7396f06ecf335ed5`. Source-inventory check passes 73 classified sources and exactly three active branches.
- **Reviewed application/test commit: `7bd3e2249d890f263dd8433365b7673c5e29b487`**, parent exactly the assigned baseline. Detached worktree `/Users/josek0514/.codex/worktrees/nevora-backend-phase3-20261116/Fuel Scheduler`.
- Ownership was recorded before edits in [ownership and reconciliation](2026-11-16-backend-phase3-ownership.md). [Source manifest](2026-11-16-backend-phase3-evidence/source.json) lists all **32 actual application/test paths**, full hashes and the exact `src` tree. Documentation/evidence lives only under `docs/handoffs/2026-11-16-backend-phase3*`.
- No branch was created, merged or pushed; no other checkout/chat was changed/contacted, no hosted service/database/provider was operated and no deployment occurred. Existing integration owner retains assembly, migration/source register and shared publication. No schema, migration registry, auth/session infrastructure, global test infrastructure, payroll/billing module, Rondo implementation or UI presentation was changed.

The code reviewer approved the working-tree content now in the application commit: tracked diff SHA-256 `793594f28c98f3cbb7537d3bc1f17cb4f0e6af7b54b6656be507c7993343f478` plus all four separately hashed new sources. The [initial REQUEST_CHANGES review](2026-11-16-backend-phase3-evidence/initial-code-review.md) is retained; the [follow-up CLEAR / APPROVE](2026-11-16-backend-phase3-evidence/followup-code-review.md) verifies its corrections and records 28 directly run tests plus four rerun projection tests. This is code review, not independent QA/UI finding closure. The [documentation review](2026-11-16-backend-phase3-evidence/documentation-code-review.md) found no blockers; its minor wording clarifications are recorded as applied in [the resolution](2026-11-16-backend-phase3-evidence/documentation-review-resolution.md).

## Reconciled result

| Package/fact | Classification and delivered delta |
| --- | --- |
| B04 management restrictions, manual/copy/generation/publication/exchange, cross-location and weekend rules | Existing engine retained and requalified with focused pure/SQL evidence; no rebuild, legal-rule invention or Manager expansion. |
| B04 earliest effective-week read | Confirmed defect fixed: employee's last future version + seven days now participates in the read lower bound. |
| B04 ordinary lock reason | Confirmed defect reproduced in SQL and fixed: preserve typed RestrictionError instead of recreating it and dropping earliestWeek. SQL race refusal still requires readback if no exact bound is available. |
| B06 own/independent-review semantics | Added authorized typed subject/requester, may-review, independent role/scope, actual card period and unavailable-reason facts. Shared needs-you count now consumes them, not English titles. Final approval guards unchanged. |
| B07 mixed tasks | Required/actionable/deadline/ranking already existed; preserved order. Added complete versus observed totals, required-held/information counts and required work beyond a three-row preview. Partial total is null. |
| Swap source/counterpart | Source dates/kind/duration/note/name/link were delivered. Added both typed shifts where authorized, request status/real creation instant and sanitized unavailable counterpart. Enrichment rechecks current Company authority. |
| Coverage outcome | New typed linked-request history status on canonical callout readers and protected employee summary/parser, preserved after source reassignment. It describes completed workflow history, not current staffing. Pending-only inbox is not misused as an outcome reader. |
| Correction details | Existing original/requested times, work date and zone retained; aggregate parser validates requested interval ordering/workplace start date and individually nullable original instants. Subject identity distinguished from delegated requester. |
| Late minutes | Added elapsed whole minutes with explicit null when no first punch; original late threshold/matching/count semantics unchanged. |
| Review deadline/named reviewer | Unresolved product/data decisions: baseline stores neither a timecard deadline nor a named next-review assignment. Explicit null/unassigned role requirement instead of fabricated dates, names or overdue counts. |
| Manager scope/permitted locations | Already implemented in protected management-profile/operational-scope reads; ready for Claude consumption. No duplicate access contract or editor identity invented. |
| Planned time | Period report comparison already implemented. Added authorized sparse published elapsed time by person/business day, preserving publication unknowns and DST ambiguity. Reviewer-found same-day/midnight ambiguity leakage into the following day was reproduced and repaired. No financial calculation. |
| Pending-leave createdAt | Already typed/selected; mapper now validates and canonicalizes real timestamps rather than passing malformed text. Claude can remove its cast. |
| Coverage metric | Existing duration-based percentage of fully covered periods retained. Added explicit metric basis/unit and compatible stored-plan explanation transition. No hours-weighted substitution or number change. |
| No-clock-registration count, general overdue count | Product decisions remain open. Existing shared Manager count and truthful setup state are preserved; setup absence is not silently used to suppress factual work. |
| Monetary optimization | Future improvement only. Small permission-fenced input-contract proposal documented; no wages, costs, forecasting, optimization or new AI tools/spend. |

The complete field/type/error contracts, synthetic examples and exact Claude adoption instructions are in [the Phase 3 contract](2026-11-16-backend-phase3-contract.md). Existing restriction command/refusal/recovery protocol remains in `2026-11-15-management-scheduling-backend.md`. No UI acceptance claim is made from these backend changes.

## Checks actually executed

Dependencies installed with `npm ci --ignore-scripts --offline`, after inspecting package scripts and owned runners. All data is fictional. PostgreSQL runner creates ownership-marked loopback clusters, starts with inherited DATABASE_URL/FUEL_TEST_DATABASE_URL removed and stops/removes the owned cluster afterward. Local existing PostgreSQL runtime: `/Users/josek0514/Documents/Codex/2026-11-15/ple/work/pg-xml/runtime/bin`. No build/start, hosted SQL, real send or model request was used.

| Check | Result / receipt |
| --- | --- |
| Original baseline focused units | 6 files / 77 passed, `baseline-unit.log` |
| Scoped contracts before final freeze | 16 files / 394 passed; expanded 50 files / 919 passed, `contracts-unit.log`, `final-focused-unit.log` |
| Final boundary and HTTP handlers | 8 files / 175 passed, `boundary-contracts2.log` |
| Restriction SQL | 1 file / 20 passed, `restrictions-sql2.log`; future read/ordinary refusal, effective/legacy/overnight, concurrent confirmation, publication/deadline races and scope/session revocation |
| Request/coverage/public parser SQL | 1 file / 5 passed, `decision-public-sql.log`; cross-location owner, location-only Manager refusal, stale counterpart, completed reassignment with protected employee read/parser, late session revocation |
| Canonical correction/action-center/report SQL | 3 files / 49 passed, `review-report-sql.log`; original own-review refusal, Company/current authority and source/read behavior retained |
| TypeScript, full project | `tsc --noEmit --incremental false`: PASS, `typecheck-final.log` |
| ESLint, all 32 changed source/test files | PASS, `lint-final.log` |
| Source inventory and diff whitespace | PASS; `source-inventory.log`, `git diff --check` |
| Committed-source unit/API requalification | **55 files / 971 passed** on `7bd3e2249`, source binding in `checks.json` and `qualified-unit.log` |

All receipts are indexed in [Phase 3 evidence](2026-11-16-backend-phase3-evidence/checks.json). The named `.log` receipts are exact original-byte members of [test-logs.tar.gz](2026-11-16-backend-phase3-evidence/test-logs.tar.gz); uncompressed copies also remain local. Archiving preserves Vitest trailing whitespace and original failed outputs without changing them to satisfy a source whitespace gate. The expanded pre-freeze run and boundary run overlap and **must not be added as unique coverage**. Final committed-source totals are the authoritative unit/API total. SQL cohorts have **74 passed checks** across five files; historical Phase 1 results are not counted again here.

Preserved original failures: missing review/task/coverage/time metadata, the future-version read bound, erased lock earliestWeek, scoped enrichment, missing completed coverage, DST-next-day attribution and midnight spellings. A first cross-location SQL fixture lacked the second location's canonical rule setup and was repaired using the existing fictional setup helper; the original failed hook remains. The first overnight metric fixture used an unsupported crossing-midnight requirement window; it was corrected to the documented two same-day windows without changing the 480-minute assertion. No production rule, test assertion or timeout was weakened to clear these failures.

Heavy build/browser runs remain with the existing execution/integration owner under the readiness handoffs. No full default suite, new manual-publication qualification, hosted proof or independent release certification was attempted. The six existing generated guides and source hashes will need the integrator's source-qualified rebuild/check when assembling the joined candidate; they were not silently edited here.

## Controls, integration and rollback

CTO: GO for the bounded additive contracts and two restriction read/error repairs. Product: original ranking/eligibility/legacy/future semantics retained; missing business deadlines/named assignments/no-clock count remain explicit decisions. CISO: current Company/full-location/session boundaries and sanitized counterpart suppression; original server self-review refusal remains authoritative. Technical assurance: code review clear with retained red/green evidence and canonical producer/parser/SQL journeys. Governance: **GO WITH CONDITIONS for integration; release impact CONDITION**, no exception or material risk acceptance requested. Existing hosted/UI/independent release gates remain open.

Existing integration owner should cherry-pick the application commit, then this documentation/evidence successor, onto its selected source without importing Phase 2/4/Rondo work from another checkout. Reconcile Phase 2's financial contracts separately; no shared file overlap is intended. Preserve Phase 1 documentation `605de3bb2` if already selected. Run affected combined consumers, source inventory, manuals and mandatory final-source gates on the actual assembled Development candidate. Do not infer acceptance from this local commit or deploy it independently.

No migration/data rollback is required. The new public fields are additive and old stored coverage plans remain accepted. Withdraw projections with matching consumers; keep restriction guard semantics and append-only history. The restriction bound/error fixes may be reverted independently without changing stored agreements, but do not revert confirmed employees to employee-controlled hard availability. Never reset receipts, modify publication/history, remove current authority checks or erase another owner's code as rollback.

Next owner: Claude consumes the contracts; existing integrator assembles and qualifies the joined UI/backend. Jira evidence was added to [SCRUM-199, comment 10433](https://thevelani-team.atlassian.net/browse/SCRUM-199?focusedCommentId=10433) and [SCRUM-195, comment 10434](https://thevelani-team.atlassian.net/browse/SCRUM-195?focusedCommentId=10434), without status transitions. UI/hosted/overall release acceptance remains open. No Jose decision is needed to finish this local Phase 3 delivery; production, reviewer-assignment/deadline policy, no-clock count policy and any future cost feature remain separate decisions.

Portable preservation: the final two-commit delivery will be saved as `/Users/josek0514/.codex/visualizations/2026/11/16/01a1e52e-a193-7d71-b69b-704449de7529/nevora-backend-phase3.bundle`, requiring the exact baseline above. Its external `phase3-delivery.json` receipt records final documentation commit, digest and bundle verification. Recovery: verify the bundle, fetch it into an isolated repository/worktree, then apply the two commits through the existing integrator. This is preservation, not shared-branch publication.
