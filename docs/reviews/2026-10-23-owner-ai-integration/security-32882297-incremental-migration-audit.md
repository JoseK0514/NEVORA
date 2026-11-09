# Independent incremental migration protocol/evidence audit — 32882297

Reviewed source: `328822972cc600b1b0af5759406fc3528561cb93`, clean local HEAD.
Prepared protocol: `/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/hosted-acceptance-addendum.md`.
Harness: `engineering/dev-ai-incremental-upgrade.mjs` under that external root.
Receipt: `engineering/incremental-dev-upgrade-r2/incremental-upgrade-report.json`.

codeQualityStatus: **WATCH**
recommendation: **APPROVE the bounded local rehearsal evidence and prepared incremental protocol, subject to execution preconditions below**.
blockers: **No new migration-code defect found. Hosted writes are not authorized by this review; independent QA-AT01, mandatory candidate/development CI, hosted coordination/authorization and least-privilege execution validation remain release requirements.**

## Independently verified evidence and scope

Read the entire external harness, actual unchanged `scripts/company-setup.ts`, canonical migration order and both AI migration definitions previously reviewed, final receipt, pinned-order JSON, first-attempt failure log, successful rerun log and owned PostgreSQL shutdown receipt/log. Independently recomputed all 42 migration file hashes against the receipt (zero mismatches). All 40 base migration hashes also match the actual 40282f12 Git blobs. Installer source is unchanged from that base. The addendum's two SQL hashes and order.ts hash exactly match current files.

The external resolver substitution applies only to the installer’s migration-order import from its exact parent URL. It substitutes declared base JSON lists: 38 BASE plus two FINAL files, not SQL or application implementations. It asserts one substitution. The real installer seeds the fictional workspace/location/Owner between the two phases and commits both FINAL migrations before the harness applies either AI file. This is a faithful local simulation of the proposed incremental ordering, rather than a fresh current42 installation falsely labeled an upgrade.

The nine reported checks have corresponding assertions in the harness:

1. Actual base installer yields 109 public tables and all three AI tables absent.
2. Injected SQL failure after 0036 DDL rolls back its transaction and leaves old row snapshots unchanged.
3. Injected SQL failure after 0037 restores the previous request-kind constraint and removes the uncommitted briefing table.
4. Full exact 0036 then 0037 SQL files commit after both FINAL migrations, yielding 112 tables and review_briefing kind.
5. Priority save replays the same request without a second profile/revision.
6. Request reserve retains busy on original operation and enforces daily cap without inference.
7. Briefing review accepts the new kind and replays one canonical review.
8. Deliberate duplicate file execution fails with 42P07 and explicit rollback, preserving all table snapshots and the kind constraint.
9. All 109 original tables retain identical canonical JSON row hashes after these probes.

The result identifies source/tree, nine checks, sourceUnchanged=true and runtimeClosed/portClosed/pgDataRemoved=true. The owned receipt identifies the same source/checkpoint and closed=true. PostgreSQL log ends with database system shut down. The retained successful stdout reports passed/nine checks/closed. The raw log does not itself include an exit-code field, so exit 0 remains the executor's process report rather than a separately encoded assertion here.

The first attempt is honestly retained as ENAMETOOLONG during TSX resolution of a data URL. In the current harness, importing the installer precedes owned cluster creation, consistent with failure before PostgreSQL startup. The corrected scoped JSON import does not change tested SQL.

This reviewer did not rerun the harness, operate a database, read credentials or inspect a live process/port. Closure assessment is from source checks and retained receipts/logs, not a new runtime execution.

## Important evidence limits

Only **8 of the 109 baseline tables contain rows**; the other 101 hash the empty array. The preservation assertion is meaningful for the generated fresh-company fixture, but does not demonstrate behavior against a representative populated DEV database, concurrency, scale, hosted role permissions or every nonempty historical table. The wording should remain “all baseline fixture row hashes unchanged,” not production-data compatibility or full database byte identity.

The local cluster is initialized with the privileged `nevora_upgrade` role and executes migrations/functions under that role. This does not prove the existing hosted least-privilege application role can access the new tables/functions, nor that the chosen hosted migration principal has only the intended rights. That is an execution preflight/postcondition, not reason to broaden the application role. Check actual ownership/default grants and required table/function rights on the isolated target; use the approved migration principal and private binding. Do not infer them from this local pass.

The rollback probes establish transaction rollback on deliberate precommit SQL errors. They do not prove backup restore, lost-connection/ambiguous-COMMIT recovery, live lock duration or a downgrade. The protocol correctly stops on ambiguous state, retains a compatible prior deployment and permits unused additive objects to remain rather than destructively dropping data. Duplicate files are deliberately non-idempotent: fail-closed evidence is not permission to retry blindly.

## Hosted protocol and privacy assessment

The revised proposal appropriately supersedes empty-database/base-installer setup: compare the existing base receipt and immutable migration hashes, verify current schema/identity, then apply ONLY 0036 followed by 0037, each with its own transaction. A partial 0036-only state remains explicit and must retain the old compatible deployment until 0037 postconditions pass. Fresh installer must not be run against the populated target; held tenant files remain excluded.

Execution still needs verified target branch/database/project, schema and function/constraint preconditions, migration principal and least-privilege app rights, and an immutable verified development SHA. A catalog count and absence of three tables alone cannot establish the full deployed schema lineage; retain the actual base receipt comparison described in the plan.

Read-only Vercel READY/base40 approval/catalog observations in the addendum were supplied by the parent/other task and were not independently re-fetched here. READY is correctly distinguished from failed hosted smoke (Updates 503); this review neither resolves that failure nor extends another task's authorization to new hosted work. Coordination with the existing owner/Claude remains a prerequisite. No alias changes or duplicate installer are proposed.

The harness rejects ambient application database URLs, constructs fresh loopback-owned infrastructure, uses fictional identities and a random local bootstrap password, and persists hashes instead of raw table snapshots. SQL log output is local fictional data; this is not approval to persist production table hashes or raw hosted database logs. The addendum identifies environment resources but contains no retrieved passwords/tokens. Provider-disabled acceptance, no real notifications/customer records and a separate new inference cap remain correct boundaries. Deterministic advisor UI may be enabled only after both schema postconditions while provider configuration stays disabled.

## Findings and skill perspectives

CRITICAL: none new.
HIGH: none new.
MEDIUM: none new in the migration implementation/protocol as prepared.
LOW / limitations: sparse fixture and privileged-role scope described above must accompany rehearsal claims; live grants, ambiguity recovery and hosted smoke remain unproven.

Reapplied the already loaded programming/remove-ai-slops criteria. Parsing the finite migration-order source and scoped import substitution are explicit external rehearsal seams, not production extraction/normalization. The rollback/replay/zero-delta checks can fail for meaningful state changes; they are not removal-only or tautological tests. No product complexity or type bypass was added to the repository. The external harness is purpose-specific and should remain evidence tooling, not an alternate production installer.

## Final disposition

The local receipt supports the proposed **incremental order and transactional behavior on a fresh base fixture**. It grants no factual hosted success, root-cause closure for Attention, approval to write the isolated hosted database, development merge readiness or production authorization. Obtain independent acceptance and complete exact candidate/development CI, explicit incremental hosted/coordination approval, then prove hosted identity/permissions and actual execution/acceptance evidence. Live inference still needs its own new cap. All existing raw reviews and other agents' work were preserved; only this external audit note was written.
