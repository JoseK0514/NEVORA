#!/bin/bash
# scan6.sh <label> <engine> "<extra env>": the shared branch's ui-scan tool (zz-scan, patched for the engine and the
# pinned Playwright runtime) on the current checkout, as postgres. Evidence: /home/qa-evidence/scan6-<label>
L=$1; ENG=$2; X=$3; cd /home/user/NEVORA; rm -rf zz-scan vitest.zz-scan.config.mts; cp -r /home/user/qa-tools/scan6/zz-scan /home/user/qa-tools/scan6/vitest.zz-scan.config.mts .; chown -R postgres zz-scan vitest.zz-scan.config.mts
E=/home/qa-evidence/scan6-$L; rm -rf $E; mkdir -p $E; chown -R postgres $E .omo node_modules/.vitest-cache 2>/dev/null
su postgres -s /bin/bash -c "cd /home/user/NEVORA && unset DATABASE_URL && export HOME=/tmp/pghome GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=safe.directory GIT_CONFIG_VALUE_0='*' PLAYWRIGHT_BROWSERS_PATH=/opt/pw-webkit NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE=/home/user/NEVORA/tools/ci-browser-runtime/package.json NEVORA_SCAN_ENGINE=$ENG && mkdir -p /tmp/pghome && NEVORA_SCAN_DESK=1 NEVORA_SCAN_ONLY=1 NEVORA_SCAN_WIDTHS=1440 NEVORA_PAYROLL_ENABLED=true NEVORA_SCAN_PAYROLL=1 NEVORA_SCAN_EVIDENCE=$E NEVORA_OWNED_APP_PRODUCTION=1 $X NEVORA_TEST_PG_BIN=/usr/lib/postgresql/16/bin node zz-scan/pg-runner.mjs vitest.zz-scan.config.mts" > $E.log 2>&1; echo "scan6 $L rc=$?"
rm -rf zz-scan vitest.zz-scan.config.mts
ls $E | wc -l
