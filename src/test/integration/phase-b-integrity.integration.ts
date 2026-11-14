import { createHash,randomUUID } from 'node:crypto';
import {readFile} from 'node:fs/promises';
import { Client } from 'pg';
import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only',()=>({}));
import type { SqlExecutor, SqlStatement } from '../../lib/notifications/types';
import type { SessionMutationProof } from '../../lib/shift-changes/types';

// Adapt only transport and request context. All authorization and business SQL
// below is the real repository/action implementation on an owned database.
const context = vi.hoisted(() => ({ executor: null as SqlExecutor | null, cookies: new Map<string, string>(), cookieWrites: 0 }));
vi.mock('@/lib/db', () => {
  // Match Neon's lazy statement contract: assembling a transaction starts no
  // independent queries. Both the extracted default executor and explicit
  // fixture executor execute the real ordered PostgreSQL batch below.
  const statement=(text:string,values:readonly unknown[]=[])=>({statement:{text,values},then:(yes:(rows:unknown[])=>unknown,no:(error:unknown)=>unknown)=>context.executor!.query({text,values}).then(yes,no)});
  const tagged=Object.assign((strings:TemplateStringsArray,...values:unknown[])=>statement(strings.reduce((text,part,index)=>text+(index?'$'+index:'')+part,''),values),{
    query:statement,transaction:(queries:{statement:SqlStatement}[])=>context.executor!.transaction(queries.map(query=>query.statement)),
  });
  return {getDb:()=>tagged,queryRows:(rows:unknown)=>rows};
});
vi.mock('next/headers', () => ({ cookies: async () => ({
  get: (name: string) => context.cookies.has(name) ? { value: context.cookies.get(name)! } : undefined,
  set: (name: string, value: string) => { context.cookieWrites++; context.cookies.set(name, value); },
  delete: (name: string) => context.cookies.delete(name),
}) }));
vi.mock('@/lib/data/notification-transactions', async (original) => ({ ...await original<Record<string, unknown>>(), neonNotificationExecutor: () => context.executor! }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));

import { createDisposableFoundationDatabase } from './local-postgres';
import { fixtureProof } from './shift-change-api';
import { activateEmployeeCredential, findEmployeeCredential, getEmployeeManagementProfile, insertEmployee, saveEmployeeSchedulingProfile, updateEmployeeProfile } from '../../lib/data/employees';
import { createSession, getSession } from '../../lib/auth/session';
import { deleteShift, insertShift, updateShift } from '../../lib/data/schedules';
import { publishScheduleWithRevision } from '../../lib/data/publication-revisions';
import { reviewTimeOffRequest } from '../../lib/data/requests';
import { createTimeOffRequest } from './self-service-api';
import { saveEmployeeCoreProfileAction, saveEmployeeSchedulingProfileAction, createEmployeeFormAction } from '../../app/app/employees/actions';
import { createShiftAction, updateShiftAction } from '../../app/app/schedule/actions';

