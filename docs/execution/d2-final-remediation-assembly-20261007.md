# D2 final remediation assembly — implementation ledger

Implementation role: NEVORA D2 Final Assembly Engineer.
Findings 002–008 remain OPEN; only the original Independent Codex Reviewer may close them.
This document records integration decisions, not independent certification or D2 GO.

## Custody and authorization

- Repository: JoseK0514/Fuel-Scheduler-.
- Controlling base: `9caafedf1b37d794f359ca47309bffa31ecddd21`.
- Branch: `codex/d2-final-remediation-assembly-20261007`.
- Worktree: `/Users/josek0514/.codex/worktrees/d2-final-remediation-assembly/Fuel Scheduler`.
- Logic source: `ac43b51902e1af8ff5d3206cc29725720871a8ea`, tree `fa3559117977fecaa99e8686bb785cb1e34630d8`.
- UI source: `1df93b7100efceea0254b7d2375a1a5912d0e51e`, tree `9340a4c9a549b09b170d6b80d47674e8ddfbb59c`.
- 004 source: `1aac4942cc8ad25643756f470dd490ac557a1d9c`, tree `9529cba96e3fb836f7700975fa27c12edf5e9f52`.
- 004 source commits: `1468897c6e4d93321a74d0e647a62256867c0996`, `d2c2db2be35375e5065df12113089e8e1cc53fe5`, `1aac4942cc8ad25643756f470dd490ac557a1d9c`.
- Jose's 2026-10-07 resume instruction explicitly approves moving 002/003 guards and the original 12-argument submit replacement for 007 into 0017. Baseline 0016 stays byte-for-byte unchanged.
- Source commits were imported with explicit `git cherry-pick --no-commit`; the combined commit records their provenance in commit trailers. No source branch was changed.

The initial stop and the resume authorization are retained with the external
receipt/evidence under
`/Users/josek0514/Documents/NEVORA-Remediation/D2-final-assembly-20261007/`.
Post-freeze receipts remain outside Git so the candidate they identify cannot change.

## Conflict and overlap decisions

Here L means the exact Logic SHA above, U the exact UI SHA, and M the three exact
004 commits above. Every shared merge and semantic overlap is documented below.

| File or area | Sources | Overlap and final behavior |
| --- | --- | --- |
| `db/migrations/0016_time_corrections.sql`, `0017_missing_time_supersession.sql` | L + M + Jose resume approval | L changed historical 0016; M replaced review with baseline guards. Restore baseline 0016 byte-for-byte. Install L's original submit function as CREATE OR REPLACE in 0017 and add L's latest-REQUESTED and effective-child guards to M's review. Preserve M's targeted overload, target revalidation and exact overlap exclusion. No table/index/view/constraint changes or new migration strategy. |
| `employee-time-corrections.tsx` entry form | L + U | Keep L's page-scoped exact command/retry owner and save from send time. Keep U's protected canonical context fetch, authoritative defaults, comparisons and prior decisions. Disable edits/new sends for busy, uncertain retry, or unavailable effective context. Form toggles can clear displayed inputs while the separately saved command remains intact. |
| `employee-time-corrections.tsx` missing form/history | L + U + M | Keep L's retry/authority handling, U's history comparisons, and M's exact missing-leaf target/revision capture. Combine disabled controls for busy/uncertain/locked target. Preserve replacement explanation and selectable current leaves; previous missing adjustment is labeled approved missing time. |
| `manager-time-corrections.tsx` | L + U + M | Automatic L/U merge inspected: saved retry remains outside queue rows, busy/uncertain controls remain bounded, paused state/count clearing and canonical comparison remain. M's prior missing interval label is integrated into the common comparison instead of reverting to the older two-column raw/proposed rendering. |
| `time-correction-context.tsx` | U + M | Add a bounded evidence label prop to the shared comparison so missing adjustment evidence reads Approved missing time, with no device-punch attribution. Keep Recorded / Current effective / Proposed and prior decision history for recorded entry/break requests. |
| `src/lib/data/time-corrections.server.ts` | U + M | Inspect automatic union: retain U's scoped canonical targets/decisions and M's current-leaf ID and prior missing interval. Resolve semantic overlap by reading a pending missing replacement's exact approved base from the canonical effective view. No raw fallback. |
| `src/lib/time-corrections/read-model.ts` and tests | U + M | Keep U's bounded context/target parser and M's currentAdjustmentId. Allow paired prior missing-adjustment interval values from M; reject one-sided values. Recorded entry/break still require recorded intervals and authoritative context; a regression covers the combined missing evidence shape. |
| `manager-time-corrections.test.tsx` | L + U + M | Retain all three sources' assertions: independent paused retry, loading/empty/unavailable distinctions, canonical effective/history context, in-flight disabled controls, and prior missing evidence label. |
| `scripts/phase-d2-corrections-ui-qa.mjs` | L + U + M | Preserve all three imports and invocations plus L's owned completed break fixture. Run missing-time chain on the existing employee history page, then recovery scenarios, then UI context/lifecycle scenarios, for each engine. No source scenario is dropped. |
| `clocker-time-corrections.integration.ts` | L + U | Automatic append merge inspected: keep all terminal, containment/effective-parent, concurrency, read-model/history and original D2 cases. |
| `clocker-missing-time-supersession.integration.ts` | M + L | M's invalidation test assumed the unfixed 002 endpoint could reverse an approval. First assert the final endpoint rejects that reversal, then seed the historical pre-upgrade invalidation directly in this owned fictional fixture. Retain stale-base rejection and zero extra adjustment assertions. No assertion is relaxed. Extend the upgrade test to inspect final installed definitions/signatures and compare raw/full correction history before and after 0017. |
| Correction service/validation, local migration list, upgrade parity fixture, dedicated config | M | No competing code changes; retain M's target/revision contract, 0017 upgrade order and both dedicated D2 integration files. |
| My Time page/panel and correction client tests/service | L | No competing edits; retain account-key reset, memory owner above private-reader unmount, uncertainty classification, exact saved operations and current-authority clearing. |
| `globals.css`, dedicated UI/recovery/missing QA helper files | L/U/M | No competing edits; retain authorized context styling and all source QA helpers. No unrelated redesign or dependency changes. |

