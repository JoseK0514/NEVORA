#!/usr/bin/env bash
set -eu
export PREVIEW_OUT=/workspace/paused-previews/phase3
export PLAYWRIGHT_RUNTIME_ROOT=/workspace/nevora-browser-runtime/node_modules
export LD_LIBRARY_PATH=/workspace/nevora-native-runtime/root/usr/lib/x86_64-linux-gnu
export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1
cd /workspace/inspect-phase3
node scripts/ui-checks/checks.mjs --routes '/app,/app/schedule,/app/schedule?view=open,/app/requests/hub,/app/requests?tab=new,/app/requests?tab=my,/app/exchange?tab=available,/app/exchange?tab=requests,/app/availability,/app/availability?week=2026-10-26,/app/my-time,/app/timecards,/app/my-pay,/app/profile,/app/updates,/app/notifications' --accounts AUDIT-E,AUDIT-LEAD --widths 320,360,390,430,844x390 --text 100,125,150,200 --browsers chromium,webkit
