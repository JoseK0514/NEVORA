#!/bin/bash
# QA S-01 measurement: the scoped access frame on throttled networks, on the owned app (fictional data, a throwaway local
# Postgres, Chromium only). Production build by default; NEVORA_S01_BUILD=dev measures `next dev` for comparison.
# usage: [NEVORA_S01_BUILD=production|dev] [NEVORA_S01_PROFILES=none,fast3g,cap4m] [NEVORA_S01_ROLES=owner,manager]
#        [NEVORA_S01_LOADS=cold,warm] [NEVORA_S01_WATCH_MS=60000] [NEVORA_S01_EVIDENCE=/tmp/nevora-scan/s01-measure]
#        tools/ui-scan/s01-measure/run.sh
# Heavy (a production build, then up to an hour of watched loads): on a shared machine run it as
# `flock /tmp/nevora-heavy.lock tools/ui-scan/s01-measure/run.sh`. Each load waits for a 1-minute load average under
# NEVORA_S01_MAX_LOAD (3) with no other app, Postgres or browser running, and records the load next to its numbers.
# Like desk.sh, uncommitted work is committed as a temporary "wip s01-measure" commit and soft-reset afterwards, because
# the owned app builds from the committed tree. Runs as SCAN_USER (default pgtest); results go to
# $NEVORA_S01_EVIDENCE/<build>/results.json with a screenshot per load.
T=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$T/../../.." && pwd)
U=${SCAN_USER:-pgtest}
PGBIN=${NEVORA_TEST_PG_BIN:-/usr/lib/postgresql/16/bin}
LOG=${S01_LOG:-/tmp/s01-measure-${NEVORA_S01_BUILD:-production}.log}
EVIDENCE=${NEVORA_S01_EVIDENCE:-/tmp/nevora-scan/s01-measure}
cd "$ROOT" || exit 1
BEFORE=$(git rev-parse HEAD)
git add -A >/dev/null && git commit -qm "wip s01-measure" >/dev/null 2>&1
CONFIG=vitest.s01-measure.config.mts
cat > "$CONFIG" <<'EOF'
import {defineConfig,projectConfig} from './vitest.shared.mts';
export default projectConfig('s01-measure',defineConfig({test:{include:['tools/ui-scan/s01-measure/s01-measure.integration.mts'],fileParallelism:false,testTimeout:14400000,passWithNoTests:false}}));
EOF
chown "$U" "$CONFIG"
mkdir -p "$EVIDENCE" && chown "$U" "$EVIDENCE"
PG=$(su "$U" -s /bin/bash -c 'mktemp -d /tmp/nevora-s01-pg-XXXXXX')
PORT=$(node -e "const s=require('net').createServer();s.listen(0,'127.0.0.1',()=>{console.log(s.address().port);s.close();})")
MARKER=$(node -e "console.log(require('crypto').randomBytes(6).toString('hex'))")
PASS=$(env | grep -E '^NEVORA_S01_[A-Z_]+=' | sed "s/'/'\\\\''/g; s/=\(.*\)/='\1'/" | tr '\n' ' ')
su "$U" -s /bin/bash -c "cd '$ROOT' && unset DATABASE_URL && set -e
 '$PGBIN/initdb' -D '$PG/data' -U nevora_test --auth-local=trust --auth-host=trust --encoding=UTF8 --no-locale >/dev/null
 '$PGBIN/pg_ctl' -D '$PG/data' -l '$PG/postgres.log' -w start -o '-h 127.0.0.1 -p $PORT -k $PG' >/dev/null
 set +e
 export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=safe.directory GIT_CONFIG_VALUE_0='$ROOT'
 env $PASS S01_PG_DIR='$PG' NEVORA_S01_EVIDENCE='$EVIDENCE' NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE='${NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE:-}' \
  FUEL_TEST_DATABASE_URL='postgresql://nevora_test@127.0.0.1:$PORT/nevora_exchange_test_c1_$MARKER' FUEL_TEST_ALLOW_DESTRUCTIVE_TEARDOWN=yes \
  node scripts/run-rstest.mjs run --config '$CONFIG'
 rc=\$?
 '$PGBIN/pg_ctl' -D '$PG/data' -w stop -m fast >/dev/null
 rm -rf '$PG'
 exit \$rc" > "$LOG" 2>&1
rc=$?
rm -f "$CONFIG"
[ "$(git rev-parse HEAD)" != "$BEFORE" ] && [ "$(git log -1 --format=%s)" = "wip s01-measure" ] && git reset -q --soft "$BEFORE"
chmod -R a+r "$EVIDENCE" 2>/dev/null
echo "exit $rc (log $LOG)"; grep -E "^\[s01\]|Tests |FAIL|Error" "$LOG" | head -80
