import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {runDiagnostic,sanitize} from './ci-runner-network-diagnostic.mjs';

const sha='f093b19770903a828d4f1102e42e83aa29c1e8f2';
const mirrors='http://azure.archive.ubuntu.com/ubuntu/\tpriority:1\nhttps://archive.ubuntu.com/ubuntu/\tpriority:2\nhttps://security.ubuntu.com/ubuntu/\tpriority:3\n';
const environment={GITHUB_ACTIONS:'true',RUNNER_OS:'Linux',GITHUB_EVENT_NAME:'push',GITHUB_REF:'refs/tags/diagnostic/backend-network/fixture',GITHUB_SHA:sha,NEVORA_DIAGNOSTIC_CHECKOUT_SHA:sha,GITHUB_RUN_ID:'12345',GITHUB_RUN_ATTEMPT:'2',RUNNER_TEMP:'/owned-runner-temp',ImageOS:'ubuntu24',ImageVersion:'20261101.360.1',RUNNER_ARCH:'X64'};
function fixture({source=mirrors,run=()=>({status:0,stdout:'ok',stderr:''})}={}){
 const files=new Map(),calls=[],writes=[];
 const options={env:{...environment},platform:'linux',uid:0,
  mkdir:path=>writes.push(path),
  read:path=>{calls.push(['read',path]);if(path==='/etc/apt/apt-mirrors.txt')return source;throw Error('Unexpected read '+path);},
  write:(path,value)=>{writes.push(path);files.set(path,value);},
  run:command=>{calls.push(command);return run(command);},
  now:()=>new Date('2026-11-11T16:00:00.000Z')};
 return {options,files,calls,writes,receipt:()=>JSON.parse(files.get('/owned-runner-temp/nevora-runner-network-diagnostic/receipt.json'))};
}

test('refuses unsupported environment or identity before filesystem, subprocess or network work',()=>{
 for(const change of [{platform:'darwin'},{uid:501},{env:{GITHUB_ACTIONS:'false'}},{env:{GITHUB_EVENT_NAME:'pull_request'}},{env:{GITHUB_REF:'refs/tags/candidate/backend-completion/fixture'}},{env:{GITHUB_SHA:'invalid'}},{env:{NEVORA_DIAGNOSTIC_CHECKOUT_SHA:'a'.repeat(40)}},{env:{GITHUB_RUN_ATTEMPT:'0'}},{env:{ImageVersion:''}},{env:{RUNNER_TEMP:'relative'}}]){
  const f=fixture();Object.assign(f.options,{...change,env:{...f.options.env,...change.env}});
  assert.throws(()=>runDiagnostic(f.options),/requires a root GitHub Ubuntu diagnostic tag and exact source identity/);
  assert.deepEqual(f.calls,[]);assert.deepEqual(f.writes,[]);
 }
});

test('redacts credentials, query/fragment values, auth headers and controls before bounding output',()=>{
 const input='\u001b[31mhttps://alice:fictional-password@archive.ubuntu.com/ubuntu/?token=fictional-query#fictional-fragment\u001b[0m\nAuthorization: Bearer fictional-header\nProxy-Authorization: Basic fictional-proxy\nSet-Cookie: fictional-cookie\nTOKEN=fictional-env';
 const output=sanitize(input);
 for(const secret of ['alice','fictional-password','fictional-query','fictional-fragment','fictional-header','fictional-proxy','fictional-cookie','fictional-env','\u001b'])assert.ok(!output.includes(secret),output);
 assert.match(output,/archive\.ubuntu\.com/);assert.ok(sanitize('x'.repeat(100000)).length<=9000);
});

test('redacts spaced assignments and complete single/double quoted values while retaining other diagnostic lines',()=>{
 const cases=[
  ['PASSWORD = fictional-spaced-secret','PASSWORD = [REDACTED]'],
  ['TOKEN="fictional quoted secret"','TOKEN=[REDACTED]'],
  ["API_SECRET = 'fictional single quoted secret'","API_SECRET = [REDACTED]"],
  ['credential\t:\t"fictional tab separated secret"','credential\t:\t[REDACTED]'],
  ['ACCESS_TOKEN = "fictional \\"escaped quote\\" secret"','ACCESS_TOKEN = [REDACTED]'],
  ["password = 'fictional \\'escaped quote\\' secret'","password = [REDACTED]"],
  ['TOKEN="fictional unterminated quoted secret','TOKEN=[REDACTED]'],
  ["PASSWORD = 'fictional unterminated single secret","PASSWORD = [REDACTED]"],
  ['X-Token: fictional unquoted header secret','X-Token: [REDACTED]'],
  ['X-Api-Key : fictional unquoted api header secret','X-Api-Key : [REDACTED]'],
  ["API_KEY = 'fictional quoted api secret'",'API_KEY = [REDACTED]'],
 ];
 for(const [input,expected] of cases){
  const output=sanitize('DNS archive.ubuntu.com failed; '+input+'; discarded inline data\nstatus=100');
  assert.equal(output,'DNS archive.ubuntu.com failed; '+expected+'\nstatus=100');
  assert.ok(!output.includes('fictional'),output);
 }
 assert.equal(sanitize('TOKEN=\nDNS archive.ubuntu.com failed; status=100'),'TOKEN=[REDACTED]\nDNS archive.ubuntu.com failed; status=100');
});

