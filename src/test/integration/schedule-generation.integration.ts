import { deleteGeneratedDraftShift, saveEmployeeSchedulingProfile } from './management-api';
import { bindFixtureCallout, fixtureProof } from './shift-change-api';
import { managementProof } from '../fixtures/management';
import { afterAll, beforeAll, beforeEach, expect, it, vi, afterEach } from 'vitest';
import { Client } from 'pg';
import { selectGenerationScope } from '../../lib/scheduling/generation/scope';
import { readGenerationReviewSnapshot } from '../../lib/data/schedule-generation-snapshot';
import * as planner from '../../lib/scheduling/generation/planner';
afterEach(() => vi.restoreAllMocks());
import { createDisposableGenerationDatabase } from './local-postgres';
import { generateWeekDraft, readGenerationSnapshot } from '../../lib/data/schedule-generation';
import { GenerationConflictError, readGenerationSource } from '../../lib/data/generation-guards';
import { clearGenerationExclusion } from '../../lib/data/generation-exclusions';

import { withOwnedTestResources } from './owned-test-resources';
import type { SqlExecutor, SqlStatement } from '../../lib/notifications/types';
let database: Awaited<ReturnType<typeof createDisposableGenerationDatabase>>;
beforeAll(async () => {
  database = await createDisposableGenerationDatabase();
});
afterAll(async () => {
  await database?.dispose();
});
const q = (text: string, values: readonly unknown[] = []) => database.executor.query<Record<string, unknown>>({
  text,
  values
});
const request = {
  proof: managementProof('manager'),
  workspaceId: 'workspace-fuel',
  actorEmployeeId: 'manager',
  weekStart: '2030-10-07',
  mode: 'BUILD_WEEK' as const,
  locationScope: {
    kind: 'SELECTED' as const,
    locationIds: ['loc-1']
  }
};
const run = (input = request, executor = database.executor) => generateWeekDraft(input, executor);
const source = async () => (await readGenerationSource(database.executor)).source;
const rows = () => q('SELECT to_jsonb(t) row FROM shifts t ORDER BY id');
const schedules = () => q('SELECT to_jsonb(t) row FROM schedules t ORDER BY id');
beforeEach(async () => {
  await q('TRUNCATE employees,schedules,positions,location_coverage_windows,schedule_week_settings RESTART IDENTITY CASCADE');
  await q("UPDATE workspaces SET active=true,time_zone='America/Puerto_Rico'; UPDATE locations SET active=true; UPDATE location_staffing_settings SET minimum_staff_per_shift=1,requires_designated_lead=false");
  await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('manager','Private','Manager','NONE','MANAGER','loc-1'),('worker','Fictional','Worker','NONE','EMPLOYEE','loc-1'); INSERT INTO employee_location_eligibility VALUES('worker','loc-1'),('worker','loc-2'); INSERT INTO availability_windows VALUES('normal','worker',1,'08:00','12:00'); INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) VALUES('window','loc-1',1,'08:00','12:00')");
  await fixtureProof(database.executor, 'manager');
  await fixtureProof(database.executor, 'worker');
});
async function manual(id = 'manual', location = 'loc-1', week = '2030-10-07', date = '2030-10-07', start = '08:00', end = '10:00') {
  await q("INSERT INTO schedules(id,location_id,week_start,created_by) VALUES($1,$2,$3,'manager') ON CONFLICT(location_id,week_start) DO NOTHING", [`schedule-${location}-${week}`, location, week]);
  await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,notes) SELECT $1,id,'worker',$4,$5,$6,'private note' FROM schedules WHERE location_id=$2 AND week_start=$3", [id, location, week, date, start, end]);
}
it('creates an empty-week DRAFT and committed generated assignment without publication or private source', async () => {
  const result = await run();
  expect(await q('SELECT status,published_at FROM schedules')).toEqual([{
    status: 'DRAFT',
    published_at: null
  }]);
  expect(await q('SELECT date::text,start_time::text,end_time::text,assignment_origin FROM shifts')).toEqual([{
    date: '2030-10-07',
    start_time: '08:00:00',
    end_time: '12:00:00',
    assignment_origin: 'GENERATED'
  }]);
  const [createdEpisode]=await q('SELECT assignment_episode_id,terms_revision FROM shifts');
  expect(createdEpisode.assignment_episode_id).toMatch(/^[a-f0-9-]{36}$/);expect(createdEpisode.terms_revision).toBe(1);
  expect(result).toMatchObject({
    status: 'COMPLETE',
    changed: true,
    summary: {
      added: 1,
      removed: 0,
      createdSchedules: 1
    }
  });
  expect(JSON.stringify(result)).not.toMatch(/Private|NONE|private note|generated_claims|time_off_requests/);
  for (const table of ['notifications', 'schedule_publication_revisions', 'schedule_publication_revision_shifts']) {
    expect(await q(`SELECT count(*)::integer n FROM ${table}`)).toEqual([{
      n: 0
    }]);
  }
});
it('preserves manual assignments and fills only legal remaining work', async () => {
  await manual();
  await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('second','Fictional','Second','NONE','EMPLOYEE','loc-1'); INSERT INTO employee_location_eligibility VALUES('second','loc-1'); INSERT INTO availability_windows VALUES('second-normal','second',1,'08:00','12:00')");
  const before = (await rows())[0];
  expect(await run()).toMatchObject({status:'COMPLETE',summary:{added:1,removed:0,preserved:1}});
  expect(await rows()).toContainEqual(before);
  expect(await q("SELECT count(*)::integer n FROM shifts WHERE id='manual' AND assignment_origin='MANAGER'")).toEqual([{
    n: 1
  }]);
});
it('BUILD retains semantically identical generated rows and timestamps on repeated no-op', async () => {
  await run();
  const before = await source();
  expect(await run()).toMatchObject({
    changed: false,
    summary: {
      added: 0,
      removed: 0,
      createdSchedules: 0
    }
  });
  expect(await source()).toEqual(before);
});
it('BUILD replaces only eligible generated rows when authoritative demand changes', async () => {
  await run();
  await q("UPDATE location_coverage_windows SET end_time='10:00'");
  expect(await run()).toMatchObject({
    changed: true,
    summary: {
      added: 1,
      removed: 1
    }
  });
  expect(await q('SELECT start_time::text,end_time::text FROM shifts')).toEqual([{
    start_time: '08:00:00',
    end_time: '10:00:00'
  }]);
});
it('FILL never rewrites existing generated rows, even when demand changes', async () => {
  await run();
  const before = await source();
  await q("UPDATE location_coverage_windows SET end_time='10:00'");
  expect(await generateWeekDraft({
    ...request,
    mode: 'FILL_GAPS_ONLY'
  }, database.executor)).toMatchObject({
    changed: false
  });
  expect(await rows()).toEqual(before.shifts.map(row => ({
    row
  })));
  expect(await schedules()).toEqual(before.schedules.map(row => ({
    row
  })));
});
it.each(['PUBLISHED', 'ARCHIVED'])('mixed All rejects atomically when one target is %s', async status => {
  await q("INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) VALUES('ready-second','loc-2',1,'08:00','12:00')");
  await q("INSERT INTO schedules(id,location_id,week_start,created_by,status) VALUES('blocked','loc-2','2030-10-07','manager',$1)", [status]);
  const reviewInput = (await readGenerationReviewSnapshot({...request,locationScope:{kind:'ALL'}},database.executor)).input;
  expect(selectGenerationScope(reviewInput).readiness.filter(r=>['loc-1','loc-2'].includes(r.locationId)).map(r=>r.state)).toEqual(['READY','READY']);
  const before = await source();
  await expect(generateWeekDraft({
    ...request,
    locationScope: {
      kind: 'ALL'
    }
  }, database.executor)).rejects.toThrow('DRAFT');
  expect(await source()).toEqual(before);
});
it.each(['missing', 'worker', 'inactive'])('rejects forged/nonmanager/inactive actor %s', async actor => {
  if (actor === 'inactive') await q("UPDATE employees SET active=false WHERE id='manager'");
  await expect(run({
    ...request,
    proof: managementProof(actor === 'inactive' ? 'manager' : actor),
    actorEmployeeId: actor === 'inactive' ? 'manager' : actor
  })).rejects.toThrow('active Owner or Manager');
  expect(await rows()).toEqual([]);
  expect(await schedules()).toEqual([]);
});
it('rejects inactive workspace and non-Monday scope', async () => {
  await expect(run({
    ...request,
    weekStart: '2030-10-08'
  })).rejects.toThrow();
  await q('UPDATE workspaces SET active=false');
  await expect(run()).rejects.toThrow('active Owner or Manager');
});
it('single location honors cross-location and foreign-owning-week business-date maximum', async () => {
  await manual('foreign', 'loc-2', '2030-09-30', '2030-10-08', '08:00', '12:00');
  await q("INSERT INTO employee_scheduling_settings(employee_id,maximum_weekly_hours) VALUES('worker',4)");
  const before = await rows();
  expect(await run()).toMatchObject({
    status: 'PARTIAL',
    summary: {
      added: 0
    }
  });
  expect(await rows()).toEqual(before);
});
it('single location honors overlapping foreign business-date commitment', async () => {
  await manual('foreign', 'loc-2', '2030-09-30', '2030-10-07', '08:00', '12:00');
  const before = await rows();
  expect(await run()).toMatchObject({
    status: 'PARTIAL',
    summary: {
      added: 0
    }
  });
  expect(await rows()).toEqual(before);
});
it('legacy neighboring PUBLISHED without revisions remains byte-identical', async () => {
  await manual('published', 'loc-2', '2030-10-07', '2030-10-09');
  await q("UPDATE schedules SET status='PUBLISHED',published_at='2030-10-01',updated_at='2030-10-02'");
  const before = await source();
  expect(await run()).toMatchObject({status:'COMPLETE',summary:{added:1}});
  const after = await source();
  expect(after.schedules.filter(s => s.location_id === 'loc-2')).toEqual(before.schedules);
  expect(after.shifts.filter(s => s.id === 'published')).toEqual(before.shifts);
  expect(after.schedule_publication_revisions).toEqual([]);
  expect(after.schedule_publication_revision_shifts).toEqual([]);
  expect(await q('SELECT count(*)::integer n FROM notifications')).toEqual([{
    n: 0
  }]);
});
it('late write failure rolls back new parents, assignments and timestamps', async () => {
  const before = await source();
  const broken: SqlExecutor = {
    query: database.executor.query,
    transaction: s => database.executor.transaction([...s, {
      text: "SELECT 'late_failure'::integer",
      values: []
    }])
  };
  await expect(run(request, broken)).rejects.toThrow('late_failure');
  expect(await source()).toEqual(before);
});
it('fresh snapshot/re-solve after input change, with one retry owner capped at three attempts', async () => {
  const solving = vi.spyOn(planner, 'planWeek');
  let reads = 0,
    writes = 0;
  const racing: SqlExecutor = {
    query: async <T,>(s: SqlStatement) => {
      reads++;
      return database.executor.query<T>(s);
    },
    transaction: async s => {
      writes++;
      if (writes === 1) await q("INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status,reason) VALUES('leave','worker','2030-10-07','2030-10-07','APPROVED','secret leave reason')");
      return database.executor.transaction(s);
    }
  };
  expect(await run(request, racing)).toMatchObject({
    status: 'PARTIAL',
    summary: {
      added: 0
    }
  });
  expect(reads).toBe(2);
  expect(writes).toBe(2);
  expect(solving).toHaveBeenCalledTimes(2);
  solving.mockClear();
  expect(await rows()).toEqual([]);
  reads = 0;
  writes = 0;
  const churn: SqlExecutor = {
    query: racing.query,
    transaction: async s => {
      writes++;
      await q("UPDATE employees SET last_name=$1 WHERE id='worker'", [`changed-${writes}`]);
      return database.executor.transaction(s);
    }
  };
  await expect(run(request, churn)).rejects.toBeInstanceOf(GenerationConflictError);
  expect(reads).toBe(3);
  expect(writes).toBe(3);
  expect(solving).toHaveBeenCalledTimes(3);
});
it('verified no-op still rejects actor revocation or publication racing its final guard', async () => {
  await run();
  const before = await rows();
  let first = true;
  const revoked: SqlExecutor = {
    query: database.executor.query,
    transaction: async s => {
      if (first) {
        first = false;
        await q("UPDATE employees SET active=false WHERE id='manager'");
      }
      return database.executor.transaction(s);
    }
  };
  await expect(run(request, revoked)).rejects.toThrow('active Owner or Manager');
  expect(await rows()).toEqual(before);
  await q("UPDATE employees SET active=true WHERE id='manager'");
  first = true;
  let publisherState: Awaited<ReturnType<typeof rows>> = [];
  const published: SqlExecutor = {
    query: database.executor.query,
    transaction: async s => {
      if (first) {
        first = false;
        await q("UPDATE schedules SET status='PUBLISHED'");
        publisherState = await rows();
      }
      return database.executor.transaction(s);
    }
  };
  await expect(run(request, published)).rejects.toThrow('DRAFT');
  // The independent publisher invalidates reviewed material terms; the rejected
  // generator must preserve every assignment, episode and provenance property.
  expect(publisherState).toEqual(before.map(({row}) => ({row:{...(row as Record<string,unknown>),terms_revision:Number((row as Record<string,unknown>).terms_revision)+1}})));
  expect(await rows()).toEqual(publisherState);
});
it('concurrent Build/Fill and duplicate requests converge without duplicate assignments', async () => {
  const result = await Promise.all([run(), run(), generateWeekDraft({
    ...request,
    mode: 'FILL_GAPS_ONLY'
  }, database.executor)]);
  expect(await rows()).toHaveLength(1);
  expect(await schedules()).toHaveLength(1);
  expect(result.filter(r => r.changed)).toHaveLength(1);
});
it('actual generation retries Manager deletion during solving and respects its reservation; clear retries freshly', async () => {
  await run();
  const shift = (await source()).shifts[0];
  let first = true,
    reads = 0;
  let exclusionId = '';
  const racing: SqlExecutor = {
    query: async <T,>(s: SqlStatement) => {
      reads++;
      return database.executor.query<T>(s);
    },
    transaction: async s => {
      if (first) {
        first = false;
        const result = await deleteGeneratedDraftShift({
          ...request,
          locationId: 'loc-1',
          shiftId: String(shift.id)
        }, database.executor);
        exclusionId = result.exclusionId!;
      }
      return database.executor.transaction(s);
    }
  };
  expect(await run(request, racing)).toMatchObject({
    status: 'PARTIAL',
    summary: {
      added: 0
    }
  });
  expect(reads).toBe(2);
  expect(await rows()).toEqual([]);
  first = true;
  reads = 0;
  const clearing: SqlExecutor = {
    query: racing.query,
    transaction: async s => {
      if (first) {
        first = false;
        await clearGenerationExclusion({
          ...request,
          locationId: 'loc-1',
          exclusionId
        }, database.executor);
      }
      return database.executor.transaction(s);
    }
  };
  expect(await run(request, clearing)).toMatchObject({
    status: 'COMPLETE',
    summary: {
      added: 1
    }
  });
  expect(reads).toBe(2);
  expect(await rows()).toHaveLength(1);
});
it('exact after-state proof rolls back missing writes rather than reporting committed success', async () => {
  let attempts = 0;
  const missing: SqlExecutor = {
    query: database.executor.query,
    transaction: s => {
      attempts++;
      return database.executor.transaction(s.map(x => x.text.startsWith('INSERT INTO shifts') ? {
        text: 'SELECT 1',
        values: []
      } : x));
    }
  };
  await expect(run(request, missing)).rejects.toBeInstanceOf(GenerationConflictError);
  expect(attempts).toBe(3);
  expect(await rows()).toEqual([]);
  expect(await schedules()).toEqual([]);
});
it('authoritative snapshot preserves availability fallback, prior-Sunday and next-week ledger, exact microseconds and exclusions', async () => {
  await manual('prior', 'loc-2', '2030-09-30', '2030-10-06', '22:00', '02:00');
  await manual('next', 'loc-2', '2030-10-14', '2030-10-14');
  await q("UPDATE employees SET updated_at='2030-01-01T00:00:00.123456Z' WHERE id='worker'");
  const snapshot = await readGenerationSnapshot(request, database.executor);
  expect(snapshot.input.employees.find(e => e.id === 'worker')?.weeklyAvailability).toContainEqual(expect.objectContaining({
    weekStart: '2030-10-07',
    submitted: false
  }));
  expect(snapshot.input.ledger.map(s => s.id)).toEqual(['next', 'prior']);
  expect(snapshot.source.employees.find(e => e.id === 'worker')?.updated_at).toBe('2029-12-31T20:00:00.123456-04:00');
  expect(snapshot.source.schedule_generation_exclusions).toEqual([]);
});
async function heldExecutor(defer: (cleanup: () => void | Promise<unknown>) => void, hold: (s: SqlStatement) => boolean) {
  const client = new Client({
    connectionString: database.connectionString,
    statement_timeout: 5000
  });
  await client.connect();
  defer(() => client.end());
  const pid = Number((await client.query('SELECT pg_backend_pid() pid')).rows[0].pid);
  let release!: () => void,
    reached!: () => void,
    paused = false;
  const released = new Promise<void>(r => {
    release = r;
  });
  const ready = new Promise<void>(r => {
    reached = r;
  });
  defer(() => release());
  const executor: SqlExecutor = {
    query: database.executor.query,
    transaction: async statements => {
      await client.query('BEGIN');
      try {
        const results = [];
        for (const s of statements) {
          results.push((await client.query(s.text, [...s.values])).rows);
          if (!paused && hold(s)) {
            paused = true;
            reached();
            await released;
          }
        }
        await client.query('COMMIT');
        return results;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      }
    }
  };
  return {
    executor,
    pid,
    ready,
    release
  };
}
async function observeBlocked(pid: number) {
  for (let i = 0; i < 100; i++) {
    if ((await q('SELECT cardinality(pg_blocking_pids($1))>0 blocked', [pid]))[0].blocked) return;
  }
  throw Error('Expected actual PostgreSQL blocking barrier');
}
it.each(['profile', 'membership', 'membership-insert', 'normal-availability-insert', 'coverage-cascade', 'availability', 'leave', 'manual-insert', 'manual-edit', 'foreign-week'].flatMap(kind => ['writer-first', 'generation-first'].map(order => ({
  kind,
  order
}))))('serializes $kind / $order with actual pg_blocking_pids barrier', async ({
  kind,
  order
}) => {
  await q("INSERT INTO positions(id,workspace_id,name) VALUES('p','workspace-fuel','Position'); INSERT INTO schedules(id,location_id,week_start,created_by) VALUES('foreign','loc-2','2030-09-30','manager'),('draft','loc-1','2030-10-07','manager')");
  const enablesGeneration = ['membership-insert', 'normal-availability-insert'].includes(kind);
  if (kind === 'membership-insert') await q("INSERT INTO coverage_window_position_requirements VALUES('window','p',1)");
  if (kind === 'normal-availability-insert') await q('DELETE FROM availability_windows');
  if (kind === 'profile') await q("UPDATE employees SET primary_location_id='loc-2' WHERE id='worker'");
  if (kind === 'manual-edit') await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('edit','foreign','worker','2030-10-08','08:00','12:00')");
  const statement: SqlStatement = {
    text: kind === 'membership-insert' ? "INSERT INTO employee_positions VALUES('worker','p')" : kind === 'normal-availability-insert' ? "INSERT INTO availability_windows VALUES('inserted-normal','worker',1,'08:00','12:00')" : kind === 'coverage-cascade' ? "DELETE FROM location_coverage_windows WHERE id='window'" : kind === 'membership' ? "DELETE FROM employee_location_eligibility WHERE employee_id='worker'" : kind === 'availability' ? "INSERT INTO availability_exceptions(id,employee_id,date,kind) VALUES('unavailable','worker','2030-10-07','UNAVAILABLE')" : kind === 'leave' ? "INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status) VALUES('leave','worker','2030-10-07','2030-10-07','APPROVED')" : kind === 'manual-edit' ? "UPDATE shifts SET date='2030-10-07' WHERE id='edit'" : `INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('insert','${kind === 'foreign-week' ? 'foreign' : 'draft'}','worker','2030-10-07','08:00','12:00')`,
    values: []
  };
  let reads = 0;
  await withOwnedTestResources(async defer => {
    const generation = await heldExecutor(defer, s => order === 'generation-first' && s.text.includes('generation_source_conflict'));
    const counted: SqlExecutor = {
      ...generation.executor,
      query: async <T,>(s: SqlStatement) => {
        reads++;
        return generation.executor.query<T>(s);
      }
    };
    const writer = await heldExecutor(defer, s => order === 'writer-first' && (kind === 'profile' ? s.text.includes('FROM employees') && s.text.includes('FOR UPDATE') : true));
    const write = () => kind === 'profile' ? saveEmployeeSchedulingProfile({
      employeeId: 'worker',
      actorEmployeeId: 'manager',
      positionIds: ['p'],
      eligibleLocationIds: ['loc-2']
    }, writer.executor) : writer.executor.transaction([statement]);
    if (order === 'writer-first') {
      const writing = write();
      defer(() => writing);
      await writer.ready;
      const generating = run(request, counted);
      defer(() => generating);
      defer(() => writer.release());
      await observeBlocked(generation.pid);
      writer.release();
      await writing;
      await generating;
      expect(reads).toBe(2);
      expect(await q("SELECT count(*)::integer n FROM shifts WHERE assignment_origin='GENERATED'")).toEqual([{
        n: enablesGeneration ? 1 : 0
      }]);
    } else {
      const generating = run(request, counted);
      defer(() => generating);
      await generation.ready;
      const writing = write();
      defer(() => writing);
      defer(() => generation.release());
      await observeBlocked(writer.pid);
      generation.release();
      expect(await generating).toMatchObject({
        summary: {
          added: enablesGeneration ? 0 : 1
        }
      });
      await writing;
      expect(reads).toBe(1);
    }
  });
});
it('Build preserves GENERATED foreign-owning-week assignments while accounting for their coverage', async () => {
  await run();
  await q("INSERT INTO schedules(id,location_id,week_start,created_by) VALUES('foreign-parent','loc-1','2030-09-30','manager'); UPDATE shifts SET schedule_id='foreign-parent'; DELETE FROM schedules WHERE week_start='2030-10-07'");
  const before = await rows();
  await run();
  expect(await rows()).toEqual(before);
  expect(await q("SELECT count(*)::integer n FROM shifts")).toEqual([{
    n: 1
  }]);
});
it.each(['callout', 'exchange', 'publication'])('Build preserves generated rows referenced by %s without cascading history', async kind => {
  await run();
  const id = String((await source()).shifts[0].id);
  if (kind === 'callout') await q("INSERT INTO shift_callouts(id,shift_id,employee_id,reason_code,status) VALUES('callout',$1,'worker','OTHER','PENDING')", [id]);
  if (kind === 'exchange') await q("INSERT INTO shift_exchanges(id,kind,source_shift_id,requested_by_employee_id,status) VALUES('exchange','COVERAGE',$1,'worker','OPEN')", [id]);
  if (kind === 'publication') await q("INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) VALUES('revision','2030-10-07',1,'PUBLISH','manager'); INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time,is_designated_lead) SELECT 'history','revision',id,schedule_id,'loc-1',employee_id,date,start_time,end_time,is_designated_lead FROM shifts");
  await q("UPDATE location_coverage_windows SET end_time='10:00'");
  const before = await source();
  expect(await run()).toMatchObject({
    changed: false,
    summary: {
      preserved: 1,
      added: 0,
      removed: 0
    }
  });
  expect(await source()).toEqual(before);
});
it('All dynamically attempts configured ready locations and reports exclusions; selected unready creates nothing', async () => {
  const result = await generateWeekDraft({
    ...request,
    locationScope: {
      kind: 'ALL'
    }
  }, database.executor);
  expect(result.locationIds).toEqual(['loc-1']);
  expect(result.excludedLocations).toContainEqual(expect.objectContaining({
    locationId: 'loc-2',
    state: 'NEEDS_SETUP'
  }));
  const before = await source();
  expect(await run({
    ...request,
    locationScope: {
      kind: 'SELECTED',
      locationIds: ['loc-2']
    }
  })).toMatchObject({
    status: 'INVALID',
    changed: false
  });
  expect(await source()).toEqual(before);
  await q("INSERT INTO locations(id,workspace_id,clocker_key,name,short_name) VALUES('new','workspace-fuel','new','New','New'); INSERT INTO location_staffing_settings(location_id,minimum_staff_per_shift,requires_designated_lead) VALUES('new',1,false); INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) VALUES('new-window','new',2,'08:00','12:00'); INSERT INTO employee_location_eligibility VALUES('worker','new'); INSERT INTO availability_windows VALUES('tuesday','worker',2,'08:00','12:00')");
  expect(await generateWeekDraft({
    ...request,
    locationScope: {
      kind: 'ALL'
    }
  }, database.executor)).toMatchObject({
    locationIds: ['loc-1', 'new'],
    summary: {
      added: 1,
      createdSchedules: 1
    }
  });
});
it('preserves non-target parent and shift timestamps when just one draft changes', async () => {
  await run();
  await q("INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) VALUES('second-window','loc-2',2,'08:00','12:00'); INSERT INTO availability_windows VALUES('tuesday','worker',2,'08:00','12:00')");
  const before = await source();
  await generateWeekDraft({
    ...request,
    locationScope: {
      kind: 'ALL'
    }
  }, database.executor);
  const after = await source();
  expect(after.shifts.filter(s => before.shifts.some(b => b.id === s.id))).toEqual(before.shifts);
  expect(after.schedules.filter(s => s.location_id === 'loc-1')).toEqual(before.schedules);
});
it('does not retry unknown commit outcomes or deterministic constraint failures', async () => {
  for (const committed of [false, true]) {
    let reads = 0,
      attempts = 0;
    const broken: SqlExecutor = {
      query: async <T,>(s: SqlStatement) => {
        reads++;
        return database.executor.query<T>(s);
      },
      transaction: async s => {
        attempts++;
        if (committed) await database.executor.transaction(s);
        throw Object.assign(new Error('unknown transport outcome'), {
          code: 'ECONNRESET'
        });
      }
    };
    await expect(run(request, broken)).rejects.toThrow('unknown transport outcome');
    expect(reads).toBe(1);
    expect(attempts).toBe(1);
  }
  expect(await rows()).toHaveLength(1);
});
it('after-state proof detects persisted provenance corruption and rolls back', async () => {
  let attempts = 0;
  const corrupt: SqlExecutor = {
    query: database.executor.query,
    transaction: s => {
      attempts++;
      const all = [...s];
      all.splice(-1, 0, {
        text: "UPDATE shifts SET assignment_origin='MANAGER',generated_claims=NULL",
        values: []
      });
      return database.executor.transaction(all);
    }
  };
  await expect(run(request, corrupt)).rejects.toBeInstanceOf(GenerationConflictError);
  expect(attempts).toBe(3);
  expect(await rows()).toEqual([]);
  expect(await schedules()).toEqual([]);
});
it('returns safe dated gaps with staffing/position/Lead shortage and missing-submission warnings', async () => {
  await q("INSERT INTO employee_scheduling_settings(employee_id,maximum_weekly_hours) VALUES('worker',0); INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status,reason) VALUES('private','worker','2030-10-07','2030-10-07','APPROVED','private medical reason')");
  const result = await run();
  expect(result.gaps).toEqual([{
    locationId: 'loc-1',
    date: '2030-10-07',
    startTime: '08:00',
    endTime: '12:00',
    missingStaff: 1,
    missingLead: false,
    positions: []
  }]);
  expect(JSON.stringify(result)).not.toMatch(/private medical reason|phone|reason|employeeIds|claims/);
  await q("DELETE FROM time_off_requests; UPDATE employee_scheduling_settings SET maximum_weekly_hours=40");
  expect((await run()).warnings).toContainEqual(expect.objectContaining({
    code: 'AVAILABILITY_NOT_SUBMITTED'
  }));
});
it('late replacement failure restores existing generated rows and draft timestamps exactly', async () => {
  await run();
  await q("UPDATE location_coverage_windows SET end_time='10:00'");
  const before = await source();
  const broken: SqlExecutor = {
    query: database.executor.query,
    transaction: s => database.executor.transaction([...s, {
      text: "SELECT 'late_replacement'::integer",
      values: []
    }])
  };
  await expect(run(request, broken)).rejects.toThrow('late_replacement');
  expect(await source()).toEqual(before);
});
it('snapshot maps real position/Lead, weekly submission, maximum and approved callout facts', async () => {
  await q("UPDATE employees SET role='LEAD' WHERE id='worker'; INSERT INTO positions(id,workspace_id,name) VALUES('p','workspace-fuel','Position'); INSERT INTO employee_positions VALUES('worker','p'); INSERT INTO coverage_window_position_requirements VALUES('window','p',1); UPDATE location_staffing_settings SET requires_designated_lead=true; INSERT INTO employee_scheduling_settings(employee_id,target_weekly_hours,maximum_weekly_hours) VALUES('worker',2,4); INSERT INTO weekly_availability_submissions(employee_id,week_start,uses_normal_availability) VALUES('worker','2030-10-07',true)");
  expect(await run()).toMatchObject({
    status: 'COMPLETE',
    summary: {
      added: 1
    }
  });
  expect(await q('SELECT position_id,is_designated_lead FROM shifts')).toEqual([{
    position_id: 'p',
    is_designated_lead: true
  }]);
  const id = String((await source()).shifts[0].id);
  await q("INSERT INTO shift_callouts(id,shift_id,employee_id,reason_code,status) VALUES('approved',$1,'worker','OTHER','APPROVED')", [id]);
  await bindFixtureCallout(database.executor,'approved');
  let reads = 0;
  const counted: SqlExecutor = {
    query: async <T,>(s: SqlStatement) => {
      reads++;
      return database.executor.query<T>(s);
    },
    transaction: database.executor.transaction
  };
  const snapshot = await readGenerationSnapshot(request, counted);
  expect(reads).toBe(1);
  expect(snapshot.input.ledger[0]).toMatchObject({
    isCalloutApproved: true,
    hasCalloutHistory: true
  });
  expect(snapshot.input.employees.find(e => e.id === 'worker')).toMatchObject({
    positionIds: ['p'],
    maximumWeeklyHours: 4,
    targetWeeklyHours: 2
  });
  expect(snapshot.input.employees.find(e => e.id === 'worker')?.weeklyAvailability).toContainEqual(expect.objectContaining({
    weekStart: '2030-10-07',
    submitted: true,
    usesNormalAvailability: true
  }));
});
it('allocates deterministic fresh IDs when protected callout history retains the original generated ID', async () => {
  await run();
  const original = (await rows())[0],
    id = String((await source()).shifts[0].id);
  await q("INSERT INTO shift_callouts(id,shift_id,employee_id,reason_code,status) VALUES('approved',$1,'worker','OTHER','APPROVED')", [id]);
  await bindFixtureCallout(database.executor,'approved');
  expect(await generateWeekDraft({
    ...request,
    mode: 'FILL_GAPS_ONLY'
  }, database.executor)).toMatchObject({
    status: 'COMPLETE',
    summary: {
      added: 1,
      removed: 0
    }
  });
  expect(await rows()).toHaveLength(2);
  expect(await rows()).toContainEqual(original);
  const before = await source();
  expect(await run()).toMatchObject({
    changed: false
  });
  expect(await source()).toEqual(before);
});
it('preserves a foreign owning parent even when its existing ID equals the new target deterministic base ID', async () => {
  await run();
  await q("UPDATE schedules SET week_start='2030-09-30'");
  const before = await source();
  expect(await run()).toMatchObject({
    summary: {
      added: 0,
      createdSchedules: 1
    }
  });
  const after = await source();
  expect(after.shifts).toEqual(before.shifts);
  expect(after.schedules.find(s => s.id === before.schedules[0].id)).toEqual(before.schedules[0]);
  expect(await run()).toMatchObject({
    changed: false
  });
});


