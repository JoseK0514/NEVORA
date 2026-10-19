# Rolling-integration CI failure triage

[Workflow39338160480](https://github.com/JoseK0514/NEVORA/actions/runs/39338160480) has head9d6530bc, but actually checks out PR merge **36e9ef38da8c12c96347f9160574a154a99ae329**, tree36af7c12c9d1a27db13443bb540d59fb598c330f. These are additional hosted CI failures; clean localcd764f6 gates do not close them.

| Job | Observed failure | Next action |
|---|---|---|
| validate118354819690 |7296passed,59failed,809skipped;4failedfiles. The migration reader cannot find pinned7c628e374f03c9025b2c0cfd3568be033f07238d in the shallow checkout. DDL/schema-reducer suites also fail setup. Build/type/lint/audits were skipped after unit failure. | Retain the strict reader and assertions. Give this exact checkout its historical Git objects. The unapplied checkout proposal retains github.sha and persist-credentials:false. |
| phase-e-postgres118354819122 | Home integration39passed/1failed: communication cap sentinel retains known rows and never claims complete, line262; unavailable vs expected partial/source_cap/100knownrows. Earlier SQL files pass. | Reproduce the exact owned SQL case; distinguish source budget/fixture failure from data logic. Retain completeness assertions. No cause or closure inferred. |
| phase-e-ui118354819668 | Chromium320, Home loading stage: phase-e-home-browser-scenarios.mjs37:155, actualfalse expectedtrue on the visible My Time link inside Own recorded time. Column155 is this link assertion; Loading Home… is visible in the failure image and its earlier assertion passed. Remaining mandatory executions unrun. | Coordinator: reproduce the cold held native read. CSS employee-home-reviewed.module.css327 hides recordedSlot on first loading, including the expected fallback link. Resolve this visibility/stability contract while retaining cleared private assignments/items and disabled recorded-time refresh. Do not weaken the privacy assertions. |
| phase-d-attendance-ui118354820652 | phase-d-attendance-ui-qa.mjs299:72 waits15s for exact Loading attendance review, then times out after five protected checks. | Coordinator: reproduce session reauthorization/read lifecycle and retain private-data clearing checks. |

Clocker PostgreSQL and release PostgreSQL jobs passed. The mandatory aggregate rejects the failing E/D jobs. Latest observed head13446e25 has a different pending workflow; no CI-green claim for it.

## Pinned-history reproduction and review proposal

An owned depth-one clone of clean testedcd764f6 reproduced cat-file exit128 for7c628e3. Fetching history left HEAD and tracked application bytes unchanged, restored pinned tree5a2df77, and the real loadPinnedMigrations read25 committed migrations with valid hashes. [Raw reproduction](shallow-reproduction.json), [custody](evidence-custody.json).

[CI-RC-PINNED-SOURCE-01.patch](CI-RC-PINNED-SOURCE-01.patch) adds fetch-depth:0 to validate's checkout only. It is **unapplied**. No source reader, assertion, timeout, permission or exact-SHA control is weakened. A fresh hosted validate job is required after owner integration; this reproduction is not a full CI result.

[Home failure report](browser-failure-report.json), [browser scope report](browser-report.json), [failure image](home-task11-chromium-320-failure.png), [SQL assertion](sql-home-failures.json). Full original logs and artifacts remain at the custody path, with hashes above. No temporary signed URLs or credentials are published.

## Attendance diagnostic proposal

Current canonical manager-attendance-review.tsx188 says **Loading attendance**, with TC-48’s shorter approved state copy. The old diagnostic expects **Loading attendance review** at three held-read checks. [attendance-loading-diagnostic.patch](attendance-loading-diagnostic.patch) updates only those three exact labels; it retains all held-request, cleared-private-row and reauthorization checks and changes no timeout or app behavior. It is unapplied and syntax-checked only, not a passing browser result. The owning coordinator must run the complete gate after adoption.
