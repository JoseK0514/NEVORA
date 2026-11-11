import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
import {captureFailure,selectMetadata,sanitize} from './runner-network-failure.mjs';

const sha='93fbf7f32b51503883a66c3af0004de10d62e736';
const env={GITHUB_ACTIONS:'true',RUNNER_OS:'Linux',GITHUB_EVENT_NAME:'push',GITHUB_REF:'refs/tags/candidate/backend-completion/fixture',GITHUB_SHA:sha,NEVORA_CHECKOUT_SHA:sha,NEVORA_INSTALLER_OUTCOME:'failure',GITHUB_RUN_ID:'123',GITHUB_RUN_ATTEMPT:'1',ImageOS:'ubuntu24',ImageVersion:'20261101.360.1',RUNNER_ARCH:'X64',RUNNER_TEMP:'/runner-temp'};
const mirror='https://archive.ubuntu.com/ubuntu/\tpriority:1\nhttps://security.ubuntu.com/ubuntu/\tpriority:2\nhttp://azure.archive.ubuntu.com/ubuntu/\tpriority:3\n';
const sources='Types: deb\nURIs: mirror+file:/etc/apt/apt-mirrors.txt\nSuites: noble noble-updates noble-backports\nComponents: main universe\nSigned-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg\nPrivate-Field: fictional-private\n';
function fixture({run=()=>({status:0,stdout:'ok',stderr:''}),link,mirrors=mirror}={}){
 const files=new Map(),reads=[],calls=[],writes=[];
 const input=new Map([['/etc/apt/apt-mirrors.txt',mirrors],['/etc/resolv.conf','nameserver 127.0.0.53\noptions edns0 trust-ad\nsearch fictional-private.invalid\n'],['/run/systemd/resolve/stub-resolv.conf','nameserver 127.0.0.53\n'],['/etc/nsswitch.conf','passwd: files\nhosts: files dns\n'],['/etc/apt/sources.list.d/ubuntu.sources',sources]]);
 const stat=path=>({mode:path==='/etc/resolv.conf'&&link?0o120777:input.has(path)?0o100644:0o40755,uid:0,gid:0,isFile:()=>input.has(path)&&!(path==='/etc/resolv.conf'&&link),isSymbolicLink:()=>path==='/etc/resolv.conf'&&!!link,isDirectory:()=>!input.has(path)});
 const options={env:{...env},platform:'linux',uid:0,now:()=>new Date('2026-11-11T17:00:00Z'),mkdir:p=>writes.push(p),
  read:p=>{reads.push(p);if(!input.has(p))throw Object.assign(Error('missing'),{code:'ENOENT'});return input.get(p);},
  lstat:stat,readlink:()=>link,write:(p,v)=>{writes.push(p);files.set(p,v);},run:c=>{calls.push(c);return run(c);}};
 return {options,files,reads,calls,writes,receipt:()=>JSON.parse(files.get('/runner-temp/nevora-runner-network-failure/receipt.json'))};
}

test('guards PR/local/root/source/event/installer identity before system reads, output or probes',()=>{
 for(const change of [{platform:'darwin'},{uid:501},{env:{GITHUB_ACTIONS:'false'}},{env:{GITHUB_EVENT_NAME:'pull_request'}},{env:{NEVORA_INSTALLER_OUTCOME:'success'}},{env:{NEVORA_CHECKOUT_SHA:'a'.repeat(40)}},{env:{GITHUB_REF:'refs/tags/diagnostic/backend-network/test'}},{env:{ImageVersion:''}}]){
  const f=fixture();Object.assign(f.options,{...change,env:{...f.options.env,...change.env}});
  assert.throws(()=>captureFailure(f.options),/requires failed push installer on root GitHub Ubuntu with exact checkout/);
  assert.deepEqual(f.reads,[]);assert.deepEqual(f.calls,[]);assert.deepEqual(f.writes,[]);
 }
 for(const ref of ['refs/heads/development','refs/heads/main']){const f=fixture();f.options.env.GITHUB_REF=ref;assert.equal(captureFailure(f.options).exitCode,0);}
});

