# NEVORA backend — Phase 4 delivery

November 16, 2026, America/Puerto_Rico. **Owned local delivery ready for the existing integration owner; shared/operating acceptance remains conditional on the dependencies below.** No Phase 5, shared-branch publication, deployment, provider activation or metered model call began.

## Source, ownership and reviewed commit

- Exact application baseline: `edce7661c211aba588f29bd6d56327fabdc11b47`, available locally. The Phase 1 documentation commit `605de3bb` was not substituted. No newer shared baseline was expressly supplied by the integrator; no moving branch or unfinished owner change was imported.
- Isolated worktree: `/Users/josek0514/.codex/worktrees/nevora-backend-phase4-20261116/Fuel Scheduler`.
- Local branch: `codex/nevora-backend-phase4-20261116`.
- **Reviewed application/test/contract commit: `74421d91b99f0f554ba60863c8b9cdda8f849d4a`.** Code review: CLEAR / APPROVE, no remaining code blockers; [final review](2026-11-16-backend-phase4-evidence/code-review-final.md). This is implementation review, not independent QA certification. Source service SHA-256 `a31912b6675dcf709895ead52de22eca785ed1038ab608f6518a9bbdb8b924e8` matches the reviewed/verified bytes.
- This handoff and its evidence form a documentation successor. The external delivery receipt/bundle identifies both commits after documentation commit creation. Nothing was pushed.

Local transfer artifacts for the existing owner: `/Users/josek0514/.codex/visualizations/2026/11/16/01a1e540-0782-79f0-bfae-95b41215d125/nevora-backend-phase4.bundle` and adjacent `phase4-delivery-receipt.json`. The receipt records the exact documentation SHA, bundle SHA-256 and verified prerequisite; it is finalized after this document's commit. The local branch itself is also available through the shared Git object store; no other chat was contacted.

The user's explicit Phase 4 ownership supersedes older phase numbering in Phase 1's generic next-phase list. Development remains the operating/acceptance line at production standards. Codex owns backend/hosting, Claude all presentation. The existing integrator retains assembly/migrations/publication; the Rondo owner retains its provider/knowledge/tools/planner/evaluation. Main/production still require Jose's approval.

## Exact owned files

Application/test/contract commit, nine files:

- `src/app/api/manager/reminders/eligibility/route.ts` (new read-only POST).
- `src/lib/manager-reminders/types.ts`.
- `src/lib/manager-reminders/service.server.ts`.
- `src/lib/manager-reminders/http.server.ts`.
- `src/lib/manager-reminders/service.server.test.ts`.
- `src/lib/manager-reminders/http.server.test.ts`.
- `src/lib/manager-reminders/README.md`.
- `src/lib/server-error.test.ts` (tests only; shared logger unchanged).
- `src/test/integration/phase-e-communications.integration.ts` (additional Phase 4 cases; all existing cases retained).

Documentation ownership: this dated delivery, `2026-11-16-backend-phase4-worklog.md`, `2026-11-16-backend-phase4-claude-contract.md`, `2026-11-16-backend-phase4-rondo-readiness.md`, and `2026-11-16-backend-phase4-evidence/*`. Ownership was recorded before implementation in the worklog. The initially considered static access-support helper and extra deletion test were unnecessary and were not created/changed. No shared auth/session, UI, schema/migration, dependency, flags, payroll or Rondo implementation file changed. Other checkouts were only read.

## Reconciliation and delivered delta

| Package / disposition | Baseline and actual change |
| --- | --- |
| B09 — already implemented | Current Company-scoped reminder commands, one-target source checks, daily cooldown, immutable ledger/outbox transaction, same-ID retry, concurrent deduplication and lost-response lookup already existed. Preserved, not rebuilt. |
| B09 — missing contract, now delivered | Read-only eligibility for the exact proposed command, with current role/scope/target/source window, quiet-hour due time, cooldown, hold/refusal and preferred original-operation receipt. Initial/final receipt/source reads use writer source locks; disclosure has a final live-session/authority fence. Queue reopening is 21:00 on the consumed delivery day, not the next 07:00 delivery. |
| B09 — UI unwired / held | Claude consumes the typed preview/command/recovery states. Existing Updates module and owned-loopback activation hold remain. Manual restricted Owner-help uses existing workplace contact/support with minimum self-supplied context; no messaging endpoint or private directory was added. |
| B10 — already implemented | Existing generated, request-local correlation and sanitized stderr logger, unchanged domain bodies and separate expected refusals. Preserved. |
| B10 — new boundary / regressions | Unexpected new-preview failures use that logger/header; incoming reference spoofing and interleaved per-response isolation are tested. Session loss between HTTP admission/proof now returns explicit 401 using the existing nullable proof reader. No shared authentication rewrite. |
| B11 — already implemented | Employee-ID/password, distinct Clocker PIN, activation/replacement, complete proof admission, single-use/expiry/revocation, passkey gates, all-subject-session reset revocation, onboarding and last-usable-Owner protections. Existing SQL/API fixtures re-executed. No lifecycle rebuild. |
| B11 — UI contract complete / shared correction open | Exact typed outcomes, original deletion recovery, LAST_OWNER next steps, safe relative returns, EN/ES mechanism and existing retention/closure boundaries are documented. Shared correction P4-AUTH-01 remains assigned below. |
| Rondo — included source versus pending integration | Existing baseline Owner adviser contracts assessed with offline fixtures. Separate knowledge/provider delivery identified by exact source; no migration or merge. Intended launch capabilities remain dependencies, not silently excluded. Fifty-question quality remains unqualified. |

