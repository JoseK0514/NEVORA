# UI screenshot harness (Direction B)

The tool used to capture every Direction B screen on fictional data. It starts the owned
test app against a throwaway local Postgres, seeds a fictional workspace, signs in as the
chosen role and saves full-page screenshots plus a `scan-log.json` (overflow, small
targets, probe results). Nothing reaches a real database, email or SMS.

The test files live in `zz-scan.tar.gz`. They are kept archived because they import the
app with paths relative to the repository root, so they are unpacked only while a scan runs
(and removed afterwards). This keeps them out of `tsc`, ESLint and Vitest.

The phone app flow simulates the app's bridge (`window.nevoraCapabilities`) the way
`native/capability-ui/main.tsx` does and answers `/api/mobile/v1/notifications/*` from Playwright routes: fictional
replies only, no device or provider calls. Its states are saved as `native-<state>-<width>.png`.

## Requirements

- Postgres 16 binaries at `/usr/lib/postgresql/16/bin` and a `pgtest` system user (the
  cloud dev container has both).
- Chromium for Playwright (preinstalled in the cloud container).

## Usage

```bash
# Owner (default login), desktop
W=1440 tools/ui-scan/desk.sh /tmp/scan-owner /app,/app/schedule

# Employee on a phone and desktop, rich data
W=390,1440 tools/ui-scan/desk.sh /tmp/scan-emp /app,/app/schedule \
  "NEVORA_SCAN_AS=emp NEVORA_SCAN_ACTOR=1 NEVORA_SCAN_EMPROLE=EMPLOYEE NEVORA_SCAN_RICH=1"

# Lead: NEVORA_SCAN_EMPROLE=LEAD.  Manager: NEVORA_SCAN_LOGIN=OWN-ELENA.
# Owner rich data: NEVORA_SCAN_RICH_OWNER=1 (+ NEVORA_SCAN_STATES_OWNER=1 for states).
# Signed-out public pages: NEVORA_SCAN_PUBLIC=1 NEVORA_SCAN_PUBLIC_W=390,1440 NEVORA_SCAN_PUBLIC_LANGS=en,es
# Clocker kiosk flow: NEVORA_SCAN_CLOCKER_FLOW=1 (fictional tablet key scan-kiosk-main)
# Phone app user agent: NEVORA_SCAN_UA=native-ios or native-android (NEVORA-Native/iOS/1, NEVORA-Native/Android/1)
# Phone app alerts on (fictional NATIVE_PUSH_* test config): NEVORA_SCAN_NATIVE_ALERTS=1
# Phone app Alerts page states with a simulated bridge: NEVORA_SCAN_NATIVE_FLOW=1 (NEVORA_SCAN_NATIVE_W=390,900,1440)
# Browser device alerts on (fictional web push config): NEVORA_SCAN_DEVICE_ALERTS=1
# Owner Device settings popover: NEVORA_SCAN_POPOVER=1 (NEVORA_SCAN_POPOVER_W=390,1440)
```

Screenshots are named `owner-<route-slug>-<width>.png` (the prefix is historical; the role is
the one you chose). The log goes to `/tmp/ui-scan-last.log` (override with `UI_SCAN_LOG`).

The owned app builds from the committed tree, so the script commits your working changes as
a temporary `wip ui-scan` commit and soft-resets it when the scan ends; your changes come back
staged. New untracked application files must be added first (`git add -N <file>`).

To change a test, unpack the archive, edit, and re-pack:

```bash
cd tools/ui-scan && tar xzf zz-scan.tar.gz && $EDITOR zz-scan/… && tar czf zz-scan.tar.gz zz-scan vitest.zz-scan.config.mts && rm -rf zz-scan vitest.zz-scan.config.mts
```
