import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SessionMutationProof } from '../../lib/shift-changes/types';
import { reviewTimeCorrection, submitTimeCorrection, type CorrectionMutationResult } from '../../lib/time-corrections/service';
import { readEmployeeTimeCorrections, readManagerTimeCorrections } from '../../lib/data/time-corrections.server';
import { readAttendanceReview } from '../../lib/data/attendance-review.server';
import { createPunchFixture } from './clocker-punch-fixture';

let f: Awaited<ReturnType<typeof createPunchFixture>>;

const employeeProof: SessionMutationProof = {
  sessionTokenHash: 'd'.repeat(64),
  employee: {
    id: 'c34-a',
    firstName: 'Avery',
    lastName: 'QA',
    role: 'EMPLOYEE',
    primaryLocationId: 'loc-1',
  },
};
const ownerProof: SessionMutationProof = {
  sessionTokenHash: 'a'.repeat(64),
  employee: {
    id: 'c34-owner',
    firstName: 'Owner',
    lastName: 'QA',
    role: 'OWNER',
    primaryLocationId: 'loc-1',
  },
};

const isoAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

type PendingCorrectionResult = Extract<CorrectionMutationResult,{status:'pending'}>;
function mustBePending(result: CorrectionMutationResult): PendingCorrectionResult {
  if (result.status !== 'pending') throw new Error('expected pending correction result');
  return result;
}

async function seedClosedEntry(options: {
  id?: string;
  employeeId?: string;
  startMinutesAgo?: number;
  endMinutesAgo?: number;
  withBreak?: boolean;
} = {}) {
  const id = options.id ?? 'd2-entry-1';
  const employeeId = options.employeeId ?? 'c34-a';
  const startAt = isoAgo(options.startMinutesAgo ?? 240);
  const endAt = isoAgo(options.endMinutesAgo ?? 120);
  await f.q(
    `INSERT INTO time_entries(
       id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version
     ) VALUES($1,$2,'loc-1',$3,$4::timestamptz,$5::timestamptz,'CLOCKED_OUT',4)`,
    [id, employeeId, f.devices[0].device.id, startAt, endAt],
  );
  let breakId: string | null = null;
  if (options.withBreak) {
    breakId = `${id}-break`;
    const snapshot = {
      id: f.breakType!.id,
      version: f.breakType!.version,
      name: f.breakType!.name,
      category: f.breakType!.category,
      targetMinutes: f.breakType!.targetMinutes,
    };
    await f.q(
      `INSERT INTO break_entries(
         id,time_entry_id,break_start_at,break_end_at,version,break_type_id,break_type_snapshot
       ) VALUES($1,$2,$3::timestamptz,$4::timestamptz,2,$5,$6::jsonb)`,
      [breakId, id, isoAgo(190), isoAgo(175), f.breakType!.id, JSON.stringify(snapshot)],
    );
  }
  return { id, breakId, startAt, endAt };
}

async function submitEntryResult(entryId: string, overrides: Partial<{
  operationId: string;
  proposedStartAt: string;
  proposedEndAt: string;
  reason: string;
}> = {}): Promise<CorrectionMutationResult> {
  return submitTimeCorrection(employeeProof, {
    operationId: overrides.operationId ?? randomUUID(),
    kind: 'ENTRY_BOUNDARY',
    timeEntryId: entryId,
    proposedStartAt: overrides.proposedStartAt ?? isoAgo(235),
    proposedEndAt: overrides.proposedEndAt ?? isoAgo(125),
    reason: overrides.reason ?? 'Recorded entry boundaries need review.',
  }, f.db.executor);
}
async function submitEntry(entryId: string, overrides: Partial<{
  operationId: string;
  proposedStartAt: string;
  proposedEndAt: string;
  reason: string;
}> = {}): Promise<PendingCorrectionResult> {
  return mustBePending(await submitEntryResult(entryId, overrides));
}

async function approve(requestId: string, operationId = randomUUID()) {
  return reviewTimeCorrection(ownerProof, {
    operationId,
    requestId,
    expectedRevision: 1,
    decision: 'APPROVE',
    note: 'Compared with the recorded time evidence.',
  }, f.db.executor);
}

beforeEach(async () => {
  f = await createPunchFixture({ breaks: true, companyAccess:true });
  await f.q(
    `INSERT INTO employee_sessions(token_hash,employee_id,expires_at)
     VALUES(repeat('d',64),'c34-a',clock_timestamp()+interval '1 day')`,
  );
});
afterEach(async () => {
  if (f) await f.db.dispose();
});

async function rawCustody() {
  return {
    entries: await f.q('SELECT to_jsonb(t) AS row FROM time_entries t ORDER BY id'),
    breaks: await f.q('SELECT to_jsonb(b) AS row FROM break_entries b ORDER BY id'),
    receipts: await f.q('SELECT to_jsonb(c) AS row FROM clocker_command_ledger c ORDER BY device_id,command_id'),
  };
}

