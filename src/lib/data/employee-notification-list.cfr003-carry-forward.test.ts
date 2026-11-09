import {expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {readEmployeeNotificationList,notificationReadManifest} from './employee-notification-list.server';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import type {SessionMutationProof} from '../shift-changes/types';
const proof={employee:{id:'self',role:'EMPLOYEE'},sessionTokenHash:'a'.repeat(64)} as SessionMutationProof;
it('requires explicit environment independently of push and rejects forged/management proof before reads',async()=>{
 const db={query:vi.fn(),transaction:vi.fn()} as unknown as SqlExecutor;
 expect(await readEmployeeNotificationList(proof,undefined,db)).toEqual({state:'unavailable',reason:'read_failed'});
 expect(await readEmployeeNotificationList({...proof,sessionTokenHash:'forged'},'test',db)).toEqual({state:'unavailable',reason:'access_denied'});
 expect(await readEmployeeNotificationList({...proof,employee:{...proof.employee,role:'OWNER'}},'test',db)).toEqual({state:'unavailable',reason:'access_denied'});
 expect(db.query).not.toHaveBeenCalled();expect(db.transaction).not.toHaveBeenCalled();
});
it('closed manifest rejects unknown/mutation/multi-statement/changed parameter queries and never falls back',()=>{
 const replay=notificationReadManifest();
 expect(()=>replay.identify({text:'SELECT private FROM arbitrary',values:[]})).toThrow();
 expect(()=>replay.identify({text:'DELETE FROM notifications',values:[]})).toThrow();
 expect(()=>replay.identify({text:'SELECT 1; SELECT 2',values:[]})).toThrow();
 expect(()=>replay.identify({text:'SELECT id FROM locations WHERE id=ANY($1::text[]) AND active=true',values:[undefined]})).toThrow();
});
it('applies owned SQL/abort budgets before the initial workspace read',async()=>{
 const query=vi.fn(async()=>{throw Error('Unbounded query must not run');});
 const transaction=vi.fn(async()=>[]);
 await readEmployeeNotificationList(proof,'test',{query,transaction} as SqlExecutor);
 expect(query).not.toHaveBeenCalled();
 expect(transaction).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({text:"SET LOCAL statement_timeout='2500ms'"})]),expect.any(AbortSignal));
});
it('projects current schedule confirmation independently from read receipts',async()=>{
 const m=await import('./employee-notification-list.server');expect(m.projectNotificationDisplayState).toBeTypeOf('function');
 const source={kind:'SCHEDULE',source:{kind:'SCHEDULE',id:'2030-10-07',version:'new'},employeePublications:{self:{acknowledgement:{acknowledged:false,needsAcknowledgement:true}}}};
 expect(m.projectNotificationDisplayState(source as never,'self',true,null)).toEqual({reviewState:'read',actionState:'required'});
 expect(m.projectNotificationDisplayState({...source,employeePublications:{self:{acknowledgement:{acknowledged:true,needsAcknowledgement:false}}}} as never,'self',false,null)).toEqual({reviewState:'confirmed',actionState:'complete'});
});
it('communication read cannot complete required acknowledgement and old acknowledgement cannot confirm a new version',async()=>{
 const m=await import('./employee-notification-list.server');expect(m.projectNotificationDisplayState).toBeTypeOf('function');
 const source={kind:'COMMUNICATION',source:{kind:'COMMUNICATION',id:'update',version:'new'}};
 expect(m.projectNotificationDisplayState(source as never,'self',true,{version:'new',requirement:'REQUIRED',acknowledged:false})).toEqual({reviewState:'read',actionState:'required'});
 expect(m.projectNotificationDisplayState(source as never,'self',false,{version:'old',requirement:'REQUIRED',acknowledged:true})).toEqual({reviewState:'unavailable',actionState:'unavailable'});
 expect(m.projectNotificationDisplayState(source as never,'self',false,{version:'new',requirement:'REQUIRED',acknowledged:true})).toEqual({reviewState:'confirmed',actionState:'complete'});
});

