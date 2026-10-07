import { saveWorkspaceProfile, createLocation, updateLocation, insertEmployee, createPosition, updatePosition, updateEmployeeProfile } from './management-api';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { createDisposableFoundationDatabase } from './local-postgres';

describe('foundation SQL', () => {
  it('schema and legacy preservation', async () => {
    const db = await createDisposableFoundationDatabase({ mode: 'upgrade' });
    try {
      const query = (text: string) => db.executor.query<Record<string, unknown>>({ text, values: [] });
      const before = await query('SELECT * FROM locations ORDER BY id');
      const staffing = await query('SELECT * FROM location_staffing_settings ORDER BY location_id');
      await query("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('fictional','Test','Employee','555','LEAD','loc-1'); INSERT INTO employee_location_eligibility VALUES('fictional','loc-1'); INSERT INTO schedules(id,location_id,week_start,created_by) VALUES('schedule-test','loc-1','2026-09-28','fictional'); INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,is_designated_lead) VALUES('shift-test','schedule-test','fictional','2026-09-28','08:00','12:00',true); INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) VALUES('window-test','loc-1',1,'08:00','12:00'); INSERT INTO notifications(id,employee_id,type,title,body) VALUES('history-test','fictional','TEST','History','Fictional history');");
      await query("INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) VALUES('revision-test','2026-09-28',1,'PUBLISH','fictional'); INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time) VALUES('snapshot-test','revision-test','shift-test','schedule-test','loc-1','fictional','2026-09-28','08:00','12:00'); INSERT INTO locations(id,name,short_name) VALUES('other-legacy','Other Legacy','Other');");
      await query("INSERT INTO schedule_templates(id,name,created_by) VALUES('template-test','Legacy template','fictional'); INSERT INTO schedule_template_shifts(id,template_id,location_id,day_offset,start_time,end_time,employee_id) VALUES('template-shift-test','template-test','loc-1',1,'08:00','12:00','fictional');");
      const schedule = await query('SELECT * FROM schedules');
      const shift = await query('SELECT * FROM shifts');
      const windows = await query('SELECT * FROM location_coverage_windows');
      const templates = await query('SELECT * FROM schedule_template_shifts');
      const legacy = await query("SELECT row_to_json(e) AS employee FROM employees e");
      const eligibility = await query('SELECT * FROM employee_location_eligibility');
      const revision = await query('SELECT * FROM schedule_publication_revision_shifts');
      const history = await query('SELECT * FROM notifications');
      await query(await readFile('db/migrations/0008_workspace_positions.sql', 'utf8'));
      const after = await query('SELECT * FROM locations ORDER BY id');
      expect(after.filter(row => row.id !== 'other-legacy').map(({ workspace_id: _w, clocker_key: _k, ...row }) => row)).toEqual(before);
      expect(after.slice(0, 2).map(row => row.clocker_key)).toEqual(['2', '110']);
      expect(after[2].clocker_key).toBe('location-' + createHash('sha256').update('other-legacy').digest('hex').slice(0,55));
      expect(await query("SELECT name,time_zone FROM workspaces")).toEqual([{ name: 'Fuel Coffee Drive', time_zone: 'America/Puerto_Rico' }]);
      expect(await query("SELECT row_to_json(e) AS employee FROM employees e")).toEqual(legacy);
      expect(await query('SELECT * FROM employee_location_eligibility')).toEqual(eligibility);
      expect((await query('SELECT * FROM schedule_publication_revision_shifts')).map(({ position_id: _p, position_name: _n, ...row }) => row)).toEqual(revision);
      expect(await query('SELECT * FROM location_staffing_settings ORDER BY location_id')).toEqual(staffing);
      expect(await query('SELECT * FROM notifications')).toEqual(history);
      expect(await query('SELECT * FROM schedules')).toEqual(schedule);
      expect((await query('SELECT * FROM shifts')).map(({ position_id: _p, ...row }) => row)).toEqual(shift);
      expect(await query('SELECT * FROM location_coverage_windows')).toEqual(windows);
      expect((await query('SELECT * FROM schedule_template_shifts')).map(({ position_id: _p, ...row }) => row)).toEqual(templates);
      expect(await query('SELECT position_id FROM schedule_template_shifts')).toEqual([{ position_id: null }]);
      expect(await query('SELECT position_id,position_name FROM schedule_publication_revision_shifts')).toEqual([{ position_id: null, position_name: null }]);
      expect(await query('SELECT position_id FROM shifts')).toEqual([{ position_id: null }]);
      expect(await query('SELECT * FROM employee_positions')).toEqual([]);
      expect(await query('SELECT * FROM positions')).toEqual([]);
      await query("INSERT INTO positions(id,workspace_id,name) VALUES('pos-test','workspace-fuel','Cashier'); INSERT INTO employee_positions VALUES('fictional','pos-test');");
      const failures = [
        ["INSERT INTO employee_positions VALUES('fictional','pos-test')", '23505', 'employee_positions_pkey'],
        ["INSERT INTO locations(id,workspace_id,clocker_key,name,short_name) VALUES('duplicate','workspace-fuel','2','Other','Other')", '23505', 'location_clocker_key_unique'],
        ["INSERT INTO coverage_window_position_requirements VALUES('window-test','pos-test',0)", '23514', 'coverage_window_position_requirements_quantity_check'],
        ["INSERT INTO coverage_window_position_requirements VALUES('window-test','pos-test',101)", '23514', 'coverage_window_position_requirements_quantity_check'],
        ["DELETE FROM positions WHERE id='pos-test'", '23503', 'employee_positions_position_id_fkey'],
        ["INSERT INTO positions(id,workspace_id,name) VALUES('pos-duplicate','workspace-fuel','CASHIER')", '23505', 'positions_workspace_name_unique'],
        ["INSERT INTO workspaces(id,name,time_zone) VALUES('second','Second','America/New_York')", '23505', 'workspaces_singleton_key'],
        ["INSERT INTO locations(id,name,short_name) VALUES('missing-inputs','New','New')", '23502', undefined],
      ] as const;
      for (const [text, code, constraint] of failures) {
        await expect(query(text)).rejects.toMatchObject(constraint ? { code, constraint } : { code });
      }
      await query("INSERT INTO coverage_window_position_requirements VALUES('window-test','pos-test',1)");
      await expect(query("INSERT INTO coverage_window_position_requirements VALUES('window-test','pos-test',1)")).rejects.toMatchObject({ code: '23505', constraint: 'coverage_window_position_requirements_pkey' });
      await query("UPDATE coverage_window_position_requirements SET quantity=100 WHERE position_id='pos-test'");
      expect(await query("SELECT quantity FROM coverage_window_position_requirements")).toEqual([{ quantity: 100 }]);
      await query("DELETE FROM employee_positions; DELETE FROM coverage_window_position_requirements");
      for (const [table, id, constraint] of [['shifts','shift-test','shifts_position_id_fkey'], ['schedule_template_shifts','template-shift-test','schedule_template_shifts_position_id_fkey'], ['schedule_publication_revision_shifts','snapshot-test','schedule_publication_revision_shifts_position_id_fkey']]) {
        await query(`UPDATE ${table} SET position_id='pos-test' WHERE id='${id}'`);
        await expect(query("DELETE FROM positions WHERE id='pos-test'")).rejects.toMatchObject({ code: '23503', constraint });
        await query(`UPDATE ${table} SET position_id=NULL WHERE id='${id}'`);
      }
    } finally { await db.dispose(); }
  });
});

it('empty mode owns a new database and refuses unsafe targets', async () => {
  const { Client } = await import('pg');
  const previous = process.env.FUEL_TEST_DATABASE_URL;
  const applicationUrl = process.env.DATABASE_URL;
  const db = await createDisposableFoundationDatabase({ mode: 'empty' });
  const adminUrl = new URL(db.connectionString); adminUrl.pathname = '/postgres';
  const admin = new Client({ connectionString: adminUrl.href });
  await admin.connect();
  try {
    expect(await db.executor.query({ text: "SELECT table_name FROM information_schema.tables WHERE table_schema='public'", values: [] })).toEqual([]);
    await expect(createDisposableFoundationDatabase({ mode: 'empty' })).rejects.toThrow('Refusing existing database');
    process.env.DATABASE_URL = 'postgresql://fictional.invalid/customer';
    await expect(createDisposableFoundationDatabase({ mode: 'empty' })).rejects.toThrow('Refusing DATABASE_URL');
    delete process.env.DATABASE_URL;
    process.env.FUEL_TEST_DATABASE_URL = 'postgresql://fictional.invalid/nevora_foundation_test_unsafe';
    await expect(createDisposableFoundationDatabase({ mode: 'empty' })).rejects.toThrow('Refusing non-disposable/remote');
    process.env.FUEL_TEST_DATABASE_URL = previous;
    const name = decodeURIComponent(new URL(db.connectionString).pathname.slice(1));
    const marker = (await admin.query("SELECT shobj_description(oid, 'pg_database') AS marker FROM pg_database WHERE datname=$1", [name])).rows[0].marker;
    await admin.query(`COMMENT ON DATABASE "${name}" IS 'wrong-owner'`);
    await expect(db.dispose()).rejects.toThrow('ownership marker missing');
    await admin.query(`COMMENT ON DATABASE "${name}" IS '${marker}'`);
    await db.dispose();
    expect((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [name])).rowCount).toBe(0);
  } finally {
    process.env.FUEL_TEST_DATABASE_URL = previous;
    if (applicationUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = applicationUrl;
    await db.dispose(); await admin.end();
  }
});

it('preserves formerly legal legacy location names while validating new writes', async () => {
  const db = await createDisposableFoundationDatabase({ mode: 'upgrade' });
  const query = (text: string, values: unknown[] = []) => db.executor.query({ text, values });
  try {
    const name = ` ${'x'.repeat(161)} `; const short = ` ${'y'.repeat(49)} `;
    await query('INSERT INTO locations(id,name,short_name) VALUES($1,$2,$3)', ['legacy-boundary', name, short]);
    await expect(query(await readFile('db/migrations/0008_workspace_positions.sql', 'utf8'))).resolves.toBeUndefined();
    expect(await query("SELECT name,short_name FROM locations WHERE id='legacy-boundary'")).toEqual([{ name, short_name: short }]);
    await expect(query("INSERT INTO locations(id,workspace_id,clocker_key,name,short_name) VALUES('bad-new','workspace-fuel','bad-new',' Untrimmed ','New')")).rejects.toMatchObject({ code: '23514', constraint: 'location_name_format' });
  } finally { await db.dispose(); }
});

it('cleans up successful CREATE when COMMENT fails', async () => {
  const { Client } = await import('pg'); const { vi } = await import('vitest');
  const url = new URL(process.env.FUEL_TEST_DATABASE_URL!); const name = decodeURIComponent(url.pathname.slice(1));
  const adminUrl = new URL(url); adminUrl.pathname = '/postgres';
  const observer = new Client({ connectionString: adminUrl.href }); await observer.connect();
  const original = Client.prototype.query;
  let failComment = true; let testCreatedOid: number | undefined;
  const spy = vi.spyOn(Client.prototype, 'query').mockImplementation(function (this: InstanceType<typeof Client>, ...args: unknown[]) {
    const text = typeof args[0] === 'string' ? args[0] : '';
    if (failComment && text.startsWith('COMMENT ON DATABASE')) { failComment = false; return Promise.reject(new Error('injected-comment-failure')); }
    if (text.startsWith('CREATE DATABASE')) {
      return Promise.resolve(Reflect.apply(original, this, args)).then(async result => {
        testCreatedOid = (await Reflect.apply(original, observer, ['SELECT oid FROM pg_database WHERE datname=$1', [name]])).rows[0]?.oid;
        return result;
      });
    }
    return Reflect.apply(original, this, args);
  } as typeof original);
  let db: Awaited<ReturnType<typeof createDisposableFoundationDatabase>> | undefined;
  try {
    await expect(createDisposableFoundationDatabase({ mode: 'empty' })).rejects.toThrow('injected-comment-failure');
    expect((await observer.query('SELECT 1 FROM pg_database WHERE datname=$1', [name])).rowCount).toBe(0);
  } finally {
    spy.mockRestore();
    if (db) await db.dispose();
    // Recover a failed red run only with this invocation's successfully created OID.
    const current = (await observer.query('SELECT oid FROM pg_database WHERE datname=$1', [name])).rows[0]?.oid;
    if (testCreatedOid !== undefined && current === testCreatedOid) await observer.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    await observer.end();
  }
});

it('closes a connected worker when backend PID lookup fails', async () => {
  const { Client } = await import('pg'); const { vi } = await import('vitest');
  const db = await createDisposableFoundationDatabase({ mode: 'empty' });
  const target = new URL(db.connectionString); const name = decodeURIComponent(target.pathname.slice(1)); target.pathname = '/postgres';
  const observer = new Client({ connectionString: target.href }); await observer.connect();
  const original = Client.prototype.query;
  const spy = vi.spyOn(Client.prototype, 'query').mockImplementation(function (this: InstanceType<typeof Client>, ...args: unknown[]) {
    if (args[0] === 'SELECT pg_backend_pid() AS pid') return Promise.reject(new Error('injected-pid-failure'));
    return Reflect.apply(original, this, args);
  } as typeof original);
  try {
    await expect(db.executor.query({ text: 'SELECT 1', values: [] })).rejects.toThrow('injected-pid-failure');
    expect((await observer.query('SELECT 1 FROM pg_stat_activity WHERE datname=$1', [name])).rowCount).toBe(0);
  } finally { spy.mockRestore(); await db.dispose(); await observer.end(); }
});

