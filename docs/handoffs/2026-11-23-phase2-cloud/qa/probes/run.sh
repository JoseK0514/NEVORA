#!/bin/bash
# Full QA run at a given sha. Logs under /home/qa-evidence/<sha>/
SHA=$1; D=/home/qa-evidence/$SHA; mkdir -p $D; WT=/home/user/NEVORA; cd $WT
PREV=$(git rev-parse HEAD)
git checkout -q --detach $SHA || exit 9
if ! git diff --quiet $PREV $SHA -- package-lock.json package.json; then npm ci > $D/npmci.log 2>&1; echo "npmci=$?" >> $D/summary; fi
unset DATABASE_URL
timeout 900 npx --no-install tsc --noEmit -p . > $D/tsc.log 2>&1; echo "tsc=$?" >> $D/summary
timeout 600 npx --no-install oxlint --config .oxlintrc.json . > $D/lint.log 2>&1; echo "lint=$?" >> $D/summary
timeout 2700 node scripts/run-rstest.mjs run > $D/unit.log 2>&1; echo "unit=$?" >> $D/summary
rm -rf node_modules/.vitest-cache
timeout 3000 /home/user/qa-tools/browser.sh $SHA > $D/browser.log 2>&1; echo "browser-prod=$?" >> $D/summary
PROD=0 timeout 3000 /home/user/qa-tools/browser.sh $SHA > $D/browser-dev.log 2>&1; echo "browser-dev=$?" >> $D/summary
echo done >> $D/summary
