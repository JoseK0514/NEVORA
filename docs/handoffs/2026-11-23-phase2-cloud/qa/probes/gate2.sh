#!/bin/bash
# gate2.sh <sha>: unit in parallel; ui-prod x3 first, then payroll probe, step1, matrix-dev x2. Checkout already at <sha>.
S=$1; D=/home/qa-evidence/g2-$S; mkdir -p $D; F=$D/summary; : > $F; cd /home/user/NEVORA || exit 1
[ "$(git rev-parse --short=9 HEAD)" = "$S" ] || { echo "HEAD mismatch" >> $F; exit 9; }
echo "head $S start $(date -u +%T)" >> $F; unset DATABASE_URL
( timeout 900 npx --no-install tsc --noEmit -p . > $D/tsc.log 2>&1; echo "tsc=$?" >> $F
  timeout 600 npx --no-install oxlint --config .oxlintrc.json . > $D/lint.log 2>&1; echo "lint=$?" >> $F
  timeout 2700 node scripts/run-rstest.mjs run > $D/unit.log 2>&1; echo "unit=$? $(date -u +%T)" >> $F
  sed 's/\x1b\[[0-9;]*m//g' $D/unit.log | grep -aE '^### \[F|"failedTests"|"passedTests"' >> $F ) &
for r in 1 2 3; do TESTS=src/test/integration/readiness-ui-browser.integration.ts timeout 2400 /home/user/qa-tools/browser.sh g2-$S-ui$r > $D/ui$r.log 2>&1
 python3 -c "
import json;d=json.load(open('/home/qa-evidence/g2-$S-ui$r/bt1/ui/report.json'));c=d['checks'];print('ui-prod run$r complete',d['complete'],'chromium',sum(x.startswith('chromium') for x in c),'webkit',sum(x.startswith('webkit') for x in c),'errors',len(d['errors']),'$(date -u +%T)')" >> $F 2>&1
 sed 's/\x1b\[[0-9;]*m//g' $D/ui$r.log | grep -aE '"message"' | head -1 | cut -c1-200 >> $F; done
/home/user/qa-tools/payfix.sh g2-$S > $D/payfix.out 2>&1; echo "payfix: $(date -u +%T)" >> $F; cat $D/payfix.out >> $F
/home/user/qa-tools/step1.sh g2-$S > $D/step1.out 2>&1; echo "step1: $(date -u +%T)" >> $F; head -3 $D/step1.out >> $F
for r in 1 2; do PROD=0 TESTS=src/test/integration/readiness-shift-concurrency-browser.integration.ts timeout 2400 /home/user/qa-tools/browser.sh g2-$S-m$r > $D/m$r.log 2>&1
 python3 -c "
import json;d=json.load(open('/home/qa-evidence/g2-$S-m$r/bt0/matrix/report.json'));c=d['checks'];print('matrix-dev run$r complete',d['complete'],'chromium',sum(x.startswith('chromium') for x in c),'webkit',sum(x.startswith('webkit') for x in c),'errors',len(d['errors']),'$(date -u +%T)')" >> $F 2>&1
 sed 's/\x1b\[[0-9;]*m//g' $D/m$r.log | grep -aE '"message"' | head -1 | cut -c1-200 >> $F; done
wait; echo "done $(date -u +%T)" >> $F
