import {expect,it} from 'vitest';
import {parseMonitorConfig,observeManagedHost,sendMonitorNotice} from './monitor';
import {authorizeHealthRequest,signHealthResponse} from './managed-host';
const source='a'.repeat(40),key=Buffer.alloc(32,7).toString('base64url');
const environment=()=>({NEVORA_OPERATIONS_MONITOR_ENABLED:'true',NEVORA_OPERATIONS_MONITOR_ORIGIN:'https://nevora-workforce-fictional.onrender.com',NEVORA_OPERATIONS_MONITOR_SOURCE_SHA:source,NEVORA_WORKFORCE_HEALTH_KEY:key,NEVORA_OPERATIONS_MONITOR_EXPECTED_COMMANDS:'2',NEVORA_OPERATIONS_MONITOR_DATABASE_URL:'postgresql://nv_ops_monitor_0123456789abcdef01234567:fictional@ep-fictional.neon.tech/control?sslmode=verify-full',NEVORA_OPERATIONS_ALERT_MAIL_ENABLED:'false'});
const report=(now:number)=>({schemaVersion:1,enabled:true,healthy:true,sourceSha:source,observedAt:now,expectedCommands:2,observedCommands:2});
const signed=(value:unknown,status:number,url:string|URL|Request,init?:RequestInit)=>{const request=new Request(url,init),body=JSON.stringify(value);return new Response(body,{status,headers:{'x-nevora-ops-response':signHealthResponse(key,request,status,body)}});};
it('rejects transaction pooler endpoints in the dedicated journal configuration',()=>{
 expect(()=>parseMonitorConfig({...environment(),NEVORA_OPERATIONS_MONITOR_DATABASE_URL:environment().NEVORA_OPERATIONS_MONITOR_DATABASE_URL.replace('ep-fictional','ep-fictional-pooler')},source)).toThrow('monitor_configuration_invalid');
});
it('rejects unsigned, replayed and tampered health responses from an allowed alternative host',async()=>{
 const c=parseMonitorConfig({...environment(),NEVORA_OPERATIONS_MONITOR_ORIGIN:'https://substituted.onrender.com'},source),now=Date.now();
 expect(await observeManagedHost(c,async()=>Response.json(report(now)),now)).toBe('invalid');
 let saved:Response|undefined;
 expect(await observeManagedHost(c,async(url,init)=>{saved=signed(report(now),200,url,init);return saved.clone();},now)).toBe('ok');
 expect(await observeManagedHost(c,async()=>saved!.clone(),now)).toBe('invalid');
 expect(await observeManagedHost(c,async(url,init)=>{const original=signed(report(now),200,url,init);return new Response(JSON.stringify({...report(now),healthy:false}),{status:503,headers:original.headers});},now)).toBe('invalid');
});
it('validates fixed monitor target, least-privilege database, source and independent mail gates',()=>{
 expect(parseMonitorConfig(environment(),source)).toMatchObject({enabled:true,mailEnabled:false,expectedCommands:2});
 for(const mutation of [{NEVORA_OPERATIONS_MONITOR_ORIGIN:'http://127.0.0.1'},{NEVORA_OPERATIONS_MONITOR_ORIGIN:'https://host.onrender.com/other'},{NEVORA_OPERATIONS_MONITOR_DATABASE_URL:'postgresql://owner:fictional@ep-fictional.neon.tech/control?sslmode=verify-full'},{NEVORA_OPERATIONS_MONITOR_EXPECTED_COMMANDS:'0'},{NEVORA_OPERATIONS_MONITOR_SOURCE_SHA:'b'.repeat(40)},{NEVORA_OPERATIONS_ALERT_MAIL_ENABLED:'yes'},{NEVORA_OPERATIONS_ALERT_MAIL_ENABLED:'true'}])expect(()=>parseMonitorConfig({...environment(),...mutation},source)).toThrow('monitor_configuration_invalid');
});
it('uses a fresh authenticated read-only observation and rejects redirects, stale/mixed-source and malformed health',async()=>{
 const c=parseMonitorConfig(environment(),source),now=Date.now();
 const call=async(_url:string|URL|Request,init?:RequestInit)=>{expect(String(_url)).toBe(c.origin+'/private/health');expect(init?.redirect).toBe('error');expect(authorizeHealthRequest(new Request(String(_url),init),key,Date.now())).toBe(true);return signed(report(now),200,_url,init);};
 expect(await observeManagedHost(c,call,now)).toBe('ok');
 for(const [value,status,expected] of [[{...report(now),sourceSha:'b'.repeat(40)},200,'source_mismatch'],[{...report(now),observedAt:now-61000},200,'invalid'],[{...report(now),expectedCommands:3},200,'invalid'],[{...report(now),enabled:false,healthy:false},503,'disabled'],[{...report(now),healthy:false},503,'unhealthy'],[{...report(now),healthy:true},503,'invalid'],[{...report(now),extra:'private'},200,'invalid']] as const)expect(await observeManagedHost(c,async(url,init)=>signed(value,status,url,init),now)).toBe(expected);
 expect(await observeManagedHost(c,async()=>{throw Error('fictional-private');},now)).toBe('unavailable');
 expect(await observeManagedHost(c,async()=>new Response('x'.repeat(10000)),now)).toBe('invalid');
});
it('never sends when disabled; fixes recipient and reduces definite versus ambiguous SMTP outcomes',async()=>{
 const c=parseMonitorConfig(environment(),source);let count=0;
 const mail={sendRegistered:async(to:string,subject:string,text:string)=>{count++;expect(to).toBe('support@thevelani.com');expect(subject).toContain('NEVORA');expect(text).not.toContain(key);return {accepted:[to],rejected:[]};}};
 expect(await sendMonitorNotice(c,'outage',mail)).toBe('disabled');expect(count).toBe(0);
 expect(await sendMonitorNotice({...c,mailEnabled:true},'outage',mail)).toBe('accepted');expect(count).toBe(1);
 expect(await sendMonitorNotice({...c,mailEnabled:true},'recovery',{sendRegistered:async()=>{throw Object.assign(Error('private'),{code:'EAUTH'});}})).toBe('definite_failure');
 expect(await sendMonitorNotice({...c,mailEnabled:true},'outage',{sendRegistered:async()=>{throw Object.assign(Error('private'),{code:'ETIMEDOUT'});}})).toBe('unknown');
 expect(await sendMonitorNotice({...c,mailEnabled:true},'outage',{sendRegistered:async()=>({accepted:[],rejected:['support@thevelani.com']})})).toBe('definite_failure');
});
