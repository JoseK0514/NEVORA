#!/bin/bash
S=$1; D=/home/qa-evidence/g3-$S; mkdir -p $D; F=$D/summary; : > $F; cd /home/user/NEVORA || exit 1
git checkout -q --detach $S || { echo checkout-failed >> $F; exit 9; }
echo "head $(git rev-parse --short=9 HEAD) start $(date -u +%T)" >> $F; unset DATABASE_URL
( timeout 900 npx --no-install tsc --noEmit -p . > $D/tsc.log 2>&1; echo "tsc=$?" >> $F
  timeout 600 npx --no-install oxlint --config .oxlintrc.json . > $D/lint.log 2>&1; echo "lint=$?" >> $F
  timeout 2700 node scripts/run-rstest.mjs run > $D/unit.log 2>&1; echo "unit=$? $(date -u +%T)" >> $F
  sed 's/\x1b\[[0-9;]*m//g' $D/unit.log | grep -aE '^### \[F|"failedTests"|"passedTests"' >> $F ) &
TESTS=src/test/integration/readiness-ui-browser.integration.ts timeout 2400 /home/user/qa-tools/browser.sh g3-$S-ui1 > $D/ui1.log 2>&1
python3 -c "
import json;d=json.load(open('/home/qa-evidence/g3-$S-ui1/bt1/ui/report.json'));c=d['checks'];print('ui-prod run1 complete',d['complete'],'chromium',sum(x.startswith('chromium') for x in c),'webkit',sum(x.startswith('webkit') for x in c),'errors',len(d['errors']))" >> $F 2>&1
sed 's/\x1b\[[0-9;]*m//g' $D/ui1.log | grep -aE '"message"' | head -1 | cut -c1-200 >> $F
/home/user/qa-tools/rel2.sh g3-$S > $D/rel2.out 2>&1; echo "rel2: $(date -u +%T)" >> $F; cat $D/rel2.out >> $F
wait; echo "done $(date -u +%T)" >> $F
