# NEVORA backend — Phase 1 source baseline

Date: November 16, 2026, America/Puerto_Rico. **Phase 1 complete for source custody and bounded compatibility verification.** This is the existing integration owner's combined source, with delivered safeguards preserved. It is not a whole-backend qualification, UI acceptance, hosted verification or operating-release approval. Phases 2–5 were not started.

## Exact source and ownership

| Identity | Verified value |
| --- | --- |
| Repository | `JoseK0514/NEVORA`; the configured `JoseK0514/Fuel-Scheduler-` remote is its historical alias |
| Remote development | `22a9d598eb470cd380ee739d7396f06ecf335ed5` |
| Remote collaboration | `40ccc4e4e5b74b48c8fd86ef50c4ec6efe9b4dd1` |
| Remote main | `46d6dc76922bb273379baccd329e0af636d1dcb6` |
| **Combined baseline** | **`edce7661c211aba588f29bd6d56327fabdc11b47`** |
| Baseline Git root tree | `2c7f792747c7eb38a083275f57326b0729fbb861` |
| Baseline `src` Git tree | `d45144bd7a7a8517b424cf8ed2dacfa0726886aa` |
| Canonical application SHA-256 | `5ac33604e3ec3cb1152656dcb00468e45b313b15c279af6dfd1a96d0d4c9ecf3` |
| Baseline parent / existing candidate 04 | `321a7bb5f6a9165ec29fb6cb90d0059540070b4a` |
| Existing candidate tag | `candidate/backend-completion/20261116-readiness-combined-04` |
| Candidate 04 root tree | `306d1831ef45d68019f982520b1267c8f7ab5e32` |

The application digest uses the existing manual qualifier's ordered path/blob inventory, including application, schema, service, script/test and package inputs. The root tree and `src` tree above are separate Git identities. They must not be interchanged with that digest. `edce7661` differs from candidate 04 only in the scheduling handoff and its compact management receipt; application, test, dependency, migration and CI configuration bytes are identical.

Existing integration worktree: `/Users/josek0514/.codex/worktrees/nevora-readiness-integration-20261116`, detached at `edce7661`, clean when inspected. **The existing Codex readiness integration/development acceptance owner retains custody.** Claude retains UI presentation; the separate Rondo owner retains its implementation. No chat was contacted or interrupted and no other checkout was edited.

This phase used `/Users/josek0514/.codex/worktrees/nevora-backend-phase1-20261116`, detached at the same baseline, imported read-only from the existing assembly. Only this handoff/evidence is added here. No new application candidate, branch, tag, PR, remote push, deployment or activation was created. The starting checkout remains on its existing local development `0f8ffee52d85f48cd2fe890dc9aa682e995de4eb`; it was not reset or advanced.

Development is the operating/acceptance line at production standards. The combined baseline descends from current remote development. Collaboration is incorporated through the existing linear replacement `dad3ce95fca8e7b43431614eb0db6f84054a43d2`, not Git merge ancestry; collaboration's original history is preserved. The older `802df4a2` and `4292aabb` are evidence checkpoints, not reset targets.

## Included commits and pending incoming work

The [source manifest](2026-11-16-backend-phase1-evidence/source-manifest.json) lists every one of the **39 commits after remote development**, parentage, responsibility and locally observed remote/tag reachability. Representative ownership boundaries:

| Delivery | Source | Current state / owner |
| --- | --- | --- |
| Eligibility, original review, period history, diagnostic correlation | `c9de85ecef4f8eb2fb9f109e494bfde892022f65` | Integrated; Codex SCRUM-204–207 delivery owner |
| Original-token forms and history controls | `eeed508eb475707912b998dbab6dcf0d7993cafa`, delivery `0a31f46c96221fb7aac8607c083677eca986a729` | Integrated; bounded Codex functional wiring, Claude presentation |
| Reviewed collaboration UI and retained development guards | `dad3ce95fca8e7b43431614eb0db6f84054a43d2` | Integrated by existing integration owner; Claude UI source retained |
| Unknown-outcome delete recovery | `21662bc509927c11d5765e91ecb1542ac9caaf0c` | Integrated; existing integration owner |
| First-activation/confirmation acceptance follow-up | `ada927badd2fea3ef6de5e1d2e0b7bc42f9fc824` | Integrated; bounded functional follow-up, no new UI design |
| Scheduling browser response-completion barrier and controls | `fc48be070f7b8e964aad295b7ac3710009319582`, `70c2c8f5ba14554019b2f16866c055bf63e94c72` | Integrated and candidate-04 scheduling gate passed; existing test/integration owner |
| Candidate 04 manuals and exact-candidate receipt | `321a7bb5f6a9165ec29fb6cb90d0059540070b4a`, `edce7661c211aba588f29bd6d56327fabdc11b47` | Candidate tag is pushed; `edce7661` is its local documentation successor, not remote development |
| Separate Rondo management/company knowledge/evaluation catalogue | Local `b3a086205813b6e4c609883cbf0438d7f1232491`; application `c21f81d0a5dfde2cf25f869ddb0e1ccb896d70b0`, feature `232029988854fa337f7a504470de1d712f9563d7` | **Excluded / held**, separate existing Rondo owner and Claude UI. No company-knowledge route or 0064 in this baseline; no paid evaluation authorized here |