test('filters resolver/NSS metadata and strips private search/domain and unknown content',()=>{
 const r=selectMetadata('resolver','nameserver 127.0.0.53\nnameserver not-an-address\noptions edns0 trust-ad timeout:2 unknown-private-option\nsearch fictional-secret.invalid\ndomain fictional-secret.invalid\n');
 assert.deepEqual(r,{nameservers:['127.0.0.53'],options:['edns0','trust-ad','timeout:2']});
 assert.equal(selectMetadata('nss','passwd: fictional-private\nhosts: files dns\nshadow: fictional-private\n'),'hosts: files dns');
});

test('retains only selected package-source fields with redaction, excluding inline keys and legacy option dumps',()=>{
 const parsed=selectMetadata('sources',sources+'\nURIs: https://alice:fictional-password@archive.ubuntu.com/ubuntu/?token=fictional-query\nSuites: noble\nSigned-By: -----BEGIN PGP PUBLIC KEY BLOCK-----\n fictional-key-content\n');
 assert.equal(parsed.length,2);assert.equal(parsed[0].Suites,'noble noble-updates noble-backports');
 const out=JSON.stringify(parsed);for(const secret of ['fictional-private','fictional-password','fictional-query','fictional-key-content'])assert.ok(!out.includes(secret),out);
 assert.match(parsed[1]['Signed-By'],/omitted/);
 const legacy=selectMetadata('legacy','deb [arch=amd64 signed-by=/usr/share/keyrings/ubuntu-archive-keyring.gpg private=fictional-private] https://archive.ubuntu.com/ubuntu noble main universe\n# fictional-private\n');
 assert.deepEqual(legacy,[{URIs:'https://archive.ubuntu.com/ubuntu',Suites:'noble',Components:'main universe','Signed-By':'/usr/share/keyrings/ubuntu-archive-keyring.gpg'}]);
});

test('reviewed redaction covers spaced quoted/unquoted credentials and bounds output',()=>{
 for(const input of ['PASSWORD = fictional secret','TOKEN="fictional quoted secret"',"API_KEY : 'fictional quoted secret'",'X-Token: fictional secret','https://alice:fictional-password@archive.ubuntu.com/?token=fictional-query']){
  const out=sanitize(input+'\nDNS archive.ubuntu.com failed');assert.ok(!out.includes('fictional'));assert.match(out,/DNS archive\.ubuntu\.com failed/);
 }
 assert.ok(sanitize('x'.repeat(100000)).length<=9000);
});

test('captures bounded permission/link metadata and follows only fixed resolver targets',()=>{
 const f=fixture({link:'../run/systemd/resolve/stub-resolv.conf'});assert.equal(captureFailure(f.options).exitCode,0);
 const r=f.receipt(),entry=r.permissions.find(x=>x.path==='/etc/resolv.conf');
 assert.equal(entry.mode,'0777');assert.equal(entry.uid,0);assert.equal(entry.gid,0);assert.equal(entry.target,'../run/systemd/resolve/stub-resolv.conf');
 assert.ok(r.permissions.some(x=>x.path==='/run/systemd/resolve'&&x.mode==='0755'));
 assert.ok(f.reads.includes('/run/systemd/resolve/stub-resolv.conf'));assert.ok(!f.reads.includes('/etc/resolv.conf'));
 const blocked=fixture({link:'/root/fictional-private-key'});assert.equal(captureFailure(blocked.options).exitCode,1);
 assert.ok(!blocked.reads.includes('/root/fictional-private-key'));assert.equal(blocked.receipt().metadata.resolver.status,1);
 assert.ok(!f.reads.includes('/usr/share/keyrings/ubuntu-archive-keyring.gpg'));
});

test('unknown mirror inventory retains evidence and refuses every network command without system writes',()=>{
 const f=fixture({mirrors:mirror.replace('azure.archive.ubuntu.com','unknown.invalid')});
 assert.equal(captureFailure(f.options).exitCode,1);assert.equal(f.calls.length,0);
 assert.ok(f.writes.every(p=>p.startsWith('/runner-temp/nevora-runner-network-failure')));
 assert.match(f.receipt().error,/Unexpected Ubuntu mirror inventory/);
});

test('does not read selected content through an unexpected parent-directory symlink',()=>{
 const f=fixture(),original=f.options.lstat;
 f.options.lstat=p=>p==='/etc'?{...original(p),mode:0o120777,isDirectory:()=>false,isSymbolicLink:()=>true}:original(p);
 f.options.readlink=()=>'/root/fictional-private-directory';
 assert.equal(captureFailure(f.options).exitCode,1);assert.deepEqual(f.reads,[]);assert.deepEqual(f.calls,[]);
 assert.match(f.receipt().error,/parent/);
});