// Task 6: missing authoritative inputs, reusing the same real lock barrier.
const remainingWriters = [
  { kind: 'employee-deactivation', sql: "UPDATE employees SET active=false WHERE id='worker'", added: 0 },
  { kind: 'lead-role', sql: "UPDATE employees SET role='EMPLOYEE' WHERE id='worker'", added: 1 },
  { kind: 'location-deactivation', sql: "UPDATE locations SET active=false WHERE id='loc-1'", added: 0 },
  { kind: 'position-deactivation', sql: "UPDATE positions SET active=false WHERE id='p'", added: 0 },
  { kind: 'position-membership-removal', sql: "DELETE FROM employee_positions WHERE employee_id='worker'", added: 0 },
  { kind: 'readiness-removal', sql: "DELETE FROM location_staffing_settings WHERE location_id='loc-1'", added: 0 },
  { kind: 'readiness-insert', sql: "INSERT INTO location_staffing_settings(location_id,minimum_staff_per_shift,requires_designated_lead) VALUES('loc-1',1,false)", added: 1 },
  { kind: 'coverage-insert', sql: "INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) VALUES('inserted-window','loc-1',1,'08:00','12:00')", added: 1 },
  { kind: 'workspace-zone', sql: "UPDATE workspaces SET time_zone='America/New_York'", added: 1 },
  { kind: 'maximum-insert', sql: "INSERT INTO employee_scheduling_settings(employee_id,maximum_weekly_hours) VALUES('worker',0)", added: 0 },
  { kind: 'maximum-change', sql: "UPDATE employee_scheduling_settings SET maximum_weekly_hours=0 WHERE employee_id='worker'", added: 0 },
  { kind: 'coverage-change', sql: "UPDATE location_coverage_windows SET end_time='10:00'", added: 1 },
  { kind: 'quota-insert', sql: "INSERT INTO coverage_window_position_requirements VALUES('window','p',2)", added: 1 },
];
it.each(remainingWriters.flatMap(item => ['writer-first', 'generation-first'].map(order => ({...item, order}))))(
  'rechecks $kind / $order at the actual PostgreSQL lock boundary', async ({kind, sql, added, order}) => {
    await q("INSERT INTO positions(id,workspace_id,name) VALUES('p','workspace-fuel','Position'); INSERT INTO employee_positions VALUES('worker','p')");
    if (kind === 'lead-role') await q("UPDATE employees SET role='LEAD' WHERE id='worker'; UPDATE location_staffing_settings SET requires_designated_lead=true WHERE location_id='loc-1'");
    if (kind.startsWith('position-')) await q("INSERT INTO coverage_window_position_requirements VALUES('window','p',1)");
    if (kind === 'readiness-insert') await q("DELETE FROM location_staffing_settings WHERE location_id='loc-1'");
    if (kind === 'coverage-insert') await q('DELETE FROM location_coverage_windows');
    if (kind === 'maximum-change') await q("INSERT INTO employee_scheduling_settings(employee_id,maximum_weekly_hours) VALUES('worker',40)");
    let reads = 0;
    const solving = vi.spyOn(planner, 'planWeek');
    await withOwnedTestResources(async defer => {
      const generation = await heldExecutor(defer, s => order === 'generation-first' && s.text.includes('generation_source_conflict'));
      const counted: SqlExecutor = {...generation.executor, query: async <T,>(s: SqlStatement) => {
        reads++; return generation.executor.query<T>(s);
      }};
      const writer = await heldExecutor(defer, () => order === 'writer-first');
      if (order === 'writer-first') {
        const writing = writer.executor.transaction([{text: sql, values: []}]); defer(() => writing);
        await writer.ready;
        const generating = run(request, counted); defer(() => generating); defer(() => writer.release());
        await observeBlocked(generation.pid); writer.release(); await writing;
        const result = await generating;
        if (['lead-role','position-membership-removal','quota-insert'].includes(kind)) expect(result.status).toBe('PARTIAL');
        expect(reads).toBe(2);
        expect(solving).toHaveBeenCalledTimes(2);
        expect(await q("SELECT count(*)::integer n FROM shifts WHERE assignment_origin='GENERATED'")).toEqual([{n: added}]);
        if (kind === 'coverage-change') expect(await q('SELECT end_time::text FROM shifts')).toEqual([{end_time:'10:00:00'}]);
        if (kind === 'lead-role') expect(await q('SELECT is_designated_lead FROM shifts')).toEqual([{is_designated_lead:false}]);
      } else {
        const generating = run(request, counted); defer(() => generating); await generation.ready;
        const writing = writer.executor.transaction([{text: sql, values: []}]); defer(() => writing); defer(() => generation.release());
        await observeBlocked(writer.pid); generation.release();
        expect(await generating).toMatchObject({summary:{added:['readiness-insert','coverage-insert'].includes(kind)?0:1}}); await writing;
        expect(reads).toBe(1); expect(solving).toHaveBeenCalledTimes(1);
      }
    });
    // Readiness removal is fixture state, restore it for the next existing test.
    await q("INSERT INTO location_staffing_settings(location_id,minimum_staff_per_shift,requires_designated_lead) VALUES('loc-1',1,false) ON CONFLICT DO NOTHING");
  });

