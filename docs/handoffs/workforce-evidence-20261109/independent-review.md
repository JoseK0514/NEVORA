# Independent managed workforce review

**Candidate** 4217a91dd578cba6817f0201d5dab5ae1ce7a6ca on detached HEAD. **Base** 8ddf3e46d7dc0584a7276a7de00e72f9b646a765. The candidate contains 27 changed files, 889 insertions and 75 deletions. I checked the prepared package inventory against the actual Git range and reviewed the implementation, tests, operator guidance, plan and acceptance changes. The checkout was clean. All probes used fictional configuration, a local SMTP stand-in or an invocation-owned PostgreSQL cluster. No hosted credential or destination was contacted.

### Strengths

- VERIFIED. The compiled host ran on loopback, returned 200 for readiness, 401 for private health and 404 for public execution, exited cleanly after SIGTERM and refused an incorrect source label. Its bytes matched the local clean-source receipt. See `host.jsonl` and `scope.json`.
- VERIFIED. The independent archive replay extracted the actual monitor ZIP, checked both contents and source identity, rejected invalid trigger/source combinations and returned a disabled result for the local fixed schedule. Inventory tests passed 5/5. See `archive.log` and `inventory.log`.
- The new host delegates to the canonical one-shot supervisor and preserves its scope, company incarnation, role, commerce, lease and operation checks. It constructs a fixed command vector and isolates child environments. Forced RLS, pre-send journal commits, notice uniqueness and the caps are useful safeguards when the monitor has a dedicated PostgreSQL session. I found no change to payroll financial-access rules in this range.
- The Blueprint contains one initially disabled instance and a 1 GB disk. The runbook distinguishes the published fixed-cost baseline from the actual quote and specifies how to preserve uncertain locks during provider shutdown. The six recorded owned-acceptance steps each reported exit zero at the candidate. That suite did not cover the failures below. See `scope.json`.

### Issues

#### Critical

No unauthenticated public execution, demonstrated live cross-company disclosure, or production data change was found. No Critical finding.

#### Important

1. **An ambiguous SMTP result sends the same notice twice.** `src/lib/operations/monitor.ts:49`, `src/lib/operations/monitor-store.ts:49`. ISSUE. The local SMTP sink read the terminating DATA dot and closed before returning the final acknowledgement. The pinned Nodemailer raised `ECONNECTION` with command `CONN`. The journal recorded `definite_failure` and, when the 15-minute retry became eligible, delivered a second copy of the full body to the sink. The database-loss test covers a different failure. Treat generic connection closure as unknown unless the transport can prove non-acceptance. Include a real SMTP sink and journal regression that expects one captured body, an unknown attempt, and no automatic retry. See `principal.jsonl` line 3 and `probe.jsonl` line 3.

