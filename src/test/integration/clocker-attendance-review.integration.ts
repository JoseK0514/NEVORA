import {Client} from 'pg';
import {afterEach,beforeEach,describe,expect,it} from 'vitest';
import {createPunchFixture} from './clocker-punch-fixture';
import {readAttendanceReview} from '../../lib/data/attendance-review.server';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import type {SqlExecutor} from '../../lib/notifications/types';

let f:Awaited<ReturnType<typeof createPunchFixture>>;
let owner:SessionMutationProof;

beforeEach(async()=>{
  f=await createPunchFixture({breaks:true});
  owner={
    sessionTokenHash:f.owner.sessionTokenHash,
    employee:{
      id:f.owner.employeeId,
      firstName:'Owner',
      lastName:'QA',
      role:'OWNER',
      primaryLocationId:'loc-1',
    },
  };
});

afterEach(async()=>{
  if(f) await f.db.dispose();
});

const read=()=>readAttendanceReview(owner,f.db.executor);

async function localClockIn(offsetMicroseconds=123457){
  const [row]=await f.q<{
    local_date:string;
    clock_in_at:string;
    shift_start_at:string;
    shift_end_at:string;
    window_start_at:string;
    window_end_at:string;
  }>(`
    WITH o AS (SELECT clock_timestamp() AS at),
    d AS (
      SELECT (at AT TIME ZONE 'America/Puerto_Rico')::date AS local_date,
             ((at AT TIME ZONE 'America/Puerto_Rico')::date::timestamp
                AT TIME ZONE 'America/Puerto_Rico') AS start
      FROM o
    )
    SELECT local_date::text,
           (start + ($1::text || ' microseconds')::interval)::text AS clock_in_at,
           (start + interval '123456 microseconds')::text AS shift_start_at,
           (start + interval '23 hours 59 minutes 59.654321 seconds')::text AS shift_end_at,
           (start - interval '1 minute')::text AS window_start_at,
           (start + interval '1 day')::text AS window_end_at
    FROM d
  `,[String(offsetMicroseconds)]);
  return row;
}

async function insertMatchedOpenEntry(){
  const timing=await localClockIn();
  await f.q(`
    INSERT INTO schedule_publication_revisions
      (id,week_start,revision_number,source_type,created_by)
    VALUES
      ('d12-rev-1',date_trunc('week',$1::date)::date,1,'PUBLISH','c34-owner'),
      ('d12-rev-2',date_trunc('week',$1::date)::date,2,'PUBLISH','c34-owner')
  `,[timing.local_date]);
  await f.q(`
    INSERT INTO schedule_publication_revision_shifts
      (id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time,is_callout_approved)
    VALUES
      ('d12-published-1','d12-rev-1','d12-source-1','d12-schedule-1','loc-1','c34-a',$1,'00:00:00.123456','23:59:59.654321',false),
      ('d12-published-new','d12-rev-2','d12-source-new','d12-schedule-new','loc-1','c34-a',$1,'12:00:00','13:00:00',false)
  `,[timing.local_date]);
  const capture={
    version:1,
    employeeId:'c34-a',
    locationId:'loc-1',
    workspaceId:'workspace-fuel',
    timeZone:'America/Puerto_Rico',
    windowStartAt:timing.window_start_at,
    windowEndAt:timing.window_end_at,
    reviewedRevisionIds:['d12-rev-1'],
    candidates:[{
      revisionId:'d12-rev-1',
      revisionNumber:1,
      publishedShiftId:'d12-published-1',
      sourceShiftId:'d12-source-1',
      scheduleId:'d12-schedule-1',
      positionId:null,
      positionName:null,
      startAt:timing.shift_start_at,
      endAt:timing.shift_end_at,
      uncertain:false,
    }],
  };
  await f.db.executor.transaction([
    {
      text:"SELECT set_config('nevora.clocker_schedule_capture',$1,true)",
      values:[JSON.stringify(capture)],
    },
    {
      text:`INSERT INTO time_entries
        (id,employee_id,location_id,device_id,clock_in_at,status)
        VALUES ('d12-entry','c34-a','loc-1',$1,$2::timestamptz,'CLOCKED_IN')`,
      values:[f.devices[0].device.id,timing.clock_in_at],
    },
  ]);
  return timing;
}