test('Azure/AWS probes stay finite/read-only and HEAD retains only allowlisted metadata',()=>{
 for(const mirrors of [mirror,mirror.replace('azure.archive.ubuntu.com','us-east-2.ec2.archive.ubuntu.com')]){
  const f=fixture({mirrors});assert.equal(captureFailure(f.options).exitCode,0);assert.equal(f.calls.length,12);
  assert.deepEqual(f.calls.map(c=>c.seconds),[6,6,6,6,6,6,10,10,10,6,6,6]);
  assert.equal(f.calls.reduce((n,c)=>n+c.seconds+4,0),132);
  assert.ok(f.writes.every(p=>p.startsWith('/runner-temp/nevora-runner-network-failure')));
  assert.ok(!f.calls.some(c=>c.file==='/usr/bin/apt-get'));
  for(const c of f.calls.filter(c=>c.file==='/usr/bin/curl')){
   assert.equal(c.args[c.args.indexOf('--output')+1],'/dev/null');assert.equal(c.args[c.args.indexOf('--max-time')+1],'8');
   assert.deepEqual([...c.args[c.args.indexOf('--write-out')+1].matchAll(/%\{([^}]+)\}/g)].map(m=>m[1]),['http_code','remote_ip','time_namelookup','time_connect','time_appconnect','time_total','ssl_verify_result']);
  }
  assert.equal(f.receipt().identity.source,sha);assert.equal(f.receipt().releaseAcceptance,false);assert.equal(f.receipt().originalInstallerFailure,true);assert.doesNotMatch(f.receipt().result,/PASS/);
 }
});

test('protocol probes use default resolver: UDP never falls back to TCP, TCP uses root and _apt, missing dig is explicit',()=>{
 const f=fixture({run:c=>({status:c.name.startsWith('protocol:')?127:0,stdout:'',stderr:c.name.startsWith('protocol:')?'dig: missing executable':''})});
 assert.equal(captureFailure(f.options).exitCode,127);
 const probes=f.calls.filter(c=>c.name.startsWith('protocol:'));assert.equal(probes.length,3);
 assert.ok(probes[0].args.includes('+notcp')&&probes[0].args.includes('+ignore'));
 assert.ok(probes[1].args.includes('+tcp'));assert.ok(probes[2].args.includes('+tcp')&&probes[2].args.includes('_apt'));
 assert.ok(probes.every(c=>c.args.includes('-r')&&c.args.includes('archive.ubuntu.com.')&&c.args.includes('A')&&c.args.includes('+tries=1')));
 assert.ok(probes.every(c=>!c.args.some(a=>a.startsWith('@')||['-4','-6','+trace'].includes(a))));
 assert.equal(f.receipt().probes.filter(p=>p.name.startsWith('protocol:')&&p.status===127).length,3);
});

test('dig keeps only status/flags/A answer/timing/resolver fields, never arbitrary response content',()=>{
 const wire=';; ->>HEADER<<- opcode: QUERY, status: SERVFAIL, id: 42\n;; flags: qr rd ra tc; QUERY: 1\narchive.ubuntu.com. 10 IN A 91.189.90.11\nfictional-private.invalid. 10 IN TXT \"fictional-secret\"\n;; Query time: 2 msec\n;; SERVER: 127.0.0.53#53(127.0.0.53) (UDP)\n;; COOKIE: fictional-cookie\n';
 const f=fixture({run:c=>({status:0,stdout:c.name.startsWith('protocol:')?wire:'ok',stderr:''})});
 captureFailure(f.options);const p=f.receipt().probes.find(p=>p.name==='protocol:root-udp');
 assert.equal(p.dns.rcode,'SERVFAIL');assert.ok(p.dns.flags.includes('tc'));assert.deepEqual(p.dns.addresses,['91.189.90.11']);
 assert.ok(!JSON.stringify(f.receipt()).includes('fictional-secret'));assert.ok(!JSON.stringify(f.receipt()).includes('fictional-cookie'));
 assert.equal(p.stdout,undefined);assert.equal(f.receipt().releaseAcceptance,false);
});