The original readiness worktree remains clean at `0a31f46c`; its delivery is already integrated. The base-verification checkout retains its uncommitted `notifications.integration.ts` diagnostic; it is not silently imported. Historical recovery/native/diagnostic worktrees in the assessment inventory are preserved and are not automatically additional incoming release scope. The new source record does not transfer any owner's work.

## Safeguard reconciliation

All **21 recorded implementation/consumer files are byte-identical to audited `802df4a2` and candidate 04**. Their Git blob IDs and last-changing commits are in the manifest. The independent audit's original results retain their source/environment limits and reviewer ownership; this phase does not rewrite their dispositions.

| Protection | Implementation and consumers | Evidence / remaining gap |
| --- | --- | --- |
| Current eligibility at publication | `src/lib/data/notification-transactions.ts`, `publication-restrictions.ts`; manual/copy/generation publication writers | SCRUM-204 source retained, including unchanged Draft commitments compared with immutable publication. Fresh notification transaction units pass. Prior SQL and generation race evidence remains in the readiness delivery/audit; complete final-source qualification remains Phase 5 |
| Originally reviewed edits/deletes | `shift-review.ts`, `schedules.ts`, `generation-exclusions.ts`; schedule actions, `schedule-shift-form.tsx`, scoped manual form | Original `expectedReviewVersion` survives mounted drafts and retries; token is concurrency proof, never authorization. Wired and integrated, not a missing backend feature. Candidate-04 readiness UI/matrix: 14/40 checks passed |
| Conflicts, retained drafts, lost replies | `shift-review-recovery.tsx`, `wave-a/action-form.tsx`, scoped form | Company delete transport uncertainty blocks another submit pending explicit review; original token/draft retained, copy-before-reload. The same 14/40 candidate-04 checks cover stale actions and lost-response recovery; original failures remain |
| Bounded summaries / complete immutable history | `period-close/service.ts`, `history.ts`, `/api/period-close`, `period-close-history.tsx` | Latest-per-kind summary separate from bounded pages, stable timestamp/UUID watermark/cursor, explicit coverage and current disclosure authority. Fresh history/component units pass; audit's 1,001-event traversal and original artifacts remain valid source-bound evidence. History consumer is connected |
| Finite private-data authority / session revocation | `employee-view-authority.server.ts`, `company-access/scoped-read-frame.tsx`, `offline-hold.ts`, timecard/payroll/report readers | Offline hold keeps its original expiry; it cannot renew authority. Blur/hidden/revocation retire data. Fresh lifetime/authority checks pass; candidate-04 scheduling privacy passes. Home's separate offline browser failure remains open; it is not waived by these passes |
| Last usable Owner | `account-deletion/requests.server.ts`, `data/employees.ts`; account deletion/profile edits | Active replacement requires usable activated credentials and no pending deletion. Fresh deletion refusal units pass; existing SQL/independent Owner refusal retained. Generic UI refusal still needs explanatory copy under Claude/B11; no backend rebuild |
| Action-center `exchangeKind` parser | `data/action-request-facts.server.ts` → `action-center/project.ts` → `present.ts`, Things to do / Manager action center | Strict parser accepts SWAP/COVERAGE and rejects invalid extras/kinds. Fresh producer→parser regression passes (7 tests across two files). B06 title-derived own-review and B07 task semantics remain separate pending contracts |
| Paid time / breaks / exact money | `payroll-export/paid-time.ts`, export service/profile guards; `payroll/csv-import.ts`, import contracts | Exact break identities, attested paid rest/relieved meals, immutable hashes/retries and integer cents retained. Fresh paid-time/CSV units and 19 export SQL tests pass. Export/mapping components remain identical to collaboration: paid-review mapping/batching and full CSV/JSON/correction UI acceptance are unfinished, not absent backend. Preserve 65,536-byte command bound and refusal/recovery |
| Agreed restrictions / effective dates / preferences | `data/scheduling-restrictions.server.ts`, publication checks, management/employee endpoints, migration 0065 | Firm approved restrictions, conservative effective-week guards, legacy-unconfirmed state and soft employee preferences retained. Fresh 19 real SQL tests pass. Management confirmation/disclosure/change-request UI remains Claude/B04/U02. Earliest-week read lower-bound limitation remains in its original handoff |
| Safe support correlation | `server-error.ts`, `payroll/http.ts`, action-center/timecard/period/export routes | Request-local generated reference in `X-Nevora-Request-Id`, bounded static metadata/redaction, expected refusals separate. Fresh server-error units pass. UI support-reference presentation and operating responder proof remain B10/U11; a support reference never authorizes mutation replay |

