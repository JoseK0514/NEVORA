#!/bin/bash
# payfix.sh <label> : run the clocked-in Payroll export probe on the current checkout (production, https)
L=$1; cd /home/user/NEVORA; [ -d zz-probe ] && rm -r zz-probe; cp -r /home/user/qa-tools/payfix/zz-probe /home/user/qa-tools/payfix/vitest.zz-probe.config.mts . ; chown -R postgres zz-probe vitest.zz-probe.config.mts
E=/home/qa-evidence/payfix-$L; [ -d $E ] && rm -r $E; mkdir -p $E; chown -R postgres $E .omo node_modules/.vitest-cache 2>/dev/null
su postgres -s /bin/bash -c "cd /home/user/NEVORA && unset DATABASE_URL && export HOME=/tmp/pghome GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=safe.directory GIT_CONFIG_VALUE_0='*' PLAYWRIGHT_BROWSERS_PATH=/opt/pw-webkit NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE=/home/user/NEVORA/tools/ci-browser-runtime/package.json NEVORA_PAYFIX_EVIDENCE=$E NEVORA_TEST_PG_BIN=/usr/lib/postgresql/16/bin && node zz-probe/pg-runner.mjs vitest.zz-probe.config.mts" > $E.log 2>&1; echo "rc=$?"
rm -r zz-probe vitest.zz-probe.config.mts
python3 - $E <<'PY'
import json,sys
for r in json.load(open(sys.argv[1]+'/payfix.json')):
  if 'engine' not in r: print('setup',r); continue
  s=r.get('samples') or []
  print(r['engine'],'pass=',r.get('pass'),'historyPass=',r.get('historyPass'),'historyLoaded=',r.get('historyLoaded'),'history=',r.get('historyPresent'),'reasonFields=',r.get('reasonFields'),'error=',r.get('error'),'pageErrors=',len(r.get('pageErrors',[])))
  for x in s: print('   ',x)
  for x in r.get('historySamples') or []: print('    H',x)
PY
