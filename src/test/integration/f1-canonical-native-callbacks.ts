import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { Client } from 'pg';
import type { SqlExecutor, SqlStatement } from '../../lib/notifications/types';
import type { SessionMutationProof } from '../../lib/shift-changes/types';
import { copyCanonicalCapture, parseCorrectionActionCapture, prepareCanonicalActionSources,
  prepareCorrectionActionRows, prepareTimecardActionRows, prepareAttendanceActionRows,
  prepareSchedulingActionRows } from '../../lib/action-center/canonical-source';
import { readManagerTimeCorrections, readManagerTimeCorrectionsWithInternalCapture } from '../../lib/data/time-corrections.server';
import { readAttendanceReview, readAttendanceReviewWithInternalCapture } from '../../lib/data/attendance-review.server';
import { readTimecards, readTimecardsWithInternalCapture } from '../../lib/timecards/service';
import { loadManagerDashboardData, loadManagerDashboardDataWithInternalCapture } from '../../lib/data/manager-dashboard';
import { buildManagerActionItems } from '../../lib/assistance/manager-actions';
import { calculateScheduleHealth } from '../../lib/scheduling/schedule-health';
import { weekDates } from '../../lib/date-utils';
import { projectAttendance } from '../../lib/attendance/project';
import { getTenantProofFacts } from '../../lib/tenancy/resolve.server';
import type { TenantProof } from '../../lib/tenancy/types';
import sourcePins from './f1-native-source-pins.json';

/** PREPARED ONLY. Future location: src/test/integration/f1-canonical-native-callbacks.ts.
 * No client construction, connection, environment discovery, installation, role,
 * database, fixture teardown, test registration or default execution occurs here.
 * Root calls these callbacks through its existing exact owned case-database seam.
 * Every case requires a NEW case database containing exact original0001–0025;
 * 0026/cutover/runtime graph/RLS are deliberately not represented as installed.
 * The root seam independently verifies lease/PID/start/system/database OID/marker,
 * original direct login, source pins and cleanup. A passed Client is not approval.
 * Scheduling's test-only getDb/default-executor adapters must forward REAL SQL
 * to the same case Client, retaining queryRows/canonical mappers unchanged.
 */
export type F1OwnedCase = Readonly<{ client: Client; record(value: unknown): void }>;
export type F1NativeVectorId = 'CR01'|'CR02'|'CR03'|'CR04'|'TC01'|'TC02'|'AT01'|'SC01'|'SC02'|'PB01'|'PB02'|'F1GATE';
export type F1NativeCallback = Readonly<{ id: F1NativeVectorId; run(context: F1OwnedCase): Promise<void> }>;
const hash = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');
const owner = 'F1-OWNER', member = 'F1-MEMBER', peer = 'F1-PEER';
const managerHash = 'a'.repeat(64), memberHash = 'b'.repeat(64), peerHash = 'c'.repeat(64);
const caseSqlCounts = new WeakMap<Client,{queries:number;transactions:number;statements:number}>();
const period = { startDate: '2020-01-06', endDate: '2020-01-12' };
const interval = { start: '2020-01-07T12:00:00.123456Z', end: '2020-01-07T16:00:00.654321Z' };
export function assertFrozenF1ReaderSources() {
  for (const pin of sourcePins.selectedSource) assert.equal(hash(readFileSync(pin.path,'utf8')),pin.sha256,pin.path);
  for (const pin of sourcePins.readerOverlays) assert.equal(hash(readFileSync(pin.path,'utf8')),pin.sha256,pin.path);
  // Exact full original inputs, not a fabricated or partial schema inventory.
  assert.equal(sourcePins.originalMigrations.length,25);
  for (const pin of sourcePins.originalMigrations) assert.equal(hash(readFileSync(pin.path,'utf8')),pin.sha256,pin.path);
}

