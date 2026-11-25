#!/bin/bash
# bisect good bad ; each step up to 3 readiness-ui dev runs (any fail => bad)
cd /home/user/NEVORA
mapfile -t L < <(git rev-list --reverse --abbrev-commit --abbrev=9 $1..$2)
lo=-1; hi=$((${#L[@]}-1))   # L[hi] known bad
while [ $((hi-lo)) -gt 1 ]; do
  mid=$(((lo+hi)/2)); s=${L[$mid]}; git checkout -q --detach $s; bad=0
  for r in 1 2 3; do
    PROD=0 TESTS=src/test/integration/readiness-ui-browser.integration.ts timeout 1200 /home/user/qa-tools/browser.sh bis-$s-$r > /home/qa-evidence/bis-$s-$r.log 2>&1
    ok=$(python3 -c "import json;print(json.load(open('/home/qa-evidence/bis-$s-$r/bt0/ui/report.json'))['complete'])" 2>/dev/null)
    echo "$s run$r complete=$ok $(date -u +%T)"; [ "$ok" != True ] && { bad=1; break; }
  done
  if [ $bad = 1 ]; then hi=$mid; else lo=$mid; fi
done
echo "FIRST BAD ${L[$hi]} $(git log --format=%s -1 ${L[$hi]})"
