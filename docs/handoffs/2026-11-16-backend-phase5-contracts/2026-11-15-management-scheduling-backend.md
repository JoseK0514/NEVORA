# Management scheduling backend / Claude integration contract

Jose authorized this backend after the restrictions/preferences/scheduler discussion. Development is the primary acceptance line; main/production, hosted migration, real notifications and UI publication remain separate. Claude owns UI. This candidate is isolated from active Rondo company-knowledge work.

## Source and state

- Base development: `b5085edb33d1bccc440588f950e728566c8a79ac`.
- Initial implementation: `846b76d37`; review fixes: `9633b69ec`; final overnight/draft fixes: `12cf9fb6924990749ca6dab968e3721a29ba7e3d`.
- Qualified application/manual candidate: `8366493c1345d7d896e16dff51f79754426bc258`, tree `da9ed5bfa52f43a220e5f9aee7e46bab288bc9f6`. Subsequent closeout documentation does not change application/test inputs. Application hash: `f9da87f0115db53988f70dd1f5bbf4afff676c3000e6f1fd1ac9736d8d8b9bac`.
- New migration: `0065_scheduling_restrictions.sql`, prepared for owned disposable PostgreSQL only. `0064_owner_company_knowledge.sql` belongs to the other active chat and must be combined by the single development integrator with both migration registry/fixture changes preserved.
- At the initial implementation checkpoint there were no remote branch, hosted database, live email, provider, main or production changes. Subsequent candidate tags and the actual development delivery state are recorded in the evidence directory's authoritative `qualification-final.json.integration`; no hosted migration or main/production activation is included.
- Jose subsequently approved this chat's takeover of **only this feature's development integration and required CI** after reviewing the qualified2dcaaa5f3 candidate. The earlier recorded Cloud Chat1 host is unavailable. This bounded approval does not transfer other NEVORA/Rondo/UI/provider work. Exact candidate/CI/development custody is recorded in `qualification-final.json.integration` in the evidence directory below; a local candidate alone is not delivery.
- Fresh source reconciliation preserves developmentb5085edb, Claude40ccc4e4e (HELD/unimported), main46d6dc76 and the separate Rondo0064 reservation. The inventory gate passes73 classified sources/3 active branches, with14 inventory regressions passed. No application/test input changed during this documentation-only integration preparation.

## Product contract

Management-approved unavailable intervals are firm. Employee normal/weekly/dated availability is a soft preference only after a management version becomes effective. Approved leave, eligibility, qualifications, overlaps, maximums and operational review rules remain authoritative.

An empty approved `unavailable` list explicitly confirms no recurring restriction. Missing storage/versions is **unconfirmed legacy**, retaining prior behavior. Show that state honestly; do not call employee-entered data a contract or silently confirm everyone. A confirmed future version does not take effect early.

The initial cutover rule is deliberately conservative: an approved version starts in an open current/future Monday week after every published/archived or deadline-locked week it could affect, and after the last approved version. An intervening open week does not permit invalidating a later published one. The API reports the required later week on an ordinary lock; a race can require readback to refresh it. Versions, decisions and existing assignments are retained.

Manager authorization covers the employee's complete primary/eligible/current-assignment location footprint. A location Manager with only part of that footprint cannot change a global employee agreement. Owner controls Owner records. Own employee/Lead requests never approve themselves or change eligibility.

## Endpoints

Both are protected JSON POST, no query parameters:

- `/api/manager/scheduling-restrictions`: Owner/Manager, target within current Company Access.
- `/api/employee/scheduling-restrictions`: Employee/Lead, own target only.

Required headers: JSON Content-Type, same Origin, `x-nevora-scheduling-restrictions: 1`, `x-nevora-actor: <current employee ID>`, and `x-nevora-employee-view: <employeeViewAuthority(serverProof, 'planning')>`. The lifetime value comes from the server, never a substitute for the HttpOnly session. Reuse existing server proof helpers in the relevant page boundary; never serialize a session hash/token. Responses are private/no-store.

Read payload:

```json
{"action":"read","employeeId":"target-employee-id"}
```

Ready result includes `data` (versioned document), `legacyUnconfirmed`, and `earliestWeek`. The document contains schemaVersion1, revision, approved versions, and change requests/decisions. It contains only that target's agreement/request history; planner and Rondo projections strip private reasons and receipt metadata.

Command payload:

