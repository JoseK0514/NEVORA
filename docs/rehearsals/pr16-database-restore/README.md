# PR #16 database upgrade and restore rehearsal

Integration target: **`4b9e9ccee4a8ea1176c9d9002b58b2ec2acd40b1`** from
[`refs/pull/16/head`](https://github.com/JoseK0514/NEVORA/pull/16).
The PR moved from `4b582b65` during preparation, so verification was refreshed.
`development` was observed at `d4b01453f7fabaa7ac739d049934527b6b366310`.
This work adds rehearsal tests and documentation only. New product features
continue from `development`; these integration checks use the actual PR candidate.

## Result and custody

Final result: **PASS — 54/54 database checks in each of two independent runs**.
All four scenarios passed in both runs, with three backup/restores per run.
No database checks failed or were skipped. Both runs verified cleanup of all
owned containers. The five safety-guard tests, focused lint and focused typecheck
also passed. See [summary.json](summary.json), [final-a.json](final-a.json) and
[final-b.json](final-b.json).

Machine-readable final receipts are `final-a.json` and `final-b.json` beside this
document. Each receipt records the full candidate, test-source checksums, runtime,
immutable PostgreSQL image digest, migration hashes, individual PASS/FAIL results,
archive checksums, per-table row counts/digests, and cleanup outcome. There are no
production records, connection strings, password hashes or passkey private keys
in the committed receipts.

The rehearsal requires `HEAD` to equal the full supplied candidate, with no
modified or staged tracked files. New harness files are added separately as
untracked test inputs. Application, schema SQL, dependency declarations, lockfile,
existing tests and CI configuration remain byte-identical to that candidate.

## Reproduce

Use an isolated checkout of the pinned commit containing the new
`scripts/rehearsal/` files. A review branch that contains these files can supply
them with `git archive <review-branch> scripts/rehearsal | tar -x -C <candidate-checkout>`.
This copies only the new tests into the candidate; it does not merge application
changes. Cloud tasks are already isolated; do not create a Git worktree unless
explicitly requested.

Requirements: Node **24.19.0**, the candidate's frozen npm dependencies, and a
healthy managed local Docker socket. PostgreSQL binaries are supplied by the
official pinned image, not by an existing database server. Keep the environment's
proxy, registry authentication and CA verification enabled.

```bash
set -euo pipefail
cd /workspace/NEVORA-pr16-rehearsal
git rev-parse HEAD
npm ci --cache /workspace/.cache/npm --no-audit --no-fund
env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS \
  -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH \
  docker --host=unix:///var/run/docker.sock pull \
  postgres@sha256:0ea6700a3b4f0ae6ce746519073558aed4d88a79d8d07622a9a644946c7319c4

node --import tsx --test scripts/rehearsal/guards.test.mts
node_modules/.bin/eslint scripts/rehearsal
node_modules/.bin/tsc --noEmit --pretty false -p scripts/rehearsal/tsconfig.json

env -u DATABASE_URL -u FUEL_TEST_DATABASE_URL -u NEVORA_SETUP_DATABASE_URL \
  node --conditions=react-server \
  --import ./scripts/node-server-context.mjs --import tsx \
  scripts/rehearsal/database-rehearsal.mts \
  --candidate 4b9e9ccee4a8ea1176c9d9002b58b2ec2acd40b1 \
  --output .omo/evidence/pr16-database-rehearsal-new-run
```

Use a fresh output directory for each invocation. Exit zero requires all four
scenarios to pass, at least one real check to execute, every executed check to
pass, and owned container cleanup to succeed. Missing prerequisites or failed
checks produce a nonzero exit; a zero-test run cannot pass. Retain the complete
runner exit status when recording output.

## Coverage

| Scenario | Evidence required |
| --- | --- |
| Fresh installation | Actual `setupCompany` installer; configured company/Owner; no spurious payroll rows; non-destructive second-install refusal; no automatic scope for a later-created Manager. |
| Existing database at `0002` | Fictional Owner, active/inactive Managers, employee credentials/sessions, eligibility and custom staffing. All original columns and rows survive the remaining operational migrations. Only the active legacy Manager is adopted. |
| Pre-upgrade recovery | Logical backup of the populated `0002` database restores exactly into a different cluster, then upgrades successfully with its legacy records intact. |
| Pre-passkey upgrade | A populated payroll/Company Access database upgrades through `0035` without changing any pre-existing row; registration and signed authentication work afterward. |
| Current backup/restore | Fresh and upgraded databases include payroll revisions, an approved native ledger, PDF bytes, scope history, password hashes, sessions, passkey public keys/counters and audit rows. Restore roles, ownership, ACLs, schema, every public table and sequence into separate clusters. |
| Failure and retry | Inject an event-trigger failure late in `0032`; verify all access objects roll back and original rows remain; remove the test interruption and retry successfully. |
| Negative controls | Deliberately change an employee record and remove a CHECK constraint in disposable restored databases. The data/schema comparisons must detect both. Restore those controls before functional probes continue. |

Each current or upgraded restored database then exercises actual candidate
services: Owner authority, a Manager's finite location scope and denials, separate
payroll review/approval authority, payroll reads and exact document bytes,
correct/incorrect password verification, guarded session creation, inactive and
expired-session rejection, real signed WebAuthn test messages with replay
rejection, and append-only access/payroll/passkey audit enforcement.

The migration plan has **40 operational files**. It must match both the disposable
adapter declaration and the actual company installer, and account for every SQL
file. The two held tenancy files (`0026_tenant_ownership_expand.sql` and
`0027_tenant_ownership_validate.sql`) remain explicitly excluded, as in the
candidate's installer. Duplicate numeric prefixes make a numeric filename glob
an invalid substitute for this declared order.

## Integrity and cleanup controls

The harness accepts no database URL. It creates labelled, random-identity
containers, tmpfs PostgreSQL storage, owner-marked databases, and loopback-only
published ports. Every Docker operation pins the managed local socket; inherited
Docker endpoint selectors cannot redirect it. Cleanup checks the invocation's
ownership label and removes only its containers/volumes, including a partially
created container. The final receipt records cleanup.

Backups use `pg_dump --format=custom --create` plus `pg_dumpall --globals-only`.
Restore uses `pg_restore --exit-on-error` and `psql ON_ERROR_STOP=1`, with a different
bootstrap role to avoid masking role-creation errors. PostgreSQL was **16.15**.

Logical equality includes every public table's ordered columns, exact row count
and SHA-256 digest, plus sequence configuration/current values. Schema equality
includes functions, views, CHECK/FK constraints, indexes, triggers, ownership and
ACLs. PostgreSQL reparses some nested associative `AND` CHECK expressions on
restore; raw textual dump equality is therefore too strict. Expected canonical
DDL is obtained by reparsing the **live source schema dump in another empty owned
database, independently of the backup archive**, then comparing the full schema
dump. Dump comments/ephemeral `\restrict` tokens are excluded. Definitions are
not dropped or compared with parentheses stripped; the missing-constraint
negative control verifies detection.

Private raw archives, globals, and original/canonical/restored SQL remain under
`/workspace/.rehearsal/` in this cloud machine, with owner-only files. They contain
fictional records only and are not committed. JSON receipts retain their hashes.

## Scope, earlier evidence and release impact

Initial harness-development attempts are retained in `/workspace/.rehearsal/`.
They found a harness database-name guard bug, a raw-dump comparison false alarm
caused by PostgreSQL CHECK-expression normalization, and an empty-schema setup
mistake in that normalization helper. These were test-harness corrections; no
application migration or authorization rule was changed. Final receipts identify
the frozen harness that was actually executed.

The earlier three-suite browser refresh is **historical: 42/42 cloud passes at
`6c56f504`**, as supplied by Jose's
[historical evidence](https://github.com/JoseK0514/NEVORA/blob/f3a1a7c4b8d10ca76094f7c819f1fa59615998c2/release/phase-e-browser-refresh-20261019/README.md).
It is not a browser result for this candidate. This task does not refresh UI
integration or repair existing CI; their owners retain those responsibilities.

Engineering: bounded database rehearsal only. Security: least-privilege and
authentication controls must survive restoration. Program: evidence binds one
immutable candidate; a later candidate needs affected checks rerun. Governance:
release impact **CONDITION**. These results are local PostgreSQL evidence, not
hosted Neon/PITR, cross-major PostgreSQL, production migration, physical-device,
full browser/CI or independent release acceptance. Individual migration rollback
and pre-upgrade restore are tested; whole-chain transactional rollback and
in-place production downgrades are not claimed. Existing release holds remain.
No production authorization or policy exception is requested by this rehearsal.