describe('D1.2 authorized recorded-time reader',()=>{
  it('returns a truthful complete empty projection only after an authorized read',async()=>{
    const result=await read();
    expect(result).toMatchObject({
      state:'ready',
      engineVersion:1,
      workspaceId:'workspace-fuel',
      timeZone:'America/Puerto_Rico',
      validForMs:45000,
      groups:[],
      recordCount:0,
      signalCount:0,
      affectedEmployeeCount:0,
      coverage:{state:'complete'},
    });
  });

  it('reads only the saved historical reference and preserves scheduled microseconds',async()=>{
    await insertMatchedOpenEntry();
    const result=await read();
    expect(result.state).toBe('ready');
    if(result.state!=='ready') return;
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]).toMatchObject({
      entryId:'d12-entry',
      employeeId:'c34-a',
      locationId:'loc-1',
      observations:[{
        kind:'CLOCK_IN_AFTER_SCHEDULE_START',
        evidence:{differenceNanoseconds:'1000'},
      }],
    });
    const evidence=result.groups[0].observations[0].evidence;
    expect(evidence.expectedAt).toContain('.123456');
    expect(JSON.stringify(result)).not.toMatch(/d12-rev-2|d12-published-new|12:00:00/);
  });

  it('includes an older supporting overlap so an open entry cannot look trustworthy by filtering history',async()=>{
    await f.q(`
      INSERT INTO time_entries
        (id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status)
      VALUES
        ('d12-open-old','c34-a','loc-1',$1,clock_timestamp()-interval '3 days',NULL,'CLOCKED_IN')
    `,[f.devices[0].device.id]);
    await f.q('DROP INDEX time_entries_one_open_per_employee');
    await f.q(`
      INSERT INTO time_entries
        (id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status)
      VALUES
        ('d12-support','c34-a','loc-2',$1,clock_timestamp()-interval '2 days 23 hours',
         clock_timestamp()-interval '2 days 22 hours','CLOCKED_OUT')
    `,[f.devices[2].device.id]);
    const result=await read();
    expect(result).toMatchObject({
      state:'ready',
      groups:[{
        entryId:'d12-open-old',
        observations:[{kind:'TIME_HISTORY_INCONSISTENT'}],
      }],
    });
  });

  it.each(['OWNER','MANAGER'] as const)('allows current %s authority',async role=>{
    await f.q('UPDATE employees SET role=$1 WHERE id=$2',[role,owner.employee.id]);
    expect(await read()).toMatchObject({state:'ready'});
  });

  it.each(['EMPLOYEE','LEAD','inactive','expired','revoked','wrong-token','wrong-actor'] as const)(
    'denies current %s authority despite an earlier proof',
    async kind=>{
      if(kind==='EMPLOYEE'||kind==='LEAD') await f.q('UPDATE employees SET role=$1 WHERE id=$2',[kind,owner.employee.id]);
      if(kind==='inactive') await f.q('UPDATE employees SET active=false WHERE id=$1',[owner.employee.id]);
      if(kind==='expired') await f.q("UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second'");
      if(kind==='revoked') await f.q('DELETE FROM employee_sessions');
      if(kind==='wrong-token') owner.sessionTokenHash='b'.repeat(64);
      if(kind==='wrong-actor') owner.employee.id='c34-b';
      expect(await read()).toEqual({state:'unavailable',reason:'access_denied'});
    },
  );

  it('caps response lifetime by the remaining authenticated session age',async()=>{
    await f.q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '20 seconds' WHERE token_hash=$1",[owner.sessionTokenHash]);
    const result=await read();
    expect(result.state).toBe('ready');
    if(result.state!=='ready') return;
    expect(result.validForMs).toBeGreaterThan(0);
    expect(result.validForMs).toBeLessThanOrEqual(20000);
    expect(result.validForMs).toBeLessThan(45000);
  });

  it('returns source_limit rather than truncating a 501-entry in-scope source',async()=>{
    await f.q(`
      WITH o AS (SELECT clock_timestamp() AS at),
      d AS (
        SELECT ((at AT TIME ZONE 'America/Puerto_Rico')::date::timestamp
          AT TIME ZONE 'America/Puerto_Rico') AS start FROM o
      )
      INSERT INTO time_entries
        (id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status)
      SELECT 'd12-cap-entry-'||n,'c34-a','loc-1',$1,
             d.start+n*interval '1 second',
             d.start+n*interval '1 second'+interval '0.5 seconds',
             'CLOCKED_OUT'
      FROM d CROSS JOIN generate_series(1,501) n
    `,[f.devices[0].device.id]);
    const result=await read();
    expect(result).toEqual({state:'unavailable',reason:'source_limit'});
    expect(JSON.stringify(result)).not.toContain('d12-cap-entry');
  });

  it('returns source_limit rather than truncating more than 5000 related breaks',async()=>{
    const timing=await localClockIn(0);
    await f.q(`
      INSERT INTO time_entries
        (id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status)
      VALUES ('d12-break-cap','c34-a','loc-1',$1,$2::timestamptz,
              $2::timestamptz+interval '2 hours','CLOCKED_OUT')
    `,[f.devices[0].device.id,timing.clock_in_at]);
    await f.q(`
      INSERT INTO break_entries(id,time_entry_id,break_start_at,break_end_at)
      SELECT 'd12-cap-break-'||n,'d12-break-cap',
             $1::timestamptz+interval '1 minute',
             $1::timestamptz+interval '2 minutes'
      FROM generate_series(1,5001) n
    `,[timing.clock_in_at]);
    const result=await read();
    expect(result).toEqual({state:'unavailable',reason:'source_limit'});
    expect(JSON.stringify(result)).not.toContain('d12-cap-break');
  });

  it('missing schema and broken transport never become a healthy zero',async()=>{
    await f.q('ALTER TABLE time_entries RENAME COLUMN schedule_context TO unavailable_context');
    expect(await read()).toEqual({state:'unavailable',reason:'schema_missing'});
    const executor:SqlExecutor={
      query:async()=>{throw Error('postgres://secret endpoint');},
      transaction:async()=>{throw Error('secret token');},
    };
    expect(await readAttendanceReview(owner,executor)).toEqual({state:'unavailable',reason:'read_failed'});
  });

  it.each([true,false])('revalidates authority after the actual source SELECT wait, expire=%s',async expire=>{
    const blocker=new Client({connectionString:f.db.connectionString,statement_timeout:8000});
    const worker=new Client({connectionString:f.db.connectionString,statement_timeout:8000});
    await blocker.connect();
    await worker.connect();
    let pending:Promise<unknown>|undefined;
    const executor:SqlExecutor={
      query:f.db.executor.query,
      transaction:async statements=>{
        await worker.query('BEGIN');
        try{
          const rows:unknown[][]=[];
          for(const statement of statements){
            rows.push((await worker.query(statement.text,[...statement.values])).rows);
          }
          await worker.query('COMMIT');
          return rows;
        }catch(error){
          await worker.query('ROLLBACK');
          throw error;
        }
      },
    };
    try{
      if(expire){
        await f.q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '1.5 seconds' WHERE token_hash=$1",[owner.sessionTokenHash]);
      }
      await blocker.query('BEGIN');
      await blocker.query('LOCK TABLE time_entries IN ACCESS EXCLUSIVE MODE');
      const pid=(await worker.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
      pending=readAttendanceReview(owner,executor);
      let waited=false;
      for(let n=0;n<250;n++){
        const [row]=await f.q<{waiting:boolean;query:string}>(`
          SELECT cardinality(pg_blocking_pids(pid))>0 AS waiting,query
          FROM pg_stat_activity WHERE pid=$1
        `,[pid]);
        if(row?.waiting&&row.query.startsWith('WITH observed AS MATERIALIZED')){
          waited=true;
          break;
        }
        await new Promise(resolve=>setTimeout(resolve,10));
      }
      expect(waited).toBe(true);
      if(expire){
        await f.q(`
          SELECT pg_sleep(
            GREATEST(0,extract(epoch FROM expires_at-clock_timestamp()))::double precision+0.05
          ) FROM employee_sessions WHERE token_hash=$1
        `,[owner.sessionTokenHash]);
      }
      await blocker.query('ROLLBACK');
      expect(await pending).toMatchObject(
        expire
          ? {state:'unavailable',reason:'access_denied'}
          : {state:'ready',groups:[]},
      );
    }finally{
      await blocker.query('ROLLBACK').catch(()=>{});
      await pending;
      await worker.end();
      await blocker.end();
    }
  });
});