it.each(['time', 'location', 'position', 'future-week'])('an exclusion does not reserve unrelated material %s demand', async kind => {
  if (kind === 'position') await q("INSERT INTO positions(id,workspace_id,name) VALUES('p','workspace-fuel','Old position'),('new-p','workspace-fuel','New position'); INSERT INTO employee_positions VALUES('worker','p'),('worker','new-p'); INSERT INTO coverage_window_position_requirements VALUES('window','p',1)");
  await run();
  const id = String((await source()).shifts[0].id);
  await deleteGeneratedDraftShift({...request, locationId:'loc-1', shiftId:id}, database.executor);
  expect(await run()).toMatchObject({status:'PARTIAL',summary:{added:0}});
  let changedRequest = request;
  if (kind === 'time') await q("UPDATE location_coverage_windows SET start_time='09:00',end_time='11:00'");
  if (kind === 'location') {
    await q("UPDATE location_coverage_windows SET location_id='loc-2'");
    changedRequest = {...request,locationScope:{kind:'SELECTED',locationIds:['loc-2']}};
  }
  if (kind === 'position') await q("UPDATE coverage_window_position_requirements SET position_id='new-p'");
  if (kind === 'future-week') changedRequest = {...request,weekStart:'2030-10-14'};
  expect(await run(changedRequest)).toMatchObject({status:'COMPLETE',summary:{added:1}});
  expect(await q('SELECT count(*)::integer n FROM schedule_generation_exclusions WHERE cleared_at IS NULL')).toEqual([{n:1}]);
});