2. **Both configuration gates accept a pooled Neon DSN for a session lock.** `src/lib/operations/monitor.ts:14`, `services/hosted/neon/capabilities.ts:50`, `src/lib/operations/monitor-store.ts:34`. ISSUE. The SHA-specific runtime and deployment validators both accepted a fictional `ep-…-pooler` journal endpoint. The monitor obtains a session advisory lock before BEGIN, commits before SMTP and unlocks in another statement. A transaction pool can change or reuse the physical backend after any of these boundaries. Serialization and release no longer follow the observer, and alerts can be skipped or journaled incorrectly. Require a direct journal hostname in both validators, document it, and add paired direct/pooled configuration tests. A local direct PostgreSQL run cannot demonstrate safety through a live pooler. See `probe.jsonl` line 1 and [Neon's transaction-pooling limitations](https://neon.com/docs/connect/connection-pooling#connection-pooling-in-transaction-mode).

3. **Principal setup approves a role with access beyond the journal.** `src/lib/operations/monitor-store.ts:11`, `ops/workforce/MANAGED-RUNBOOK.md:28`. ISSUE. A fresh NOINHERIT role with schema CREATE, effective database TEMP and EXECUTE on an operator-owned SECURITY DEFINER function passed `configureMonitorPrincipal`. On its actual login, direct table SELECT failed as expected, but the function returned the restricted fictional row and the role created both a persistent and a temporary table. Check effective database CREATE/TEMP, schema CREATE and accessible non-approved SECURITY DEFINER routines, including indirect/PUBLIC grants, before admitting a role. Require the same identity/privilege evidence at activation. If PUBLIC defaults exceed policy, fail closed and document the operator prerequisite without automatically rewriting shared privileges. Regression tests should include forbidden privileges and one explicitly least-privileged passing principal. See `principal.jsonl` line 1.

4. **Overlapping observations can announce a false recovery and consume the daily alert budget.** `services/hosted/neon/workforcemonitor.entry.ts:11`, `src/lib/operations/monitor-store.ts:39`. ISSUE. The HTTP probe runs before acquiring the journal lock and the resulting enum carries no ordering information. I delayed an older healthy response, committed a newer outage, then released the old response. The real database reverted to healthy and sent recovery. A third still-unhealthy sample sent a second outage. Three alerts described one ongoing outage. Acquire observation ownership before the sample or enforce a durable strictly ordered generation for samples, including unavailable/invalid outcomes. Regression should overlap the old/new callbacks and prove one outage and no stale recovery. See `principal.jsonl` line 2.

5. **Managed profiles can redirect credentials to an unrelated endpoint.** `src/lib/operations/managed-host.ts:40`, `src/lib/operations/managed-host.ts:42`, `src/lib/commerce/access.ts:48`. ISSUE. Holding every other field fixed, the parser accepted a different tenant's Neon commerce service. The downstream request sends the derived worker installation bearer and ID to that origin and accepts its operational decision. The control DSN similarly accepts a different provider endpoint or, for managed test profiles, loopback with TLS disabled. This matters with a substituted or mistakenly edited machine profile. HTTP clients cannot set the profile. Bind the machine to a separately reviewed, environment-specific commerce origin and control database destination, require verify-full on the managed host and preserve the separate owned-local fixture path. Add substitution tests before any real credential is installed. The probe establishes admission. The bearer/authority consequence follows the actual downstream code. No credential was sent. See `probe.jsonl` lines 6–9.

6. **A substituted monitor target can manufacture a healthy report.** `src/lib/operations/monitor.ts:14`, `src/lib/operations/monitor.ts:29`, `src/lib/operations/managed-runtime.ts:95`. ISSUE. A different allowed Render hostname with no shared key returned an unsigned fresh JSON object with the candidate SHA and expected count. The observer accepted it as healthy. TLS authenticates the configured hostname and the HMAC authenticates the observer to the server. An operator typo, substituted service or reassigned hostname can therefore hide a worker outage. Bind the health response to the request nonce, time, aggregate bytes and a distinct HMAC purpose, or provide an independently verified equivalent service identity. Require bogus/unsigned, replayed and tampered responses to fail and the actual host response to pass. The alternate responder never held the shared key. See `probe.jsonl` line 4.

#### Minor

- **Intentional disablement is reported as invalid.** `src/lib/operations/managed-host.ts:27`, `src/lib/operations/monitor.ts:30`. Even when the operator retains the correct private key, the disabled host discards it, answers 401 and the monitor classifies it as invalid. The monitor also requires an expected nonzero command count before its disabled branch. Both states still alert and the runbook instructs the operator to pause scheduling before a planned drain. Align the documented contract and tests with this behavior or allow an authenticated disabled status while keeping a secretless initial deployment closed. See `probe.jsonl` line 5.

### Recommendations and evidence custody

The executor owns one focused correction pass. Independent QA should replay the SMTP, reordered-observation, role, pooled-DSN, destination and health-response cases on the exact resulting revision, then run the required candidate checks. The review makes no request to change old timecard code or deploy anything.

All listed artifacts are in this directory. Commands run from the candidate checkout. In the commands below, `$review_dir` denotes this absolute directory.

```sh
TSX_DISABLE_CACHE=1 node --conditions=react-server --import ./scripts/node-server-context.mjs --import tsx "$review_dir/probe.mjs"
TSX_DISABLE_CACHE=1 node --conditions=react-server --import ./scripts/node-server-context.mjs --import tsx "$review_dir/principal.mjs"
node "$review_dir/host.mjs"
node --test scripts/onboarding-inventory.check.mjs
TMPDIR="$review_dir" node scripts/verify-neon-onboarding.mjs --workforce-monitor-only /Users/josek0514/.codex/backend-completion-20261109/managed-acceptance-4217a91d/monitor-bundle
```

The first two probes capture observed behavior and can exit zero while demonstrating a defect. Their JSON fields are the observables. The PostgreSQL probe creates a loopback-only fresh cluster for the invocation, uses fictional secrets and stops/removes it. The simulated retry changes eligibility only in that cluster. The archive and host runs used the existing candidate artifacts. The inventory command checks the actual tracked source.

### Declined to judge

- Previous timecard fixes, 2027 payroll/tax policy and native apps/push belong to separately controlled workstreams.
- Combined Claude UI acceptance, the earlier hosted D2 failure and release-wide hosted CI are outside this backend change. The provided candidate-local D2 report contains 282 checks and zero errors. Comparing current hosted execution with that local replay remains a release gate.
- Hosted Neon trigger authentication, deployed disk failover, actual uptime and workload capacity need real environment acceptance. The closed local archive and HTTP replay establish local behavior only.
- Worker root recovery, actual roles/grants, staffed responder, real support-inbox acceptance and the monetary quote require their respective operators and approvals. I did not retrieve custody or exercise any real external sink.
- Production deployment, payroll business policy and acceptance of material residual risk remain with Jose.

### Assessment

**Ready to merge? No. Independent QA recommendation: NO-GO.** The disabled package and canonical worker boundary have credible local evidence. Duplicate alerts, false recovery, excessive database privileges, misdirected credentials and unverified response identity need correction before integration or activation. The $10 ceiling, missing custody and responder, provider authentication and exact-source hosted qualification remain external gates. No application or cloud change was made by this review.
