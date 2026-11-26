#!/bin/bash
# queue3.sh <tip>: Try again on the lead's fix, after queue2 finishes
T=$1; F=/home/qa-evidence/queue3-$T.summary; : > $F
until grep -q "^done" /home/qa-evidence/queue2-445ab237c.summary 2>/dev/null; do sleep 20; done
cd /home/user/NEVORA && git fetch -q origin claude-codex-collab-nevora && git checkout -q --detach $T || { echo checkout-failed >> $F; exit 9; }
[ -z "$(git status --porcelain)" ] || { echo dirty >> $F; exit 9; }
echo "step retry $(date -u +%T)" >> $F; /home/user/qa-tools/retry.sh tip-$T >> $F 2>&1
echo "done $(date -u +%T)" >> $F
