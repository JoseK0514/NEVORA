import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {isAbsolute,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {prioritizeUbuntuArchive} from './ci-ubuntu-mirrors.mjs';

// This collects runner setup evidence. It neither repairs networking nor accepts a release.
export function sanitize(value,limit=8192){
 let text=String(value??'').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'').replace(/[\x00-\x08\x0b-\x1f\x7f]/g,'');
 text=text.replace(/https?:\/\/[^\s"'<>]+/gi,raw=>{
  try{
   const url=new URL(raw);url.username='';url.password='';
   if(url.search)url.search='[REDACTED]';
   if(url.hash)url.hash='[REDACTED]';
   return url.toString();
  }catch{return '[REDACTED URL]';}
 });
 text=text.replace(/^(\s*(?:authorization|proxy-authorization|cookie|set-cookie)\s*:).*$/gim,'$1 [REDACTED]');
 // Credential values may contain whitespace, quotes or truncated/escaped quotes.
 // Keep the key, redact the rest of that line, and preserve other diagnostic lines.
 text=text.replace(/\b([\w-]*(?:token|password|secret|credential|api[-_]?key)[\w-]*[ \t]*[=:][ \t]*)[^\r\n]*/gi,'$1[REDACTED]');
 text=text.replace(/\b(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)\b/g,'[REDACTED]');
 return text.length>limit?text.slice(0,limit)+'\n[OUTPUT TRUNCATED]':text;
}

function assertRunner({env,platform,uid}){
 const valid=platform==='linux'&&uid===0&&env.GITHUB_ACTIONS==='true'&&env.RUNNER_OS==='Linux'
  &&env.GITHUB_EVENT_NAME==='push'&&/^refs\/tags\/diagnostic\/backend-network\/[A-Za-z0-9][A-Za-z0-9._/-]{0,160}$/.test(env.GITHUB_REF??'')
  &&/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??'')&&env.NEVORA_DIAGNOSTIC_CHECKOUT_SHA===env.GITHUB_SHA
  &&/^[1-9]\d{0,19}$/.test(env.GITHUB_RUN_ID??'')&&/^[1-9]\d{0,5}$/.test(env.GITHUB_RUN_ATTEMPT??'')
  &&env.ImageOS==='ubuntu24'&&/^\d{8}\.\d+(?:\.\d+)?$/.test(env.ImageVersion??'')&&env.RUNNER_ARCH==='X64'
  &&typeof env.RUNNER_TEMP==='string'&&isAbsolute(env.RUNNER_TEMP)&&!env.RUNNER_TEMP.includes('\0');
 if(!valid)throw Error('Runner network diagnostic requires a root GitHub Ubuntu diagnostic tag and exact source identity');
}

function execute(command){
 // GNU timeout bounds the process group; the Node deadline is an additional hard stop.
 return spawnSync('/usr/bin/timeout',['--signal=TERM','--kill-after=2s',command.seconds+'s',command.file,...command.args],{
  encoding:'utf8',timeout:(command.seconds+4)*1000,killSignal:'SIGKILL',maxBuffer:65536,stdio:['ignore','pipe','pipe']
 });
}

