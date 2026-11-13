# SCRUM-84 / 85 / 89 development delivery — November 12, 2026

Jose explicitly requested completing the work and merging into development.
This supersedes the earlier local-patch-only disposition in
`2026-11-12-scrum-84-85-89-130-execution.md`. The website delivery is recorded
separately in Velani development `4dde3c8f476b68e8ecbf345ee6308dedee1a6e08`.

## Source and integration

The environment's original fetch refspec updated only main; the cached development
ref was not the actual current remote branch. Explicit branch fetching established
NEVORA development f6baaaa6, then the concurrently delivered e14b37aa SMTP repair.
The completed changes were rebased onto e14b37aa; no incoming application work was
replaced. Current application checkpoint is
`546dfb667d072ed54dbd06b4de5f8519c3443eaa`.

Delivered changes:

- Rehearsal planner follows and hashes the actual shared canonical bootstrap,
  preserves final migration order, reconciles 70 files and excludes both held
  tenancy migrations without evaluating candidate code during discovery.
- Pre-passkey upgrade correctly defers dependent 0035/0060 and includes final
  0062 through the canonical missing-file plan.
- Operations negative controls explicitly create a public directory despite an
  inherited077 umask, and reap the owned descendant before the parent exits on
  systems whose PID1 does not reap orphans. The parent never signals the child;
  the process-group cleanup, strict expectations and deadlines are preserved.
- The on-call runbook records Jose's confirmed office-backup arrangement for
  Ilianis, using the main computers. Assignment and response targets are unchanged.
- All six manuals/PDFs are rebuilt and verified from checkpoint546dfb, preserving
  the incoming bounded SMTP delivery-wait repair.

## Engineering verification

The first broad unit run at the prior integration reported12,760passes,895skips
and6failures. The retained failures identify the two fixture issues above, a stale
manual bundle and three process deadlines during concurrent qualification.
After repairing the actual fixtures and rebuilding the manuals, the complete
CI-style single-worker run passed **12,766tests /895skipped /zero failed** at
60eb107c4e. Skips are not counted as passes.

The subsequent incoming delta changes only account-email SMTP code/tests plus
documentation. At current546dfb, all **43affected operations/startup/manual/SMTP
tests pass**; planner/safety/diagnostic tests pass **23/23**. Type checking and
lint passed on the prior combined source; the existing anonymous-export lint
warning remains a warning, not an error. The source inventory passes all73
classified sources/three active branches. The earlier rebased full local
PostgreSQL rehearsal passes **56/56**, source unchanged and cleanup true.
The exact post-push GitHub run remains a distinct verification record.

## Hosted database evidence

Two newly created, explicitly synthetic projects use the existing Neon Free
organization, aws-us-east-1, PostgreSQL17, fixed0.25CU endpoints, one-hour active
quota/900CU-second quota and256MiB storage/transfer/write limits. No existing
worker/company/control database, quota or approved finisher window was used.

Source project `morning-salad-93941233`, branch `br-odd-pond-bbjzv1wi`:

- Actual company bootstrap on a proven empty target, refusal of occupied setup,
  full canonical legacy upgrade and preservation of original rows/columns.
- Actual Neon HTTPS transaction-local state and rollback of earlier writes on a
  failing transaction; actual WebSocket behavior checks for Company Access,
  payroll/document bytes, session guards, passkeys and immutable audits.
- Actual canonical pending-company bootstrap creates APP and WORKER principals.
  All restricted role flags pass; each identity can read its intended workspace
  identity and is denied DDL, private provisioning receipts and provisioner-role
  adoption. **3/3role checks pass.** The first fixture incorrectly denied an
  explicitly granted identity read; it was corrected to the actual contract.
  No runtime grant was changed to obtain a pass.

Recovery project `lucky-wind-29844564`, database `scrum84_restored3`:

- A real961,879-byte custom-format pg_dump, SHA256
  `08c57ad9417bb094678953b4d17a7b7aeeddbfc9b0d1095046ee52878d8651eb`,
  is retained privately outside Neon. No raw archive or credentials enter Git/Jira.
- Actual pg_restore into the separate project, followed by comparison of155table
  layouts/sequences and all150stable table digests. The application has154tables;
  the additional table is the owned HTTPS rollback probe.
- Original passkey audit rows, credential rows and sessions all remain present
  byte-for-byte; additional rows come from explicit post-restore authentication
  exercises. Mutable challenge/rate-limit state is separately identified.
- Fresh-client post-restore Company Access, exact payroll PDF bytes, independent
  payroll scope, password/session behavior, signed passkeys/replay rejection and
  immutable-audit controls pass **6/6**.

The initial export's60-second cutoff interrupted real catalog/COPY progress.
The bounded five-minute export succeeded. A serial five-minute restore timed out;
its partial database remains preserved. Native four-job restore to a new empty
database completed under the same bound. The first immediate post-restore passkey
ceremony reported unavailable; fresh-connection registration and all six behavior
checks passed. That transient's cause remains unproven; it is not represented as
an application fix or independent closure. Full failure logs remain private and
the packet retains sanitized failure receipts.

A separate native provider snapshot `snap-red-wave-bbsimczs` was restored to
`br-winter-dream-bbqlze99` without replacing the source branch. At recorded
LSN0/3A42000 /02:29:11UTC, a read-only compute returned matching payroll history,
PDF hashes, passkey counts and155tables. Its snapshot expires08:00UTC November13.
The configured six-hour restore history is a test-project setting, not a promise
about production retention or recovery time.

## Custody and remaining gates

The exact source/environment receipts and sanitized reports are in
`scrum84-85-89-development-evidence-20261112/`. Raw fixture archives and temporary
credentials remain owner-only. Test computes are suspended after verification;
projects and failed fixtures are preserved for review under their finite limits.
No operational worker, provider mail/push, public application or production data
was activated. A hosted database test is not a deployed SaaS acceptance test.

Engineering source and isolated database qualification are delivered. The
designated independent reviewer still owns release certification; the sole
finisher owns the actual combined application/worker hosted environment and its
release gates. SCRUM-89 still needs a dated real responder alert/acknowledgement,
escalation and recovery exercise through the confirmed office access path.
Those human/operating receipts cannot be generated by unit tests or attestation.
No additional real messages were sent or existing alert allowance increased.

Product acceptance scope is unchanged; engineering preserves incoming source;
security preserves isolation, role and immutable-history fences; delivery
distinguishes implemented, tested and release-accepted. Governance supports the
development merge. Production promotion, independent acceptance and live
operational activation retain their original conditions and Jose's authority.
