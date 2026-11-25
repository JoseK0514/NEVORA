#!/bin/bash
# confirm.sh <sha>: unit, readiness-ui production x1, reach probe /app/requests (empty, full) + /app/schedule/publish at 390
F=/home/qa-evidence/confirm.summary; : > $F; cd /home/user/NEVORA
git fetch -q --no-tags origin claude-codex-collab-nevora; git checkout -q --detach $1 || { echo checkout-failed >> $F; exit 9; }; S=$(git rev-parse --short=9 HEAD); D=/home/qa-evidence/cf-$S; mkdir -p $D
echo "tip $S $(date -u +%T)" >> $F; unset DATABASE_URL
timeout 2700 node scripts/run-rstest.mjs run > $D/unit.log 2>&1; echo "unit=$?" >> $F
sed 's/\x1b\[[0-9;]*m//g' $D/unit.log | grep -aE '^### \[F|"failedTests"|"passedTests"' >> $F
rm -rf node_modules/.vitest-cache
TESTS=src/test/integration/readiness-ui-browser.integration.ts timeout 2400 /home/user/qa-tools/browser.sh cf-$S-ui > $D/ui.log 2>&1
python3 -c "
import json;d=json.load(open('/home/qa-evidence/cf-$S-ui/bt1/ui/report.json'));c=d['checks'];print('ui-prod complete',d['complete'],'chromium',sum(x.startswith('chromium') for x in c),'webkit',sum(x.startswith('webkit') for x in c),'errors',len(d['errors']))" >> $F 2>&1
sed 's/\x1b\[[0-9;]*m//g' $D/ui.log | grep -aE '"message"' | head -1 | cut -c1-200 >> $F
for L in 0 1; do
 [ -d zz-probe ] && rm -r zz-probe; cp -r /home/user/qa-tools/sweep/zz-probe /home/user/qa-tools/sweep/vitest.zz-probe.config.mts . && chown -R postgres zz-probe vitest.zz-probe.config.mts; E=/home/qa-evidence/cf-reach-$L; [ -d $E ] && rm -r $E; mkdir -p $E; chown -R postgres $E .omo node_modules/.vitest-cache 2>/dev/null
 R='/app/requests'; [ $L = 0 ] && R='/app/requests /app/schedule/publish /app/schedule/publish?week=2026-11-30'
 su postgres -s /bin/bash -c "cd /home/user/NEVORA && unset DATABASE_URL && export HOME=/tmp/pghome GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=safe.directory GIT_CONFIG_VALUE_0='*' PLAYWRIGHT_BROWSERS_PATH=/opt/pw-webkit NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE=/home/user/NEVORA/tools/ci-browser-runtime/package.json NEVORA_SWEEP_EVIDENCE=$E/run NEVORA_SWEEP_VIEWS=390 NEVORA_SWEEP_LEAVE=$L NEVORA_SWEEP_ROUTES='$R' NEVORA_TEST_PG_BIN=/usr/lib/postgresql/16/bin && node zz-probe/pg-runner.mjs vitest.zz-probe.config.mts" > $E.log 2>&1; echo "reach leave=$L rc=$?" >> $F
 rm -r zz-probe vitest.zz-probe.config.mts
 python3 - $E $L >> $F <<'PY'
import json,sys
d=json.load(open(sys.argv[1]+'/run/sweep.json'))
print('  setup',[x for x in d['setupLog'] if 'time off' in x])
for r in d['results']: L=r.get('layout',{}); print('  reach',r['route'],r['view'],'requests' if sys.argv[2]=='1' else 'empty','small=',L.get('small'),'axe=',[a['id'] for a in r.get('axe',[])],'error=',r.get('error'))
PY
done
echo "done $(date -u +%T)" >> $F; cat $F