test('preserves actual probe failures/partial exceptions and sanitized receipts without claiming job recovery',()=>{
 let n=0;const f=fixture({run:()=>{if(++n===3)throw Error('TOKEN = fictional exception secret');return {status:124,stdout:'DNS failed',stderr:'PASSWORD = fictional-secret'};}});
 assert.equal(captureFailure(f.options).exitCode,1);const r=f.receipt();assert.equal(r.probes.length,2);assert.equal(r.probes[0].status,124);
 assert.equal(r.complete,false);assert.ok(!JSON.stringify(r).includes('fictional'));assert.equal(r.originalInstallerFailure,true);
});

test('keeps a real zero-millisecond DNS time rather than treating it as missing',()=>{
 const f=fixture({run:c=>({status:0,stdout:c.name.startsWith('protocol:')?';; Query time: 0 msec\n':'ok',stderr:''})});
 captureFailure(f.options);assert.equal(f.receipt().probes.at(-1).dns.queryMs,0);
});

test('direct CLI is guarded on Mac/non-Actions without performing real probes',()=>{
 const r=spawnSync(process.execPath,[fileURLToPath(new URL('./runner-network-failure.mjs',import.meta.url))],{env:{GITHUB_ACTIONS:'false'},encoding:'utf8',timeout:5000});
 assert.equal(r.status,1);assert.match(r.stderr,/requires failed push installer/);
});

test('workflow allocates tests normally and failure-only capture/artifact without changing installer or management gates',()=>{
 const text=readFileSync(new URL('../workflows/ci.yml',import.meta.url),'utf8');
 const job=text.match(/^  management-review-ui:\n([\s\S]*?)(?=^  phase-d-attendance-ui:)/m)[1];
 assert.match(job,/timeout-minutes: 25/);assert.match(job,/node --test \.github\/scripts\/runner-network-failure\.check\.mjs/);
 assert.ok(job.indexOf('runner-network-failure.check.mjs')<job.indexOf('- name: Install Chromium and WebKit'));
 assert.match(job,/- name: Install Chromium and WebKit\n        id: management_browser_install\n        timeout-minutes: 8\n        run: '"\$NEVORA_PLAYWRIGHT_BIN" install --with-deps chromium webkit'/);
 assert.match(job,/if: \$\{\{ failure\(\) && steps\.management_browser_install\.outcome == 'failure' && github\.event_name == 'push' \}\}/);
 assert.match(job,/if: \$\{\{ always\(\) && steps\.management_browser_install\.outcome == 'failure' && github\.event_name == 'push' \}\}/);
 assert.match(job,/timeout-minutes: 3/);assert.match(job,/NEVORA_CHECKOUT_SHA="\$CHECKOUT_SHA"/);assert.match(job,/test "\$CHECKOUT_SHA" = "\$GITHUB_SHA"/);
 assert.match(job,/retention-days: 14/);assert.match(job,/if-no-files-found: error/);assert.doesNotMatch(job,/continue-on-error/);
 for(const required of ['Management close browser gate','Delegated correction browser gate','Verify management browser source and closure','Upload management review browser evidence'])assert.ok(job.includes(required));
 assert.equal(text.replace(/^  management-review-ui:\n[\s\S]*?(?=^  phase-d-attendance-ui:)/m,'').includes('runner-network-failure'),false);
});

test('source metadata omits unsupported URI schemes without retaining userinfo or query values',()=>{
 for(const scheme of ['ftp','sftp','mirror+ftp','ssh','file','git+ssh','custom+v1']){
  const uri=scheme+'://fictional-user:FictionalCredential123@archive.ubuntu.com/ubuntu/?token=FictionalCredential123';
  const parsed=selectMetadata('sources','URIs: '+uri+'\nSuites: noble\nComponents: main\n');
  const text=JSON.stringify(parsed);assert.ok(!text.includes('FictionalCredential123'),text);assert.ok(!text.includes('fictional-user'),text);
  assert.match(parsed[0].URIs,/omitted/);assert.equal(parsed[0].Suites,'noble');assert.equal(parsed[0].Components,'main');
 }
});

