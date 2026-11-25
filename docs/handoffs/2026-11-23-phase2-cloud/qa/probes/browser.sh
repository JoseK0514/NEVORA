#!/bin/bash
# Usage: browser.sh <label> ; runs readiness browser tests on a production build (Chromium + WebKit) as postgres.
L=$1; OUT=/home/qa-evidence/$L/bt${PROD:-1}; WT=/home/user/NEVORA
rm -rf $OUT; mkdir -p $OUT/ui $OUT/matrix; chown -R postgres $OUT /home/qa-evidence
mkdir -p $WT/.omo/evidence $WT/node_modules/.vitest-cache; chown -R postgres $WT/.omo $WT/node_modules/.vitest-cache
cd $WT
su postgres -s /bin/bash -c "cd $WT && unset DATABASE_URL && export HOME=/tmp/pghome GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=safe.directory GIT_CONFIG_VALUE_0='*' PLAYWRIGHT_BROWSERS_PATH=/opt/pw-webkit NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE=$WT/tools/ci-browser-runtime/package.json NEVORA_OWNED_APP_PRODUCTION=${PROD:-1} NEVORA_READINESS_UI_EVIDENCE=$OUT/ui NEVORA_READINESS_MATRIX_EVIDENCE=$OUT/matrix NEVORA_TEST_PG_BIN=/usr/lib/postgresql/16/bin && mkdir -p /tmp/pghome && node scripts/payroll-postgres.mjs vitest.all-ui-browser.config.mts ${TESTS:-src/test/integration/readiness-ui-browser.integration.ts src/test/integration/readiness-shift-concurrency-browser.integration.ts}"
