import {afterEach,beforeEach,expect,it} from 'vitest';
import {createDisposableFoundationDatabase} from './local-postgres';
import {randomUUID} from 'node:crypto';
import {calendarAuthority,manageEmployeeCalendarSubscription as manage,getEmployeeCalendarSubscription as status,findCalendarOperation,readCalendarFeed,revokeEmployeeCalendarSubscription} from '../../lib/calendar/service.server';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import type {SqlExecutor} from '../../lib/notifications/types';
let db:Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
const q=(text:string,values:unknown[]=[])=>db.executor.query<Record<string,unknown>>({text,values});
beforeEach(async()=>{db=await createDisposableFoundationDatabase({mode:'current-runtime'});});
afterEach(async()=>{await db?.dispose();});
it('calendar capability persistence and operation recovery exist without a raw token column',async()=>{
 expect(await q("SELECT to_regclass('calendar_subscriptions')::text AS name")).toEqual([{name:'calendar_subscriptions'}]);
 expect(await q("SELECT to_regclass('calendar_operations')::text AS name")).toEqual([{name:'calendar_operations'}]);
 expect(await q("SELECT column_name FROM information_schema.columns WHERE table_name IN ('calendar_subscriptions','calendar_operations') AND column_name IN ('token','url','raw_token')")).toEqual([]);
});

const proof:SessionMutationProof={employee:{id:'calendar-self',firstName:'Fictional',lastName:'Self',role:'EMPLOYEE',primaryLocationId:'loc-1'},sessionTokenHash:'b'.repeat(64)};
const owner:SessionMutationProof={employee:{id:'calendar-owner',firstName:'Fictional',lastName:'Owner',role:'OWNER',primaryLocationId:'loc-1'},sessionTokenHash:'a'.repeat(64)};
async function seed(){
 await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('calendar-owner','Fictional','Owner','555-0100','OWNER','loc-1'),('calendar-self','Fictional','Self','555-0101','EMPLOYEE','loc-1')");
 await q("INSERT INTO employee_location_eligibility VALUES('calendar-self','loc-1'),('calendar-self','loc-2')");
 await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('a',64),'calendar-owner',now()+interval '1 day'),(repeat('b',64),'calendar-self',now()+interval '1 day')");
 await q("INSERT INTO employee_credentials(employee_id,password_hash) VALUES('calendar-self','fictional-hash')");
}
const command=(kind:'ISSUE'|'ROTATE'|'REVOKE'='ISSUE',generation:string|null=null)=>({kind,operationId:randomUUID(),authority:calendarAuthority(proof),expectedGeneration:generation});
async function issue(){await seed();const cmd=command(),created=await manage(proof,cmd,db.executor);expect(created.status).toBe('created');if(created.status!=='created')throw Error('No capability');return {created,cmd,token:created.url.split('/')[3]};}
it('own issue digest only and response loss lookup cannot recover URL',async()=>{
 const {created,cmd,token}=await issue();expect(/^[A-Za-z0-9_-]{43}$/.test(token)).toBe(true);expect(await status(proof,db.executor)).toMatchObject({state:'active',generation:created.generation,allowedLocationIds:['loc-1','loc-2']});
 const stored=JSON.stringify(await q('SELECT * FROM calendar_subscriptions'))+JSON.stringify(await q('SELECT * FROM calendar_operations'));expect(stored.includes(token)).toBe(false);expect(stored.includes(created.url)).toBe(false);
 expect(await findCalendarOperation(proof,cmd.operationId,cmd.authority,db.executor)).toMatchObject({status:'active_url_unavailable',generation:created.generation});expect(await manage(proof,cmd,db.executor)).not.toHaveProperty('url');
});
it('manager cannot issue own feed or retrieve employee URL but can revoke in same workspace',async()=>{
 const {created,token}=await issue();expect((await manage(owner,{...command(),authority:calendarAuthority(owner)},db.executor)).status).toBe('blocked');
 expect((await revokeEmployeeCalendarSubscription(owner,'calendar-self',{...command('REVOKE'),authority:calendarAuthority(owner)},db.executor)).status).toBe('revoked');expect((await readCalendarFeed(token,db.executor)).state).toBe('unauthorized');expect((await status(owner,db.executor)).state).toBe('unauthorized');expect(created.url.endsWith('/schedule.ics')).toBe(true);
});
it('concurrent rotate has one winner one active digest and revoke denies new reads',async()=>{
 const {created,token}=await issue();const outcomes=await Promise.all([manage(proof,command('ROTATE',created.generation),db.executor),manage(proof,command('ROTATE',created.generation),db.executor)]);expect(outcomes.filter(x=>x.status==='created')).toHaveLength(1);expect(outcomes.filter(x=>x.status==='conflict')).toHaveLength(1);expect(await q('SELECT count(*)::integer AS n FROM calendar_subscriptions WHERE revoked_at IS NULL')).toEqual([{n:1}]);expect((await readCalendarFeed(token,db.executor)).state).toBe('unauthorized');
});
it.each(['logout','reset','deactivate','role','location','eligibility','workspace'])('%s applies the permanent capability lifecycle',async kind=>{
 const {token}=await issue();const edits:Record<string,string>={logout:"DELETE FROM employee_sessions WHERE employee_id='calendar-self'",reset:"UPDATE employee_credentials SET password_hash='replaced' WHERE employee_id='calendar-self'",deactivate:"UPDATE employees SET active=false WHERE id='calendar-self'",role:"UPDATE employees SET role='MANAGER' WHERE id='calendar-self'",location:"UPDATE locations SET active=false WHERE id='loc-2'",eligibility:"DELETE FROM employee_location_eligibility WHERE employee_id='calendar-self' AND location_id='loc-2'",workspace:"UPDATE workspaces SET active=false"};await q(edits[kind]);
 expect((await readCalendarFeed(token,db.executor)).state).toBe(kind==='logout'?'ready':'unauthorized');expect((await status(proof,db.executor)).state).not.toBe(kind==='logout'?'active':'none');
 if(kind!=='logout'){await q("UPDATE employees SET active=true,role='EMPLOYEE' WHERE id='calendar-self'; UPDATE locations SET active=true; UPDATE workspaces SET active=true; INSERT INTO employee_location_eligibility VALUES('calendar-self','loc-2') ON CONFLICT DO NOTHING");expect((await readCalendarFeed(token,db.executor)).state).toBe('unauthorized');}
});
it('location addition never expands existing capability scope',async()=>{
 await seed();await q("DELETE FROM employee_location_eligibility WHERE employee_id='calendar-self' AND location_id='loc-2'");const result=await manage(proof,command(),db.executor);expect(result.status).toBe('created');await q("INSERT INTO employee_location_eligibility VALUES('calendar-self','loc-2')");expect(await status(proof,db.executor)).toMatchObject({state:'active',allowedLocationIds:['loc-1']});
});
it('concurrent rotation and revocation cannot leave an unrevoked former credential',async()=>{
 const {created,token}=await issue();const outcomes=await Promise.all([manage(proof,command('ROTATE',created.generation),db.executor),manage(proof,command('REVOKE',created.generation),db.executor)]);expect(outcomes.filter(r=>r.status==='created'||r.status==='revoked')).toHaveLength(1);expect(outcomes.filter(r=>r.status==='conflict')).toHaveLength(1);expect((await readCalendarFeed(token,db.executor)).state).toBe('unauthorized');expect(Number((await q('SELECT count(*)::integer n FROM calendar_subscriptions WHERE revoked_at IS NULL'))[0].n)).toBeLessThanOrEqual(1);
});
it('lost commit response is recovered without issuing or revealing a second raw credential',async()=>{
 await seed();const cmd=command();const executor={...db.executor,transaction:async(statements:Parameters<typeof db.executor.transaction>[0])=>{const result=await db.executor.transaction(statements);if(statements.some(s=>s.text.startsWith('INSERT INTO calendar_operations')))throw Error('Fictional response lost after commit');return result;}};
 expect((await manage(proof,cmd,executor)).status).toBe('outcome_unknown');const recovered=await manage(proof,cmd,db.executor);expect(recovered.status).toBe('active_url_unavailable');expect(recovered).not.toHaveProperty('url');expect(await q('SELECT count(*)::integer n FROM calendar_subscriptions')).toEqual([{n:1}]);
});