test('supported HTTP URI userinfo is removed while retaining useful archive host/path metadata',()=>{
 for(const scheme of ['http','https']){
  const r=selectMetadata('sources','URIs: '+scheme+'://fictional-user:FictionalCredential123@archive.ubuntu.com/ubuntu/?token=FictionalCredential123\nSuites: noble\n');
  assert.ok(!JSON.stringify(r).includes('FictionalCredential123'));assert.match(r[0].URIs,new RegExp('^'+scheme+'://archive\\.ubuntu\\.com/ubuntu/'));
 }
});

test('unsupported or malformed legacy URI rows are omitted as a whole rather than reclassifying credential fragments',()=>{
 for(const uri of ['ftp://fictional-user:FictionalCredential123@archive.ubuntu.com/ubuntu/','sftp://fictional-user:FictionalCredential123@','mirror+ftp://fictional-user:FictionalCredential123 part@archive.ubuntu.com/','file://fictional-user:FictionalCredential123@archive.ubuntu.com/','ssh://fictional-user:FictionalCredential123@archive.ubuntu.com/','git+ssh://fictional-user:FictionalCredential123@archive.ubuntu.com/']){
  const data=selectMetadata('legacy','deb '+uri+' noble main\n');const text=JSON.stringify(data);
  assert.ok(!text.includes('FictionalCredential123')&&!text.includes('fictional-user')&&!text.includes('part@'),text);
  assert.match(data[0].error,/omitted/);
 }
});

test('generic sanitizer covers composite, non-HTTP and malformed URI authority text across error/log strings',()=>{
 for(const uri of [
  'ftp://fictional-user:FictionalCredential123@archive.ubuntu.com/path?token=FictionalCredential123',
  'sftp://fictional-user:FictionalCredential123@',
  'mirror+ftp://fictional-user:FictionalCredential123 part@archive.ubuntu.com/',
  'ssh://fictional-user:FictionalCredential123@archive.ubuntu.com/',
  'file://fictional-user:FictionalCredential123@archive.ubuntu.com/',
  'ftp:/fictional-user:FictionalCredential123@archive.ubuntu.com/',
  'ssh:fictional-user:FictionalCredential123@archive.ubuntu.com/',
  'custom-v1://fictional-user:FictionalCredential123@archive.ubuntu.com/',
  'git+ssh://fictional-user:FictionalCredential123@archive.ubuntu.com/',
  '7ftp://fictional-user%3AFictionalCredential123@archive.ubuntu.com/',
  'mirror%2bftp://fictional-user%3AFictionalCredential123@archive.ubuntu.com/',
  'https://archive.ubuntu.com/ '+ 'ftp://fictional-user:FictionalCredential123@archive.ubuntu.com/',
 ]){
  const text=sanitize('error: '+uri+'\nDNS archive.ubuntu.com failed; status=124');
  assert.ok(!text.includes('FictionalCredential123')&&!text.includes('fictional-user'),text);
  assert.match(text,/DNS archive\.ubuntu\.com failed; status=124/);assert.ok(text.length<=9000);
 }
});

test('persisted selected fields, links, stderr and validation errors never retain unsupported URI credentials',()=>{
 const uri='sftp://fictional-user:FictionalCredential123@archive.ubuntu.com/path?token=FictionalCredential123';
 const f=fixture({link:uri,run:()=>({status:124,stdout:'DNS failed',stderr:'error '+uri+'\nDNS archive.ubuntu.com failed'})}),read=f.options.read;
 f.options.read=p=>p==='/etc/apt/sources.list.d/ubuntu.sources'?'URIs: '+uri+'\nSuites: noble\nSigned-By: '+uri+'\n':p==='/etc/nsswitch.conf'?'hosts: files dns '+uri+'\n':read(p);
 assert.equal(captureFailure(f.options).exitCode,124);const r=f.receipt(),text=JSON.stringify(r);
 assert.equal(r.probes.length,12);assert.equal(r.probes[0].status,124);assert.ok(!text.includes('FictionalCredential123')&&!text.includes('fictional-user'),text);
 assert.match(r.probes[0].stderr,/DNS archive\.ubuntu\.com failed/);
 for(const bad of [...['ftp','sftp','mirror+ftp','ssh','file','git+ssh'].map(s=>s+'://fictional-user:FictionalCredential123@archive.ubuntu.com/'),'not-a-uri-FictionalCredential123']){
  const rejected=fixture({mirrors:mirror.replace('http://azure.archive.ubuntu.com/ubuntu/',bad)});
  assert.equal(captureFailure(rejected.options).exitCode,1);assert.equal(rejected.calls.length,0);
  assert.equal(rejected.receipt().error,'Unexpected Ubuntu mirror inventory; unvalidated values omitted');
  assert.ok(!JSON.stringify(rejected.receipt()).includes('FictionalCredential123'));
  assert.ok(!JSON.stringify(rejected.receipt()).includes('fictional-user'));
 }
});

