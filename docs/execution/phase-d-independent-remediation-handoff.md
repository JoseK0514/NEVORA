# Phase D independent audit remediation handoff

Focused implementation owner: current Codex remediation task. Independent acceptance belongs to the same whole-phase auditor and remains PENDING/NO-GO. PR #10 remains draft/unmerged into development. Original audit candidate: `184a393a4e89676b9d7f0a40e5f3fe6db87993de`, tree `be5f40e09d89840f1d7336ce7e8918318c3b0f04`.

The exact corrected commit, tree, complete source manifest, failure/repair executions, CI run URLs and final counts are retained outside the candidate in `/Users/josek0514/Documents/NEVORA-Remediation/Phase-D-20261007/NEVORA_PHASE_D_REMEDIATION_REPORT.md`. Keeping final results external avoids claiming evidence on a commit that changes when its SHA is inserted into its own report. The repository plan is `phase-d-independent-remediation-plan.md`.

## Changes and controls

D2-CODEX-005/008: a public, domain-separated digest binds correction intent to the employee and actual originating session; it never replaces the HttpOnly cookie or SQL authorization. Every correction POST must match it. Server-rendered correction owners mount with that session binding. Bound reads refuse account/session replacement, clear private retries, and obsolete manager replies cannot restore old commands. Exact-operation retry within the same session retains idempotency.

D2-CODEX-006: protected readers traverse only the relevant employee/workspace missing-time chain and use its current canonical effective leaf. Current, captured, proposed and prior-decision context remain distinct; no rebase or raw history update occurs. The stale-source mutation guard remains unchanged.

D-AUD-001: additive migration `0022_timecard_reopen_revision_authority.sql` replaces only the timecard command function. REOPEN compares the expected revision and the frozen finalized source hash. APPROVE/FINALIZE continue requiring the live source and existing interlocks. The reopened revision captures the current source; prior snapshots remain immutable. Employee locking retains one-winner/duplicate handling. Captured position labels already come from immutable schedule context; current position catalog labels are not part of the live lookup.

Migration upgrade: apply 0022 after 0021; no table/record rewrite, new columns, backfill, deletion or destructive down migration. Ordered current-runtime and frozen D2 upgrades include 0022. Tests apply the prior function to owned SQL, finalize and rename, verify failure, upgrade, compare all prior receipts, and reopen. Concurrency/authorization/raw-write guards are retested. Rollback is a function-only restoration from 0018 (CREATE OR REPLACE) plus matching application candidate; it preserves all revisions/receipts but reinstates the old metadata/reopen limitation. Do not delete reopened revisions or correction history. Production schema/backup/rollback execution remains unverified and unauthorized.

D-AUD-002: all four report tables have labeled native focusable scrolling regions and a visible approved-blue focus outline. Long unbroken report-list names wrap within the existing layout. Native Tab/Shift+Tab/arrows, long labels, all seven widths, both engines, supplementary axe, print and existing private states are tested. Mac WebKit native Tab skips links under its default preference; exit targets are verified according to actual native behavior, without injecting scrolling or changing application keyboard semantics.

D-AUD-003: Next and matching lint configuration advance from exact 16.3.6 to exact 16.3.8, the compatible patched line identified by current registry advisory ranges. Locked installation, production audit, build and actual runtime suites are required on the final commit. The development-only braces advisory remains separately recorded; no audit suppression, removed gate or force update is authorized.

## Governance and next gate

The unsupported blanket D2 independent-closure claim is reconciled in phase-d-gates.json by linking the original independent report. No independent finding is self-closed. D-AUD-004 report blur and D8-DEV-TOOLING remain tracked P3 follow-ups outside the five-blocker directive.

Product/Experience require honest existing workflows and keyboard reachability. CTO/Technical Assurance require minimal identity/source corrections and preserved immutable history. CISO requires current session/role/workspace checks. Program/Governance require exact candidate custody and independent closure. No director recommendation substitutes for Jose's approval.

FR-AUTH-001 OPEN; UX-02 OPEN/DEFERRED; production NO-GO. No Phase E, merge, production deployment/customer data mutation, real notification or provider import. Local SQL uses invocation-owned loopback databases and fictional data; browser mirrors substitute only the DB transport. Hosted Neon/Preview, physical device, production recovery/support and screen-reader gates remain separate. The next gate is the same independent reviewer re-evaluating all five findings and dependent 008 against the frozen combined candidate and evidence.