Full request/read/error handling and synthetic examples are in [Claude's exact consumption contract](2026-11-16-backend-phase4-claude-contract.md), reminder README/types and [synthetic fixtures](2026-11-16-backend-phase4-evidence/synthetic-fixtures.json). [Rondo assessment](2026-11-16-backend-phase4-rondo-readiness.md) identifies its source, schemas, gates, publication/citation/revocation behavior, review/recovery, migration/consumer dependencies and quality/cost limits.

## Executed verification

Dependencies: `npm ci --ignore-scripts --offline` after script/config inspection; no lifecycle scripts or network package install. Existing local PostgreSQL 16.15 XML-enabled runtime was used. Each owned invocation created fictional loopback databases, removed inherited application/test target URLs and stopped its cluster; onboarding also explicitly removed its temporary cluster. Invitation SMTP fixtures use owned local fake transport, not real mail. No credentials/customer data were copied and no provider service was called.

| Check | Result |
| --- | --- |
| Consolidated focused unit/API contracts | **326 passed / 29 files**; reminder/support, actual HTTP forged-header test, revocation, login/session, proofs/mail templates, passkey client, safe destinations/language copy, deletion, offline Rondo schemas/citations/provider failures. |
| Owned reminders/communications SQL on final reviewed bytes | **52 passed / 1 file**; all existing scenarios plus new advisory/no-write, current Company scope, separate-company target, source/session expiry, hold, concurrent original receipt, daily budget/queue boundary and final receipt-disclosure revocation. |
| Owned account recovery SQL | **18 passed / 1 file**; legitimate replacement, full proof, invalid/used/retired/expired links, concurrency, atomic session revocation and unchanged Clocker/work records. |
| Owned deletion SQL/action | **24 passed / 1 file**; lost replies, idempotency, last usable Owner/activation requirements, races with deletion/demotion and no unintended request/session effects on refusal. |
| Owned Company recovery/calendar SQL/API | **27 passed / 1 file**; current Company scope, restricted/foreign/hierarchy refusal, revocation across awaits, own recovery independence. |
| Owned passkey SQL/API | **38 passed / 2 files**; current authority, login/credential lifecycle, challenges, independent passwords and session defenses. |
| Owned invitation SQL/API/races | **25 passed / 3 files**, including local fake SMTP, eligibility, concurrent issuance/revocation and route outcomes. |
| Owned initial Owner activation | **13 passed / 1 file**; real credential/replacement flow, expired/revoked/foreign grants and unknown-commit recovery, no fabricated login session. |
| Standalone TypeScript, scoped ESLint, `git diff --check` | **PASS**. Initial type widening / fixture-discriminant errors were fixed; failed attempts are retained. |
| Code review | **CLEAR / APPROVE**, including review-driven SQL regressions. Independent QA, hosted and UI acceptance remain separate. |

Total fresh nonduplicated final scope: **326 unit/API contract tests and 197 owned PostgreSQL/API tests passed**. The [machine-readable evidence ledger](2026-11-16-backend-phase4-evidence/checks.json) contains exact commands, counts, results and log hashes. Test totals are executed cases, not a broad full-backend or exact-release qualification. Earlier targeted runs/overlapping tests are not added again. No full unit/build/browser/CI gate was launched. No heavy build/browser execution slot was consumed, so no execution-handoff reservation or chat contact was necessary.

Red/green evidence is retained: missing API/service read, incorrect cooldown boundary, masked concurrently committed receipt, and missing final receipt response fence. The first hold fixture changed its own database marker without restoring it before teardown; fixed with `finally` restoration and subsequent owned cleanup passed. The first foreign fixture tried an already-owned database name; corrected to a distinct newly owned database while preserving admission fences. A Phase E runner attempt refused missing exact-SHA metadata before creating a server; focused SQL then used the already-existing owned filtered runner, without changing any gate. Filtered runs list their unexecuted cases; final 52-case suite has no such omissions.

## Open dependencies and owners

| ID / owner | Required next action; status |
| --- | --- |
| **P4-AUTH-01 — existing shared authentication/security owner** | `endedSessionLogin` currently derives hints from Referer matching incoming Host/forwarded host. `safeReturnTo` blocks external destinations, but those inputs are not trusted session evidence. Replace hint derivation with a trusted configured origin and authenticated/request-owned destination; add spoofed-host/Referer/language regressions. **OPEN**, documented without changing occupied shared infrastructure. No open redirect/access bypass claim was made. |
| **B09/U10 — Claude + communication release/operations owners** | Implement truthful eligibility/queued/held/unknown feedback and manual Owner help. Existing communication and delivery holds stay disabled; hosted send/delivery not qualified. |
| **B10/U11 — Claude + operations responder** | Copyable header reference, separate operation recovery, authorized live log lookup/responder drill. No operating proof from local logger tests. |
| **B11 — support/business owner + shared security/Claude** | Establish usable replacement Owner or route company closure through existing support; actual closure/deletion/provider completion, historical-mailbox withdrawal proof and approved subprocessor/DPA/security-overview operational review remain open. Preserve policy `2026-11-10` and existing retention; no automatic timer/purge or personal-delete-to-company-close implication. |
| **B17/U18 / existing Rondo owner and integrator** | Select its complete available delivery, reconcile reserved 0064 after 0065 and canonical bootstrap, join Claude's knowledge consumers and qualify intended capability. Actual-model 50-case quality/independent scores, wider readers/weekly workflow and cost/hosted evidence remain open. No new spending authority. |
| **Existing integrator / Phase 5 owner** | Receive local commits, reconcile exact owned files into the single combined Development line, resolve shared correction/dependencies, then perform separately authorized combined qualification. No assembly or Phase 5 was performed here. |

No new Jose decision is required to receive these local commits. A policy exception, new spend/provider activation or main/production promotion would require its own authorization; none is requested or inferred here. Do not call the whole phase/release unconditionally accepted while its mandatory included shared dependencies remain open.

Jira evidence added without status transitions: [SCRUM-60](https://thevelani-team.atlassian.net/browse/SCRUM-60) comment 10439, [SCRUM-207](https://thevelani-team.atlassian.net/browse/SCRUM-207) 10440, [SCRUM-194](https://thevelani-team.atlassian.net/browse/SCRUM-194) 10441, [SCRUM-201](https://thevelani-team.atlassian.net/browse/SCRUM-201) 10442 and [SCRUM-83](https://thevelani-team.atlassian.net/browse/SCRUM-83) 10443. Receipt metadata is in `2026-11-16-backend-phase4-evidence/jira-updates.json`. UI, hosted, model quality, shared correction and release gates stay open.

## Integration and rollback

The existing integration owner can inspect/cherry-pick the reviewed application commit and documentation successor from this local branch/bundle. There is no remote PR or publication. Before their next assembly, they retain the required fetch/source-inventory reconciliation and source-owner custody. Phase 4 did not fetch a moving candidate or merge anyone's unfinished branch.

This is additive application/test/documentation work, with no data migration or new persisted operation format. Rollback can remove the eligibility route and revert its owned commit, restoring previous reminder behavior while retaining existing command/receipt tables and guards. Reconcile in-flight original operations through their existing status path; do not delete outbox/receipt history or enable communications to compensate. Shared auth/session and Rondo code were untouched. Do not reset a shared checkout.

Engineering: smallest new read contract, no broad auth rewrite. Security: Company/session/source checks and final disclosure fences preserved; shared hint correction explicitly open. Product: scope remains B09–11 plus Rondo contract assessment. Assurance: review findings reproduced and corrected, no remaining owned-code blockers. Delivery: local artifact delivered; Claude/integrator/operating dependencies retain owners. Governance: **GO for local integration handoff; CONDITION for included shared workflows; NO-GO for unconditional release certification**. No risk exception accepted or independent finding self-closed.

Stop after this Phase 4 handoff. No Phase 5 work is authorized by this record.