async function submitBreak(entry: {id:string;breakId:string|null},start:number,end:number) {
  return submitTimeCorrection(employeeProof, {
    operationId:randomUUID(),kind:'BREAK_BOUNDARY',timeEntryId:entry.id,breakEntryId:entry.breakId!,
    proposedStartAt:isoAgo(start),proposedEndAt:isoAgo(end),reason:'Review the completed break boundaries.',
  },f.db.executor);
}

describe('D2-CODEX-002/003/007 bounded regression controls',()=>{
  it.each([
    ['APPROVE','REJECT'],['REJECT','APPROVE'],['REJECT','REJECT'],['APPROVE','APPROVE'],
  ] as const)('keeps %s terminal when a fresh operation attempts %s at revision 2',async(initial,next)=>{
    const entry=await seedClosedEntry();
    const pending=await submitEntry(entry.id);
    const command={operationId:randomUUID(),requestId:pending.requestId,expectedRevision:1,decision:initial};
    const decided=await reviewTimeCorrection(ownerProof,command,f.db.executor);
    expect(decided.status).toBe(initial==='APPROVE'?'approved':'rejected');
    const raw=await rawCustody();
    const events=await f.q('SELECT to_jsonb(e) AS row FROM time_correction_events e ORDER BY revision');
    const effective=await f.q('SELECT to_jsonb(e) AS row FROM nevora_effective_time_entries e');
    const second=await reviewTimeCorrection(ownerProof,{...command,operationId:randomUUID(),expectedRevision:2,decision:next},f.db.executor);
    expect(['approved','rejected','pending']).not.toContain(second.status);
    expect(await f.q('SELECT to_jsonb(e) AS row FROM time_correction_events e ORDER BY revision')).toEqual(events);
    expect(await f.q('SELECT to_jsonb(e) AS row FROM nevora_effective_time_entries e')).toEqual(effective);
    expect(await f.q('SELECT count(*)::int AS count FROM nevora_pending_time_corrections')).toEqual([{count:0}]);
    expect(await reviewTimeCorrection(ownerProof,command,f.db.executor)).toEqual(decided);
    expect(await reviewTimeCorrection(ownerProof,{...command,operationId:randomUUID()},f.db.executor)).toEqual({status:'conflict'});
    expect(await rawCustody()).toEqual(raw);
  });

  it.each([[180,125],[235,180],[180,178]])('rejects parent shrink %i/%i excluding an effective break',async(start,end)=>{
    const entry=await seedClosedEntry({withBreak:true});
    const pending=await submitEntry(entry.id,{proposedStartAt:isoAgo(start),proposedEndAt:isoAgo(end)});
    const raw=await rawCustody();
    expect(await approve(pending.requestId)).toEqual({status:'blocked',reason:'invalid_interval'});
    expect(await f.q('SELECT count(*)::int AS count FROM time_correction_adjustments')).toEqual([{count:0}]);
    expect(await f.q('SELECT event_kind FROM time_correction_events ORDER BY revision')).toEqual([{event_kind:'REQUESTED'}]);
    expect(await rawCustody()).toEqual(raw);
  });

  it('checks adjusted child boundaries, not just captured break boundaries',async()=>{
    const entry=await seedClosedEntry({withBreak:true});
    const child=mustBePending(await submitBreak(entry,205,195));
    expect((await approve(child.requestId)).status).toBe('approved');
    const parent=await submitEntry(entry.id,{proposedStartAt:isoAgo(200),proposedEndAt:isoAgo(125)});
    const raw=await rawCustody();
    expect(await approve(parent.requestId)).toEqual({status:'blocked',reason:'invalid_interval'});
    expect(await rawCustody()).toEqual(raw);
  });

  it('requires containment of every completed child break',async()=>{
    const entry=await seedClosedEntry({withBreak:true});
    await f.q('INSERT INTO break_entries(id,time_entry_id,break_start_at,break_end_at,version) VALUES($1,$2,$3::timestamptz,$4::timestamptz,1)',['later-child',entry.id,isoAgo(140),isoAgo(135)]);
    const parent=await submitEntry(entry.id,{proposedStartAt:isoAgo(235),proposedEndAt:isoAgo(145)});
    const raw=await rawCustody();
    expect(await approve(parent.requestId)).toEqual({status:'blocked',reason:'invalid_interval'});
    expect(await rawCustody()).toEqual(raw);
  });

  it('reconciles a committed review whose transaction response was lost',async()=>{
    const entry=await seedClosedEntry();
    const pending=await submitEntry(entry.id);
    const command={operationId:randomUUID(),requestId:pending.requestId,expectedRevision:1,decision:'APPROVE' as const};
    let loseResponse=true;
    const executor:typeof f.db.executor={query:f.db.executor.query,transaction:async statements=>{
      const result=await f.db.executor.transaction(statements);
      if(loseResponse){loseResponse=false;throw new Error('Committed response delivery lost');}
      return result;
    }};
    expect(await reviewTimeCorrection(ownerProof,command,executor)).toEqual({status:'outcome-unknown',operationId:command.operationId});
    expect((await reviewTimeCorrection(ownerProof,command,executor)).status).toBe('approved');
    expect(await f.q("SELECT count(*)::int AS count FROM time_correction_events WHERE request_id=$1 AND event_kind IN ('APPROVED','REJECTED')",[pending.requestId])).toEqual([{count:1}]);
    expect(await f.q('SELECT count(*)::int AS count FROM time_correction_adjustments WHERE request_id=$1',[pending.requestId])).toEqual([{count:1}]);
  });

  it('allows a parent containing the adjusted child even when the raw child is outside',async()=>{
    const entry=await seedClosedEntry({withBreak:true});
    const child=mustBePending(await submitBreak(entry,175,160));
    expect((await approve(child.requestId)).status).toBe('approved');
    const raw=await rawCustody();
    const parent=await submitEntry(entry.id,{proposedStartAt:isoAgo(180),proposedEndAt:isoAgo(125)});
    expect((await approve(parent.requestId)).status).toBe('approved');
    expect(await rawCustody()).toEqual(raw);
  });

  it('permits exact effective parent/break equality',async()=>{
    const entry=await seedClosedEntry({withBreak:true});
    const [child]=await f.q<{start_at:string;end_at:string}>('SELECT start_at::text,end_at::text FROM nevora_effective_break_entries WHERE break_entry_id=$1',[entry.breakId]);
    const parent=await submitEntry(entry.id,{proposedStartAt:child.start_at,proposedEndAt:child.end_at});
    expect((await approve(parent.requestId)).status).toBe('approved');
  });

  it('fails closed for an unbounded child without manufacturing completion',async()=>{
    const entry=await seedClosedEntry();
    await f.q('INSERT INTO break_entries(id,time_entry_id,break_start_at,version) VALUES($1,$2,$3::timestamptz,1)',['open-child',entry.id,isoAgo(190)]);
    const parent=await submitEntry(entry.id);
    const raw=await rawCustody();
    expect(await approve(parent.requestId)).toEqual({status:'blocked',reason:'invalid_interval'});
    expect(await rawCustody()).toEqual(raw);
  });

  it('serializes concurrent parent and break review into a contained effective state',async()=>{
    const entry=await seedClosedEntry({withBreak:true});
    const parent=await submitEntry(entry.id,{proposedStartAt:isoAgo(180),proposedEndAt:isoAgo(125)});
    const child=mustBePending(await submitBreak(entry,175,160));
    const raw=await rawCustody();
    const [parentResult,childResult]=await Promise.all([approve(parent.requestId),approve(child.requestId)]);
    expect(['approved','blocked']).toContain(parentResult.status);
    expect(childResult.status).toBe('approved');
    expect(await f.q('SELECT b.start_at>=t.start_at AND b.end_at<=t.end_at AS contained FROM nevora_effective_break_entries b JOIN nevora_effective_time_entries t ON t.time_entry_id=b.time_entry_id WHERE b.break_entry_id=$1',[entry.breakId])).toEqual([{contained:true}]);
    expect(await rawCustody()).toEqual(raw);
  });

  it('uses expanded effective parent boundaries for completed break requests',async()=>{
    const entry=await seedClosedEntry({withBreak:true});
    const parent=await submitEntry(entry.id,{proposedStartAt:isoAgo(300),proposedEndAt:isoAgo(60)});
    expect((await approve(parent.requestId)).status).toBe('approved');
    const raw=await rawCustody();
    const child=mustBePending(await submitBreak(entry,290,270));
    expect((await approve(child.requestId)).status).toBe('approved');
    expect(await rawCustody()).toEqual(raw);
  });

  it('rejects a break inside raw bounds but outside a shrunken effective parent',async()=>{
    const entry=await seedClosedEntry({withBreak:true});
    const parent=await submitEntry(entry.id,{proposedStartAt:isoAgo(210),proposedEndAt:isoAgo(150)});
    expect((await approve(parent.requestId)).status).toBe('approved');
    const raw=await rawCustody();
    expect(await submitBreak(entry,230,220)).toEqual({status:'blocked',reason:'invalid_interval'});
    expect(await rawCustody()).toEqual(raw);
  });

  it('revalidates parent changes while a break request is pending',async()=>{
    const entry=await seedClosedEntry({withBreak:true});
    const child=mustBePending(await submitBreak(entry,225,215));
    const parent=await submitEntry(entry.id,{proposedStartAt:isoAgo(210),proposedEndAt:isoAgo(150)});
    expect((await approve(parent.requestId)).status).toBe('approved');
    const raw=await rawCustody();
    expect(await approve(child.requestId)).toEqual({status:'blocked',reason:'invalid_interval'});
    expect(await rawCustody()).toEqual(raw);
  });
});

