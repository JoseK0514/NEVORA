#!/bin/bash
F=/home/qa-evidence/es-after3.summary; : > $F
until grep -q "^done" /home/qa-evidence/es-after2.summary 2>/dev/null; do sleep 30; done
cd /home/user/NEVORA; git fetch -q origin claude-codex-collab-nevora; T=$(git rev-parse --short=9 origin/claude-codex-collab-nevora); git checkout -q --detach $T; echo "delta sweep on $T $(date -u +%T)" >> $F
ES_ROLES=owner,manager,scoped,employee,lead,clocker ES_VIEWS=390,390-200 ES_LANGS=es ES_SPOT=0 ES_ENGINES=chromium,webkit /home/user/qa-tools/es.sh delta-$T >> $F 2>&1
SHEETS=/app/employees/SWEEP-A?edit=clocker,/app/employees/SWEEP-A?edit=1,/app/employees/SWEEP-A?edit=positions,/app/employees/SWEEP-A?edit=rules,/app/employees/new,/app/employees/import,/app/payroll/import,/app/ai-manager/business,/app/ai-manager/knowledge,/app/schedule/edit?shiftId=es-shift-1,/app/schedule/new,/app/updates/compose,/app/settings/locations/new
echo "english sheets $(date -u +%T)" >> $F
ES_ROLES=owner ES_VIEWS=390,390-200,1440 ES_LANGS=en ES_SPOT=0 ES_ENGINES=chromium,webkit ES_ROUTES=$SHEETS /home/user/qa-tools/es.sh delta-en-$T >> $F 2>&1
echo "done $(date -u +%T)" >> $F
