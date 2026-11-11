import {constants,openSync,readSync,closeSync,fstatSync,lstatSync,readlinkSync,mkdirSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {dirname,isAbsolute,join,resolve} from 'node:path';
import {isIP} from 'node:net';
import {pathToFileURL} from 'node:url';
import {prioritizeUbuntuArchive} from '../../scripts/ci-ubuntu-mirrors.mjs';

// Reviewed b43d9035 sanitizer, copied because the combined source has no diagnostic helper.
export function sanitize(value,limit=8192){
 let text=String(value??'').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'').replace(/[\x00-\x08\x0b-\x1f\x7f]/g,'');
 text=text.replace(/https?:\/\/[^\s"'<>]+/gi,raw=>{
  try{const url=new URL(raw);url.username='';url.password='';if(url.search)url.search='[REDACTED]';if(url.hash)url.hash='[REDACTED]';return url.toString();}
  catch{return '[REDACTED URL]';}
 });
 text=text.replace(/^(\s*(?:authorization|proxy-authorization|cookie|set-cookie)\s*:).*$/gim,'$1 [REDACTED]');
 text=text.replace(/\b([\w-]*(?:token|password|secret|credential|api[-_]?key)[\w-]*[ \t]*[=:][ \t]*)[^\r\n]*/gi,'$1[REDACTED]');
 text=text.replace(/\b(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)\b/g,'[REDACTED]');
 return text.length>limit?text.slice(0,limit)+'\n[OUTPUT TRUNCATED]':text;
}

const RESOLVERS=['/run/systemd/resolve/stub-resolv.conf','/run/systemd/resolve/resolv.conf'];
const CONTENT=['/etc/resolv.conf','/etc/nsswitch.conf','/etc/apt/apt-mirrors.txt','/etc/apt/sources.list.d/ubuntu.sources','/etc/apt/sources.list'];
const PERMISSIONS=[...CONTENT,...RESOLVERS,'/','/etc','/etc/apt','/etc/apt/sources.list.d','/run','/run/systemd','/run/systemd/resolve','/usr','/usr/share','/usr/share/keyrings','/usr/share/keyrings/ubuntu-archive-keyring.gpg'];
const FIELDS=['URIs','Suites','Components','Signed-By'];
const HEAD_FORMAT='http_status=%{http_code}\nremote_ip=%{remote_ip}\ntime_namelookup=%{time_namelookup}\ntime_connect=%{time_connect}\ntime_appconnect=%{time_appconnect}\ntime_total=%{time_total}\ntls_verify_result=%{ssl_verify_result}\n';

