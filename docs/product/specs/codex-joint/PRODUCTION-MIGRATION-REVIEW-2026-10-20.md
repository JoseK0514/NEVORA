# Task 4 independent planning review

Reviewed 2026-10-20.

- specStatus: NEEDS_REVISION
- codeQualityStatus: WATCH
- binaryPlanningGate: FAIL
- recommendation: REQUEST_CHANGES
- blockers: Clarify diagnostic authorization in runbook line 65; explicitly name Jose for material freeze-gap risk acceptance in line 33.
- executionReadiness: BLOCKED

This review applies only to the planning packet in immutable range `293ffcf6304ea258697a4614d46a59fa3c626cc1..26f573b32bc02d483ca9909909478a45a06cb8c3`. Two narrow wording corrections remain; the technical plan and mechanical checks otherwise pass. This review does not approve database writes, backup creation, rehearsal, restore, production migration, delivery activation, merge or deployment.

## Scope and evidence

Read the expanded `.superpowers/sdd/CLEAN-MANAGER-VERIFICATION-PLAN/task-4-brief.md`, `task-4-report.md`, and supplied `review-293ffcf6..26f573b3.diff`. The package adds exactly five documentation files under `docs/product/specs/codex-joint`: the runbook, manifest, independent preflight, and two sanitized metadata receipts. The tool truncated the initial package output; the omitted manifest content was inspected separately.

Retained the earlier executive/CTO/CISO/release governance review context and consulted the already-loaded `remove-ai-slops` and `programming` perspectives. The prior preflight report was not modified.

Inspected `verify-documents.py`, `document-validation.json`, and `commit-custody.txt` under `/Users/josek0514/.codex/visualizations/2026/10/20/01a15962-cdee-7dd0-8a92-023551b076fb/migration-plan`. After inspecting the verifier, reran it as a read-only mechanical check and compared its parsed output with saved evidence: exact equality, PASS. Independently compared the five immutable commit blobs with the recorded artifact hashes: PASS. No SQL, application runtime, database query, broad test suite, credential access, index/HEAD mutation or external service operation was performed.

Verified identities:

- Manifest SHA256: `ccdc7c7150bdb6732d3d8944ce5a762d8680f67d743fc58c60d5e3e234e383d5`
- Migration tree: `8f614f006f82d1d15ad185077a987c1687a3b692`
- Ordered payload SHA256: `cda4a68f99a31ed6b1e58f4af5c19403157ae906a9ee76b29d8c7d775389bd2e`
- Runbook SHA256: `b8214b01753b0008ae013e78018a65f5187315c5631d66d06fb110eb0404758b`
- Catalog receipt SHA256: `6d3cc5dc14f26a8e809b2b0940c396f7c4709f704f7d28faca3497518765094a`

Checks confirmed all 36 loader entries and source bytes, 34 potential upgrades, two hashed F10 exclusions, accounting for all 38 SQL files, no 0034, three byte-identical evidence copies and six resolving local links. The transaction screen remains explicitly bounded; it is not SQL validity or runtime proof.

## Findings by severity

### CRITICAL

None in the reviewed planning diff.

### HIGH

None in the reviewed planning diff.

### MEDIUM

M1: `PRODUCTION-MIGRATION-RUNBOOK-2026-10-20.md:65` says "After separately approved diagnostic access" before catalog/data reconciliation following a lost acknowledgment. Read literally, this makes already-authorized read-only investigation wait for another approval, contrary to the working agreement and needlessly consuming the bounded recovery window. State that diagnostics may proceed within the existing approved least-privilege scope; new authorization is needed for expanded credentials/roles/access or write continuation. Preserve UNKNOWN state, the write freeze, lock reacquisition, no automatic reconnect-and-continue writes, and review of the proven committed prefix. Make clear that reviewer verification of a new continuation set does not itself grant Jose's production authorization.

### LOW

