# Notification and operations closeout handoff

Owner: delegated notification/operations closeout. Integration/release owner: originating coordinator (`01a168d3-eadf-7f90-a039-657a824c1ee9`). Prepared November 10, 2026 in clean-start detached checkout `/Users/josek0514/.codex/worktrees/nevora-notification-ops-closeout-20261110`, based on published development `baf26fc4861a21bc7ddd634f058c8d8f470293d7`. No branch created, push, merge, deployment, credential generation/rotation, cloud schema/grant/quota change, customer-data mutation, real delivery or metered model call.

## Implemented and verified

Code commit **`9bd76d864120e17904a9343e282b302b21d6f16e`** changes exactly:

- `src/lib/operations/monitor.ts`: bound the overall SMTP acknowledgement wait to 15 seconds. Existing transport connection/greeting/socket limits do not bound an entire slowly progressing exchange. Deadline -> `unknown`, with no automatic resend; a late result cannot rewrite that outcome. This does not prove physical transport cancellation.
- `src/lib/operations/monitor.test.ts`: retained deadline/late-acceptance and timer-cleanup regressions.
- `src/test/integration/onboarding-workforce-operations.integration.ts`: actual restricted-principal PostgreSQL journal regression proves committed unknown notice/attempt, released session lock and no resend after late acceptance/retry eligibility.

The first added unit regression failed before the repair (`undefined` at 15 seconds, expected unknown); it was observed inline. A retained replay of the original baseline implementation fails the same assertion: [external RED source receipt](/Users/josek0514/.codex/backend-completion-20261109/parallel-evidence/red/source-receipt.json) and [raw replay log](/Users/josek0514/.codex/backend-completion-20261109/parallel-evidence/red/red.log). Its two imports are rebased for external execution; original baseline bytes are preserved beside it. This is a deferred transport/virtual-time reproduction, not a real slow-socket experiment. Existing loopback SMTP DATA/ACK-loss evidence is separate and passed in the actual SQL suite.

No speculative notification rewrite was needed. Current VAPID validation, environment/test allowlist, encrypted subscription/generation ownership, worker revalidation, reminders, retry/expiry/quiet-hour policy and logout cleanup were inspected and exercised by existing focused/local SQL/browser tests. Queued/provider-accepted/displayed/read remain distinct states.

## Evidence actually run

External root: `/Users/josek0514/.codex/backend-completion-20261109/parallel-evidence`. All database/browser tests used new owned loopback PostgreSQL17.10 clusters with fictional data, stopped and removed by the existing runners. Runtime was Node24.19.0. Provider transports were simulated or loopback-only. One broad/SQL/browser run at a time was coordinated through `parallel-progress.json`.

| Check | Actual result | Source/evidence boundary |
|---|---|---|
| Focused notification/monitor/hosted-route/startup suite | Baseline 479 passed; repaired code 481 passed across 24 files | Final focused run on code commit `9bd76d86`; `parallel-evidence/green-focused.log` |
| Owned `onboarding-owned.mjs --suite workforce-operations` | 27 passed | Repaired precommit bytes, identical to `9bd76d86`; `parallel-monitor-sql.log`; includes real journal/concurrency/principal/ACK-loss tests |
| Full `npm test` | 11,732 passed; 857 skipped; 55 pending records; 793 files passed, 32 skipped | Repaired precommit code bytes, identical to `9bd76d86`; `parallel-default.log`. This is not an exact final documentation-commit or combined-head CI run |
| Owned device-alert browser + canonical notification SQL | 79 passed across 2 files | Runtime code `9bd76d86` with documentation work in progress; `parallel-web-device.log`. Chromium/WebKit/Firefox: 48 main browser checks, 45 captures, 12 contrast samples; 6 supplemental feature/role/install/unsupported gate cases. Ten deliberately expected transport errors, zero unexpected errors |
| Owned deletion SQL | 14 passed | Same runtime code; `parallel-deletion-sql.log`; current request/revocation/concurrency/unknown/withdrawal lifecycle, not an automatic purge or real support verification |
| TypeScript | `npm run typecheck` exit0 | `parallel-evidence/typecheck.log` |
| Changed code lint + whitespace | Three code files ESLint passed; `git diff --check` passed | Code freeze; no assertion of full final combined-head lint/build/CI |

Browser tests use fictional permission/service-worker/subscription boundaries while exercising actual local server/SQL. They do not prove physical installation, actual OS permission/display, assistive technology, provider delivery, hosted tenancy isolation or Claude's entire combined product journey. The Vite config future-native-loader warning was observed and preserved; no assertion was weakened/suppressed. No failing required local check remains in this scoped evidence; the intentionally failing retained baseline is the RED control.

Source-bound clean monitor archive build/verification, if run for this frozen documentation candidate, is recorded externally in `parallel-evidence/monitor-archive-build.log`, `monitor-archive-verify.log` and the final `parallel-progress.json`, without editing source afterward. Such a package is local evidence only; the coordinator's final combined head must be rebuilt/requalified separately.

## Operational packets delivered

