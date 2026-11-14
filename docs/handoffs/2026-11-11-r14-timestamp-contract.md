# R14 timestamp tokens and transaction contract

Scope: selected `single_company` application/executor and isolated APP/WORKER
business transports. The same owning Neon HTTP transaction now sets LOCAL UTC,
ISO/YMD and explicit READ COMMITTED before every body statement. An exit guard
refuses changed final settings atomically, preserving original body result indexes
and abort behavior. PostgreSQL timestamp text retains microseconds; no JavaScript
Date conversion or historical token rewrite is used. The separate tenancy/native
protocol is outside this change.

`sql-session-contract.ts` owns the contract; pooled defaults remain unchanged.
The exit guard does not detect trusted SQL temporarily changing settings and
restoring them. Body SQL is fixed application source and must preserve settings.
Dynamic SQL/session changes are not an admitted extension point.

Account-deletion login fencing now advances `employees.updated_at` using
`GREATEST(clock_timestamp(), updated_at + interval '1 microsecond')`, including
the existing authority-loss trigger through additive migration0060. An old token
ahead of wall time cannot move backwards or survive an identical clock value.
The old migration and historical rows are unchanged. Apply the canonical bootstrap
migration order; source and0060 are one release, with no hosted migration claimed.

## Actual local evidence

External evidence: `/Users/josek0514/.codex/release-completion-20261111/`.

- `r14-related-unit-second.log`:640 passed,37 intentionally SQL-gated skips.
  Eight domain unit seams were adapted to the new batch boundary; their business
  assertions remain. Transaction/notification boundary tests use the real contract.
- `r14-sdk-final.log`:32 actual installed-SDK/owned-PostgreSQL checks. Four
  transports across four hostile TimeZone/DateStyle defaults and SERIALIZABLE
  pool defaults produce exact UTC microsecond text and READ COMMITTED; LOCAL
  settings do not leak. Exit-contract failure rolls writes back. Held-row races
  permit one version writer. Lost committed acknowledgements recover one receipt
  across different pool defaults. Actual single/isolated logout independently
  deletes sessions when push cleanup fails.
- `r14-invitation-final.log`:2 actual SQL compatibility checks. Canonical UTC/ISO
  invitations remain usable. Older noncanonical stored target versions fail
  closed; explicit current Owner reissue grants a new usable proof and the old
  proof remains unusable. Stored legacy versions are not converted.
- `r14-deletion-green.log`:17 actual SQL checks, including accepted deletion
  against a future prior token, with and without the passkey trigger; prepared
  stale sign-in is refused. Earlier meaningful RED receipts are retained.
- `r14-bootstrap-final.log`:21 actual fresh bootstrap checks with0060.
- `r14-financial-compat-sql.log`:3 actual PostgreSQL compatibility checks using
  legitimate legacy America/Puerto_Rico ISO/MDY timestamp text and current UTC
  ISO/YMD text. An old-format pending approval becomes NEEDS_REVIEW; its stale
  finalize request is refused and explicit fresh review appends a revision.
  Recorded instants, nanoseconds and old revision rows remain unchanged. A
  finalized card keeps its frozen source/hash and can be explicitly reopened
  through existing frozen authority. An already-approved legacy payroll retains
  its source and amounts while the current worker renders and publishes its
  private PDF. No payment or external delivery occurs. These cases are allocated
  to `vitest.payroll-source-pagination-integration.config.mts` for combined/CI runs.
- Full TypeScript, scoped ESLint, manifest and diff checks passed. This packet
  still requires frozen-candidate independent review and combined release gates.

## Rollout and recovery

Before hosted activation, identify the environment and confirm current migrations,
backup/restore custody and role configuration. No hosted action is performed here.
In a read-only transaction with LOCAL UTC and ISO/YMD, count active, unconsumed,
unexpired invitation rows whose stored target version differs from the current
employee timestamp text. Such counts identify unusable proofs; they do not prove
formatting was the cause (a real employee revision also invalidates a proof).
Never print invitation tokens, emails, personal rows or database credentials.

If a legitimate user has a refused older invitation, a currently authorized Owner
must verify the intended employee and registered email, then explicitly reissue
using the existing invitation workflow. Existing expiry, issuer generation,
single-use and authority checks remain. No automatic token conversion, bypass,
delivery or customer-data mutation is authorized by this document.

Timecards still awaiting finalization can require fresh review when canonical
timestamp text changes their live source hash. The authorized reviewer must review
the current source and approve it explicitly; do not rewrite historical hashes or
reuse an old approval to finalize. Finalized cards and approved payroll retain
their frozen source, amounts and revision history. The compatibility evidence
covers the tested legacy ISO/MDY format; it is not a blanket certification of
arbitrary historic formats or a hosted-data migration.

Rollback requires the matching source/schema contract and current environment
backup. Do not merely restore locale-dependent readers against newly issued
proofs. Pause issuance and worker processing while evaluating rollback; preserve
audit rows and reissue only through current authority. Migration0060 replaces a
trigger implementation without data loss; any reversal must retain monotonic
login fencing rather than restore the demonstrated stale-login defect.

Risk: older noncanonical stored proof -> refusal after activation -> user needs
Owner reissue. Severity MEDIUM, likelihood environment-dependent. Fail-closed
comparison and explicit verified reissue mitigate access risk; residual onboarding
friction remains. Decision owner: Jose for hosted activation, current Owner for
individual reissue. This is a compatibility limit, not a request to waive a gate.

CTO/CISO: deterministic version text, real driver/session isolation and monotonic
authority fence. Governance: MITIGATE compatibility through explicit reissue;
no hosted/general-scale/native/production certification or independent self-close.
