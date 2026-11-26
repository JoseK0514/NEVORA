#!/bin/bash
T=$1; F=/home/qa-evidence/queue6-$T.summary; : > $F
until grep -q "^done" /home/qa-evidence/queue5-190866dd0.summary 2>/dev/null; do sleep 20; done
cd /home/user/NEVORA && git fetch -q origin claude-codex-collab-nevora && git checkout -q --detach $T && [ -z "$(git status --porcelain)" ] || { echo bad-checkout >> $F; exit 9; }
echo "step retry $(date -u +%T)" >> $F; /home/user/qa-tools/retry.sh tip-$T >> $F 2>&1
echo "done $(date -u +%T)" >> $F
