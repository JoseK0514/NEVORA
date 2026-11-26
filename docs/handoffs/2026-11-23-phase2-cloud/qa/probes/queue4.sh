#!/bin/bash
# queue4.sh <tip>: the spot rerun (Equipo return focus, Horas y reglas back link), after queue3
T=$1; F=/home/qa-evidence/queue4-$T.summary; : > $F
until grep -q "^done" /home/qa-evidence/queue2-445ab237c.summary 2>/dev/null; do sleep 20; done
cd /home/user/NEVORA && git checkout -q --detach $T && [ -z "$(git status --porcelain)" ] || { echo bad-checkout >> $F; exit 9; }
echo "step spot $(date -u +%T)" >> $F
ES_ROLES=owner ES_VIEWS=390,390-200 ES_LANGS=en,es ES_SPOT=1 ES_ROUTES=/app/employees/SWEEP-A?edit=rules /home/user/qa-tools/es.sh spot-$T >> $F 2>&1
echo "done $(date -u +%T)" >> $F