```json
{"action":"command","employeeId":"target-employee-id","command":{"kind":"SET","operationId":"11111111-1111-4111-8111-111111111111","expectedRevision":0,"effectiveWeek":"2030-10-07","unavailable":[{"dayOfWeek":0,"startTime":"00:00","endTime":"24:00"}],"reason":"Management recorded the agreed restriction"}}
```

- `SET`: management records a dated version. Day numbers Sunday0–Saturday6. Times HH:MM, same-day positive periods; use two days for a restriction spanning midnight. Adjacent/overlapping intervals normalize. Empty intervals mean no recurring restriction, not a day off.
- `REQUEST`: same schedule fields, own Employee/Lead only. Creates PENDING; approved versions remain unchanged.
- `DECIDE`: management supplies operationId, expectedRevision, requestId, decision APPROVE or DENY, and reason. APPROVE requires its effectiveWeek; DENY must omit it. Management may approve from a later safe week. Decision and version are atomic.

Operation IDs are scoped to the target document and actor. Keep target, operation ID and logical contents unchanged for recovery. Expected revision is optimistic concurrency, not authority. Exact replay returns the original receipt and `changed:false` after fresh authority checks. Changed ID reuse or stale distinct operations conflict. A saved response includes the canonical document and receipt; no assignment is added/removed and no real notice is sent by these endpoints.

States: ready/saved (200), invalid (400), denied (403), conflict/locked/capacity (409), unavailable/outcome_unknown (503), unauthenticated (401). For outcome_unknown retain the same operation ID and retry/read back; never infer a rollback or invent a new ID. Capacity stops new admission while reserving worst-case canonical JSONB bytes for decisions on accepted pending requests; it does not erase history. Do not display SQL/provider diagnostics.

## Scheduler and fairness

Canonical manual, copy, exchange, generated and reviewed Rondo draft paths receive the same approved versions. `AGREED_RESTRICTION` is a blocker; `PREFERENCE_NOT_MET` is advisory. Employee AVAILABLE exceptions cannot reopen firm restrictions. Overnight assignments check each business date's effective version.

Coverage continues to use configured minimum staffing/position/Lead demand and joint cross-location eligibility. A legal partial, missing setup or bounded-search exhaustion is not complete coverage or proof that no solution exists. Preserve management draft review/publication.

Weekend default: Saturday/Sunday, eight completed scheduling weeks relative to the explicitly requested generation week, latest whole-week publication snapshot over staged live changes. Attributable retained archived assignments remain positive evidence when omitted by a later publication for another location; ambiguous archived absence remains unknown. This is scheduled history, not actual attendance/payroll. Inferring a weekend off requires an effective agreement for that historical weekend and publication evidence for the employee's complete current eligible-location footprint. Missing evidence, approved leave, agreed weekend restrictions and released callouts do not become preference-based weekends off. Positive unreleased Sunday work is retained even if Saturday was released/leave/restricted. Equal historic burden can keep the same already-eligible employee on the weekend to preserve a full weekend off for someone else. Existing hour and legality controls still win. Preference fit breaks otherwise equal workload choices before the stable rotating tie.

First publication checks retained Draft assignments against effective restrictions from the coherent publication snapshot. The existing fresh source guard and workspace lock also catch an agreement approved between publication read and transaction. Retained draft rows are not grandfathered around a newly effective firm restriction.

Generation returns INVALID with AGREED_RESTRICTION when a retained, unreleased Draft assignment in the attempted scope violates a newly effective agreement. It preserves all rows and performs no generation/removal until management repairs that draft. Published history, unrelated dates/locations, approved callouts and replaceable generated rows do not trigger this repair gate. Coverage arithmetic alone never overrides the INVALID result.

Cutover custody includes actual occupied dates of closed Sunday overnight shifts, including retained publication captures after live rows are staged or removed. A Sunday shift ending Monday06:00 closes the Monday week; ending exactly midnight does not occupy Monday. Historical captured occupancy is conservatively retained, even if superseded. This may delay an effective version by another week; it cannot silently rewrite published overnight terms.

## Claude work / activation gate

Provide the per-employee management restrictions section and own read-only agreement/change-request view. Label employee controls as preferred hours/days, with no guarantee of shifts or leave. Add request/decision, effective-date, pending/error/conflict/retry states. Surface legacy-unconfirmed and future-effective modes. Do not enable per-employee conversion through the old availability wording. Validate the combined Owner, authorized/scoped Manager, Employee and Lead journeys on development before calling the feature accepted.

