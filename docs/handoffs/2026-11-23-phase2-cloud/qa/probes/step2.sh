#!/bin/bash
S=$1; F=/home/qa-evidence/step2.summary; : > $F; cd /home/user/NEVORA
git checkout -q --detach $S || { echo checkout-failed >> $F; exit 9; }; echo "head $(git rev-parse --short=9 HEAD) $(date -u +%T)" >> $F; D=/home/qa-evidence/s2-$S; mkdir -p $D
git diff --quiet HEAD@{1} HEAD -- package-lock.json 2>/dev/null || { npm ci > $D/npmci.log 2>&1; echo "npmci=$?" >> $F; }
unset DATABASE_URL
timeout 900 npx --no-install tsc --noEmit -p . > $D/tsc.log 2>&1; echo "tsc=$?" >> $F; grep -m5 "error TS" $D/tsc.log >> $F
npx --no-install oxlint --config .oxlintrc.json src/test/integration/readiness-ui-browser.integration.ts src/test/integration/readiness-shift-concurrency-browser.integration.ts src/test/integration/owner-advisor-business-answer-browser.integration.ts src/test/integration/owner-advisor-knowledge-ui-browser.integration.ts scripts/phase-d-browser-qa.mjs scripts/phase-d2-corrections-ui-qa.mjs scripts/phase-d2-ui-remediation-qa.mjs scripts/phase-e-home-browser-scenarios.mjs scripts/phase-d2-corrections-recovery-qa.mjs scripts/phase-d2-missing-time-browser-scenarios.mjs > $D/lint.log 2>&1; echo "lint=$?" >> $F
timeout 1800 node scripts/run-rstest.mjs run src/test > $D/unit.log 2>&1; echo "unit-src/test=$?" >> $F
sed 's/\x1b\[[0-9;]*m//g' $D/unit.log | grep -aE '^### \[F|"failedTests"|"passedTests"' >> $F
rm -rf node_modules/.vitest-cache
for r in 1 2; do PROD=0 timeout 2400 /home/user/qa-tools/browser.sh s2-$S-dev$r > $D/dev$r.log 2>&1
 for f in ui matrix; do python3 -c "
import json;d=json.load(open('/home/qa-evidence/s2-$S-dev$r/bt0/$f/report.json'));c=d['checks'];print('dev run$r $f complete',d['complete'],'chromium',sum(x.startswith('chromium') for x in c),'webkit',sum(x.startswith('webkit') for x in c),'errors',len(d['errors']))" >> $F 2>&1; done
 sed 's/\x1b\[[0-9;]*m//g' $D/dev$r.log | grep -aE '"message"' | head -2 | cut -c1-200 >> $F; done
TESTS=src/test/integration/readiness-ui-browser.integration.ts timeout 2400 /home/user/qa-tools/browser.sh s2-$S-prod > $D/prod.log 2>&1
python3 -c "
import json;d=json.load(open('/home/qa-evidence/s2-$S-prod/bt1/ui/report.json'));c=d['checks'];print('prod ui complete',d['complete'],'chromium',sum(x.startswith('chromium') for x in c),'webkit',sum(x.startswith('webkit') for x in c),'errors',len(d['errors']))" >> $F 2>&1
sed 's/\x1b\[[0-9;]*m//g' $D/prod.log | grep -aE '"message"' | head -1 | cut -c1-200 >> $F
echo "done $(date -u +%T)" >> $F
