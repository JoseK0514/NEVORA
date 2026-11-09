import {randomUUID} from 'node:crypto';
import {afterEach,beforeEach,expect,it} from 'vitest';
import {createPunchFixture} from './clocker-punch-fixture';
import {readClockMonitor} from '../../lib/data/clock-monitor.server';
import {readToday} from '../../lib/data/today.server';
import {ClockerPunchService} from '../../lib/clocker/punches.server';
import type {SessionMutationProof} from '../../lib/shift-changes/types';

// Fictional loopback PostgreSQL only. Avery works loc-2 and Blair works loc-1.
let f:Awaited<ReturnType<typeof createPunchFixture>>;
const proof=(id:string,role:'OWNER'|'MANAGER',hash:string):SessionMutationProof=>({sessionTokenHash:hash,employee:{id,firstName:'Q',lastName:'A',role,primaryLocationId:'loc-1'}} as SessionMutationProof);
const owner=proof('c34-owner','OWNER','a'.repeat(64)),manager=proof('scope-mgr','MANAGER','c'.repeat(64));
beforeEach(async()=>{
 f=await createPunchFixture();
 await f.q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('scope-mgr','Morgan','QA','558','MANAGER','loc-1');
  INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('c',64),'scope-mgr',now()+interval '1 day');
  INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) VALUES('scope-pub',date_trunc('week',clock_timestamp() AT TIME ZONE 'America/Puerto_Rico'),1,'PUBLISH','c34-owner');
  INSERT INTO schedule_publication_revision_shifts(id,revision_id,schedule_id,location_id,employee_id,date,start_time,end_time) VALUES
   ('scope-a','scope-pub','scope-schedule-2','loc-2','c34-a',(clock_timestamp() AT TIME ZONE 'America/Puerto_Rico')::date,'00:00','24:00'),
   ('scope-b','scope-pub','scope-schedule-1','loc-1','c34-b',(clock_timestamp() AT TIME ZONE 'America/Puerto_Rico')::date,'00:00','24:00');`);
 for(const [device,pin] of [[2,'0123'],[0,'4567']] as const){
  const {proof:clocker}=await f.identity(device,pin),service=new ClockerPunchService(f.key,f.db.executor),view=await service.read(clocker),s=view.snapshot;
  await service.execute(clocker,{commandId:randomUUID(),action:'CLOCK_IN',verificationId:view.verificationId,
   expected:{revision:s.revision,timeEntryId:null,timeEntryVersion:null,breakEntryId:null,breakEntryVersion:null}});
 }
});
afterEach(async()=>{if(f)await f.db.dispose();});

// Stand-in with the real column names and keys; the full F6 installer needs portal_authority.
async function installGrantStorage(){
 await f.q(`CREATE SCHEMA IF NOT EXISTS nevora_tenancy;
  CREATE TABLE nevora_tenancy.portal_administrative_authority(workspace_id text NOT NULL,employee_id text NOT NULL,
   scope_kind text NOT NULL CHECK (scope_kind IN ('ALL_TENANT','LOCATIONS')),scope_origin text NOT NULL,PRIMARY KEY(workspace_id,employee_id));
  CREATE TABLE nevora_tenancy.portal_administrative_location(workspace_id text NOT NULL,employee_id text NOT NULL,location_id text NOT NULL,
   PRIMARY KEY(workspace_id,employee_id,location_id),FOREIGN KEY(workspace_id,employee_id) REFERENCES nevora_tenancy.portal_administrative_authority);`);
}
async function grant(kind:'ALL_TENANT'|'LOCATIONS',locations:string[]=[]){
 await f.q("INSERT INTO nevora_tenancy.portal_administrative_authority VALUES('workspace-fuel','scope-mgr',$1,'EXPLICIT_GRANT')",[kind]);
 for(const location of locations)await f.q("INSERT INTO nevora_tenancy.portal_administrative_location VALUES('workspace-fuel','scope-mgr',$1)",[location]);
}
async function views(who:SessionMutationProof){
 const today=await readToday(who,f.db.executor),monitor=await readClockMonitor(who,f.db.executor);
 if(today.state!=='ready'||monitor.state!=='ready')return {today,monitor};
 return {today,monitor,shiftPeople:today.shifts.map(s=>s.employeeId).sort(),floor:monitor.employees.map(e=>e.employeeId).sort(),clockedIn:today.counts.clockedIn};
}

it('before grant storage exists, owners and managers keep the whole workspace (legacy ALL_TENANT)',async()=>{
 for(const who of [owner,manager])expect(await views(who)).toMatchObject({shiftPeople:['c34-a','c34-b'],floor:['c34-a','c34-b'],clockedIn:2});
});
it('a LOCATIONS grant sees only shifts, punches and names at its locations',async()=>{
 await installGrantStorage();await grant('LOCATIONS',['loc-1']);
 const v=await views(manager);
 expect(v).toMatchObject({shiftPeople:['c34-b'],floor:['c34-b'],clockedIn:1});
 expect(JSON.stringify(v)).not.toMatch(/c34-a|Avery|loc-2/);
});
it('owners and ALL_TENANT grants keep the whole workspace once storage exists',async()=>{
 await installGrantStorage();
 expect(await views(owner)).toMatchObject({shiftPeople:['c34-a','c34-b'],floor:['c34-a','c34-b']});
 await grant('ALL_TENANT');
 expect(await views(manager)).toMatchObject({shiftPeople:['c34-a','c34-b'],floor:['c34-a','c34-b']});
});
it('a manager with no grant row is denied, not shown an empty day',async()=>{
 await installGrantStorage();
 expect(await views(manager)).toEqual({today:{state:'unavailable',reason:'access_denied'},monitor:{state:'unavailable',reason:'access_denied'}});
});
it('a LOCATIONS grant with no locations shows nothing',async()=>{
 await installGrantStorage();await grant('LOCATIONS');
 expect(await views(manager)).toMatchObject({shiftPeople:[],floor:[],clockedIn:0});
});
