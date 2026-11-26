#!/bin/bash
# queue5.sh <tip>: D1 verification and the English stacked sheets, after queue3
T=$1; F=/home/qa-evidence/queue5-$T.summary; : > $F
until grep -q "^done" /home/qa-evidence/queue3-50acd2647.summary 2>/dev/null; do sleep 20; done
cd /home/user/NEVORA && git fetch -q origin claude-codex-collab-nevora && git checkout -q --detach $T && [ -z "$(git status --porcelain)" ] || { echo bad-checkout >> $F; exit 9; }
echo "step d1-sheets $(date -u +%T)" >> $F
ES_ROLES=owner ES_VIEWS=390,390-200,768,1440 ES_LANGS=en,es ES_SPOT=1 ES_ROUTES=/app/employees/SWEEP-A?edit=rules,/app/employees/SWEEP-A?edit=1,/app/employees/SWEEP-A?edit=positions,/app/employees/SWEEP-A?edit=clocker,/app/employees/new,/app/employees/import,/app/payroll/import,/app/ai-manager/business,/app/ai-manager/knowledge /home/user/qa-tools/es.sh d1-$T >> $F 2>&1
echo "done $(date -u +%T)" >> $F
