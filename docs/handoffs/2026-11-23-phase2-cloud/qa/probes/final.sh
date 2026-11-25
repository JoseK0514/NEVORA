#!/bin/bash
# final.sh <sha>: typecheck, unit, readiness-ui-browser production (https) Chromium+WebKit, one run
S=$1; D=/home/qa-evidence/final-$S; mkdir -p $D; cd /home/user/NEVORA || exit 1
git fetch -q --no-tags origin claude-codex-collab-nevora; PREV=$(git rev-parse HEAD)
git checkout -q --detach $S || exit 9
git diff --quiet $PREV $S -- package-lock.json package.json || { npm ci > $D/npmci.log 2>&1; echo "npmci=$?" >> $D/summary; }
unset DATABASE_URL
timeout 900 npx --no-install tsc --noEmit -p . > $D/tsc.log 2>&1; echo "tsc=$?" >> $D/summary
timeout 2700 node scripts/run-rstest.mjs run > $D/unit.log 2>&1; echo "unit=$?" >> $D/summary
sed 's/\x1b\[[0-9;]*m//g' $D/unit.log | grep -aE '^### \[F|"failedTests"|"passedTests"' >> $D/summary
rm -rf node_modules/.vitest-cache
TESTS=src/test/integration/readiness-ui-browser.integration.ts timeout 2400 /home/user/qa-tools/browser.sh final-$S-bt > $D/browser.log 2>&1; echo "ui-prod=$?" >> $D/summary
python3 -c "
import json;d=json.load(open('/home/qa-evidence/final-$S-bt/bt1/ui/report.json'));c=d['checks'];print('ui-prod complete',d['complete'],'chromium',sum(x.startswith('chromium') for x in c),'webkit',sum(x.startswith('webkit') for x in c),'errors',len(d['errors']))" >> $D/summary 2>&1
sed 's/\x1b\[[0-9;]*m//g' $D/browser.log | grep -aE '"message"' | head -2 | cut -c1-200 >> $D/summary
echo "done $(date -u +%T)" >> $D/summary; cat $D/summary
