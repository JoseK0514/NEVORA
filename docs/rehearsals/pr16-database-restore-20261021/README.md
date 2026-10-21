# Database rehearsal refresh: PR #16

Candidate: **`98c63b9ef3879e5b0e9721aed860bba1efb4bf48`**, observed directly from
[`refs/pull/16/head`](https://github.com/JoseK0514/NEVORA/pull/16).
`development` was observed at `d4b01453f7fabaa7ac739d049934527b6b366310`.
This is the bounded database rehearsal assigned to cloud Codex: new rehearsal
tests and documentation only. Application code, migrations, shared fixtures,
dependency inputs, and CI configuration are unchanged from the candidate.
The delivery branch carries integration evidence; new product features continue
from `development`.

## Result

**PASS — 56/56 aggregate checks on the exact candidate above.**
Run: **2026-10-21 16:20:02–16:28:45 UTC**, exit **0**.
See [report.json](report.json) and [verification.json](verification.json).

| Coverage | Passed |
| --- | ---: |
| Fresh installation and full restore | 18/18 |
| Pre-upgrade migration-0002 backup, restore and upgrade | 10/10 |
| Existing migration-0002 upgrade and full restore | 17/17 |
| Populated pre-passkey upgrade | 7/7 |
| Interrupted Company Access adoption rollback/retry | 2/2 |
| Fixture diagnostics and disposal verification | 2/2 |
| **Total** | **56/56** |

The real fixture child separately passed **2/2 tests**, tracing **1,189 queries**
with only the intentional SQLSTATE `57014` failure. All four disposable clusters
were removed; the final Docker audit found **zero** rehearsal-labeled containers.
Candidate files and all recorded harness sources remained unchanged.

Additional checks: **17/17** Node safety/parser/privacy checks; focused ESLint and
TypeScript checks both exit **0**. SIGTERM/SIGINT controls exited **143/130**,
recorded expected interrupted `FAIL` receipts, and left zero owned containers.
Their executed source version and the later connection-budget delta are explicit
in `verification.json`; these interruption controls are not acceptance failures.

Preceding startup failures and the failed parent disposal probe remain recorded
in `verification.json`. The final passing run supersedes those attempts; it does
not rewrite their results. The final remote check still observed PR #16 at the
pinned candidate and `development` at the SHA above.

The receipt binds the candidate, harness-source hashes, frozen dependency lock,
PostgreSQL image digest, migration inputs/content, check results, archive/data/schema
hashes, fixture SQL diagnostics, and cleanup. A failed or blocked check makes the
run fail. Earlier results are retained as historical evidence, not transferred.

## What changed

- The rehearsal reads the actual installer with the TypeScript syntax parser.
  It supports both the current inline arrays and the centralized
  `BASE_MIGRATIONS`/`FINAL_MIGRATIONS`/`HELD_MIGRATIONS` manifest. It checks the
  installer's real imports/inputs, adapter order, final adoption order, and complete
  migration inventory. It never evaluates candidate declarations to discover order.
- Dynamic declarations, duplicate files, unsafe paths, unknown migrations,
  declaration drift, and activation of held tenancy files fail before any database
  starts. Duplicate numeric prefixes are never sorted into a guessed sequence.
- SQL diagnostics observe the existing PostgreSQL client transparently. Evidence
  retains SQLSTATE, elapsed time, command class, source fingerprint and matching
  migration filename. It excludes SQL text, bind values, server messages and
  connection strings. Privacy checks cover this boundary.
- Two real Clocker/Company Access fixture attempts exercise creation, PIN
  verification, disposal and safe refusal to reuse a live database. A controlled
  timeout demonstrates the exact `57014` → `ClockerPinError: UNAVAILABLE` masking
  path, records the underlying code, and verifies transaction rollback/usability.
- Shared fixtures retain their existing five-second statement timeout. The owned
  diagnostic suite has a 120-second test budget and runs in a bounded child process;
  its failures are not skipped or converted to passes. Owned-cluster teardown also
  removes any invocation residue after a child failure. SIGINT/SIGTERM explicitly
  stop the detached fixture process group, remove only label-verified containers,
  write an interrupted failure receipt and exit 130/143. SIGKILL cannot run cleanup.
- Container creation has a separate ten-minute command deadline; SQL limits are
  unchanged. A failed/timed-out Docker client during creation makes teardown
  uncertain and forces `cleanup: false`, even if an immediate discovery is empty.
  A late daemon request must be checked using the invocation's private ownership
  label. This prevents a premature clean receipt after a creation timeout.
- Owned-cluster readiness allows two minutes, uses a bounded three-second
  connection/`SELECT 1` probe, and records attempts, elapsed time and the last safe
  error code. A readiness failure retains private PostgreSQL startup output;
  application and shared-fixture statement limits are unchanged. That fallback
  log captures Docker stdout only; PostgreSQL messages emitted on stderr may be
  absent. Readiness succeeds only through the actual connection/query probe.
- Parent-owned database connections use a recorded 15-second connection budget.
  A prior run passed all 54 core checks and both fixture tests, then failed the
  final disposal-verification connection's old three-second deadline. That failure
  remains in [failed-disposal-probe.json](failed-disposal-probe.json); it is not
  reclassified as a passing aggregate run or an application SQL failure.
- Node checks use `.check.mts` and SQL diagnostics use `.integration.ts`, so adding
  these files does not add database tests to default Vitest unit discovery. No
  existing test config or CI job was edited.

## Migration-manifest compatibility

The parser was also checked against the actual D4 tree at
`b82c486bea5d8cc2f9aceca89a0afe9976197846`. Its 38 operational migrations and two
held files parse and validate. The actual PR #16 inline installer has 40 operational
migrations and two held files. See [manifest-compatibility.json](manifest-compatibility.json).

This is parser compatibility on two separate immutable trees, not database
acceptance of a synthetic merge. D4's current manifest predates PR #16's
`0034_account_deletion_requests.sql` and `0035_passkeys.sql`. The integration owner
must classify those files when combining the branches. The new inventory check
deliberately blocks a mixed tree that omits them; no application manifest was
edited in this rehearsal.

## Coverage and diagnosis limits

The original four scenarios remain: actual atomic fresh company installation;
populated migration-0002 upgrade; populated pre-passkey upgrade; and interrupted
Company Access adoption rollback/retry. Logical backups restore into different
owned clusters and compare all public tables, columns, row digests, sequences,
schema definitions, ownership and ACLs. Negative controls change a record and
remove a CHECK constraint to prove detection.

Functional probes verify Owner/finite Manager Company Access, independent payroll
review/approval permissions, approved native ledger and exact PDF bytes, password
checks/session creation, inactive/expired-session refusal, signed passkey
authentication/replay refusal, and append-only audit controls after restore.

The historical review's migration setup failure exposed SQLSTATE `57014`.
Its separate PIN setup failure exposed only `UNAVAILABLE`, so its exact underlying
cause cannot be reconstructed from that old log. The controlled timeout verifies
one masking mechanism; new traces preserve the cause if an unexpected failure
recurs. A successful current-candidate fixture run does not close unrelated CI
findings on the separate backend-fix branch.

## Reproduce

Use an isolated detached checkout of the full candidate SHA. Obtain the new
`scripts/rehearsal/` directory from the delivery branch; do not merge application
branches just to run this integration check. Example:

```bash
git checkout --detach 98c63b9ef3879e5b0e9721aed860bba1efb4bf48
git archive origin/codex/pr16-database-rehearsal-v2-20261021 scripts/rehearsal | tar -x
npm ci --cache /workspace/.cache/npm --no-audit --no-fund
env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH \
  docker --host=unix:///var/run/docker.sock pull \
  postgres@sha256:0ea6700a3b4f0ae6ce746519073558aed4d88a79d8d07622a9a644946c7319c4
node --import tsx --test scripts/rehearsal/*.check.mts
node_modules/.bin/eslint scripts/rehearsal
node_modules/.bin/tsc --noEmit --pretty false -p scripts/rehearsal/tsconfig.json
node --conditions=react-server --import ./scripts/node-server-context.mjs --import tsx \
  scripts/rehearsal/database-rehearsal.mts \
  --candidate 98c63b9ef3879e5b0e9721aed860bba1efb4bf48 \
  --output /workspace/.rehearsal/pr16-98c63b9e-new-invocation
```

Requirements: Node 24.19.0, frozen candidate development dependencies, and a healthy
managed local Docker socket. The current run reuses an already installed frozen
dependency tree: `package.json`, `package-lock.json` and the local lint package are
byte-identical to the previously installed candidate. There is no dependency change.

Before the run, unset `DATABASE_URL`, `FUEL_TEST_DATABASE_URL`,
`NEVORA_SETUP_DATABASE_URL`, `NEVORA_APP_DATABASE_URL`, `NEVORA_WORKER_DATABASE_URL`,
and any inherited `PGHOST`, `PGHOSTADDR`, `PGPORT`, `PGUSER`, `PGPASSWORD`,
`PGDATABASE`, `PGSERVICE`, `PGSERVICEFILE` or `PGPASSFILE`. The guards name any
offending selector without printing its value. The harness accepts no database URL.
The SQL child receives only its invocation's generated loopback database target;
inherited database principals, SMTP and push credentials are removed.

Use a new output directory for every invocation. The harness refuses existing
evidence directories, modified/staged tracked files, or a mismatched candidate.
It also checks that candidate and harness sources remain unchanged at completion.

To repeat cancellation checks, start the same command with a separate new output
directory. Read that directory's private `lifecycle.json` until `sourceReady` is
`true`, then send `kill -TERM <runnerPid>` (repeat separately with `kill -INT`).
Expect process exit 143/130, report status `FAIL`, the matching `interruptedBy`,
`sourceUnchanged: true`, and `cleanup: true`. Check that local Docker lists no
containers with `label=nevora.database-rehearsal=<ownershipLabel>` from that
lifecycle file. These are expected-failure cancellation controls, not database
acceptance runs. To exercise cancellation during fixture execution, wait for
`fixtureProcessGroup` in the lifecycle file and verify that group also terminates.

The recorded signal controls interrupted a running owned source container during
startup, before SQL acceptance. They bind the harness hashes used at execution;
the later connection-budget-only change is identified in [verification.json](verification.json).
Active fixture-child cancellation was reviewed in source, not injected in those
startup controls.

PostgreSQL uses the pinned official image
`postgres@sha256:0ea6700a3b4f0ae6ce746519073558aed4d88a79d8d07622a9a644946c7319c4`,
tmpfs data, default durability, random ownership labels/markers, and loopback-only
ports. Docker commands pin `/var/run/docker.sock` and preserve registry/proxy/CA
configuration. No external database is used. Backups and full diagnostic logs stay
private under the selected evidence directory; only sanitized receipts are committed.

## Release boundary

The earlier [54/54 database results](https://github.com/JoseK0514/NEVORA/blob/a38e088f85d8babe33dec19de24170d6231d810e/docs/rehearsals/pr16-database-restore/README.md)
apply to `4b9e9cce`; the earlier [42/42 browser results](https://github.com/JoseK0514/NEVORA/blob/f3a1a7c4b8d10ca76094f7c819f1fa59615998c2/release/phase-e-browser-refresh-20261019/README.md)
apply to `6c56f504`. This refresh supplies new database evidence only.
UI integration, CI repairs, security fixes and independent release acceptance keep
their existing owners. Hosted Neon/PITR, cross-major/physical recovery, hosted or
device browser acceptance, and production migration are outside this rehearsal.

Engineering/security: preserve actual migration and authorization behavior, with
owned disposable data and no weakened shared SQL limits. Program/governance:
bind results to the exact candidate; a subsequent candidate needs affected checks
rerun. Technical assurance: separate-tree parser compatibility cannot certify a
combined application tree. Release impact remains **CONDITION** on the separate
release gates; a production recommendation remains **NO-GO** while mandatory CI,
integrated security and hosted/browser evidence are still open. This report does
not independently close those findings or supply production authorization.

Cloud Codex owns this rehearsal delivery. The integration owner must classify
0034/0035 when combining D4, then the existing CI/UI/security owners provide the
affected checks on that resulting SHA. No exception or new Jose decision is
needed for the bounded tests/documentation change.
