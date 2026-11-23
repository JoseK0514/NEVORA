#!/bin/bash
# Location Manager (OWN-DANI, loc-2) capture runner. Run under: flock /tmp/nevora-heavy.lock run-scoped.sh <name> "<extra env>"
# Copies the scan package into the worktree only for the run, runs it as postgres, then removes it.
WT=${WT:-$(git rev-parse --show-toplevel)}
SRC=${SRC:?unpack tools/ui-scan/zz-scan-scoped.tar.gz to a scratch folder and set SRC to it}
NAME=$1; B=${OUT:-/tmp/nevora-sweep/scoped}; RAW=$B/raw-$NAME; EXTRA=$2
cd $WT || exit 1
rm -rf $WT/zz-scan $WT/vitest.zz-scan.config.mts; cp -r $SRC/zz-scan $WT/zz-scan; cp $SRC/vitest.zz-scan.config.mts $WT/
chown -R postgres $WT/zz-scan $WT/vitest.zz-scan.config.mts
mkdir -p $B; chown postgres $B
rm -rf $RAW; mkdir -p $RAW/mgr $RAW/review; chown -R postgres $RAW
echo "start $(date -u +%T) head $(git -c safe.directory='*' rev-parse --short HEAD) load $(cat /proc/loadavg)"
su postgres -s /bin/bash -c "cd $WT && unset DATABASE_URL && export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=safe.directory GIT_CONFIG_VALUE_0='*' PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers && NEVORA_OWNED_APP_PRODUCTION=1 NEVORA_SCAN_DESK=1 NEVORA_SCAN_ONLY=1 NEVORA_SCAN_WIDTHS=390 NEVORA_SCAN_EVIDENCE=$RAW/ev NEVORA_MGR=1 NEVORA_MGR_OUT=$RAW/mgr NEVORA_REVIEW_OUT=$RAW/review NEVORA_PAYROLL_ENABLED=true NEVORA_SCAN_PAYROLL=1 NEVORA_SCAN_RICH_OWNER=1 NEVORA_SCAN_LIMITED=OWN-DANI NEVORA_SCAN_LIMITED_LOC=loc-2 NEVORA_SCAN_PROFILE=Ml $EXTRA NEVORA_TEST_PG_BIN=/usr/lib/postgresql/16/bin node zz-scan/pg-runner.mjs vitest.zz-scan.config.mts" > $RAW.log 2>&1
rc=$?
rm -rf $WT/zz-scan $WT/vitest.zz-scan.config.mts $WT/.omo/evidence/payroll-backend
rmdir $WT/.omo/evidence $WT/.omo 2>/dev/null
chown -R postgres $RAW; chmod -R a+r $RAW 2>/dev/null
echo "exit $rc end $(date -u +%T)"; grep -E "Tests |FAIL|Error" $RAW.log | head -8