test('failure receipts redact spaced quoted credentials without changing failure evidence or output bounds',()=>{
 const f=fixture({run:c=>({status:c.file==='/usr/bin/apt-get'?100:0,
  stdout:'Temporary failure resolving archive.ubuntu.com\nTOKEN = "fictional quoted stdout secret"; discarded inline data\nstatus=100',
  stderr:"PASSWORD : 'fictional quoted stderr secret'\nDNS failed"})});
 assert.equal(runDiagnostic(f.options).exitCode,100);
 const receipt=f.receipt();assert.equal(receipt.probes.length,10);assert.equal(receipt.probes.at(-1).status,100);
 assert.ok(!JSON.stringify(receipt).includes('fictional'));assert.equal(receipt.result,'FAILURE_OBSERVED');
 for(const probe of receipt.probes){
  assert.match(probe.stdout,/Temporary failure resolving archive\.ubuntu\.com/);
  assert.match(probe.stdout,/status=100/);assert.match(probe.stderr,/DNS failed/);
  assert.ok(probe.stdout.length<=9000&&probe.stderr.length<=9000);
 }
 assert.ok(sanitize('TOKEN = "'+'fictional '.repeat(15000)+'"; status=100').length<=9000);
});

test('validates before changing mirrors and retains a sanitized refusal without running probes',()=>{
 const f=fixture({source:mirrors.replace('http://azure.archive.ubuntu.com','http://alice:fictional-password@unknown.invalid?token=fictional-query')});
 const result=runDiagnostic(f.options);assert.equal(result.exitCode,1);
 assert.equal(f.calls.filter(c=>typeof c==='object'&&!Array.isArray(c)).length,0);
 assert.ok(!f.files.has('/etc/apt/apt-mirrors.txt'));
 assert.equal(f.receipt().complete,false);assert.match(f.receipt().error,/Unexpected Ubuntu mirror inventory/);
 assert.ok(!JSON.stringify(f.receipt()).includes('fictional-password'));
});

test('Azure and AWS retain only the existing three mirrors and bound every root-context command',()=>{
 for(const source of [mirrors,mirrors.replace('http://azure.archive.ubuntu.com','http://us-east-2.ec2.archive.ubuntu.com')]){
  const f=fixture({source});const result=runDiagnostic(f.options);assert.equal(result.exitCode,0);
  const receipt=f.receipt();assert.equal(receipt.complete,true);assert.equal(receipt.probes.length,10);
  assert.equal(receipt.identity.source,sha);assert.equal(receipt.identity.checkoutSource,sha);assert.equal(receipt.identity.attempt,'2');assert.equal(receipt.identity.imageVersion,'20261101.360.1');
  const commands=f.calls.filter(c=>typeof c==='object'&&!Array.isArray(c));
  assert.equal(commands.length,10);assert.deepEqual(commands.map(c=>c.seconds),[6,6,6,6,6,6,10,10,10,180]);
  assert.equal(commands.filter(c=>c.args.includes('--max-time')).length,3);
  assert.ok(commands.filter(c=>c.args.includes('--max-time')).every(c=>c.args[c.args.indexOf('--max-time')+1]==='8'));
  assert.deepEqual(commands.at(-1).args,['--error-on=any','update']);
  assert.equal(commands.at(-1).file,'/usr/bin/apt-get');
  assert.ok(!commands.some(c=>c.args.some(v=>/--insecure|--resolve|--noproxy|--ipv4|--allow-unauthenticated|install/.test(v))));
  assert.match(f.files.get('/etc/apt/apt-mirrors.txt'),/^https:\/\/archive\.ubuntu\.com\/ubuntu\/\tpriority:1/);
  assert.equal(receipt.identity.releaseAcceptance,false);
 }
});

test('HEAD discards all response headers and emits only fixed allowlisted transport metadata',()=>{
 const f=fixture();assert.equal(runDiagnostic(f.options).exitCode,0);
 const heads=f.calls.filter(c=>c.file==='/usr/bin/curl');assert.equal(heads.length,3);
 for(const command of heads){
  const args=command.args;assert.ok(args.includes('--head'));
  assert.equal(args[args.indexOf('--output')+1],'/dev/null');
  const format=args[args.indexOf('--write-out')+1];
  assert.deepEqual([...format.matchAll(/%\{([^}]+)\}/g)].map(m=>m[1]),['http_code','remote_ip','time_namelookup','time_connect','time_appconnect','time_total','ssl_verify_result']);
  assert.ok(!args.some(a=>['--dump-header','--verbose','--trace','--insecure','--resolve','--noproxy','--ipv4'].includes(a)));
 }
});

