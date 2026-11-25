#!/bin/bash
cd /home/user/NEVORA; F=/home/qa-evidence/ip-trace.summary; : > $F
until grep -q "^done" /home/qa-evidence/full-13509ca2d/summary 2>/dev/null; do sleep 15; done
git checkout -q --detach 8b563f995 && echo "candidate $(git rev-parse --short=9 HEAD) $(date -u +%T)" >> $F
timeout 900 npx --no-install tsc --noEmit -p . > /home/qa-evidence/ip-tsc.log 2>&1; echo "ip tsc=$?" >> $F
for r in 1 2 3 4 5; do TESTS=src/test/integration/readiness-ui-browser.integration.ts timeout 2400 /home/user/qa-tools/browser.sh ip-$r > /home/qa-evidence/ip-$r.log 2>&1
 python3 -c "
import json;d=json.load(open('/home/qa-evidence/ip-$r/bt1/ui/report.json'));c=d['checks'];print('ip-prod run$r complete',d['complete'],'chromium',sum(x.startswith('chromium') for x in c),'webkit',sum(x.startswith('webkit') for x in c),'errors',len(d['errors']))" >> $F 2>&1
 sed 's/\x1b\[[0-9;]*m//g' /home/qa-evidence/ip-$r.log | grep -aE '"message"' | head -1 | cut -c1-160 >> $F; done
git checkout -q --detach 13509ca2d && echo "trace on $(git rev-parse --short=9 HEAD) $(date -u +%T)" >> $F
for r in 1 2 3 4; do rm -rf zz-probe vitest.zz-probe.config.mts; cp -r /home/user/qa-tools/trace/zz-probe /home/user/qa-tools/trace/vitest.zz-probe.config.mts . ; chown -R postgres zz-probe vitest.zz-probe.config.mts
 E=/home/qa-evidence/trace-$r; rm -rf $E; mkdir -p $E; chown -R postgres $E .omo node_modules/.vitest-cache 2>/dev/null
 su postgres -s /bin/bash -c "cd /home/user/NEVORA && unset DATABASE_URL && export HOME=/tmp/pghome GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=safe.directory GIT_CONFIG_VALUE_0='*' PLAYWRIGHT_BROWSERS_PATH=/opt/pw-webkit NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE=/home/user/NEVORA/tools/ci-browser-runtime/package.json NEVORA_OWNED_APP_PRODUCTION=1 NEVORA_READINESS_UI_EVIDENCE=$E NEVORA_TEST_PG_BIN=/usr/lib/postgresql/16/bin && node zz-probe/pg-runner.mjs vitest.zz-probe.config.mts" > $E.log 2>&1
 rm -rf zz-probe vitest.zz-probe.config.mts
 ok=$(python3 -c "import json;print(json.load(open('$E/report.json'))['complete'])" 2>/dev/null); echo "trace run$r complete=$ok" >> $F
 [ "$ok" = "False" ] && break; done
echo "done $(date -u +%T)" >> $F
