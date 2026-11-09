import {afterEach,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {notificationReadManifest} from './employee-notification-list.server';
import {readPortalNotificationList} from './portal-notification-list.server';
import {payrollNoticeReadSql} from '../payroll/notices';
import {employeeReadLimits,employeeViewGuards} from './employee-profile.server';
import {managementSessionStatements} from './management-session';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor,SqlStatement} from '../notifications/types';

// Transport contract fixture: actual canonical source check and protected replay
// run unchanged. These returned facts do not certify Finance's SQL predicate.
afterEach(()=>vi.unstubAllEnvs());
type Mode='normal'|'source-lost'|'version-changed'|'authority-lost'|'foreign'|'new-candidate'|'missing-read'|'source-failed';
async function read(role:'EMPLOYEE'|'LEAD'|'MANAGER'|'OWNER',mode:Mode='normal',count=1,readAt:string|null=null,kind='PAYROLL_STATEMENT') {
 vi.stubEnv('NEVORA_PAYROLL_ENABLED','true');
 const now=new Date().toISOString(),past=new Date(Date.now()-1000).toISOString(),future=new Date(Date.now()+86400000).toISOString();
 const proof={employee:{id:'self',role},sessionTokenHash:'a'.repeat(64)} as SessionMutationProof;
 const workspace={id:'workspace',name:'Fictional',active:true,timeZone:'America/Puerto_Rico',createdAt:past,updatedAt:past};
 const candidate=(i:number)=>({id:'notice-'+i,at:past,...(mode==='missing-read'?{}:{read:readAt})});
 const candidates=Array.from({length:count},(_,i)=>candidate(i)),observations:Record<string,unknown>[][]=[],sourceValues:Array<readonly unknown[]>=[];
 let finalized=false,readsAfterFinal=0,postFinalAuthorityFences=0;
 const ex:SqlExecutor={query:async()=>{throw Error('Unbounded query prohibited');},transaction:async(statements:SqlStatement[])=>{
  if(finalized){
   // The new final role/session fence may execute, but source facts must replay
   // only from the protected observation. No financial/operational data fallback.
   const allowed=new Set([...employeeReadLimits,...employeeViewGuards(proof,workspace,false),...managementSessionStatements(proof,proof.employee.id,[proof.employee.role])].map(s=>JSON.stringify(s)));
   if(statements.every(s=>allowed.has(JSON.stringify(s)))){postFinalAuthorityFences++;return statements.map(()=>[]) as never;}
   readsAfterFinal++;throw Error('No executor source fallback after protected observation');
  }
  if(statements.some(s=>s.text.startsWith('SELECT id,created_at::text'))){
   return statements.map(s=>s.text.startsWith('SELECT id,created_at::text')?candidates:s.text.startsWith('SELECT LEAST(15000')?[{validForMs:15000}]:[]) as never;
  }
  const last=statements.at(-1)!,sql=last.text;let result:unknown[];
  if(sql.startsWith('WITH facts AS MATERIALIZED')){
   finalized=true;const fresh=structuredClone(observations);
   for(let i=0;i<fresh.length;i++)if(fresh[i].some(r=>r.kind===kind)){
    if(mode==='source-lost')fresh[i]=[];
    if(mode==='version-changed')fresh[i].forEach(row=>{row.version='changed';});
   }
   result=[{candidates:mode==='new-candidate'?[...candidates,candidate(count)]:candidates,reads:fresh,observedAt:now,validForMs:mode==='authority-lost'?null:45000,active:true}];
  }else if(sql.startsWith('SELECT id')&&sql.includes('FROM notifications WHERE employee_id='))result=candidates;
  else if(sql.includes(' AS rows')){
   let rows:Record<string,unknown>[];
   if(sql.includes("to_regclass('nevora_workspace_presentation_revisions')"))rows=[{installed:false}];
   else if(sql.includes('FROM notifications WHERE id ='))rows=[{id:last.values[0],employee_id:mode==='foreign'?'other':'self',type:kind,title:'PRIVATE_AMOUNT_MUST_NOT_RENDER',body:'PRIVATE_TAX_MUST_NOT_RENDER',event_key:'event-'+last.values[0],environment:'test',source_kind:kind,source_id:'10000000-0000-4000-8000-'+String(Number(String(last.values[0]).split('-').at(-1))+1).padStart(12,'0'),source_version:'current',effective_version:'current',purpose:'REMINDER',urgency:'normal',due_at:past,expires_at:future}];
   else if(sql.includes(payrollNoticeReadSql())){if(mode==='source-failed')throw Error('Private Finance read unavailable');sourceValues.push(last.values);rows=[{version:'current',kind}];}
   else if(sql.includes('FROM workspaces WHERE singleton=true'))rows=[workspace];
   else throw Error('Unexpected source query: '+sql);
   observations.push(rows);result=[{rows}];
  }else if(sql.includes('FROM workspaces WHERE singleton=true'))result=[workspace];
  else throw Error('Unexpected discovery query: '+sql);
  return statements.map((_,i)=>i===statements.length-1?result:[]) as never;
 }};
 return{view:await readPortalNotificationList(proof,'test',ex),sourceValues,observations:observations.length,finalized,readsAfterFinal,postFinalAuthorityFences};
}

