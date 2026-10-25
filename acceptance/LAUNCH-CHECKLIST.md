# First-customer launch checklist

Document status: READY_FOR_REVIEW. Operational checks: NOT_STARTED. Accountable: Jose / Business Owner. Coordinator: NEVORA Operations Lead. This checklist prepares execution; it contains no migration/deployment commands and makes no current hosting-readiness claim.

## Entry: identify the release and target

Complete the following with non-secret identifiers or private evidence references; a label such as “Production” or “Preview” is insufficient.

| Required record | Value / evidence / verifier |
|---|---|
| Customer company count, employee count, locations and timezone | __ |
| Frozen integrated commit SHA; authoritative PR/branch lineage | __ |
| Exact UI, backend and worker source/artifact versions | __ |
| Hosting team/project ID, environment, deployment ID and mapped SHA | __ |
| Exact HTTPS domain/origin and domain ownership/readiness | __ |
| Database provider project ID, branch ID, database name and company/workspace identity | __ |
| Runtime/worker bindings match this one company; isolated rehearsal identity differs | __ |
| Current/required schema manifests and checksums; compatibility review | __ |
| Approved feature/module states and build/runtime setting names/status | __ |
| Backup/restore-point ID, timestamp, retention/expiry and private custody reference | __ |
| Successful isolated restore rehearsal, integrity checks and observed recovery timing | __ |
| Previous approved app/worker artifacts and compatible rollback environment | __ |
| Deployment operator; rollback operator/decision owner; support contact | __ |
| Jose's explicit target-specific authorization and execution window | __ |

Do not record connection strings, credentials or personal records. Historic restore-history policy language does not establish configured backups or a recovery guarantee.

## Release and customer gates

- [ ] Claude's [handoff](CLAUDE-HANDOFF.md) is complete. Candidate manifest reconciles `db/migrations/order.ts` with deployment guidance, including currently registered `0036`/`0037`. Duplicate numeric prefixes are not sorted; held Phase F files remain excluded. Fresh-empty setup is never treated as an existing-database upgrade.
- [ ] Required exact-SHA CI, combined security/functional/UI evidence, hosted isolated Neon transport/schema proof, independent QA/UI and FR-AUTH-001 closure are linked. Read the repository's `docs/execution/final-release-checklist.md` and `docs/product/specs/codex-joint/DEPLOY-RUNBOOK.md`; their mandatory gates remain binding. Prior local reports do not establish hosted acceptance. Changes after freeze reopen affected gates.
- [ ] Open findings, disclosed performance/device limitations and exceptions have owners. Mandatory blockers are resolved; material residual risk decisions are explicitly Jose's. No management document self-closes independent findings.
- [ ] Customer Owner confirms roster/configuration accuracy, authorized Manager scope, first Owner access, cohort activation/login evidence regardless of invitation delivery flag, fallback scheduling/time recording, training attendance and support contacts using the [onboarding playbook](../onboarding/ONBOARDING-PLAYBOOK.md). Required activation unavailable means BLOCKED unless a supported alternative is positively verified.
- [ ] [Acceptance plan](CUSTOMER-ACCEPTANCE-PLAN.md) fictional rehearsal passes before the separately consented pilot. Pilot boundaries and any real invitation, publication, timekeeping, payroll or provider actions are expressly authorized. Customer Owner signs the pilot result before wider rollout.
- [ ] Operations verifies access, backup/restore custody and compatible rollback evidence with [access and recovery](../infrastructure/ACCESS-AND-RECOVERY.md). No unselected target or unapproved production operation proceeds.

## Authorized rollout and observation

The authorized operator follows the approved repository runbook and selected target record. A push, merge, deployment record, or this completed document is not production authorization. Verify the resulting production artifact, domain, database and environment bindings before customer entry; isolated Preview settings cannot carry over by assumption. Keep optional features and workers at their approved states and expand users only within the accepted rollout scope.

Operations records pre-release and 5/15/30/60-minute observations: authentication/role behavior, request/error rates, unavailable Home/Profile counts, latency, database/lock errors, notification suppression and approved worker state. Agree workload thresholds with Engineering and Jose before launch; local timings are not hosted service guarantees.

## Stop, rollback and exit

Wrong company/database/domain, privacy or authorization exposure, missing schema, lost writes/preferences, repeated unavailable states or sustained agreed-threshold failures trigger an immediate rollout pause and escalation to Jose. Operations Lead owns incident coordination; the named authorized operator performs only the approved rollback. Preserve timestamps, candidate identity and protected evidence. Prefer the approved compatible app rollback while preserving immutable ledgers, revocations, notification preferences and audit history. Data restore/schema reversal needs its separately reviewed approval and reconciliation of post-release writes.

Exit requires Customer Owner acceptance, no unresolved blocker, stable agreed observation window, recorded target/candidate, remaining issue owners, and Operations acceptance of [support procedures](../support-training/SUPPORT-PROCEDURES.md), escalation contacts and recovery custody. Record release result __; evidence __; Customer Owner __; Operations Lead __; Jose decision __; next review __. Commercial terms remain outside this checklist.
