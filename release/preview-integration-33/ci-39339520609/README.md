# Latest hosted CI: exact PR merge aa24f6a

[Workflow39339520609](https://github.com/JoseK0514/NEVORA/actions/runs/39339520609) finished **failed**. Its head is13446e25, but its actual tested checkout is **aa24f6aa70b69de6cb99130304a42c9bf8fe5b25**, treecb24c53c4d3c78dbee6f68658b720cf5eed8c61d. [Job identities and custody](result-and-custody.json).

| Gate | Exact result | Required next step |
|---|---|---|
| Phase E PostgreSQL | **All10suites pass**; Home40/40, including the communication source-cap case (13.002s). Ownership closed and source clean. | No duplicate local SQL rerun required. Preserve the prior39/40 failure and its unresolved cause. |
| Release / Clocker PostgreSQL | Both pass. | Retain these exact-source results. |
| Validate | 7,296pass /59fail /809skip;4failedfiles. Pinned migration commit7c628e3 is absent from the shallow checkout. | Apply/review the [existing checkout proposal](../ci-39338160480/CI-RC-PINNED-SOURCE-01.patch), retain the strict migration reader, rerun hosted validate. |
| Home browser | Chromium320, loading stage,37:155: My Time link is hidden inside Own recorded time. Earlier Loading Home label assertion passed. Later browser executions remain unrun. | Resolve the recordedSlot cold-loading visibility/stability contract; retain private-content clearing, disabled refresh and held-read assertions. |
| Attendance browser |299:72 waits15s for old exact Loading attendance review. Canonical UI now says Loading attendance. | Review the [existing diagnostic proposal](../ci-39338160480/attendance-loading-diagnostic.patch), then run the entire gate. Retain privacy/reauthorization assertions and timeouts. |

[Source comparison](source-comparison-and-home.json) checked all2,846 source-manifest entries against frozen15a0fcd7: only Wave B ROUND.md differs; no missing file or application/test/config difference. These hosted SQL results therefore cover the same application bytes as15a0fcd7, with the actual merge identity retained. No old-source browser result is promoted to a current full exit.

[Raw SQL report](sql-report.json), [Home40/40](sql-home.json), [source manifest](source-manifest.json), [Home failure](browser-failure-report.json), [browser scope](browser-report.json), [owned cleanup report](owned-browser-report.json), [failure image](home-task11-chromium-320-failure.png). Original job logs remain at their hashed local custody paths; no temporary signed URL, cookie, login state or database credential is published. Previous CI failures remain preserved in their dated packet.

No CI or test proposal was applied by this reporting update. Local code gates pass separately; hosted aggregate and all five full exit rounds remain open.

## Owner correction published after this failed run

Claude subsequently published1fa7a260 through rolling mergec8752f2b: full checkout history, current Attendance state labels, and Home first-load expectations matching the existing P3-ST-25 hidden recordedSlot. ActiveRCa21650de now includes that update without application changes from its08159520 repair checkpoint. No new hosted passing run has been observed for this update yet. Preserve this packet as the exact earlier134-head/aa24-merge failure, not the status of an unrun correction.