## Rollback

Before any hosted cutover, close new restriction commands/confirmation and preserve the complete JSON history. Use code compatible with the new column and already-confirmed semantics; silently reverting confirmed employees to employee-controlled hard availability is not a safe rollback. Do not drop policy/history, rewrite published schedules or reset operation receipts. Prepare exact migration/role/source/runtime receipts with the development integrator before deployment.

## Verification status

Final local qualification passed on8366493c1, with no source changes during execution:

| Check | Actual result |
| --- | --- |
| Full unit: `npm test -- --maxWorkers=1` | 13,111 passed;944 existing skipped;886 passed files/35 skipped;exit0 |
| Foundation PostgreSQL | 286 passed/12 files |
| Authority PostgreSQL | 46 passed/3 files |
| Generation PostgreSQL | 201 passed/5 files, including19 restriction SQL regressions |
| Exchanges PostgreSQL | 178 passed/15 files |
| Notifications PostgreSQL | 80 passed/2 files |
| Typecheck | Passed |
| ESLint | 0errors;one pre-existing anonymous-export warning in hosted workforce-monitor entry |
| Critical format / canonical migration manifest / diff whitespace | Passed |
| `node scripts/release-build.mjs` | Exit0;clean/unchanged source;4,927 output files |
| Web manuals build/check | Six rebuilt/verified guides;source12cf9fb69;application hash above |

All791 SQL checks used new ownership-marked loopback PostgreSQL clusters, closed by their runners. Configurations: `vitest.foundation-integration.config.mts`, `vitest.phase-b-c-authority.config.mts`, `vitest.generation-integration.config.mts`, `vitest.exchanges-integration.config.mts`, `vitest.notifications-integration.config.mts`, each invoked by `node scripts/payroll-postgres.mjs <config>` with the owned PostgreSQL binary and no external DATABASE_URL. No real mail, customer data or provider was used. Browser/UI and hosted acceptance were not performed for this new feature.

Evidence directory: `/Users/josek0514/.codex/visualizations/2026/11/13/01a1d5d4-5741-7e93-ab62-b7705c0e403b/nevora-scheduling-backend-20261115/`. `qualification-final.json` records source/counts/limits; `final-frozen-source.json` binds all16,472 tracked file hashes; `final-build-source.json` retains the exact build inventory; `final-confirmed-postgres-cohorts.json` plus the final generation log retain actual cohort results. `backend-candidate-final.bundle` is a verified portable candidate requiring baseb5085edb33d1bccc440588f950e728566c8a79ac. Closeout-source metadata records any documentation-only commit after the qualified candidate.

Independent review of846b76d37 identified seven important findings. The bounded correction pass reproduced13 failing pure-path cases plus the real first-publication failure, then passed115 focused cases and14 actual PostgreSQL cases. PostgreSQL additionally proved the UTF-8/JSONB capacity edge (old result1,109,708bytes exceeded1,048,576); the corrected admission bound reserves canonical storage and future decisions. No second independent approval is asserted from the author's regressions.

Final author boundary checks then reproduced2 failing retained-draft planner cases and3 failing actual overnight-custody SQL cases. The fixes passed8 scoped planner cases and all19 restriction SQL cases, then the complete unit/SQL qualification above. No assertions, test timeouts or controls were relaxed. Earlier failed broad runs and unchanged-source reruns remain retained. A documented30-second Mac clamshell sleep coincided with earlier SMTP/process-launch/SQL expiry failures; their isolated unchanged-source checks and subsequent full serial runs passed. The original review disposition was NO pending fixes; this is an author-qualified correction, not a new independent GO or a shared-development/hosted release receipt.

Recorded design rulings and costs: conservative future-only custody can delay changes beyond far-future closed weeks and historical overnight captures; explicit employee confirmation requires a truthful mixed legacy rollout; ambiguous archived absence reduces fairness precision rather than inventing weekends off; historical off inference requires agreement/full-current-location publication evidence and counts positive unreleased work first, so legacy gaps remain neutral and never claim actual attendance.

Deferred minor: the initial read's earliestWeek is the workspace open-week lower bound; an employee's already-approved future version may require a still-later week. The command returns the actual required week on a lock. Claude can derive the later lower bound from the returned version history until the read DTO is aligned.

