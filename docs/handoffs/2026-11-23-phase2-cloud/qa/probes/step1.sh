#!/bin/bash
# step1.sh <label>: step-1 screen recheck on the current checkout (production, https)
L=$1; cd /home/user/NEVORA; [ -d zz-probe ] && rm -r zz-probe; cp -r /home/user/qa-tools/step1/zz-probe /home/user/qa-tools/step1/vitest.zz-probe.config.mts . ; chown -R postgres zz-probe vitest.zz-probe.config.mts
E=/home/qa-evidence/step1-$L; [ -d $E ] && rm -r $E; mkdir -p $E; chown -R postgres $E .omo node_modules/.vitest-cache 2>/dev/null
su postgres -s /bin/bash -c "cd /home/user/NEVORA && unset DATABASE_URL && export HOME=/tmp/pghome GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=safe.directory GIT_CONFIG_VALUE_0='*' PLAYWRIGHT_BROWSERS_PATH=/opt/pw-webkit NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE=/home/user/NEVORA/tools/ci-browser-runtime/package.json NEVORA_SWEEP_EVIDENCE=$E/run NEVORA_SWEEP_VIEWS=390,1440 NEVORA_SWEEP_LOGINS=QAOWNER,QA-DANI NEVORA_SWEEP_ROUTES_OWNER='/app/requests /app /app/inbox /app/schedule/publish' NEVORA_SWEEP_ROUTES_DANI='/app/requests /app /app/inbox' NEVORA_TEST_PG_BIN=/usr/lib/postgresql/16/bin && mkdir -p /tmp/pghome && node zz-probe/pg-runner.mjs vitest.zz-probe.config.mts" > $E.log 2>&1; echo "step1 rc=$?"
rm -r zz-probe vitest.zz-probe.config.mts
sed 's/\x1b\[[0-9;]*m//g' $E.log | grep -aE '"message"' | head -2 | cut -c1-200
python3 - $E <<'PY'
import json,sys
d=json.load(open(sys.argv[1]+'/run/sweep.json'))
print('setup',d['setupLog'])
for r in d['results']:
  if r.get('route')=='legacy-phone-edit': print('LEGACY',{k:r.get(k) for k in ('phoneShown','errors','db','pass','error')}); continue
  L=r.get('layout',{}); print(r.get('login'),r.get('phase'),r['route'],r['view'],'ovf=',L.get('overflowX'),'small=',L.get('small'),'axe=',[a['id'] for a in r.get('axe',[])],'h1=',L.get('h1'),'err=',r.get('error'))
  print('    counts=',r.get('counts')); print('    text=',(r.get('text') or '')[:260])
PY
