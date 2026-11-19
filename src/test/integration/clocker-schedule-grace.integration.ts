// Owner early clock-in grace, end to end on owned loopback PostgreSQL with fictional people only: the Owner-only writer,
// the punch reading the persisted grace on the server, fail-closed reads, stale-grace fencing and immutable history.
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, expect, it } from '@rstest/core';
import { createPunchFixture } from './clocker-punch-fixture';
import { ClockerPunchService } from '../../lib/clocker/punches.server';
import { readClockerScheduleGrace, saveClockerScheduleGrace } from '../../lib/clocker/schedule-grace.server';
import type { ClockerIdentityProof } from '../../lib/clocker/pin-identity.server';
import type { PunchCommand } from '../../lib/clocker/punch-types';
import type { SqlExecutor } from '../../lib/notifications/types';

let f: Awaited<ReturnType<typeof createPunchFixture>>, service: ClockerPunchService, proof: ClockerIdentityProof;
const owner = { employeeId: 'c34-owner', sessionTokenHash: 'a'.repeat(64) };
beforeEach(async () => {
 f = await createPunchFixture({ breaks: true });
 service = new ClockerPunchService(f.key, f.db.executor); proof = (await f.identity()).proof;
});
afterEach(async () => { if (f) await f.db.dispose(); });

/** A published shift for c34-a at loc-1 that starts `minutes` after the database's current Puerto Rico time. */
async function upcomingShift(minutes: number) {
 const [shift] = await f.q<{ date: string; start: string; end: string; week: string; startAt: string }>(`SELECT t::date::text AS date,
  to_char(t,'HH24:MI:SS') AS start,to_char(t+interval '2 hours','HH24:MI:SS') AS end,date_trunc('week',t)::date::text AS week,
  (t AT TIME ZONE 'America/Puerto_Rico')::text AS "startAt"
  FROM (SELECT date_trunc('second',clock_timestamp() AT TIME ZONE 'America/Puerto_Rico')+make_interval(mins=>$1::integer) AS t) x`, [minutes]);
 await f.q("INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) VALUES('grace-revision',$1,1,'PUBLISH','c34-owner')", [shift.week]);
 await f.q(`INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time,position_id,position_name,is_callout_approved)
  VALUES('grace-revision:0','grace-revision','grace-source','published-schedule','loc-1','c34-a',$1,$2,$3,NULL,NULL,false)`, [shift.date, shift.start, shift.end]);
 return shift;
}
async function command(): Promise<PunchCommand> {
 const v = await service.read(proof), s = v.snapshot;
 return { commandId: randomUUID(), action: 'CLOCK_IN', verificationId: v.verificationId, expected: { revision: s.revision, timeEntryId: s.entry?.id ?? null,
  timeEntryVersion: s.entry?.version ?? null, breakEntryId: s.break?.id ?? null, breakEntryVersion: s.break?.version ?? null } };
}
const captured = async () => (await f.q<{ context: Record<string, unknown> | null; early: boolean }>(
 "SELECT schedule_context AS context,clock_in_at<$1::timestamptz AS early FROM time_entries WHERE employee_id='c34-a' ORDER BY clock_in_at DESC LIMIT 1",
 [shiftStart]))[0];
let shiftStart = '';

it('saves the grace for an Owner only, versioned and audited with the actor', async () => {
 expect(await readClockerScheduleGrace(owner, f.db.executor)).toEqual({ earlyClockInGraceMinutes: 0, version: 0 });
 expect(await saveClockerScheduleGrace(owner, { earlyClockInGraceMinutes: 10, expectedVersion: 0 }, f.db.executor)).toEqual({ earlyClockInGraceMinutes: 10, version: 1 });
 await expect(saveClockerScheduleGrace(owner, { earlyClockInGraceMinutes: 5, expectedVersion: 0 }, f.db.executor)).rejects.toMatchObject({ code: 'STALE' });
 // An Employee with a real current session is refused by the writer's session guard and by the schema.
 await f.q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('b',64),'c34-a',now()+interval '1 day')");
 await expect(saveClockerScheduleGrace({ employeeId: 'c34-a', sessionTokenHash: 'b'.repeat(64) }, { earlyClockInGraceMinutes: 30, expectedVersion: 1 }, f.db.executor))
  .rejects.toMatchObject({ code: 'FORBIDDEN' });
 // An expired Owner session is refused too.
 await f.q("UPDATE employee_sessions SET expires_at=now()-interval '1 minute' WHERE employee_id='c34-owner'");
 await expect(saveClockerScheduleGrace(owner, { earlyClockInGraceMinutes: 30, expectedVersion: 1 }, f.db.executor)).rejects.toMatchObject({ code: 'FORBIDDEN' });
 expect(await f.q('SELECT version,actor_employee_id AS actor,previous_grace_minutes AS previous,early_clock_in_grace_minutes AS minutes FROM clocker_schedule_match_policy_revisions'))
  .toEqual([{ version: 1, actor: 'c34-owner', previous: 0, minutes: 10 }]);
});

