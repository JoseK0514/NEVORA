# Integration corrections after the first combined full suite

Published `codex/verify-preview-33` now points to clean `cd764f614be8ca5b5215be19d46e07cf968638d7`. The original merge8640247 and immutable candidate33 snapshot b68f250 remain available. These two small integration corrections retain the same33 finding scope; later candidate34–45 and separate proposals remain excluded.

1. `fce5b402` / **TC-WA-16**: remove the redundant application selector from `kit.css`, restoring that file byte-exact to Claude4aaa793. The unchanged coordinator `portal-premium.css:1431` already covers every actual target at higher specificity, with opacity1. No non-CSS source element has the excluded `nv-kit` ID. The kit namespace test remains unchanged; the application contrast fix remains supplied by the coordinator. Wave A independently reviewed this resolution.
2. `cd764f61` / **ST-WA-7**: make the existing callout-page module mock partial so the real pure `PendingLabel` renders. Keep the existing EmployeeSubmitButton stub and all business-date and callout assertions. No application behavior changes.

Both previously failing files now pass:18/18. Fresh locked installation, type generation, TypeScript, lint, full suite and production checks now pass on exact clean cd764f6:7,362 passed/0 failed,801 skipped/55 pending; five markers absent across2,323 artifacts. The initial8640247 result remains documented separately:7,360 passed/2 genuine failures, with production build and five markers passing across2,323 artifacts. No browser review was started on that superseded merge.

Exact commits, patches and source hashes are beside this file. All exit reviews must use the corrected descendant and retain full scope. No complete exit or release-zero verdict is claimed.