export function selectMetadata(kind,input){
 const text=String(input);if(Buffer.byteLength(text)>32768)throw Error('Selected metadata exceeds 32768 bytes');
 if(kind==='resolver'){
  const nameservers=[],options=[];
  for(const raw of text.split(/\r?\n/)){
   const line=raw.split('#')[0].trim(),parts=line.split(/\s+/);
   if(parts[0]==='nameserver'&&isIP(parts[1]??''))nameservers.push(parts[1]);
   if(parts[0]==='options')options.push(...parts.slice(1).filter(p=>/^(?:(?:ndots|timeout|attempts):\d{1,3}|rotate|single-request(?:-reopen)?|no-tld-query|use-vc|edns0|trust-ad|no-aaaa|inet6|no-reload|debug|no-check-names|ip6-dotint|ip6-bytestring|no-ip6-dotint)$/.test(p)));
  }
  return {nameservers:nameservers.slice(0,8),options:options.slice(0,24)};
 }
 if(kind==='nss')return sanitize(text.split(/\r?\n/).find(line=>/^\s*hosts\s*:/.test(line))?.split('#')[0].trim()??'hosts line not present',1024);
 if(kind==='legacy')return text.split(/\r?\n/).filter(l=>/^\s*deb(?:-src)?\s/.test(l)).slice(0,16).map(line=>{
  const m=line.split('#')[0].match(/^\s*deb(?:-src)?\s+(?:\[([^\]]*)\]\s+)?(\S+)\s+(\S+)(?:\s+(.*))?$/);
  if(!m)return {error:'Unparsed legacy row; raw content omitted'};
  const row={URIs:sanitize(m[2],2048),Suites:sanitize(m[3],1024),Components:sanitize(m[4]??'',1024)};
  const key=m[1]?.match(/\bsigned-by=([^\s\]]+)/)?.[1];if(key)row['Signed-By']=sanitize(key,1024);
  return row;
 });
 if(kind!=='sources')throw Error('Unsupported metadata selector');
 return text.split(/\r?\n\s*\r?\n/).filter(section=>section.trim()).slice(0,16).map(section=>{
  const fields={};let current=null;
  for(const line of section.split(/\r?\n/)){
   if(/^\s*#/.test(line))continue;
   const m=line.match(/^([A-Za-z][A-Za-z-]*):[ \t]*(.*)$/);
   if(m){current=FIELDS.includes(m[1])?m[1]:null;if(current)fields[current]=m[2];}
   else if(current&&/^[ \t]/.test(line))fields[current]+='\n'+line.trim();
  }
  return Object.fromEntries(Object.entries(fields).map(([key,value])=>[key,key==='Signed-By'&&(/[\r\n]/.test(value)||value.includes('-----BEGIN'))?'[inline signing key omitted]':sanitize(value.replace(/\s+/g,' ').trim(),2048)]));
 }).filter(row=>Object.keys(row).length);
}

function readBounded(path){
 const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
 try{
  if(!fstatSync(fd).isFile())throw Error('Selected path is not a regular file');
  const bytes=Buffer.alloc(32769);const length=readSync(fd,bytes,0,bytes.length,0);
  if(length>32768)throw Error('Selected metadata exceeds 32768 bytes');
  return bytes.subarray(0,length).toString('utf8');
 }finally{closeSync(fd);}
}

function guard({env,platform,uid}){
 const ref=env.GITHUB_REF??'';
 const pushRef=['refs/heads/development','refs/heads/main'].includes(ref)||/^refs\/tags\/candidate\/backend-completion\/[A-Za-z0-9][A-Za-z0-9._/-]{0,160}$/.test(ref);
 if(!(platform==='linux'&&uid===0&&env.GITHUB_ACTIONS==='true'&&env.RUNNER_OS==='Linux'&&env.GITHUB_EVENT_NAME==='push'&&pushRef
  &&env.NEVORA_INSTALLER_OUTCOME==='failure'&&/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??'')&&env.GITHUB_SHA===env.NEVORA_CHECKOUT_SHA
  &&/^[1-9]\d{0,19}$/.test(env.GITHUB_RUN_ID??'')&&/^[1-9]\d{0,5}$/.test(env.GITHUB_RUN_ATTEMPT??'')
  &&env.ImageOS==='ubuntu24'&&/^\d{8}\.\d+(?:\.\d+)?$/.test(env.ImageVersion??'')&&env.RUNNER_ARCH==='X64'
  &&typeof env.RUNNER_TEMP==='string'&&isAbsolute(env.RUNNER_TEMP)&&!env.RUNNER_TEMP.includes('\0')))
  throw Error('Collector requires failed push installer on root GitHub Ubuntu with exact checkout');
}

function execute(command){
 return spawnSync('/usr/bin/timeout',['--signal=TERM','--kill-after=2s',command.seconds+'s',command.file,...command.args],{
  encoding:'utf8',timeout:(command.seconds+4)*1000,killSignal:'SIGKILL',maxBuffer:65536,stdio:['ignore','pipe','pipe']
 });
}