describe('D2 append-only time correction protocol', () => {
  it('D2-CODEX-006 reads canonical entry supersessions and scoped immutable decisions in both portals',async()=>{
    const entry=await seedClosedEntry({withBreak:true});
    const raw=await f.q('SELECT clock_in_at,clock_out_at,device_id,schedule_context,version FROM time_entries WHERE id=$1',[entry.id]);
    const first=await submitEntry(entry.id,{proposedStartAt:isoAgo(235),proposedEndAt:isoAgo(125),reason:'First approved boundaries.'});
    expect((await approve(first.requestId)).status).toBe('approved');
    const rejected=await submitEntry(entry.id,{proposedStartAt:isoAgo(234),proposedEndAt:isoAgo(126)});
    expect((await reviewTimeCorrection(ownerProof,{operationId:randomUUID(),requestId:rejected.requestId,expectedRevision:1,decision:'REJECT',note:'Declined; prior approval stands.'},f.db.executor)).status).toBe('rejected');
    const second=await submitEntry(entry.id,{proposedStartAt:isoAgo(230),proposedEndAt:isoAgo(130),reason:'Second approved boundaries.'});
    expect((await approve(second.requestId)).status).toBe('approved');
    const pending=await submitEntry(entry.id,{proposedStartAt:isoAgo(229),proposedEndAt:isoAgo(131)});
    const [canonical]=await f.q<{start:string;end:string}>('SELECT start_at::text AS start,end_at::text AS end FROM nevora_effective_time_entries WHERE time_entry_id=$1',[entry.id]);
    const employee=await readEmployeeTimeCorrections(employeeProof,f.db.executor);
    const manager=await readManagerTimeCorrections(ownerProof,f.db.executor);
    expect(employee.state).toBe('ready');expect(manager.state).toBe('ready');
    if(employee.state!=='ready'||manager.state!=='ready')throw Error('Protected context unavailable');
    for(const item of [employee.requests.find(r=>r.id===pending.requestId)!,manager.requests[0]]){
      expect(item.context).toMatchObject({state:'confirmed',sourceKind:'ADJUSTMENT',startAt:canonical.start,endAt:canonical.end,totalDecisions:3});
      expect(item.baseChanged).toBe(false);
      expect(new Date(item.originalStartAt!).toISOString()).toBe(entry.startAt);
      expect(item.context.state==='confirmed'&&item.context.decisions.map(d=>d.status)).toEqual(['APPROVED','REJECTED','APPROVED']);
    }
    expect(employee.targets.find(t=>t.timeEntryId===entry.id&&t.kind==='ENTRY_BOUNDARY')?.context).toMatchObject({startAt:canonical.start,endAt:canonical.end});
    expect(await f.q('SELECT clock_in_at,clock_out_at,device_id,schedule_context,version FROM time_entries WHERE id=$1',[entry.id])).toEqual(raw);
  });

  it('D2-CODEX-006 reads canonical break supersessions without changing classification or raw time',async()=>{
    const entry=await seedClosedEntry({withBreak:true});
    const raw=await f.q('SELECT * FROM break_entries WHERE id=$1',[entry.breakId]);
    for(const [start,end] of [[189,176],[188,177]]){
      const request=mustBePending(await submitTimeCorrection(employeeProof,{operationId:randomUUID(),kind:'BREAK_BOUNDARY',timeEntryId:entry.id,breakEntryId:entry.breakId!,proposedStartAt:isoAgo(start),proposedEndAt:isoAgo(end),reason:'Fictional break supersession.'},f.db.executor));
      expect((await approve(request.requestId)).status).toBe('approved');
    }
    const pending=mustBePending(await submitTimeCorrection(employeeProof,{operationId:randomUUID(),kind:'BREAK_BOUNDARY',timeEntryId:entry.id,breakEntryId:entry.breakId!,proposedStartAt:isoAgo(187),proposedEndAt:isoAgo(178),reason:'Pending break proposal is not effective.'},f.db.executor));
    const [canonical]=await f.q<{start:string;end:string}>('SELECT start_at::text AS start,end_at::text AS end FROM nevora_effective_break_entries WHERE break_entry_id=$1',[entry.breakId]);
    const manager=await readManagerTimeCorrections(ownerProof,f.db.executor),employee=await readEmployeeTimeCorrections(employeeProof,f.db.executor);
    expect(manager.state).toBe('ready');expect(employee.state).toBe('ready');
    if(manager.state!=='ready'||employee.state!=='ready')throw Error('Protected context unavailable');
    expect(manager.requests[0]).toMatchObject({id:pending.requestId,context:{state:'confirmed',startAt:canonical.start,endAt:canonical.end,totalDecisions:2}});
    expect(employee.targets.find(t=>t.breakEntryId===entry.breakId)?.context).toMatchObject({startAt:canonical.start,endAt:canonical.end,totalDecisions:2});
    expect(await f.q('SELECT * FROM break_entries WHERE id=$1',[entry.breakId])).toEqual(raw);
  });

  it('D2-CODEX-006 confirms unadjusted equality and discloses five-of-six decision history',async()=>{
    const entry=await seedClosedEntry();
    let employee=await readEmployeeTimeCorrections(employeeProof,f.db.executor);
    expect(employee.state).toBe('ready');
    if(employee.state!=='ready')throw Error('Protected context unavailable');
    expect(employee.targets[0].context).toMatchObject({state:'confirmed',sourceKind:'RECORDED',totalDecisions:0,decisions:[]});
    for(let i=0;i<6;i++){
      const request=await submitEntry(entry.id);
      expect((await reviewTimeCorrection(ownerProof,{operationId:randomUUID(),requestId:request.requestId,expectedRevision:1,decision:'REJECT'},f.db.executor)).status).toBe('rejected');
    }
    employee=await readEmployeeTimeCorrections(employeeProof,f.db.executor);
    if(employee.state!=='ready')throw Error('Protected context unavailable');
    expect(employee.targets[0].context).toMatchObject({state:'confirmed',sourceKind:'RECORDED',totalDecisions:6});
    expect(employee.targets[0].context.state==='confirmed'&&employee.targets[0].context.decisions).toHaveLength(5);
  });

  it('D2-CODEX-006 fails closed on missing schema, stale raw sources and current authority loss',async()=>{
    const entry=await seedClosedEntry();await submitEntry(entry.id);
    await f.q('UPDATE time_entries SET version=version+1 WHERE id=$1',[entry.id]);
    expect(await readManagerTimeCorrections(ownerProof,f.db.executor)).toMatchObject({state:'ready',requests:[{baseChanged:true}]});
    await f.q("UPDATE employees SET role='LEAD' WHERE id='c34-a'");
    const lead={...employeeProof,employee:{...employeeProof.employee,role:'LEAD' as const}};
    expect(await readEmployeeTimeCorrections(lead,f.db.executor)).toMatchObject({state:'ready'});
    expect(await readManagerTimeCorrections(lead,f.db.executor)).toEqual({state:'unavailable',reason:'access_denied'});
    await f.q("UPDATE employees SET active=false WHERE id='c34-a'");
    expect(await readEmployeeTimeCorrections(lead,f.db.executor)).toEqual({state:'unavailable',reason:'access_denied'});
    await f.q('ALTER VIEW nevora_effective_time_entries RENAME COLUMN start_at TO missing_start');
    expect(await readManagerTimeCorrections(ownerProof,f.db.executor)).toEqual({state:'unavailable',reason:'schema_missing'});
  });

  it('D2-CODEX-006 never exposes another employee targets or decisions',async()=>{
    const entry=await seedClosedEntry({id:'OTHER-PRIVATE-TIME',employeeId:'c34-b'});
    const other={...employeeProof,sessionTokenHash:'b'.repeat(64),employee:{...employeeProof.employee,id:'c34-b',firstName:'Blair'}};
    await f.q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('b',64),'c34-b',clock_timestamp()+interval '1 day')");
    const requested=mustBePending(await submitTimeCorrection(other,{operationId:randomUUID(),kind:'ENTRY_BOUNDARY',timeEntryId:entry.id,proposedStartAt:isoAgo(235),proposedEndAt:isoAgo(125),reason:'OTHER-PRIVATE-REASON'},f.db.executor));
    expect((await approve(requested.requestId)).status).toBe('approved');
    expect(await readEmployeeTimeCorrections(employeeProof,f.db.executor)).toMatchObject({state:'ready',requests:[],targets:[]});
    expect(JSON.stringify(await readEmployeeTimeCorrections(employeeProof,f.db.executor))).not.toMatch(/OTHER-PRIVATE|Blair/);
  });
  it('approves a recorded-entry correction without changing the raw Clocker row', async () => {
    const entry = await seedClosedEntry();
    const rawBefore = await f.q(
      `SELECT clock_in_at::text,clock_out_at::text,status,version,device_id,schedule_context
       FROM time_entries WHERE id=$1`, [entry.id],
    );

    const requested = await submitEntry(entry.id);
    expect(requested.status).toBe('pending');
    expect(await f.q('SELECT count(*)::int AS count FROM nevora_pending_time_corrections'))
      .toEqual([{ count: 1 }]);

    const accepted = await approve(requested.requestId!);
    expect(accepted.status).toBe('approved');

    expect(await f.q(
      `SELECT clock_in_at::text,clock_out_at::text,status,version,device_id,schedule_context
       FROM time_entries WHERE id=$1`, [entry.id],
    )).toEqual(rawBefore);
    expect(await f.q(
      `SELECT source_kind,time_entry_id,adjustment_id IS NOT NULL AS adjusted,
              start_at<end_at AS valid
       FROM nevora_effective_time_entries WHERE time_entry_id=$1`, [entry.id],
    )).toEqual([{ source_kind: 'RECORDED', time_entry_id: entry.id, adjusted: true, valid: true }]);
    expect(await f.q('SELECT count(*)::int AS count FROM nevora_pending_time_corrections'))
      .toEqual([{ count: 0 }]);
    expect(await f.q(
      `SELECT event_kind,revision FROM time_correction_events
       WHERE request_id=$1::uuid ORDER BY revision`, [requested.requestId],
    )).toEqual([
      { event_kind: 'REQUESTED', revision: 1 },
      { event_kind: 'APPROVED', revision: 2 },
    ]);
  });

  it('replays identical request/review operations and rejects operation-ID reuse with changed content', async () => {
    const entry = await seedClosedEntry();
    const requestId = randomUUID();
    const command = {
      operationId: requestId,
      proposedStartAt: isoAgo(235),
      proposedEndAt: isoAgo(125),
      reason: 'Recorded entry boundaries need review.',
    };
    const first = await submitEntry(entry.id, command);
    expect(await submitEntry(entry.id, command)).toEqual(first);
    expect(await submitEntryResult(entry.id, { ...command, reason: 'Different request body.' }))
      .toEqual({ status: 'conflict' });

    const reviewId = randomUUID();
    const accepted = await approve(first.requestId!, reviewId);
    expect(await approve(first.requestId!, reviewId)).toEqual(accepted);
    const changed = await reviewTimeCorrection(ownerProof, {
      operationId: reviewId,
      requestId: first.requestId!,
      expectedRevision: 1,
      decision: 'REJECT',
      note: 'Changed decision.',
    }, f.db.executor);
    expect(changed).toEqual({ status: 'conflict' });
    expect(await f.q('SELECT count(*)::int AS count FROM time_correction_adjustments'))
      .toEqual([{ count: 1 }]);
  });

  it('never permits correction of the open live Clocker entry', async () => {
    await f.q(
      `INSERT INTO time_entries(
        id,employee_id,location_id,device_id,clock_in_at,status,version
      ) VALUES('d2-live','c34-a','loc-1',$1,$2::timestamptz,'CLOCKED_IN',1)`,
      [f.devices[0].device.id, isoAgo(20)],
    );
    await f.q(`INSERT INTO clocker_employee_clock_state(employee_id,revision) VALUES('c34-a',9)`);
    const before = await f.q(
      `SELECT id,clock_out_at,status,version FROM time_entries WHERE id='d2-live'`,
    );
    const result = await submitEntryResult('d2-live', {
      proposedStartAt: isoAgo(19),
      proposedEndAt: isoAgo(1),
    });
    expect(result).toEqual({ status: 'blocked', reason: 'live_state' });
    expect(await f.q(
      `SELECT id,clock_out_at,status,version FROM time_entries WHERE id='d2-live'`,
    )).toEqual(before);
    expect(await f.q(
      `SELECT revision FROM clocker_employee_clock_state WHERE employee_id='c34-a'`,
    )).toEqual([{ revision: 9 }]);
    expect(await f.q('SELECT count(*)::int AS count FROM time_correction_requests'))
      .toEqual([{ count: 0 }]);
  });

  it('blocks self-approval even for an Owner', async () => {
    const entry = await seedClosedEntry({ id: 'd2-owner-entry', employeeId: 'c34-owner' });
    const requested = mustBePending(await submitTimeCorrection(ownerProof, {
      operationId: randomUUID(),
      kind: 'ENTRY_BOUNDARY',
      timeEntryId: entry.id,
      proposedStartAt: isoAgo(235),
      proposedEndAt: isoAgo(125),
      reason: 'Owner entry needs independent review.',
    }, f.db.executor));
    expect(requested.status).toBe('pending');
    const reviewed = await reviewTimeCorrection(ownerProof, {
      operationId: randomUUID(),
      requestId: requested.requestId!,
      expectedRevision: 1,
      decision: 'APPROVE',
    }, f.db.executor);
    expect(reviewed).toEqual({ status: 'blocked', reason: 'self_review' });
    expect(await f.q('SELECT count(*)::int AS count FROM time_correction_adjustments'))
      .toEqual([{ count: 0 }]);
  });

  it('preserves break classification while adjusting only approved historical boundaries', async () => {
    const entry = await seedClosedEntry({ withBreak: true });
    const before = await f.q(
      `SELECT break_type_id,break_type_snapshot,break_start_at::text,break_end_at::text,version
       FROM break_entries WHERE id=$1`, [entry.breakId],
    );
    const requested = mustBePending(await submitTimeCorrection(employeeProof, {
      operationId: randomUUID(),
      kind: 'BREAK_BOUNDARY',
      timeEntryId: entry.id,
      breakEntryId: entry.breakId!,
      proposedStartAt: isoAgo(188),
      proposedEndAt: isoAgo(174),
      reason: 'Break ended one minute earlier.',
    }, f.db.executor));
    expect(requested.status).toBe('pending');
    expect((await approve(requested.requestId!)).status).toBe('approved');

    expect(await f.q(
      `SELECT break_type_id,break_type_snapshot,break_start_at::text,break_end_at::text,version
       FROM break_entries WHERE id=$1`, [entry.breakId],
    )).toEqual(before);
    const effective = await f.q<{
      break_type_id: string;
      break_type_snapshot: Record<string, unknown>;
      adjusted: boolean;
    }>(
      `SELECT break_type_id,break_type_snapshot,adjustment_id IS NOT NULL AS adjusted
       FROM nevora_effective_break_entries WHERE break_entry_id=$1`, [entry.breakId],
    );
    expect(effective[0].break_type_id).toBe(f.breakType!.id);
    expect(effective[0].break_type_snapshot).toEqual(before[0].break_type_snapshot);
    expect(effective[0].adjusted).toBe(true);
  });

  it('records a missing-entry approval as an adjustment, never as a fabricated Clocker punch', async () => {
    const requested = mustBePending(await submitTimeCorrection(employeeProof, {
      operationId: randomUUID(),
      kind: 'MISSING_ENTRY',
      locationId: 'loc-1',
      proposedStartAt: isoAgo(300),
      proposedEndAt: isoAgo(240),
      reason: 'The tablet was unavailable for this completed shift.',
    }, f.db.executor));
    expect(requested.status).toBe('pending');
    expect((await approve(requested.requestId!)).status).toBe('approved');

    expect(await f.q('SELECT count(*)::int AS count FROM time_entries')).toEqual([{ count: 0 }]);
    expect(await f.q('SELECT count(*)::int AS count FROM clocker_command_ledger')).toEqual([{ count: 0 }]);
    expect(await f.q(
      `SELECT source_kind,time_entry_id,adjustment_id IS NOT NULL AS adjusted,status
       FROM nevora_effective_time_entries`,
    )).toEqual([{
      source_kind: 'ADJUSTMENT',
      time_entry_id: null,
      adjusted: true,
      status: 'CLOCKED_OUT',
    }]);
  });

  it('serializes simultaneous approve/reject decisions so exactly one terminal decision wins', async () => {
    const entry = await seedClosedEntry();
    const requested = await submitEntry(entry.id);
    const [approveResult, rejectResult] = await Promise.all([
      reviewTimeCorrection(ownerProof, {
        operationId: randomUUID(),
        requestId: requested.requestId!,
        expectedRevision: 1,
        decision: 'APPROVE',
      }, f.db.executor),
      reviewTimeCorrection(ownerProof, {
        operationId: randomUUID(),
        requestId: requested.requestId!,
        expectedRevision: 1,
        decision: 'REJECT',
      }, f.db.executor),
    ]);
    const statuses = [approveResult.status, rejectResult.status].sort();
    expect(statuses).toContain('conflict');
    expect(statuses.some((status) => status === 'approved' || status === 'rejected')).toBe(true);
    expect(await f.q(
      `SELECT count(*)::int AS count FROM time_correction_events
       WHERE request_id=$1::uuid AND event_kind IN ('APPROVED','REJECTED')`,
      [requested.requestId],
    )).toEqual([{ count: 1 }]);
  });

  it('blocks stale source and overlapping effective time rather than silently rewriting history', async () => {
    const first = await seedClosedEntry({
      id: 'd2-entry-early',
      startMinutesAgo: 360,
      endMinutesAgo: 300,
    });
    await seedClosedEntry({
      id: 'd2-entry-late',
      startMinutesAgo: 240,
      endMinutesAgo: 180,
    });

    const stale = await submitEntry(first.id, {
      proposedStartAt: isoAgo(355),
      proposedEndAt: isoAgo(305),
    });
    await f.q('UPDATE time_entries SET version=version+1 WHERE id=$1', [first.id]);
    expect(await approve(stale.requestId!)).toEqual({ status: 'blocked', reason: 'stale_source' });

    const clean = await seedClosedEntry({
      id: 'd2-entry-middle',
      startMinutesAgo: 290,
      endMinutesAgo: 250,
    });
    const overlap = await submitEntry(clean.id, {
      proposedStartAt: isoAgo(260),
      proposedEndAt: isoAgo(210),
    });
    expect(await approve(overlap.requestId!)).toEqual({ status: 'blocked', reason: 'overlap' });
    expect(await f.q(
      `SELECT count(*)::int AS count FROM time_correction_adjustments
       WHERE request_id=ANY($1::uuid[])`,
      [[stale.requestId, overlap.requestId]],
    )).toEqual([{ count: 0 }]);
  });

  it('supersedes an earlier approved adjustment while retaining both immutable revisions', async () => {
    const entry = await seedClosedEntry();
    const rawBefore = await f.q(
      'SELECT clock_in_at::text,clock_out_at::text,version FROM time_entries WHERE id=$1',
      [entry.id],
    );
    const first = await submitEntry(entry.id, {
      proposedStartAt: isoAgo(235),
      proposedEndAt: isoAgo(125),
    });
    const firstApproval = await approve(first.requestId!);
    expect(firstApproval.status).toBe('approved');

    const second = await submitEntry(entry.id, {
      proposedStartAt: isoAgo(230),
      proposedEndAt: isoAgo(130),
      reason: 'A second review found the exact boundaries.',
    });
    const secondApproval = await approve(second.requestId!);
    expect(secondApproval.status).toBe('approved');

    expect(await f.q(
      `SELECT count(*)::int AS count FROM time_correction_adjustments WHERE time_entry_id=$1`,
      [entry.id],
    )).toEqual([{ count: 2 }]);
    expect(await f.q(
      `SELECT count(*)::int AS count FROM nevora_time_correction_leaf_adjustments
       WHERE time_entry_id=$1`, [entry.id],
    )).toEqual([{ count: 1 }]);
    expect(await f.q(
      'SELECT clock_in_at::text,clock_out_at::text,version FROM time_entries WHERE id=$1',
      [entry.id],
    )).toEqual(rawBefore);
  });

  it('keeps requests, decisions and adjustments append-only', async () => {
    const entry = await seedClosedEntry();
    const requested = await submitEntry(entry.id);
    const accepted = await approve(requested.requestId!);
    expect(accepted.status).toBe('approved');

    await expect(f.q(
      'UPDATE time_correction_requests SET reason=$2 WHERE id=$1::uuid',
      [requested.requestId, 'Changed later'],
    )).rejects.toThrow(/append.?only/i);
    await expect(f.q(
      'DELETE FROM time_correction_events WHERE request_id=$1::uuid',
      [requested.requestId],
    )).rejects.toThrow(/append.?only/i);
    await expect(f.q(
      'UPDATE time_correction_adjustments SET effective_start_at=effective_start_at+interval \'1 minute\' WHERE request_id=$1::uuid',
      [requested.requestId],
    )).rejects.toThrow(/append.?only/i);
  });

  it('serves the employee history and manager inbox from the same protected pending state', async () => {
    const entry = await seedClosedEntry();
    const requested = await submitEntry(entry.id);
    const employee = await readEmployeeTimeCorrections(employeeProof, f.db.executor);
    expect(employee.state).toBe('ready');
    if (employee.state !== 'ready') throw new Error('employee corrections unavailable');
    expect(employee.requests).toHaveLength(1);
    expect(employee.requests[0]).toMatchObject({id:requested.requestId,status:'PENDING',kind:'ENTRY_BOUNDARY'});
    expect(employee.locations.map((location) => location.id)).toContain('loc-1');

    const manager = await readManagerTimeCorrections(ownerProof, f.db.executor);
    expect(manager.state).toBe('ready');
    if (manager.state !== 'ready') throw new Error('manager corrections unavailable');
    expect(manager.requests).toHaveLength(1);
    expect(manager.requests[0]).toMatchObject({id:requested.requestId,status:'PENDING',employeeName:'Avery QA',isSelf:false});

    expect((await approve(requested.requestId!)).status).toBe('approved');
    const refreshed = await readEmployeeTimeCorrections(employeeProof, f.db.executor);
    expect(refreshed.state).toBe('ready');
    if (refreshed.state !== 'ready') throw new Error('employee corrections unavailable');
    expect(refreshed.requests[0].status).toBe('APPROVED');
    const inbox = await readManagerTimeCorrections(ownerProof, f.db.executor);
    expect(inbox).toMatchObject({state:'ready',requests:[]});
  });

  it('feeds the authoritative pending correction count into D1 without enabling future policy signals', async () => {
    const requested = mustBePending(await submitTimeCorrection(employeeProof, {
      operationId:randomUUID(),kind:'MISSING_ENTRY',locationId:'loc-1',
      proposedStartAt:isoAgo(300),proposedEndAt:isoAgo(240),reason:'Tablet was unavailable.',
    }, f.db.executor));
    expect(requested.status).toBe('pending');
    const attendance = await readAttendanceReview(ownerProof, f.db.executor);
    expect(attendance.state).toBe('ready');
    if (attendance.state !== 'ready') throw new Error('attendance unavailable');
    expect(attendance.pendingCorrectionCount).toBe(1);
    expect(attendance.coverage.deferredCapabilities).not.toContain('correction_review');
    expect(attendance.coverage.deferredCapabilities).toContain('overtime_risk');

    expect((await approve(requested.requestId!)).status).toBe('approved');
    const after = await readAttendanceReview(ownerProof, f.db.executor);
    expect(after.state).toBe('ready');
    if (after.state !== 'ready') throw new Error('attendance unavailable');
    expect(after.pendingCorrectionCount).toBe(0);
  });

});

it('UX-04 bounds a verified correction queue by the current session deadline',async()=>{
 await f.q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '10 seconds' WHERE employee_id='c34-owner'");
 const result=await readManagerTimeCorrections(ownerProof,f.db.executor);
 expect(result.state).toBe('ready');if(result.state==='ready'){expect(result.validForMs).toBeGreaterThan(0);expect(result.validForMs).toBeLessThanOrEqual(10000);}
});
it('UX-04 refuses a queue when logout happens after the protected source batch',async()=>{
 const executor={...f.db.executor,query:async<T>(statement:Parameters<typeof f.db.executor.query>[0])=>{if(statement.text.includes('EXTRACT(epoch FROM(s.expires_at-clock_timestamp()))'))await f.q("DELETE FROM employee_sessions WHERE employee_id='c34-owner'");return f.db.executor.query<T>(statement);}};
 expect(await readManagerTimeCorrections(ownerProof,executor)).toEqual({state:'unavailable',reason:'access_denied'});
});
