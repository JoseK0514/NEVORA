# Native cloud activation review

Reviewed the prepared workflow, native CI helpers, Android device test, iOS build
script and root project exclusions. This is a bounded source review before hosted
execution, not certification of either native runtime.

## Result

No blocking configuration or security defect found in the inspected activation
changes. One Android test reliability concern was sent to the implementation
owner: its final visibility check should use interval polling rather than the
default animation-frame polling, because animation frames may stop when the app
is backgrounded. Native execution is required to settle actual device behavior.

## Checks made

- Workflow runs only for `development`, checks out `github.sha`, records that same
  candidate and names artifacts by it. The token is read-only; checkout does not
  persist credentials. No deployment, store upload or signing-account step exists.
- Android uses a disposable Ubuntu runner with explicit KVM availability, locked
  packages and Java 21. The emulator step runs actual WebView tests, not a browser
  viewport presented as native evidence. Failures propagate through Bash pipefail.
- iOS selects an available iPhone simulator, waits for boot, installs the unsigned
  simulator build, launches it, verifies the host process remains alive and records
  a screenshot. The helper accurately limits its claim to launch smoke, not DOM,
  sign-in, keyboard or accessibility acceptance.
- The iOS Debug build configuration includes `DEBUG`, the correct Debug plist and
  SceneDelegate source membership. Its override signatures match the installed
  Capacitor source, and SPM's local plugin path resolves to native/node_modules.
  No Xcode compilation was performed by this reviewer.
- Root TypeScript/ESLint/Vitest exclusions isolate only the separate `native/`
  project. Vitest preserves its existing defaults. They do not exclude existing
  web application source or tests. Native checks remain in the new workflow.
- Android's apparent stale-WebView risk after `am force-stop` was checked against
  installed Playwright source: `device.shell()` refreshes WebViews before returning,
  so the force-stop path removes vanished sockets before the following lookup.
  This did not establish a source defect; runtime remains the deciding evidence.
- Failure artifacts and candidate receipts are retained without making a failed
  job successful. The workflow does not waive existing web/release checks.

## Remaining evidence

Hosted run results, simulator screenshots, native Back/restart behavior and actual
NEVORA authentication remain separate acceptance evidence. This review covers the
prepared packaged-fixture workflow, not a later real-app runtime extension.
