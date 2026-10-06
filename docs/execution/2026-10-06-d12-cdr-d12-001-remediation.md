# D1.2 CDR-D12-001 implementation remediation

October 6, 2026 — implementation verification complete; independent closure pending.

Branch: `fix/d1-2-cdr-d12-001-20261006`.
Direct parent and preserved rejected candidate: `dc482e122a329840607c43f2e22ed7e5ffb06ecc`.
Worktree: `/Users/josek0514/.codex/worktrees/nevora-d12-cdr-d12-001/Fuel-Scheduler-`.
The immutable candidate SHA and custody manifest are recorded after this commit in
`/Users/josek0514/Documents/NEVORA-Audits/D12-CDR-D12-001-remediation-20261006/freeze.json`.

## Problem and resulting behavior

The rejected reader computed `validForMs` from its pre-read database timestamp.
A real two-second PostgreSQL delay left it advertising 3,993 ms when only 1,969 ms
remained on the fictional authenticated session. The new regression failed on
that unchanged runtime before the fix.

Only `src/lib/data/attendance-review.server.ts`, its existing owned PostgreSQL
integration test, and this handoff document changed. The source SELECT, protected
transaction, management guards, D1.1 engine, schema, UI, compensation, dependencies,
CI and API shape are unchanged.

After the protected source batch, trailing management revalidation and projection,
the reader obtains one final PostgreSQL observation of `clock_timestamp()`, the
current session expiry, and active Owner/Manager authority for the same actor and
token. This is a separate SELECT immediately before return. It repeats authority
validation because the protected transaction's SHARE locks have been released.

The fixed deadline is the earliest of source observation + 45 seconds, captured
session expiry, and current session expiry. Remaining time comes from that fixed
deadline minus the final database observation, floored to milliseconds. The reader
also subtracts the entire final query's elapsed duration, rounded up, measured by
the process monotonic timer. This conservative deduction covers query/return
latency; local wall-clock time never establishes authority or extends a deadline.
The result is capped at 45,000 ms. Missing authority, expired/revoked/missing
sessions, changed actor or management eligibility, invalid timestamps/clock
ordering, and exhausted source/session/return budgets fail closed with bounded
`access_denied`.

The empty-source test now checks positive validity bounded by the 45-second cap;
exactly 45,000 ms would incorrectly require renewal of the source lease after read
and final-observation latency. All its projection assertions are retained.

## Verification obtained

All SQL verification used fresh owned loopback PostgreSQL 17.10, checked-in
migrations, fictional fixtures and destructive-teardown ownership checks. No
application database or production credentials were selected. Push delivery was
disabled and the notification gate used its existing no-network sender.

| Final gate | Result | Retained log in the evidence directory |
| --- | --- | --- |
| Focused D1.1/D1.2 unit, facade and route tests | 106/106 PASS | `focused-unit.log` |
| Focused D1.2 owned PostgreSQL | 29/29 PASS | `focused-pg-final.log` |
| Full unit suite | 1,890/1,890 PASS, 176 files | `unit.log` |
| Typecheck, including after exact Next.js file restoration | PASS | `typecheck-restored.log` |
| Lint | PASS | `lint-final.log` |
| Production build, default script/Turbopack | PASS | `build-final.log` |
| Production-only dependency audit | PASS, zero reported vulnerabilities | `audit.log` |
| Owned Clocker PostgreSQL | 394/394 PASS, 23 files | `clocker.log` |
| Owned release PostgreSQL | 737/737 PASS: 275 foundation, 46 authority, 176 generation, 163 exchanges, 77 notifications | `release.log` |

The focused PostgreSQL tests are also included in the Clocker total; these counts
must not be added together as distinct tests. Both broad owned runners stopped
their clusters successfully and removed their invocation-owned directories.

The exact delay regression returned 1,972 ms with 1,979 ms remaining in the focused
gate, and 1,972 ms with 1,978 ms remaining in the Clocker gate. An independent fresh
PostgreSQL timestamp is queried immediately after return on the existing harness
connection. Every reader statement and parameter executes unchanged; harness-only
`pg_sleep(2)` occurs after the actual source SELECT and before trailing guards.
No SQL result is fabricated. This reproduces the reported delay placement; it is
distinct from the retained actual source-table-lock expiry tests.

Additional regressions cover subtracting two seconds from the original 45-second
freshness deadline; a real 45.05-second wait while the session remains active;
post-batch expiry, revocation, deactivation, role loss and actor replacement;
shortened current expiry; preventing session extension from extending the captured
deadline; and a two-second delayed final-observation response that exhausts a
1.5-second session. The 60-second timeout applies only to the real 45-second
freshness test; existing assertions and suite timeouts are retained.

Initial test-only typecheck errors (ES2017 BigInt literal syntax and missing helper
parameter types) were corrected. The first build rejected an external dependency
symlink; the same installed dependencies were cloned into this worktree, without
installing or changing packages/configuration, and the default build then passed.
These initial logs are retained, not omitted. `next-env.d.ts` and `tsconfig.json`
were restored byte-for-byte to the rejected parent after the successful build;
restoration hashes and the generated diff are retained separately.

## Accountability, controls and next gate

Implementation owner: this remediation chat acting as the implementation team.
Engineering position: the bounded clock/authority fix follows the existing reader
architecture. Security position: fail closed; no authority or privacy control is
waived. Program position: implementation and local verification complete;
independent acceptance pending. Governance position: conditionally compliant for
handoff, with independent review and existing release gates still required.

CDR-D12-001 is remediated in this implementation candidate and reproduced local
tests pass. It is **not independently closed** by its implementer. A separate Codex
reviewer who did not implement this candidate must review the new frozen SHA and
reproduce the affected evidence before any integration decision. A ready prompt is
in `independent-re-review-prompt.md` in the external evidence directory.

FR-AUTH-001, database-level publication immutability/custody, hosted/Vercel/Neon
parity, rollback/recovery, unresolved independent UI findings, physical-device and
accessibility acceptance, branch enforcement and other unproven production gates
remain OPEN. No hosted or production verification is claimed. Production remains
NO-GO. No push, merge, deployment, production mutation, risk acceptance or exception
is authorized or performed here. The rejected candidate and existing refs remain
unchanged; only the new remediation branch advances.

Evidence directory:
`/Users/josek0514/Documents/NEVORA-Audits/D12-CDR-D12-001-remediation-20261006`.
The controlling independent report remains unchanged at
`/Users/josek0514/Documents/NEVORA-Audits/D12-independent-codex-dc482e-20261006/independent-review.md`.