async function read(count:number,mode:'normal'|'denied'|'missing'|'removed'|'changed-detail'|'foreign'='normal'){
 const now=new Date().toISOString(),future=new Date(Date.now()+7*86400000).toISOString(),past=new Date(Date.now()-3600000).toISOString();
 const workspace={id:'workspace',name:'Review workspace',timeZone:'America/Puerto_Rico',active:true,createdAt:past,updatedAt:past};
 const candidates=Array.from({length:count},(_,i)=>({id:`notification-${i}`}));
 const observations:unknown[][]=[];let finalized=false;
 const executor:SqlExecutor={query:async()=>{throw Error('Unbounded query');},transaction:async(statements:SqlStatement[])=>{
  const statement=statements.at(-1)!,sql=statement.text,values=statement.values;let rows:unknown[]=[];
  if(sql.startsWith('WITH facts AS MATERIALIZED')){finalized=true;const fresh=structuredClone(observations) as Record<string,unknown>[][];
   if(mode==='missing')fresh.forEach((rows,i)=>{if(rows.some(r=>'detail' in r))fresh[i]=[];});
   if(mode==='removed')fresh.forEach((rows,i)=>{if(rows.some(r=>'employee_name' in r))fresh[i]=[];});
   if(mode==='changed-detail')fresh.forEach(rows=>rows.forEach(row=>{if(row.detail)(row.detail as Record<string,unknown>).reason='Changed after discovery';}));
   rows=[{candidates,reads:fresh,observedAt:now,validForMs:mode==='denied'?null:45000,active:true}];}
  else if(sql.startsWith('SELECT id,read_at::text AS read FROM notifications WHERE employee_id='))rows=candidates;
  else if(sql.includes(' AS rows')){
   let observed:unknown[]=[];
   if(sql.includes("to_regclass('nevora_workspace_presentation_revisions')"))observed=[{installed:false}];
   else if(sql.includes('FROM notifications WHERE id =')){const index=String(values[0]).split('-').at(-1);observed=[{id:values[0],employee_id:'self',type:'TIME_OFF_APPROVED',title:'Time off',body:'Reviewed',event_key:`event-${index}`,environment:'test',source_kind:'TIME_OFF',source_id:`request-${index}`,source_version:'APPROVED',effective_version:'APPROVED',purpose:'EVENT',urgency:'high',due_at:past,expires_at:future}];}
   else if(sql.includes('FROM employees e LEFT JOIN employee_location_eligibility'))observed=[{id:'self',role:'EMPLOYEE',active:true,allowed_location_ids:[]}];
   else if(sql.includes('SELECT r.*, e.first_name'))observed=[{id:values[0],employee_id:mode==='foreign'?'other':'self',employee_name:'Employee',status:'APPROVED',start_date:'2030-10-07',end_date:'2030-10-07',created_at:past}];
   else if(sql.includes('AS detail FROM time_off_requests'))observed=(Array.isArray(values[2])?values[2]:[values[2]]).map(id=>({detail:{id,status:'APPROVED',startDate:'2030-10-07',endDate:'2030-10-07',startTime:null,endTime:null,reason:null}}));
   else if(sql.includes('FROM employee_attention_receipts'))observed=[];
   else if(sql.includes('FROM workspaces WHERE singleton=true'))observed=[workspace];
   else throw Error(`Unexpected observation ${sql}`);
   observations.push(observed);rows=[{rows:observed}];
  } else if(sql.includes('FROM workspaces WHERE singleton=true'))rows=[workspace];
  else throw Error(`Unexpected SQL ${sql}`);
  return statements.map((_,index)=>index===statements.length-1?rows:[]) as never;
 }};
 return {result:await readEmployeeNotificationList(proof,'test',executor),observations:observations.length,finalized};
}

it.each([15,16,25])('keeps %s current own Time Off items within the fixed read budget',async count=>{const actual=await read(count);expect(actual).toMatchObject({finalized:true,result:{state:'ready',coverage:'complete'}});if(actual.result.state==='ready'&&actual.result.kind==='notifications')expect(actual.result.items).toHaveLength(count);expect(actual.observations).toBeLessThanOrEqual(64);});

it('uses final authority and refuses session loss after successful discovery',async()=>{expect((await read(25,'denied')).result.state).toBe('unavailable');});
it('missing attention facts remain partial rather than an all-clear list',async()=>{expect((await read(16,'missing')).result).toMatchObject({state:'ready',coverage:'partial',items:[]});});
it('removed current sources remain absent in final replay',async()=>{expect((await read(16,'removed')).result).toMatchObject({state:'ready',coverage:'complete',items:[]});});
it('changed attention versions cannot reuse old receipt observations',async()=>{expect((await read(16,'changed-detail')).result.state).toBe('unavailable');});
it('foreign source ownership cannot enter a visible batch',async()=>{const actual=await read(25,'foreign');expect(actual.result).toMatchObject({state:'ready',items:[]});expect(actual.observations).toBeLessThanOrEqual(52);});

it('retains the finite 64 unique canonical read limit',async()=>{const {timeOffReadSql}=await import('./requests');const manifest=notificationReadManifest();for(let i=0;i<64;i++)manifest.identify({text:timeOffReadSql(),values:['request-'+i]});expect(manifest.entries.size).toBe(64);expect(()=>manifest.identify({text:timeOffReadSql(),values:['request-64']})).toThrow('Notification read budget');expect(()=>manifest.identify({text:timeOffReadSql(),values:['x'.repeat(257)]})).toThrow('Invalid notification read parameter');expect(manifest.entries.size).toBe(64);});
