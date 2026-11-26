#!/bin/bash
F=/home/qa-evidence/es-after2.summary; : > $F
until grep -q "^done" /home/qa-evidence/es-after.summary 2>/dev/null; do sleep 30; done
cd /home/user/NEVORA && git fetch -q origin claude-codex-collab-nevora && T=$(git rev-parse --short=9 origin/claude-codex-collab-nevora) && git checkout -q --detach $T || { echo checkout-failed >> $F; exit 9; }
echo "retry on $T $(date -u +%T)" >> $F
/home/user/qa-tools/retry.sh tip-$T >> $F 2>&1
echo "done $(date -u +%T)" >> $F
