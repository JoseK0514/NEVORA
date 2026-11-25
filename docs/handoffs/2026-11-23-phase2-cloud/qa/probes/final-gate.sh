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
/home/user/qa-tools/step1.sh gate-$S > $D/step1.out 2>&1; echo "step1:" >> $F; head -3 $D/step1.out >> $F
/home/user/qa-tools/payfix.sh gate-$S > $D/payfix.out 2>&1; echo "payfix:" >> $F; cat $D/payfix.out >> $F
for r in 1 2 3; do TESTS=src/test/integration/readiness-ui-browser.integration.ts timeout 2400 /home/user/qa-tools/browser.sh full-$S-ui$r > $D/ui$r.log 2>&1
 python3 -c "
import json;d=json.load(open('/home/qa-evidence/full-$S-ui$r/bt1/ui/report.json'));c=d['checks'];print('ui-prod run$r complete',d['complete'],'chromium',sum(x.startswith('chromium') for x in c),'webkit',sum(x.startswith('webkit') for x in c),'errors',len(d['errors']))" >> $F 2>&1
 sed 's/\x1b\[[0-9;]*m//g' $D/ui$r.log | grep -aE '"message"' | head -1 | cut -c1-200 >> $F; done
for r in 1 2; do PROD=0 TESTS=src/test/integration/readiness-shift-concurrency-browser.integration.ts timeout 2400 /home/user/qa-tools/browser.sh full-$S-m$r > $D/m$r.log 2>&1
 python3 -c "
import json;d=json.load(open('/home/qa-evidence/full-$S-m$r/bt0/matrix/report.json'));c=d['checks'];print('matrix-dev run$r complete',d['complete'],'chromium',sum(x.startswith('chromium') for x in c),'webkit',sum(x.startswith('webkit') for x in c),'errors',len(d['errors']))" >> $F 2>&1
 sed 's/\x1b\[[0-9;]*m//g' $D/m$r.log | grep -aE '"message"' | head -1 | cut -c1-200 >> $F; done
echo "done $(date -u +%T)" >> $F; cat $F
