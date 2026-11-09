#!/bin/sh
# Usage: sync.sh <your worktree> <PREVIEW_OUT>
# Copies your worktree's src into your running preview's mirror (the dev server hot-reloads).
# src/lib/db.ts stays the preview's local-database adapter.
set -e
WT="$1"; OUT="$2"
APP=$(ls -d "$OUT"/evidence-*/owned-next-*/app 2>/dev/null | tail -1)
[ -n "$APP" ] || { echo "No running preview under $OUT"; exit 1; }
rsync -a --checksum --exclude 'lib/db.ts' "$WT/src/" "$APP/src/"
echo "synced to $APP"
