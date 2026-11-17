import { afterEach, beforeEach, expect, it } from 'vitest';
import { companyAccessFixture } from '@/test/integration/company-access-fixture';
import { configured, fictionalProfile } from '@/test/fixtures/shift-changes';
import { AdvisorStore } from './store.server';
import { admitOwner } from './authority.server';
import { captureCoverageSource, coverageSourceVersion } from './coverage-plan.server';
import { mapGenerationSource } from '@/lib/data/schedule-generation-snapshot';
import { compareWeeklyPlans } from './weekly-plan.server';
import { prepareReviewedWeeklyDraft, reviewWeeklyDraft } from '@/lib/data/reviewed-weekly-draft.server';
import { weeklyDigest } from './weekly-digest.server';
import type { WeeklyScope } from './weekly-contracts';
import { generationNeedKey } from '@/lib/scheduling/generation-claims';

let f: Awaited<ReturnType<typeof companyAccessFixture>>;
const weekStart = '2026-11-16';
const signal = () => new AbortController().signal;
beforeEach(async () => {
  f = await companyAccessFixture();
  await f.q(`UPDATE location_staffing_settings SET minimum_staff_per_shift=1,requires_designated_lead=false;
    INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('week-worker','Weekly','QA','555009','EMPLOYEE','loc-1');
    INSERT INTO positions(id,workspace_id,name) VALUES('week-barista','workspace-fuel','Barista');
    INSERT INTO employee_positions(employee_id,position_id) VALUES('target','week-barista');
    INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES('target','loc-1'),('target','loc-2'),('week-worker','loc-1');
    INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) VALUES('mon-one','loc-1',1,'08:00','12:00'),('mon-two','loc-2',1,'08:00','12:00'),('tue-one','loc-1',2,'08:00','12:00'),('tue-two','loc-2',2,'08:00','12:00');
    INSERT INTO coverage_window_position_requirements(coverage_window_id,position_id,quantity) VALUES('mon-two','week-barista',1),('tue-two','week-barista',1);
    INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) VALUES('week-av-one','target',1,'08:00','12:00'),('week-av-two','week-worker',1,'08:00','12:00'),('week-av-three','target',2,'08:00','12:00'),('week-av-four','week-worker',2,'08:00','12:00');
    INSERT INTO weekly_availability_submissions(employee_id,week_start,uses_normal_availability) VALUES('target','2026-11-16',true),('week-worker','2026-11-16',true);`);
  await f.q("INSERT INTO employee_scheduling_settings(employee_id,maximum_weekly_hours,operational_rule_profile) VALUES('target',40,$1::jsonb),('week-worker',40,$1::jsonb)", [JSON.stringify(fictionalProfile())]);
});
afterEach(async () => { await f?.db.dispose(); });
async function selection(mode: 'FILL_GAPS_ONLY' | 'BUILD_WEEK' = 'FILL_GAPS_ONLY', locationScope: WeeklyScope = { kind: 'ALL' }) {
  const store = new AdvisorStore(f.owner, await admitOwner(f.owner, f.db.executor), f.db.executor);
  const { source, observedAt } = await captureCoverageSource(store, signal());
  const { input } = mapGenerationSource({ workspaceId: store.original.workspace.id, actorEmployeeId: 'owner', weekStart, mode, locationScope }, source, observedAt);
  const draft = await compareWeeklyPlans(input, { weekStart, observedAt, sourceVersion: coverageSourceVersion(source), contextDigest: weeklyDigest({ fixture: 'writer' }), validUntil: null }, signal());
  expect(draft.reviews[0].review.status).toBe('COMPLETE');
  return { source, input, observedAt, terms: draft.reviews[0].terms };
}
async function prepared(mode: 'FILL_GAPS_ONLY' | 'BUILD_WEEK' = 'FILL_GAPS_ONLY') {
  const p = await selection(mode);
  return { ...p, batch: prepareReviewedWeeklyDraft({ ...p, proof: f.owner }) };
}
const execute = (batch: ReturnType<typeof prepareReviewedWeeklyDraft>) => f.db.executor.transaction([...batch.guards, ...batch.statements], signal());

