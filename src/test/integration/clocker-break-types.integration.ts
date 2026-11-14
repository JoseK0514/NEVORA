

import { beforeEach, afterEach, expect, it } from 'vitest';
import { createPunchFixture } from './clocker-punch-fixture';
import { listBreakTypes, saveBreakType } from '../../lib/clocker/break-types.server';
let f: Awaited<ReturnType<typeof createPunchFixture>>;
const input={name:'Rest break',category:'REST' as const,targetMinutes:15,active:true};
beforeEach(async()=>{
 f=await createPunchFixture();
});
afterEach(async()=>{if(f)await f.db.dispose();});
const create=()=>saveBreakType(f.owner,{...input,expectedVersion:0},f.db.executor);
it('starts empty; Owner explicitly creates operational settings and an audit record',async()=>{
 expect(await listBreakTypes(f.owner,f.db.executor)).toEqual([]);
 const row=await create();expect(row).toMatchObject({...input,version:1});
 expect(await listBreakTypes(f.owner,f.db.executor)).toEqual([row]);
 expect(await f.q('SELECT version,settings FROM clocker_break_type_events')).toEqual([{version:1,settings:row}]);
 expect(await f.q('SELECT * FROM break_entries')).toEqual([]);
});
it.each(['MANAGER','LEAD','EMPLOYEE','inactive','expired','forged'])('denies %s catalog authority',async kind=>{
 const proof={...f.owner};
 if(kind==='inactive')await f.q("UPDATE employees SET active=false WHERE id=$1",[proof.employeeId]);
 else if(kind==='expired')await f.q('UPDATE employee_sessions SET expires_at=clock_timestamp()-interval \'1 second\'');
 else if(kind==='forged')proof.sessionTokenHash='b'.repeat(64);
 else await f.q('UPDATE employees SET role=$1 WHERE id=$2',[kind,proof.employeeId]);
 await expect(saveBreakType(proof,{...input,expectedVersion:0},f.db.executor)).rejects.toMatchObject({code:'FORBIDDEN'});
 await expect(listBreakTypes(proof,f.db.executor)).rejects.toMatchObject({code:'FORBIDDEN'});
 expect(await f.q('SELECT * FROM clocker_break_types')).toEqual([]);
});
it('edits and archives by version, retaining every settings event',async()=>{
 const row=await create();
 const archived=await saveBreakType(f.owner,{...row,name:'Rest period',targetMinutes:null,active:false,expectedVersion:row.version},f.db.executor);
 expect(archived).toMatchObject({name:'Rest period',targetMinutes:null,active:false,version:2});
 expect(await listBreakTypes(f.owner,f.db.executor)).toEqual([archived]);
 await expect(saveBreakType(f.owner,{...row,expectedVersion:1},f.db.executor)).rejects.toMatchObject({code:'STALE'});
 expect(await f.q('SELECT version FROM clocker_break_type_events ORDER BY version')).toEqual([{version:1},{version:2}]);
});
it('reactivation is explicit and increments the catalog version',async()=>{
 const row=await create();const off=await saveBreakType(f.owner,{...row,active:false,expectedVersion:1},f.db.executor);
 expect(await saveBreakType(f.owner,{...off,active:true,expectedVersion:2},f.db.executor)).toMatchObject({active:true,version:3});
});
it('rejects duplicate names including case and whitespace variants',async()=>{
 await create();await expect(saveBreakType(f.owner,{...input,name:' REST BREAK ',expectedVersion:0},f.db.executor)).rejects.toMatchObject({code:'DUPLICATE'});
 expect(await f.q('SELECT count(*)::int AS n FROM clocker_break_types')).toEqual([{n:1}]);
});
it('two concurrent stale edits do not silently overwrite one another',async()=>{
 const row=await create();
 const results=await Promise.allSettled(['Rest A','Rest B'].map(name=>saveBreakType(f.owner,{...row,name,expectedVersion:1},f.db.executor)));
 expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
 expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);
});
it('audit failure rolls back the catalog update',async()=>{
 const row=await create();
 await f.q(`CREATE FUNCTION c5_audit_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test audit failure'; END; $$;
 CREATE TRIGGER c5_audit_fail BEFORE INSERT ON clocker_break_type_events FOR EACH ROW EXECUTE FUNCTION c5_audit_fail();`);
 await expect(saveBreakType(f.owner,{...row,name:'No commit',expectedVersion:1},f.db.executor)).rejects.toMatchObject({code:'UNAVAILABLE'});
 expect(await listBreakTypes(f.owner,f.db.executor)).toEqual([row]);
});
it('rejects missing records and malformed settings without leaking SQL',async()=>{
 await expect(saveBreakType(f.owner,{...input,id:'missing',expectedVersion:1},f.db.executor)).rejects.toMatchObject({code:'STALE'});
 await expect(saveBreakType(f.owner,{...input,name:'',expectedVersion:0},f.db.executor)).rejects.toMatchObject({code:'INVALID'});
});
it('catalog audit is append-only',async()=>{
 await create();await expect(f.q('DELETE FROM clocker_break_type_events')).rejects.toMatchObject({code:'23514'});
 await expect(f.q("UPDATE clocker_break_type_events SET settings='{}'::jsonb")).rejects.toMatchObject({code:'23514'});
});

it('a silently suppressed settings audit cannot commit a catalog edit',async()=>{
 const row=await create();
 await f.q(`CREATE FUNCTION c5_suppress_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END; $$;
 CREATE TRIGGER c5_suppress_audit BEFORE INSERT ON clocker_break_type_events FOR EACH ROW EXECUTE FUNCTION c5_suppress_audit();`);
 await expect(saveBreakType(f.owner,{...row,targetMinutes:30,expectedVersion:1},f.db.executor)).rejects.toMatchObject({code:'UNAVAILABLE'});
 expect(await listBreakTypes(f.owner,f.db.executor)).toEqual([row]);
 expect(await f.q('SELECT version FROM clocker_break_type_events')).toEqual([{version:1}]);
});