An intermediate conflict-resolution helper rejected a case-sensitive import assertion
before the browser script was resolved. All three browser helper imports/invocations
were restored explicitly and the final source was checked for conflict markers.
An added upgrade assertion initially contained escaped template delimiters; the
dedicated suite/typecheck exposed this, the test syntax was corrected, and both
were rerun. These preflight results are retained and are not final acceptance evidence.

## Finding mapping and required evidence

| Finding | Final implementation | Regression evidence to run on frozen candidate |
| --- | --- | --- |
| 002 | 0017 latest event must remain REQUESTED; exact saved receipt checked first | Four terminal combinations, stale revisions, operation replay and single-winner concurrency |
| 003 | 0017 entry approval validates authoritative effective children | Raw/adjusted child containment, every child, open child, equality and parent/break race |
| 004 | Targeted overload and replacement chain retain exact leaf/revision identity and stale approval checks | A→B→C, immutable full history, one leaf, stale/competing supersessions, unrelated overlap/adjacency and response replay |
| 005 | Original saved command/operation retained across private-reader unmount; bounded same-operation recovery | Employee/Manager before/after response loss, malformed/unknown replies, vanished pending row, in-flight pause/re-entry, authority/account loss |
| 006 | Canonical protected effective context, confirmed defaults, scoped bounded prior decisions | Multiple entry/break supersessions, raw/effective/proposed distinctions, unavailable context and history limits |
| 007 | Original submit replaced by 0017 using effective parent; review revalidates under existing locks | Expanded/shrunken parent, changed parent while pending and concurrent review |
| 008 | Manager queue clears protected snapshots and displays paused/unconfirmed until a real ready snapshot | Offline, pagehide/visibility, reconnect, read failure, confirmed empty and populated queue |

## Migration and integrity controls

0017 is transactional and function-only: replaces the existing original submit and
review functions and retains the new targeted overload. Migration order is 0016 → 0017.
The baseline 0016 blob must exactly match the final candidate. No table, column,
index, constraint or view is added or changed by this integration.

The upgrade regression starts before 0016, installs the unchanged historical migration,
creates approved A, then installs 0017. It compares raw rows, all correction rows and
constraint definitions, inspects pg_get_functiondef and the 7/12/14 argument signatures,
checks 002/003/004/007 installed guards, replays the earlier receipt, and uses the
004 overload for B. The complete dedicated suite exercises the installed behavior.

History stays append-only. No raw punch/break/device/classification/schedule/receipt
writer is introduced. Existing locks, session/workspace/role guards and receipt
protocols remain. Hosted activation and rollback require separate authorization;
local tests do not establish hosted readiness.

## Function positions, next gate and limitations

Engineering: bounded integration of the approved sources and SQL placement.
Security: preserve server-side current authority and historical integrity; use only
owned loopback data and fictional identities.
Technical assurance: verify installed definitions and full combined behavior;
individual source receipts are provenance only.
Program: final implementation/verification evidence must identify one exact SHA/tree.
Governance: independent finding closure remains a required next gate; no release
acceptance or production authorization is inferred.

Implementation owner: Final Assembly Engineer. Next reviewer: original Independent
Codex Reviewer. No push, PR change, merge, development/main change, hosted migration,
Neon/Vercel mutation, deployment or D3 work is authorized or performed.

Final required gates: npm test, typecheck, lint, build, production dependency audit,
owned Clocker PostgreSQL, dedicated D2 PostgreSQL, release PostgreSQL, D2 browser,
D1 attendance browser, finding-specific adversarial/security/history checks and
owned database/process teardown. Chromium/WebKit widths: 320/375/390/430/768/1024/1440.
Only the external final receipt can state completed gate results for the frozen SHA.
Local substituted DB transport, browser engines and fictional fixtures do not
replace hosted, physical-device or screen-reader acceptance.
