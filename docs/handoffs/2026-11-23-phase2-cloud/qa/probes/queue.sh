#!/bin/bash
# queue.sh <tip>: the lead's resume queue, in order, on one commit
T=$1; F=/home/qa-evidence/queue-$T.summary; : > $F
cd /home/user/NEVORA && git fetch -q origin claude-codex-collab-nevora && git checkout -q --detach $T || { echo checkout-failed >> $F; exit 9; }
[ -z "$(git status --porcelain)" ] || { echo dirty >> $F; exit 9; }
s(){ echo "step $1 $(date -u +%T)" >> $F; }
s 1-webkit-rest; ES_ENGINES=webkit ES_ROLES=employee,public,clocker ES_SPOT=0 /home/user/qa-tools/es.sh rest-$T >> $F 2>&1
s 2-overlaps-lowfix-spot; ES_ROLES=owner,employee,lead,public,clocker ES_ROUTES=/app/my-time,/app/schedule,/privacy,/support,/clocker/not-a-real-key ES_SPOT=1 /home/user/qa-tools/es.sh confirm-$T >> $F 2>&1
s 3-clk; CLK_ONLY=views,step2 /home/user/qa-tools/clk.sh new-$T >> $F 2>&1
s 3-scan6; /home/user/qa-tools/scan6.sh cr-names-$T chromium "NEVORA_SCAN_CLOCKER_FLOW=names NEVORA_SCAN_PUNCH=1 NEVORA_SCAN_PINKEY=1" >> $F 2>&1
s 3-bill; /home/user/qa-tools/bill.sh new-$T >> $F 2>&1
git checkout -q --detach 6801e035a || { echo checkout-6801-failed >> $F; exit 9; }
s 3-base-es-6801; ES_ROLES=owner ES_VIEWS=390,1440 ES_LANGS=en ES_SPOT=0 ES_ROUTES=/app/settings/payroll,/app/timecards,/app/employees/SWEEP-A,/app/employees/SWEEP-A?edit=clocker,/app/settings/clocker /home/user/qa-tools/es.sh base-6801 >> $F 2>&1
s 3-base-bill-6801; /home/user/qa-tools/bill.sh base-6801 >> $F 2>&1
git checkout -q --detach $T
s 3-new-es-en; ES_ROLES=owner ES_VIEWS=390,1440 ES_LANGS=en ES_SPOT=0 ES_ROUTES=/app/settings/payroll,/app/timecards,/app/employees/SWEEP-A,/app/employees/SWEEP-A?edit=clocker,/app/settings/clocker /home/user/qa-tools/es.sh new-en-$T >> $F 2>&1
s 4-retry; /home/user/qa-tools/retry.sh tip-$T >> $F 2>&1
echo "done $(date -u +%T)" >> $F