it('saves a joint two-date/two-location exact set and rejects repeating the old prepared source', async () => {
  const p = await prepared(); expect(p.terms.additions).toHaveLength(4);
  await execute(p.batch);
  expect(await f.q('SELECT employee_id,date::text,location_id,start_time::text,end_time::text FROM shifts JOIN schedules ON schedules.id=shifts.schedule_id ORDER BY date,location_id'))
    .toEqual([{ employee_id: 'week-worker', date: '2026-11-16', location_id: 'loc-1', start_time: '08:00:00', end_time: '12:00:00' },
      { employee_id: 'target', date: '2026-11-16', location_id: 'loc-2', start_time: '08:00:00', end_time: '12:00:00' },
      { employee_id: 'week-worker', date: '2026-11-17', location_id: 'loc-1', start_time: '08:00:00', end_time: '12:00:00' },
      { employee_id: 'target', date: '2026-11-17', location_id: 'loc-2', start_time: '08:00:00', end_time: '12:00:00' }]);
  expect(await f.q("SELECT count(*)::int n FROM shifts WHERE assignment_origin='GENERATED' AND assignment_episode_id IS NOT NULL AND terms_revision=1")).toEqual([{ n: 4 }]);
  await expect(execute(p.batch)).rejects.toThrow();
  expect(await f.q('SELECT (SELECT count(*)::int FROM shifts) shifts,(SELECT count(*)::int FROM notifications) notifications,(SELECT count(*)::int FROM schedule_publication_revisions) publications')).toEqual([{ shifts: 4, notifications: 0, publications: 0 }]);
});

it('keeps exact generated identities when a rebuild makes no changes', async () => {
  const first = await prepared(); await execute(first.batch);
  const before = await f.q('SELECT * FROM shifts ORDER BY id');
  const p = await selection('BUILD_WEEK');
  expect(p.terms.additions).toEqual([]); expect(p.terms.removals).toEqual([]);
  expect(reviewWeeklyDraft(p.input, p.terms).allowed).toBe(true);
  expect(await f.q('SELECT * FROM shifts ORDER BY id')).toEqual(before);
});

it('rejects a stale complete source before saving any of the week', async () => {
  const p = await prepared(); await f.q("UPDATE employees SET first_name='Changed' WHERE id='target'");
  await expect(execute(p.batch)).rejects.toThrow();
  expect(await f.q('SELECT count(*)::int n FROM shifts')).toEqual([{ n: 0 }]);
});

it('rejects a suppressed child insert and rolls back even the new parent schedules', async () => {
  const p = await prepared();
  await f.q("CREATE FUNCTION suppress_weekly_shift() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RETURN NULL; END$$; CREATE TRIGGER suppress_weekly_shift BEFORE INSERT ON shifts FOR EACH ROW EXECUTE FUNCTION suppress_weekly_shift()");
  await expect(execute(p.batch)).rejects.toThrow();
  expect(await f.q('SELECT (SELECT count(*)::int FROM shifts) shifts,(SELECT count(*)::int FROM schedules) schedules')).toEqual([{ shifts: 0, schedules: 0 }]);
});

it('rejects source episode custody changes rather than deleting a replacement assignment', async () => {
  const first = await prepared(); await execute(first.batch);
  const p = await selection('BUILD_WEEK');
  const row = p.input.ledger[0];
  const forged = { ...p.terms, removals: [{ shiftId: row.id, scheduleId: row.scheduleId, assignmentEpisodeId: 'wrong-episode',
    employeeId: row.employeeId, locationId: row.locationId, date: row.date, startTime: row.startTime, endTime: row.endTime, positionId: row.positionId ?? null, isDesignatedLead: !!row.isDesignatedLead }] };
  expect(() => reviewWeeklyDraft(p.input, forged)).toThrow();
  expect(await f.q('SELECT count(*)::int n FROM shifts')).toEqual([{ n: 4 }]);
});

