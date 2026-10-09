import {afterEach,beforeEach,expect,it} from 'vitest';
import {createDisposableFoundationDatabase} from './local-postgres';
import {randomUUID} from 'node:crypto';
import {calendarAuthority,manageEmployeeCalendarSubscription as manage,getEmployeeCalendarSubscription as status,findCalendarOperation,readCalendarFeed,revokeEmployeeCalendarSubscription} from '../../lib/calendar/service.server';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
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
