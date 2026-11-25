#!/bin/bash
S=$1; D=/home/qa-evidence/full-$S; mkdir -p $D; cd /home/user/NEVORA || exit 1; F=$D/summary; : > $F
git fetch -q --no-tags origin claude-codex-collab-nevora; PREV=$(git rev-parse HEAD); git checkout -q --detach $S || { echo "checkout failed" >> $F; exit 9; }
echo "head $(git rev-parse --short=9 HEAD) start $(date -u +%T)" >> $F
git diff --quiet $PREV $S -- package-lock.json package.json || { npm ci > $D/npmci.log 2>&1; echo "npmci=$?" >> $F; }
unset DATABASE_URL
timeout 900 npx --no-install tsc --noEmit -p . > $D/tsc.log 2>&1; echo "tsc=$?" >> $F
timeout 600 npx --no-install oxlint --config .oxlintrc.json . > $D/lint.log 2>&1; echo "lint=$?" >> $F
timeout 2700 node scripts/run-rstest.mjs run > $D/unit.log 2>&1; echo "unit=$?" >> $F
sed 's/\x1b\[[0-9;]*m//g' $D/unit.log | grep -aE '^### \[F|"failedTests"|"passedTests"' >> $F
rm -rf node_modules/.vitest-cache
for r in 1 2 3; do TESTS=src/test/integration/readiness-ui-browser.integration.ts timeout 2400 /home/user/qa-tools/browser.sh full-$S-ui$r > $D/ui$r.log 2>&1
 python3 -c "
import json;d=json.load(open('/home/qa-evidence/full-$S-ui$r/bt1/ui/report.json'));c=d['checks'];print('ui-prod run$r complete',d['complete'],'chromium',sum(x.startswith('chromium') for x in c),'webkit',sum(x.startswith('webkit') for x in c),'errors',len(d['errors']))" >> $F 2>&1
 sed 's/\x1b\[[0-9;]*m//g' $D/ui$r.log | grep -aE '"message"' | head -1 | cut -c1-200 >> $F; done
for r in 1 2; do PROD=0 TESTS=src/test/integration/readiness-shift-concurrency-browser.integration.ts timeout 2400 /home/user/qa-tools/browser.sh full-$S-m$r > $D/m$r.log 2>&1
 python3 -c "
import json;d=json.load(open('/home/qa-evidence/full-$S-m$r/bt0/matrix/report.json'));c=d['checks'];print('matrix-dev run$r complete',d['complete'],'chromium',sum(x.startswith('chromium') for x in c),'webkit',sum(x.startswith('webkit') for x in c),'errors',len(d['errors']))" >> $F 2>&1
 sed 's/\x1b\[[0-9;]*m//g' $D/m$r.log | grep -aE '"message"' | head -1 | cut -c1-200 >> $F; done
cp -r /home/user/qa-tools/sweep/zz-probe /home/user/qa-tools/sweep/vitest.zz-probe.config.mts . && chown -R postgres zz-probe vitest.zz-probe.config.mts; E=/home/qa-evidence/full-$S-sweep; mkdir -p $E; chown -R postgres $E .omo node_modules/.vitest-cache 2>/dev/null
ROUTES='/app /app/inbox /app/exchange /app/requests /app/timecards /app/employees /app/employees/new /app/employees/SWEEP-A /app/employees/SWEEP-A/time-off /app/settings/clocker/pins /app/schedule /app/schedule/publish /app/schedule/new /app/schedule/edit?shiftId=sweep-shift-1 /app/profile /app/clocker-recovery /app/account/delete'
su postgres -s /bin/bash -c "cd /home/user/NEVORA && unset DATABASE_URL && export HOME=/tmp/pghome GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=safe.directory GIT_CONFIG_VALUE_0='*' PLAYWRIGHT_BROWSERS_PATH=/opt/pw-webkit NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE=/home/user/NEVORA/tools/ci-browser-runtime/package.json NEVORA_SWEEP_EVIDENCE=$E/run NEVORA_SWEEP_VIEWS=390,1440 NEVORA_SWEEP_ROUTES='$ROUTES' NEVORA_TEST_PG_BIN=/usr/lib/postgresql/16/bin && node zz-probe/pg-runner.mjs vitest.zz-probe.config.mts" > $E.log 2>&1; echo "sweep=$?" >> $F
rm -rf zz-probe vitest.zz-probe.config.mts
echo "done $(date -u +%T)" >> $F; cat $F