it.each([
 ['ISSUE array',['ISSUE']],['ROTATE array',['ROTATE']],['REVOKE array',['REVOKE']],['object with shadowed toString',{toString:null}],
])('rejects malformed %s without rotating or revoking an active calendar link',async(_name,kind)=>{
 const {created,token}=await issue();
 const subscriptions=await q('SELECT * FROM calendar_subscriptions ORDER BY id'),operations=await q('SELECT * FROM calendar_operations ORDER BY operation_id');
 const malformed=JSON.parse(JSON.stringify({...command('ISSUE',created.generation),kind})) as Parameters<typeof manage>[1];
 expect((await manage(proof,malformed,db.executor)).status).toBe('blocked');
 expect(await q('SELECT * FROM calendar_subscriptions ORDER BY id')).toEqual(subscriptions);
 expect(await q('SELECT * FROM calendar_operations ORDER BY operation_id')).toEqual(operations);
 expect((await readCalendarFeed(token,db.executor)).state).toBe('ready');
});


// Both commands finish their pre-reads before either write transaction begins.
// Release those transactions in a fixed order to exercise the stale-plan guard
// deterministically, without relying on Promise.all connection scheduling.
const calendarRaceGate=()=>{
 let release!:()=>void;
 const waiting=new Promise<void>(resolve=>{release=resolve;});
 return {waiting,release};
};
it.each([
 ['REVOKE','self'],['ROTATE','self'],['REVOKE','manager'],
] as const)('fresh calendar guard rejects the stale loser: %s first, %s revoker',async(first,revoker)=>{
 const {created,token}=await issue();
 const gates={ROTATE:calendarRaceGate(),REVOKE:calendarRaceGate()},both=calendarRaceGate();
 const arrived:('ROTATE'|'REVOKE')[]=[];
 const executor:SqlExecutor={...db.executor,transaction:async(statements,signal)=>{
  const write=statements.find(statement=>statement.text.startsWith('UPDATE calendar_subscriptions SET revoked_at'));
  if(write){
   const kind=write.values[2]==='explicit'?'REVOKE':'ROTATE';
   arrived.push(kind);if(arrived.length===2)both.release();await gates[kind].waiting;
  }
  return db.executor.transaction(statements,signal);
 }};
 const rotation=manage(proof,command('ROTATE',created.generation),executor);
 const revokeCommand=command('REVOKE',created.generation);
 const revocation=revoker==='manager'
  ?revokeEmployeeCalendarSubscription(owner,'calendar-self',{...revokeCommand,authority:calendarAuthority(owner)},executor)
  :manage(proof,revokeCommand,executor);
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{
  await Promise.race([both.waiting,new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>reject(Error('Calendar write planning barrier not reached')),3000);})]);
  expect([...arrived].sort()).toEqual(['REVOKE','ROTATE']);
  gates[first].release();await (first==='ROTATE'?rotation:revocation);
  gates[first==='ROTATE'?'REVOKE':'ROTATE'].release();
  const outcomes=await Promise.all([rotation,revocation]);
  expect(outcomes.filter(result=>result.status==='created'||result.status==='revoked')).toHaveLength(1);
  expect(outcomes.filter(result=>result.status==='conflict')).toHaveLength(1);
  expect(first==='REVOKE'?outcomes[0].status:outcomes[1].status).toBe('conflict');
  expect((await readCalendarFeed(token,db.executor)).state).toBe('unauthorized');
  expect(await q('SELECT count(*)::integer AS n FROM calendar_subscriptions WHERE revoked_at IS NULL')).toEqual([{n:first==='REVOKE'?0:1}]);
  if(outcomes[0].status==='created')expect((await readCalendarFeed(outcomes[0].url.split('/')[3],db.executor)).state).toBe('ready');
 }finally{
  if(timer!==undefined)clearTimeout(timer);
  gates.ROTATE.release();gates.REVOKE.release();await Promise.all([rotation,revocation]);
 }
});
it('a rotation captured before completed revocation cannot create a replacement afterwards',async()=>{
 const {created,token}=await issue(),staleRotation=command('ROTATE',created.generation);
 expect((await manage(proof,command('REVOKE',created.generation),db.executor)).status).toBe('revoked');
 const subscriptions=await q('SELECT * FROM calendar_subscriptions ORDER BY id'),operations=await q('SELECT * FROM calendar_operations ORDER BY operation_id');
 expect((await manage(proof,staleRotation,db.executor)).status).toBe('conflict');
 expect(await q('SELECT * FROM calendar_subscriptions ORDER BY id')).toEqual(subscriptions);
 expect(await q('SELECT * FROM calendar_operations ORDER BY operation_id')).toEqual(operations);
 expect((await readCalendarFeed(token,db.executor)).state).toBe('unauthorized');
 expect(await q('SELECT count(*)::integer AS n FROM calendar_subscriptions WHERE revoked_at IS NULL')).toEqual([{n:0}]);
});
it('fresh issue after revocation and immutable operation replay preserve their lifecycle',async()=>{
 const {created,token}=await issue(),revokeCommand=command('REVOKE',created.generation);
 const revoked=await manage(proof,revokeCommand,db.executor);expect(revoked.status).toBe('revoked');
 const current=await status(proof,db.executor);expect(current.state).toBe('revoked');
 if(!('generation'in current))throw Error('Revoked generation unavailable');
 const issueCommand=command('ISSUE',current.generation),replacement=await manage(proof,issueCommand,db.executor);
 expect(replacement.status).toBe('created');if(replacement.status!=='created')throw Error('Fresh replacement unavailable');
 expect(await manage(proof,revokeCommand,db.executor)).toEqual(revoked);
 const replay=await manage(proof,issueCommand,db.executor);expect(replay.status).toBe('active_url_unavailable');expect(replay).not.toHaveProperty('url');
 expect(await findCalendarOperation(proof,revokeCommand.operationId,revokeCommand.authority,db.executor)).toEqual(revoked);
 expect(await findCalendarOperation(proof,issueCommand.operationId,issueCommand.authority,db.executor)).toEqual(replay);
 expect((await readCalendarFeed(token,db.executor)).state).toBe('unauthorized');
 expect((await readCalendarFeed(replacement.url.split('/')[3],db.executor)).state).toBe('ready');
 expect(await q('SELECT count(*)::integer AS n FROM calendar_subscriptions WHERE revoked_at IS NULL')).toEqual([{n:1}]);
 expect(await q('SELECT count(*)::integer AS n FROM calendar_operations')).toEqual([{n:3}]);
});
