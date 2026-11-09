#!/usr/bin/env python3
"""Independent acceptance invocation recorder. Never edits repository inputs."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import sys
import time

ROOT = Path('/workspace/NEVORA')
OUT = Path(sys.argv[3])
CANDIDATE = sys.argv[2]
BASE = 'e7f1c76804aae3bfe8897388824194d53607bd8a'
PG_BIN = Path('/workspace/scratch/nevora-runtime/node_modules/@embedded-postgres/linux-x64/native/bin')
PLAYWRIGHT = '/opt/codex/cua_node/lib/node_modules/playwright/package.json'

def stamp():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

def write(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n')

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT).decode()

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def input_files():
    paths = git('ls-files', '-z').split('\0')
    return sorted(p for p in paths if p and (p.startswith(('src/', 'public/', 'scripts/', 'db/')) or '/' not in p and (p.endswith(('.ts', '.tsx', '.mjs', '.mts', '.json')) or p == 'next-env.d.ts')))

def snapshot():
    return {p: digest(ROOT / p) for p in input_files()}

def proc_snapshot():
    result=[]
    for p in Path('/proc').glob('[0-9]*'):
        try:
            cmd=(p/'cmdline').read_bytes().replace(b'\0',b' ').decode(errors='replace').strip()
            stat=(p/'stat').read_text().split(') ',1)[1].split()
            if not cmd or stat[0] == 'Z':
                continue
            if 'nevora-payroll-owned-' in cmd or 'owned-next-' in cmd or 'vitest' in cmd or 'payroll-postgres.mjs' in cmd:
                result.append({'pid':int(p.name),'ppid':int(stat[1]),'pgrp':int(stat[2]),'state':stat[0],'cmdline':cmd})
        except (FileNotFoundError,ProcessLookupError,PermissionError):
            pass
    return result

def port_open(port):
    with socket.socket() as s:
        s.settimeout(.3)
        return s.connect_ex(('127.0.0.1',int(port))) == 0

gate = sys.argv[1]
dest=OUT/gate
dest.mkdir(parents=True, exist_ok=False)
env={
    'HOME':os.environ['HOME'],
    'PATH':os.environ['PATH'],
    'TMPDIR':'/tmp',
    'LD_LIBRARY_PATH':'/workspace/scratch/nevora-runtime/browser-libs/usr/lib/x86_64-linux-gnu',
    'PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS':'1',
    'NEVORA_TEST_PG_BIN':str(PG_BIN),
    'NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE':PLAYWRIGHT,
}
browser_evidence={
    'NEVORA_EMPLOYEE_PROFILE_EVIDENCE':'profile',
    'NEVORA_EMPLOYEE_MESSAGES_EVIDENCE':'messages',
    'NEVORA_EMPLOYEE_MESSAGES_REVIEW_EVIDENCE':'review',
    'NEVORA_EMPLOYEE_HOURS_EVIDENCE':'hours',
    'NEVORA_EMPLOYEE_PLANNING_EVIDENCE':'planning',
    'NEVORA_EMPLOYEE_CREATION_EVIDENCE':'creation',
    'NEVORA_EMPLOYEE_RESPONSES_EVIDENCE':'responses',
    'NEVORA_EMPLOYEE_MOBILE_EVIDENCE':'mobile',
}
if gate in ['combined','profile']:
    for variable, directory in browser_evidence.items():
        path=dest/directory
        path.mkdir()
        env[variable]=str(path)
    if gate=='combined':
        canonical_evidence=dest/'phase-e'
        canonical_evidence.mkdir()
        env['PHASE_E_EVIDENCE_DIR']=str(canonical_evidence)
    argv=['node','scripts/payroll-postgres.mjs','vitest.employee-mobile-profile.config.mts']
    if gate=='profile':
        argv.append('src/test/integration/employee-mobile-profile.integration.ts')
    elif gate=='affected':
        argv.extend(['src/test/integration/employee-mobile-responses.integration.ts','src/test/integration/employee-mobile-planning.integration.ts'])
    elif gate=='requests':
        argv.append('src/test/integration/employee-mobile-requests.integration.ts')
elif gate == 'units':
    saved=json.loads((ROOT/'docs/execution/employee-mobile-communications/evidence-record/independent-qa-remediation/8435c3d8/units/invocation.json').read_text())
    argv=saved['argv']
    assert sum(a.endswith(('.test.ts','.test.tsx')) for a in argv)==77
    write(dest/'saved-invocation.json',saved)
    argv=list(argv)
    argv.insert(argv.index('--no-file-parallelism'),'src/components/employee-mobile/profile.test.tsx')
elif gate == 'typescript':
    argv=['./node_modules/.bin/tsc','--noEmit','--incremental','false']
elif gate == 'eslint':
    changed=git('diff','--name-only','--diff-filter=ACMR',BASE+'..HEAD','--','src','scripts','*.ts','*.tsx','*.mjs','*.mts').splitlines()
    files=[p for p in changed if p.endswith(('.ts','.tsx','.mjs','.mts')) and (p.startswith(('src/','scripts/')) or '/' not in p)]
    assert files
    write(dest/'changed-files.json',{'base':BASE,'candidate':CANDIDATE,'files':files})
    argv=['./node_modules/.bin/eslint',*files]
else:
    raise ValueError(gate)

assert git('rev-parse','HEAD').strip()==CANDIDATE
assert not git('diff','--name-only','HEAD','--','src','public','scripts','db','package.json','package-lock.json','tsconfig.json','next-env.d.ts','next.config.ts','vitest.employee-mobile-profile.config.mts','vitest.employee-mobile-communications.config.mts').strip()
before=snapshot()
write(dest/'source-before.json',before)
initial_clusters={str(p) for p in Path('/tmp').glob('nevora-payroll-owned-*')}
initial_processes=proc_snapshot()
if initial_clusters or initial_processes:
    raise RuntimeError('Competing runtime detected; no acceptance command launched: '+json.dumps({'clusters':sorted(initial_clusters),'processes':initial_processes}))
invocation={'gate':gate,'candidate':CANDIDATE,'base':BASE,'branch':git('branch','--show-current').strip(),'cwd':str(ROOT),'argv':argv,'env':env,'startedAt':stamp(),'initialProcesses':initial_processes,'initialClusters':sorted(initial_clusters),'sourceInputCount':len(before),'gitIndexHash':digest(ROOT/'.git/index')}
write(dest/'invocation.json',invocation)
print(json.dumps({'gate':gate,'stage':'started','argv':argv,'evidence':str(dest)},separators=(',',':')),flush=True)
observed_clusters={}
observed_changes=[]
start=time.monotonic()
with (dest/'stdout.log').open('wb') as log, (dest/'observations.jsonl').open('w') as observations:
    child=subprocess.Popen(argv,cwd=ROOT,env=env,stdout=log,stderr=subprocess.STDOUT)
    write(dest/'process.json',{'pid':child.pid,'startedAt':stamp()})
    next_observation=0
    while child.poll() is None:
        elapsed=time.monotonic()-start
        if elapsed>=next_observation:
            entry={'at':stamp(),'elapsedSeconds':round(elapsed,3),'processes':proc_snapshot(),'clusters':[]}
            for cluster in Path('/tmp').glob('nevora-payroll-owned-*'):
                if str(cluster) in initial_clusters:
                    continue
                try:
                    pidfile=cluster/'data/postmaster.pid'
                    if not pidfile.exists():
                        continue
                    lines=pidfile.read_text().splitlines()
                    if len(lines)<4:
                        continue
                    item={'directory':str(cluster),'owner':(cluster/'owner').read_text(),'pid':int(lines[0]),'data':lines[1],'port':int(lines[3]),'postmasterOpts':(cluster/'data/postmaster.opts').read_text().strip(),'portOpen':port_open(lines[3])}
                    observed_clusters[str(cluster)]=item
                    probe="const {Client}=require('/workspace/NEVORA/node_modules/pg');const c=new Client({host:'127.0.0.1',port:Number(process.argv[1]),user:'nevora_test',database:'postgres',connectionTimeoutMillis:3000,statement_timeout:3000});(async()=>{try{await c.connect();console.log(JSON.stringify((await c.query(\"SELECT datname AS name,oid::int AS oid,shobj_description(oid,'pg_database') AS marker FROM pg_database ORDER BY datname\")).rows));}finally{await c.end();}})().catch(e=>{console.error(String(e));process.exitCode=1;});"
                    query_result=subprocess.run(['node','-e',probe,lines[3]],env=env,capture_output=True,timeout=5)
                    item['queryExit']=query_result.returncode
                    item['databases']=json.loads(query_result.stdout) if query_result.returncode==0 else []
                    if query_result.returncode:
                        item['queryDiagnostic']=query_result.stderr.decode(errors='replace')
                    entry['clusters'].append(item)
                except (FileNotFoundError,ValueError,subprocess.TimeoutExpired) as error:
                    entry['clusters'].append({'directory':str(cluster),'observationRace':str(error)})
            current=snapshot()
            changes=[p for p in set(before)|set(current) if before.get(p)!=current.get(p)]
            entry['sourceChanges']=changes
            observed_changes.extend(changes)
            observations.write(json.dumps(entry)+'\n')
            observations.flush()
            next_observation=elapsed+5
        time.sleep(1)
    code=child.wait()

after=snapshot()
write(dest/'source-after.json',after)
closure=[]
for path,item in observed_clusters.items():
    try:
        os.kill(item['pid'],0)
        running=True
        stat=Path('/proc')/str(item['pid'])/'stat'
        if stat.exists() and stat.read_text().split(') ',1)[1].startswith('Z '):
            running=False
    except ProcessLookupError:
        running=False
    closure.append({'directory':path,'directoryExists':Path(path).exists(),'pid':item['pid'],'livePid':running,'port':item['port'],'portOpen':port_open(item['port'])})
text=(dest/'stdout.log').read_text(errors='replace')
clean=re.sub(r'\x1b\[[0-9;]*[A-Za-z]','',text)
summary=[line for line in clean.splitlines() if re.search(r'(Test Files|Tests\s+|Duration|FAIL|Error:|failed|Owned cluster|PASS|Passed)',line)]
result={'gate':gate,'candidate':git('rev-parse','HEAD').strip(),'cwd':str(ROOT),'argv':argv,'startedAt':invocation['startedAt'],'completedAt':stamp(),'exitCode':code,'durationSeconds':round(time.monotonic()-start,3),'sourceUnchanged':before==after,'observedSourceChanges':sorted(set(observed_changes)),'gitIndexUnchanged':invocation['gitIndexHash']==digest(ROOT/'.git/index'),'branchUnchanged':invocation['branch']==git('branch','--show-current').strip(),'clusterClosure':closure,'finalProcesses':proc_snapshot(),'summaryLines':summary,'stdoutSha256':digest(dest/'stdout.log')}
write(dest/'result.json',result)
print(json.dumps(result,indent=2),flush=True)
sys.exit(code if code else 0 if before==after and not observed_changes else 2)