it('renaming and splitting windows cannot bypass a reservation but a real manual assignment can cover it', async () => {
  await run(); const id = String((await source()).shifts[0].id);
  await deleteGeneratedDraftShift({...request,locationId:'loc-1',shiftId:id}, database.executor);
  await q("UPDATE locations SET name='Renamed location' WHERE id='loc-1'; UPDATE location_coverage_windows SET end_time='10:00'; INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) VALUES('split','loc-1',1,'10:00','12:00'); INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('different','Other','Worker','NONE','EMPLOYEE','loc-1'); INSERT INTO employee_location_eligibility VALUES('different','loc-1'); INSERT INTO availability_windows VALUES('different','different',1,'08:00','12:00')");
  expect(await run()).toMatchObject({status:'PARTIAL',summary:{added:0}});
  const { insertShift } = await import('./management-api');
  const parent = String((await source()).schedules[0].id);
  await insertShift({scheduleId:parent,employeeId:'different',date:request.weekStart,startTime:'08:00',endTime:'12:00',actorEmployeeId:'manager'}, database.executor);
  expect(await run()).toMatchObject({status:'COMPLETE',summary:{added:0,preserved:1}});
  expect(await q("SELECT assignment_origin FROM shifts")).toEqual([{assignment_origin:'MANAGER'}]);
});

