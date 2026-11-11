# R08–R10 local backend qualification and Claude handoff

All local qualification stages passed against application commit `09c0e7ef9f35a019503b74939feecfd3bbf38987`. Independent review returned **GO WITH CONDITIONS for this exact local backend candidate**. Both specific findings are independently closed; original NO-GO evidence is preserved. This is local backend qualification, not combined UI or hosted release approval.

Jose approved the three dashboard engineering packages and chose Owner and Manager within existing permissions for R10. The work excludes native applications. His explicit hold remains: no push, Actions dispatch/rerun or production deployment. No hosted database/credential/customer change, live provider/model test, real delivery or purchase occurred.

The selected development baseline is0317598ae6886bc964bbd6bb5c1bbbd3add46069. Current application candidate is09c0e7ef9f35a019503b74939feecfd3bbf38987 in the detached worktree `/Users/josek0514/.codex/worktrees/nevora-r08-r10-local-20261110`. The3-branch policy is preserved; no new branch was created. All work is local.

## Implemented

- R08: explicit schedule assignment and swap display contracts; inactive catalogs and contact/eligibility fields stay server-side; own statement responses allowlist public period/payday while preserving actual PDF SHA/download authorization. Independent review found an enclosing observation prop still carrying original source data. Root fixed the same pattern at 24 management-page boundaries with an explicit 3-field projection; actual client-boundary regressions were retained RED and verified GREEN independently. Actual HTML/RSC marker acceptance is part of final browser qualification.
- R09: complete ordered 300-row timecard and 100-row correction pages in one SQL statement; exact totals, contiguous indexes and matching arrays are mandatory. Missing/repeated/mixed pages or duplicate identities cannot produce ready counts/capture.601 retained people and201 submitted corrections, including inactive people, were tested across 3 pages. Flat client DTOs and existing authority remain. No customer cap or unlimited-capacity/SLA claim is invented; existing history/item/write limits and the documented VOLATILE nested-read isolation caveat remain distinct release considerations.
- R10: cookie-derived current Owner/Manager authorization and complete affected location scope, explicit end instant and reason, source freshness, self-review/overlap/finalized/paid-period checks, normal clock revision, open-break closure and a separate append-only before/after audit. Identical operation replay is durable; payload/actor/target reuse conflicts; uncertain responses retain the original command. Inactive employee/device restrictions remain. An independent moved-target replay race was reproduced RED, fixed and independently executed GREEN.

## Source and tests

Final receipt: `/Users/josek0514/.codex/r08-r10-local-20261110/combined-final-qualification.json` (`complete:true`). Every stage records exit0 and unchanged source. Preserve the initial 11-failure full suite and all subsequent fixes. Seven failures came from the new SQL files missing the existing test allocation; two were an old export transport fixture. The remaining native-boundary/5-second timing failures passed with their original constraints in the unchanged 4-file, 201-test rerun; no timeout, retry or assertion was weakened. The registered source allocation was checked locally; Actions were not run.

| Local check | Observed result |
| --- | --- |
| Full default suite | 12,005 passed;857 skipped; no failures. Skips are not SQL acceptance. |
| Capacity/legacy/PDF SQL | 61 passed in 5 files; owned PostgreSQL |
| Management-close SQL | 26 passed; owned PostgreSQL |
| Fresh-company provisioning SQL | 21 passed; real isolated APP/WORKER principals and 2 companies |
| Browser | PASS; real passwords/cookies, Owner/Manager close+replay, Lead/Employee denied, schedule HTML/RSC excludes private contact markers; no external requests or page errors |
| TypeScript / ESLint | PASS;0 lint errors,1 pre-existing anonymous-default-export warning in untouched worker entry |
| Production build | PASS; unchanged source and 4,520 artifact file hashes in `combined-build.json` |
| Canonical migration / manifest | PASS; migration 0057 and manifest 975140157494ec20b5c2cda7db2558f893b28d3415b21be12aca1f76b0b8f0de |
| Source inventory | PASS; 73 classified sources,3 active branches, current development included |
| Historical archive custody | PASS; 409 files/50 reports/310 shots preserved; not a re-execution/acceptance of those old findings |
| Whitespace / status | PASS; clean qualified checkout |

The final actual-SQL/browser tests used only newly owned loopback PostgreSQL and closed their clusters. Provider/model calls and real delivery were disabled. Tests and build did not mutate application source. Commands, times, logs and statuses are in the receipt; no Actions, push or deployment occurred.

## Integration and release gates

The callable management-close GET/POST contract and required confirmation/retry/privacy behavior are in `docs/handoffs/2026-11-10-r10-management-close-contract.md`. Claude owns its confirmation UI in the combined source. The actual backend browser acceptance is not a claim that this UI was integrated or that every scoped Manager can navigate the held Timecards page. R01 combined source, authenticated UI acceptance, hosted migration/rollback/admission evidence and production approval remain separate. Retain the old application for rollback and preserve management audit evidence; no hosted migration was performed here.

The additive 0057 migration and canonical manifest include APP-only function/table grants and no WORKER management capability. Fresh-company provisioning and existing isolated-role behavior are locally tested. Hosted adoption still requires the selected environment and backup/rollback review. Payroll corrections follow the existing workflow: an approved paid period is blocked until an explicit correction is open; repairing source time precedes rebuilding/reapproving the correction. This command does not initiate/approve payroll or send payments.

No further user decision is needed for this local packet. Claude can consume the contract and selected source when the combined integration is scheduled. CI waits until Jose explicitly authorizes it; this handoff does not ask for a run now.

## Independent disposition and custody

Final independent report: `/Users/josek0514/.codex/r08-r10-local-20261110/.omo/evidence/independent-final-09c0e7ef/report.md`. The reviewer inspected all 12 raw stages/receipts and independently hashed 4,520 build artifacts and 2,836 browser source files with zero mismatches. The earlier 954c29877 NO-GO, independent leak/replay reproductions and closure addenda remain intact. Conditions are the separate R01, Claude combined UI, unmeasured hosted capacity/concurrency, staging migration and CI/push/production gates. No new reproduced code defect remains in this bounded local review.

Evidence pins application commit 09c0e7ef9f35a019503b74939feecfd3bbf38987. The final handoff commit changes documentation only. `qualified-application-identity.json` and `handoff-custody.json` verify the source/db/services/public/scripts/package/config identities are unchanged; qualification is not silently rebound to another application candidate. A future integrator must select this candidate and reconcile any later development/Claude changes before activating it.