test('typed HTTP metadata rejects unsafe authority delimiters and malformed legacy fragments',()=>{
 for(const delimiter of ["'",'"','<','>',' ','\t']){
  const uri='https://user:123'+delimiter+'FictionalCredential123@archive.ubuntu.com/ubuntu/';
  const source=selectMetadata('sources','URIs: '+uri+'\nSuites: noble\nComponents: main\n');
  const legacy=selectMetadata('legacy','deb '+uri+' noble main\n');
  assert.ok(!JSON.stringify(source).includes('FictionalCredential123'));assert.match(source[0].URIs,/omitted/);
  assert.ok(!JSON.stringify(legacy).includes('FictionalCredential123'));assert.match(legacy[0].error,/omitted/);
 }
 const encoded=selectMetadata('sources','URIs: https://user:123%27FictionalCredential123@archive.ubuntu.com/ubuntu/?password=FictionalCredential123\nSuites: noble\n');
 assert.ok(!JSON.stringify(encoded).includes('FictionalCredential123'));assert.match(encoded[0].URIs,/^https:\/\/archive\.ubuntu\.com\/ubuntu\//);
});

test('legacy rows reject path-bearing authority fragments rather than retaining them as package fields',()=>{
 const r=selectMetadata('legacy','deb https://user:123 fictionalcredential123 archive.ubuntu.com/ubuntu/ noble main\n');
 assert.ok(!JSON.stringify(r).includes('fictionalcredential123'));assert.match(r[0].error,/omitted/);
});

test('arbitrary log URI text is omitted as a span, including numeric-port quotes and angle delimiters',()=>{
 for(const delimiter of ["'",'"','<','>',' ','\t']){
  const uri='https://user:123'+delimiter+'FictionalCredential123@archive.ubuntu.com/ubuntu/';
  const out=sanitize('fetch failed: '+uri+'\nDNS archive.ubuntu.com failed; status=124');
  assert.ok(!out.includes('FictionalCredential123'),out);assert.match(out,/DNS archive\.ubuntu\.com failed; status=124/);
  assert.ok(out.length<=9000);
 }
});

test('actual receipt persistence does not leak accepted-HTTP delimiter credentials through any captured sink',()=>{
 for(const delimiter of ["'",'"','<','>',' ']){
  const uri='https://user:123'+delimiter+'FictionalCredential123@archive.ubuntu.com/ubuntu/';
  const f=fixture({link:uri,run:()=>({status:124,stdout:'fetch '+uri,stderr:'failure '+uri+'\nDNS archive.ubuntu.com failed'})}),read=f.options.read;
  f.options.read=p=>p==='/etc/apt/sources.list.d/ubuntu.sources'?'URIs: '+uri+'\nSuites: noble\nSigned-By: '+uri+'\n':p==='/etc/nsswitch.conf'?'hosts: files dns '+uri+'\n':read(p);
  assert.equal(captureFailure(f.options).exitCode,124);const r=f.receipt();
  assert.ok(!JSON.stringify(r).includes('FictionalCredential123'));assert.equal(r.probes.length,12);
  assert.match(r.probes[0].stderr,/DNS archive\.ubuntu\.com failed/);assert.equal(r.originalInstallerFailure,true);
  const bad=fixture({mirrors:mirror.replace('http://azure.archive.ubuntu.com/ubuntu/',uri)});
  assert.equal(captureFailure(bad.options).exitCode,1);assert.equal(bad.calls.length,0);
  assert.ok(!JSON.stringify(bad.receipt()).includes('FictionalCredential123'));
 }
});

test('TEMP wrapper context accepts only its explicit flag and actual diagnostic ref, preserving normal release guards',()=>{
 const ref='refs/tags/diagnostic/management-network/20261111-fixture';
 const f=fixture();Object.assign(f.options.env,{GITHUB_REF:ref,NEVORA_FAILURE_CAPTURE_CONTEXT:'diagnostic-wrapper'});
 assert.equal(captureFailure(f.options).exitCode,0);assert.equal(f.receipt().identity.ref,ref);
 assert.equal(f.receipt().identity.source,sha);assert.equal(f.receipt().identity.checkoutSource,sha);
 assert.equal(f.receipt().identity.executionContext,'diagnostic-wrapper');
 const normal=fixture();captureFailure(normal.options);assert.equal(normal.receipt().identity.executionContext,'release-installer-failure');
 for(const bad of [
  {GITHUB_REF:ref},{NEVORA_FAILURE_CAPTURE_CONTEXT:'diagnostic-wrapper'},
  {GITHUB_REF:ref,NEVORA_FAILURE_CAPTURE_CONTEXT:'other'},
  {GITHUB_REF:'refs/tags/diagnostic/backend-network/fixture',NEVORA_FAILURE_CAPTURE_CONTEXT:'diagnostic-wrapper'},
  {GITHUB_REF:ref,NEVORA_FAILURE_CAPTURE_CONTEXT:'diagnostic-wrapper',NEVORA_CHECKOUT_SHA:'a'.repeat(40)},
  {GITHUB_REF:ref,NEVORA_FAILURE_CAPTURE_CONTEXT:'diagnostic-wrapper',NEVORA_INSTALLER_OUTCOME:'success'},
  {GITHUB_REF:ref,NEVORA_FAILURE_CAPTURE_CONTEXT:'diagnostic-wrapper',GITHUB_EVENT_NAME:'pull_request'},
 ]){
  const negative=fixture();Object.assign(negative.options.env,bad);
  assert.throws(()=>captureFailure(negative.options),/requires failed push installer/);
  assert.deepEqual(negative.reads,[]);assert.deepEqual(negative.calls,[]);assert.deepEqual(negative.writes,[]);
 }
});

function wrapperText(){return readFileSync(new URL('../workflows/management-installer-diagnostic.yml',import.meta.url),'utf8');}
function availability(environment){
 const text=wrapperText(),code=text.match(/          node <<'NODE'\n([\s\S]*?)          NODE/)[1].replace(/^          /gm,'');
 const files=new Map(),created=[],commands=[];
 const context={process:{env:{...env,INSTALLER_OUTCOME:'success',NEVORA_FAILURE_CAPTURE_CONTEXT:'diagnostic-wrapper',...environment},platform:'linux'},require:name=>{
  if(name==='node:fs')return {mkdirSync:p=>created.push(p),writeFileSync:(p,v)=>files.set(p,v)};
  if(name==='node:os')return {release:()=> '6.11.0-fixture'};
  if(name==='node:child_process')return {spawnSync:(file,args,options)=>{commands.push({file,args,options});return {status:environment?.FAKE_OPEN_STATUS??0,signal:null};}};
  if(name==='node:path')return {join:(...v)=>v.join('/').replaceAll('//','/'),isAbsolute:p=>typeof p==='string'&&p.startsWith('/')};
  throw Error('Unexpected module '+name);
 }};
 return {run:()=>runInNewContext(code,context,{timeout:1000}),files,created,commands,exitCode:()=>context.process.exitCode??0};
}

test('wrapper workflow has one bounded diagnostic-only job and failure/outcome artifacts without release work',()=>{
 const text=wrapperText();
 assert.match(text,/tags: \["diagnostic\/management-network\/\*\*"\]/);
 assert.doesNotMatch(text,/workflow_dispatch:|pull_request:|branches:|continue-on-error/);
 assert.match(text,/contents: read/);assert.match(text,/runs-on: ubuntu-24\.04/);assert.match(text,/timeout-minutes: 15/);
 assert.match(text,/timeout-minutes: 8/);assert.match(text,/timeout-minutes: 3/);
 assert.match(text,/NEVORA_FAILURE_CAPTURE_CONTEXT=diagnostic-wrapper/);
 assert.match(text,/if: \$\{\{ failure\(\) && steps\.management_browser_install\.outcome == 'failure' && github\.event_name == 'push' \}\}/);
 assert.match(text,/if: \$\{\{ always\(\) && steps\.management_browser_install\.outcome == 'failure' && github\.event_name == 'push' \}\}/);
 assert.equal((text.match(/if-no-files-found: error/g)||[]).length,2);
 assert.equal((text.match(/retention-days: 14/g)||[]).length,2);
 assert.doesNotMatch(text,/test:release|payroll-postgres|test:mobile|npm run build|Install PostgreSQL|browser gate/);
 assert.match(text,/"\$NEVORA_PLAYWRIGHT_BIN" install --with-deps chromium webkit/);
 for(const file of ['ci.yml','mobile-access.yml','native-android.yml','native-spike.yml']){
  const other=readFileSync(new URL('../workflows/'+file,import.meta.url),'utf8');
  assert.ok(!other.includes('diagnostic/management-network'));
  if(['ci.yml','mobile-access.yml'].includes(file))assert.match(other,/tags: \["candidate\/backend-completion\/\*\*"\]/);
  else assert.match(other,/push:\n    branches: \[development\]/);
 }
});

test('always-outcome producer records healthy availability without product/release acceptance or a failure collector',()=>{
 const ref='refs/tags/diagnostic/management-network/20261111-fixture';
 const f=availability({GITHUB_REF:ref});f.run();
 const data=JSON.parse([...f.files.values()][0]);assert.equal(data.source,sha);assert.equal(data.checkoutSource,sha);assert.equal(data.ref,ref);
 assert.equal(data.executionContext,'diagnostic-wrapper');assert.equal(data.installerOutcome,'success');
 assert.equal(data.failureCollectorExpected,false);assert.equal(data.releaseAcceptance,false);assert.equal(data.productAcceptance,false);
 assert.equal(f.files.size,1);assert.equal(f.created.length,1);
});

test('always-outcome producer records failure/skipped states and rejects forged identity before output',()=>{
 const ref='refs/tags/diagnostic/management-network/20261111-fixture';
 for(const outcome of ['failure','skipped','cancelled','not_started']){
  const f=availability({GITHUB_REF:ref,INSTALLER_OUTCOME:outcome});f.run();
  const r=JSON.parse([...f.files.values()][0]);assert.equal(r.installerOutcome,outcome);assert.equal(r.failureCollectorExpected,outcome==='failure');
  assert.equal(r.releaseAcceptance,false);assert.equal(r.productAcceptance,false);
 }
 for(const change of [{GITHUB_REF:env.GITHUB_REF},{NEVORA_CHECKOUT_SHA:'a'.repeat(40)},{INSTALLER_OUTCOME:'invented'},{GITHUB_EVENT_NAME:'pull_request'},{ImageVersion:''}]){
  const f=availability({GITHUB_REF:ref,...change});assert.throws(()=>f.run(),/Invalid diagnostic wrapper identity/);assert.equal(f.files.size,0);assert.equal(f.created.length,0);
 }
});

test('wrapper supplement records kernel and failure-only zero-byte _apt open without collecting child output',()=>{
 const ref='refs/tags/diagnostic/management-network/20261111-fixture';
 const healthy=availability({GITHUB_REF:ref,OPENAI_API_KEY:'fictional-never-dump'});healthy.run();
 const h=JSON.parse([...healthy.files.values()][0]);assert.equal(h.kernelRelease,'6.11.0-fixture');
 assert.equal(h.resolvOpen.attempted,false);assert.equal(healthy.commands.length,0);assert.ok(![...healthy.files.values()][0].includes('fictional-never-dump'));
 for(const status of [0,1,124]){
  const f=availability({GITHUB_REF:ref,INSTALLER_OUTCOME:'failure',FAKE_OPEN_STATUS:status});f.run();
  const r=JSON.parse([...f.files.values()][0]);assert.equal(r.resolvOpen.status,status);assert.equal(r.resolvOpen.attempted,true);assert.equal(r.resolvOpen.contentCollected,false);assert.equal(f.exitCode(),status);
  assert.equal(f.commands.length,1);const command=f.commands[0];
  assert.equal(command.file,'/usr/bin/sudo');
  assert.deepEqual(Array.from(command.args),['-n','/usr/bin/timeout','--signal=TERM','--kill-after=2s','3s','/usr/bin/sudo','-n','-u','_apt','/usr/bin/head','-c','0','/etc/resolv.conf']);
  assert.equal(command.options.timeout,7000);assert.deepEqual(Array.from(command.options.stdio),['ignore','ignore','ignore']);
  assert.equal(r.releaseAcceptance,false);assert.equal(r.productAcceptance,false);
 }
});
