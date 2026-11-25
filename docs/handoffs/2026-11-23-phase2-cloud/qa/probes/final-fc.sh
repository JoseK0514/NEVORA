#!/bin/bash
F=/home/qa-evidence/final-fc.summary; : > $F; cd /home/user/NEVORA
until grep -q "^done" /home/qa-evidence/after-fix.summary 2>/dev/null; do sleep 15; done
git fetch -q --no-tags origin claude-codex-collab-nevora; S=fc6e67f2; git checkout -q --detach $S || { echo checkout-failed >> $F; exit 9; }; S=$(git rev-parse --short=9 HEAD); D=/home/qa-evidence/fc-$S; mkdir -p $D
echo "final tip $S $(date -u +%T)" >> $F
unset DATABASE_URL
timeout 900 npx --no-install tsc --noEmit -p . > $D/tsc.log 2>&1; echo "tsc=$?" >> $F
timeout 2700 node scripts/run-rstest.mjs run > $D/unit.log 2>&1; echo "unit=$?" >> $F
sed 's/\x1b\[[0-9;]*m//g' $D/unit.log | grep -aE '^### \[F|"failedTests"|"passedTests"' >> $F
rm -rf node_modules/.vitest-cache
TESTS=src/test/integration/readiness-ui-browser.integration.ts timeout 2400 /home/user/qa-tools/browser.sh fc-$S-ui > $D/ui.log 2>&1
python3 -c "
import json;d=json.load(open('/home/qa-evidence/fc-$S-ui/bt1/ui/report.json'));c=d['checks'];print('ui-prod complete',d['complete'],'chromium',sum(x.startswith('chromium') for x in c),'webkit',sum(x.startswith('webkit') for x in c),'errors',len(d['errors']))" >> $F 2>&1
sed 's/\x1b\[[0-9;]*m//g' $D/ui.log | grep -aE '"message"' | head -1 | cut -c1-200 >> $F
echo "payroll probe $(date -u +%T)" >> $F
/home/user/qa-tools/payfix.sh fc-$S >> $F 2>&1
echo "reach probe $(date -u +%T)" >> $F
[ -d zz-probe ] && rm -r zz-probe; cp -r /home/user/qa-tools/sweep/zz-probe /home/user/qa-tools/sweep/vitest.zz-probe.config.mts . && chown -R postgres zz-probe vitest.zz-probe.config.mts; E=/home/qa-evidence/fc-reach; [ -d $E ] && rm -r $E; mkdir -p $E; chown -R postgres $E .omo node_modules/.vitest-cache 2>/dev/null
su postgres -s /bin/bash -c "cd /home/user/NEVORA && unset DATABASE_URL && export HOME=/tmp/pghome GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=safe.directory GIT_CONFIG_VALUE_0='*' PLAYWRIGHT_BROWSERS_PATH=/opt/pw-webkit NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE=/home/user/NEVORA/tools/ci-browser-runtime/package.json NEVORA_SWEEP_EVIDENCE=$E/run NEVORA_SWEEP_VIEWS=390 NEVORA_SWEEP_ROUTES='/app/requests /app/employees /app/schedule/publish' NEVORA_TEST_PG_BIN=/usr/lib/postgresql/16/bin && node zz-probe/pg-runner.mjs vitest.zz-probe.config.mts" > $E.log 2>&1; echo "reach rc=$?" >> $F
rm -r zz-probe vitest.zz-probe.config.mts
python3 - >> $F <<'PY'
import json
d=json.load(open('/home/qa-evidence/fc-reach/run/sweep.json'))
for r in d['results']:
  L=r.get('layout',{}); print('reach',r['route'],r['view'],'small=',L.get('small'),'error=',r.get('error'))
PY
echo "done $(date -u +%T)" >> $F