function dnsSummary(raw){
 const text=String(raw??'');const rcode=text.match(/;; ->>HEADER<<-.*status:\s*([A-Z0-9]+)/)?.[1]??null;
 const flags=(text.match(/;; flags:\s*([^;]*)/)?.[1]??'').split(/\s+/).filter(f=>['qr','aa','tc','rd','ra','ad','cd'].includes(f));
 const addresses=[...text.matchAll(/^archive\.ubuntu\.com\.\s+\d+\s+IN\s+A\s+([0-9.]+)\s*$/gm)].map(m=>m[1]).filter(ip=>isIP(ip)===4).slice(0,24);
 const server=text.match(/;; SERVER:\s*([0-9a-fA-F:.]+)#(\d+)/);
 const query=text.match(/;; Query time:\s*(\d+)\s*msec/);
 return {rcode,flags,addresses,queryMs:query?Number(query[1]):null,serverAddress:server&&isIP(server[1])?server[1]:null,serverPort:server?Number(server[2]):null};
}

export function captureFailure(options={}){
 const env=options.env??process.env;guard({env,platform:options.platform??process.platform,uid:options.uid??process.getuid?.()});
 const read=options.read??readBounded,write=options.write??((p,v)=>writeFileSync(p,v,{mode:0o644})),mkdir=options.mkdir??(p=>mkdirSync(p,{mode:0o755}));
 const lstat=options.lstat??lstatSync,readlink=options.readlink??readlinkSync,run=options.run??execute,now=options.now??(()=>new Date());
 const output=join(env.RUNNER_TEMP,'nevora-runner-network-failure');mkdir(output);
 const receipt={schemaVersion:1,kind:'failed-installer-network-capture-only',originalInstallerFailure:true,releaseAcceptance:false,complete:false,result:'CAPTURE_INCOMPLETE',exitCode:null,
  identity:{source:env.GITHUB_SHA,checkoutSource:env.NEVORA_CHECKOUT_SHA,run:env.GITHUB_RUN_ID,attempt:env.GITHUB_RUN_ATTEMPT,ref:sanitize(env.GITHUB_REF),imageOS:env.ImageOS,imageVersion:env.ImageVersion,architecture:env.RUNNER_ARCH,uid:0},
  startedAt:now().toISOString(),mutations:'Owned RUNNER_TEMP receipt only; no system, mirror, resolver, package, trust or proxy mutation.',permissions:[],metadata:{},probes:[]};
 const persist=()=>write(join(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');persist();
 try{
  for(const path of PERMISSIONS){
   try{
    const s=lstat(path),entry={path,status:0,mode:(s.mode&0o7777).toString(8).padStart(4,'0'),uid:s.uid,gid:s.gid,type:s.isSymbolicLink()?'symlink':s.isFile()?'file':s.isDirectory()?'directory':'other'};
    if(entry.type==='symlink'){const target=readlink(path);if(target.length>1024)throw Error('Symlink target too long');entry.target=sanitize(target,1024);entry.allowedResolverTarget=RESOLVERS.includes(resolve(dirname(path),target));}
    receipt.permissions.push(entry);
   }catch(error){receipt.permissions.push({path,status:1,errorCode:sanitize(error.code??'',80),error:sanitize(error.message,1024)});}
  }
  persist();
  const safeParents=path=>{
   for(let parent=dirname(path);;parent=dirname(parent)){
    const entry=receipt.permissions.find(p=>p.path===parent);
    if(entry?.status!==0||entry.type!=='directory')throw Error('Selected metadata parent is unavailable or not a real directory: '+parent);
    if(parent==='/')break;
   }
  };
  const selectedRead=path=>{
   safeParents(path);
   const entry=receipt.permissions.find(p=>p.path===path);if(entry?.status!==0)throw Error('Selected metadata path unavailable: '+path);
   if(entry.type==='file')return read(path);
   if(entry.type==='symlink'&&entry.allowedResolverTarget){
    const target=resolve(dirname(path),entry.target),actual=receipt.permissions.find(p=>p.path===target);
    if(actual?.type==='file'&&actual.status===0){safeParents(target);return read(target);}
   }
   throw Error('Selected metadata path is not a regular file or allowed resolver link: '+path);
  };
  for(const [key,path,kind] of [['resolver','/etc/resolv.conf','resolver'],['nss','/etc/nsswitch.conf','nss'],['ubuntuSources','/etc/apt/sources.list.d/ubuntu.sources','sources'],['legacySources','/etc/apt/sources.list','legacy']]){
   try{receipt.metadata[key]={status:0,data:selectMetadata(kind,selectedRead(path))};}
   catch(error){receipt.metadata[key]={status:1,error:sanitize(error.message,1024)};}
  }
  persist();
  const mirrors=selectedRead('/etc/apt/apt-mirrors.txt');if(Buffer.byteLength(mirrors)>4096)throw Error('Mirror inventory exceeds limit');
  const canonical=prioritizeUbuntuArchive(mirrors),urls=canonical.trim().split('\n').map(line=>line.split(/\s+/)[0]);
  receipt.mirrors={validatedInventory:sanitize(mirrors),probeOrder:urls};persist();
  const command=(name,file,args,seconds)=>{
   receipt.pendingCommand=name;persist();const started=now(),r=run({name,file,args,seconds});
   const status=Number.isInteger(r.status)?r.status:r.error?.code==='ETIMEDOUT'?124:1;
   const entry={name,file,args,seconds,status,signal:r.signal??null,errorCode:sanitize(r.error?.code??'',80),timedOut:[124,137].includes(status)||r.error?.code==='ETIMEDOUT',startedAt:started.toISOString(),finishedAt:now().toISOString(),stderr:sanitize(r.stderr)};
   if(name.startsWith('protocol:'))entry.dns=dnsSummary(r.stdout);else entry.stdout=sanitize(r.stdout);
   receipt.probes.push(entry);delete receipt.pendingCommand;persist();
  };
  for(const base of urls)command('dns:root:'+new URL(base).hostname,'/usr/bin/getent',['ahostsv4',new URL(base).hostname],6);
  for(const base of urls)command('dns:_apt:'+new URL(base).hostname,'/usr/bin/sudo',['-n','-u','_apt','/usr/bin/getent','ahostsv4',new URL(base).hostname],6);
  for(const base of urls)command('head:'+new URL(base).hostname,'/usr/bin/curl',['--head','--fail','--silent','--show-error','--output','/dev/null','--write-out',HEAD_FORMAT,'--connect-timeout','4','--max-time','8',base+'dists/noble/InRelease'],10);
  // ISC BIND 9 dig: no @server uses resolv.conf; -r ignores user .digrc overrides.
  // +ignore prevents automatic TCP retry of truncated UDP; no resolver/config change.
  const dig=['-r','archive.ubuntu.com.','A','+timeout=2','+tries=1','+noall','+comments','+answer','+stats'];
  command('protocol:root-udp','/usr/bin/dig',[...dig,'+notcp','+ignore'],6);
  command('protocol:root-tcp','/usr/bin/dig',[...dig,'+tcp'],6);
  command('protocol:_apt-tcp','/usr/bin/sudo',['-n','-u','_apt','/usr/bin/dig',...dig,'+tcp'],6);
  receipt.incompleteMetadata=receipt.metadata.resolver.status!==0||receipt.metadata.nss.status!==0||(receipt.metadata.ubuntuSources.status!==0&&receipt.metadata.legacySources.status!==0);
  receipt.exitCode=receipt.probes.find(p=>p.status!==0)?.status||(receipt.incompleteMetadata?1:0);
  receipt.complete=true;receipt.result='CAPTURE_COMPLETE';
 }catch(error){receipt.error=sanitize(error.message,4096);receipt.exitCode=1;receipt.result='CAPTURE_ERROR';}
 finally{receipt.finishedAt=now().toISOString();persist();}
 return {exitCode:receipt.exitCode,receipt};
}

if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 try{const result=captureFailure();console.log(JSON.stringify({kind:'failed-installer-network-capture-only',result:result.receipt.result,exitCode:result.exitCode,originalInstallerFailure:true}));process.exitCode=result.exitCode;}
 catch(error){console.error(sanitize(error.message,4096));process.exitCode=1;}
}