L1: `PRODUCTION-MIGRATION-RUNBOOK-2026-10-20.md:33` allows a snapshot/freeze gap to be "explicitly accepted" without identifying the authority. Other recovery text correctly names Jose. For a runbook operators will follow directly, specify that Jose must accept any material recovery-point/write-loss risk; a release reviewer may verify reconciliation but cannot silently accept that risk. This is a narrow clarity correction, not a requirement for extra approval when the gap has been fully reconciled.

## Spec and technical/security assessment

Subject to the two authorization wording corrections above, the runbook addresses the planning requirements from preflight H1, H2, H3 and M1 without claiming those execution gates have passed:

| Requirement | Assessment |
| --- | --- |
| Exact baseline | Gate A requires catalog, grants, external ledger and data-postcondition reconciliation; unknown/divergent entries halt. Twenty-four observed tables and no identified ledger relation are correctly bounded observations. |
| Backfill prerequisites | The data table includes singleton/company/timezone/key assumptions, 0008 NOT VALID name checks before the 0025 all-location UPDATE, participation/import reconciliation, calendar timestamps/ranks, template ownership, historical NULL preservation and notification constraint values. Queries are future reviewed artifacts; no automatic cleanup is permitted. |
| Source custody | Source checkpoint and future final CI-tested candidate are distinguished. Final approval requires matching migration/loader bytes and manifest hash, avoiding a self-referential commit/hash loop. Numeric sorting and silent file substitution are excluded. |
| Transaction/journal | Both 0019 and 0033 require explicit same-connection outer transactions. Embedded boundaries remain intact; global atomicity is not promised. One direct persistent session holds the advisory lock; separate writer fencing remains mandatory. External journal intent/result persistence and UNKNOWN commit reconciliation are explicit. |
| Recovery | Protected:false, Vercel restrictions, unproved parent/root topology and permissions are stated accurately. Six-hour PITR history is distinct from backup TTL. Root-source/target eligibility and actual recovery must be demonstrated; child backup, endpoint movement and protection bypass are not promised. |
| Isolation | Separate rehearsal credentials alone are explicitly insufficient; inherited production-role access must be fenced through proven branch-specific changes. Production secrets and customer data exports are not authorized. Copied customer data stays restricted; functional fixtures use separate isolated data. |
| Compatibility/resumption | Deployed app identity is unknown and must be pinned. Compatibility evidence, complete writer freeze, refreshed state and explicit writer-by-writer resumption are required. If no compatible approved app is available, maintenance or authorized recovery continues. Notification/payroll activation remains separate. |
| Proposed approvals | All three templates are clearly ungranted and require completed placeholders. Preparation limits writes/restore to authorized isolated targets; later production apply pins candidate, manifest, pending set, executor, journal and evidence. Conditional 0034 requires separate integration/migration approval and regenerated review/rehearsal. Merge/deployment/delivery/production restore are not implicitly authorized. |

The proposed external journal and executor are future reviewed artifacts, not invented existing facilities. Rehearsal failure scenarios include commit-before-ack loss, interruptions, contention and both wrappers. No backup/rehearsal/restore execution is necessary to approve this planning document.

## Skill-perspective check

Ran both required perspectives against the documentation diff and verification helper. No new production code or committed tests were added. The helper checks machine-consumed manifest values against independent source bytes and hashes; it does not pin prose wording, verify a requested removal, or merely repeat constants as behavioral proof. Its lexical SQL screen is labeled preliminary and does not rewrite production SQL. No needless production extraction/parsing, untyped production escape hatch, speculative abstraction or tautological test was introduced. No violation of either skill perspective identified.

## Remaining execution gates

The original preflight H1-H3 execution findings remain open, preserved verbatim. The plan addresses them as actionable future gates; no execution evidence is required merely to close the narrow planning corrections above. Execution still requires assigned operators, exact baseline/backfill proof, reviewed executor/lock/journal/postconditions, authorized isolated PG17 rehearsal and failure evidence, supported recovery/retention/isolation proof, deployed-app compatibility, write freeze and explicit Jose authorizations. No risk exception is accepted by this report.
