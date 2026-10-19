# Cloud inspection method

Source branches are detached read-only worktrees; reports alone are committed to `codex/inspections`. Each exact commit has a separate owned preview and output directory. Old partial matrices retain their checkpoint when a handoff supersedes them; a partial sweep never certifies zero.

The provided `checks.mjs` is unchanged (SHA-256 `e1324bcdafee65f70142a35e3cc27edd205e03b2fd13618835b8eb74a802ff2d`). The runner invokes it sequentially per preview, groups routes by browser/account/width/text, preserves original result files, and aggregates the latest unique cells. Load failures are retried once and then listed as gaps. Axe runs separately at 390 and 1440 for every text size and both browsers.

Manual probes always install a browser guard before navigation: external origins, sign-out and writes are blocked. Exact read-only period/action-center POST queries are permitted. State tests override requests in the browser to hold, fail or answer them; no UI submission reaches the server. Credentials and browser states stay outside the report branch.

The unchanged automated checker performs reads and no button presses. Its hash-verified invocation keeps normal HTTP caching; the blanket manual interception is not installed on that invocation. Profile’s browser-only read/save fixtures still install for Owner and Manager, because its backend endpoints are absent on that source branch. This distinction avoids unnecessary cache invalidation without changing the checker or app.

Preview bootstrap uses only the owned fictional database. The preview’s initial fictional update is inserted by its local fixture executor instead of pressing Publish. The generated database transport uses the coordinator’s bounded pool implementation (12 connections, coordinator `fa7a09b`); this avoids preview connection saturation without changing inspected application code, CSS or tests. Runtime manifests record adapter/source hashes. Standard and `--large` fixtures are isolated in separate previews.

Manual screenshots are viewport screenshots or bounded crops. Hydrated controls, fonts and measured bar CSS variables are awaited before geometry judgments. A text-size change is applied to the root after load. WebKit and Chromium are actually installed and run with local host libraries. Native keyboard/blur claims and real-device results are left to the Mac.
