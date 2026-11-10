import 'server-only';
import {randomBytes} from 'node:crypto';
import {signHealthRequest,authenticHealthResponse} from './managed-host';
import {validatedMailTransport} from '../auth/mail-transport.server';
export type MonitorConfig={enabled:boolean;mailEnabled:boolean;origin:string;sourceSha:string;healthKey:string;expectedCommands:number;databaseUrl:string;role:string};
export type MonitorCondition='ok'|'unavailable'|'invalid'|'source_mismatch'|'disabled'|'unhealthy';
export type NoticeKind='outage'|'recovery';
export type MailResult='accepted'|'definite_failure'|'unknown'|'disabled';
const invalid=()=>Error('monitor_configuration_invalid');
export function parseMonitorConfig(env:Readonly<Record<string,string|undefined>>,source:string):MonitorConfig{
 try{
  if(!/^[a-f0-9]{40}$/.test(source)||env.NEVORA_OPERATIONS_MONITOR_SOURCE_SHA!==source||!['true','false'].includes(env.NEVORA_OPERATIONS_MONITOR_ENABLED??'')||!['true','false'].includes(env.NEVORA_OPERATIONS_ALERT_MAIL_ENABLED??''))throw invalid();
  const origin=env.NEVORA_OPERATIONS_MONITOR_ORIGIN??'',u=new URL(origin),healthKey=env.NEVORA_WORKFORCE_HEALTH_KEY??'',expectedCommands=Number(env.NEVORA_OPERATIONS_MONITOR_EXPECTED_COMMANDS),databaseUrl=env.NEVORA_OPERATIONS_MONITOR_DATABASE_URL??'',db=new URL(databaseUrl),role=decodeURIComponent(db.username);
  if(u.origin!==origin||u.protocol!=='https:'||!/^[-a-z0-9]+\.onrender\.com$/.test(u.hostname)||!/^nv_ops_monitor_[a-f0-9]{24}$/.test(role)||!['postgres:','postgresql:'].includes(db.protocol)||!db.password||db.hash||!/^ep-[a-z0-9.-]+\.neon\.tech$/.test(db.hostname)||db.hostname.includes('-pooler.')||db.port&&db.port!=='5432'||!db.pathname.slice(1)||['postgres','template0','template1'].includes(decodeURIComponent(db.pathname.slice(1)))||[...db.searchParams].length!==1||db.searchParams.get('sslmode')!=='verify-full'||!/^[A-Za-z0-9_-]{43}$/.test(healthKey)||Buffer.from(healthKey,'base64url').toString('base64url')!==healthKey||!Number.isInteger(expectedCommands)||expectedCommands<1||expectedCommands>48)throw invalid();
  const mailEnabled=env.NEVORA_OPERATIONS_ALERT_MAIL_ENABLED==='true';
  if(mailEnabled&&(env.NEVORA_STAGING_EMAIL_RECIPIENT?.toLowerCase()!=='support@thevelani.com'||!validatedMailTransport({...env,NODE_ENV:'production'})))throw invalid();
  return {enabled:env.NEVORA_OPERATIONS_MONITOR_ENABLED==='true',mailEnabled,origin,sourceSha:source,healthKey,expectedCommands,databaseUrl,role};
 }catch{throw invalid();}
}
export async function observeManagedHost(config:MonitorConfig,fetcher:typeof fetch=fetch,now=Date.now()):Promise<MonitorCondition>{
 let response:Response;
 const request=new Request(config.origin+'/private/health',{headers:signHealthRequest(config.healthKey,now,randomBytes(16).toString('hex'))});
 try{response=await fetcher(request.url,{method:'GET',redirect:'error',credentials:'omit',cache:'no-store',headers:Object.fromEntries(request.headers),signal:AbortSignal.timeout(5000)});}catch{return 'unavailable';}
 try{
  if(![200,503].includes(response.status))return 'invalid';
  const reader=response.body?.getReader();if(!reader)return 'invalid';let bytes=0;const chunks:Uint8Array[]=[];
  let timer:ReturnType<typeof setTimeout>|undefined;
  const deadline=new Promise<never>((_,bad)=>{timer=setTimeout(()=>{void reader.cancel().catch(()=>{});bad(Error());},5000);});
  try{for(;;){const p=await Promise.race([reader.read(),deadline]);if(p.done)break;bytes+=p.value.length;if(bytes>4096){void reader.cancel().catch(()=>{});return 'invalid';}chunks.push(p.value);}}finally{if(timer)clearTimeout(timer);}
  const body=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));
  if(!authenticHealthResponse(config.healthKey,request,response.status,body,response.headers.get('x-nevora-ops-response')))return 'invalid';
  const r=JSON.parse(body);
  if(!r||Object.keys(r).sort().join(',')!=='enabled,expectedCommands,healthy,observedAt,observedCommands,schemaVersion,sourceSha'||r.schemaVersion!==1||typeof r.enabled!=='boolean'||typeof r.healthy!=='boolean'||!Number.isSafeInteger(r.observedAt)||r.observedAt>now+6000||now-r.observedAt>60000||r.expectedCommands!==config.expectedCommands||!Number.isInteger(r.observedCommands)||r.observedCommands<0||r.observedCommands>config.expectedCommands||r.healthy&&(!r.enabled||r.observedCommands!==r.expectedCommands)||r.healthy!==(response.status===200))return 'invalid';
  if(r.sourceSha!==config.sourceSha)return 'source_mismatch';
  return !r.enabled?'disabled':r.healthy?'ok':'unhealthy';
 }catch{return 'invalid';}
}
type MailTransport={sendRegistered:(to:string,subject:string,text:string)=>Promise<{accepted?:unknown[];rejected?:unknown[]}>};
/** No company information or model output enters alerts. SMTP acknowledgement
 * is acceptance only; loss of acknowledgement is never silently retried. */
export async function sendMonitorNotice(config:MonitorConfig,kind:NoticeKind,transport:MailTransport):Promise<MailResult>{
 if(!config.mailEnabled)return 'disabled';
 try{
  const result=await transport.sendRegistered('support@thevelani.com','NEVORA web workers: '+(kind==='outage'?'attention required':'recovered'),kind==='outage'?'The independent observer detected an unavailable or unhealthy NEVORA web-worker service. Inspect the private operations runbook and job status. No job was reset by this alert.':'The independent observer now reports healthy NEVORA web workers. Review the incident and any outstanding job failures before closing it.');
  if(result.accepted?.length===1&&String(result.accepted[0]).toLowerCase()==='support@thevelani.com'&&!result.rejected?.length)return 'accepted';
  if(!result.accepted?.length&&result.rejected?.length)return 'definite_failure';
  return 'unknown';
 }catch(error){
  const e=error&&typeof error==='object'?error as {code?:string;command?:string;responseCode?:number}:{};
  // Authentication/DNS and explicit SMTP rejection prove non-acceptance.
  // Even ECONNECTION/CONN can follow full DATA in Nodemailer; it is unknown.
  return ['EAUTH','EDNS'].includes(e.code??'')||e.code==='EENVELOPE'||e.code==='EMESSAGE'&&Number(e.responseCode)>=400?'definite_failure':'unknown';
 }
}
