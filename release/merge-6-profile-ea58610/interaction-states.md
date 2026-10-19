# Combined Profile interaction supplement

**Partial, not zero for the whole build.** No Profile interaction defect reproduced; canonical Availability IS-P3-01/02/03 remain open.

Evidence scope: this supplement reads this task’s preserved **c34043b** measurements. Canonical publication is **8e18a95**, covered by [its own five-area reports](../merge-4-profile/README.md) and [verified gate provenance](../publish-c34043b/canonical-8e18a95/README.md). The Profile initial-read implementation has equivalent ready/parse/catch behaviour. Raw observations retain their original SHA; no old browser run is presented as a fresh canonical run.

## Earlier findings

Source Profile IS-16 was verified zero before merging. Current canonical states are separately measured in its primary interaction report.

## Findings

No additional source finding is counted here.

## Checked and correct

-72/72 ready-state page captures haveHTTP200,no page errors,no loading markers and no gap.
-60/60 More openings across Home/Inbox/Profile, four roles and both engines: focus inside, Close and Escape close, focus returns. Smallest sheet action44px within floating-point tolerance.
-Employee/Lead render only the personal Profile and issue0 management-profile requests. Their explicit protected API probes receive403; signed out receives401; Manager/Owner receive200/ready.
-[Raw shell](../publish-c34043b/shell/shell-probe.json), [raw Profile/API](../publish-c34043b/profile/profile-initial-probe.json).

## Gaps

Management Profile navigation still comes from the pending Desktop work: IS-P4-05/WR4-02 describe its menu entries and dependency on the newly merged page. Owner/Manager More currently has no Profile link in this older shell; the direct route works. Recheck that dependency when Desktop merges. This supplement does not claim a complete failure/offline/signed-out/save sweep; canonical24 views/4 intercepted saves are retained separately.