it('registers the exact two-argument Finance query for ordinary protected replay',()=>{
 const manifest=notificationReadManifest();
 expect(manifest.identify({text:payrollNoticeReadSql(),values:['document','self']}).template.name).toBe('payrollNotice');
 expect(()=>manifest.identify({text:payrollNoticeReadSql(),values:['document']})).toThrow();
 expect(()=>manifest.identify({text:payrollNoticeReadSql()+' OR true',values:['document','self']})).toThrow();
 expect(()=>manifest.identify({text:'SELECT payload FROM payroll_documents',values:[]})).toThrow();
});
it.each(['EMPLOYEE','LEAD','MANAGER','OWNER'] as const)('%s sees only metadata for their own authorized published statement',async role=>{
 const result=await read(role);expect(result.finalized).toBe(true);expect(result.readsAfterFinal).toBe(0);expect(result.postFinalAuthorityFences).toBe(['MANAGER','OWNER'].includes(role)?1:0);
 expect(result.sourceValues).toEqual([['10000000-0000-4000-8000-000000000001','self']]);
 expect(result.view).toMatchObject({state:'ready',kind:'notifications',coverage:'complete',items:[{id:'notice-0',label:'Pay statement update',href:'/app/notifications/open?notificationId=notice-0',reviewState:'unread',actionState:'available'}]});
 expect(JSON.stringify(result.view)).not.toMatch(/PRIVATE_|salary|tax|netPay|paid|payment/i);
});
it.each(['EMPLOYEE','LEAD'] as const)('%s uses observed read metadata without confusing it with payment or acknowledgement',async role=>{
 const result=await read(role,'normal',1,new Date().toISOString());expect(result.view).toMatchObject({state:'ready',items:[{reviewState:'read',actionState:'available'}]});
});
it.each(['source-lost','version-changed','foreign'] as const)('final %s cannot reuse positive discovery authority',async mode=>{
 const result=await read('EMPLOYEE',mode);expect(result.view).toMatchObject({state:'ready',items:[]});expect(result.readsAfterFinal).toBe(0);
});
it.each(['authority-lost','new-candidate','missing-read','source-failed'] as const)('%s releases no ready view or private source fallback',async mode=>{
 const result=await read('LEAD',mode);expect(result.view.state).toBe('unavailable');expect(result.readsAfterFinal).toBe(0);
});
it('does not expose payroll preparation as a management capability to Employees',async()=>{
 const result=await read('EMPLOYEE','normal',1,null,'PAYROLL_PREPARATION');expect(result.view).toMatchObject({state:'ready',items:[]});expect(result.sourceValues).toEqual([]);
});
it('retains 25 statement notices within the unchanged 64-read budget',async()=>{
 const result=await read('LEAD','normal',25);expect(result.view).toMatchObject({state:'ready',coverage:'complete'});
 if(result.view.state==='ready'&&result.view.kind==='notifications')expect(result.view.items).toHaveLength(25);
 expect(result.observations).toBeLessThanOrEqual(64);expect(result.readsAfterFinal).toBe(0);
});