import { getWorkspace, workspaceReadGuard, WorkspaceTimezoneLockedError } from '../../lib/data/workspaces';
import type {SqlExecutor,SqlStatement} from '../../lib/notifications/types';
async function workspaceFixture() {
 const db=await createDisposableFoundationDatabase({mode:'current-runtime'});
 try {
 await db.executor.query({text:"UPDATE workspaces SET name='Northside Services',time_zone='America/New_York'; INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('owner','Test','Owner','555','OWNER','loc-1'),('manager','Test','Manager','556','MANAGER','loc-1');",values:[]});
 return db;
 } catch(error) {await db.dispose();throw error;}
}
it('workspace profile enforces active Owner and permits normal availability and unchanged timezone name edits',async()=>{
 const db=await workspaceFixture();const q=(text:string)=>db.executor.query({text,values:[]});
 try {
 expect((await getWorkspace(db.executor)).name).toBe('Northside Services');
 await expect(saveWorkspaceProfile({name:'Forged',timeZone:'Asia/Tokyo',actorEmployeeId:'manager'},db.executor)).rejects.toThrow();
 await q("UPDATE employees SET active=false WHERE id='owner'");
 await expect(saveWorkspaceProfile({name:'Forged',timeZone:'Asia/Tokyo',actorEmployeeId:'owner'},db.executor)).rejects.toThrow();
 await q("UPDATE employees SET active=true WHERE id='owner'; INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) VALUES('normal','owner',1,'08:00','12:00')");
 expect((await saveWorkspaceProfile({name:'Northside Edited',timeZone:'Asia/Tokyo',actorEmployeeId:'owner'},db.executor)).timeZone).toBe('Asia/Tokyo');
 await q("INSERT INTO schedules(id,location_id,week_start,created_by) VALUES('dated','loc-1','2030-10-07','owner')");
 expect((await saveWorkspaceProfile({name:'Northside Renamed',timeZone:'Asia/Tokyo',actorEmployeeId:'owner'},db.executor)).name).toBe('Northside Renamed');
 }finally{await db.dispose();}
});
it.each([
 ['schedule',"INSERT INTO schedules(id,location_id,week_start,created_by) VALUES('dated','loc-1','2030-10-07','owner')"],
 ['revision',"INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) VALUES('rev','2030-10-07',1,'PUBLISH','owner')"],
 ['dated exception',"INSERT INTO availability_exceptions(id,employee_id,date,kind) VALUES('ex','owner','2030-10-07','UNAVAILABLE')"],
 ['weekly window',"INSERT INTO weekly_availability_windows(id,employee_id,week_start,day_of_week,start_time,end_time) VALUES('ww','owner','2030-10-07',1,'08:00','12:00')"],
 ['weekly submission',"INSERT INTO weekly_availability_submissions(employee_id,week_start) VALUES('owner','2030-10-07')"],
 ['deadline',"INSERT INTO schedule_week_settings(week_start,availability_deadline,updated_by) VALUES('2030-10-07','2030-10-06T12:00Z','owner')"],
 ['Time Off',"INSERT INTO time_off_requests(id,employee_id,start_date,end_date) VALUES('to','owner','2030-10-07','2030-10-08')"],
 ['time entry',"INSERT INTO clocker_devices(id,location_id,name) VALUES('device','loc-1','Fictional'); INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status) VALUES('entry','owner','loc-1','device','2030-10-07T12:00Z','CLOCKED_IN')"],
])('existing %s blocks timezone edit',async(_kind,sql)=>{
 const db=await workspaceFixture();try{
 await db.executor.query({text:sql,values:[]});
 await expect(saveWorkspaceProfile({name:'Northside Services',timeZone:'Asia/Tokyo',actorEmployeeId:'owner'},db.executor)).rejects.toBeInstanceOf(WorkspaceTimezoneLockedError);
 expect((await getWorkspace(db.executor)).timeZone).toBe('America/New_York');
 }finally{await db.dispose();}
});
it.each(['write-first','edit-first'])('timezone edit race serializes first dated write: %s',async(order)=>{
 const db=await workspaceFixture();const {Client}=await import('pg');
 const first=new Client({connectionString:db.connectionString});const second=new Client({connectionString:db.connectionString});await first.connect();await second.connect();
 const execute=async(client:InstanceType<typeof Client>,statements:readonly SqlStatement[])=>{await client.query('BEGIN');try{const result=[];for(const s of statements)result.push((await client.query(s.text,[...s.values])).rows);await client.query('COMMIT');return result;}catch(e){await client.query('ROLLBACK');throw e;}};
 const executor:SqlExecutor={query:async<T>(s:SqlStatement)=>(await second.query(s.text,[...s.values])).rows as T[],transaction:s=>execute(second,s)};
 try{
 const workspace=await getWorkspace(db.executor);
 await first.query('BEGIN');await first.query(`SELECT id FROM workspaces FOR ${order==='write-first'?'SHARE':'UPDATE'}`);
 let settled=false;
 const secondPid=(await second.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
 const competing=(order==='write-first'?saveWorkspaceProfile({name:'Edited',timeZone:'Asia/Tokyo',actorEmployeeId:'owner'},executor):executor.transaction([...workspaceReadGuard(workspace),{text:"INSERT INTO time_off_requests(id,employee_id,start_date,end_date) VALUES('race','owner','2030-10-07','2030-10-08')",values:[]}])).then(value=>({value}),error=>({error})).finally(()=>{settled=true;});
 // Wait for the second backend to be blocked by the first, rather than timing alone.
 for(let tries=0;tries<100;tries++){ const [row]=await db.executor.query<{blocked:boolean}>({text:'SELECT cardinality(pg_blocking_pids($1))>0 AS blocked',values:[secondPid]}); if(row.blocked)break; if(tries===99)throw new Error('Expected workspace lock barrier'); await new Promise(resolve=>setTimeout(resolve,10)); }
 if(order==='write-first')await first.query("INSERT INTO time_off_requests(id,employee_id,start_date,end_date) VALUES('race','owner','2030-10-07','2030-10-08')");
 else await first.query("UPDATE workspaces SET time_zone='Asia/Tokyo',updated_at=updated_at+interval '1 microsecond'");
 expect(settled).toBe(false);await first.query('COMMIT');const outcome=await competing;
 expect('error' in outcome).toBe(true);
 if(order==='write-first'){expect((outcome as {error:unknown}).error).toBeInstanceOf(WorkspaceTimezoneLockedError);expect((await getWorkspace(db.executor)).timeZone).toBe('America/New_York');}
 else{expect((outcome as {error:{code:string}}).error.code).toBe('22P02');expect(await db.executor.query({text:'SELECT id FROM time_off_requests',values:[]})).toEqual([]);}
 }finally{await first.query('ROLLBACK');await first.end();await second.end();await db.dispose();}
});

it('stale workspace aborts real Time Off mutation and notification intents atomically',async()=>{
 const db=await workspaceFixture();const {createTimeOffRequest}=await import('../../lib/data/requests');
 try{
 const executor:SqlExecutor={query:(s,signal)=>db.executor.query(s,signal),transaction:async statements=>{
 await db.executor.query({text:"UPDATE workspaces SET time_zone='Asia/Tokyo',updated_at=updated_at+interval '1 microsecond'",values:[]});
 return db.executor.transaction(statements);
 }};
 await expect(createTimeOffRequest({employeeId:'owner',startDate:'2030-10-07',endDate:'2030-10-08'},executor)).rejects.toMatchObject({code:'22P02'});
 expect(await db.executor.query({text:'SELECT id FROM time_off_requests',values:[]})).toEqual([]);
 expect(await db.executor.query({text:'SELECT id FROM notifications',values:[]})).toEqual([]);
 }finally{await db.dispose();}
});

import { listLocations, findActiveLocationByClockerKey } from '../../lib/data/locations';
it('location identity enforces Owner writes and preserves keys, memberships and history',async()=>{
 const db=await workspaceFixture();const q=(text:string,values:unknown[]=[])=>db.executor.query({text,values});
 try {
  const location=await createLocation({name:' Northside New ',shortName:' New ',clockerKey:'northside-new',actorEmployeeId:'owner'},db.executor);
  expect(location).toMatchObject({name:'Northside New',shortName:'New',active:true,clockerKey:'northside-new'});
  for(const table of ['location_staffing_settings','location_coverage_windows','employee_location_eligibility'])expect(await q(`SELECT * FROM ${table} WHERE location_id=$1`,[location.id])).toEqual([]);
  expect(await findActiveLocationByClockerKey('northside-new',db.executor)).toEqual(location);
  await expect(createLocation({name:'Duplicate',shortName:'Dup',clockerKey:'northside-new',actorEmployeeId:'owner'},db.executor)).rejects.toThrow();
  await q("INSERT INTO employee_location_eligibility VALUES('owner',$1)",[location.id]);
  await q("INSERT INTO schedules(id,location_id,week_start,created_by) VALUES('location-history',$1,'2026-09-28','owner')",[location.id]);
  const renamed=await updateLocation({id:location.id,name:'Renamed',shortName:'Renamed',active:false,actorEmployeeId:'owner'},db.executor);
  expect(renamed.clockerKey).toBe('northside-new');expect(await findActiveLocationByClockerKey('northside-new',db.executor)).toBeNull();
  expect((await listLocations({includeInactive:true},db.executor)).find(l=>l.id===location.id)).toEqual(renamed);
  expect((await listLocations({},db.executor)).some(l=>l.id===location.id)).toBe(false);
  expect(await q("SELECT location_id FROM schedules WHERE id='location-history'")).toEqual([{location_id:location.id}]);expect(await q('SELECT location_id FROM employee_location_eligibility WHERE location_id=$1',[location.id])).toEqual([{location_id:location.id}]);
  await expect(updateLocation({id:'forged',name:'Forged',shortName:'Forged',active:true,actorEmployeeId:'owner'},db.executor)).rejects.toThrow();
  await q("UPDATE employees SET role='MANAGER' WHERE id='owner'");
  await expect(createLocation({name:'Denied',shortName:'Denied',actorEmployeeId:'owner'},db.executor)).rejects.toThrow('Owner');
  await expect(updateLocation({id:location.id,name:'Denied',shortName:'Denied',active:true,actorEmployeeId:'owner'},db.executor)).rejects.toThrow('Owner');
 } finally {await db.dispose();}
});
it.each(['write-first','deactivate-first'])('location identity access race reauthorizes Owner: %s',async order=>{
 const db=await workspaceFixture();const {Client}=await import('pg');
 const first=new Client({connectionString:db.connectionString});const second=new Client({connectionString:db.connectionString});await first.connect();await second.connect();
 const execute=async(statements:readonly SqlStatement[])=>{await second.query('BEGIN');try{const results=[];for(const s of statements)results.push((await second.query(s.text,[...s.values])).rows);await second.query('COMMIT');return results;}catch(error){await second.query('ROLLBACK');throw error;}};
 const executor:SqlExecutor={query:async<T>(s:SqlStatement)=>(await second.query(s.text,[...s.values])).rows as T[],transaction:execute};
 try{
  await first.query('BEGIN');
  await first.query(`SELECT id FROM employees WHERE id='owner' FOR ${order==='write-first'?'SHARE':'UPDATE'}`);
  const pid=(await second.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
  const competing=(order==='deactivate-first'?createLocation({name:'Racing',shortName:'Race',clockerKey:'race-created',actorEmployeeId:'owner'},executor):second.query("UPDATE employees SET active=false WHERE id='owner'")).then(value=>({value}),error=>({error}));
  for(let tries=0;tries<100;tries++){const [row]=await db.executor.query<{blocked:boolean}>({text:'SELECT cardinality(pg_blocking_pids($1))>0 AS blocked',values:[pid]});if(row.blocked)break;if(tries===99)throw new Error('Expected employee lock barrier');await new Promise(resolve=>setTimeout(resolve,10));}
  if(order==='deactivate-first')await first.query("UPDATE employees SET active=false WHERE id='owner'");
  else await first.query("INSERT INTO locations(id,workspace_id,clocker_key,name,short_name) VALUES('race-created','workspace-fuel','race-created','Racing','Race')");
  await first.query('COMMIT');const outcome=await competing;
  if(order==='deactivate-first'){expect('error' in outcome).toBe(true);expect((outcome as {error:Error}).error.message).toContain('Owner');expect(await db.executor.query({text:"SELECT id FROM locations WHERE clocker_key='race-created'",values:[]})).toEqual([]);}
  else {expect('error' in outcome).toBe(false);expect(await db.executor.query({text:"SELECT id FROM locations WHERE clocker_key='race-created'",values:[]})).toEqual([{id:'race-created'}]);}
 }finally{await first.query('ROLLBACK');await first.end();await second.end();await db.dispose();}
});
it.each([1,3,5,20])('location identity supports %i arbitrary generic locations',async count=>{
 const db=await workspaceFixture();try{
  for(let i=0;i<count;i++)await createLocation({name:i===1?'Northside West Branch — Customer Services and Operations Center':`Northside ${i+1}`,shortName:`Branch ${i+1}`,actorEmployeeId:'owner'},db.executor);
  const locations=await listLocations({},db.executor);expect(locations).toHaveLength(count+2);
  expect(new Set(locations.map(l=>l.clockerKey)).size).toBe(count+2);
  expect(await db.executor.query({text:'SELECT * FROM location_staffing_settings WHERE location_id NOT IN ($1,$2)',values:['loc-1','loc-2']})).toEqual([]);
 }finally{await db.dispose();}
});

import { listEmployees } from '../../lib/data/employees';
import { listPositions, replaceEmployeePositions, employeePositionMembershipStatements } from '../../lib/data/positions';
it('position membership validates permissions and complete qualified sets',async()=>{
 const db=await workspaceFixture();const q=(text:string,values:unknown[]=[])=>db.executor.query({text,values});
 try {
 const barista=await createPosition({name:' Barista ',actorEmployeeId:'owner'},db.executor);
 const cashier=await createPosition({name:'Cashier',actorEmployeeId:'owner'},db.executor);
 expect(barista.name).toBe('Barista');
 await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('sam','Sam','Test','557','LEAD','loc-1'),('employee','Emp','Test','558','EMPLOYEE','loc-1')");
 await expect(createPosition({name:'Denied',actorEmployeeId:'manager'},db.executor)).rejects.toThrow();
 await expect(replaceEmployeePositions({employeeId:'sam',positionIds:[barista.id],actorEmployeeId:'sam'},db.executor)).rejects.toThrow();
 await expect(updatePosition({id:barista.id,name:'Denied',active:true,actorEmployeeId:'manager'},db.executor)).rejects.toThrow();
 await expect(createPosition({name:'barista',actorEmployeeId:'owner'},db.executor)).rejects.toThrow();
 await expect(replaceEmployeePositions({employeeId:'employee',positionIds:[barista.id],actorEmployeeId:'employee'},db.executor)).rejects.toThrow();
 await replaceEmployeePositions({employeeId:'sam',positionIds:[cashier.id,barista.id,barista.id],actorEmployeeId:'manager'},db.executor);
 expect(await q("SELECT position_id FROM employee_positions WHERE employee_id='sam' ORDER BY position_id")).toEqual([barista.id,cashier.id].sort().map(position_id=>({position_id})));
 await expect(replaceEmployeePositions({employeeId:'sam',positionIds:['unknown'],actorEmployeeId:'manager'},db.executor)).rejects.toThrow();
 expect((await listEmployees(db.executor)).find(e=>e.id==='sam')?.positionIds).toEqual([barista.id,cashier.id].sort());
 expect((await listEmployees(db.executor)).find(e=>e.id==='employee')?.positionIds).toEqual([]);
 const renamed=await updatePosition({id:barista.id,name:'Coffee Service',active:false,actorEmployeeId:'owner'},db.executor);
 expect(renamed.id).toBe(barista.id);
 expect((await listPositions({},db.executor)).map(p=>p.id)).toEqual([cashier.id]);
 expect((await listPositions({includeInactive:true},db.executor))).toHaveLength(2);
 await replaceEmployeePositions({employeeId:'sam',positionIds:[barista.id],actorEmployeeId:'manager'},db.executor);
 await expect(replaceEmployeePositions({employeeId:'employee',positionIds:[barista.id],actorEmployeeId:'manager'},db.executor)).rejects.toThrow();
 await replaceEmployeePositions({employeeId:'sam',positionIds:[],actorEmployeeId:'owner'},db.executor);
 expect(await q("SELECT position_id FROM employee_positions WHERE employee_id='sam'")).toEqual([]);
 }finally{await db.dispose();}
});

it('position membership concurrent replacements serialize complete sets',async()=>{
 const db=await workspaceFixture();const {Client}=await import('pg');
 const first=new Client({connectionString:db.connectionString});const second=new Client({connectionString:db.connectionString});await first.connect();await second.connect();
 const executor:SqlExecutor={query:async<T>(s:SqlStatement)=>(await second.query(s.text,[...s.values])).rows as T[],transaction:async statements=>{await second.query('BEGIN');try{const results=[];for(const s of statements)results.push((await second.query(s.text,[...s.values])).rows);await second.query('COMMIT');return results;}catch(error){await second.query('ROLLBACK');throw error;}}};
 try {
 const a=await createPosition({name:'A',actorEmployeeId:'owner'},db.executor),b=await createPosition({name:'B',actorEmployeeId:'owner'},db.executor),c=await createPosition({name:'C',actorEmployeeId:'owner'},db.executor);
 const workspace=await getWorkspace(db.executor);
 await first.query('BEGIN');for(const s of workspaceReadGuard(workspace))await first.query(s.text,[...s.values]);
 await first.query("SELECT id FROM employees WHERE id IN ('manager','owner') ORDER BY id FOR UPDATE");
 // First transaction is paused after DELETE. A competing replacement must block
 // before reading held membership or deleting/inserting its own complete set.
 await first.query("DELETE FROM employee_positions WHERE employee_id='manager'");
 const pid=(await second.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
 const competing=replaceEmployeePositions({employeeId:'manager',positionIds:[b.id,c.id],actorEmployeeId:'owner'},executor);
 for(let tries=0;tries<100;tries++){const [row]=await db.executor.query<{blocked:boolean}>({text:'SELECT cardinality(pg_blocking_pids($1))>0 AS blocked',values:[pid]});if(row.blocked)break;if(tries===99)throw Error('Expected membership employee lock barrier');await new Promise(resolve=>setTimeout(resolve,10));}
 for(const s of employeePositionMembershipStatements({employeeId:'manager',positionIds:[a.id,b.id]}))await first.query(s.text,[...s.values]);
 await first.query('COMMIT');await competing;
 expect(await db.executor.query({text:"SELECT position_id FROM employee_positions WHERE employee_id='manager' ORDER BY position_id",values:[]})).toEqual([b.id,c.id].sort().map(position_id=>({position_id})));
 // Opposite actor/target direction completes as well; shared sorted UPDATE locks
 // avoid holding each manager as actor while waiting on the other target.
 await db.executor.query({text:"UPDATE employees SET role='MANAGER' WHERE id='owner'",values:[]});
 await Promise.all([replaceEmployeePositions({employeeId:'owner',positionIds:[a.id],actorEmployeeId:'manager'},db.executor),replaceEmployeePositions({employeeId:'manager',positionIds:[c.id],actorEmployeeId:'owner'},executor)]);
 expect((await listEmployees(db.executor)).find(e=>e.id==='owner')?.positionIds).toEqual([a.id]);
 expect((await listEmployees(db.executor)).find(e=>e.id==='manager')?.positionIds).toEqual([c.id]);
 }finally{await first.query('ROLLBACK');await first.end();await second.end();await db.dispose();}
});

it('position membership employee creation is authorized and atomic with qualifications',async()=>{
 const db=await workspaceFixture();
 try {
 const position=await createPosition({name:'Lead',actorEmployeeId:'owner'},db.executor);
 const base={id:'new-employee',firstName:'New',lastName:'Employee',phone:'5551234567',role:'EMPLOYEE' as const,primaryLocationId:'loc-1',eligibleLocationIds:['loc-2'],actorEmployeeId:'manager'};
 await expect(insertEmployee({...base,positionIds:['unknown']},db.executor)).rejects.toThrow();
 expect((await listEmployees(db.executor)).some(e=>e.id===base.id)).toBe(false);
 await expect(insertEmployee({...base,role:'OWNER'},db.executor)).rejects.toThrow();
 await insertEmployee({...base,positionIds:[position.id,position.id],passwordHash:'fictional-test-hash'},db.executor);
 expect((await listEmployees(db.executor)).find(e=>e.id===base.id)).toMatchObject({role:'EMPLOYEE',positionIds:[position.id],eligibleLocationIds:['loc-1','loc-2']});
 expect(await db.executor.query({text:'SELECT employee_id FROM employee_credentials WHERE employee_id=$1',values:[base.id]})).toEqual([{employee_id:base.id}]);
 await insertEmployee({...base,id:'legacy-empty'},db.executor);
 expect((await listEmployees(db.executor)).find(e=>e.id==='legacy-empty')?.positionIds).toEqual([]);
 await db.executor.query({text:'UPDATE positions SET active=false WHERE id=$1',values:[position.id]});
 await expect(insertEmployee({...base,id:'inactive-create',positionIds:[position.id]},db.executor)).rejects.toThrow();
 expect((await listEmployees(db.executor)).some(e=>e.id==='inactive-create')).toBe(false);
 }finally{await db.dispose();}
});

it.each(['assignment-first','deactivate-first'])('position membership catalog race validates after lock: %s',async order=>{
 const db=await workspaceFixture();const {Client}=await import('pg');const first=new Client({connectionString:db.connectionString});const second=new Client({connectionString:db.connectionString});await first.connect();await second.connect();
 const execute=async(statements:readonly SqlStatement[])=>{await second.query('BEGIN');try{const results=[];for(const s of statements)results.push((await second.query(s.text,[...s.values])).rows);await second.query('COMMIT');return results;}catch(error){await second.query('ROLLBACK');throw error;}};
 const executor:SqlExecutor={query:async<T>(s:SqlStatement)=>(await second.query(s.text,[...s.values])).rows as T[],transaction:execute};
 try{
 const position=await createPosition({name:'Race',actorEmployeeId:'owner'},db.executor);
 await first.query('BEGIN');await first.query(`SELECT id FROM positions WHERE id=$1 FOR ${order==='assignment-first'?'SHARE':'UPDATE'}`,[position.id]);
 const pid=(await second.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
 const competing=(order==='deactivate-first'?replaceEmployeePositions({employeeId:'manager',positionIds:[position.id],actorEmployeeId:'owner'},executor):updatePosition({id:position.id,name:'Race',active:false,actorEmployeeId:'owner'},executor)).then(value=>({value}),error=>({error}));
 for(let tries=0;tries<100;tries++){const [row]=await db.executor.query<{blocked:boolean}>({text:'SELECT cardinality(pg_blocking_pids($1))>0 AS blocked',values:[pid]});if(row.blocked)break;if(tries===99)throw Error('Expected catalog lock barrier');await new Promise(resolve=>setTimeout(resolve,10));}
 if(order==='deactivate-first')await first.query('UPDATE positions SET active=false WHERE id=$1',[position.id]);
 else await first.query("INSERT INTO employee_positions(employee_id,position_id) VALUES('manager',$1)",[position.id]);
 await first.query('COMMIT');const outcome=await competing;
 expect('error' in outcome).toBe(order==='deactivate-first');
 expect((await listEmployees(db.executor)).find(e=>e.id==='manager')?.positionIds).toEqual(order==='deactivate-first'?[]:[position.id]);
 }finally{await first.query('ROLLBACK');await first.end();await second.end();await db.dispose();}
});

it('Task 6 SQL context preserves active qualifications, target location facts and cross-location position ledger', async () => {
  const { getShiftValidationContext } = await import('./management-api');
  const { validateShift } = await import('../../lib/scheduling/validate-shift');
  const db = await createDisposableFoundationDatabase({mode:'current-runtime'});
  try {
    const query = (text: string) => db.executor.query({text,values:[]});
    await query(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('task6-sam','Sam','Fictional','555666','LEAD','loc-1');
      INSERT INTO employee_location_eligibility VALUES('task6-sam','loc-1'),('task6-sam','loc-2');
      INSERT INTO positions(id,workspace_id,name,active) VALUES('task6-barista','workspace-fuel','Barista',true),('task6-inactive','workspace-fuel','Retired',false);
      INSERT INTO employee_positions VALUES('task6-sam','task6-barista'),('task6-sam','task6-inactive');
      INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) VALUES('task6-available','task6-sam',1,'00:00','23:59');
      INSERT INTO schedules(id,location_id,week_start,created_by) VALUES('task6-schedule','loc-2','2026-10-05','task6-sam');
      INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id) VALUES('task6-shift','task6-schedule','task6-sam','2026-10-05','08:00','12:00','task6-barista');`);
    const context = await getShiftValidationContext({employeeId:'task6-sam',locationId:'loc-1',positionId:'task6-barista',date:'2026-10-05',weekStart:'2026-10-05'},db.executor);
    expect(context).toMatchObject({workspace:{id:'workspace-fuel',timeZone:'America/Puerto_Rico',active:true},location:{id:'loc-1',active:true},position:{id:'task6-barista',active:true},employee:{positionIds:['task6-barista'],eligibleLocationIds:expect.arrayContaining(['loc-1','loc-2'])},existingShifts:[expect.objectContaining({locationId:'loc-2',positionId:'task6-barista'})]});
    const candidate={employeeId:'task6-sam',locationId:'loc-1',positionId:'task6-barista',date:'2026-10-05',startTime:'09:00',endTime:'11:00'};
    expect(validateShift({...context!,candidate}).blockers).toContainEqual(expect.objectContaining({code:'SHIFT_OVERLAP'}));
    await query("UPDATE locations SET active=false WHERE id='loc-1'");
    const inactive=await getShiftValidationContext({employeeId:'task6-sam',locationId:'loc-1',positionId:'task6-inactive',date:'2026-10-05',weekStart:'2026-10-05'},db.executor);
    expect(inactive).toMatchObject({location:{active:false},position:{active:false}});
    expect(validateShift({...inactive!,candidate:{...candidate,positionId:'task6-inactive'}}).blockers.map(issue=>issue.code)).toEqual(expect.arrayContaining(['LOCATION_INACTIVE','POSITION_INACTIVE']));
  } finally { await db.dispose(); }
});

it('position publication atomicity preserves create edit clear history and rejects stale capabilities',async()=>{
 const {insertShift,updateShift}=await import('./management-api');
 const {publishScheduleWithRevision}=await import('./management-api');
 const {readNotificationWeekState,personalProjections}=await import('../../lib/data/notification-transactions');
 const db=await workspaceFixture();const q=(text:string)=>db.executor.query<Record<string,unknown>>({text,values:[]});
 try {
 await q("INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) SELECT 'manager-normal-'||day,'manager',day,'00:00','24:00' FROM generate_series(0,6) day");
 await q(`INSERT INTO employee_location_eligibility VALUES('manager','loc-1'); INSERT INTO positions(id,workspace_id,name) VALUES('barista','workspace-fuel','Barista'),('cashier','workspace-fuel','Cashier'); INSERT INTO employee_positions VALUES('manager','barista'),('manager','cashier'); INSERT INTO schedules(id,location_id,week_start,created_by) VALUES('task7','loc-1','2030-10-07','owner');`);
 const base={employeeId:'manager',date:'2030-10-11',startTime:'09:00',endTime:'17:00',actorEmployeeId:'owner'};
 const id=await insertShift({...base,scheduleId:'task7',positionId:'barista'},db.executor);
 expect(await q('SELECT position_id FROM shifts')).toEqual([{position_id:'barista'}]);
 await publishScheduleWithRevision({locationId:'loc-1',weekStart:'2030-10-07',managerId:'owner'},db.executor);
 await q(`INSERT INTO schedule_acknowledgements(week_start,employee_id,publication_revision_id) SELECT week_start,'manager',id FROM schedule_publication_revisions`);
 await updateShift({...base,shiftId:id,positionId:'cashier'},db.executor);
 const state=await readNotificationWeekState(['2030-10-07'],db.executor);
 expect(state.revisions.map(r=>r.shifts[0])).toEqual([expect.objectContaining({positionId:'barista',positionName:'Barista'}),expect.objectContaining({positionId:'cashier',positionName:'Cashier'})]);
 expect(personalProjections(state,'2030-10-07').manager.acknowledgement?.needsAcknowledgement).toBe(true);
 const count=(await q('SELECT count(*)::integer AS count FROM notifications'))[0].count;
 await q("UPDATE positions SET name='Checkout' WHERE id='cashier'");
 await publishScheduleWithRevision({locationId:'loc-1',weekStart:'2030-10-07',managerId:'owner'},db.executor);
 expect((await q('SELECT count(*)::integer AS count FROM notifications'))[0].count).toBe(count);
 expect((await q("SELECT position_name FROM schedule_publication_revision_shifts WHERE position_id='cashier' ORDER BY id"))).toEqual(expect.arrayContaining([{position_name:'Cashier'}]));
 await updateShift({...base,shiftId:id},db.executor);
 expect(await q('SELECT position_id FROM shifts')).toEqual([{position_id:'cashier'}]);
 const before=await q('SELECT row_to_json(s) AS row FROM shifts s');
 const beforeRevisions=await q('SELECT count(*)::integer AS count FROM schedule_publication_revisions');
 const rollback:SqlExecutor={query:db.executor.query.bind(db.executor),transaction:statements=>db.executor.transaction([...statements,{text:"SELECT 'injected-task7-rollback'::integer",values:[]}])};
 await expect(updateShift({...base,shiftId:id,positionId:'barista'},rollback)).rejects.toThrow('injected-task7-rollback');
 expect(await q('SELECT row_to_json(s) AS row FROM shifts s')).toEqual(before);
 expect(await q('SELECT count(*)::integer AS count FROM schedule_publication_revisions')).toEqual(beforeRevisions);
 expect((await q('SELECT count(*)::integer AS count FROM notifications'))[0].count).toBe(count);
 await updateShift({...base,shiftId:id,positionId:null},db.executor);
 expect(await q('SELECT position_id FROM shifts')).toEqual([{position_id:null}]);
 await q("DELETE FROM employee_positions WHERE employee_id='manager' AND position_id='barista'");
 await expect(insertShift({...base,scheduleId:'task7',positionId:'barista'},db.executor)).rejects.toThrow();
 await q("UPDATE locations SET active=false WHERE id='loc-1'");
 await expect(insertShift({...base,scheduleId:'task7'},db.executor)).rejects.toThrow();
 }finally{await db.dispose();}
});
it('position SQL read and template save preserve qualified and legacy positionless assignments',async()=>{
 const {insertShift,listWeekShifts,getShiftForManagement}=await import('./management-api');
 const {createTemplateFromWeek,listTemplateShifts}=await import('../../lib/data/schedule-templates');
 const db=await workspaceFixture();const q=(text:string)=>db.executor.query({text,values:[]});
 try{
 await q("INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) SELECT 'manager-normal-'||day,'manager',day,'00:00','24:00' FROM generate_series(0,6) day");
 await q(`INSERT INTO employee_location_eligibility VALUES('manager','loc-1'); INSERT INTO positions(id,workspace_id,name) VALUES('barista','workspace-fuel','Barista'); INSERT INTO employee_positions VALUES('manager','barista'); INSERT INTO schedules(id,location_id,week_start,created_by) VALUES('task7','loc-1','2030-10-07','owner');`);
 const base={scheduleId:'task7',employeeId:'manager',date:'2030-10-11',startTime:'09:00',endTime:'17:00',actorEmployeeId:'owner'};
 const id=await insertShift({...base,positionId:'barista'},db.executor);
 await insertShift({...base,date:'2030-10-12'},db.executor);
 expect((await listWeekShifts({weekStart:'2030-10-07'},db.executor)).map(s=>s.positionId)).toEqual(['barista',undefined]);
 expect((await getShiftForManagement(id,db.executor))?.positionId).toBe('barista');
 const templateId=await createTemplateFromWeek({name:'Saved',weekStart:'2030-10-07',createdBy:'owner'},db.executor);
 const templateShifts=await listTemplateShifts(templateId,db.executor);
 expect(templateShifts).not.toBeNull();
 if(templateShifts===null)throw new Error('Newly created template must be active');
 expect(templateShifts.map(s=>s.positionId)).toEqual(['barista',undefined]);
 }finally{await db.dispose();}
});

it.each(['location','position','qualification','eligibility'].flatMap(fact=>['removal-first','assignment-first'].map(order=>({fact,order}))))('position assignment lock race $fact $order',async({fact,order})=>{
 const {insertShift}=await import('./management-api');
 const {Client}=await import('pg');const db=await workspaceFixture();
 const writer=new Client({connectionString:db.connectionString,statement_timeout:5000});const remover=new Client({connectionString:db.connectionString,statement_timeout:5000});
 await writer.connect();await remover.connect();
 const q=(text:string)=>db.executor.query({text,values:[]});
 let releaseWriter!:()=>void;const release=new Promise<void>(resolve=>{releaseWriter=resolve;});
 let writerLocked!:()=>void;const locked=new Promise<void>(resolve=>{writerLocked=resolve;});
 let held=false;
 const executor:SqlExecutor={query:async<T>(s:SqlStatement)=>(await writer.query(s.text,[...s.values])).rows as T[],transaction:async statements=>{
  await writer.query('BEGIN');try{const result=[];for(const s of statements){result.push((await writer.query(s.text,[...s.values])).rows);if(order==='assignment-first'&&!held&&s.text.includes('generation_source_conflict')){held=true;writerLocked();await release;}}await writer.query('COMMIT');return result;}catch(e){await writer.query('ROLLBACK');throw e;}
 }};
 const waitBlocked=async(pid:number)=>{for(let tries=0;tries<150;tries++){const [row]=await db.executor.query<{blocked:boolean}>({text:'SELECT cardinality(pg_blocking_pids($1))>0 AS blocked',values:[pid]});if(row.blocked)return;await new Promise(resolve=>setTimeout(resolve,10));}throw Error('Expected real PostgreSQL assignment lock barrier');};
 const lockRemoval=async()=>{await remover.query('BEGIN');await remover.query('SELECT id FROM workspaces ORDER BY id FOR SHARE');await remover.query(fact==='location'||fact==='position'?"SELECT id FROM employees WHERE id='owner' FOR SHARE":"SELECT id FROM employees WHERE id IN ('manager','owner') ORDER BY id FOR UPDATE");if(fact==='location')await remover.query("SELECT id FROM locations WHERE id='loc-1' FOR UPDATE");if(fact==='position')await remover.query("SELECT id FROM positions WHERE id='barista' FOR UPDATE");};
 const remove=()=>remover.query(fact==='location'?"UPDATE locations SET active=false WHERE id='loc-1'":fact==='position'?"UPDATE positions SET active=false WHERE id='barista'":fact==='qualification'?"DELETE FROM employee_positions WHERE employee_id='manager'":"DELETE FROM employee_location_eligibility WHERE employee_id='manager'");
 try{
 await q("INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) SELECT 'manager-normal-'||day,'manager',day,'00:00','24:00' FROM generate_series(0,6) day");
 await q(`INSERT INTO employee_location_eligibility VALUES('manager','loc-1'); INSERT INTO positions(id,workspace_id,name) VALUES('barista','workspace-fuel','Barista'); INSERT INTO employee_positions VALUES('manager','barista'); INSERT INTO schedules(id,location_id,week_start,created_by,status) VALUES('task7','loc-1','2030-10-07','owner','PUBLISHED');`);
 const writerPid=(await writer.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
 const removerPid=(await remover.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
 if(order==='removal-first')await lockRemoval();
 const writing=insertShift({scheduleId:'task7',employeeId:'manager',date:'2030-10-11',startTime:'09:00',endTime:'17:00',positionId:'barista',actorEmployeeId:'owner'},executor).then(value=>({value}),error=>({error}));
 if(order==='removal-first'){
  await waitBlocked(writerPid);await remove();await remover.query('COMMIT');
 }else{
  await Promise.race([locked,writing.then(()=>{throw Error('Assignment completed before its SQL lock barrier');})]);
  const removing=(async()=>{await lockRemoval();await remove();await remover.query('COMMIT');})();
  await waitBlocked(removerPid);releaseWriter();await removing;
 }
 const outcome=await writing;
 expect('error' in outcome).toBe(order==='removal-first');
 expect(await q('SELECT employee_id,position_id FROM shifts')).toEqual(order==='removal-first'?[]:[{employee_id:'manager',position_id:'barista'}]);
 expect(await q('SELECT count(*)::integer AS count FROM schedule_publication_revisions')).toEqual([{count:order==='removal-first'?0:1}]);
 expect(await q('SELECT count(*)::integer AS count FROM notifications')).toEqual([{count:order==='removal-first'?0:1}]);
 }finally{releaseWriter();await remover.query('ROLLBACK');await writer.end();await remover.end();await db.dispose();}
});

describe('notification workspace policy',()=>{
  it('loads configured zone and filters inactive location access',async()=>{
    const db=await createDisposableFoundationDatabase({mode:'current-runtime'});
    try {
      await db.executor.query({text:"UPDATE workspaces SET time_zone='Asia/Tokyo'; INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('notify-test','Test','Worker','555','EMPLOYEE','loc-1'); INSERT INTO employee_location_eligibility VALUES('notify-test','loc-1'); UPDATE locations SET active=false WHERE id='loc-1'",values:[]});
      const {sqlNotificationStateRepository}=await import('../../lib/data/notification-state');
      const state=sqlNotificationStateRepository(db.executor);
      expect((await state.recipientAccess('notify-test'))?.allowedLocationIds).toEqual([]);
    } finally {await db.dispose();}
  });
});

describe('notification workspace policy',()=>{
 it('Tokyo SQL day budget cancels obsolete reminders without replaying a consumed local day',async()=>{
  const db=await createDisposableFoundationDatabase({mode:'current-runtime'});
  try{
   await db.executor.query({text:"UPDATE workspaces SET time_zone='Asia/Tokyo'; INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('notify-test','Test','Worker','555','EMPLOYEE','loc-1'); INSERT INTO schedule_week_settings(week_start,availability_deadline,updated_by) VALUES('2030-09-30','2030-10-06T21:00Z','notify-test')",values:[]});
   const {loadWorkspaceNotificationConfig}=await import('../../lib/notifications/config');
   const {sqlNotificationStateRepository}=await import('../../lib/data/notification-state');
   const {notificationIntentStatements}=await import('../../lib/data/notifications');
   const {runReminders}=await import('../../lib/notifications/reminders');
   const config={...await loadWorkspaceNotificationConfig({PUSH_ENVIRONMENT:'test'},db.executor),featureEnabled:true};
   expect(config.policy.timeZone).toBe('Asia/Tokyo');
   const old:import('../../lib/notifications/types').NotificationIntent={id:'old-notify',employeeId:'notify-test',type:'AVAILABILITY_REMINDER',title:'Test',body:'Open portal',environment:'test',eventKey:'old-budget',source:{kind:'AVAILABILITY',id:'2030-09-30',version:'2030-10-07T21:00:00.000Z'},effectiveVersion:'2030-10-07T21:00:00.000Z',purpose:'REMINDER',urgency:'normal',dueAt:'2030-10-05T22:00:00Z',expiresAt:'2030-10-07T21:00:00Z'};
   await db.executor.transaction(notificationIntentStatements([old]));
   const state=sqlNotificationStateRepository(db.executor,config.workspace);
   const now=new Date('2030-10-06T00:00Z');
   const deps={executor:db.executor,state,config,clock:()=>now};
   await runReminders(deps);await runReminders(deps);
   const rows=await db.executor.query<{id:string;push_state:string}>({text:'SELECT id,push_state FROM notifications',values:[]});
   expect(rows).toEqual([{id:'old-notify',push_state:'cancelled'}]);
   // Both UTC dates are the same Tokyo budget day. PR's day would incorrectly replay.
   expect(new Date(old.dueAt).toISOString().slice(0,10)).not.toBe(now.toISOString().slice(0,10));
   const fresh={...old,source:{...old.source,version:'2030-10-06T21:00:00.000Z'},effectiveVersion:'2030-10-06T21:00:00.000Z'};
   expect((await state.check(fresh,'notify-test',now)).deliverable).toBe(true);
   await db.executor.query({text:"UPDATE workspaces SET updated_at=updated_at+interval '1 microsecond'",values:[]});
   expect(await state.check(fresh,'notify-test',now)).toMatchObject({deliverable:false,reason:'workspace_changed'});
   await db.executor.query({text:'UPDATE workspaces SET active=false',values:[]});
   expect((await state.check(fresh,'notify-test',now)).deliverable).toBe(false);
   await expect(loadWorkspaceNotificationConfig({},db.executor)).rejects.toThrow('Workspace configuration is unavailable');
  }finally{await db.dispose();}
 });
 it.each(([['CALLOUT','APPROVED'],['CALLOUT','DENIED'],['EXCHANGE','APPROVED'],['EXCHANGE','DENIED']] as const).flatMap(([kind,status])=>['inactive_location','removed_eligibility'].map(accessChange=>({kind,status,accessChange}))))('delivery cancels but the actual open handler preserves $kind $status history after $accessChange',async({kind,status,accessChange})=>{
  const db=await createDisposableFoundationDatabase({mode:'current-runtime'});
  try{
   await db.executor.query({text:"UPDATE workspaces SET time_zone='America/New_York'; INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('notify-test','Test','Worker','555','EMPLOYEE','loc-1'); INSERT INTO employee_location_eligibility VALUES('notify-test','loc-1'); INSERT INTO schedules(id,location_id,week_start,created_by,status) VALUES('notify-schedule','loc-1','2030-10-07','notify-test','PUBLISHED'); INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('notify-shift','notify-schedule','notify-test','2030-10-11','09:00','17:00'); INSERT INTO shift_callouts(id,shift_id,employee_id,status,reason_code) VALUES('notify-callout','notify-shift','notify-test','APPROVED','ILLNESS')",values:[]});
   const {loadWorkspaceNotificationConfig}=await import('../../lib/notifications/config');
   const {sqlNotificationStateRepository}=await import('../../lib/data/notification-state');
   const {destinationForSource}=await import('../../lib/notifications/destinations');
   const {createNotificationOpenHandler}=await import('../../lib/notifications/open');
   const {notificationIntentStatements}=await import('../../lib/data/notifications');
   await db.executor.query({text:kind==='CALLOUT' ? "UPDATE shift_callouts SET status=$1 WHERE id='notify-callout'" : "INSERT INTO shift_exchanges(id,kind,source_shift_id,requested_by_employee_id,status) VALUES('notify-exchange','COVERAGE','notify-shift','notify-test',$1)",values:[status]});
   const config=await loadWorkspaceNotificationConfig({},db.executor),state=sqlNotificationStateRepository(db.executor,config.workspace);
   // Current schema increments a callout revision when APPROVED changes to DENIED.
   // A historical status string is not the identity of that newer decision.
   const revision=kind==='CALLOUT'&&status==='DENIED'?2:1;
   const version=`r:${revision}`;
   const source={kind,id:kind==='CALLOUT'?'notify-callout':'notify-exchange',version};
   expect((await state.readSource(source))?.source.version).toBe(version);
   const event:import('../../lib/notifications/types').NotificationIntent={id:'notify-event',employeeId:'notify-test',type:'CALLOUT_DECIDED',title:'Test',body:'Open portal',environment:'test',eventKey:'decision',source,effectiveVersion:version,purpose:'EVENT',urgency:'normal',dueAt:'2030-10-08T12:00Z',expiresAt:'2030-10-11T12:00Z'};
   const now=new Date('2030-10-08T12:00Z');
   await db.executor.transaction(notificationIntentStatements([event]));
   const open=createNotificationOpenHandler({state,environment:'test',clock:()=>now,session:async()=>({id:'notify-test',firstName:'Test',lastName:'Worker',role:'EMPLOYEE',primaryLocationId:'loc-1'})});
   const opening=()=>open(new Request('https://portal.example/app/notifications/open?notificationId=notify-event'));
   const expectHistoryOpen=async()=>{const response=await opening();expect(response.status).toBe(303);expect(response.headers.get('location')).toBe(`https://portal.example/app/exchange?tab=${kind==='EXCHANGE'?'history':'requests'}&requestId=${source.id}#request-${source.id}`);expect(response.headers.get('cache-control')).toBe('no-store');};
   expect((await state.check(event,'notify-test',now)).deliverable).toBe(true);
   await db.executor.query({text:accessChange==='inactive_location' ? "UPDATE locations SET active=false WHERE id='loc-1'" : "DELETE FROM employee_location_eligibility WHERE employee_id='notify-test'",values:[]});
   expect((await state.check(event,'notify-test',now)).deliverable).toBe(false);
   await expectHistoryOpen();
   const history=await state.readSource(source),access=await state.recipientAccess('notify-test');
   expect(destinationForSource(history!,access!)).toContain(`requestId=${source.id}`);
   await db.executor.query({text:"UPDATE notifications SET effective_version='stale' WHERE id='notify-event'",values:[]});
   expect((await opening()).status).toBe(404);
   await db.executor.query({text:"UPDATE notifications SET effective_version=$1 WHERE id='notify-event';",values:[version]});
   await db.executor.query({text:"UPDATE employees SET active=false WHERE id='notify-test'",values:[]});
   expect((await opening()).status).toBe(404);
  }finally{await db.dispose();}
 });
});

it("Task 9 atomic profile and coverage quotas persist, retain history, reject grants and roll back", async () => {
  const { saveEmployeeSchedulingProfile } = await import(
    "./management-api"
  );
  const { createCoverageWindow, replaceCoverageWindowPositionRequirements } =
    await import("./management-api");
  const db = await createDisposableFoundationDatabase({ mode: "current-runtime" });
  const q = (text: string, values: unknown[] = []) =>
    db.executor.query<Record<string, unknown>>({ text, values });
  try {
    await q(
      "INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('owner','Test','Owner','555','OWNER','loc-1'),('sam','Sam','Rivera','556','EMPLOYEE','loc-1'); INSERT INTO employee_location_eligibility VALUES('sam','loc-1'); INSERT INTO positions(id,workspace_id,name) VALUES('p1','workspace-fuel','Cashier'),('p2','workspace-fuel','Barista');",
    );
    const profile = {
      employeeId: "sam",
      actorEmployeeId: "owner",
      positionIds: ["p1"],
      eligibleLocationIds: ["loc-2"],
    };
    await saveEmployeeSchedulingProfile(profile, db.executor);
    expect(
      await q(
        "SELECT position_id FROM employee_positions WHERE employee_id='sam'",
      ),
    ).toEqual([{ position_id: "p1" }]);
    expect(
      await q(
        "SELECT location_id FROM employee_location_eligibility WHERE employee_id='sam' ORDER BY location_id",
      ),
    ).toEqual([{ location_id: "loc-1" }, { location_id: "loc-2" }]);
    await q(
      "UPDATE positions SET active=false WHERE id='p1'; UPDATE locations SET active=false WHERE id='loc-2'",
    );
    await saveEmployeeSchedulingProfile(profile, db.executor);
    await expect(
      saveEmployeeSchedulingProfile(
        { ...profile, actorEmployeeId: "sam", positionIds: ["p2"] },
        db.executor,
      ),
    ).rejects.toThrow("Manager or Owner");
    await saveEmployeeSchedulingProfile(
      { ...profile, positionIds: [], eligibleLocationIds: [] },
      db.executor,
    );
    await expect(
      saveEmployeeSchedulingProfile(profile, db.executor),
    ).rejects.toThrow("active locations");
    expect(
      await q("SELECT * FROM employee_positions WHERE employee_id='sam'"),
    ).toEqual([]);
    await q("UPDATE locations SET active=true WHERE id='loc-2'");
    await expect(
      saveEmployeeSchedulingProfile(profile, db.executor),
    ).rejects.toThrow("active locations and positions");
    expect(
      await q(
        "SELECT location_id FROM employee_location_eligibility WHERE employee_id='sam'",
      ),
    ).toEqual([{ location_id: "loc-1" }]);
    const window = {
      locationId: "loc-1",
      dayOfWeek: 1,
      startTime: "08:00",
      endTime: "12:00",
      actorEmployeeId: "owner",
      positionRequirements: [{ positionId: "p2", quantity: 2 }],
    };
    const windowId = await createCoverageWindow(window, db.executor);
    expect(
      await q(
        "SELECT position_id,quantity FROM coverage_window_position_requirements WHERE coverage_window_id=$1",
        [windowId],
      ),
    ).toEqual([{ position_id: "p2", quantity: 2 }]);
    await expect(
      createCoverageWindow(
        {
          ...window,
          startTime: "13:00",
          endTime: "17:00",
          positionRequirements: [{ positionId: "p1", quantity: 1 }],
        },
        db.executor,
      ),
    ).rejects.toThrow("coverage_position_invalid");
    expect(
      await q(
        "SELECT id FROM location_coverage_windows WHERE start_time='13:00'",
      ),
    ).toEqual([]);
    await expect(
      replaceCoverageWindowPositionRequirements(
        {
          windowId,
          actorEmployeeId: "owner",
          requirements: [{ positionId: "p1", quantity: 1 }],
        },
        db.executor,
      ),
    ).rejects.toThrow("coverage_position_invalid");
    expect(
      await q(
        "SELECT position_id,quantity FROM coverage_window_position_requirements WHERE coverage_window_id=$1",
        [windowId],
      ),
    ).toEqual([{ position_id: "p2", quantity: 2 }]);
    await replaceCoverageWindowPositionRequirements(
      { windowId, actorEmployeeId: "owner", requirements: [] },
      db.executor,
    );
    expect(
      await q(
        "SELECT * FROM coverage_window_position_requirements WHERE coverage_window_id=$1",
        [windowId],
      ),
    ).toEqual([]);
    expect(
      await q("SELECT id FROM location_coverage_windows WHERE id=$1", [
        windowId,
      ]),
    ).toHaveLength(1);
    await expect(
      replaceCoverageWindowPositionRequirements(
        {
          windowId,
          actorEmployeeId: "sam",
          requirements: [{ positionId: "p2", quantity: 1 }],
        },
        db.executor,
      ),
    ).rejects.toThrow("management_authorization");
  } finally {
    await db.dispose();
  }
});

it("Task 9 selective inactive quota retention keeps unchanged warnings and rejects regrant or edits", async () => {
  const { createCoverageWindow, replaceCoverageWindowPositionRequirements } =
    await import("./management-api");
  const db = await createDisposableFoundationDatabase({ mode: "current-runtime" });
  const q = (text: string, values: unknown[] = []) =>
    db.executor.query<Record<string, unknown>>({ text, values });
  try {
    await q(
      "INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('owner','Test','Owner','555','OWNER','loc-1'); INSERT INTO positions(id,workspace_id,name) VALUES('a','workspace-fuel','Position A'),('b','workspace-fuel','Position B');",
    );
    const windowId = await createCoverageWindow(
      {
        locationId: "loc-1",
        dayOfWeek: 1,
        startTime: "08:00",
        endTime: "12:00",
        actorEmployeeId: "owner",
        positionRequirements: [
          { positionId: "a", quantity: 1 },
          { positionId: "b", quantity: 2 },
        ],
      },
      db.executor,
    );
    await q("UPDATE positions SET active=false WHERE id IN ('a','b')");
    await replaceCoverageWindowPositionRequirements(
      {
        windowId,
        actorEmployeeId: "owner",
        requirements: [{ positionId: "b", quantity: 2 }],
      },
      db.executor,
    );
    expect(
      await q(
        "SELECT position_id,quantity FROM coverage_window_position_requirements WHERE coverage_window_id=$1",
        [windowId],
      ),
    ).toEqual([{ position_id: "b", quantity: 2 }]);
    await expect(
      replaceCoverageWindowPositionRequirements(
        {
          windowId,
          actorEmployeeId: "owner",
          requirements: [{ positionId: "b", quantity: 3 }],
        },
        db.executor,
      ),
    ).rejects.toThrow("coverage_position_invalid");
    expect(
      await q(
        "SELECT position_id,quantity FROM coverage_window_position_requirements WHERE coverage_window_id=$1",
        [windowId],
      ),
    ).toEqual([{ position_id: "b", quantity: 2 }]);
    await replaceCoverageWindowPositionRequirements(
      { windowId, actorEmployeeId: "owner", requirements: [] },
      db.executor,
    );
    await expect(
      replaceCoverageWindowPositionRequirements(
        {
          windowId,
          actorEmployeeId: "owner",
          requirements: [{ positionId: "b", quantity: 2 }],
        },
        db.executor,
      ),
    ).rejects.toThrow("coverage_position_invalid");
    expect(
      await q(
        "SELECT * FROM coverage_window_position_requirements WHERE coverage_window_id=$1",
        [windowId],
      ),
    ).toEqual([]);
    await expect(
      createCoverageWindow(
        {
          locationId: "loc-1",
          dayOfWeek: 2,
          startTime: "08:00",
          endTime: "12:00",
          actorEmployeeId: "owner",
          positionRequirements: [{ positionId: "b", quantity: 2 }],
        },
        db.executor,
      ),
    ).rejects.toThrow("coverage_position_invalid");
    expect(
      await q("SELECT id FROM location_coverage_windows WHERE day_of_week=2"),
    ).toEqual([]);
  } finally {
    await db.dispose();
  }
});

it('configured Clocker key survives active name edits and preserves Fuel compatibility labels', async () => {
 const db=await workspaceFixture();
 try {
  const location=await createLocation({name:'Main Office',shortName:'Main',clockerKey:'main-office',actorEmployeeId:'owner'},db.executor);
  await updateLocation({id:location.id,name:'Renamed Office',shortName:'Renamed',active:true,actorEmployeeId:'owner'},db.executor);
  expect(await findActiveLocationByClockerKey('main-office',db.executor)).toMatchObject({id:location.id,name:'Renamed Office',clockerKey:'main-office'});
  expect(await findActiveLocationByClockerKey('not-configured',db.executor)).toBeNull();
  for(const key of ['2','110']) expect(await findActiveLocationByClockerKey(key,db.executor)).toMatchObject({name:`FUEL - ${key}`,clockerKey:key});
  await updateLocation({id:location.id,name:'Renamed Office',shortName:'Renamed',active:false,actorEmployeeId:'owner'},db.executor);
  expect(await findActiveLocationByClockerKey('main-office',db.executor)).toBeNull();
 } finally {await db.dispose();}
});

// Task 11 verification: no production behavior is changed to manufacture a RED.
import { execFileSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { createGenericWorkspaceDatabase } from '../fixtures/generic-workspace-sql';
import { withOwnedTestResources } from './owned-test-resources';

it('Task 11 original migration bytes equal the exact approved implementation parent', async () => {
  const files = (await readdir('db/migrations')).filter(name => /^000[1-7]_.*\.sql$/.test(name)).sort();
  expect(files).toHaveLength(7);
  for (const name of files) {
    const path = `db/migrations/${name}`;
    const original = execFileSync('git', ['show', `0a12f1f4ac7212a8cbbe195f013407a8bc74c4d5:${path}`]);
    const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
    expect(hash(await readFile(path)), path).toBe(hash(original));
  }
});

it('Task 11 populated 0001–0007 history survives 0008 byte-for-byte in every original column', async () => {
  const db = await createDisposableFoundationDatabase({ mode: 'upgrade' });
  const q = (text: string, values: unknown[] = []) => db.executor.query<Record<string, unknown>>({text,values});
  try {
    await q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('legacy-lead','Fictional','Lead','555','LEAD','loc-1'),('legacy-owner','Fictional','Owner','556','OWNER','loc-2');
      INSERT INTO employee_location_eligibility VALUES('legacy-lead','loc-1'),('legacy-lead','loc-2');
      INSERT INTO employee_credentials(employee_id,password_hash) VALUES('legacy-lead','fictional-hash');
      INSERT INTO employee_scheduling_settings(employee_id,target_weekly_hours,maximum_weekly_hours) VALUES('legacy-lead',32,40);
      INSERT INTO availability_windows VALUES('legacy-normal','legacy-lead',1,'08:00','16:00');
      INSERT INTO weekly_availability_windows(id,week_start,employee_id,day_of_week,start_time,end_time) VALUES('legacy-week','2026-09-28','legacy-lead',1,'08:00','16:00');
      INSERT INTO weekly_availability_submissions(week_start,employee_id,uses_normal_availability) VALUES('2026-09-28','legacy-lead',true);
      INSERT INTO availability_exceptions(id,employee_id,date,kind,note) VALUES('legacy-exception','legacy-lead','2026-09-30','UNAVAILABLE','Fictional exception');
      INSERT INTO schedule_week_settings(week_start,availability_deadline,updated_by) VALUES('2026-09-28','2026-09-27T16:00Z','legacy-owner');
      INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time,minimum_staff) VALUES('legacy-coverage','loc-1',1,'08:00','16:00',3);
      INSERT INTO schedules(id,location_id,week_start,status,created_by,published_by,published_at) VALUES('legacy-schedule','loc-1','2026-09-28','PUBLISHED','legacy-owner','legacy-owner','2026-09-27T16:00:00.000001Z');
      INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,notes,is_designated_lead) VALUES('legacy-shift','legacy-schedule','legacy-lead','2026-09-28','08:00','16:00','Historical exact text',true);
      INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status,reviewed_by,reason) VALUES('legacy-leave','legacy-lead','2026-10-01','2026-10-02','APPROVED','legacy-owner','Fictional leave');
      INSERT INTO shift_exchanges(id,kind,source_shift_id,requested_by_employee_id,status,resolved_by) VALUES('legacy-exchange','COVERAGE','legacy-shift','legacy-lead','DENIED','legacy-owner');
      INSERT INTO shift_callouts(id,shift_id,employee_id,reason_code,status,reviewed_by) VALUES('legacy-callout','legacy-shift','legacy-lead','ILLNESS','DENIED','legacy-owner');
      INSERT INTO schedule_templates(id,name,created_by) VALUES('legacy-template','Fictional preserved template','legacy-owner');
      INSERT INTO schedule_template_shifts(id,template_id,location_id,day_offset,start_time,end_time,employee_id,is_designated_lead,notes) VALUES('legacy-template-shift','legacy-template','loc-1',0,'08:00','16:00','legacy-lead',true,'Keep template');
      INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,affected_location_id,created_by) VALUES('legacy-revision','2026-09-28',1,'PUBLISH','loc-1','legacy-owner');
      INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time,notes,is_designated_lead) VALUES('legacy-snapshot','legacy-revision','legacy-shift','legacy-schedule','loc-1','legacy-lead','2026-09-28','08:00','16:00','Keep snapshot',true);
      INSERT INTO schedule_acknowledgements(week_start,employee_id,publication_revision_id) VALUES('2026-09-28','legacy-lead','legacy-revision');
      INSERT INTO notifications(id,employee_id,type,title,body,event_key,action_href,read_at) VALUES('legacy-notify','legacy-lead','SCHEDULE_PUBLISHED','Fictional history','Preserve text','legacy-event','/app/schedule','2026-09-28T08:00:00.123456Z');
      INSERT INTO clocker_devices(id,location_id,name) VALUES('legacy-device','loc-1','Fictional terminal');
      INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status) VALUES('legacy-time','legacy-lead','loc-1','legacy-device','2026-09-28T12:00Z','CLOCKED_IN');`);
    expect(await q('SELECT location_id,minimum_staff_per_shift,requires_designated_lead FROM location_staffing_settings ORDER BY location_id')).toEqual([
      {location_id:'loc-1',minimum_staff_per_shift:2,requires_designated_lead:true},
      {location_id:'loc-2',minimum_staff_per_shift:6,requires_designated_lead:true},
    ]);
    const columns = await db.executor.query<{table_name:string;column_name:string}>({text:"SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position",values:[]});
    const tables = new Map<string,string[]>();
    for (const row of columns) tables.set(row.table_name,[...(tables.get(row.table_name)??[]),row.column_name]);
    // JSON stays inside PostgreSQL: timestamps retain microseconds, not JS Date precision.
    const snapshot = async () => Object.fromEntries(await Promise.all([...tables].map(async([table,names]) => [table,await q(`SELECT row_to_json(r)::text AS row FROM (SELECT ${names.map(n=>`"${n}"`).join(',')} FROM "${table}") r ORDER BY row_to_json(r)::text`)])));
    const before = await snapshot();
    for (const table of ['time_off_requests','shift_exchanges','shift_callouts','schedule_acknowledgements','schedule_publication_revision_shifts','schedule_template_shifts','time_entries']) expect(before[table],table).toHaveLength(1);
    await q(await readFile('db/migrations/0008_workspace_positions.sql','utf8'));
    expect(await snapshot()).toEqual(before);
    expect(await q('SELECT id,name,clocker_key,workspace_id FROM locations ORDER BY id')).toEqual([
      {id:'loc-1',name:'FUEL - 2',clocker_key:'2',workspace_id:'workspace-fuel'},
      {id:'loc-2',name:'FUEL - 110',clocker_key:'110',workspace_id:'workspace-fuel'},
    ]);
    expect(await q('SELECT id,name,time_zone FROM workspaces')).toEqual([{id:'workspace-fuel',name:'Fuel Coffee Drive',time_zone:'America/Puerto_Rico'}]);
    for (const table of ['positions','employee_positions','coverage_window_position_requirements']) expect(await q(`SELECT * FROM ${table}`)).toEqual([]);
    for (const table of ['shifts','schedule_template_shifts','schedule_publication_revision_shifts']) expect(await q(`SELECT position_id FROM ${table}`)).toEqual([{position_id:null}]);
    expect(await q('SELECT position_name FROM schedule_publication_revision_shifts')).toEqual([{position_name:null}]);
    for (const sql of ["DELETE FROM locations WHERE id='loc-1'","DELETE FROM employees WHERE id='legacy-lead'","DELETE FROM schedule_publication_revisions WHERE id='legacy-revision'"]) await expect(q(sql)).rejects.toMatchObject({code:'23503'});
    expect(await snapshot()).toEqual(before);
  } finally { await db.dispose(); }
});

it('Task 11 identical workspace profile advanced one microsecond rejects a stale guarded transaction without side effects', async () => {
  const db=await createGenericWorkspaceDatabase();
  try {
    const before=await getWorkspace(db.executor);
    await db.executor.query({text:"UPDATE workspaces SET updated_at=updated_at+interval '1 microsecond'",values:[]});
    const after=await getWorkspace(db.executor);
    expect(after).toMatchObject({id:before.id,name:before.name,timeZone:before.timeZone});
    expect(await db.executor.query({text:'SELECT updated_at-$1::timestamptz = interval \'1 microsecond\' AS exact FROM workspaces',values:[before.updatedAt]})).toEqual([{exact:true}]);
    await expect(db.executor.transaction([...workspaceReadGuard(before),{text:"UPDATE workspaces SET name='Must roll back'",values:[]}])).rejects.toThrow('workspace_version_conflict');
    expect(await getWorkspace(db.executor)).toEqual(after);
  } finally { await db.dispose(); }
});

it.each(['deactivation','demotion'])('Task 11 actual createLocation commits before concurrent actor %s', async change => {
  await withOwnedTestResources(async defer => {
  const db=await createGenericWorkspaceDatabase();
  defer(() => db.dispose());
  const {Client}=await import('pg');
  const writer=new Client({connectionString:db.connectionString,statement_timeout:5000});
  defer(() => writer.end());
  const editor=new Client({connectionString:db.connectionString,statement_timeout:5000});
  defer(() => editor.end());
  let release!:()=>void; const released=new Promise<void>(resolve=>{release=resolve;});
  let reached!:()=>void; const barrier=new Promise<void>(resolve=>{reached=resolve;});
  const executor:SqlExecutor={query:db.executor.query.bind(db.executor),transaction:async statements=>{
    await writer.query('BEGIN');
    try {
      const results=[];
      for(const s of statements){results.push((await writer.query(s.text,[...s.values])).rows);if(s.text.includes('location_permission_denied')){reached();await released;}}
      await writer.query('COMMIT');return results;
    } catch(error){await writer.query('ROLLBACK');throw error;}
  }};
  let pendingWrite:Promise<unknown>|undefined, pendingEdit:Promise<unknown>|undefined;
  defer(() => pendingEdit);
  defer(() => pendingWrite);
  defer(release);
  await writer.connect(); await editor.connect();
    pendingWrite=createLocation({name:'Race Atelier',shortName:'Race',clockerKey:'race-atelier',actorEmployeeId:'cedar-owner'},executor);
    await Promise.race([barrier,pendingWrite.then(()=>{throw Error('Writer missed barrier');})]);
    const pid=(await editor.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
    pendingEdit=editor.query(change==='deactivation'?"UPDATE employees SET active=false WHERE id='cedar-owner'":"UPDATE employees SET role='EMPLOYEE' WHERE id='cedar-owner'");
    // Observe real lock contention, never use elapsed sleep as the race assertion.
    let blocked=false;
    for(let tries=0;tries<100&&!blocked;tries++) blocked=(await db.executor.query<{blocked:boolean}>({text:'SELECT cardinality(pg_blocking_pids($1))>0 AS blocked',values:[pid]}))[0].blocked;
    expect(blocked).toBe(true);
    expect(await findActiveLocationByClockerKey('race-atelier',db.executor)).toBeNull();
    release();await pendingWrite;await pendingEdit;
    // PostgreSQL cannot release the actor row lock until the writer commits.
    expect(await findActiveLocationByClockerKey('race-atelier',db.executor)).toMatchObject({name:'Race Atelier',workspaceId:'cooperative-cedar'});
    await expect(createLocation({name:'Denied',shortName:'Denied',actorEmployeeId:'cedar-owner'},db.executor)).rejects.toThrow('Owner');
  });
});

it('Task 11 late credential failure rolls back actual employee creation after memberships exist', async () => {
  const db=await createGenericWorkspaceDatabase();
  const q=(text:string,values:unknown[]=[])=>db.executor.query({text,values});
  try {
    const p=await createPosition({name:'Finishing',actorEmployeeId:'cedar-owner'},db.executor);
    // Owned DB trigger both witnesses earlier writes in this transaction and fails late.
    await q(`CREATE FUNCTION task11_fail_credentials() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF EXISTS(SELECT 1 FROM employees WHERE id=NEW.employee_id)
          AND EXISTS(SELECT 1 FROM employee_location_eligibility WHERE employee_id=NEW.employee_id)
          AND EXISTS(SELECT 1 FROM employee_positions WHERE employee_id=NEW.employee_id)
        THEN RAISE EXCEPTION 'task11_late_credentials_after_memberships';
        ELSE RAISE EXCEPTION 'task11_fixture_did_not_reach_late_boundary'; END IF;
      END $$;
      CREATE TRIGGER task11_credential_fault BEFORE INSERT ON employee_credentials FOR EACH ROW EXECUTE FUNCTION task11_fail_credentials();`);
    const input={id:'cedar-new',firstName:'Fictional',lastName:'Worker',phone:'5550000001',role:'EMPLOYEE' as const,primaryLocationId:'cedar-harbor',eligibleLocationIds:[],positionIds:[p.id],passwordHash:'fictional-hash',actorEmployeeId:'cedar-owner'};
    await expect(insertEmployee(input,db.executor)).rejects.toThrow('task11_late_credentials_after_memberships');
    expect(await q("SELECT id FROM employees WHERE id='cedar-new'")).toEqual([]);
    for(const table of ['employee_location_eligibility','employee_positions','employee_credentials']) expect(await q(`SELECT employee_id FROM ${table} WHERE employee_id='cedar-new'`)).toEqual([]);
    await q('DROP TRIGGER task11_credential_fault ON employee_credentials; DROP FUNCTION task11_fail_credentials()');
    await insertEmployee(input,db.executor);
    expect((await listEmployees(db.executor)).find(e=>e.id===input.id)).toMatchObject({positionIds:[p.id],eligibleLocationIds:['cedar-harbor']});
    expect(await q("SELECT employee_id FROM employee_credentials WHERE employee_id='cedar-new'")).toEqual([{employee_id:'cedar-new'}]);
  } finally {await db.dispose();}
});

it.each([1,3,5,20])('Task 11 separate generic SQL workspace supports exactly %i active locations and real scheduling', async count => {
  const db=await createGenericWorkspaceDatabase();
  const q=(text:string,values:unknown[]=[])=>db.executor.query<Record<string,unknown>>({text,values});
  const {evaluateLocationReadiness}=await import('../../lib/scheduling/location-readiness');
  const {createCoverageWindow}=await import('./management-api');
  const {getShiftValidationContext,ensureSchedule,insertShift,listWeekShifts,updateShift}=await import('./management-api');
  const {validateShift}=await import('../../lib/scheduling/validate-shift');
  const {calculateScheduleHealth}=await import('../../lib/scheduling/schedule-health');
  const {createTemplateFromWeek,listTemplateShifts}=await import('../../lib/data/schedule-templates');
  const {publishScheduleWithRevision}=await import('./management-api');
  const {readNotificationWeekState}=await import('../../lib/data/notification-transactions');
  const {readAvailabilityInputs}=await import('../../lib/data/availability-inputs');
  const {loadWorkspaceNotificationConfig}=await import('../../lib/notifications/config');
  const {sqlNotificationStateRepository}=await import('../../lib/data/notification-state');
  const {businessDate,localDateTimeToInstant}=await import('../../lib/business-time');
  try {
    const workspace=await getWorkspace(db.executor);
    expect(workspace).toMatchObject({id:'cooperative-cedar',name:'Cedar Atelier – Fictional',timeZone:'America/New_York'});
    // Create only explicit identity: new location setup must remain empty.
    for(let i=1;i<count;i++) await createLocation({name:`Atelier ${i} – Équipe`,shortName:`Équipe ${i}`,clockerKey:`atelier-${i}`,actorEmployeeId:'cedar-owner'},db.executor);
    const locations=await listLocations({},db.executor);
    expect(locations).toHaveLength(count);
    expect(locations.every(l=>l.active&&l.workspaceId===workspace.id&&!['loc-1','loc-2'].includes(l.id))).toBe(true);
    expect(new Set(locations.map(l=>l.clockerKey)).size).toBe(count);
    for(const table of ['location_staffing_settings','location_coverage_windows','employee_location_eligibility','employee_positions','coverage_window_position_requirements']) expect(await q(`SELECT * FROM ${table}`)).toEqual([]);
    for(const location of locations) {
      expect(await findActiveLocationByClockerKey(location.clockerKey,db.executor)).toEqual(location);
      expect(evaluateLocationReadiness({workspace,location,staffing:null,coverageWindows:[],positions:[],eligibleEmployees:[]}).issues.map(i=>i.code)).toEqual(['STAFFING_NOT_CONFIGURED','COVERAGE_NOT_CONFIGURED','NO_ELIGIBLE_EMPLOYEES']);
    }
    expect(await findActiveLocationByClockerKey('2',db.executor)).toBeNull();
    const harbor=locations.find(l=>l.id==='cedar-harbor')!;
    expect(harbor.name).toBe('Atelier – Quai Étoile');
    await updateLocation({id:harbor.id,name:'Quai Étoile — Atelier renamed',shortName:'Quai',active:true,actorEmployeeId:'cedar-owner'},db.executor);
    expect(await findActiveLocationByClockerKey('harbor-atelier',db.executor)).toMatchObject({id:harbor.id,name:'Quai Étoile — Atelier renamed'});
    const finishing=await createPosition({name:'Finishing',actorEmployeeId:'cedar-owner'},db.executor);
    const inspection=await createPosition({name:'Inspection',actorEmployeeId:'cedar-owner'},db.executor);
    await insertEmployee({id:'cedar-worker',firstName:'Fictional',lastName:'Craftsperson',phone:'5550000002',role:'LEAD',primaryLocationId:harbor.id,eligibleLocationIds:locations.map(l=>l.id),positionIds:[finishing.id,inspection.id],actorEmployeeId:'cedar-owner'},db.executor);
    const employees=await listEmployees(db.executor),positions=await listPositions({},db.executor);
    const worker=employees.find(e=>e.id==='cedar-worker')!;
    expect(worker.positionIds).toEqual([finishing.id,inspection.id].sort());
    expect(worker.eligibleLocationIds).toHaveLength(count);
    await q('INSERT INTO location_staffing_settings(location_id,minimum_staff_per_shift,requires_designated_lead) VALUES($1,1,true)',[harbor.id]);
    const windowId=await createCoverageWindow({locationId:harbor.id,dayOfWeek:1,startTime:'08:00',endTime:'12:00',positionRequirements:[{positionId:finishing.id,quantity:1},{positionId:inspection.id,quantity:1}],actorEmployeeId:'cedar-owner'},db.executor);
    const staffing=(await db.executor.query<import('../../lib/data/schedule-health').LocationStaffingSetting>({text:'SELECT location_id AS "locationId",minimum_staff_per_shift AS "minimumStaffPerShift",requires_designated_lead AS "requiresDesignatedLead" FROM location_staffing_settings WHERE location_id=$1',values:[harbor.id]}))[0];
    const windows=await db.executor.query<import('../../lib/data/schedule-health').CoverageWindow>({text:`SELECT w.id,w.location_id AS "locationId",day_of_week AS "dayOfWeek",to_char(start_time,'HH24:MI') AS "startTime",to_char(end_time,'HH24:MI') AS "endTime",(SELECT json_agg(json_build_object('positionId',r.position_id,'quantity',r.quantity) ORDER BY r.position_id) FROM coverage_window_position_requirements r WHERE r.coverage_window_id=w.id) AS "positionRequirements" FROM location_coverage_windows w WHERE id=$1`,values:[windowId]});
    expect(windows[0].positionRequirements).toEqual(expect.arrayContaining([{positionId:finishing.id,quantity:1},{positionId:inspection.id,quantity:1}]));
    expect(evaluateLocationReadiness({workspace,location:harbor,staffing,coverageWindows:windows,positions,eligibleEmployees:employees}).state).toBe('READY');
    await q(`INSERT INTO employee_scheduling_settings(employee_id,target_weekly_hours,maximum_weekly_hours) VALUES('cedar-worker',8,4);
      INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) VALUES('cedar-normal','cedar-worker',1,'08:00','18:00');
      INSERT INTO weekly_availability_submissions(employee_id,week_start,uses_normal_availability) VALUES('cedar-worker','2030-10-07',true);`);
    expect(await readAvailabilityInputs('cedar-worker','2030-10-07','2030-10-07',db.executor)).toMatchObject({normal:[{dayOfWeek:1,startTime:'08:00',endTime:'18:00'}],weeks:[{weekStart:'2030-10-07',submitted:true,usesNormalAvailability:true}]});
    const candidate={employeeId:'cedar-worker',locationId:harbor.id,positionId:finishing.id,date:'2030-10-07',startTime:'08:00',endTime:'12:00',isDesignatedLead:true};
    const context=await getShiftValidationContext({...candidate,weekStart:'2030-10-07'},db.executor);
    expect(context).toMatchObject({workspace:{id:workspace.id,timeZone:workspace.timeZone},employee:{maximumWeeklyHours:4,role:'LEAD',positionIds:expect.arrayContaining([finishing.id,inspection.id])}});
    expect(validateShift({...context!,candidate})).toMatchObject({eligible:true,projectedHours:[{weekStart:'2030-10-07',assignmentHours:4,projectedHours:4,maximumHours:4}]});
    expect(validateShift({...context!,candidate:{...candidate,endTime:'13:00'}}).blockers.map(i=>i.code)).toContain('MAX_WEEKLY_HOURS');
    expect(validateShift({...context!,candidate:{...candidate,startTime:'07:00'}}).blockers.map(i=>i.code)).toContain('OUTSIDE_AVAILABILITY');
    // Persisted IANA zone, independent of the PostgreSQL session timezone.
    expect(businessDate(new Date('2030-10-07T03:30:00Z'),workspace.timeZone)).toBe('2030-10-06');
    expect(localDateTimeToInstant('2030-10-07T08:00',workspace.timeZone)).toBe('2030-10-07T12:00:00.000Z');
    expect(validateShift({...context!,candidate:{...candidate,date:'2030-03-10',startTime:'02:15',endTime:'03:15'}}).blockers.map(i=>i.code)).toContain('INVALID_TIME_RANGE');
    // Sunday night -> Monday splits into two workweeks, still nominal wall hours.
    expect(validateShift({...context!,existingShifts:[],candidate:{...candidate,date:'2030-10-06',startTime:'23:00',endTime:'01:00',endDate:'2030-10-07'}}).projectedHours).toMatchObject([{weekStart:'2030-09-30',assignmentHours:1},{weekStart:'2030-10-07',assignmentHours:1}]);
    const scheduleId=await ensureSchedule({locationId:harbor.id,weekStart:'2030-10-07',createdBy:'cedar-owner'},db.executor);
    const shiftId=await insertShift({...candidate,scheduleId,actorEmployeeId:'cedar-owner'},db.executor);
    const shifts=await listWeekShifts({weekStart:'2030-10-07'},db.executor);
    expect(shifts).toEqual([expect.objectContaining({id:shiftId,employeeId:'cedar-worker',positionId:finishing.id,isDesignatedLead:true})]);
    const ledgerContext=await getShiftValidationContext({employeeId:'cedar-worker',locationId:locations.at(-1)!.id,positionId:finishing.id,date:'2030-10-08',weekStart:'2030-10-07'},db.executor);
    expect(ledgerContext).toMatchObject({existingWeeklyMinutes:240,existingShifts:[{locationId:harbor.id,positionId:finishing.id}]});
    expect(validateShift({...ledgerContext!,candidate:{...candidate,locationId:locations.at(-1)!.id,date:'2030-10-08',startTime:'08:00',endTime:'09:00'}}).blockers.map(i=>i.code)).toContain('MAX_WEEKLY_HOURS');
    const health=calculateScheduleHealth({workspace,positions,shifts,locations:[{id:harbor.id,name:harbor.name,minimumStaffPerShift:staffing.minimumStaffPerShift,requiresDesignatedLead:staffing.requiresDesignatedLead}],employees:employees.map(e=>({...e,name:e.firstName})),coverageWindows:windows.map(w=>({...w,positionRequirements:w.positionRequirements??[]})),weekDates:['2030-10-07']});
    expect(health.coverageBlocks).toEqual([expect.objectContaining({assignedStaff:1,leadCovered:true,staffCovered:true,positionsCovered:false,positionCoverage:expect.arrayContaining([{positionId:finishing.id,positionName:'Finishing',assigned:1,required:1,missing:0},{positionId:inspection.id,positionName:'Inspection',assigned:0,required:1,missing:1}])})]);
    const template=await createTemplateFromWeek({name:'Cedar workweek',weekStart:'2030-10-07',createdBy:'cedar-owner'},db.executor);
    expect(await listTemplateShifts(template,db.executor)).toEqual([expect.objectContaining({locationId:harbor.id,positionId:finishing.id,employeeId:'cedar-worker',isDesignatedLead:true})]);
    await publishScheduleWithRevision({locationId:harbor.id,weekStart:'2030-10-07',managerId:'cedar-owner'},db.executor);
    expect((await readNotificationWeekState(['2030-10-07'],db.executor)).revisions[0].shifts).toEqual([expect.objectContaining({positionId:finishing.id,positionName:'Finishing',locationId:harbor.id})]);
    expect((await q('SELECT count(*)::integer AS count FROM notifications'))[0].count).toBeGreaterThan(0);
    const config=await loadWorkspaceNotificationConfig({PUSH_ENVIRONMENT:'test'},db.executor);
    expect(config).toMatchObject({workspace:{id:'cooperative-cedar'},policy:{timeZone:'America/New_York'},deliveryEnabled:false,testDeliveryEnabled:false});
    expect((await sqlNotificationStateRepository(db.executor,config.workspace).recipientAccess('cedar-worker'))?.allowedLocationIds).toHaveLength(count);
    const before=await q('SELECT row_to_json(n)::text AS row FROM notifications n ORDER BY id');
    const fail:SqlExecutor={query:db.executor.query.bind(db.executor),transaction:statements=>db.executor.transaction([...statements,{text:"SELECT 'task11_atomic_notification_rollback'::integer",values:[]}])};
    await expect(updateShift({shiftId,employeeId:'cedar-worker',date:candidate.date,startTime:'09:00',endTime:'12:00',positionId:finishing.id,isDesignatedLead:true,actorEmployeeId:'cedar-owner'},fail)).rejects.toThrow('task11_atomic_notification_rollback');
    expect(await q('SELECT row_to_json(n)::text AS row FROM notifications n ORDER BY id')).toEqual(before);
    expect((await listWeekShifts({weekStart:'2030-10-07'},db.executor))[0].startTime).toBe('08:00');
    expect((await readNotificationWeekState(['2030-10-07'],db.executor)).revisions).toHaveLength(1);
    await expect(q('DELETE FROM positions WHERE id=$1',[finishing.id])).rejects.toMatchObject({code:'23503'});
    await updateLocation({id:harbor.id,name:'Quai Étoile — Atelier renamed',shortName:'Quai',active:false,actorEmployeeId:'cedar-owner'},db.executor);
    expect(await findActiveLocationByClockerKey('harbor-atelier',db.executor)).toBeNull();
    expect((await sqlNotificationStateRepository(db.executor,config.workspace).recipientAccess('cedar-worker'))?.allowedLocationIds).toHaveLength(count-1);
    expect((await listLocations({},db.executor))).toHaveLength(count-1);
    expect((await listLocations({includeInactive:true},db.executor))).toHaveLength(count);
  } finally {await db.dispose();}
});

it('Task 11 generic fixture replacement preserves the upgraded schema catalog', async () => {
  await withOwnedTestResources(async defer => {
  const upgrade=await createDisposableFoundationDatabase({mode:'upgrade'});
  defer(() => upgrade.dispose());
    await upgrade.executor.query({text:await readFile('db/migrations/0008_workspace_positions.sql','utf8'),values:[]});
    await upgrade.executor.query({text:await readFile('db/migrations/0009_schedule_generation.sql','utf8'),values:[]});
    await upgrade.executor.query({text:await readFile('db/migrations/0010_shift_coverage_automation.sql','utf8'),values:[]});
    for (const file of ['0011_clocker_devices.sql','0012_clocker_pins.sql','0013_clocker_punches.sql','0014_clocker_breaks.sql','0015_clocker_schedule_context.sql','0016_time_corrections.sql']) {
      await upgrade.executor.query({text:await readFile('db/migrations/'+file,'utf8'),values:[]});
    }
    const generic=await createGenericWorkspaceDatabase();
    defer(() => generic.dispose());
    const catalog=async(executor:SqlExecutor)=>({
      columns:await executor.query({text:"SELECT table_name,column_name,ordinal_position,column_default,is_nullable,data_type,udt_name FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position",values:[]}),
      constraints:await executor.query({text:"SELECT c.relname AS table_name,k.conname,k.contype,k.convalidated,pg_get_constraintdef(k.oid) AS definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname,k.conname",values:[]}),
      indexes:await executor.query({text:"SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname",values:[]}),
    });
    const upgradedCatalog=await catalog(upgrade.executor);
    expect(upgradedCatalog.columns.length).toBeGreaterThan(100);
    expect(upgradedCatalog.columns).toContainEqual(expect.objectContaining({table_name:'shifts',column_name:'assignment_episode_id'}));
    expect(await catalog(generic.executor)).toEqual(upgradedCatalog);
    expect((await getWorkspace(upgrade.executor)).id).toBe('workspace-fuel');
    expect((await getWorkspace(generic.executor)).id).toBe('cooperative-cedar');
  });
});


import { getEmployeeManagementProfile } from '../../lib/data/employees';

describe('employee profile lifecycle', () => {
  it('deactivates and reactivates without deleting history and revokes existing sessions', async () => {
    const db = await workspaceFixture();
    const q = (text:string, values:unknown[]=[]) => db.executor.query<Record<string,unknown>>({text, values});
    try {
      await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,'manager',now()+interval '1 day')", ['a'.repeat(64)]);
      await q("INSERT INTO schedules(id,location_id,week_start,created_by,status) VALUES('employee-history','loc-1','2030-10-07','owner','PUBLISHED'); INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('employee-history-shift','employee-history','manager','2030-10-07','08:00','16:00'); INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status) VALUES('employee-history-leave','manager','2030-10-08','2030-10-08','APPROVED')");
      const before = await getEmployeeManagementProfile('manager', db.executor);
      expect(before).not.toBeNull();
      await updateEmployeeProfile({
        employeeId:'manager', expectedUpdatedAt:before!.updatedAt,
        firstName:'Morgan', lastName:'Manager', phone:'7875550101',
        email:'morgan@example.invalid', role:'LEAD', primaryLocationId:'loc-1',
        active:false, actorEmployeeId:'owner',
      }, db.executor);
      expect(await q("SELECT first_name,last_name,phone,email,role,active FROM employees WHERE id='manager'")).toEqual([{
        first_name:'Morgan', last_name:'Manager', phone:'7875550101',
        email:'morgan@example.invalid', role:'LEAD', active:false,
      }]);
      expect(await q("SELECT token_hash FROM employee_sessions WHERE employee_id='manager'")).toEqual([]);
      expect(await q("SELECT id,employee_id FROM shifts WHERE id='employee-history-shift'")).toEqual([{id:'employee-history-shift',employee_id:'manager'}]);
      expect(await q("SELECT id,employee_id FROM time_off_requests WHERE id='employee-history-leave'")).toEqual([{id:'employee-history-leave',employee_id:'manager'}]);

      const inactive = await getEmployeeManagementProfile('manager', db.executor);
      await updateEmployeeProfile({
        employeeId:'manager', expectedUpdatedAt:inactive!.updatedAt,
        firstName:'Morgan', lastName:'Manager', phone:'7875550101',
        email:'morgan@example.invalid', role:'LEAD', primaryLocationId:'loc-1',
        active:true, actorEmployeeId:'owner',
      }, db.executor);
      expect((await getEmployeeManagementProfile('manager', db.executor))?.active).toBe(true);
      expect(await q("SELECT token_hash FROM employee_sessions WHERE employee_id='manager'")).toEqual([]);
    } finally { await db.dispose(); }
  });

  it('enforces Owner authority, last-active-Owner safety and active-primary-location rules', async () => {
    const db = await workspaceFixture();
    const q = (text:string, values:unknown[]=[]) => db.executor.query<Record<string,unknown>>({text, values});
    try {
      const owner = (await getEmployeeManagementProfile('owner', db.executor))!;
      await expect(updateEmployeeProfile({
        employeeId:'owner', expectedUpdatedAt:owner.updatedAt, firstName:'Test', lastName:'Owner',
        phone:'555', role:'OWNER', primaryLocationId:'loc-1', active:true, actorEmployeeId:'manager',
      }, db.executor)).rejects.toThrow('employee_profile_permission_denied');
      await expect(updateEmployeeProfile({
        employeeId:'owner', expectedUpdatedAt:owner.updatedAt, firstName:'Test', lastName:'Owner',
        phone:'555', role:'EMPLOYEE', primaryLocationId:'loc-1', active:false, actorEmployeeId:'owner',
      }, db.executor)).rejects.toThrow('employee_profile_last_owner');

      const manager = (await getEmployeeManagementProfile('manager', db.executor))!;
      await expect(updateEmployeeProfile({
        employeeId:'manager', expectedUpdatedAt:manager.updatedAt, firstName:'Test', lastName:'Manager',
        phone:'556', role:'OWNER', primaryLocationId:'loc-1', active:true, actorEmployeeId:'manager',
      }, db.executor)).rejects.toThrow('employee_profile_permission_denied');

      await q("UPDATE locations SET active=false WHERE id='loc-2'");
      await expect(updateEmployeeProfile({
        employeeId:'manager', expectedUpdatedAt:manager.updatedAt, firstName:'Test', lastName:'Manager',
        phone:'556', role:'MANAGER', primaryLocationId:'loc-2', active:true, actorEmployeeId:'owner',
      }, db.executor)).rejects.toThrow('employee_profile_location_invalid');
    } finally { await db.dispose(); }
  });

  it('rejects stale profile versions without overwriting the newer employee', async () => {
    const db = await workspaceFixture();
    const q = (text:string, values:unknown[]=[]) => db.executor.query<Record<string,unknown>>({text, values});
    try {
      const stale = (await getEmployeeManagementProfile('manager', db.executor))!;
      await q("UPDATE employees SET first_name='Newer',updated_at=updated_at+interval '1 microsecond' WHERE id='manager'");
      await expect(updateEmployeeProfile({
        employeeId:'manager', expectedUpdatedAt:stale.updatedAt, firstName:'Stale', lastName:'Manager',
        phone:'556', role:'MANAGER', primaryLocationId:'loc-1', active:true, actorEmployeeId:'owner',
      }, db.executor)).rejects.toThrow('employee_profile_stale');
      expect(await q("SELECT first_name FROM employees WHERE id='manager'")).toEqual([{first_name:'Newer'}]);
    } finally { await db.dispose(); }
  });

  it('serializes concurrent Owner demotions so at least one active Owner remains', async () => {
    const db = await workspaceFixture();
    try {
      await db.executor.query({text:"INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('owner2','Second','Owner','557','OWNER','loc-1')",values:[]});
      const first = (await getEmployeeManagementProfile('owner', db.executor))!;
      const second = (await getEmployeeManagementProfile('owner2', db.executor))!;
      const results = await Promise.allSettled([
        updateEmployeeProfile({employeeId:'owner',expectedUpdatedAt:first.updatedAt,firstName:'Test',lastName:'Owner',phone:'555',role:'EMPLOYEE',primaryLocationId:'loc-1',active:true,actorEmployeeId:'owner'},db.executor),
        updateEmployeeProfile({employeeId:'owner2',expectedUpdatedAt:second.updatedAt,firstName:'Second',lastName:'Owner',phone:'557',role:'EMPLOYEE',primaryLocationId:'loc-1',active:true,actorEmployeeId:'owner2'},db.executor),
      ]);
      expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
      expect(String((results.find(result => result.status === 'rejected') as PromiseRejectedResult).reason)).toContain('employee_profile_last_owner');
      expect(await db.executor.query({text:"SELECT id FROM employees WHERE active AND role='OWNER' ORDER BY id",values:[]})).toHaveLength(1);
    } finally { await db.dispose(); }
  });
});