- [Web notification/independent SMTP acceptance](../runbooks/web-notification-acceptance.md): exact gate/setting names, staging-only custody, account/device/delivery limits, monitor principal/source/health contract, retry/unknown handling and rollback. Real delivery remains unperformed/unapproved here.
- [Combined web readiness contract](2026-11-10-web-readiness-contract.md): actionable Claude behavior and source-matched positive/recovery/denial matrix; no UI implementation. The review-doc-only collaboration delta from `e561e97c` to `00560614` is 15 files, 329 findings/seven batches. It was inspected through Git, not merged.
- [Separate VELANI isolation proposal](2026-11-10-velani-staging-isolation-proposal.md): empty staging-only schema/fictional fixtures, no Production clone or credential reuse, two distinct database bindings and provider-denied acceptance. This work is outside the current worker pilot and needs separate authorization.
- [Deletion fulfillment/retention](../compliance/account-deletion-runbook.md): exact scoped start/completion, lost-response reconciliation, private per-request manifest, holds/dependencies, approved retention periods, current-schema/credential/object inventory and backup/restore handling. No generic purge SQL or automatic completion mail was added.
- [2027 payroll input readiness](../operations/payroll-2027-input-readiness.md): owner/adviser private input register, rechecked primary publication evidence, first-payday gate and independently qualified versioned rule/PDF/YTD acceptance. `RULESET_NOT_APPLICABLE` remains in force for a 2027 native payday; no business facts or constants invented.
- [Renewal/on-call](../runbooks/renewal-and-on-call.md): Jose is initial responder, selected future inbox remains `support@thevelani.com`; private access/coverage/expiry/cost register, observer supervision, incident/unknown recovery and unanswered operating decisions. Managed runbook links these packets and the deadline behavior.

## Verified provider metadata and remaining gates

Vercel connector calls returned scoped404, so existing authenticated CLI65.14.0 performed explicit-team read-only GETs. Only metadata was persisted, no secret values decrypted/printed. `velani-ai` has one sensitive `DATABASE_URL` entry `EG9ch4r43fMYlpzs` targeting **Production and Preview**, with no branch selector. Its separate `CLIENT_HUB_DATABASE_URL` entry `okbCwWID8SoMnkEd` targets **Production only**. Mutation admission remains blocked. [Sanitized metadata receipt](/Users/josek0514/.codex/backend-completion-20261109/parallel-evidence/velani-isolation-metadata.json) supports the isolation proposal; no customer rows were inspected.

Resend metadata reports `nevora.team` and `thevelani.com` verified, sending enabled, open/click tracking off, receiving disabled at Resend. It does not prove configured SMTP authentication, selected sender custody, external mailbox receipt or a delivered alert. No SMTP connection verification or send occurred.

Coordinator retains: exact-head CI and source-inventory reconciliation; company worker/control0007/quota/grants/private custody; Render plan/activation/final development publication. This track does not close those gates or relabel original `19b4` SQL/D2 failures as diagnosed. Existing frozen CI sources are unchanged by these local detached commits.

Bundled remaining owner inputs/authorizations:

1. Separately bounded hosted activation and real web-push/SMTP/reminder exercise after coordinator gates; initial proposed finite exercise is one current-device self-test plus outage/recovery pair, with pause on unknown/failure. No mail/push/SMS authorization inferred.
2. Separate VELANI empty-target isolation implementation/credential/grant/cost authorization, then source-qualified hosted mutation; real form -> two-email delivery remains another gate.
3. Actual first2027 native payday, employer/population, private payroll input owner/adviser and any new year-scoped calculation policy after source review.
4. Trustworthy pre-request contact source for withdrawal; actual private support/inbox access; backup responder/coverage/response target; real renewal/expiry/billing register; monitor-journal retention/archival decision. Existing deletion periods, Jose's initial response ownership and selected inbox are already established inputs.

## Director positions and integration

Engineering: smallest monitor repair, no new schema/dependency/worker profile. Security: preserve least privilege, closed outbound gates, no secret/customer-data exposure; timeout remains ambiguous custody. Technical assurance: deferred-transport RED plus actual journal evidence supports the bounded wait, not physical cancellation or hosted uptime. Governance: **GO WITH CONDITIONS for coordinator review/development integration; release impact CONDITION / Production HOLD**, no exception accepted. Program delivery: local track implementation and operating packets delivered; independent review, exact combined-head CI and hosted acceptance remain separate.

The coordinator's existing independent reviewer owns review of the frozen three-file code delta. This handoff supplies evidence and does not claim or self-close that review. Final review disposition/commit hashes live in the shared progress file.

Integration order: preserve current exact-source CI first; fetch/reconcile source inventory and the collaboration review-doc head under repository policy; review/cherry-pick `9bd76d864120e17904a9343e282b302b21d6f16e`, then this documentation commit (full hash in final progress). Verify runtime code is unchanged by the docs-only successor. Resolve conflicts against current development without taking unrelated work or weakening checks. Run required combined-head CI and rebuild matching host/monitor packages from that clean head before any hosted approval. Do not reuse this candidate's embedded SHA for another source. No main merge, push or deployment was executed by the delegated track.