async function shortGenerated() {
  const p = await selection(), addition = structuredClone(p.terms.additions.find(a => a.employeeId === 'week-worker' && a.date === '2026-11-16')!);
  addition.generatedClaims.claims.forEach(c => { c.coveredEnd = '2026-11-16T10:00'; });
  await f.q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('short-parent','loc-1','2026-11-16','DRAFT','owner')");
  await f.q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,assignment_origin,generated_claims) VALUES('short-generated','short-parent','week-worker','2026-11-16','08:00','10:00','GENERATED',$1::jsonb)", [JSON.stringify(addition.generatedClaims)]);
}

it('replaces exactly the reviewed eligible generated row in a complete weekly rebuild', async () => {
  await shortGenerated();
  const p = await prepared('BUILD_WEEK');
  expect(p.terms.removals.map(r => r.shiftId)).toEqual(['short-generated']); expect(p.terms.additions).toHaveLength(4);
  await execute(p.batch);
  expect(await f.q("SELECT count(*)::int n FROM shifts WHERE id='short-generated'")).toEqual([{ n: 0 }]);
  expect(await f.q('SELECT count(*)::int n FROM shifts')).toEqual([{ n: 4 }]);
  expect(p.batch.removedIdentityCustody[0]).toMatchObject({ shiftId: 'short-generated', date: '2026-11-16', startTime: '08:00', endTime: '10:00' });
});

it('preserves manual, history-protected and foreign-week rows byte-for-byte during rebuild', async () => {
  const initial = await selection();
  const current = initial.terms.additions.find(a => a.employeeId === 'week-worker' && a.date === '2026-11-17')!.generatedClaims;
  const foreign = structuredClone(current);
  foreign.claims.forEach(c => { c.needStart = '2026-11-09T08:00'; c.needEnd = '2026-11-09T12:00'; c.coveredStart = c.needStart; c.coveredEnd = c.needEnd;
    c.needKey = generationNeedKey({ workspaceId: initial.input.workspace.id, timeZone: initial.input.workspace.timeZone, weekStart: '2026-11-09', locationId: 'loc-1' }, c); });
  await f.q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('kept-parent','loc-1','2026-11-16','DRAFT','owner'),('foreign-parent','loc-1','2026-11-09','DRAFT','owner')");
  await f.q(`INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,assignment_origin,notes,generated_claims) VALUES
      ('manual-kept','kept-parent','week-worker','2026-11-16','08:00','12:00','MANAGER','Fictional manager note',NULL),
      ('history-kept','kept-parent','week-worker','2026-11-17','08:00','12:00','GENERATED',NULL,$1::jsonb),
      ('foreign-kept','foreign-parent','week-worker','2026-11-09','08:00','12:00','GENERATED',NULL,$2::jsonb)`, [JSON.stringify(current), JSON.stringify(foreign)]);
  await f.q("INSERT INTO shift_callouts(id,shift_id,employee_id,reason_code,status,reviewed_by,reviewed_at) VALUES('kept-history','history-kept','week-worker','OTHER','DENIED','owner',clock_timestamp())");
  const before = await f.q('SELECT * FROM shifts ORDER BY id'), parents = await f.q('SELECT * FROM schedules ORDER BY id');
  const p = await prepared('BUILD_WEEK');
  expect(p.terms.removals).toEqual([]); expect(p.terms.additions).toHaveLength(2);
  await execute(p.batch);
  expect(await f.q("SELECT * FROM shifts WHERE id IN('manual-kept','history-kept','foreign-kept') ORDER BY id")).toEqual(before);
  expect(await f.q("SELECT * FROM schedules WHERE id IN('kept-parent','foreign-parent') ORDER BY id")).toEqual(parents);
});