// This is a TEST transport, not a production API or a new source of authority.
// No synthetic row is ever returned. Own BEGIN/COMMIT/rollback acknowledgements
// remain native; idle is mandatory and errors are propagated to the reader.
export function actualCaseExecutor(client: Client): SqlExecutor {
  const counts=caseSqlCounts.get(client)??{queries:0,transactions:0,statements:0};caseSqlCounts.set(client,counts);
  return {
    async query<T>(statement: SqlStatement, signal?: AbortSignal): Promise<T[]> {
      signal?.throwIfAborted();
      counts.queries++;counts.statements++;const result = await client.query(statement.text, [...statement.values]);
      signal?.throwIfAborted(); return result.rows as T[];
    },
    async transaction(statements, signal) {
      signal?.throwIfAborted(); assert.equal(client.getTransactionStatus(), 'I');
      let begun = false, commitAttempted = false;
      try {
        // The root harness owns this original client; no ambient transaction use.
        begun = true; await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');counts.transactions++;
        const result: unknown[][] = [];
        for (const statement of statements) {
          signal?.throwIfAborted();counts.statements++;result.push((await client.query(statement.text, [...statement.values])).rows);
        }
        signal?.throwIfAborted(); commitAttempted = true; await client.query('COMMIT'); return result;
      } catch (error) {
        // No assertion of rollback after a possibly attempted COMMIT.
        if (begun && !commitAttempted) await client.query('ROLLBACK');
        throw error;
      }
    },
  };
}
// Root's isolated getDb mock uses this query method only; it does not replace
// queryRows, a canonical loader, policy, parser, proof issuer or any native guard.
export function actualSchedulingDbTransport(executor: SqlExecutor) {
  return Object.freeze({ query: (text: string, values: readonly unknown[] = []) => executor.query({ text, values }) });
}
async function q<T = Record<string, unknown>>(c: F1OwnedCase, text: string, values: unknown[] = []) {
  return (await c.client.query(text, values)).rows as T[];
}
async function wholeSource(c: F1OwnedCase) {
  const names = await q<{ name: string }>(c, `SELECT c.relname::text name FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname COLLATE "C"`);
  const result: Record<string, string[]> = {};
  for (const { name } of names) {
    assert.match(name, /^[a-z][a-z0-9_]*$/);
    result[name] = (await q<{ wire: string }>(c, `SELECT pg_catalog.to_jsonb(t)::text wire
      FROM public."${name}" t ORDER BY pg_catalog.to_jsonb(t)::text COLLATE "C"`)).map(r => r.wire);
  }
  return result; // Raw database text preserves bigint/numeric bytes in evidence.
}
async function preservedRead<T>(c: F1OwnedCase, read: () => Promise<T>) {
  const before = await wholeSource(c), result = await read(), after = await wholeSource(c);
  assert.deepEqual(after, before);
  c.record({ operation: 'READ_PRESERVATION', tables: Object.keys(before), checksum: hash(JSON.stringify(before)) });
  return result;
}
async function base(c: F1OwnedCase) {
  assertFrozenF1ReaderSources();
  assert.equal(c.client.getTransactionStatus(), 'I');
  const workspaces = await q<{ id: string; zone: string }>(c, 'SELECT id,time_zone zone FROM public.workspaces WHERE singleton');
  assert.equal(workspaces.length, 1); const workspaceId = workspaces[0].id, zone = workspaces[0].zone;
  // Preserve original native singleton key; never default another row to Fuel.
  assert.equal((await q(c, 'SELECT id FROM public.employees')).length, 0);
  await q(c, `INSERT INTO public.employees(id,first_name,last_name,phone,role,primary_location_id) VALUES
    ($1,'Fictional','Manager','555-0100','OWNER','loc-1'),
    ($2,'Same','Name','555-0101','EMPLOYEE','loc-1'),($3,'Same','Name','555-0102','EMPLOYEE','loc-2')`, [owner, member, peer]);
  await q(c, `INSERT INTO public.employee_sessions(token_hash,employee_id,expires_at) VALUES
    ($1,$2,clock_timestamp()+interval '1 day'),($3,$4,clock_timestamp()+interval '1 day'),($5,$6,clock_timestamp()+interval '1 day')`,
    [managerHash, owner, memberHash, member, peerHash, peer]);
  await q(c, `INSERT INTO public.locations(id,workspace_id,clocker_key,name,short_name,active)
    VALUES('f1-retained',$1,'f1-retained','Fictional Retained','Retained',false)`, [workspaceId]);
  for (const id of ['loc-1', 'loc-2', 'f1-retained']) {
    await q(c, 'INSERT INTO public.clocker_devices(id,location_id,name,active) VALUES($1,$2,$3,true)', ['f1-device-'+id, id, 'Fictional '+id]);
  }
  await q(c, `INSERT INTO public.employee_location_eligibility(employee_id,location_id) VALUES
    ($1,'loc-1'),($1,'loc-2'),($2,'loc-1'),($2,'loc-2'),($3,'loc-2')`, [owner, member, peer]);
  const proof = async (id: string, sessionTokenHash: string): Promise<SessionMutationProof> => {
    const [employee] = await q<SessionMutationProof['employee']>(c, `SELECT id,first_name "firstName",last_name "lastName",role,
      primary_location_id "primaryLocationId" FROM public.employees WHERE id=$1`, [id]);
    assert.ok(employee); return { employee, sessionTokenHash };
  };
  return { workspaceId, zone, executor: actualCaseExecutor(c.client),
    manager: await proof(owner, managerHash), employee: await proof(member, memberHash), peer: await proof(peer, peerHash) };
}
async function entry(c: F1OwnedCase, id: string, employee = member, location = 'loc-1', start = interval.start, end = interval.end) {
  await q(c, `INSERT INTO public.time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version)
    VALUES($1,$2,$3,$4,$5::timestamptz,$6::timestamptz,'CLOCKED_OUT',4)`, [id, employee, location, 'f1-device-'+location, start, end]);
}
async function request(c: F1OwnedCase, workspace: string, options: { kind?: 'ENTRY_BOUNDARY'|'BREAK_BOUNDARY'|'MISSING_ENTRY';
  employee?: string; location?: string; entry?: string; brk?: string; base?: string; snapshotLocation?: string; rejected?: boolean }) {
  const id = randomUUID(), kind = options.kind ?? 'ENTRY_BOUNDARY', who = options.employee ?? member;
  const start = interval.start, end = interval.end;
  await q(c, `INSERT INTO public.time_correction_requests(id,workspace_id,employee_id,requested_by_employee_id,kind,
    time_entry_id,break_entry_id,location_id,source_revision,source_snapshot,base_adjustment_id,proposal,reason,request_hash,created_at)
    VALUES($1::uuid,$2,$3,$3,$4,$5,$6,$7,4,
      pg_catalog.jsonb_build_object('clockInAt',$8::text,'clockOutAt',$9::text,'startAt',$8::text,'endAt',$9::text,
      'sourceVersion','4','locationId',$10::text),$11::uuid,
      pg_catalog.jsonb_build_object('startAt',$8::text,'endAt',$9::text),'Fictional private correction reason',repeat('d',64),
      clock_timestamp()-interval '1 minute')`,
    [id, workspace, who, kind, options.entry ?? null, options.brk ?? null, options.location ?? 'loc-1', start, end,
      options.snapshotLocation ?? options.location ?? 'loc-1', options.base ?? null]);
  await q(c, `INSERT INTO public.time_correction_events(id,request_id,revision,event_kind,actor_employee_id,operation_hash,result)
    VALUES($1::uuid,$1::uuid,1,'REQUESTED',$2,repeat('d',64),'{}'::jsonb)`, [id, who]);
  if (options.rejected) await q(c, `INSERT INTO public.time_correction_events(id,request_id,revision,event_kind,actor_employee_id,
    operation_hash,result) VALUES($1::uuid,$2::uuid,2,'REJECTED',$3,repeat('e',64),'{}'::jsonb)`, [randomUUID(), id, owner]);
  return id;
}
async function missingAdjustment(c: F1OwnedCase, workspace: string, parent: string|null, location: string, employee = member) {
  const id = await request(c, workspace, { kind: 'MISSING_ENTRY', employee, location, base: parent ?? undefined });
  const adjustment = randomUUID();
  await q(c, `INSERT INTO public.time_correction_adjustments(id,request_id,workspace_id,employee_id,kind,location_id,
    effective_start_at,effective_end_at,source_revision,source_snapshot,supersedes_adjustment_id,created_by)
    VALUES($1::uuid,$2::uuid,$3,$4,'MISSING_ENTRY',$5,$6::timestamptz,$7::timestamptz,4,
      pg_catalog.jsonb_build_object('locationId',$5::text),$8::uuid,$9)`,
    [adjustment, id, workspace, employee, location, interval.start, interval.end, parent, owner]);
  await q(c, `INSERT INTO public.time_correction_events(id,request_id,revision,event_kind,actor_employee_id,operation_hash,
    adjustment_id,result) VALUES($1::uuid,$2::uuid,2,'APPROVED',$3,repeat('e',64),$1::uuid,'{}'::jsonb)`, [adjustment, id, owner]);
  return { id, adjustment };
}
async function correction(c: F1OwnedCase, f: Awaited<ReturnType<typeof base>>) {
  const result = await preservedRead(c, () => readManagerTimeCorrectionsWithInternalCapture(f.manager, f.executor));
  c.record({operation:'CORRECTION_READER_RESULT_DIAGNOSTIC',viewState:result.view.state,reason:result.view.state==='unavailable'?result.view.reason:null,captureRetained:result.capture!==null});
  assert.equal(result.view.state, 'ready'); assert.ok(result.capture); return result.capture;
}
function unbound(value: ReturnType<typeof prepareCorrectionActionRows>) {
  assert.equal(value.state, 'CAPTURED_UNBOUND'); assert.ok(Object.isFrozen(value));
  for (const hold of ['PROTECTED_F10_READ_REQUIRED','CANONICAL_F6_RELEASE_REQUIRED','CURRENT_SOURCE_BINDING_REQUIRED','AGGREGATE_SOURCE_VERSION_REQUIRED'])
    assert.ok(value.holds.includes(hold as typeof value.holds[number]));
  for (const field of ['proof','meta','readAllowed','destinationAllowed','authorityCurrent','currentVersion','allClear','counts']) assert.ok(!Object.hasOwn(value, field));
}
const clone = <T>(value: T): T => structuredClone(value); // TEST mutation after genuine native observation only.

