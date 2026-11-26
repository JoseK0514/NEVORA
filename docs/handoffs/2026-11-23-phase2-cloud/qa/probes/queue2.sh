#!/bin/bash
# queue2.sh <tip>: the Spanish delta on the wording tip, after queue.sh finishes
T=$1; F=/home/qa-evidence/queue2-$T.summary; : > $F
until grep -q "^done" /home/qa-evidence/queue-d3ac07e2c.summary 2>/dev/null; do sleep 20; done
cd /home/user/NEVORA && git fetch -q origin claude-codex-collab-nevora && git checkout -q --detach $T || { echo checkout-failed >> $F; exit 9; }
[ -z "$(git status --porcelain)" ] || { echo dirty >> $F; exit 9; }
s(){ echo "step $1 $(date -u +%T)" >> $F; }
s 1-delta-es; ES_ROLES=owner,manager,scoped,employee,lead,public,clocker ES_VIEWS=390,390-200 ES_LANGS=es ES_SPOT=1 /home/user/qa-tools/es.sh delta-$T >> $F 2>&1
s 2-kiosk-es-chromium; /home/user/qa-tools/scan6.sh names-es-$T chromium "NEVORA_SCAN_CLOCKER_FLOW=names NEVORA_SCAN_PUNCH=1 NEVORA_SCAN_PINKEY=1" >> $F 2>&1
s 2-kiosk-es-webkit; /home/user/qa-tools/scan6.sh names-es-$T-webkit webkit "NEVORA_SCAN_CLOCKER_FLOW=names NEVORA_SCAN_PUNCH=1 NEVORA_SCAN_PINKEY=1" >> $F 2>&1
SHEETS=/app/employees/SWEEP-A?edit=clocker,/app/employees/SWEEP-A?edit=1,/app/employees/SWEEP-A?edit=positions,/app/employees/SWEEP-A?edit=rules,/app/employees/new,/app/employees/import,/app/payroll/import,/app/ai-manager/business,/app/ai-manager/knowledge,/app/schedule/edit?shiftId=es-shift-1,/app/schedule/new,/app/updates/compose,/app/settings/locations/new
s 3-en-sheets; ES_ROLES=owner ES_VIEWS=390,390-200,1440 ES_LANGS=en ES_SPOT=0 ES_ROUTES=$SHEETS /home/user/qa-tools/es.sh delta-en-$T >> $F 2>&1
s 4-bill; /home/user/qa-tools/bill.sh new-$T >> $F 2>&1
echo "done $(date -u +%T)" >> $F