Delivery references: [backend delivery](2026-11-16-readiness-backend-delivery.md), [form/history contract](2026-11-16-readiness-backend-ui-contract.md), [functional UI delivery](2026-11-16-readiness-ui-completion.md), [existing integration](2026-11-16-readiness-development-integration.md), [current scheduling qualification](2026-11-16-readiness-webkit-navigation.md), [payroll/Owner delivery](2026-11-15-dead-end-defects.md), [management restrictions](2026-11-15-management-scheduling-backend.md).

## Migration and bootstrap coherence

`db/migrations/order.ts` remains canonical: **68 BASE, then 4 FINAL, with 2 HELD files never applied**. Numeric filename ordering is invalid because prefixes repeat. FINAL remains `0031_native_payroll`, `0032_company_access_invitations`, `0042_company_invitation_lifetime`, `0062_conversations`, after company/Owner creation. HELD remains tenant preparation `0026_tenant_ownership_expand` / `0027_tenant_ownership_validate`.

The exact ordered inventory/checksums are in the source manifest. `CURRENT_MIGRATIONS` matches BASE, every SQL file is classified exactly once, and the generated company API bootstrap manifest matches canonical source hash **`83bc83356924aa7341f321da996437f1471379d3e1c077b49c654aed290fb3cf`**. Fresh-company real PostgreSQL checks pass installation of current payroll/access, rollback and clean retry after injected DDL failure, and concurrent setup serialization. No migration/schema source was changed.

`0065_scheduling_restrictions.sql` is already included. Rondo's reserved `0064_owner_company_knowledge.sql` (SHA-256 `0fa462ad7fe6686f2a51c3df6c4286e98c2e7cfeb4a28ffbef2880caa598ada9`) is **intentionally outside this baseline**, not an unexplained missing migration. Its owner already updated order, fixture literal, generated bootstrap and order test on its own source. If selected later, the existing integrator must retain both 0064/0065, reconcile that shared tail and bootstrap checksums, preserve both feature flags/guards and qualify fresh initialization; do not allocate a duplicate number or import a stale generated artifact. This is a future inclusion dependency, not a blocker for reproducing the present explicitly Rondo-excluded base.

## Included / held capability register

These are source capabilities, not a statement about deployed flags, customer availability or completed product journeys. No hosted configuration was inspected or changed in this phase.

| Capability | Baseline support | Configuration / UI / acceptance hold |
| --- | --- | --- |
| Scheduling, eligibility, original intent, history | Included and wired with current safeguards | Combined restriction UI and whole manual/copy/generation/exchange/weekend acceptance remain |
| Clocker, recorded time, correction/timecard protocols | Included current identity→PIN, journal/recovery/privacy and independent-review foundations | Actual punch/attendance/correction browser failures remain; physical/PWA/device proof separate. Owner-controlled phone clocking retained |
| External payroll / paid exports | Included JSON/CSV contracts, exact cents, break treatment/review guards, source receipts | Complete paid-export/CSV/JSON/correction consumers and practical byte-aware batches remain; no native/statutory payroll activation or tax/legal promise |
| Accounts, access, passkeys, deletion | Included secure lifecycle/session/Owner protections | Hosted delivery, retention/closure fulfillment, LAST_OWNER guidance and physical authenticators remain separate |
| Things to do / task facts | Included current projection/parser correction | Typed own-review, required-work discoverability/count semantics and SCRUM-199 remain assigned future work |
| Communications, Updates/Conversations, reminders, push | Code/held module foundations retained | Existing holds and authority/configuration controls remain; no real sending or provider activation. Child-read/copy/keyboard/browser gates remain open |
| Photos, native payroll and provider integrations | Preparation/guarded source retained where already present | Intentionally held wherever the existing release contract requires; no camera/storage/payroll/provider activation |
| Rondo current source | Existing baseline adviser code retained | Existing adviser browser gate failed; separate company knowledge/manager/evaluation additions excluded. No new model spend or claim of 50-question quality acceptance |
| Onboarding / billing / workers | Existing controlled backend and exact-candidate onboarding evidence retained | Approved 30-day no-card/payment timing preserved; hosted callbacks, ingress, quotas, recovery and live provider proof separate. Proposal prices, 75-person offer and SLA targets are not adopted |
| Support / guides / operations | Safe correlation and six source-qualified guides included | User-facing reference/responder, hosted monitoring/restore/rollback and final manual publication acceptance remain |