const CR01: F1NativeCallback = { id: 'CR01', async run(c) {
  const f = await base(c); await entry(c, 'f1-entry');
  const id = await request(c, f.workspaceId, { entry: 'f1-entry' }); const captured = await correction(c, f);
  const [native] = await q(c, `SELECT r.id::text id,r.employee_id,r.location_id,r.created_at::text created_at,
    r.time_entry_id,r.break_entry_id,e.revision FROM public.time_correction_requests r
    JOIN public.time_correction_events e ON e.request_id=r.id WHERE r.id=$1::uuid ORDER BY e.revision DESC LIMIT 1`, [id]);
  const raw = captured.nativeRows.find(r => r.id === id)!; assert.ok(raw);
  assert.deepEqual([raw.employeeId,raw.locationId,raw.createdAt,raw.timeEntryId,raw.breakEntryId,raw.revision],
    [native.employee_id,native.location_id,native.created_at,native.time_entry_id,native.break_entry_id,native.revision]);
  assert.ok(!Object.hasOwn(captured.view.requests[0], 'employeeId'));
  const prepared = prepareCorrectionActionRows(captured); unbound(prepared);
  if(prepared.rows[0].kind!=='TIME_CORRECTION')throw Error('Expected canonical correction row');
  assert.equal(prepared.rows[0].payload.employeeId, member);
  assert.equal(prepared.rows[0].destinationRead, 'attendance.read');
  assert.ok(!JSON.stringify(prepared.rows).includes('Fictional private correction reason'));
  const publicView = await readManagerTimeCorrections(f.manager, f.executor);
  assert.equal(publicView.state, 'ready'); if (publicView.state === 'ready') {
    assert.equal(Object.getPrototypeOf(publicView.requests[0]), Object.prototype);
    assert.equal(Object.getPrototypeOf(captured.view.requests[0]), null);
    assert.deepEqual(copyCanonicalCapture(publicView.requests), captured.view.requests);
  }
  c.record({ vector: 'CR01', nativeIdentityCompared: true, legacyGuardOnly: true });
} };
const CR02: F1NativeCallback = { id: 'CR02', async run(c) {
  const f = await base(c); await entry(c, 'f1-entry', member, 'f1-retained');
  await q(c, `INSERT INTO public.break_entries(id,time_entry_id,break_start_at,break_end_at,version)
    VALUES('f1-break','f1-entry','2020-01-07T13:00:00Z','2020-01-07T13:15:00Z',2)`);
  for (const kind of ['ENTRY_BOUNDARY','BREAK_BOUNDARY'] as const) {
    for (let n=0;n<7;n++) await request(c, f.workspaceId, { kind, entry:'f1-entry',
      ...(kind==='BREAK_BOUNDARY'?{brk:'f1-break'}:{}), location:'f1-retained', rejected:true });
  }
  // Explicit fictional legacy reassignment before capture, not a new production writer.
  await q(c, `UPDATE public.time_entries SET location_id='loc-1',device_id='f1-device-loc-1',version=5 WHERE id='f1-entry'`);
  for (const kind of ['ENTRY_BOUNDARY','BREAK_BOUNDARY'] as const) await request(c, f.workspaceId, { kind, entry:'f1-entry', ...(kind==='BREAK_BOUNDARY'?{brk:'f1-break'}:{}) });
  const captured = await correction(c, f);
  for (const raw of captured.nativeRows) {
    assert.equal(raw.requests.length, 8); assert.ok(raw.locations.some(l=>l.id==='f1-retained'));
    const view = captured.view.requests.find(r=>r.id===raw.id)!;
    assert.equal(view.context.state, 'confirmed'); if(view.context.state==='confirmed') {
      assert.equal(view.context.totalDecisions,7); assert.equal(view.context.decisions.length,5);
    }
  }
  const bad = clone(captured.nativeRows); bad.find(r=>r.kind==='BREAK_BOUNDARY')!.breakTarget!.timeEntryId='another-parent';
  assert.throws(()=>parseCorrectionActionCapture(bad,captured.view,f.workspaceId,owner,30000));
  const foreign = clone(captured.nativeRows); foreign[0].locations[0].workspaceId='unrelated-workspace';
  assert.throws(()=>parseCorrectionActionCapture(foreign,captured.view,f.workspaceId,owner,30000));
  c.record({ vector:'CR02', history:7, displayedDecisions:5, negativeKind:'POST_NATIVE_PURE_AFFINITY_AND_DICTIONARY_FAULT' });
} };
const CR03: F1NativeCallback = { id:'CR03', async run(c) {
  const f=await base(c); const a=await missingAdjustment(c,f.workspaceId,null,'f1-retained');
  const b=await missingAdjustment(c,f.workspaceId,a.adjustment,'loc-2');
  const d=await missingAdjustment(c,f.workspaceId,b.adjustment,'loc-1');
  const unrelated=await missingAdjustment(c,f.workspaceId,null,'loc-2',peer);
  const pending=await request(c,f.workspaceId,{kind:'MISSING_ENTRY',base:b.adjustment});
  const captured=await correction(c,f), raw=captured.nativeRows.find(r=>r.id===pending)!;
  assert.deepEqual(new Set(raw.adjustments.map(r=>r.id)),new Set([a.adjustment,b.adjustment,d.adjustment]));
  assert.ok(!raw.requests.some(r=>r.id===unrelated.id)); assert.ok(!raw.adjustments.some(r=>r.id===unrelated.adjustment));
  assert.deepEqual(new Set(raw.locations.map(r=>r.id)),new Set(['loc-1','loc-2','f1-retained']));
  unbound(prepareCorrectionActionRows(captured)); c.record({vector:'CR03', exactConnectedAdjustments:3, unrelatedExcluded:true});
} };
const CR04: F1NativeCallback = { id:'CR04', async run(c) {
  const f=await base(c); const empty=await correction(c,f); assert.deepEqual(empty.nativeRows,[]);
  for(let n=0;n<100;n++) await request(c,f.workspaceId,{kind:'MISSING_ENTRY'});
  const hundred=await correction(c,f); assert.equal(hundred.nativeRows.length,100);
  // Deliberate TEST wire faults AFTER real canonical SQL. Never a native illegal-constraint claim.
  for(const field of ['revision','context'] as const) {
    let faults=0; const driver:SqlExecutor={...f.executor,async transaction(statements,signal){
      const result=await f.executor.transaction(statements,signal); const index=statements.findIndex(s=>s.text.includes('"internalCapture"'));
      if(index>=0){const changed=clone(result); const row=changed[index][0] as {snapshot:{requests:Record<string,unknown>[]}};
        row.snapshot.requests[0][field]=field==='revision'?0:{state:'invented'}; faults++; return changed;} return result;
    }};
    const rejected=await readManagerTimeCorrectionsWithInternalCapture(f.manager,driver);
    assert.equal(faults,1); assert.deepEqual(rejected,{view:{state:'unavailable',reason:'read_failed'},capture:null});
  }
  const failing:SqlExecutor={...f.executor,async transaction(){throw Error('fictional_test_driver_read_failure');}};
  assert.deepEqual(await readManagerTimeCorrectionsWithInternalCapture(f.manager,failing),{view:{state:'unavailable',reason:'read_failed'},capture:null});
  await request(c,f.workspaceId,{kind:'MISSING_ENTRY'});
  assert.deepEqual(await readManagerTimeCorrectionsWithInternalCapture(f.manager,f.executor),{view:{state:'unavailable',reason:'source_limit'},capture:null});
  assert.deepEqual(await readManagerTimeCorrections(f.manager,f.executor),{state:'unavailable',reason:'source_limit'});
  c.record({vector:'CR04',nativePendingCounts:[0,100,101],postNativeWireFaults:2,testTransportFailure:1});
} };
async function timecard(c:F1OwnedCase,f:Awaited<ReturnType<typeof base>>) {
  const result=await preservedRead(c,()=>readTimecardsWithInternalCapture(f.manager,period,f.executor));
  assert.equal(result.view.state,'ready'); assert.ok(result.capture); return result.capture;
}
async function retainedCard(c:F1OwnedCase,f:Awaited<ReturnType<typeof base>>) {
  await entry(c,'f1-card-entry');
  const [{source}]=await q<{source:Record<string,unknown>}>(c,'SELECT public.nevora_timecard_source($1,$2,$3::date,$4::date) source',[f.workspaceId,member,period.startDate,period.endDate]);
  // Native archived JSON rows are explicit fictional legacy preparation, not a
  // claim that a production FINALIZE command approved this historical sequence.
  for(const [n,location] of ['f1-retained','loc-2'].entries()) await q(c,`INSERT INTO public.timecard_revisions(operation_id,
    workspace_id,employee_id,start_date,end_date,revision,action,actor_employee_id,source_hash,snapshot,command_hash,occurred_at)
    SELECT $1::uuid,$2,$3,$4::date,$5::date,$6::integer,$7,$8,md5(snapshot::text),snapshot,repeat('e',64),
      '2020-01-14T12:00:00Z'::timestamptz+$6::integer*interval '1 second' FROM
      (SELECT pg_catalog.jsonb_set($9::jsonb,'{entries,0,locationId}',pg_catalog.to_jsonb($10::text)) snapshot) s`,
    [randomUUID(),f.workspaceId,member,period.startDate,period.endDate,n+1,n?'FINALIZE':'APPROVE',owner,JSON.stringify(source),location]);
}
const TC01:F1NativeCallback={id:'TC01',async run(c){
  const f=await base(c);await retainedCard(c,f); const captured=await timecard(c,f), prepared=prepareTimecardActionRows(captured);unbound(prepared);
  const row=prepared.rows.find(r=>r.capturedSubjectIds.includes(member))!;assert.ok(row);
  assert.deepEqual(new Set(row.capturedLocationIds),new Set(['loc-1','loc-2','f1-retained']));
  const item=captured.projection.cards.find(r=>r.card.employeeId===member)!;assert.equal(item.state,'FINALIZED');
  const [native]=await q(c,`SELECT revision,source_hash::text hash,snapshot FROM public.timecard_revisions
    WHERE workspace_id=$1 AND employee_id=$2 ORDER BY revision DESC LIMIT 1`,[f.workspaceId,member]);
  assert.equal(item.revision,native.revision);assert.equal(item.sourceHash,native.hash);assert.deepEqual(item.source,native.snapshot);
  assert.equal(row.nativeRowVersion,'2:'+item.sourceHash);
  const current=(captured.currentSources as {employeeId:string;sourceHash:string}[]).find(r=>r.employeeId===member)!;
  const [actual]=await q(c,`SELECT md5(public.nevora_timecard_source($1,$2,$3::date,$4::date)::text) hash`,[f.workspaceId,member,period.startDate,period.endDate]);
  assert.equal(current.sourceHash,actual.hash);assert.notEqual(current.sourceHash,item.sourceHash);
  assert.ok(!JSON.stringify(prepared.rows).includes('actorName'));
  c.record({vector:'TC01',displayedRevision:2,currentAndHistoricalLocationsRetained:true,hashIsAuthority:false});
}};
const TC02:F1NativeCallback={id:'TC02',async run(c){
  const f=await base(c);await entry(c,'f1-card-entry');
  const id=await request(c,f.workspaceId,{entry:'f1-card-entry',location:'f1-retained'});
  const a=await missingAdjustment(c,f.workspaceId,null,'loc-2'), b=await missingAdjustment(c,f.workspaceId,a.adjustment,'f1-retained');
  const countBefore={...caseSqlCounts.get(c.client)!};
  const captured=await timecard(c,f), prepared=prepareTimecardActionRows(captured);unbound(prepared);
  const countAfter={...caseSqlCounts.get(c.client)!};
  const source=(captured.currentSources as {employeeId:string;correctionFootprint:{referencedRequestIds:string[];requests:{id:string}[];adjustments:{id:string}[]}}[]).find(r=>r.employeeId===member)!;
  assert.ok(source.correctionFootprint.referencedRequestIds.includes(id));assert.ok(source.correctionFootprint.requests.some(r=>r.id===a.id));
  assert.ok(source.correctionFootprint.adjustments.some(r=>r.id===b.adjustment));
  assert.ok(prepared.rows.find(r=>r.capturedSubjectIds.includes(member))!.capturedLocationIds.includes('f1-retained'));
  const bad=clone(captured), rows=bad.currentSources as {employeeId:string;correctionFootprint:{requests:{id:string}[]}}[];
  const target=rows.find(r=>r.employeeId===member)!;target.correctionFootprint.requests=target.correctionFootprint.requests.filter(r=>r.id!==id);
  assert.throws(()=>prepareTimecardActionRows(bad));
  c.record({vector:'TC02',nativeFootprintChecked:true,negativeKind:'POST_NATIVE_PURE_MISSING_REFERENCE',
    canonicalReadSql:{queries:countAfter.queries-countBefore.queries,transactions:countAfter.transactions-countBefore.transactions,
      statements:countAfter.statements-countBefore.statements},costLimit:'NO_INTERNAL_PG_FUNCTION_STATEMENT_OR_PERFORMANCE_CLAIM'});
}};
const AT01:F1NativeCallback={id:'AT01',async run(c){
  const f=await base(c);
  // Today's native business-date interval always belongs to canonical seed_ids,
  // even when the root runs before these fictional timestamps (future raw-source
  // signals remain canonical observations, not eligibility/auth assertions).
  const [times]=await q<{start:string;end:string;older:string;date:string}>(c,`WITH d AS (
    SELECT (clock_timestamp() AT TIME ZONE $1)::date date)
    SELECT date::text date,
      pg_catalog.to_char((date+time '12:00') AT TIME ZONE $1 AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') start,
      pg_catalog.to_char((date+time '16:00') AT TIME ZONE $1 AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') "end",
      pg_catalog.to_char((date+time '11:00') AT TIME ZONE $1 AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') older FROM d`,[f.zone]);
  await entry(c,'f1-attendance',member,'loc-1',times.start,times.end);
  await entry(c,'f1-support',member,'loc-2',times.older,times.end);
  const date=times.date;
  await q(c,`INSERT INTO public.schedule_publication_revisions(id,week_start,revision_number,source_type,created_by)
    VALUES('f1-publication',$1::date,1,'PUBLISH',$2)`,[date,owner]);
  await q(c,`INSERT INTO public.schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,
    location_id,employee_id,date,start_time,end_time)
    VALUES('f1-published-shift','f1-publication','f1-source-shift','f1-retained-schedule','f1-retained',$1,$2::date,
    ($3::timestamptz AT TIME ZONE $5)::time,($4::timestamptz AT TIME ZONE $5)::time)`,[member,date,times.start,times.end,f.zone]);
  const [preparedContext]=await q<{context:unknown}>(c,`SELECT pg_catalog.jsonb_build_object('version',1,
    'employeeId',sh.employee_id,'locationId',sh.location_id,'workspaceId',l.workspace_id,'timeZone',w.time_zone,
    'windowStartAt',$1::text,'windowEndAt',$2::text,'reviewedRevisionIds',pg_catalog.jsonb_build_array(r.id),
    'candidates',pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('revisionId',r.id,'revisionNumber',r.revision_number,
      'publishedShiftId',sh.id,'sourceShiftId',sh.source_shift_id,'scheduleId',sh.schedule_id,'positionId',sh.position_id,
      'positionName',sh.position_name,'startAt',$1::text,'endAt',$2::text,'uncertain',false))) context
    FROM public.schedule_publication_revision_shifts sh JOIN public.schedule_publication_revisions r ON r.id=sh.revision_id
    JOIN public.locations l ON l.id=sh.location_id JOIN public.workspaces w ON w.id=l.workspace_id
    WHERE sh.id='f1-published-shift'`,[times.start,times.end]);
  // Use the actual unchanged native capture trigger/resolver, not a synthetic
  // successful helper. This GUC is fixture schedule snapshot input, NOT auth.
  try {
    await q(c,"SELECT pg_catalog.set_config('nevora.clocker_schedule_capture',$1,false)",[JSON.stringify(preparedContext.context)]);
    await entry(c,'f1-retained-attendance',member,'f1-retained',times.start,times.end);
  } finally { await q(c,"SELECT pg_catalog.set_config('nevora.clocker_schedule_capture','',false)"); }
  const capturedResult=await preservedRead(c,()=>readAttendanceReviewWithInternalCapture(f.manager,f.executor));
  assert.equal(capturedResult.view.state,'ready');assert.ok(capturedResult.capture);const captured=capturedResult.capture;
  assert.deepEqual(new Set(captured.source.entries.map(r=>r.id)),new Set(['f1-attendance','f1-support','f1-retained-attendance']));
  assert.equal(captured.source.publications.length,1);assert.equal(captured.source.publications[0].locationId,'f1-retained');
  const [publication]=await q(c,`SELECT id,revision_id,location_id,employee_id FROM public.schedule_publication_revision_shifts WHERE id='f1-published-shift'`);
  assert.deepEqual([captured.source.publications[0].publishedShiftId,captured.source.publications[0].revisionId,
    captured.source.publications[0].locationId,captured.source.publications[0].employeeId],
    [publication.id,publication.revision_id,publication.location_id,publication.employee_id]);
  assert.deepEqual(projectAttendance(captured.source),captured.projection);
  const prepared=prepareAttendanceActionRows(captured);unbound(prepared);
  assert.ok(prepared.rows.length>0);assert.ok(prepared.rows.every(r=>r.capturedLocationIds.includes('loc-1')&&r.capturedLocationIds.includes('loc-2')&&r.capturedLocationIds.includes('f1-retained')));
  assert.ok(captured.validForMs>0);assert.ok(captured.validForMs<=45000);
  const bad=clone(captured);bad.projection.groups[0].observations=[];assert.throws(()=>prepareAttendanceActionRows(bad));
  c.record({vector:'AT01',nativeOverlap:true,nativeHistoricalPublication:true,postNativeProjectionFault:true});
}};
async function schedule(c:F1OwnedCase,f:Awaited<ReturnType<typeof base>>) {
  const week='2030-10-07';
  await q(c,`INSERT INTO public.positions(id,workspace_id,name) VALUES('f1-position',$1,'Fictional Position')`,[f.workspaceId]);
  for(const id of [owner,member,peer])await q(c,`INSERT INTO public.employee_positions VALUES($1,'f1-position')`,[id]);
  await q(c,`INSERT INTO public.schedules(id,location_id,week_start,created_by) VALUES
    ('f1-schedule-a','loc-1',$1::date,$2),('f1-schedule-b','loc-2',$1::date,$2)`,[week,owner]);
  for(const [id,scheduleId,who,start,end] of [
    ['f1-shift-midnight','f1-schedule-a',member,'20:00','24:00'],
    ['f1-shift-2359','f1-schedule-a',peer,'20:00','23:59'],
    ['f1-shift-overnight','f1-schedule-b',member,'23:00','01:00'],
  ])await q(c,`INSERT INTO public.shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id)
    VALUES($1,$2,$3,$4::date,$5::time,$6::time,'f1-position')`,[id,scheduleId,who,week,start,end]);
  return week;
}
async function scheduling(c:F1OwnedCase,f:Awaited<ReturnType<typeof base>>,week:string) {
  const result=await preservedRead(c,()=>loadManagerDashboardDataWithInternalCapture(week,f.manager,f.executor));
  assert.ok(result.capture);return result;
}
const SC01:F1NativeCallback={id:'SC01',async run(c){
  const f=await base(c),week=await schedule(c,f),r=await scheduling(c,f,week),s=r.capture!;
  assert.deepEqual(r.view.managerActions,buildManagerActionItems(s.actionInput));
  const health=calculateScheduleHealth({positions:s.positions,
    shifts:s.healthShifts.filter(x=>!x.isCalloutApproved).map(x=>({id:x.id,employeeId:x.employeeId,employeeName:x.employeeName,
      locationId:x.locationId,date:x.date,startTime:x.startTime,endTime:x.endTime,positionId:x.positionId,isDesignatedLead:x.isDesignatedLead})),
    locations:s.staffingSettings.map(x=>({id:x.locationId,name:x.locationName,minimumStaffPerShift:x.minimumStaffPerShift,requiresDesignatedLead:x.requiresDesignatedLead})),
    employees:s.employeeTargets.map(x=>({id:x.employeeId,name:x.employeeName,eligibleLocationIds:x.eligibleLocationIds,positionIds:x.positionIds,
      role:x.role,active:true,targetWeeklyHours:x.targetWeeklyHours})),coverageWindows:s.coverageWindows,weekDates:weekDates(week)});
  assert.deepEqual(s.actionInput.coverageGaps,health.coverageBlocks.filter(b=>!b.covered).map(b=>({key:b.key,locationId:b.locationId,
    locationName:b.locationName,date:b.date,startTime:b.startTime,endTime:b.endTime,gap:b.gap,positionCoverage:b.positionCoverage,requiresLead:b.requiresLead&&!b.leadCovered})));
  const native=await q<{id:string;start:string;end:string}>(c,`SELECT id,start_time::text start,end_time::text "end" FROM public.shifts ORDER BY id`);
  for(const n of native){const actual=s.healthShifts.find(x=>x.id===n.id)!;assert.ok(actual);assert.equal(actual.startTime,n.start.slice(0,5));assert.equal(actual.endTime,n.end.slice(0,5));}
  assert.ok(s.healthShifts.some(x=>x.endTime==='24:00'));assert.ok(s.healthShifts.some(x=>x.endTime==='23:59'));assert.ok(s.healthShifts.some(x=>x.startTime==='23:00'&&x.endTime==='01:00'));
  const publicResult=await loadManagerDashboardData(week,f.manager,f.executor);assert.deepEqual(publicResult.managerActions,r.view.managerActions);assert.deepEqual(publicResult.dashboard,r.view.dashboard);
  unbound(prepareSchedulingActionRows(s));c.record({vector:'SC01',nativeTimes:['24:00','23:59','01:00'],canonicalCalculationsReused:true});
}};
const SC02:F1NativeCallback={id:'SC02',async run(c){
  const f=await base(c),week=await schedule(c,f);
  await q(c,`INSERT INTO public.time_off_requests(id,employee_id,start_date,end_date,reason,status)
    VALUES('f1-timeoff',$1,$2::date,$2::date,'Fictional private time-off reason','PENDING')`,[member,week]);
  await q(c,`INSERT INTO public.shift_exchanges(id,kind,source_shift_id,requested_by_employee_id,target_employee_id,target_shift_id,status)
    VALUES('f1-exchange','SWAP','f1-shift-midnight',$1,$2,'f1-shift-2359','MANAGER_PENDING')`,[member,peer]);
  const r=await scheduling(c,f,week),prepared=prepareSchedulingActionRows(r.capture!);unbound(prepared);
  const off=prepared.rows.find(x=>x.sourceId==='TIME_OFF:f1-timeoff')!;assert.ok(off);
  if(off.kind!=='REQUEST')throw Error('Expected canonical request row');assert.equal(off.payload.employeeId,member);
  assert.equal(off.nativeRowVersion,null);assert.deepEqual(off.capturedLocationIds,[]);assert.ok(off.holds.includes('REQUEST_HISTORY_FOOTPRINT_REQUIRED'));
  const nativeExchange=r.capture!.pendingExchanges.find(x=>x.id==='f1-exchange');
  assert.ok(nativeExchange,'Actual canonical exchange mapper must expose its native pending row; do not invent an actionable/default policy.');
  const exchange=prepared.rows.find(x=>x.sourceId==='EXCHANGE:f1-exchange')!;assert.ok(exchange);
  assert.deepEqual(new Set(exchange.capturedSubjectIds),new Set([nativeExchange.requestedByEmployeeId,nativeExchange.sourceShift.employeeId,nativeExchange.targetShift!.employeeId]));
  assert.ok(exchange.holds.includes('REQUEST_HISTORY_FOOTPRINT_REQUIRED'));
  assert.ok(!JSON.stringify(prepared.rows).includes('Fictional private time-off reason'));
  c.record({vector:'SC02',nativeIdentitiesOnly:true,retainedHistoryAndCurrentAuthority:'HELD'});
}};
const PB01:F1NativeCallback={id:'PB01',async run(c){
  const f=await base(c);await entry(c,'f1-entry');await request(c,f.workspaceId,{entry:'f1-entry'});
  assert.deepEqual(await readManagerTimeCorrectionsWithInternalCapture(f.employee,f.executor),
    {view:{state:'unavailable',reason:'access_denied'},capture:null});
  const self=await readTimecards(f.employee,period,f.executor);assert.equal(self.state,'ready');
  if(self.state==='ready')assert.deepEqual(self.cards.map(x=>x.card.employeeId),[member]);
  // Native role/lifecycle/session denials: no fake error sentinel or authority.
  for(const mutation of [
    `UPDATE public.employees SET role='EMPLOYEE' WHERE id='${owner}'`,
    `UPDATE public.employees SET active=false WHERE id='${owner}'`,
    `UPDATE public.employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE employee_id='${owner}'`,
    `DELETE FROM public.employee_sessions WHERE employee_id='${owner}'`,
  ]){
    await q(c,'BEGIN ISOLATION LEVEL READ COMMITTED');await q(c,mutation);await q(c,'COMMIT');
    const correctionResult=await readManagerTimeCorrectionsWithInternalCapture(f.manager,f.executor);
    assert.deepEqual(correctionResult,{view:{state:'unavailable',reason:'access_denied'},capture:null});
    assert.deepEqual(await readAttendanceReviewWithInternalCapture(f.manager,f.executor),{view:{state:'unavailable',reason:'access_denied'},capture:null});
    assert.deepEqual(await readTimecardsWithInternalCapture(f.manager,period,f.executor),{view:{state:'unavailable',reason:'access_denied'},capture:null});
    // Restore only this explicit fictional mutable lifecycle. Hard-delete tested
    // last; fresh native session insert is preparation, never a retained token revival claim.
    if(mutation.startsWith('DELETE')) break;
    await q(c,`UPDATE public.employees SET role='OWNER',active=true WHERE id=$1`,[owner]);
    await q(c,`UPDATE public.employee_sessions SET expires_at=clock_timestamp()+interval '1 day' WHERE employee_id=$1`,[owner]);
  }
  c.record({vector:'PB01',nativeLegacyLifecycleDenials:4,F10Proof:false});
}};
const PB02:F1NativeCallback={id:'PB02',async run(c){
  // Full current pins are checked by the root source overlay before invocation.
  // Reassert exact old semantic spans locally; do not execute mutations to prove
  // source preservation or silently replace the historical source with a clone.
  for(const pin of sourcePins.preservedSpans){const source=readFileSync(pin.path,'utf8');
    const start=source.indexOf(pin.start),end=source.indexOf(pin.end,start+pin.start.length);
    assert.ok(start>=0&&end>start);const text=source.slice(start,end);
    assert.equal(hash(pin.stripTrailingNewlines?text.replace(/\n+$/,''):text),pin.sha256,pin.label);}
  const f=await base(c);await entry(c,'f1-entry');await request(c,f.workspaceId,{entry:'f1-entry'});
  const before=await wholeSource(c);
  const a=await readManagerTimeCorrections(f.manager,f.executor),b=await readManagerTimeCorrectionsWithInternalCapture(f.manager,f.executor);
  assert.equal(a.state,'ready');assert.equal(b.view.state,'ready');if(a.state==='ready'&&b.view.state==='ready')assert.deepEqual(a.requests,b.view.requests);
  assert.ok(!Object.hasOwn(a,'capture'));if(a.state==='ready')assert.ok(a.requests.every(x=>!Object.hasOwn(x,'employeeId')));
  const tc=await readTimecards(f.manager,period,f.executor);assert.equal(tc.state,'ready');assert.ok(!Object.hasOwn(tc,'currentSources'));
  const at=await readAttendanceReview(f.manager,f.executor);assert.ok(!Object.hasOwn(at,'source'));
  assert.deepEqual(await wholeSource(c),before);c.record({vector:'PB02',publicWrappersChecked:true,sourceSpanEquality:true});
}};
const F1GATE:F1NativeCallback={id:'F1GATE',async run(c){
  const f=await base(c);await entry(c,'f1-entry');await request(c,f.workspaceId,{entry:'f1-entry'});
  const captured=await correction(c,f),prepared=prepareCorrectionActionRows(captured);unbound(prepared);
  const bundle=prepareCanonicalActionSources({workspaceId:f.workspaceId,actorEmployeeId:owner,
    scheduling:{state:'loading'},attendance:{state:'unavailable',reason:'READ_FAILED'},
    corrections:{state:'captured',capture:captured},timecards:{state:'loading'}});
  assert.equal(bundle[2].state,'CAPTURED_UNBOUND');assert.equal(bundle[1].state,'unavailable');
  // Actual private issuer lookup must reject these inert observations/clones.
  for(const value of [prepared,clone(prepared),f.manager,clone(f.manager)])assert.throws(()=>getTenantProofFacts(value as unknown as TenantProof));
  const foreign=prepareCanonicalActionSources({workspaceId:'other-workspace',actorEmployeeId:owner,
    scheduling:{state:'loading'},attendance:{state:'loading'},corrections:{state:'captured',capture:captured},timecards:{state:'loading'}});
  assert.equal(Object.getPrototypeOf(foreign[2]),null);
  assert.deepEqual(foreign[2],copyCanonicalCapture({source:'corrections',state:'unavailable',reason:'INVALID_SOURCE'}));
  const wrongActor=prepareCanonicalActionSources({workspaceId:f.workspaceId,actorEmployeeId:peer,
    scheduling:{state:'loading'},attendance:{state:'loading'},corrections:{state:'captured',capture:captured},timecards:{state:'loading'}});
  assert.equal(Object.getPrototypeOf(wrongActor[2]),null);
  assert.deepEqual(wrongActor[2],copyCanonicalCapture({source:'corrections',state:'unavailable',reason:'INVALID_SOURCE'}));
  c.record({vector:'F1GATE',observationsNotProof:true,genuineF10F6Positive:'OPEN_NOT_EXECUTED_OR_IMPLEMENTED',sameDatabaseABPositive:'OPEN_ORIGINAL_SINGLETON_PRESERVED'});
}};

// Twelve concrete callbacks, not twelve native results. Root retains actual
// source overlays, owned resources, installed test transport and cleanup.
export const F1_CANONICAL_NATIVE_CALLBACKS: readonly F1NativeCallback[] = Object.freeze([
  CR01,CR02,CR03,CR04,TC01,TC02,AT01,SC01,SC02,PB01,PB02,F1GATE,
].map(x=>Object.freeze(x)));