it('without a saved grace an early punch stays UNMATCHED, exactly as before', async () => {
 shiftStart = (await upcomingShift(5)).startAt;
 const r = await service.execute(proof, await command());
 const row = await captured();
 expect(row.early).toBe(true);
 expect(row.context).toEqual({ version: 1, status: 'UNMATCHED', timeZone: 'America/Puerto_Rico', capturedAt: r.performedAt, candidateCount: 0,
  reviewedRevisionIds: expect.arrayContaining(['grace-revision']), reason: 'NO_MATCH', match: null });
});

it('associates a punch inside the grace window with the shift, keeps the actual time, and never rematches history', async () => {
 await saveClockerScheduleGrace(owner, { earlyClockInGraceMinutes: 10, expectedVersion: 0 }, f.db.executor);
 shiftStart = (await upcomingShift(5)).startAt;
 const c = await command(), r = await service.execute(proof, c);
 const row = await captured(), original = row.context;
 expect(row.early).toBe(true);
 expect(original).toMatchObject({ version: 1, status: 'MATCHED', capturedAt: r.performedAt, candidateCount: 1, reason: null, earlyGraceMinutes: 10,
  match: { revisionId: 'grace-revision', publishedShiftId: 'grace-revision:0', sourceShiftId: 'grace-source' } });
 expect(await f.q("SELECT clock_in_at=$1::timestamptz AS actual FROM time_entries WHERE employee_id='c34-a'", [r.performedAt])).toEqual([{ actual: true }]);
 expect(JSON.stringify(r)).not.toMatch(/earlyGrace|grace-revision/);
 // A later change to the setting never alters the captured evidence or a replayed receipt.
 await saveClockerScheduleGrace(owner, { earlyClockInGraceMinutes: 0, expectedVersion: 1 }, f.db.executor);
 expect((await captured()).context).toEqual(original);
 expect(await service.execute(proof, c)).toEqual(r); expect(await service.receipt(proof, c.commandId)).toEqual(r);
 expect((await captured()).context).toEqual(original);
});

it('fails closed to strict matching, never a blocked punch, when the setting cannot be read', async () => {
 await saveClockerScheduleGrace(owner, { earlyClockInGraceMinutes: 10, expectedVersion: 0 }, f.db.executor);
 shiftStart = (await upcomingShift(5)).startAt;
 const unreadable: SqlExecutor = { transaction: f.db.executor.transaction, query: async (statement, signal) => {
  if (statement.text.includes('FROM clocker_schedule_match_policy')) throw Error('Fictional read failure');
  return f.db.executor.query(statement, signal);
 } };
 const r = await new ClockerPunchService(f.key, unreadable).execute(proof, await command());
 const row = await captured();
 expect(row.context).toMatchObject({ status: 'UNMATCHED', reason: 'NO_MATCH', capturedAt: r.performedAt });
 expect(row.context).not.toHaveProperty('earlyGraceMinutes');
});

it('a database without the setting table punches with strict matching', async () => {
 shiftStart = (await upcomingShift(5)).startAt;
 await f.q('ALTER TABLE clocker_schedule_match_policy RENAME TO c6_hidden_grace_policy');
 const r = await service.execute(proof, await command());
 expect((await captured()).context).toMatchObject({ status: 'UNMATCHED', capturedAt: r.performedAt });
});

it('a grace changed after the server read rejects the stale capture; a same-ID retry uses the saved value', async () => {
 await saveClockerScheduleGrace(owner, { earlyClockInGraceMinutes: 10, expectedVersion: 0 }, f.db.executor);
 shiftStart = (await upcomingShift(5)).startAt;
 const c = await command(); let injected = false;
 const racing: SqlExecutor = { query: f.db.executor.query, transaction: async (statements, signal) => {
  if (!injected && statements.some(statement => statement.text.includes('clocker_apply_punch'))) {
   injected = true; await saveClockerScheduleGrace(owner, { earlyClockInGraceMinutes: 7, expectedVersion: 1 }, f.db.executor);
  }
  return f.db.executor.transaction(statements, signal);
 } };
 await expect(new ClockerPunchService(f.key, racing).execute(proof, c)).rejects.toMatchObject({ code: 'SCHEDULE_CHANGED' });
 expect(injected).toBe(true); expect(await f.q('SELECT id FROM time_entries')).toEqual([]);
 await service.execute(proof, c);
 expect((await captured()).context).toMatchObject({ status: 'MATCHED', earlyGraceMinutes: 7 });
 expect(await f.q('SELECT count(*)::int AS count FROM clocker_command_ledger')).toEqual([{ count: 1 }]);
});
