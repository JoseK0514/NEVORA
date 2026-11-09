# Controlled router-navigation reproduction

This fictional two-route Next.js fixture preserves the hard-navigation failure
mechanism separately from the required real application workflow. It contains
no application database, authentication, notifications or customer data.

Recorded runtime: Next 16.4.2, React 19.3.0, Playwright 1.62.1; Chromium
151.0.7922.34 and WebKit 26.5 on macOS with Node 24.19.0. The fixture version
endpoint independently identifies the serving Next/React versions.

The browser driver holds the destination response, then triggers a real source
router refresh. A 200ms fixture timer supplies the stimulus; an exposed binding
asserts that it fired **after** the destination request was held. It is not an
application settling delay or an alteration of any application privacy timer.
Every destination RSC request is released, including a replacement request.

Both rendered Link cases reach the destination without page errors. Chromium's
hard-navigation baseline succeeds. WebKit's hard navigation is interrupted by
Next's source-page fallback after exactly two native access-control diagnostics
(source RSC and Next stack-frame request). Both browser processes close. The
recorded Next server was stopped successfully after the runs.

This reproduces the failure mechanism and supports a native workflow driver.
It does not establish which application refresh path initiated the historical
failure, repair the framework, certify Linux, or verify the full Next/PostgreSQL
application. All native/framework errors remain fatal in the real application
regression. The required driver now uses the rendered Insights link and actual
custom-period form; its protected response and existing assertions remain gates.

To reproduce, copy this entire folder to an external temporary directory. Run
`npm ci --ignore-scripts --no-audit --no-fund` there using the included lockfile.
Start its server from that directory with a clean environment:

```sh
env -i PATH="$PATH" HOME="$HOME" NEXT_TELEMETRY_DISABLED=1 \
  node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 0 --webpack
```

From the NEVORA repository root, set `FICTIONAL_ROUTER_ORIGIN` to that server's
printed loopback origin and `FICTIONAL_ROUTER_ENGINE` to `chromium` or `webkit`,
then run this folder's `browser-control.mjs` with Node. It uses the repository's
approved `tools/ci-browser-runtime` package and refuses non-loopback origins.
Run both engines, retain their JSON and exit status, then stop the fixture server.
Never install or start this reproduction inside the application checkout.

`custody.json` records hashes for the executed fixture sources, dependency lock
and both successful control receipts. Browser/Next output contains only fixed
fictional paths and booleans; application capabilities are never used here.
