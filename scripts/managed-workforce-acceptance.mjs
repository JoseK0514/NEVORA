import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join,isAbsolute} from 'node:path';
import {createServer} from 'node:net';
import {createHash,generateKeyPairSync} from 'node:crypto';
const git=(...args)=>{const r=spawnSync('git',args,{encoding:'utf8',timeout:10000});assert.equal(r.status,0);return r.stdout.trim();};
const source=git('rev-parse','HEAD');assert.equal(git('status','--porcelain'),'','Managed acceptance requires clean committed source');
const output=process.argv[2];assert(output&&isAbsolute(output)&&process.argv.length===3,'Supply a new absolute evidence directory');await mkdir(output,{recursive:false,mode:0o700});
const safe={PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR,NODE_ENV:'production'};
const run=(args,env=safe)=>{const r=spawnSync(process.execPath,args,{env,encoding:'utf8',timeout:60000,maxBuffer:1024*1024});assert.equal(r.status,0,r.stderr);return r.stdout;};
await writeFile(join(output,'build.log'),run(['scripts/build-managed-workforce.mjs']));
const receipt=JSON.parse(await readFile('build/workforce/receipt.json','utf8'));assert.equal(receipt.sourceSha,source);assert.equal(receipt.sourceClean,true);assert.equal(receipt.sha256,createHash('sha256').update(await readFile('build/workforce/host.mjs')).digest('hex'));
const sourceProfile={scopeId:'11111111-1111-4111-8111-111111111111',environment:'test',origin:'https://fictional.portal-staging.nevora.team',portalBaseDomain:'portal-staging.nevora.team',commands:['payroll'],env:{NEVORA_CONTROL_DATABASE_URL:'postgresql://nv_control_worker_t_11111111111141118111111111111111:fictional@ep-dark-mud-bbzmbx2i.c-15.us-east-1.aws.neon.tech/nevora_onboarding_control?sslmode=verify-full',NEVORA_WORKER_ENROLLMENT_ID:'22222222-2222-4222-8222-222222222222',NEVORA_WORKER_RECIPIENT_PRIVATE_KEY:generateKeyPairSync('rsa',{modulusLength:3072,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}}).privateKey,NEVORA_COMMERCE_ENABLED:'true',NEVORA_COMMERCE_API_ORIGIN:'https://br-hidden-mud-bbnc2fxk-commerceapi.compute.c-15.us-east-1.aws.neon.tech',NEVORA_PAYROLL_ENABLED:'true'}};
const preflightEnv={...safe,RENDER_GIT_COMMIT:source,NEVORA_WORKFORCE_ENABLED:'true',NEVORA_WORKFORCE_SOURCE_SHA:source,NEVORA_WORKFORCE_STATE_DIR:join(output,'must-not-create'),NEVORA_WORKFORCE_HEALTH_KEY:Buffer.alloc(32,3).toString('base64url'),NEVORA_WORKFORCE_PROFILES:JSON.stringify([sourceProfile])};
assert.deepEqual(JSON.parse(run(['build/workforce/host.mjs','--validate-config'],preflightEnv)),{state:'valid',enabled:true,profiles:1});
const mixed=spawnSync(process.execPath,['build/workforce/host.mjs','--validate-config'],{env:{...preflightEnv,NEVORA_WORKFORCE_PROFILES:JSON.stringify([{...sourceProfile,env:{...sourceProfile.env,NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY:Buffer.alloc(32,4).toString('base64url')}}])},encoding:'utf8',timeout:5000});assert.equal(mixed.status,1);assert.equal(mixed.stdout,'');assert.equal(mixed.stderr,'managed_workforce_unavailable\n');
const port=await new Promise((ok,bad)=>{const s=createServer();s.once('error',bad);s.listen(0,'127.0.0.1',()=>{const a=s.address();s.close(()=>ok(a.port));});});
let child,exited=false,outputBytes=0,errors='';
try{
 child=spawn(process.execPath,['build/workforce/host.mjs'],{env:{...safe,RENDER_GIT_COMMIT:source,PORT:String(port)},stdio:['ignore','pipe','pipe'],detached:true});
 child.stdout.on('data',chunk=>{outputBytes+=chunk.length;});child.stderr.on('data',chunk=>{if(errors.length<4096)errors+=chunk.toString();});
 const exit=new Promise(ok=>{child.once('error',()=>{exited=true;ok(null);});child.once('close',code=>{exited=true;ok(code);});});
 let ready;const until=Date.now()+15000;
 while(Date.now()<until&&!exited){try{ready=await fetch('http://127.0.0.1:'+port+'/ready',{signal:AbortSignal.timeout(1000)});if(ready.status===200)break;}catch{/* Startup is bounded above. */}await new Promise(r=>setTimeout(r,50));}
 assert.equal(ready?.status,200,errors);assert.deepEqual(await ready.json(),{ready:true});
 for(const [path,expected] of [['/private/health',401],['/run',404],['/ready?command=payroll',404]])assert.equal((await fetch('http://127.0.0.1:'+port+path,{signal:AbortSignal.timeout(1000)})).status,expected);
 const at=Date.now();process.kill(-child.pid,'SIGTERM');
 let timer;const result=await Promise.race([exit,new Promise(ok=>{timer=setTimeout(()=>ok('timeout'),3000);})]);clearTimeout(timer);assert.equal(result,0,'Disabled service must drain cleanly');assert(Date.now()-at<3000);assert.equal(outputBytes,0);assert.equal(errors,'');
 const rejected=spawnSync(process.execPath,['build/workforce/host.mjs'],{env:{...safe,RENDER_GIT_COMMIT:'f'.repeat(40),PORT:String(port)},encoding:'utf8',timeout:5000});assert.equal(rejected.status,1);assert.match(rejected.stderr,/managed_workforce_unavailable/);
 const bundle=join(output,'monitor-bundle');await writeFile(join(output,'monitor-build.log'),run(['scripts/build-neon-onboarding.mjs','--workforce-monitor-only',bundle]));await writeFile(join(output,'monitor-verify.log'),run(['scripts/verify-neon-onboarding.mjs','--workforce-monitor-only',bundle]));
 assert.equal(git('rev-parse','HEAD'),source);assert.equal(git('status','--porcelain'),'');
 await writeFile(join(output,'report.json'),JSON.stringify({sourceSha:source,state:'passed',disabledActualHttp:true,enrolledProfileCompiledPreflight:true,mixedCustodyRejected:true,privateHealthUnauthorized:true,publicExecutionAbsent:true,gracefulShutdown:true,sourceMismatchRejected:true,actualMonitorZipVerified:true,hosted:false,mailSent:false})+'\n');
 console.log(JSON.stringify({sourceSha:source,state:'passed',output}));
}finally{if(child&&!exited)try{process.kill(-child.pid,'SIGKILL');}catch{/* Process already gone. */}}
