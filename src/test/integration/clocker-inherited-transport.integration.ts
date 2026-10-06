import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { createDisposableFoundationDatabase } from './local-postgres';
import { registerClockerDevice, redeemClockerEnrollment } from '../../lib/clocker/devices.server';
import { setEmployeeClockerPin } from '../../lib/clocker/pins.server';
import { handleClockerPin } from '../../lib/clocker/pin-transport.server';
import { handleClockerPunch } from '../../lib/clocker/punch-transport.server';
import type { ClockerCookieStore } from '../../lib/clocker/setup.server';
import type { PunchView } from '../../lib/clocker/punch-types';
import type { SqlExecutor } from '../../lib/notifications/types';
const key=Buffer.alloc(32,67), owner={employeeId:'transport-owner',sessionTokenHash:'a'.repeat(64)};
let db:Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
let jar:Map<string,string>,store:ClockerCookieStore;
const q=<T=Record<string,unknown>>(text:string,values:readonly unknown[]=[])=>db.executor.query<T>({text,values});
const headers={Host:'127.0.0.1:3001',Origin:'http://127.0.0.1:3001','X-Nevora-Clocker':'1','Content-Type':'application/json'};
function request(body:unknown,extra:Record<string,string|undefined>={}){return new Request('http://127.0.0.1:3001/api/clocker/2/punch',{method:'POST',headers:{...headers,...Object.fromEntries(Object.entries(extra).filter(([,v])=>v!==undefined))},body:JSON.stringify(body)});}
function call(body:unknown,extra:Record<string,string|undefined>={},executor:SqlExecutor=db.executor,enabled=true){return handleClockerPunch(request(body,extra),'2',{cookies:store,executor,security:{production:false},key,enabled});}
async function verify(pin='1234'){
 const response=await handleClockerPin(request({action:'verify',pin}),'2',{cookies:store,executor:db.executor,security:{production:false},key});
 expect(response.status).toBe(200);
}
async function view(){const r=await call({operation:'state'});expect(r.status).toBe(200);return r.json();}
function command(view:PunchView,action='CLOCK_IN'){
 const s=view.snapshot;
 return {commandId:randomUUID(),action,verificationId:view.verificationId,expected:{revision:s.revision,timeEntryId:s.entry?.id??null,timeEntryVersion:s.entry?.version??null,breakEntryId:s.break?.id??null,breakEntryVersion:s.break?.version??null},...(action==='START_BREAK'?{breakType:{id:view.breakTypes[0].id,version:view.breakTypes[0].version}}:{})};
}
beforeEach(async()=>{
 db=await createDisposableFoundationDatabase({mode:'current-runtime'});
 await q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES
 ('transport-owner','Test','Owner','555','OWNER','loc-1'),('transport-a','Avery','Test','556','EMPLOYEE','loc-1'),('transport-b','Blair','Test','557','EMPLOYEE','loc-1');
 INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('a',64),'transport-owner',now()+interval '1 day');
 INSERT INTO employee_location_eligibility VALUES('transport-a','loc-1'),('transport-a','loc-2'),('transport-b','loc-1');`);
 await setEmployeeClockerPin(owner,{employeeId:'transport-a',pin:'1234',expectedVersion:0},key,db.executor);
 await setEmployeeClockerPin(owner,{employeeId:'transport-b',pin:'5678',expectedVersion:0},key,db.executor);
 const p=await registerClockerDevice(owner,{name:'Test tablet',locationId:'loc-1'},db.executor);
 const d=await redeemClockerEnrollment({enrollmentToken:p.enrollmentToken,locationKey:'2'},db.executor);
 jar=new Map([['nevora_clocker',d.credential]]);
 store={get:name=>jar.has(name)?{value:jar.get(name)!}:undefined,set:(name,value)=>{jar.set(name,value);}};
 await q("INSERT INTO clocker_break_types(id,workspace_id,name,category,target_minutes,created_by,updated_by) VALUES('transport-rest','workspace-fuel','Rest','REST',15,'transport-owner','transport-owner')");
 await verify();
});
afterEach(async()=>{if(db)await db.dispose();});
it('returns current state with non-authorizing context, no employee IDs or credentials',async()=>{
 const response=await call({operation:'state'});expect(response.status).toBe(200);
 const data=await response.json();expect(data).toMatchObject({state:'ready',firstName:'Avery',locationId:'loc-1',snapshot:{revision:0,entry:null,break:null}});
 expect(data.verificationId).toMatch(/^[a-f0-9]{64}$/);expect(data.subject).toMatch(/^[a-f0-9]{64}$/);expect(data.verificationId).not.toBe(data.subject);
 expect(JSON.stringify(data)).not.toMatch(/transport-a|transport-owner|nev_dev_|nev_pin_|credentialHash|tokenHash|pinVersion/);
 expect(response.headers.get('cache-control')).toContain('no-store');
});
it('records all four transitions only for the cookie-derived employee',async()=>{
 for(const action of ['CLOCK_IN','START_BREAK','END_BREAK','CLOCK_OUT']){
  const v=await view();const r=await call({operation:'execute',command:command(v,action)});
  expect(r.status).toBe(200);expect(await r.json()).toMatchObject({state:'committed',receipt:{action}});
 }
 expect(await q('SELECT employee_id,status FROM time_entries')).toEqual([{employee_id:'transport-a',status:'CLOCKED_OUT'}]);
 expect(await q('SELECT count(*)::int AS n FROM clocker_command_ledger')).toEqual([{n:4}]);
});
it.each([{Origin:'https://evil.invalid'},{Origin:''},{'Sec-Fetch-Site':'cross-site'},{'X-Nevora-Clocker':'0'},{'Content-Type':'text/plain'}])('blocks unsafe request boundaries before reading or writing SQL',async extra=>{
 const deny:SqlExecutor={query:async()=>{throw Error('unexpected SQL');},transaction:async()=>{throw Error('unexpected SQL');}};
 expect((await call({operation:'state'},extra,deny)).status).toBe(403);
});
it.each([{operation:'state',employeeId:'transport-b'},{operation:'execute',context:'x',command:{}},{operation:'receipt',context:'a'.repeat(64),commandId:'not-a-uuid'},[],null,{operation:'state',padding:'x'.repeat(5000)}])('rejects malformed payloads without a time write',async data=>{
 expect((await call(data)).status).toBe(400);expect(await q('SELECT id FROM time_entries')).toEqual([]);
});
it('rejects forged actor and client time fields within a command',async()=>{
 const v=await view();
 for(const extra of [{employeeId:'transport-b'},{deviceId:'forged'},{clockInAt:'2020-01-01T00:00:00Z'}]){
  expect((await call({operation:'execute',command:{...command(v),...extra}})).status).toBe(400);
 }
 expect(await q('SELECT id FROM time_entries')).toEqual([]);
});
it.each(['missing-device','missing-identity','expired','inactive','revoked'])('denies %s verification',async kind=>{
 const v=await view();
 if(kind==='missing-device')jar.delete('nevora_clocker');
 if(kind==='missing-identity')jar.delete('nevora_clocker_identity');
 if(kind==='expired')await q("UPDATE clocker_pin_sessions SET expires_at=clock_timestamp()-interval '1 second'");
 if(kind==='inactive')await q("UPDATE employees SET active=false WHERE id='transport-a'");
 if(kind==='revoked')await q('UPDATE clocker_devices SET active=false,credential_hash=NULL,revoked_at=clock_timestamp()');
 const r=await call({operation:'execute',command:command(v)});expect(r.status).toBe(401);
 expect(await q('SELECT id FROM time_entries')).toEqual([]);
});
it('a stale tab cannot clock the newer employee in using their changed identity cookie',async()=>{
 const old=await view();await verify('5678');const current=await view();expect(current.subject).not.toBe(old.subject);
 const r=await call({operation:'execute',command:command(old)});expect(r.status).toBe(409);
 expect(await q('SELECT id FROM time_entries')).toEqual([]);
});
it('fresh PIN verification changes context but retains the same recovery subject',async()=>{
 const old=await view();await verify();const current=await view();expect(current.verificationId).not.toBe(old.verificationId);expect(current.subject).toBe(old.subject);
 expect((await call({operation:'execute',command:command(old)})).status).toBe(409);
});
it('retries an identical command without duplication and reconciles its exact receipt',async()=>{
 const v=await view(),cmd=command(v),body={operation:'execute',command:cmd};
 const r=await call(body);const saved=await r.json();expect(r.status).toBe(200);
 expect(await (await call(body)).json()).toEqual(saved);
 expect(await (await call({operation:'receipt',commandId:cmd.commandId,verificationId:(await view()).verificationId})).json()).toEqual(saved);
 expect((await call({...body,command:{...cmd,expected:{...cmd.expected,revision:5}}})).status).toBe(409);
 expect(await q('SELECT count(*)::int AS n FROM time_entries')).toEqual([{n:1}]);
});
it('lost committed database response stays unknown until receipt reconciliation',async()=>{
 const v=await view(),cmd=command(v);
 const lost:SqlExecutor={query:(s,signal)=>db.executor.query(s,signal),transaction:async ss=>{
  const rows=await db.executor.transaction(ss);if(ss.some(s=>s.text.includes('SELECT clocker_apply_punch')))throw Error('lost SQL response');return rows;
 }};
 const r=await call({operation:'execute',command:cmd},{},lost);expect(r.status).toBe(503);
 expect(await r.json()).toMatchObject({state:'unavailable',code:'UNAVAILABLE'});
 expect(await (await call({operation:'receipt',commandId:cmd.commandId,verificationId:(await view()).verificationId})).json()).toMatchObject({state:'committed',receipt:{commandId:cmd.commandId}});
});
it('reports stale state rather than recording a different action',async()=>{
 const v=await view();await call({operation:'execute',command:command(v)});
 const r=await call({operation:'execute',command:command(v)});expect(r.status).toBe(409);expect(await r.json()).toMatchObject({code:'STALE_STATE'});
 expect(await q('SELECT count(*)::int AS n FROM time_entries')).toEqual([{n:1}]);
});
it('returns not_found for an unseen receipt, not an invented successful action',async()=>{
 const v=await view();expect(await (await call({operation:'receipt',commandId:randomUUID(),verificationId:v.verificationId})).json()).toMatchObject({state:'unknown'});
 expect(await q('SELECT id FROM time_entries')).toEqual([]);
});
it('another employee on the same tablet cannot read a prior employee receipt',async()=>{
 const v=await view(),cmd=command(v);await call({operation:'execute',command:cmd});await verify('5678');const other=await view();
 expect(await (await call({operation:'receipt',commandId:cmd.commandId,verificationId:(await view()).verificationId})).json()).toMatchObject({state:'unknown'});
});
it('disabled feature performs no SQL and reports unavailable',async()=>{
 const deny:SqlExecutor={query:async()=>{throw Error('unexpected');},transaction:async()=>{throw Error('unexpected');}};
 const r=await call({operation:'state'},{},deny,false);expect(r.status).toBe(503);expect(await r.json()).toMatchObject({state:'disabled'});
});
it('missing schema never becomes a false off-clock state and errors never echo SQL',async()=>{
 await q('ALTER TABLE clocker_employee_clock_state RENAME TO unavailable_state');
 const r=await call({operation:'state'});expect(r.status).toBe(503);expect(JSON.stringify(await r.json())).not.toMatch(/SELECT|unavailable_state|transport-a|1234/);
});

it('rejects a different Clocker location route even with valid employee verification',async()=>{
 const r=await handleClockerPunch(request({operation:'state'}),'110',{cookies:store,executor:db.executor,security:{production:false},key,enabled:true});
 expect(r.status).toBe(401);expect(await q('SELECT id FROM time_entries')).toEqual([]);
});
it('rejects a forged same-length screen context rather than trusting its shape',async()=>{
 const v=await view();const r=await call({operation:'execute',command:{...command(v),verificationId:'0'.repeat(64)}});
 expect(r.status).toBe(409);expect(await q('SELECT id FROM time_entries')).toEqual([]);
});