## Integration gate corrections

The source-inventory reconciliation changed an explicitly indexed manual input. Initial candidate5c10e6cc5 was tagged before the failed manual prerequisite was inspected; its runs43794890651/43794890681 were cancelled and never qualified or integrated. Manuals were rebuilt on5c10e6cc5, check and focused publication unit passed, then corrected candidate19b3e6c1b was tagged. Its actual onboarding job133061855399 failed before owned acceptance because the two new API routes were absent from `onboarding-entrypoint-inventory.json`; commerce's247 fake-provider/owned checks passed, which does not waive the failed inventory gate. CI43795053967/Mobile43795053905 were superseded with cancellation requests, not accepted.

Both routes now have explicit CONVERTED/BOUND_APPLICATION records after inspection of company/incarnation cookies, applicationSql/currentWorkspaceBinding and the shared notification executor, alongside own/management authorization and no caller-selected workspace/database. A new regression verifies both declared boundaries and fails closed when either classification is removed; the actual Node inventory suite reproduced the omission and now passes10checks. This changes only the reviewed inventory and QA regression, with no runtime guard bypass or application behavior change. Manuals must bind this corrected source too. The next immutable candidate must pass the complete mandatory CI/owned acceptance; its exact source/results are recorded in the external integration receipt, never inferred from previous local checks.

Candidate03d2765fed18475867b56e30f0bd4f0a4802195eb8 then passed actual CI43796356619 (23jobs) and Mobile43796356627 (onejob);all10 protected contexts passed on that exact source. Its seven-step owned backend acceptance also passed locally with the existing PostgreSQL17.11 client tools. Before integration, fresh origin inspection caught development advancing to dbe8697ed38b66c7f25412a075d6a57406f5be3a. That separately qualified accessible-Owner and payroll CSV/export work is preserved in the combined merge;its handoff remains `2026-11-15-dead-end-defects.md`. No runtime file conflicts occurred. Generated guide binaries/manifest and the source inventory were the only conflicts;retain both inventory histories and rebuild all six manuals from the combined committed source. Candidate03 proof does not qualify the new merge;mandatory combined-source candidate and development CI must pass before reporting delivery. Exact final source/CI custody remains in the external integration receipt.

Combined candidate04f94f98ce4c003deecfbc6dda883525dcf6734f98 passed CI43799801522 (23jobs) and Mobile43799801790 (onejob),including13,183unit passes/944existing skips and all791 core release SQL checks;all10 protected contexts passed. The ordinary development push was refused because the branch also requires linear history and c6e00218b was a merge commit. No protection setting or remote branch was changed. This requirement was missed before assembling that candidate. Preserve its full verified26-archive evidence rather than treating it as delivered.

Linear repackdb758c9d2f0d17e6985e40b938b190efaa5d4f5e has parentdbe8697ed and the **exact same tree**6a03224f83d49014858a0c4af831e4ee682daa5e as the qualified combined candidate:zero source-file changes and zero new merge commits. Only these custody notes/inventory and regenerated guide publication metadata follow it. Guides are rebuilt from an ancestor in the linear history;all runtime/schema/test/config bytes stay identical. The new immutable linear candidate must earn its own exact-SHA CI contexts before a non-force development update. Current delivery/CI results are recorded externally;the earlier tagged merge remains recoverable and is never force-pushed into development.

Candidate05's actual required browser checks exposed two calendar-dependent QA defects after Monday midnight in Puerto Rico: a completed four-hours-ago correction entry belonged to the previous timecard, and Home's ongoing-shift fixture published the prior week before asserting complete current-week publication. Preserve failed run43803164951 and its source-bound browser artifacts. The correction journey now opens the entry's actual timecard when necessary; Home publishes the actual current week in addition to the ongoing and scenario weeks. Three boundary regressions cover local midnight, both correction paths and year rollover. Existing assertions, timeouts, release controls and application rules remain intact. Candidate qualification is reopened on the corrected exact source.

Claude UI finding from the failed Home320 screenshots: an unpublished-current-week note can appear beside “You're all set” although the protected Home API correctly returns allSet=false. This existing UI presentation is outside this backend-only change; the correction here makes the complete-source acceptance fixture genuinely complete and retains its strict API assertion. Do not treat that screenshot as acceptance of the all-clear presentation.