it('preserves unselected location commitments while saving the selected scope', async () => {
  await f.q(`INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('unselected-parent','loc-2','2026-11-16','DRAFT','owner');
    INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id,notes) VALUES
      ('unselected-mon','unselected-parent','target','2026-11-16','08:00','12:00','week-barista','Fictional retained note'),
      ('unselected-tue','unselected-parent','target','2026-11-17','08:00','12:00','week-barista',NULL);`);
  const before = await f.q('SELECT * FROM shifts ORDER BY id');
  const p = await selection('BUILD_WEEK', { kind: 'SELECTED', locationIds: ['loc-1'] });
  expect(p.terms.additions).toHaveLength(2); expect(p.terms.additions.every(a => a.locationId === 'loc-1')).toBe(true);
  await execute(prepareReviewedWeeklyDraft({ ...p, proof: f.owner }));
  expect(await f.q("SELECT * FROM shifts WHERE schedule_id='unselected-parent' ORDER BY id")).toEqual(before);
});

it('rolls back both removals and additions if a reviewed deletion is suppressed', async () => {
  await shortGenerated(); const p = await prepared('BUILD_WEEK'), before = await f.q('SELECT * FROM shifts ORDER BY id');
  await f.q("CREATE FUNCTION suppress_weekly_delete() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RETURN NULL; END$$; CREATE TRIGGER suppress_weekly_delete BEFORE DELETE ON shifts FOR EACH ROW EXECUTE FUNCTION suppress_weekly_delete()");
  await expect(execute(p.batch)).rejects.toThrow();
  expect(await f.q('SELECT * FROM shifts ORDER BY id')).toEqual(before);
  expect(await f.q('SELECT count(*)::int n FROM schedules')).toEqual([{ n: 1 }]);
});

it('rolls back all changes if a child trigger alters even an unreviewed foreign row', async () => {
  await f.q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('foreign-parent','loc-1','2026-11-09','DRAFT','owner'); INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,notes) VALUES('foreign-kept','foreign-parent','week-worker','2026-11-09','08:00','12:00','Unchanged fictional note')");
  const p = await prepared(), before = await f.q('SELECT * FROM shifts ORDER BY id');
  await f.q("CREATE FUNCTION alter_foreign_weekly() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN UPDATE shifts SET notes='Wrong mutation' WHERE id='foreign-kept'; RETURN NEW; END$$; CREATE TRIGGER alter_foreign_weekly AFTER INSERT ON shifts FOR EACH ROW EXECUTE FUNCTION alter_foreign_weekly()");
  await expect(execute(p.batch)).rejects.toThrow(); expect(await f.q('SELECT * FROM shifts ORDER BY id')).toEqual(before);
});

it('rolls back the entire set when later receipt work in the same transaction fails', async () => {
  const p = await prepared();
  await expect(f.db.executor.transaction([...p.batch.guards, ...p.batch.statements, { text: "SELECT 'fictional_receipt_failure'::integer", values: [] }], signal())).rejects.toThrow();
  expect(await f.q('SELECT (SELECT count(*)::int FROM shifts) shifts,(SELECT count(*)::int FROM schedules) schedules')).toEqual([{ shifts: 0, schedules: 0 }]);
});

it('rejects a removed manual assignment even if its caller forges the retained digest', async () => {
  await f.q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('manual-parent','loc-1','2026-11-16','DRAFT','owner'); INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('manual-kept','manual-parent','week-worker','2026-11-16','08:00','12:00')");
  const p = await selection('BUILD_WEEK'), current = p.input.ledger.find(s => s.id === 'manual-kept')!;
  const terms = structuredClone(p.terms);
  terms.retainedDigest = weeklyDigest(p.input.ledger.filter(s => s.id !== current.id));
  terms.removals.push({ shiftId: current.id, scheduleId: current.scheduleId, assignmentEpisodeId: current.assignmentEpisodeId ?? null,
    employeeId: current.employeeId, locationId: current.locationId, date: current.date, startTime: current.startTime, endTime: current.endTime, positionId: current.positionId ?? null, isDesignatedLead: !!current.isDesignatedLead });
  expect(() => reviewWeeklyDraft(p.input, terms)).toThrow();
});

