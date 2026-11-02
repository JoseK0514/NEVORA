import assert from 'node:assert/strict';
import {resolve,isAbsolute,relative,basename,sep,join} from 'node:path';
import {lstatSync,readFileSync,realpathSync,mkdtempSync,writeFileSync,existsSync,rmSync,openSync,closeSync,statfsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {spawn,spawnSync} from 'node:child_process';
import {createHash,randomBytes} from 'node:crypto';
import {createServer} from 'node:net';
import {Client} from 'pg';
import {pathToFileURL} from 'node:url';
import {captureSource,assertSourceUnchanged,safeEnvironment,superviseOwnedChild,installTerminationHandlers} from './phase-e-owned.mjs';
import {prepareNativeBuild} from './native-build.mjs';
export const captureNativeSource=captureSource;
export const assertNativeSource=assertSourceUnchanged;
export const NATIVE_CONTRACT_CHECKS=Object.freeze(['missing-session','denied-selectors','denied-origin','denied-cross-site','employee-native-session','native-renderer-policy','employee-schedule','employee-authorized-action','owner-native-session','owner-authorized-action','actual-invitation-activation-and-login','employee-owner-route-denied','manager-native-unsupported-web-preserved','lead-native-unsupported-web-preserved','expired-session','revoked-session','sanitized-database-outage-and-recovery']);
export function assertNativeResults(results,expected) {
  assert(['contract','android','ios','all'].includes(expected.platform));
  assert.equal(results.status,'passed');assert.equal(results.ownerId,expected.ownerId);assert.equal(results.checkpoint,expected.checkpoint);
  assert.equal(results.platform,expected.platform);assert.equal(results.ownershipClosed,true);
  const names=[...NATIVE_CONTRACT_CHECKS,...(['android','all'].includes(expected.platform)?['android-full-backend']:[]),...(['ios','all'].includes(expected.platform)?['ios-full-backend']:[])];
  assert(Array.isArray(results.checks));assert.equal(results.checks.length,names.length);
  assert(results.checks.every(check=>check.status==='passed'));
  assert.deepEqual(results.checks.map(check=>check.name).sort(),names.sort(),'Missing, duplicated or unexpected native backend checks');
}
export function parseNativeArguments(args){
  const flags=new Map([['--mode','mode'],['--expected-sha','expectedSha'],['--platform','platform'],['--android-serial','androidSerial'],['--ios-simulator','iosSimulator']]);
  const result={ownershipOnly:false},seen=new Set();
  for(let index=0;index<args.length;index++){
    const flag=args[index];
    if(seen.has(flag))throw Error('Duplicate native runner argument'); seen.add(flag);
    if(flag==='--ownership-only'){result.ownershipOnly=true;continue;}
    const key=flags.get(flag),value=args[++index];
    if(!key||value===undefined||value.startsWith('--'))throw Error('Unknown or incomplete native runner argument');
    result[key]=value;
  }
  if(result.mode!=='owned-local'||!/^[a-f0-9]{40}$/.test(result.expectedSha??''))throw Error('Explicit owned-local mode and exact candidate SHA are required');
  result.platform??='contract';
  if(!['contract','android','ios','all'].includes(result.platform))throw Error('Unknown native platform');
  if(result.ownershipOnly&&result.platform!=='contract')throw Error('Ownership-only verification cannot qualify a native device');
  if(['android','all'].includes(result.platform)){
    const match=/^emulator-(\d{4})$/.exec(result.androidSerial??'');
    if(!match||Number(match[1])<5554||Number(match[1])>5682||Number(match[1])%2)throw Error('Select an owned Android emulator explicitly');
  }else if(result.androidSerial)throw Error('Android target supplied for another platform');
  if(['ios','all'].includes(result.platform)){
    if(!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(result.iosSimulator??''))throw Error('Select an owned iOS simulator explicitly');
    result.iosSimulator=result.iosSimulator.toUpperCase();
  }else if(result.iosSimulator)throw Error('iOS target supplied for another platform');
  return result;
}
export function nativeEnvironment(env=process.env){
  for(const[key,value]of Object.entries(env))if(value&&(/(?:^|_)DATABASE_URL$/.test(key)||key==='NEVORA_OWNED_APP_DATABASE'))throw Error('Refusing inherited database selection; native tests create their own cluster');
  return {...safeEnvironment(env),...Object.fromEntries(['ANDROID_HOME','JAVA_HOME','LANG','LC_ALL'].filter(key=>env[key]!==undefined).map(key=>[key,env[key]])),NEVORA_PAYROLL_ENABLED:'false',NEVORA_OWNER_ADVISOR_ENABLED:'false',NEVORA_NOTIFICATION_DELIVERY_ENABLED:'false'};
}
export function assertNativeCleanup({root,source,marker}){
  if(!isAbsolute(root)||resolve(root)!==root||!/^[a-f0-9]{32}$/.test(marker)||!/^nevora-native-owned-[A-Za-z0-9]+$/.test(basename(root)))throw Error('Invalid native resource receipt');
  const stat=lstatSync(root);
  if(!stat.isDirectory()||stat.isSymbolicLink()||realpathSync(root)!==root||stat.uid!==process.getuid())throw Error('Native resource identity changed');
  const distance=relative(realpathSync(source),root);
  if(!(distance==='..'||distance.startsWith('..'+sep)||isAbsolute(distance)))throw Error('Native resources must be outside application source');
  const path=resolve(root,'native-owner'),proof=lstatSync(path);
  if(!proof.isFile()||proof.isSymbolicLink()||proof.size!==32||readFileSync(path,'utf8')!==marker)throw Error('Native ownership marker changed; refusing cleanup');
}
export function assertNativeProcess(expected,observed){
  if(!observed||!Number.isSafeInteger(expected.pid)||expected.pid<2||!Number.isSafeInteger(expected.port)||expected.port<1||expected.port>65535
    ||!isAbsolute(expected.data)||!Number.isSafeInteger(expected.started)||expected.started<1||!/^[a-f0-9]{64}$/.test(expected.fingerprint)||!/^[a-f0-9]{32}$/.test(expected.marker))throw Error('Invalid owned PostgreSQL process receipt');
  for(const key of ['pid','port','data','started','fingerprint','marker'])assert.equal(observed[key],expected[key],'Owned PostgreSQL identity changed: '+key);
}
export async function stopNativePostgres({lease,observe,verifyRoot,send,waitForExit}) {
  verifyRoot();assertNativeProcess(lease,observe());send('SIGINT');
  if(await waitForExit(15000))return;
  // Only our disposable cluster: an I/O panic can stall fast shutdown in WAL
  // recovery. Reprove the complete lease before PostgreSQL immediate shutdown.
  verifyRoot();assertNativeProcess(lease,observe());send('SIGQUIT');
  if(!await waitForExit(5000))throw Error('Owned PostgreSQL shutdown timed out; data retained');
}
const pause=ms=>new Promise(ready=>setTimeout(ready,ms));
const digest=value=>createHash('sha256').update(value).digest('hex');
async function freePort(){
  const socket=createServer();
  await new Promise((ready,reject)=>{socket.once('error',reject);socket.listen(0,'127.0.0.1',ready);});
  const port=socket.address().port;
  await new Promise((ready,reject)=>socket.close(error=>error?reject(error):ready()));
  return port;
}
function observePostgres(child,data,port,marker){
  if(!child.pid||child.exitCode!==null||child.signalCode!==null)return undefined;
  const lines=readFileSync(join(data,'postmaster.pid'),'utf8').trim().split('\n');
  const processInfo=spawnSync('ps',['-p',String(child.pid),'-o','lstart=,command='],{encoding:'utf8',timeout:2000});
  const environment=spawnSync('ps',['eww','-p',String(child.pid),'-o','command='],{encoding:'utf8',timeout:2000});
  if(processInfo.status!==0||environment.status!==0||!new RegExp('(?:^|\\s)NEVORA_NATIVE_OWNER='+marker+'(?:\\s|$)').test(environment.stdout))throw Error('Cannot prove owned PostgreSQL process');
  if(Number(lines[0])!==child.pid||lines[1]!==data||Number(lines[3])!==port||!processInfo.stdout.includes(data))throw Error('PostgreSQL data/port/creation handle mismatch');
  return {pid:child.pid,data,port,started:Number(lines[2]),fingerprint:digest(processInfo.stdout.trim()),marker};
}
async function ownershipBarrier(report){
  if(!process.send)return;
  await new Promise((ready,reject)=>{
    const finish=error=>{clearTimeout(timer);process.off('message',message);error?reject(error):ready();};
    const message=value=>{if(value?.type==='release-native-ownership'&&value.ownerId===report.ownerId)finish();};
    const timer=setTimeout(()=>finish(Error('Native ownership test barrier timed out')),10000);
    process.on('message',message);
    process.send({type:'native-ownership-ready',ownerId:report.ownerId,root:report.root,port:report.port,checkpoint:report.checkpoint},error=>{if(error)finish(error);});
  });
}
export async function runNativeOwned(args=process.argv.slice(2),ambient=process.env){
  const selection=parseNativeArguments(args),env=nativeEnvironment(ambient),source=realpathSync(process.cwd());
  const custody=captureNativeSource(source,selection.expectedSha),bin=env.NEVORA_TEST_PG_BIN;
  if(!bin||!['initdb','postgres'].every(name=>existsSync(join(bin,name))))throw Error('Select an installed local PostgreSQL bin with NEVORA_TEST_PG_BIN');
  if(!selection.ownershipOnly&&!existsSync(join(source,'scripts/native-backend.mts')))throw Error('Native backend harness missing');
  if(!selection.ownershipOnly){const space=statfsSync(realpathSync(tmpdir()));if(space.bavail*space.bsize<4*1024**3)throw Error('At least 4 GiB free is required before allocating a full-backend test environment');}
  const root=realpathSync(mkdtempSync(join(tmpdir(),'nevora-native-owned-'))),data=join(root,'data'),marker=randomBytes(16).toString('hex');
  writeFileSync(join(root,'native-owner'),marker,{mode:0o600});
  writeFileSync(join(root,'source-custody.json'),JSON.stringify(custody,null,2),{mode:0o600});
  const port=await freePort(),controller=new AbortController(),removeSignals=installTerminationHandlers(signal=>controller.abort(Error('Native run interrupted: '+signal)));
  const report={ownerId:marker,root,port,checkpoint:custody.checkpoint,platform:selection.platform,verification:selection.ownershipOnly?'ownership-only':'full-backend',status:'failed',ownershipClosed:false};
  let postgres,exited,lease,logFd;
  const pgEnv={...env,NEVORA_NATIVE_OWNER:marker};
  try{
    report.nativeBuilds=[];
    if(!selection.ownershipOnly)for(const platform of ['android','ios'])if(selection.platform===platform||selection.platform==='all'){
      assertNativeCleanup({root,source,marker});
      report.nativeBuilds.push(await prepareNativeBuild({source,root,ownerId:marker,checkpoint:custody.checkpoint,platform,env,signal:controller.signal}));
    }
    const init=spawnSync(join(bin,'initdb'),['-D',data,'-U','nevora_native','--auth-local=trust','--auth-host=trust','--encoding=UTF8','--no-locale'],{env:pgEnv,encoding:'utf8',timeout:45000});
    writeFileSync(join(root,'initdb.log'),init.stdout+init.stderr,{mode:0o600});
    if(init.error||init.status!==0)throw Error('Owned PostgreSQL initialization failed; see initdb.log');
    controller.signal.throwIfAborted();
    logFd=openSync(join(root,'postgres.log'),'w',0o600);
    postgres=spawn(join(bin,'postgres'),['-D',data,'-h','127.0.0.1','-p',String(port),'-k',''],{env:pgEnv,stdio:['ignore',logFd,logFd]});
    let spawnFailure;postgres.once('error',error=>{spawnFailure=error;});
    exited=new Promise(ready=>postgres.once('exit',ready));
    const deadline=Date.now()+45000;
    while(true){
      controller.signal.throwIfAborted();
      if(spawnFailure||postgres.exitCode!==null||postgres.signalCode!==null)throw Error('Owned PostgreSQL exited before readiness');
      if(existsSync(join(data,'postmaster.pid'))){
        const current=observePostgres(postgres,data,port,marker);
        if(!lease)lease=current;else assertNativeProcess(lease,current);
        const client=new Client({host:'127.0.0.1',port,user:'nevora_native',database:'postgres',connectionTimeoutMillis:1000});
        let ready=false;
        try{
          await client.connect();
          const result=await client.query("SELECT current_setting('data_directory') AS data,inet_server_port() AS port");
          if(result.rows[0]?.data!==data||result.rows[0]?.port!==port)throw Error('PostgreSQL readiness identity mismatch');
          ready=true;
        }catch(error){if(error.message==='PostgreSQL readiness identity mismatch')throw error;}
        finally{await client.end();}
        if(ready)break;
      }
      if(Date.now()>=deadline)throw Error('Owned PostgreSQL readiness timed out');
      await pause(50);
    }
    assertNativeCleanup({root,source,marker});assertNativeProcess(lease,observePostgres(postgres,data,port,marker));
    Object.assign(report,{postgres:lease,startedAt:new Date().toISOString()});
    writeFileSync(join(root,'ownership.json'),JSON.stringify(report,null,2),{mode:0o600});
    if(selection.ownershipOnly)await ownershipBarrier(report);
    else{
      const childEnv={...env,PHASE_E_OWNER_ID:marker,FUEL_TEST_ALLOW_DESTRUCTIVE_TEARDOWN:'yes',
        FUEL_TEST_DATABASE_URL:`postgresql://nevora_native@127.0.0.1:${port}/nevora_exchange_test_n_${marker.slice(0,12)}`,
        NEVORA_NATIVE_OWNED_ROOT:root,NEVORA_NATIVE_EXPECTED_SHA:custody.checkpoint,NEVORA_NATIVE_PLATFORM:selection.platform,
        ...(selection.androidSerial?{NEVORA_NATIVE_ANDROID_SERIAL:selection.androidSerial}:{}),...(selection.iosSimulator?{NEVORA_NATIVE_IOS_SIMULATOR:selection.iosSimulator}:{})};
      const execution=await superviseOwnedChild({command:process.execPath,args:['--import','./scripts/qa-server-context.mjs','--import','tsx','scripts/native-backend.mts'],cwd:source,env:childEnv,ownerId:marker,timeoutMs:selection.platform==='all'?1800000:900000,signal:controller.signal});
      report.execution=execution;
      if(execution.status!==0||execution.error)throw Error('Native backend verification failed');
      const results=JSON.parse(readFileSync(join(root,'backend-results.json'),'utf8'));
      assertNativeResults(results,{ownerId:marker,checkpoint:custody.checkpoint,platform:selection.platform});
      report.checks=results.checks;
    }
    assertNativeSource(source,custody);report.status='passed';
  }catch(error){report.error=error.message;}
  finally{
    try{
      assertNativeCleanup({root,source,marker});
      if(postgres?.pid&&postgres.exitCode===null&&postgres.signalCode===null){
        if(!lease)lease=observePostgres(postgres,data,port,marker);
        assertNativeProcess(lease,observePostgres(postgres,data,port,marker));
        await stopNativePostgres({lease,observe:()=>observePostgres(postgres,data,port,marker),verifyRoot:()=>assertNativeCleanup({root,source,marker}),
          send:signal=>postgres.kill(signal),waitForExit:async milliseconds=>{
            let timer;try{return await Promise.race([exited.then(()=>true),new Promise(ready=>{timer=setTimeout(()=>ready(false),milliseconds);})]);}finally{clearTimeout(timer);}
          }});
      }
      if(postgres?.pid&&postgres.exitCode===null&&postgres.signalCode===null)throw Error('Live owned PostgreSQL prevents cleanup');
      rmSync(data,{recursive:true,force:true});report.ownershipClosed=true;report.closedAt=new Date().toISOString();
      assertNativeSource(source,custody);report.sourceVerified=true;
    }catch(error){report.status='failed';report.cleanupError=error.message;}
    if(logFd!==undefined)closeSync(logFd);removeSignals();
    writeFileSync(join(root,'result.json'),JSON.stringify(report,null,2),{mode:0o600});
    console.log(JSON.stringify({status:report.status,evidence:root,ownershipClosed:report.ownershipClosed,sourceVerified:report.sourceVerified,error:report.error,cleanupError:report.cleanupError}));
  }
  return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  runNativeOwned().then(result=>{process.exitCode=result.status==='passed'?0:1;if(process.connected)process.disconnect();}).catch(error=>{console.error(error.message);process.exitCode=1;if(process.connected)process.disconnect();});
}
