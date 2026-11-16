#!/bin/bash
# UI screenshot harness (fictional data, local Postgres). See tools/ui-scan/README.md.
# usage: W=390,1440 tools/ui-scan/desk.sh <outdir> <routes,comma> "[extra env]"
# The owned test app builds from the committed tree, so uncommitted work is committed as a temporary
# "wip ui-scan" commit and soft-reset afterwards (your changes stay staged).
T=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$T/../.." && pwd)
LOG=${UI_SCAN_LOG:-/tmp/ui-scan-last.log}
cd "$ROOT" || exit 1
BEFORE=$(git rev-parse HEAD)
git add -A >/dev/null && git commit -qm "wip ui-scan" >/dev/null 2>&1
tar xzf "$T/zz-scan.tar.gz" -C "$ROOT"
rm -rf "$1"
su pgtest -s /bin/bash -c "cd '"$ROOT"' && unset DATABASE_URL && export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=safe.directory GIT_CONFIG_VALUE_0='"$ROOT"' && NEVORA_SCAN_DESK=1 NEVORA_SCAN_ONLY=1 NEVORA_SCAN_WIDTHS=${W:-1440} NEVORA_SCAN_EXTRA='$2' NEVORA_PAYROLL_ENABLED=true NEVORA_SCAN_PAYROLL=1 NEVORA_SCAN_EVIDENCE=$1 $3 NEVORA_TEST_PG_BIN=/usr/lib/postgresql/16/bin node zz-scan/pg-runner.mjs vitest.zz-scan.config.mts" > "$LOG" 2>&1
rc=$?
rm -rf zz-scan vitest.zz-scan.config.mts
[ "$(git rev-parse HEAD)" != "$BEFORE" ] && [ "$(git log -1 --format=%s)" = "wip ui-scan" ] && git reset -q --soft "$BEFORE"; chmod -R a+r "$1" 2>/dev/null
echo "exit $rc"; grep -E "Tests |FAIL|Error" "$LOG" | head -5
python3 - "$1" <<'PY'
import json,sys
try:
  d=json.load(open(sys.argv[1]+'/scan-log.json'))
  for p in d:
    if isinstance(p,str): print('LOG',p[:200])
    elif 'overflow' in p and p['overflow']: print('OVERFLOW',p['route'],p['overflow'])
except Exception as e: print('no log',e)
PY