export function runDiagnostic(options={}){
 const env=options.env??process.env,platform=options.platform??process.platform,uid=options.uid??process.getuid?.();
 // Before directory creation, system reads, mutation or child/network execution.
 assertRunner({env,platform,uid});
 const read=options.read??(path=>readFileSync(path,'utf8'));
 const write=options.write??((path,value)=>writeFileSync(path,value,{mode:0o644}));
 const mkdir=options.mkdir??(path=>mkdirSync(path,{mode:0o755}));
 const run=options.run??execute,now=options.now??(()=>new Date());
 const directory=join(env.RUNNER_TEMP,'nevora-runner-network-diagnostic');
 // Refuse an existing/symlink output directory rather than overwriting shared data.
 mkdir(directory);
 const receipt={schemaVersion:1,kind:'runner-network-diagnostic-only',startedAt:now().toISOString(),complete:false,result:'INCOMPLETE',exitCode:null,
  identity:{source:env.GITHUB_SHA,checkoutSource:env.NEVORA_DIAGNOSTIC_CHECKOUT_SHA,run:env.GITHUB_RUN_ID,attempt:env.GITHUB_RUN_ATTEMPT,ref:sanitize(env.GITHUB_REF),
   imageOS:env.ImageOS,imageVersion:env.ImageVersion,architecture:env.RUNNER_ARCH,platform,uid,releaseAcceptance:false},
  mutations:'Only disposable GitHub VM mirror priorities and standard signed APT index/cache state. No package installation, DNS/proxy/trust change or release acceptance.',
  mirrorPrepared:false,probes:[]};
 const persist=()=>write(join(directory,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
 persist();
 try{
  const original=read('/etc/apt/apt-mirrors.txt');
  // Reuse exactly the existing CI pure validator/preference; no additional mirror.
  const preferred=prioritizeUbuntuArchive(original);
  const urls=preferred.trim().split('\n').map(line=>line.split(/\s+/)[0]);
  receipt.mirrors={before:sanitize(original),after:preferred};
  write('/etc/apt/apt-mirrors.txt',preferred);
  receipt.mirrorPrepared=true;persist();
  const command=(name,file,args,seconds)=>{
   receipt.pendingCommand=name;persist();
   const started=now(),result=run({name,file,args,seconds});
   const status=Number.isInteger(result.status)?result.status:result.error?.code==='ETIMEDOUT'?124:1;
   receipt.probes.push({name,file,args,seconds,status,signal:result.signal??null,errorCode:sanitize(result.error?.code??'',80),
    timedOut:status===124||status===137||result.error?.code==='ETIMEDOUT',startedAt:started.toISOString(),finishedAt:now().toISOString(),
    stdout:sanitize(result.stdout),stderr:sanitize(result.stderr)});
   delete receipt.pendingCommand;persist();
   return status;
  };
  for(const base of urls){
   const host=new URL(base).hostname;
   command('dns:root:'+host,'/usr/bin/getent',['ahostsv4',host],6);
  }
  for(const base of urls){
   const host=new URL(base).hostname;
   // Same bounded NSS probe in APT's acquisition-user context; no user/config change.
   command('dns:_apt:'+host,'/usr/bin/sudo',['-n','-u','_apt','/usr/bin/getent','ahostsv4',host],6);
  }
  for(const base of urls){
   command('head:'+new URL(base).hostname,'/usr/bin/curl',[
    '--head','--fail','--silent','--show-error','--output','/dev/null',
    '--write-out','http_status=%{http_code}\nremote_ip=%{remote_ip}\ntime_namelookup=%{time_namelookup}\ntime_connect=%{time_connect}\ntime_appconnect=%{time_appconnect}\ntime_total=%{time_total}\ntls_verify_result=%{ssl_verify_result}\n',
    '--connect-timeout','4','--max-time','8',base+'dists/noble/InRelease'
   ],10);
  }
  const aptStatus=command('strict-signed-apt-update','/usr/bin/apt-get',['--error-on=any','update'],180);
  // Preserve APT's failure (including timeout) first, then any failed earlier probe.
  receipt.exitCode=aptStatus||receipt.probes.find(probe=>probe.status!==0)?.status||0;
  receipt.complete=true;receipt.result=receipt.exitCode===0?'DIAGNOSTIC_COMPLETED':'FAILURE_OBSERVED';
 }catch(error){
  receipt.error=sanitize(error.message,4096);receipt.exitCode=1;receipt.result='DIAGNOSTIC_ERROR';
 }finally{
  receipt.finishedAt=now().toISOString();persist();
 }
 return {exitCode:receipt.exitCode,receipt};
}

if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 try{
  const result=runDiagnostic();
  console.log(JSON.stringify({kind:'runner-network-diagnostic-only',result:result.receipt.result,exitCode:result.exitCode}));
  process.exitCode=result.exitCode;
 }catch(error){console.error(sanitize(error.message,4096));process.exitCode=1;}
}
