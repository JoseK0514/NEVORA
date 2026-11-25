#!/bin/bash
# Wait until $1 (epoch), then fetch every 30 min until the branch moves past $2; run QA; print sha.
NEXT=$1; LAST=$2; END=$(date -u -d '17:30' +%s)
cd /home/user/NEVORA
while true; do
  now=$(date +%s); [ $now -lt $NEXT ] && sleep $((NEXT-now))
  for i in 1 2 3 4; do git fetch -q --no-tags origin claude-codex-collab-nevora && break; sleep $((i*5)); done
  TIP=$(git rev-parse --short=9 origin/claude-codex-collab-nevora)
  if [ "$TIP" != "$LAST" ]; then /home/user/qa-tools/run.sh $TIP; echo "RAN $TIP $(date -u +%T)"; exit 0; fi
  echo "no move at $(date -u +%T)"; NEXT=$((NEXT+1800)); [ $NEXT -gt $END ] && { echo END; exit 0; }
done
