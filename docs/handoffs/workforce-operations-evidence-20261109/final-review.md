# Workforce operations code review

Reviewed detached 720b5adea536c8b192020913b6f480b1d5c5306e..0545c0ecf24cc9cca66fce6b8f5425a509bdbf48. The supplied review package, phase plan/specification, phase progress rulings, source, disabled units and handoff were examined. The review used the fallback evidence directory because ulw-loop returned ULW_LOOP_PLAN_MISSING.

**BLOCK · REQUEST_CHANGES.** Fix findings 1–5 before development integration.

## CRITICAL

None assigned. No hosted reader or schedule was enabled by this change.

## HIGH — Important, merge blockers

1. **Reader URL validation and the driver disagree about destination, principal and TLS.** src/lib/workspace-routing/config.server.ts:22 validates the authority and the first sslmode. The unchanged runtime store passes the whole URL to pg. I passed a synthetic production Neon URL with query parameters sslmode=verify-full&host=localhost&user=wrong_role&sslmode=disable through readWorkerRoutingConfig. Without opening a socket, the installed pg.Client reported host localhost, user wrong_role and ssl false. Misconfigured or substituted connection options can redirect a real credential or disable TLS. Use a closed set of URL options, reject duplicates and routing overrides, and verify the resulting driver configuration in a regression test.
2. **A reader with column grants can read other companies’ ciphertext.** src/lib/operations/routing-reader.ts:19 checks table privileges only. In a disposable socket-only PostgreSQL instance, I gave an otherwise restricted NOINHERIT login SELECT(ciphertext) on the base workspace_secrets table. configureWorkerControlReader succeeded and granted schema usage. A new connection authenticated as this role read the synthetic other-scope APP ciphertext directly from the base relation. The normal host also holds a routing decryption key. Check effective column privileges, including write privileges on allowed views, before granting schema usage. Exercise the actual restricted login and the unsafe existing grant in the owned suite.
3. **Notification dispatch and health can operate on different environments.** src/lib/operations/supervisor.ts:107 passes the worker expected environment but inherits PUSH_ENVIRONMENT verbatim. The workspace binding checks the registry environment. Notification runtime reads PUSH_ENVIRONMENT independently (src/lib/notifications/config.ts:20), while health selects config.environment (scripts/workforce-operations.mts:23). A valid test workspace with PUSH_ENVIRONMENT=production can run production-mode selection without the test account allowlist while its monitor observes test rows. The reverse mismatch can strand production work. Reject absent/unequal push environments for both notification commands and their health entry points before any effect. Payroll has no push environment dependency.
4. **Host power loss can expose the previous success.** src/lib/operations/supervisor.ts:51 syncs the temporary file before rename, and line 61 syncs the lock file. Neither operation syncs the containing directory before the child starts on line 69. POSIX file sync alone does not guarantee the new directory entries survive host failure. A filesystem can recover the previous successful receipt and lose both the new lock entry and the running-receipt replacement after the child affected a queue. Until maxGap expires, readInvocationHealth may then return healthy. Establish directory durability for the acquisition and running receipt before spawn, and for terminal receipt publication before releasing the lock. The actual SIGKILL test preserves the OS cache and cannot exercise power loss.

## MEDIUM — Important

5. **A malformed RUNNING payroll job disappears from health.** src/lib/operations/queue-health.ts:7 and :14 use lease_until<=now. The schema permits a RUNNING job with a null lease_until (db/migrations/0028_configurable_payroll.sql:15). With only that row present, SQL produces zero due, zero expired and zero failures. The worker claim and exhausted-lease cleanup also skip it, so the job remains stranded while the queue reports healthy. Count or explicitly reject invalid live lease state, and test a persisted malformed row. This is a blocker under the phase’s fail-closed health criterion.
6. **The run path can hang before its watchdog starts.** src/lib/operations/supervisor.ts:36 opens the path read-only before testing whether it is a regular file. A private FIFO at payroll.json with no writer blocks open. The supervisor has already created its lock and the child deadline has yet to start. The systemd outer timeout eventually kills it and leaves a stale lock. Opening nonblocking before fstat permits immediate safe rejection of this file type.
7. **The generic executor test double discards its interface.** src/lib/operations/queue-health.test.ts:5 uses a double unknown cast, bypassing the compiler for every malformed-result test. The malformed row injection is warranted. A narrow result-decoding seam or typed query double would preserve that coverage and catch interface drift. This is a maintainability finding.

## LOW — Minor

- The setup view at src/lib/operations/routing-reader.ts:23 projects w.*. Re-running setup after a registry-column addition can publish additional metadata to every existing reader. An explicit column list would keep the view contract stable.

## Evidence and review focus

- Inspected actual subprocess overlap, termination, descendant and SIGKILL tests, owner-only permissions, symlink rejection and suppressed child stdout/stderr. Unconfirmed group termination holds the lock. The host-crash durability gap remains.
- Checked canonical role resolution, scope checks before work, SQL-only observation, typed count/shape rejection, due intents, retries, expired leases and threshold bounds. Findings 1–3 and 5 qualify those results.
- Normal application sources between the tested 441efbf3 and review head are identical. All 48 evidence index hashes matched. Prior logs show root 11,511 passed and 857 skipped out of 12,423 total (55 remaining), owned onboarding 139, commerce 88 and advisor 149. No broad suite was rerun. The source identity is operator-declared and the handoff distinguishes prior hosted verification and local qualification.
- Consulted remove-ai-slops and programming plus the TypeScript reference. No deletion-only, prompt-matching or tautological test was identified. File and database result validation occurs at real boundaries. The generic test double violates the programming perspective. The long compound guard at src/lib/operations/supervisor.ts:45 also makes receipt invariants difficult to review.
- Considered the recorded rulings on one active host per scope, explicit stale-lock recovery, domain-specific monitoring, per-company reader setup, operator-selected thresholds and target-host verification. They do not resolve the five blockers.

## Declined to judge

- Claude UI and native applications are excluded by the user.
- Core integration below 720b5ade already received its one review.
- Target Linux unit execution, multi-host supervision, hosted reader grants, alarms and delivery outcomes require approved runtime custody and target evidence.
- Production activation, public pricing/legal policy, release recovery and independent QA certification belong to their designated owners.