// Final I1: excluded parents/history remain in the guarded source; published work
// remains a cross-location commitment, while archived work is not active work.
it.each(['INACTIVE','NEEDS_SETUP'].flatMap(state=>['PUBLISHED','ARCHIVED'].flatMap(status=>['overlap','hours'].map(rule=>({state,status,rule})))))('All skips excluded $state/$status without erasing its history or $rule ledger rule',async({state,status,rule})=>{
 // Earlier insertion-race fixture creates this third location; isolate the two-location case.
 await q("DELETE FROM locations WHERE id='new'");
 await manual('excluded-history','loc-2','2030-10-07',rule==='overlap'?'2030-10-07':'2030-10-08','08:00','12:00');
 await q("UPDATE schedules SET status=$1,published_at='2030-10-01' WHERE location_id='loc-2'",[status]);
 await q("INSERT INTO shift_callouts(id,shift_id,employee_id,reason_code,status) VALUES('retained-callout','excluded-history','worker','OTHER','DENIED')");
 await q("INSERT INTO shift_exchanges(id,kind,source_shift_id,requested_by_employee_id,status) VALUES('retained-exchange','COVERAGE','excluded-history','worker','DENIED'); INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,affected_location_id,created_by) VALUES('retained-revision','2030-10-07',1,'PUBLISH','loc-2','manager'); INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time,notes) SELECT 'retained-capture','retained-revision',id,schedule_id,'loc-2',employee_id,date,start_time,end_time,notes FROM shifts WHERE id='excluded-history'");
 if(state==='INACTIVE') await q("UPDATE locations SET active=false WHERE id='loc-2'");
 else await q("DELETE FROM location_staffing_settings WHERE location_id='loc-2'");
 if(rule==='hours')await q("INSERT INTO employee_scheduling_settings(employee_id,maximum_weekly_hours) VALUES('worker',4)");
 const before=await source();
 const all={...request,locationScope:{kind:'ALL' as const}};
 const snapshot=await readGenerationSnapshot(all,database.executor);
 expect(snapshot.source).toEqual(before);
 expect(snapshot.input.schedules.find(s=>s.locationId==='loc-2')?.status).toBe(status);
 expect(snapshot.input.ledger.some(s=>s.id==='excluded-history')).toBe(status==='PUBLISHED');
 const result=await generateWeekDraft(all,database.executor);
 expect(result).toMatchObject({status:status==='PUBLISHED'?'PARTIAL':'COMPLETE',locationIds:['loc-1'],summary:{added:status==='PUBLISHED'?0:1,removed:0},excludedLocations:[expect.objectContaining({locationId:'loc-2',state})]});
 const after=await source();
 expect(after.schedules.filter(s=>s.location_id==='loc-2')).toEqual(before.schedules);
 expect(after.shifts.filter(s=>s.id==='excluded-history')).toEqual(before.shifts);
 for(const table of ['shift_callouts','shift_exchanges','schedule_publication_revisions','schedule_publication_revision_shifts'] as const){expect(before[table]).toHaveLength(1);expect(after[table]).toEqual(before[table]);}
 const selectedBefore=await source();
 expect(await generateWeekDraft({...request,locationScope:{kind:'SELECTED',locationIds:['loc-2']}},database.executor)).toMatchObject({status:'INVALID',changed:false,summary:{added:0,removed:0}});
 expect(await source()).toEqual(selectedBefore);
 await q("INSERT INTO location_staffing_settings(location_id,minimum_staff_per_shift,requires_designated_lead) VALUES('loc-2',1,false) ON CONFLICT DO NOTHING");
});
