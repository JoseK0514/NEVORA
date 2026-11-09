# D2-CODEX-004 bounded remediation handoff

Implementation owner: NEVORA Independent Remediation Engineer for D2-CODEX-004.
Controlling base: `9caafedf1b37d794f359ca47309bffa31ecddd21`.
Isolated branch: `codex/d2-missing-time-004-20261007`.
Repository: `JoseK0514/Fuel-Scheduler-`.

Finding remains **OPEN — closure belongs to the original Independent Codex Reviewer**.
This handoff does not authorize deployment, hosted migration activation, release acceptance,
or any other D2 finding. Logic/UI fixer commits have not been consumed.

## Implementation and controls

The missing-entry command accepts paired `targetAdjustmentId` and
`expectedBaseRevision` fields. Their immutable approved request/event identities,
workspace, employee and location are checked against the current adjustment leaf.
Operation IDs and the canonical command hash preserve the established receipt protocol.
The target and its approved revision are captured in the new immutable request snapshot.
Approval independently repeats the current-leaf and latest-approved-event checks inside
the existing employee/clock-state serialized transaction. Stale or invalidated targets
fail as `stale_source`. Overlap excludes only that validated target. All other effective
intervals retain strict overlap rejection and exact adjacency remains valid.

The existing adjustment insert records `supersedes_adjustment_id`. The existing unique
successor index and leaf views maintain one effective member of each chain. No raw punch,
device, command ledger or schedule-history writer was changed. Original adjustments,
requests and events retain their append-only triggers. The 12-argument untargeted submit
function and recorded-entry/break review branches are unchanged.

The employee history exposes only currently approved missing leaves as selectable targets.
Its small correction action reuses the existing missing-time form and captures the exact
base identity. The manager sees the prior interval labeled “Approved missing time”.
No correction UX redesign, new dependency, payroll policy or D3 semantics is included.
HTTP, origin, body, session, role/activity, workspace and self-review guards are preserved.

## Schema and migration implications

`0017_missing_time_supersession.sql` is an ordinary numbered, transactional,
function-only migration: a 14-argument submit overload and a replacement review function.
It uses existing tables, columns, constraints, indexes, triggers and views. It does not
alter table definitions or rewrite existing rows. `0016` is unchanged. The local migration
sequence and upgrade-parity fixture include `0017`. A regression installs `0017` over
an existing approved A and verifies preserved rows and constraint definitions before B.
No hosted activation was performed or authorized.

A future rollback must preserve all history: restore the prior review function and remove
the new submit overload with application rollback, without deleting chain rows. Activation
and rollback in a hosted environment require separate authorization and release review.

## Applicable director positions

- Product: implement only the approved missing-time supersession design and its minimal action.
- Engineering: reuse the existing immutable chain and locking architecture; no schema redesign.
- Security: retain server authority and independent Manager/Owner review; fail closed on stale identity.
- Technical assurance: verify serialized competition, exact receipts, invalidation and untouched raw evidence.
- Program: implementation evidence is distinct from independent finding closure and release acceptance.
- Governance: independent re-verification is the next gate; no policy exception or production authority is inferred.

## Verification custody

The exact frozen SHA/tree, commands, exit codes, test totals, browser screenshots,
database ownership/teardown records and PR #9 read-only snapshots are in the external
receipt and evidence directory:
`/Users/josek0514/Documents/NEVORA-Remediation/D2-004-20261007/`.
Keeping the post-freeze receipt outside Git avoids changing the candidate it identifies.

New regressions cover chains, immutable history, real Clocker receipts and schedule snapshots,
upgrade preservation, replay/reused IDs, uncertain committed responses, stale/invalidated
targets, concurrent submissions and approvals, unrelated raw/adjusted/missing/live overlap,
adjacency, untargeted overlap, foreign workspace identity, invalid sessions, inactive roles,
unauthorized review and self-review. Chromium/WebKit scenarios exercise the real authenticated
HTTP/UI path across the existing seven viewport widths.

The repository enforces a singleton workspace. Foreign-workspace regressions therefore
exercise SQL and application identity mismatches without weakening that constraint.
The existing history display limits (five visible requests, fifty retrieved) remain.
Local PostgreSQL and browser transport evidence is not hosted or physical-device evidence.
Known independent findings outside 004 remain outside this fixer’s authority, including
D2-CODEX-002; a targeted test verifies supersession rejects a base invalidated through that
baseline defect. Any nonpassing complete gate must be disclosed in the external receipt.

Next owner/gate: original Independent Codex Reviewer re-verifies this exact candidate.
No Jose decision is required to submit the bounded local implementation for that review.