Keep approved compact phone times, one bell/offline indicator, explicit Next timecard, passive notification folds and individual Manager child reads, Employee/Lead read-only opening, light-only policy and optional Owner-controlled phone clocking. This phase changes no product rule, environment label, instrumentation, permission or budget.

## Checks actually run

Locked dependencies installed in the isolated worktree using `npm ci --ignore-scripts --offline` (success). Package/build/test runners were inspected first. No build/start, hosted connection or migration command against an existing database was run. PostgreSQL 16.15 came from the already-local XML-enabled test runtime; each invocation created a new owned loopback cluster, used fictional data, explicitly removed inherited `DATABASE_URL` / `FUEL_TEST_DATABASE_URL`, and reported shutdown/removal.

| Check on baseline `edce7661` | Result |
| --- | --- |
| `npm run check:development-sources` after fetching origin and final remote recheck | PASS: 73 classified sources, exactly 3 active remote branches; archives/ancestry verified |
| Migration order, bootstrap artifact, paid-time/CSV, correlation, action-center and history/authority focused units | 12 files / 159 passed |
| Publication, deletion, projection/authority focused units | 6 files / 81 passed |
| Producer→action-center parser regression | 2 files / 7 passed |
| Fresh-company SQL (`vitest.company-setup-integration.config.mts`) | 1 file / 3 passed |
| Restrictions SQL (filtered existing generation project) | 1 file / 19 passed |
| Export SQL (`vitest.payroll-export-integration.config.mts`) | 1 file / 19 passed |
| `node scripts/onboarding-manifest.mjs` (check mode) | PASS; exact hash above. Node reports a harmless existing module-type inference warning |
| `node scripts/manuals/check-manuals.mjs` | PASS: all 6 guides, recorded source `bfe313e9`, exact current canonical application hash above |
| Safeguard Git-blob comparison | 21/21 identical to audited joined source and candidate 04 |
| Baseline bundle verification | PASS; baseline preserved independently of moving local HEADs |

Total fresh scope: **247 unit tests and 41 real PostgreSQL tests passed**. Logs and exact commands are in [phase evidence](2026-11-16-backend-phase1-evidence/checks.json). An initial manual CLI invocation supplied unsupported `--check`; only the subsequent no-argument verification is counted above. No gate was bypassed. Missing filename filters in the two targeted unit commands select 12 and 6 actual files respectively; totals above are executed files, not requested filters.

No exhaustive unit/build/browser audit was launched. Existing candidate-04 management evidence (6 management-close, 3 delegated correction, 14 readiness UI, 40 two-Manager checks, zero unexpected errors; source verified and resources closed) is retained under `readiness-development-evidence-20261116/candidate04-management-receipt.json`. Candidate 04 has identical application/test/config bytes to the baseline but is a distinct exact CI SHA; its passes do not become a new all-green run on `edce7661`.

## Current CI failures and ownership

