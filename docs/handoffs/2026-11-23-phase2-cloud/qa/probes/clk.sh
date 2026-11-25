#!/bin/bash
# step1.sh <label>: step-1 screen recheck on the current checkout (production, https)
L=$1; cd /home/user/NEVORA; [ -d zz-probe ] && rm -r zz-probe; cp -r /home/user/qa-tools/clk/zz-probe /home/user/qa-tools/clk/vitest.zz-probe.config.mts . ; chown -R postgres zz-probe vitest.zz-probe.config.mts
E=/home/qa-evidence/clk-$L; [ -d $E ] && rm -r $E; mkdir -p $E; chown -R postgres $E .omo node_modules/.vitest-cache 2>/dev/null
su postgres -s /bin/bash -c "cd /home/user/NEVORA && unset DATABASE_URL && export HOME=/tmp/pghome GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=safe.directory GIT_CONFIG_VALUE_0='*' PLAYWRIGHT_BROWSERS_PATH=/opt/pw-webkit NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE=/home/user/NEVORA/tools/ci-browser-runtime/package.json NEVORA_CLK_EVIDENCE=$E NEVORA_CLK_ONLY=$CLK_ONLY NEVORA_TEST_PG_BIN=/usr/lib/postgresql/16/bin && mkdir -p /tmp/pghome && node zz-probe/pg-runner.mjs vitest.zz-probe.config.mts" > $E.log 2>&1; echo "step1 rc=$?"
rm -r zz-probe vitest.zz-probe.config.mts
sed 's/\x1b\[[0-9;]*m//g' $E.log | grep -aE '"message"' | head -2 | cut -c1-200
