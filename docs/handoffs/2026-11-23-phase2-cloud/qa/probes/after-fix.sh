#!/bin/bash
F=/home/qa-evidence/after-fix.summary; : > $F; cd /home/user/NEVORA
until grep -q "^done" /home/qa-evidence/full-8c9c04c93/summary 2>/dev/null; do sleep 15; done
git checkout -q --detach 8c9c04c93; echo "baseline probe on $(git rev-parse --short=9 HEAD) $(date -u +%T)" >> $F
/home/user/qa-tools/payfix.sh base-8c9c >> $F 2>&1
git fetch -q --no-tags origin claude-codex-collab-nevora; S=4cf11130; git checkout -q --detach $S; D=/home/qa-evidence/fix-$S; mkdir -p $D
echo "fix tip $(git rev-parse --short=9 HEAD) $(date -u +%T)" >> $F
unset DATABASE_URL
timeout 900 npx --no-install tsc --noEmit -p . > $D/tsc.log 2>&1; echo "tsc=$?" >> $F
timeout 2700 node scripts/run-rstest.mjs run > $D/unit.log 2>&1; echo "unit=$?" >> $F
sed 's/\x1b\[[0-9;]*m//g' $D/unit.log | grep -aE '^### \[F|"failedTests"|"passedTests"' >> $F
rm -rf node_modules/.vitest-cache
for r in 1 2 3; do TESTS=src/test/integration/readiness-ui-browser.integration.ts timeout 2400 /home/user/qa-tools/browser.sh fix-$S-ui$r > $D/ui$r.log 2>&1
 python3 -c "
import json;d=json.load(open('/home/qa-evidence/fix-$S-ui$r/bt1/ui/report.json'));c=d['checks'];print('ui-prod run$r complete',d['complete'],'chromium',sum(x.startswith('chromium') for x in c),'webkit',sum(x.startswith('webkit') for x in c),'errors',len(d['errors']))" >> $F 2>&1
 sed 's/\x1b\[[0-9;]*m//g' $D/ui$r.log | grep -aE '"message"' | head -1 | cut -c1-200 >> $F; done
echo "fix probe $(date -u +%T)" >> $F
/home/user/qa-tools/payfix.sh fix-$S >> $F 2>&1
echo "done $(date -u +%T)" >> $F