const week = '2030-10-07';
type Fixture = Awaited<ReturnType<typeof fixture>>;
async function fixture(status: 'DRAFT' | 'PUBLISHED' = 'DRAFT', credential = true) {
  const db = await createDisposableFoundationDatabase({ mode: 'current-runtime' });
  context.executor = db.executor; context.cookies.clear(); context.cookieWrites = 0;
  await db.executor.query({ text: `INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES
    ('owner','Fictional','Owner','5550000001','OWNER','loc-1'),
    ('actor','Fictional','Manager','5550000003','MANAGER','loc-1'),
    ('worker','Fictional','Lead','5550000002','LEAD','loc-1');
    INSERT INTO employee_location_eligibility VALUES('owner','loc-1'),('actor','loc-1'),('worker','loc-1');
    INSERT INTO positions(id,workspace_id,name) VALUES('p1','workspace-fuel','Fictional Position');
    INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) SELECT 'normal-'||d,'worker',d,'00:00','24:00' FROM generate_series(0,6) d;
    INSERT INTO employee_credentials(employee_id,password_hash) VALUES('owner','FICTIONAL_OWNER_HASH');
    INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('schedule','loc-1','2030-10-07','${status}','owner');
    INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('existing','schedule','worker','2030-10-08','08:00','12:00');
    INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status) VALUES('request','worker','2030-10-09','2030-10-09','PENDING');`, values: [] });
  if (credential) await db.executor.query({ text: "INSERT INTO employee_credentials(employee_id,password_hash) VALUES('worker','FICTIONAL_WORKER_HASH')", values: [] });
  // Seed the intended legacy census before atomic operational adoption; later Managers do not inherit Company.
  await db.executor.query({text:await readFile('db/migrations/0032_company_access_invitations.sql','utf8'),values:[]});
  const owner = await fixtureProof(db.executor, 'owner'), actor = await fixtureProof(db.executor, 'actor');
  return { ...db, owner, actor };
}
const q = <T = Record<string, unknown>>(db: Fixture, text: string, values: unknown[] = []) => db.executor.query<T>({ text, values });
const businessMutation = (statements: readonly SqlStatement[]) => statements.some(statement => /^\s*(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\b/.test(statement.text));
it.each(['DRAFT', 'PUBLISHED'].flatMap(status => ['create', 'edit'].map(operation => ({ status: status as 'DRAFT' | 'PUBLISHED', operation }))))('$status $operation action recovers a real final SQL overlap without an invalid shift/revision/intent commit', async ({ status, operation }) => {
  const db = await fixture(status);
  try {
    await q(db, `INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('E','Fictional','Worker','5550000011','EMPLOYEE','loc-1');
      INSERT INTO employee_location_eligibility VALUES('E','loc-1'),('E','loc-2');
      INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) SELECT 'conflict-'||d,'E',d,'00:00','24:00' FROM generate_series(0,6) d;
      INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('other','loc-2','2030-10-07','DRAFT','owner');
      UPDATE shifts SET employee_id='E' WHERE id='existing';`);
    // A published fixture must include its real canonical publication history.
    // Raw PUBLISHED rows without a revision trigger the existing baseline repair.
    if (status === 'PUBLISHED') {
      await q(db, "UPDATE schedules SET status='DRAFT' WHERE id='schedule'");
      await publishScheduleWithRevision({ locationId: 'loc-1', weekStart: week, managerId: 'owner', proof: db.owner }, db.executor);
    }
    const revisionsBefore = await q(db, 'SELECT id FROM schedule_publication_revisions ORDER BY id');
    const intentsBefore = await q(db, 'SELECT id FROM notifications ORDER BY id');
    context.cookies.set('fuel_session', 'owned-integration-proof:actor');
    const data = new FormData();
    Object.entries({ shiftId: 'existing', weekStart: week, locationId: 'loc-1', employeeId: 'E', date: operation === 'create' ? week : '2030-10-08', startTime: '13:00', endTime: '17:00', notes: 'Private editable draft', positionId: '' }).forEach(([key, value]) => data.set(key, value));
    let reached = false;
    context.executor = { transaction: db.executor.transaction, query: async <T>(statement: SqlStatement, signal?: AbortSignal) => {
      const result = await db.executor.query<T>(statement, signal);
      if (!reached && statement.text.includes(' AS state, clock_timestamp()::text AS read_at')) {
        reached = true;
        await q(db, "INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('concurrent','other','E',$1,'12:00','18:00')", [String(data.get('date'))]);
      }
      return result;
    } };
    await expect((operation === 'create' ? createShiftAction : updateShiftAction)(data)).resolves.toMatchObject({ error: 'Employee already has an overlapping shift.', issueCode: 'SHIFT_OVERLAP' });
    expect(reached).toBe(true);
    expect(await q(db, 'SELECT id,start_time::text,notes FROM shifts WHERE schedule_id=\'schedule\' ORDER BY id')).toEqual([{ id: 'existing', start_time: '08:00:00', notes: null }]);
    expect(await q(db, 'SELECT id FROM schedule_publication_revisions ORDER BY id')).toEqual(revisionsBefore);
    expect(await q(db, 'SELECT id FROM notifications ORDER BY id')).toEqual(intentsBefore);
    expect(data.get('notes')).toBe('Private editable draft');
  } finally { context.executor = db.executor; await db.dispose(); }
});
async function profileWrite(db: Fixture, employeeId: string, change: Partial<Awaited<ReturnType<typeof getEmployeeManagementProfile>>>, proof = db.owner) {
  const profile = (await getEmployeeManagementProfile(employeeId, db.executor))!;
  return updateEmployeeProfile({ ...profile, ...change, employeeId, expectedUpdatedAt: profile.updatedAt, actorEmployeeId: proof.employee.id, proof }, db.executor);
}
async function reviewedLogin(employeeId = 'worker') {
  const credential = (await findEmployeeCredential(employeeId))!;
  return { credential, issue: () => createSession(credential.id, credential) };
}
async function waitForLock(db: Fixture, fragment: string) {
  const deadline = Date.now() + 2500;
  while (Date.now() < deadline) {
    const rows = await q(db, "SELECT pid,wait_event FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query ILIKE $1", [`%${fragment}%`]);
    if (rows.length) return rows;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error(`Required actual PostgreSQL lock wait was not observed: ${fragment}`);
}
async function withWriter(db: Fixture, work: (writer: Client) => Promise<void>) {
  const writer = new Client({ connectionString: db.connectionString }); await writer.connect();
  try { await writer.query('BEGIN'); await work(writer); }
  finally { await writer.query('ROLLBACK').catch(() => {}); await writer.end(); }
}
async function managementWrite(db: Fixture, op: string, sql: SqlExecutor, designated = false) {
  if (op === 'insert') return insertShift({ scheduleId: 'schedule', employeeId: 'worker', date: '2030-10-09', startTime: '09:00', endTime: '13:00', isDesignatedLead: designated, actorEmployeeId: 'actor', proof: db.actor }, sql);
  if (op === 'update') return updateShift({ shiftId: 'existing', employeeId: 'worker', date: '2030-10-08', startTime: '13:00', endTime: '17:00', isDesignatedLead: designated, actorEmployeeId: 'actor', proof: db.actor }, sql);
  if (op === 'delete') return deleteShift('existing', db.actor, sql);
  if (op === 'publish') return publishScheduleWithRevision({ locationId: 'loc-1', weekStart: week, managerId: 'actor', proof: db.actor }, sql);
  return reviewTimeOffRequest({ requestId: 'request', status: 'APPROVED', managerId: 'actor', proof: db.actor }, sql);
}

describe('Phase B final management authority and Lead capability', () => {
  for (const status of ['DRAFT', 'PUBLISHED'] as const) for (const op of ['insert', 'update', 'delete']) for (const change of ['demote', 'deactivate']) {
    it(`${status} ${op} rejects actor ${change} after the first actual SQL snapshot`, async () => {
      const db = await fixture(status);
      try {
        let fired = false;
        const sql: SqlExecutor = { transaction: db.executor.transaction, query: async <T>(statement: SqlStatement, signal?: AbortSignal) => {
          const result = await db.executor.query<T>(statement, signal);
          if (!fired && statement.text.includes(' AS state, clock_timestamp()::text AS read_at')) {
            fired = true; await profileWrite(db, 'actor', change === 'demote' ? { role: 'EMPLOYEE' } : { active: false });
          }
          return result;
        } };
        await expect(managementWrite(db, op, sql)).rejects.toThrow();
        expect(fired).toBe(true);
        expect(await q(db, 'SELECT id,start_time::text FROM shifts ORDER BY id')).toEqual([{ id: 'existing', start_time: '08:00:00' }]);
        expect(await q(db, 'SELECT id FROM schedule_publication_revisions')).toEqual([]);
        expect(await q(db, 'SELECT id FROM notifications')).toEqual([]);
      } finally { await db.dispose(); }
    });
  }
  for (const op of ['publish', 'timeoff']) for (const change of ['demote', 'deactivate']) {
    it(`${op} rejects actor ${change} before its final SQL transaction`, async () => {
      const db = await fixture();
      try {
        let fired = false;
        const drop = async () => { fired = true; await profileWrite(db, 'actor', change === 'demote' ? { role: 'EMPLOYEE' } : { active: false }); };
        const sql: SqlExecutor = { query: async <T>(statement: SqlStatement, signal?: AbortSignal) => {
          if (op === 'timeoff' && !fired && statement.text.startsWith('SELECT e.id AS \"employeeId\", e.role, e.active')) await drop();
          return db.executor.query<T>(statement, signal);
        }, transaction: async (statements, signal) => {
          if (!fired) await drop();
          return db.executor.transaction(statements, signal);
        } };
        const outcome = await Promise.allSettled([managementWrite(db, op, sql)]);
        expect(fired).toBe(true);
        expect(outcome[0].status === 'rejected' || (outcome[0].status === 'fulfilled' && outcome[0].value === false)).toBe(true);
        expect(await q(db, 'SELECT status FROM schedules')).toEqual([{ status: 'DRAFT' }]);
        expect(await q(db, 'SELECT status FROM time_off_requests')).toEqual([{ status: 'PENDING' }]);
        expect(await q(db, 'SELECT id FROM notifications')).toEqual([]);
      } finally { await db.dispose(); }
    });
  }
  for (const status of ['DRAFT', 'PUBLISHED'] as const) for (const op of ['insert', 'update']) {
    it(`${status} ${op} rejects a newly demoted designated Lead on guarded retry`, async () => {
      const db = await fixture(status);
      try {
        let fired = false;
        const sql: SqlExecutor = { transaction: db.executor.transaction, query: async <T>(statement: SqlStatement, signal?: AbortSignal) => {
          const result = await db.executor.query<T>(statement, signal);
          if (!fired && statement.text.includes(' AS state, clock_timestamp()::text AS read_at')) { fired = true; await profileWrite(db, 'worker', { role: 'EMPLOYEE' }); }
          return result;
        } };
        await expect(managementWrite(db, op, sql, true)).rejects.toThrow('qualified Lead');
        expect(fired).toBe(true);
        expect(await q(db, 'SELECT id,is_designated_lead FROM shifts')).toEqual([{ id: 'existing', is_designated_lead: false }]);
      } finally { await db.dispose(); }
    });
  }
  it.each(['insert', 'update', 'delete', 'publish', 'timeoff'])('%s rejects a revoked or expired authenticated session', async op => {
    const db = await fixture();
    try {
      await q(db, "UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE token_hash=$1", [db.actor.sessionTokenHash]);
      await expect(managementWrite(db, op, db.executor)).rejects.toThrow('authorization');
      await q(db, 'DELETE FROM employee_sessions WHERE token_hash=$1', [db.actor.sessionTokenHash]);
      await expect(managementWrite(db, op, db.executor)).rejects.toThrow('authorization');
      expect(await q(db, 'SELECT status FROM time_off_requests')).toEqual([{ status: 'PENDING' }]);
      expect(await q(db, 'SELECT id FROM notifications')).toEqual([]);
    } finally { await db.dispose(); }
  });
  it('rechecks authority after an actual employee lock wait', async () => {
    const db = await fixture(); let pending: Promise<unknown> | undefined;
    try {
      await withWriter(db, async writer => {
        await writer.query("UPDATE employees SET role='EMPLOYEE' WHERE id='actor'");
        pending = managementWrite(db, 'insert', db.executor).then(value => ({ value }), error => ({ error }));
        expect(await waitForLock(db, 'employees')).not.toHaveLength(0);
        await writer.query('COMMIT');
        expect(await pending).toHaveProperty('error');
      });
      expect(await q(db, 'SELECT id FROM shifts')).toEqual([{ id: 'existing' }]);
    } finally { await pending; await db.dispose(); }
  });
  it.each(['LEAD', 'MANAGER', 'OWNER'])('permits current %s designated Lead without granting position qualifications', async role => {
    const db = await fixture();
    try {
      await q(db, 'UPDATE employees SET role=$1 WHERE id=$2', [role, 'worker']);
      await expect(managementWrite(db, 'insert', db.executor, true)).resolves.toBeTypeOf('string');
      await expect(insertShift({ scheduleId: 'schedule', employeeId: 'worker', date: '2030-10-10', startTime: '09:00', endTime: '13:00', positionId: 'p1', actorEmployeeId: 'actor', proof: db.actor }, db.executor)).rejects.toThrow('not qualified');
    } finally { await db.dispose(); }
  });
  it('permits ordinary Employee assignments and employee time-off submission', async () => {
    const db = await fixture();
    try {
      await q(db, "UPDATE employees SET role='EMPLOYEE' WHERE id='worker'");
      await expect(managementWrite(db, 'insert', db.executor)).resolves.toBeTypeOf('string');
      await expect(managementWrite(db, 'update', db.executor, true)).rejects.toThrow('qualified Lead');
      await createTimeOffRequest({ employeeId: 'worker', startDate: '2030-10-10', endDate: '2030-10-10' }, db.executor);
      expect(await q(db, "SELECT id FROM time_off_requests WHERE employee_id='worker'")).toHaveLength(2);
    } finally { await db.dispose(); }
  });
});

describe('Phase B account issuance and activation', () => {
  it('a pre-deactivation login review cannot issue a session after reactivation', async () => {
    const db = await fixture();
    try {
      const login = await reviewedLogin();
      await profileWrite(db, 'worker', { active: false }); await profileWrite(db, 'worker', { active: true });
      await expect(login.issue()).rejects.toThrow('session_login_changed');
      expect(context.cookieWrites).toBe(0); expect(await getSession()).toBeNull();
      expect(await q(db, "SELECT employee_id FROM employee_sessions WHERE employee_id='worker'")).toEqual([]);
    } finally { await db.dispose(); }
  });
  it('session issuance waiting on deactivation rechecks fresh account state and never sets a cookie', async () => {
    const db = await fixture(); let pending: Promise<unknown> | undefined;
    try {
      const login = await reviewedLogin();
      await withWriter(db, async writer => {
        await writer.query("SELECT id FROM employees WHERE id='worker' FOR UPDATE");
        await writer.query("UPDATE employees SET active=false,updated_at=clock_timestamp() WHERE id='worker'");
        pending = login.issue().then(value => ({ value }), error => ({ error }));
        // Candidate waits at its FK; corrected issuance waits at the lifecycle row lock.
        expect(await waitForLock(db, 'employee')).not.toHaveLength(0);
        await writer.query('COMMIT'); expect(await pending).toHaveProperty('error');
      });
      await profileWrite(db, 'worker', { active: true });
      expect(context.cookieWrites).toBe(0); expect(await getSession()).toBeNull();
      expect(await q(db, "SELECT employee_id FROM employee_sessions WHERE employee_id='worker'")).toEqual([]);
    } finally { await pending; await db.dispose(); }
  });
  it('deactivation queued behind session issuance deletes the issued session', async () => {
    const db = await fixture(); let pending: Promise<unknown> | undefined;
    try {
      const login = await reviewedLogin();
      await withWriter(db, async writer => {
        await writer.query("SELECT id FROM employees WHERE id='worker' FOR SHARE");
        await login.issue();
        pending = profileWrite(db, 'worker', { active: false });
        expect(await waitForLock(db, 'FROM employees e')).not.toHaveLength(0);
        await writer.query('COMMIT'); await pending;
      });
      await profileWrite(db, 'worker', { active: true });
      expect(await getSession()).toBeNull();
      expect(await q(db, "SELECT employee_id FROM employee_sessions WHERE employee_id='worker'")).toEqual([]);
    } finally { await pending; await db.dispose(); }
  });
  it('fresh concurrent logins issue independent sessions, but a changed credential review is rejected', async () => {
    const db = await fixture();
    try {
      const login = await reviewedLogin(); await Promise.all([login.issue(), login.issue()]);
      expect(await q(db, "SELECT employee_id FROM employee_sessions WHERE employee_id='worker'")).toHaveLength(2);
      expect(await getSession()).toMatchObject({ id: 'worker', role: 'LEAD' });
      await q(db, "UPDATE employee_credentials SET password_hash='FICTIONAL_NEW_HASH',password_updated_at=clock_timestamp() WHERE employee_id='worker'");
      const writes = context.cookieWrites;
      await expect(login.issue()).rejects.toThrow('session_login_changed'); expect(context.cookieWrites).toBe(writes);
    } finally { await db.dispose(); }
  });
  it.each(['phone', 'inactive', 'combined'])('retired knowledge-only activation stays closed during %s lifecycle change', async change => {
    const db = await fixture('DRAFT', false); let pending: Promise<unknown> | undefined;
    try {
      await withWriter(db, async writer => {
        await writer.query("SELECT id FROM employees WHERE id='worker' FOR UPDATE");
        await writer.query(`UPDATE employees SET ${change === 'inactive' ? '' : "phone='5550000099',"}${change === 'phone' ? '' : 'active=false,'}updated_at=clock_timestamp() WHERE id='worker'`);
        pending = activateEmployeeCredential({ employeeId: 'worker', phone: '5550000002', passwordHash: 'FICTIONAL_ACTIVATION_HASH' }).then(value => ({ value }), error => ({ error }));
        // Knowledge alone returns no credential even while the lifecycle writer owns the row.
        expect(await pending).toEqual({value:null});await writer.query('COMMIT');
      });
      expect(await q(db, "SELECT employee_id FROM employee_credentials WHERE employee_id='worker'")).toEqual([]);
    } finally { await pending; await db.dispose(); }
  });
  it('valid ID and phone cannot activate, duplicate legacy attempts stay closed, and existing credentials survive lifecycle writes', async () => {
    const db=await fixture('DRAFT',false);
    try {
      expect(await activateEmployeeCredential({employeeId:'WORKER',phone:'(555) 000-0002',passwordHash:'FICTIONAL_ACTIVATION_HASH'})).toBeNull();
      expect(await Promise.all([1,2].map(()=>activateEmployeeCredential({employeeId:'worker',phone:'5550000002',passwordHash:'FICTIONAL_DUPLICATE_HASH'})))).toEqual([null,null]);
      expect(await q(db,"SELECT employee_id FROM employee_credentials WHERE employee_id='worker'")).toEqual([]);
      // Existing-credential lifecycle preservation is independent of the retired writer. Possession/duplicate claims use the new real SQL suite.
      await q(db,"INSERT INTO employee_credentials(employee_id,password_hash) VALUES('worker','FICTIONAL_EXISTING_HASH')");
      await profileWrite(db,'worker',{active:false,phone:'5550000099'});
      expect(await q(db,"SELECT password_hash FROM employee_credentials WHERE employee_id='worker'")).toEqual([{password_hash:'FICTIONAL_EXISTING_HASH'}]);
    } finally {await db.dispose();}
  });
});

describe('Phase B authenticated employee writes and reviewed replacement sets', () => {
  async function scheduling(db: Fixture, expectedUpdatedAt: string, positionIds: string[], locations = ['loc-1'], proof = db.owner) {
    return saveEmployeeSchedulingProfile({ employeeId: 'worker', expectedUpdatedAt, positionIds, eligibleLocationIds: locations, actorEmployeeId: proof.employee.id, proof }, db.executor);
  }
  it.each(['core', 'scheduling', 'creation'])('%s rejects revoked and expired session proofs at the SQL boundary', async kind => {
    const db = await fixture();
    try {
      const employee = (await getEmployeeManagementProfile('worker', db.executor))!;
      const write = () => kind === 'core' ? profileWrite(db, 'worker', { firstName: 'Unauthorized' }) : kind === 'scheduling' ? scheduling(db, employee.updatedAt, ['p1']) : insertEmployee({ id: 'new', firstName: 'Fictional', lastName: 'New', phone: '5550000004', role: 'EMPLOYEE', primaryLocationId: 'loc-1', eligibleLocationIds: [], actorEmployeeId: 'owner', proof: db.owner }, db.executor);
      await q(db, "UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE token_hash=$1", [db.owner.sessionTokenHash]);
      await expect(write()).rejects.toThrow('authorization');
      await q(db, 'DELETE FROM employee_sessions WHERE token_hash=$1', [db.owner.sessionTokenHash]);
      await expect(write()).rejects.toThrow('authorization');
      expect((await getEmployeeManagementProfile('worker', db.executor))!.firstName).toBe(employee.firstName);
      expect(await q(db, 'SELECT employee_id FROM employee_positions')).toEqual([]);
      expect(await q(db, "SELECT id FROM employees WHERE id='new'")).toEqual([]);
    } finally { await db.dispose(); }
  });
  function coreForm(employee: NonNullable<Awaited<ReturnType<typeof getEmployeeManagementProfile>>>) {
    const data = new FormData();
    for (const [name, value] of Object.entries({ employeeId: employee.id, expectedUpdatedAt: employee.updatedAt, firstName: 'Unauthorized action', lastName: employee.lastName, phone: employee.phone, role: employee.role, primaryLocationId: employee.primaryLocationId, active: 'true', actorEmployeeId: 'FORGED', sessionTokenHash: 'FORGED' })) data.set(name, value);
    return data;
  }
  it.each(['core', 'scheduling', 'creation'])('actual %s Server Action rejects logout after entry authorization', async kind => {
    const db = await fixture();
    try {
      const login = await reviewedLogin('owner'); await login.issue();
      const token = context.cookies.get('fuel_session')!, hash = createHash('sha256').update(token).digest('hex');
      const employee = (await getEmployeeManagementProfile('worker', db.executor))!;
      let revoked = false, mutationAttempts = 0, sqlDenial: unknown;
      context.executor = { query: db.executor.query, transaction: async (statements, signal) => {
        const mutation = businessMutation(statements);
        if (mutation) mutationAttempts++;
        // Session reads also use HTTP batches. Revoke only after the real action
        // captured its proof and prepared the guarded employee mutation.
        if (mutation && !revoked) { revoked = true; await q(db, 'DELETE FROM employee_sessions WHERE token_hash=$1', [hash]); }
        try { return await db.executor.transaction(statements, signal); }
        catch (error) { if (mutation) sqlDenial = error; throw error; }
      } };
      const data=kind==='scheduling'?coreForm(employee):new FormData();
      if(kind==='scheduling'){data.set('positionIds','p1');data.set('eligibleLocationIds','loc-1');data.set('id','new');}
      else data.set('command',JSON.stringify(kind==='core'?{
        operationId:randomUUID(),employeeId:employee.id,expectedEmployeeUpdatedAt:employee.updatedAt,
        profile:{firstName:'Unauthorized action',lastName:employee.lastName,phone:employee.phone,email:employee.email??null,role:employee.role,primaryLocationId:employee.primaryLocationId,active:true},
      }:{operationId:randomUUID(),employee:{id:'NEW',firstName:'Fictional',lastName:'New',phone:'5550000004',email:null,role:'EMPLOYEE',primaryLocationId:'loc-1',eligibleLocationIds:['loc-1'],positionIds:['p1']}}));
      const result=await(kind==='core'?saveEmployeeCoreProfileAction(data):kind==='scheduling'?saveEmployeeSchedulingProfileAction(data):createEmployeeFormAction(data));
      expect(revoked).toBe(true);
      expect(mutationAttempts).toBe(1);
      expect(String(sqlDenial)).toMatch(/(?:management|operational)_authorization/);
      if(kind==='scheduling')expect(result).toHaveProperty('error');else expect(result).toEqual({state:'unavailable'});
      expect((await getEmployeeManagementProfile('worker', db.executor))!.firstName).toBe(employee.firstName);
      expect(await q(db, 'SELECT employee_id FROM employee_positions')).toEqual([]);
      expect(await q(db, "SELECT id FROM employees WHERE id='NEW'")).toEqual([]);
    } finally { context.executor = db.executor; await db.dispose(); }
  });
  it('session expiry during a real target lock wait cannot commit a core profile', async () => {
    const db = await fixture(); let pending: Promise<unknown> | undefined;
    try {
      const employee = (await getEmployeeManagementProfile('worker', db.executor))!;
      await q(db, "UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '150 milliseconds' WHERE token_hash=$1", [db.owner.sessionTokenHash]);
      await withWriter(db, async writer => {
        await writer.query("SELECT id FROM employees WHERE id='worker' FOR UPDATE");
        pending = profileWrite(db, 'worker', { firstName: 'Expired while waiting' }).then(value => ({ value }), error => ({ error }));
        expect(await waitForLock(db, 'FROM employees e')).not.toHaveLength(0);
        await writer.query('SELECT pg_sleep(0.2)'); await writer.query('COMMIT');
        expect(await pending).toHaveProperty('error');
      });
      expect((await getEmployeeManagementProfile('worker', db.executor))!.firstName).toBe(employee.firstName);
    } finally { await pending; await db.dispose(); }
  });
  it.each(['positions', 'locations'])('stale scheduling %s removal preserves the newer replacement set and exact revision', async kind => {
    const db = await fixture();
    try {
      const employee = (await getEmployeeManagementProfile('worker', db.executor))!;
      const result = await scheduling(db, employee.updatedAt, ['p1'], ['loc-1', 'loc-2']);
      await expect(scheduling(db, employee.updatedAt, kind === 'positions' ? [] : ['p1'], kind === 'locations' ? ['loc-1'] : ['loc-1', 'loc-2'])).rejects.toThrow('profile_stale');
      const newer = (await getEmployeeManagementProfile('worker', db.executor))!;
      expect(newer.positionIds).toEqual(['p1']); expect(newer.eligibleLocationIds).toEqual(['loc-1', 'loc-2']);
      expect(result).toEqual({ updatedAt: newer.updatedAt }); expect(newer.updatedAt).not.toBe(employee.updatedAt);
    } finally { await db.dispose(); }
  });
  it('simultaneous scheduling saves from one reviewed revision have exactly one winner', async () => {
    const db = await fixture();
    try {
      const employee = (await getEmployeeManagementProfile('worker', db.executor))!;
      const results = await Promise.allSettled([scheduling(db, employee.updatedAt, ['p1']), scheduling(db, employee.updatedAt, [], ['loc-1', 'loc-2'])]);
      expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
      expect(String((results.find(result => result.status === 'rejected') as PromiseRejectedResult).reason)).toContain('profile_stale');
    } finally { await db.dispose(); }
  });
  it('consecutive reviewed saves return their own exact revision and retain inactive references and primary eligibility', async () => {
    const db = await fixture();
    try {
      const employee = (await getEmployeeManagementProfile('worker', db.executor))!;
      const first = await scheduling(db, employee.updatedAt, ['p1'], ['loc-1', 'loc-2']);
      expect(first).toHaveProperty('updatedAt');
      await q(db, "UPDATE positions SET active=false WHERE id='p1'; UPDATE locations SET active=false WHERE id='loc-2'");
      const second = await scheduling(db, (first as unknown as { updatedAt: string }).updatedAt, ['p1'], ['loc-2']);
      const profile = (await getEmployeeManagementProfile('worker', db.executor))!;
      expect(second).toEqual({ updatedAt: profile.updatedAt }); expect(second).not.toEqual(first);
      expect(profile.positionIds).toEqual(['p1']); expect(profile.eligibleLocationIds).toEqual(['loc-1', 'loc-2']);
      expect(await q(db, "SELECT id FROM shifts WHERE id='existing'")).toHaveLength(1);
    } finally { await db.dispose(); }
  });
  it('core success returns the exact transaction-written version even if another write follows before resolution', async () => {
    const db = await fixture();
    try {
      const employee = (await getEmployeeManagementProfile('worker', db.executor))!;
      let committedVersion = '';
      const sql: SqlExecutor = { query: db.executor.query, transaction: async (statements, signal) => {
        const result = await db.executor.transaction(statements, signal);
        committedVersion = (await getEmployeeManagementProfile('worker', db.executor))!.updatedAt;
        await q(db, "UPDATE employees SET updated_at=updated_at+interval '1 microsecond',first_name='Concurrent after save' WHERE id='worker'");
        return result;
      } };
      const result = await updateEmployeeProfile({ ...employee, employeeId: employee.id, expectedUpdatedAt: employee.updatedAt, firstName: 'Own save', actorEmployeeId: 'owner', proof: db.owner }, sql);
      expect(result).toEqual({ updatedAt: committedVersion });
      expect((await getEmployeeManagementProfile('worker', db.executor))!.updatedAt).not.toBe(committedVersion);
    } finally { await db.dispose(); }
  });
});

it('Time Off session expiry during a real request-row lock wait cannot commit a decision', async () => {
  const db = await fixture(); let pending: Promise<unknown> | undefined;
  try {
    await q(db, "UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '150 milliseconds' WHERE token_hash=$1", [db.actor.sessionTokenHash]);
    await withWriter(db, async writer => {
      await writer.query("SELECT id FROM time_off_requests WHERE id='request' FOR UPDATE");
      pending = managementWrite(db, 'timeoff', db.executor).then(value => ({ value }), error => ({ error }));
      expect(await waitForLock(db, 'time_off_requests')).not.toHaveLength(0);
      await writer.query('SELECT pg_sleep(0.2)'); await writer.query('COMMIT');
      expect(await pending).toHaveProperty('error');
    });
    expect(await q(db, "SELECT status,reviewed_by FROM time_off_requests WHERE id='request'")).toEqual([{ status: 'PENDING', reviewed_by: null }]);
    expect(await q(db, 'SELECT id FROM notifications')).toEqual([]);
  } finally { await pending; await db.dispose(); }
});