test('records missing _apt explicitly without creating it or masking its failed probes',()=>{
 const f=fixture({run:c=>({status:c.file==='/usr/bin/sudo'?1:0,stdout:'',stderr:c.file==='/usr/bin/sudo'?'sudo: unknown user _apt':''})});
 assert.equal(runDiagnostic(f.options).exitCode,1);
 const probes=f.receipt().probes.filter(p=>p.name.startsWith('dns:_apt:'));
 assert.equal(probes.length,3);assert.ok(probes.every(p=>p.status===1&&p.stderr.includes('unknown user _apt')));
 assert.ok(probes.every(p=>p.file==='/usr/bin/sudo'&&p.args.slice(0,4).join(' ')==='-n -u _apt /usr/bin/getent'));
 assert.equal(f.receipt().probes.at(-1).status,0);
});

test('strict APT failure keeps its real status and all preceding failure receipts',()=>{
 const f=fixture({run:c=>({status:c.file==='/usr/bin/apt-get'?100:6,stdout:'',stderr:'https://alice:fictional-password@archive.ubuntu.com/ubuntu/?token=fictional-query\nTemporary failure resolving archive.ubuntu.com'})});
 assert.equal(runDiagnostic(f.options).exitCode,100);
 const r=f.receipt();assert.equal(r.probes.length,10);assert.equal(r.probes.at(-1).status,100);assert.equal(r.result,'FAILURE_OBSERVED');
 assert.equal(r.complete,true);assert.ok(!JSON.stringify(r).includes('fictional-password'));assert.ok(!JSON.stringify(r).includes('fictional-query'));
});

test('probe failures are not relabelled successful when strict APT happens to succeed',()=>{
 const f=fixture({run:c=>({status:c.file==='/usr/bin/getent'?2:0,stdout:'',stderr:''})});
 assert.equal(runDiagnostic(f.options).exitCode,2);assert.equal(f.receipt().probes.at(-1).status,0);
 assert.equal(f.receipt().result,'FAILURE_OBSERVED');
});

test('timeout and unexpected subprocess failure keep partial evidence and stop further work',()=>{
 const timed=fixture({run:c=>({status:c.file==='/usr/bin/apt-get'?124:0,stdout:'',stderr:''})});
 assert.equal(runDiagnostic(timed.options).exitCode,124);assert.equal(timed.receipt().probes.at(-1).timedOut,true);
 let n=0;const failed=fixture({run:()=>{if(++n===3)throw Error('failed https://alice:fictional-password@archive.ubuntu.com/?token=fictional-query');return {status:0,stdout:'ok',stderr:''};}});
 assert.equal(runDiagnostic(failed.options).exitCode,1);assert.equal(failed.receipt().probes.length,2);assert.equal(failed.receipt().complete,false);
 assert.ok(!JSON.stringify(failed.receipt()).includes('fictional-password'));assert.equal(n,3);
});

test('direct CLI refuses this non-Actions process without creating evidence or touching the system',()=>{
 const result=spawnSync(process.execPath,[fileURLToPath(new URL('./ci-runner-network-diagnostic.mjs',import.meta.url))],{env:{GITHUB_ACTIONS:'false',RUNNER_OS:'Linux'},encoding:'utf8',timeout:5000});
 assert.equal(result.status,1);assert.match(result.stderr,/requires a root GitHub Ubuntu diagnostic tag/);
});

test('workflow has only the diagnostic tag trigger, exact checkout, finite job and unconditional evidence retention',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/runner-network-diagnostic.yml',import.meta.url),'utf8');
 assert.match(workflow,/tags: \["diagnostic\/backend-network\/\*\*"\]/);assert.doesNotMatch(workflow,/workflow_dispatch:|pull_request:|branches:/);
 assert.match(workflow,/contents: read/);assert.match(workflow,/runs-on: ubuntu-24\.04/);assert.match(workflow,/timeout-minutes: 6/);
 assert.match(workflow,/persist-credentials: false/);assert.match(workflow,/if: always\(\)/);assert.match(workflow,/retention-days: 14/);assert.match(workflow,/if-no-files-found: error/);
 assert.match(workflow,/test "\$CHECKOUT_SHA" = "\$GITHUB_SHA"/);assert.match(workflow,/NEVORA_DIAGNOSTIC_CHECKOUT_SHA="\$CHECKOUT_SHA"/);
 const actions=[...workflow.matchAll(/uses: ([^\s]+)@([a-f0-9]{40})/g)].map(m=>m[1]);assert.deepEqual(actions,['actions/checkout','actions/setup-node','actions/upload-artifact']);
 assert.doesNotMatch(workflow,/npm |playwright|postgres|continue-on-error|candidate\/backend-completion/);
 for(const name of ['ci.yml','mobile-access.yml']){
  const existing=readFileSync(new URL('../.github/workflows/'+name,import.meta.url),'utf8');
  assert.match(existing,/tags: \["candidate\/backend-completion\/\*\*"\]/);assert.doesNotMatch(existing,/diagnostic\/backend-network/);
 }
});