it('reports retained hard-rule violations instead of treating complete coverage as clearance', async () => {
  const first = await prepared(); await execute(first.batch);
  const p = await selection();
  p.input.employees.find(e => e.id === 'target')!.maximumWeeklyHours = 4;
  const result = reviewWeeklyDraft(p.input, p.terms);
  expect(result.coverage.remainingBlocks).toBe(0); expect(result.allowed).toBe(false);
  expect(result.issues.some(i => i.category === 'RETAINED' && i.code === 'MAX_WEEKLY_HOURS' && i.blocks)).toBe(true);
});

it('does not trust a caller-edited eligibility projection when preparing actual writes', async () => {
  const p = await selection();
  p.input.employees.find(e => e.id === 'target')!.maximumWeeklyHours = 1;
  expect(reviewWeeklyDraft(p.input, p.terms).allowed).toBe(false);
  // Authoritative captured source still says40h; the builder derives it again.
  const batch = prepareReviewedWeeklyDraft({ ...p, proof: f.owner }); await execute(batch);
  expect(await f.q('SELECT count(*)::int n FROM shifts')).toEqual([{ n: 4 }]);
});

it('refuses a legal shorter replacement that loses a previously fulfilled coverage obligation', async () => {
  const first = await prepared(); await execute(first.batch);
  const p = await selection('BUILD_WEEK'), old = p.input.ledger.find(s => s.employeeId === 'week-worker' && s.date === '2026-11-16')!;
  const replacement = structuredClone(first.terms.additions.find(a => a.employeeId === 'week-worker' && a.date === '2026-11-16')!);
  replacement.endTime = '10:00'; replacement.generatedClaims.claims.forEach(c => { c.coveredEnd = '2026-11-16T10:00'; });
  const terms = { additions: [replacement], removals: [{ shiftId: old.id, scheduleId: old.scheduleId, assignmentEpisodeId: old.assignmentEpisodeId ?? null,
    employeeId: old.employeeId, locationId: old.locationId, date: old.date, startTime: old.startTime, endTime: old.endTime, positionId: old.positionId ?? null, isDesignatedLead: !!old.isDesignatedLead }],
    retainedDigest: weeklyDigest(p.input.ledger.filter(s => s.id !== old.id)) };
  const checked = reviewWeeklyDraft(p.input, terms);
  expect(checked.allowed).toBe(false);
  expect(checked.coverageRegressions).toEqual(['STAFFING']);
  expect(() => prepareReviewedWeeklyDraft({ ...p, terms, proof: f.owner })).toThrow();
});

it('rejects unnecessary delete-and-reinsert of the same generated terms and claims', async () => {
  const first = await prepared(); await execute(first.batch);
  const p = await selection('BUILD_WEEK'), old = p.input.ledger.find(s => s.employeeId === 'week-worker' && s.date === '2026-11-16')!;
  const same = structuredClone(first.terms.additions.find(a => a.employeeId === old.employeeId && a.date === old.date)!);
  const terms = { additions: [same], removals: [{ shiftId: old.id, scheduleId: old.scheduleId, assignmentEpisodeId: old.assignmentEpisodeId ?? null,
    employeeId: old.employeeId, locationId: old.locationId, date: old.date, startTime: old.startTime, endTime: old.endTime, positionId: old.positionId ?? null, isDesignatedLead: !!old.isDesignatedLead }],
    retainedDigest: weeklyDigest(p.input.ledger.filter(s => s.id !== old.id)) };
  expect(() => reviewWeeklyDraft(p.input, terms)).toThrow();
});

