#!/bin/bash
# after the sweep: item 3 and 4 runs on 0f61b7085, then the 6801e035 baselines
F=/home/qa-evidence/es-after.summary; : > $F
until grep -q "^done" /home/qa-evidence/es-0f61b7085/summary 2>/dev/null; do sleep 30; done
cd /home/user/NEVORA
echo "0f61 runs $(date -u +%T)" >> $F
CLK_ONLY=views,step2 /home/user/qa-tools/clk.sh new-0f61 >> $F 2>&1
/home/user/qa-tools/scan6.sh cr-names-0f61 chromium "NEVORA_SCAN_CLOCKER_FLOW=names NEVORA_SCAN_PUNCH=1 NEVORA_SCAN_PINKEY=1" >> $F 2>&1
/home/user/qa-tools/bill.sh new-0f61 >> $F 2>&1
git checkout -q --detach 6801e035a || { echo checkout-failed >> $F; exit 9; }
echo "6801 runs $(date -u +%T)" >> $F
ES_ROLES=owner ES_VIEWS=390,1440 ES_LANGS=en ES_SPOT=0 ES_ROUTES=/app/settings/payroll,/app/timecards,/app/employees/SWEEP-A,/app/employees/SWEEP-A?edit=clocker,/app/settings/clocker /home/user/qa-tools/es.sh base-6801 >> $F 2>&1
/home/user/qa-tools/bill.sh base-6801 >> $F 2>&1
git checkout -q --detach 0f61b7085
echo "done $(date -u +%T)" >> $F