Existing candidate 04 [CI 43903205719](https://github.com/JoseK0514/NEVORA/actions/runs/43903205719) and [Mobile Access 43903205709](https://github.com/JoseK0514/NEVORA/actions/runs/43903205709) were read from GitHub, including failed logs and six small Phase E artifact reports. [Snapshot](2026-11-16-backend-phase1-evidence/ci-snapshot.json) records time/status; some CI jobs were still running at the first read, so no final green workflow is claimed. Older candidate-03 failures remain original historical evidence.

| Failed gate | Observed cause / limit | Existing owner / next action |
| --- | --- | --- |
| Home, both engines | First 320px offline case waits for old `[data-home-state="paused"]`; no runtime errors in failure report | Codex driver + Claude UI/privacy contract: align explicit finite offline behavior and validate the full matrix; do not remove retirement assertions |
| Navigation | Current 320px case cannot find its old request-hub back-link selector | Codex semantic driver + Claude navigation; reproduce current intended destination |
| Attention | 320px unpublished coverage assertion, scenario line 153, actual count 0 | Claude coverage semantics + Codex fixture/driver; retain completeness requirement, determine true presentation/fixture cause |
| Communications | Revision-conflict exact text resolves to two status paragraphs | Codex strict-selector scope + Claude feedback ownership; retain current refusal and no unintended-read assertions |
| Calendar | Clipboard-rejection/manual-select keyboard case fails | Claude recovery/focus + Codex driver; deeper cause unresolved in this phase, not classified as a backend defect |
| Corrections | Wait for earlier approval explanation text times out | Codex current-contract driver + Claude correction journey; verify actual content before repair |
| Clocker | Full punch driver waits for retired PIN-only heading | Codex driver must follow current identity→PIN protocol; existing privacy/journal/assertions retained |
| Attendance / remediation | Old collapsed-control and dated timecard-link selectors time out; required report then absent/invalid | Codex fixture/driver + Claude actual workflow. Missing downstream reports are consequences, not extra application defects |
| Adviser / lifecycle | Legacy AI-manager link is obstructed under mobile header; retained adviser error-array failure and combined lifecycle refusal remain | Separate Rondo owner, Claude affected navigation, existing integration/test owner. Root-cause resolution/complete rerun is outside Phase 1 |
| Mobile Access | WebKit short touch landscape/rotation assertion fails at line 54; prior local success does not resolve CI discrepancy | Claude supported-device layout + Codex driver/native evidence owner |
| Aggregate Phase D / Phase E / final evidence | Required child gates incomplete/failed | Existing release integration owner after child fixes; never waive aggregation |

These are source-specific failure signatures, not all proven root causes. No unrelated failure was repaired, assertion weakened, test skipped, snapshot refreshed or independent finding self-closed. The scheduling WebKit streaming barrier is already delivered and candidate-04 management/scheduling passed; do not rebuild that repair from candidate-03 prose.

## Reproduce, rollback and next phase entry points

Baseline `edce7661` is preserved in `/Users/josek0514/.codex/visualizations/2026/11/16/01a1e522-de90-7023-9355-a7a7571cc133/phase1-evidence/nevora-phase1-baseline.bundle`, with digest/prerequisite in `checks.json`. It contains the local baseline on top of remote development; the existing integration checkout is not required for recovery. Use a fresh repository/worktree, not another owner's checkout:

```sh
git fetch origin
git bundle verify /absolute/path/to/nevora-phase1-baseline.bundle
git fetch /absolute/path/to/nevora-phase1-baseline.bundle HEAD
git worktree add --detach /new/isolated/path edce7661c211aba588f29bd6d56327fabdc11b47
```

Remote development `22a9d598` is the unchanged operating-source rollback reference; candidate-04 tag `321a7bb5` is the remote exact combined checkpoint. Neither is an instruction to reset a shared checkout or deploy. This phase adds docs only, so withdrawal needs no schema/data rollback. Preserve Owner, privacy, payroll and immutable-history guards if later disabling a writer. For excluded Rondo knowledge, retain its own fenced-code/flag-off rollback guidance; dropping identity columns is not a safe shortcut.

Entry points for subsequent **separately requested** phases (routing from the prioritized plan, not permission to start them):

1. **Phase 2:** start from this exact baseline and the safeguard/CI tables. Reconcile real contract gaps B02–B07/B12; use existing payroll, restriction and readiness contracts. Supply Claude field/error/recovery facts without rebuilding delivered guards.
2. **Phase 3:** reconcile B08–B11/SCRUM-199 projections, reminder authority, correlation presentation and recovery/offboarding fulfillment against actual consumers; preserve separate owners and held features.
3. **Phase 4:** existing integrator joins Claude's selected work and verifies affected role/workflow consumers, guides and the original independent findings/44-family ledger. Any Rondo inclusion first resolves its reserved migration/bootstrap dependency through that owner.
4. **Phase 5:** freeze the actual final source and perform full mandatory backend/release qualification, operating recovery and included hosted/provider proof (B13–B15/Q03). Final exact-source CI, independent QA/UI, supported physical-device and production decisions remain separate.

Engineering: reuse the existing assembly, **GO for this source baseline**. Security: no control weakened, private-data authority and last Owner remain required. Delivery: Phase 1 is complete, later implementation/acceptance remains open. Governance: no exception requested; **NO-GO for operating-release certification while mandatory gates fail**. No Jose decision or further action is required to finish this bounded phase. SCRUM-83 receives an additive evidence update and remains open; no duplicate tickets or overall-release closure.