it('checks adjacent-week rest and whole-week hours against the complete final ledger', async () => {
  const p = await selection();
  const adjacent = structuredClone(p.input);
  adjacent.employees.find(e => e.id === 'target')!.operationalProfile = { ...fictionalProfile(), minimumRest: configured({ minutes: 660, timeBasis: 'ELAPSED' }) };
  adjacent.ledger.push({ ...p.terms.additions.find(a => a.employeeId === 'target')!, positionId: 'week-barista', id: 'prior-night',
    scheduleId: 'prior-parent', scheduleStatus: 'PUBLISHED', assignmentOrigin: 'MANAGER', date: '2026-11-15', startTime: '22:00', endTime: '02:00',
    hasExchangeHistory: false, hasCalloutHistory: false, hasPublicationHistory: true });
  const rest = reviewWeeklyDraft(adjacent, { ...p.terms, retainedDigest: weeklyDigest(adjacent.ledger) });
  expect(rest.allowed).toBe(false);
  expect(rest.issues.some(i => i.category === 'ADDITION' && i.code === 'MIN_REST' && i.blocks)).toBe(true);
  const hours = structuredClone(p.input); hours.employees.find(e => e.id === 'target')!.maximumWeeklyHours = 4;
  const limited = reviewWeeklyDraft(hours, p.terms);
  expect(limited.allowed).toBe(false);
  expect(limited.issues.some(i => i.code === 'MAX_WEEKLY_HOURS' && i.blocks)).toBe(true);
});

it('checks enforceable restrictions and coupled automatic capacity without searching for substitutions', async () => {
  const p = await selection();
  const restricted = structuredClone(p.input);
  restricted.employees.find(e => e.id === 'target')!.managementRestrictions = [{ id: 'confirmed', effectiveWeek: weekStart,
    unavailable: [{ dayOfWeek: 1, startTime: '00:00', endTime: '24:00' }] }];
  const result = reviewWeeklyDraft(restricted, p.terms);
  expect(result.allowed).toBe(false);
  expect(result.issues.some(i => i.blocks && i.code === 'AGREED_RESTRICTION')).toBe(true);
  const capacity = structuredClone(p.input); capacity.staffing.forEach(s => { s.minimumStaffPerShift = 0; });
  capacity.coverageWindows.forEach(w => { w.positionRequirements = []; });
  expect(() => reviewWeeklyDraft(capacity, p.terms)).toThrow();
});

it('rejects non-Draft or unavailable targets and a non-Owner proof', async () => {
  const p = await selection();
  for (const status of ['PUBLISHED', 'ARCHIVED'] as const) {
    const input = structuredClone(p.input);
    input.schedules.push({ id: 'unavailable-parent', locationId: 'loc-1', weekStart, status });
    expect(() => reviewWeeklyDraft(input, p.terms)).toThrow();
  }
  const unavailable = structuredClone(p.input); unavailable.locations[0].active = false;
  expect(() => reviewWeeklyDraft(unavailable, p.terms)).toThrow();
  expect(() => prepareReviewedWeeklyDraft({ ...p, proof: { ...f.owner, employee: { ...f.owner.employee, role: 'MANAGER' } } })).toThrow();
});

it('rolls back altered inserted terms and a concurrently revoked management session', async () => {
  const p = await prepared();
  await f.q("CREATE FUNCTION alter_weekly_terms() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN NEW.notes='Wrong note'; RETURN NEW; END$$; CREATE TRIGGER alter_weekly_terms BEFORE INSERT ON shifts FOR EACH ROW EXECUTE FUNCTION alter_weekly_terms()");
  await expect(execute(p.batch)).rejects.toThrow();
  expect(await f.q('SELECT (SELECT count(*)::int FROM shifts) shifts,(SELECT count(*)::int FROM schedules) schedules')).toEqual([{ shifts: 0, schedules: 0 }]);
  await f.q('DROP TRIGGER alter_weekly_terms ON shifts');
  await f.q("UPDATE employees SET role='EMPLOYEE' WHERE id='owner'");
  await expect(execute(p.batch)).rejects.toThrow();
  expect(await f.q('SELECT count(*)::int n FROM shifts')).toEqual([{ n: 0 }]);
});
