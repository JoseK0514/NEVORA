# D1.1 approved execution and evidence handoff

Authorization: Jose's October 6 request to execute the Phase D1.1 sequence, remediate four Independent UI findings, independently reverify, run exact-SHA CI, and integrate into development only after the gates pass. This is the current bounded authorization. The original D1.1 preparation restrictions do not prevent these newly authorized UI fixes or the gated push/PR/development integration.

Baseline: `4b188df27cd2b67af8e141204ff743438521f441`.
Original candidate: `e01ca32c5fa76e0f385549c6487da52c06404781` remains unchanged on `phase-d/d1-exception-engine`.
Working branch: `release/nevora-d11-approved-20261006`.
Source of truth: the existing GitHub `development` line; normal reviewed integration, no replacement repository or parallel data source.

## Remediation boundary

- Publication: restore reachable per-location controls using the existing server action, mutation proof, readiness calculation and revision writer. Display warnings before explicit confirmation, pending state and published result. No notification delivery provider introduced.
- Shift location: carry selected Schedule location into Add Shift; render a required active-location choice; all-locations and invalid incoming selections require explicit choice. Save returns to the actual location; cancel retains incoming selection. Coverage supplies its existing location/date/employee parameters.
- Mobile management sign-out: put the existing native sign-out form in the management Menu for Owner/Manager, independent of notification feature state; preserve existing cleanup/session contracts.
- Earnings: withhold unconfigured compensation amounts on Employee/Lead Home. Show scheduled hours and explain that pay rates are not configured. No payroll/compensation schema or policy introduced.
- Independent D1.1 review reproduced hidden reversed history, coerced status/category values, impossible single-candidate overlap ambiguity, an unsupported local-day boundary, and non-code-point ordering. Corrected only attendance validation/history/projection and adjacent tests.

## Independent authority and current state

Initial Independent QA and Codex reports rejected the original engine for integration despite its 1,850 passing unit tests. Management does not close their findings. Independent UI confirmed all four reported P1 issues on unchanged interface source.

Reports and repeatable probes are preserved outside repository:
`/Users/josek0514/Documents/NEVORA-Audits/D11-approved-20261006/` (qa, ui, codex, implementation).

The four UI changes have 10 reproduced failing checks followed by passing focused checks. Engine fixes have seven reproduced failing checks plus a corrected Unicode fixture RED→GREEN. Shift return has its own RED→GREEN. Full pre-change suite: 1,850 tests passed. Pre-freeze focused suite: 137 tests passed; typecheck and lint passed. These are preparation results, not final exact-SHA or independent acceptance.

This commit is the frozen review candidate. Its exact ID is recorded by the external gate receipts; a document cannot contain its own future hash. Final local/independent/CI evidence must name that exact ID. Any source correction creates a new candidate and reruns affected evidence. Publication uses the same warning policy as before; no policy exception was chosen.

## Integration gates

Independent QA, UI and Codex reverify the new exact candidate. Local requirements: attendance and named Phase C regressions, full unit suite, typecheck, lint, build, production dependency audit, owned Clocker PostgreSQL and release PostgreSQL. Application DATABASE_URL absent; only fresh ownership-marked loopback data, fake accounts, providers disabled. Browser evidence uses a scratch Next application with substituted local DB transport and source hash manifest; this does not certify Neon/hosted parity.

After accepted source passes: push exact SHA to this release branch, create PR to `development`, inspect exact-head push CI plus PR CI, normal merge only with no material blockers, then verify actual destination SHA. No squash/rebase substitution or unreviewed source change. Keep original dirty checkouts and review artifacts intact.

## Carry-forward gates

FR-AUTH-001 OPEN. Production NO-GO. `main` and production unchanged. Existing independent UI findings outside the four authorized P1 items remain OPEN, as do hosted/Neon parity, physical-device/screen-reader acceptance, recovery/rollback evidence and branch enforcement obligations. Development-only dependency advisories are distinct from production dependency audit.

D1.1 is the pure observation engine, not complete D1 or Phase D. After successful development integration prepare D1.2 as the separate authenticated, authorized, bounded read-only source reader/API; D1.3 UI remains separate. Do not import the older parallel Batch 1 draft or its stale implementation commits wholesale. Future reader must not select latest publication to reinterpret immutable historical facts, silently truncate supporting records, expose unauthorized identities, or add correction/pay policy.
