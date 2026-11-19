import { afterEach, beforeEach, expect, it, rs } from '@rstest/core';
import { randomUUID } from 'node:crypto';
import { companyAccessFixture } from '@/test/integration/company-access-fixture';
import { fictionalProfile } from '@/test/fixtures/shift-changes';
import { weeklyService } from './weekly-service.server';
import type { SqlExecutor } from '@/lib/notifications/types';
import { companyKnowledgeService } from './company-knowledge.server';
import { AdvisorStore } from './store.server';
import { admitOwner } from './authority.server';
import * as weeklyPlanner from './weekly-plan.server';
import { weeklyMemoryAdmission } from './weekly-context.server';
import { emptyMemory } from './memory';
import { AdvisorMemory } from './memory.server';

let f: Awaited<ReturnType<typeof companyAccessFixture>>;
const env = { NEVORA_OWNER_ADVISOR_ENABLED: 'true', NEVORA_OWNER_ADVISOR_WEEKLY_ENABLED: 'true' };
const signal = () => new AbortController().signal;
const compare = () => ({ op: 'compare_week', requestId: randomUUID(), weekStart: '2026-11-16', mode: 'FILL_GAPS_ONLY', locationScope: { kind: 'SELECTED', locationIds: ['loc-1'] } });
beforeEach(async () => {
  f = await companyAccessFixture();
  await f.q(`UPDATE location_staffing_settings SET minimum_staff_per_shift=1,requires_designated_lead=false;
    INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES('target','loc-1');
    INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) VALUES('mon-one','loc-1',1,'08:00','12:00'),('tue-one','loc-1',2,'08:00','12:00');
    INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) VALUES('mon-av','target',1,'08:00','12:00'),('tue-av','target',2,'08:00','12:00');
    INSERT INTO weekly_availability_submissions(employee_id,week_start,uses_normal_availability) VALUES('target','2026-11-16',true);`);
  await f.q("INSERT INTO employee_scheduling_settings(employee_id,maximum_weekly_hours,operational_rule_profile) VALUES('target',40,$1::jsonb)",[JSON.stringify(fictionalProfile())]);
});
afterEach(async () => { rs.restoreAllMocks(); await f?.db.dispose(); });
const call = (value: unknown, executor = f.db.executor, settings = env, proof = f.owner) => weeklyService(proof, executor, settings, signal(), value);
async function proposal() {
  const command = compare(), result = await call(command);
  if (result.state !== 'ready' || !result.comparison) throw Error('Expected comparison');
  return { command, result, option: result.comparison.alternatives[0] };
}
async function reviewed() {
  const p = await proposal();
  const result = await call({ op: 'read_week_plan', requestId: randomUUID(), reviewId: p.option.id });
  if (result.state !== 'ready' || !result.review || !result.readReceiptId) throw Error('Expected full review');
  return { ...p, result, apply: { op: 'apply_week_plan', requestId: randomUUID(), reviewId: p.option.id,
    termsDigest: result.review.termsDigest, readReceiptId: result.readReceiptId, acknowledged: true } };
}

it('compares without business writes, requires the full read handle and saves the exact complete set', async () => {
  const p = await proposal();
  expect(p.option).toMatchObject({ added: 2, applyEligible: true });
  expect(await f.q('SELECT count(*)::int n FROM shifts')).toEqual([{ n: 0 }]);
  await expect(call({ op: 'apply_week_plan', requestId: randomUUID(), reviewId: p.option.id, termsDigest: p.option.termsDigest,
    readReceiptId: randomUUID(), acknowledged: true })).rejects.toMatchObject({ code: 'conflict' });
  const full = await call({ op: 'read_week_plan', requestId: randomUUID(), reviewId: p.option.id });
  expect(full.review?.changes.additions).toHaveLength(2);
  expect(full.comparison?.locations.some(l => l.id === 'loc-2' && l.state === 'NOT_SELECTED')).toBe(true);
  const command = { op: 'apply_week_plan', requestId: randomUUID(), reviewId: p.option.id, termsDigest: p.option.termsDigest,
    readReceiptId: full.readReceiptId, acknowledged: true };
  const saved = await call(command); expect(saved.state).toBe('saved'); expect(saved.receipt).toMatchObject({ operationId: command.requestId, added: 2, removed: 0 });
  expect(await f.q('SELECT (SELECT count(*)::int FROM shifts) shifts,(SELECT count(*)::int FROM notifications) notifications,(SELECT count(*)::int FROM schedule_publication_revisions) publications')).toEqual([{ shifts: 2, notifications: 0, publications: 0 }]);
  const replay = await call(command); expect(replay.receipt).toEqual(saved.receipt);
  expect(replay.progress).toMatchObject({ state: 'draft', assignmentsPresent: 2 });
});

it('declines privately and rejects apply or an incompatible repeated disposition', async () => {
  const p = await reviewed(), command = { op: 'decline_week_plan', requestId: randomUUID(), reviewId: p.option.id };
  expect((await call(command)).state).toBe('declined');
  expect((await call(command)).state).toBe('declined');
  await expect(call(p.apply)).rejects.toMatchObject({ code: 'conflict' });
  await expect(call({ ...command, requestId: randomUUID() })).rejects.toMatchObject({ code: 'conflict' });
  expect(await f.q('SELECT count(*)::int n FROM shifts')).toEqual([{ n: 0 }]);
});

it('recovers a committed lost reply using the original operation without writing again', async () => {
  const p = await reviewed(); let lost = false;
  const executor: SqlExecutor = { ...f.db.executor, async transaction(statements, incoming) {
    if (lost) throw Error('Fictional lost reply');
    const result = await f.db.executor.transaction(statements, incoming);
    if (!lost && statements.some(s => s.text.includes('UPDATE owner_advisor_weekly_reviews SET applied_operation'))) { lost = true; throw Error('Fictional lost reply'); }
    return result;
  } };
  await expect(call(p.apply, executor)).rejects.toThrow('Fictional lost reply');
  const checked = await call({ op: 'check_week_plan', requestId: randomUUID(), reviewId: p.option.id });
  expect(checked.state).toBe('saved'); expect(checked.receipt?.operationId).toBe(p.apply.requestId);
  expect((await call(p.apply)).receipt).toEqual(checked.receipt);
  expect(await f.q('SELECT count(*)::int n FROM shifts')).toEqual([{ n: 2 }]);
});

it('rejects stale source and private context without re-solving or partially saving', async () => {
  const p = await reviewed(); await f.q("UPDATE employees SET first_name='Changed' WHERE id='target'");
  await expect(call(p.apply)).rejects.toMatchObject({ code: 'conflict' });
  const stale = await call(p.command); expect(stale.state).toBe('stale'); expect(stale.comparison).toBeNull(); expect(stale.review).toBeNull();
  expect(await f.q('SELECT count(*)::int n FROM shifts')).toEqual([{ n: 0 }]);
});

it('serializes identical concurrent applies and a competing decline as one terminal disposition', async () => {
  const p = await reviewed();
  const results = await Promise.allSettled([call(p.apply), call(p.apply), call({ op: 'decline_week_plan', requestId: randomUUID(), reviewId: p.option.id })]);
  const completed = results.filter(r => r.status === 'fulfilled').map(r => r.value);
  expect(completed.length).toBeGreaterThan(0);
  expect(new Set(completed.map(r => r.state)).size).toBe(1);
  const saved = completed[0].state === 'saved';
  expect(await f.q('SELECT count(*)::int n FROM shifts')).toEqual([{ n: saved ? 2 : 0 }]);
});

it('does not report not_saved if a competing save commits before its final response observation', async () => {
  const p = await reviewed(); let raced = false;
  const executor: SqlExecutor = { ...f.db.executor, async transaction(statements, incoming) {
    const result = await f.db.executor.transaction(statements, incoming);
    if (!raced && statements.some(s => s.text.startsWith('SELECT applied_operation,declined_operation'))) {
      raced = true; await call(p.apply);
    }
    return result;
  } };
  const checked = await call({ op: 'check_week_plan', requestId: randomUUID(), reviewId: p.option.id }, executor);
  expect(checked.state).not.toBe('not_saved');
  expect(await f.q('SELECT count(*)::int n FROM shifts')).toEqual([{ n: 2 }]);
});

it('lets the Owner decline an obsolete proposal without needing current planning inputs', async () => {
  const p = await reviewed(); await f.q("UPDATE employees SET first_name='Changed' WHERE id='target'");
  expect((await call({ op: 'decline_week_plan', requestId: randomUUID(), reviewId: p.option.id })).state).toBe('declined');
  expect(await f.q('SELECT count(*)::int n FROM shifts')).toEqual([{ n: 0 }]);
});

it('issues one stable complete-review handle across concurrent reads and exposes no authority secrets', async () => {
  const p = await proposal();
  const reads = await Promise.all([1, 2].map(() => call({ op: 'read_week_plan', requestId: randomUUID(), reviewId: p.option.id })));
  expect(reads[0].readReceiptId).toBeTruthy(); expect(reads[0].readReceiptId).toBe(reads[1].readReceiptId);
  expect(encoded(reads)).not.toContain(f.owner.sessionTokenHash);
  expect(encoded(reads)).not.toMatch(/session_hash|created_assignments|generatedClaims|retainedDigest/);
  expect(reads.every(r => r.validForMs > 0 && r.validForMs <= 15000)).toBe(true);
});
const encoded = (value: unknown) => JSON.stringify(value);

it('fences a changed Owner profile at the actual apply lock and leaves all business rows unsaved', async () => {
  const p = await reviewed(); let changed = false;
  const executor: SqlExecutor = { ...f.db.executor, async transaction(statements, incoming) {
    if (!changed && statements.some(s => s.text.includes('UPDATE owner_advisor_weekly_reviews SET applied_operation'))) {
      changed = true;
      const store = new AdvisorStore(f.owner, await admitOwner(f.owner, f.db.executor), f.db.executor);
      await store.save({ op: 'save_priorities', requestId: randomUUID(), expectedRevision: 0, priorities: 'New fictional priorities' });
    }
    return f.db.executor.transaction(statements, incoming);
  } };
  await expect(call(p.apply, executor)).rejects.toMatchObject({ code: 'conflict' });
  const stale = await call({ op: 'read_week_plan', requestId: randomUUID(), reviewId: p.option.id });
  expect(stale.state).toBe('stale'); expect(stale.review).toBeNull();
  expect(await f.q('SELECT count(*)::int n FROM shifts')).toEqual([{ n: 0 }]);
});

it('retains historical counts after knowledge withdrawal and when weekly actions are disabled', async () => {
  const settings = { ...env, NEVORA_OWNER_ADVISOR_KNOWLEDGE_ENABLED: 'true' };
  const compared = await call(compare(), f.db.executor, settings), option = compared.comparison!.alternatives[0];
  const full = await call({ op: 'read_week_plan', requestId: randomUUID(), reviewId: option.id }, f.db.executor, settings);
  const command = { op: 'apply_week_plan', requestId: randomUUID(), reviewId: option.id, termsDigest: option.termsDigest, readReceiptId: full.readReceiptId, acknowledged: true };
  const saved = await call(command, f.db.executor, settings); expect(saved.state).toBe('saved');
  await companyKnowledgeService(f.owner, f.db.executor, signal(), { op: 'draft_document', requestId: randomUUID(), expectedRevision: 0,
    documentId: null, title: 'Fictional policy', body: 'Withdrawn private guidance', category: 'operations', locale: 'en' });
  const recovered = await call(command, f.db.executor, settings);
  expect(recovered.receipt).toEqual(saved.receipt); expect(recovered.review).toBeNull(); expect(recovered.progress).toBeNull();
  expect(encoded(recovered)).not.toContain('Target'); expect(encoded(recovered)).not.toContain('Withdrawn');
  const disabled = await call(command, f.db.executor, { ...env, NEVORA_OWNER_ADVISOR_WEEKLY_ENABLED: 'false' });
  expect(disabled.receipt).toEqual(saved.receipt); expect(disabled.progress).toBeNull();
  await expect(call({ op: 'read_week_plan', requestId: randomUUID(), reviewId: option.id }, f.db.executor, { ...env, NEVORA_OWNER_ADVISOR_WEEKLY_ENABLED: 'false' })).rejects.toMatchObject({ code: 'disabled' });
});

it('withholds details from another session or Owner and after current authority is revoked', async () => {
  const p = await reviewed();
  await f.q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('c',64),'owner',clock_timestamp()+interval '1 hour')");
  await expect(call({ op: 'read_week_plan', requestId: randomUUID(), reviewId: p.option.id }, f.db.executor, env,
    { ...f.owner, sessionTokenHash: 'c'.repeat(64) })).rejects.toMatchObject({ code: 'forbidden' });
  await f.q("UPDATE employees SET role='OWNER' WHERE id='manager'");
  await expect(call({ op: 'check_week_plan', requestId: randomUUID(), reviewId: p.option.id }, f.db.executor, env,
    { ...f.manager, employee: { ...f.manager.employee, role: 'OWNER' } })).rejects.toMatchObject({ code: 'forbidden' });
  await f.q("UPDATE employees SET role='EMPLOYEE' WHERE id='owner'");
  await expect(call(p.apply)).rejects.toThrow();
  expect(await f.q('SELECT count(*)::int n FROM shifts')).toEqual([{ n: 0 }]);
});

it('keeps existing hard-rule violations visible and does not issue an apply handle for them', async () => {
  const p = await reviewed(); await call(p.apply);
  await f.q("UPDATE employee_scheduling_settings SET maximum_weekly_hours=4 WHERE employee_id='target'");
  const result = await call(compare()), option = result.comparison!.alternatives[0];
  expect(option.coverage.remainingBlocks).toBe(0); expect(option.applyEligible).toBe(false);
  expect(option.inspectionReasons).toContain('VALIDATION_BLOCKER');
  expect(option.issues.items.some(i => i.code === 'MAX_WEEKLY_HOURS' && i.provenance === 'RETAINED_ASSIGNMENT')).toBe(true);
  const full = await call({ op: 'read_week_plan', requestId: randomUUID(), reviewId: option.id });
  expect(full.readReceiptId).toBeNull(); expect(full.review?.changes.additions).toEqual([]);
});

it.each(['suppress', 'alter-count', 'alter-episode'])('rolls back the full save when receipt custody is %s', async kind => {
  const p = await reviewed();
  const mutation = kind === 'suppress' ? 'RETURN NULL;' : kind === 'alter-count' ? "NEW.receipt=jsonb_set(NEW.receipt,'{added}','999'::jsonb);" :
    "NEW.created_assignments=jsonb_set(NEW.created_assignments,'{0,assignment_episode_id}',to_jsonb(gen_random_uuid()::text));";
  await f.q(`CREATE FUNCTION corrupt_weekly_receipt() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN IF NEW.applied_operation IS NOT NULL THEN ${mutation} END IF; RETURN NEW; END$$;
    CREATE TRIGGER zz_corrupt_weekly_receipt BEFORE UPDATE ON owner_advisor_weekly_reviews FOR EACH ROW EXECUTE FUNCTION corrupt_weekly_receipt()`);
  await expect(call(p.apply)).rejects.toMatchObject({ code: 'conflict' });
  expect(await f.q('SELECT (SELECT count(*)::int FROM shifts) shifts,(SELECT count(*)::int FROM schedules) schedules')).toEqual([{ shifts: 0, schedules: 0 }]);
  expect(await f.q("SELECT count(*)::int n FROM owner_advisor_weekly_operations WHERE command_kind='apply_week_plan'")).toEqual([{ n: 0 }]);
});

it('rolls back a foreign-row mutation made by an after-receipt trigger', async () => {
  await f.q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('foreign-parent','loc-1','2026-11-09','DRAFT','owner'); INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,notes) VALUES('foreign-kept','foreign-parent','target','2026-11-09','08:00','12:00','Original fictional note')");
  const p = await reviewed(), before = await f.q('SELECT * FROM shifts ORDER BY id');
  await f.q("CREATE FUNCTION corrupt_after_weekly_receipt() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN IF NEW.applied_operation IS NOT NULL THEN UPDATE shifts SET notes='Wrong later mutation' WHERE id='foreign-kept'; END IF; RETURN NEW; END$$; CREATE TRIGGER zz_corrupt_after_weekly_receipt AFTER UPDATE ON owner_advisor_weekly_reviews FOR EACH ROW EXECUTE FUNCTION corrupt_after_weekly_receipt()");
  await expect(call(p.apply)).rejects.toMatchObject({ code: 'conflict' });
  expect(await f.q('SELECT * FROM shifts ORDER BY id')).toEqual(before);
});

it.each(['publication', 'parent', 'episode', 'edit-revert'])('distinguishes %s from the original saved draft', async kind => {
  const p = await reviewed(); await call(p.apply);
  const check = () => call({ op: 'check_week_plan', requestId: randomUUID(), reviewId: p.option.id });
  expect((await check()).progress?.state).toBe('draft');
  if (kind === 'publication') {
    await f.q("UPDATE schedules SET status='PUBLISHED'");
    expect((await check()).progress).toMatchObject({ state: 'published', assignmentsPresent: 2 });
    return;
  }
  if (kind === 'parent') {
    await f.q("UPDATE schedules SET location_id='loc-2'"); expect((await check()).progress?.state).toBe('changed'); return;
  }
  if (kind === 'edit-revert') {
    await f.q("UPDATE shifts SET start_time='09:00' WHERE id=(SELECT min(id) FROM shifts); UPDATE shifts SET start_time='08:00' WHERE id=(SELECT min(id) FROM shifts)");
  } else await f.q(`WITH old AS(DELETE FROM shifts WHERE id=(SELECT min(id) FROM shifts) RETURNING *)
    INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id,is_designated_lead,assignment_origin,generated_claims,created_at,updated_at)
    SELECT id,schedule_id,employee_id,date,start_time,end_time,position_id,is_designated_lead,assignment_origin,generated_claims,created_at,updated_at FROM old`);
  const changed = await check(); expect(changed.state).toBe('saved'); expect(changed.progress).toMatchObject({ state: 'changed', assignmentsPresent: 1, assignmentsTotal: 2 });
});

it('reports unavailable observation separately from not_saved and from the historical receipt', async () => {
  const p = await reviewed();
  const executor: SqlExecutor = { ...f.db.executor, async transaction(statements, incoming) {
    if (statements.some(s => s.text.startsWith('WITH sizes AS'))) throw Error('Fictional source unavailable');
    return f.db.executor.transaction(statements, incoming);
  } };
  expect((await call({ op: 'check_week_plan', requestId: randomUUID(), reviewId: p.option.id }, executor)).state).toBe('unavailable');
  await call(p.apply);
  const checked = await call({ op: 'check_week_plan', requestId: randomUUID(), reviewId: p.option.id }, executor);
  expect(checked.state).toBe('saved'); expect(checked.progress?.state).toBe('unavailable'); expect(checked.receipt?.added).toBe(2);
});

it.each(['owner_advisor_notebooks', 'owner_advisor_memories'])('invalidates admitted model context after %s changes', async table => {
  const advisor = new AdvisorStore(f.owner, await admitOwner(f.owner, f.db.executor), f.db.executor);
  const admitted = weeklyMemoryAdmission(emptyMemory(), await new AdvisorMemory(advisor, signal(), env).clock(), advisor.original.workspace.timeZone);
  const compared = await weeklyService(f.owner, f.db.executor, env, signal(), compare(), { requestId: randomUUID(), profileRevision: 0, notebookRevision: 0, memoryRevision: 0, memoryAdmission: admitted });
  const option = compared.comparison!.alternatives[0];
  const full = await call({ op: 'read_week_plan', requestId: randomUUID(), reviewId: option.id });
  await f.q(`INSERT INTO ${table}(workspace_id,owner_id,revision) VALUES('workspace-fuel','owner',1)`);
  await expect(call({ op: 'apply_week_plan', requestId: randomUUID(), reviewId: option.id, termsDigest: option.termsDigest, readReceiptId: full.readReceiptId, acknowledged: true })).rejects.toMatchObject({ code: 'conflict' });
  expect((await call({ op: 'read_week_plan', requestId: randomUUID(), reviewId: option.id })).state).toBe('stale');
  expect(await f.q('SELECT count(*)::int n FROM shifts')).toEqual([{ n: 0 }]);
});

it.each([false, true])('fences a real time transition and preserves only historical receipt when saved=%s', async saved => {
  const settings = { ...env, NEVORA_OWNER_ADVISOR_KNOWLEDGE_ENABLED: 'true' };
  const [clock] = await f.q<{ activation: string }>("SELECT (clock_timestamp()+interval '3 seconds')::text activation");
  const draft = await companyKnowledgeService(f.owner, f.db.executor, signal(), { op: 'draft_document', requestId: randomUUID(), expectedRevision: 0,
    documentId: null, title: 'Future fictional guidance', body: 'Applies later.', category: 'operations', locale: 'en', effectiveFrom: clock.activation });
  if (!('documentId' in draft)) throw Error('Expected document');
  await companyKnowledgeService(f.owner, f.db.executor, signal(), { op: 'publish', requestId: randomUUID(), expectedRevision: 1,
    documentId: draft.documentId, versionId: draft.versionId, reviewedTextDigest: draft.textDigest });
  const compared = await call(compare(), f.db.executor, settings), option = compared.comparison!.alternatives[0];
  const full = await call({ op: 'read_week_plan', requestId: randomUUID(), reviewId: option.id }, f.db.executor, settings);
  expect(full.validForMs).toBeLessThanOrEqual(3000);
  const command = { op: 'apply_week_plan', requestId: randomUUID(), reviewId: option.id, termsDigest: option.termsDigest, readReceiptId: full.readReceiptId, acknowledged: true };
  const original = saved ? await call(command, f.db.executor, settings) : null;
  await f.q('SELECT pg_sleep(3.1)');
  if (saved) {
    const result = await call(command, f.db.executor, settings);
    expect(result.state).toBe('saved'); expect(result.receipt).toEqual(original!.receipt); expect(result.review).toBeNull(); expect(result.progress).toBeNull();
  } else {
    expect((await call({ op: 'read_week_plan', requestId: randomUUID(), reviewId: option.id }, f.db.executor, settings)).state).toBe('stale');
    await expect(call(command, f.db.executor, settings)).rejects.toMatchObject({ code: 'conflict' });
  }
  expect(await f.q('SELECT count(*)::int n FROM shifts')).toEqual([{ n: saved ? 2 : 0 }]);
});

it('rolls back a context change injected after source locks instead of returning a save receipt', async () => {
  const p = await reviewed(); let changed = false;
  const executor: SqlExecutor = { ...f.db.executor, async transaction(statements, incoming) {
    if (!changed && statements.some(s => s.text.includes('UPDATE owner_advisor_weekly_reviews SET applied_operation'))) {
      changed = true;
      const altered = [...statements], at = altered.findIndex(s => s.text.startsWith('INSERT INTO shifts'));
      altered.splice(at, 0, { text: "INSERT INTO owner_advisor_profiles(workspace_id,owner_id,revision) VALUES('workspace-fuel','owner',1)", values: [] });
      return f.db.executor.transaction(altered, incoming);
    }
    return f.db.executor.transaction(statements, incoming);
  } };
  await expect(call(p.apply, executor)).rejects.toMatchObject({ code: 'conflict' });
  expect(await f.q('SELECT count(*)::int n FROM shifts')).toEqual([{ n: 0 }]);
});

it('rejects an altered complete-read handle before committing it', async () => {
  const p = await proposal();
  await f.q("CREATE FUNCTION alter_weekly_read_handle() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN NEW.read_receipt_id=gen_random_uuid(); RETURN NEW; END$$; CREATE TRIGGER zz_alter_weekly_read_handle BEFORE UPDATE ON owner_advisor_weekly_reviews FOR EACH ROW EXECUTE FUNCTION alter_weekly_read_handle()");
  await expect(call({ op: 'read_week_plan', requestId: randomUUID(), reviewId: p.option.id })).rejects.toMatchObject({ code: 'conflict' });
  expect(await f.q('SELECT read_receipt_id FROM owner_advisor_weekly_reviews WHERE review_id=$1', [p.option.id])).toEqual([{ read_receipt_id: null }]);
});

it('does not commit a business-source mutation made by a complete-read trigger', async () => {
  const p = await proposal();
  await f.q("CREATE FUNCTION alter_source_on_weekly_read() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN UPDATE employees SET first_name='Wrong mutation' WHERE id='target'; RETURN NEW; END$$; CREATE TRIGGER zz_alter_source_on_weekly_read AFTER UPDATE ON owner_advisor_weekly_reviews FOR EACH ROW EXECUTE FUNCTION alter_source_on_weekly_read()");
  await expect(call({ op: 'read_week_plan', requestId: randomUUID(), reviewId: p.option.id })).rejects.toMatchObject({ code: 'conflict' });
  expect(await f.q("SELECT first_name FROM employees WHERE id='target'")).toEqual([{ first_name: 'Target' }]);
});

it.each(['comparison', 'decline'])('does not commit a business-source mutation made by a %s artifact trigger', async kind => {
  const p = kind === 'decline' ? await proposal() : null;
  const event = kind === 'comparison' ? 'INSERT' : 'UPDATE';
  await f.q(`CREATE FUNCTION alter_source_on_weekly_artifact() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN UPDATE employees SET first_name='Wrong mutation' WHERE id='target'; RETURN NEW; END$$;
    CREATE TRIGGER zz_alter_source_on_weekly_artifact AFTER ${event} ON owner_advisor_weekly_reviews FOR EACH ROW EXECUTE FUNCTION alter_source_on_weekly_artifact()`);
  await expect(call(kind === 'comparison' ? compare() : { op: 'decline_week_plan', requestId: randomUUID(), reviewId: p!.option.id })).rejects.toMatchObject({ code: 'conflict' });
  expect(await f.q("SELECT first_name FROM employees WHERE id='target'")).toEqual([{ first_name: 'Target' }]);
});

it('does not claim an intact recovery chain if the original saved operation custody is missing', async () => {
  const p = await reviewed(); await call(p.apply);
  await f.q('DELETE FROM owner_advisor_weekly_operations WHERE request_id=$1', [p.apply.requestId]);
  await expect(call({ op: 'check_week_plan', requestId: randomUUID(), reviewId: p.option.id })).rejects.toMatchObject({ code: 'unavailable' });
  expect(await f.q('SELECT count(*)::int n FROM shifts')).toEqual([{ n: 2 }]);
});

it('cannot reuse a completed comparison identity for apply or change the saved apply identity', async () => {
  const p = await reviewed();
  await expect(call({ ...p.apply, requestId: p.command.requestId })).rejects.toMatchObject({ code: 'conflict' });
  expect(await f.q('SELECT count(*)::int n FROM shifts')).toEqual([{ n: 0 }]);
  await call(p.apply);
  await expect(call({ ...p.apply, requestId: randomUUID() })).rejects.toMatchObject({ code: 'conflict' });
  await expect(call({ ...p.apply, termsDigest: 'a'.repeat(64) })).rejects.toMatchObject({ code: 'conflict' });
  expect(await f.q('SELECT count(*)::int n FROM shifts')).toEqual([{ n: 2 }]);
});

it('keeps saved custody through concurrent comparison cleanup and terminal action races', async () => {
  const p = await reviewed();
  const expiredOperation = randomUUID(), expiredReview = randomUUID(), expiredDecline = randomUUID();
  // Historical unsaved fixture only: this expired artifact cannot be applied;
  // its deletion exercises real cleanup alongside the new terminal action.
  await f.q(`INSERT INTO owner_advisor_weekly_operations(workspace_id,owner_id,request_id,command_kind,command_hash,authority,session_hash,context,context_digest,state,created_at,lease_until,completed_at,result)
    SELECT workspace_id,owner_id,$2,command_kind,command_hash,authority,session_hash,context,context_digest,'completed',clock_timestamp()-interval '26 hours',clock_timestamp()-interval '26 hours',clock_timestamp()-interval '26 hours',result
    FROM owner_advisor_weekly_operations WHERE request_id=$1`, [p.command.requestId, expiredOperation]);
  await f.q(`INSERT INTO owner_advisor_weekly_reviews(workspace_id,owner_id,review_id,comparison_id,authority,session_hash,context,context_digest,source_version,terms_digest,payload,prepared_at,expires_at)
    SELECT workspace_id,owner_id,$2,$3,authority,session_hash,context,context_digest,source_version,terms_digest,payload,clock_timestamp()-interval '26 hours',clock_timestamp()-interval '25 hours'
    FROM owner_advisor_weekly_reviews WHERE review_id=$1`, [p.option.id, expiredReview, expiredOperation]);
  await f.q(`INSERT INTO owner_advisor_weekly_operations(workspace_id,owner_id,request_id,command_kind,command_hash,authority,session_hash,context,context_digest,state,created_at,lease_until,completed_at,result)
    SELECT workspace_id,owner_id,$2,'decline_week_plan',command_hash,authority,session_hash,context,context_digest,'completed',clock_timestamp()-interval '26 hours',clock_timestamp()-interval '26 hours',clock_timestamp()-interval '26 hours',result
    FROM owner_advisor_weekly_operations WHERE request_id=$1`, [p.command.requestId, expiredDecline]);
  await f.q('UPDATE owner_advisor_weekly_reviews SET declined_operation=$2,decline_hash=repeat(\'a\',64) WHERE review_id=$1', [expiredReview, expiredDecline]);
  const results = await Promise.allSettled([call(p.apply), call(compare()), call({ op: 'decline_week_plan', requestId: randomUUID(), reviewId: p.option.id })]);
  expect(results.some(r => r.status === 'fulfilled')).toBe(true);
  const check = await call({ op: 'check_week_plan', requestId: randomUUID(), reviewId: p.option.id });
  expect(['saved', 'declined']).toContain(check.state);
  const saved = check.state === 'saved';
  expect(await f.q('SELECT count(*)::int n FROM shifts')).toEqual([{ n: saved ? 2 : 0 }]);
  expect(await f.q('SELECT count(*)::int n FROM owner_advisor_weekly_reviews WHERE review_id=$1', [p.option.id])).toEqual([{ n: 1 }]);
  expect(await f.q('SELECT count(*)::int n FROM owner_advisor_weekly_reviews WHERE review_id=$1', [expiredReview])).toEqual([{ n: 0 }]);
  expect(await f.q('SELECT count(*)::int n FROM owner_advisor_weekly_operations WHERE request_id=$1', [expiredDecline])).toEqual([{ n: 0 }]);
  if (saved) expect((await call(p.apply)).receipt).toEqual(check.receipt);
});

it('applies the approved set even when planning is unavailable because apply never invokes it', async () => {
  const p = await reviewed();
  const planner = rs.spyOn(weeklyPlanner, 'compareWeeklyPlans').mockImplementation(async () => { throw Error('Planner must not execute during approval'); });
  const saved = await call(p.apply); expect(saved.state).toBe('saved');
  expect(planner).not.toHaveBeenCalled();
  expect(await f.q('SELECT count(*)::int n FROM shifts')).toEqual([{ n: 2 }]);
});

it.each(['same', 'different'])('serializes two %s apply identities without duplicating the approved set', async kind => {
  const p = await reviewed();
  const outcomes = await Promise.allSettled([call(p.apply), call({ ...p.apply, requestId: kind === 'same' ? p.apply.requestId : randomUUID() })]);
  const saved = outcomes.filter(r => r.status === 'fulfilled').map(r => r.value);
  expect(saved).toHaveLength(kind === 'same' ? 2 : 1);
  expect(saved.every(r => r.state === 'saved')).toBe(true);
  if (kind === 'same') expect(saved[0].receipt).toEqual(saved[1].receipt);
  else expect(outcomes.filter(r => r.status === 'rejected').map(r => r.reason)).toMatchObject([{ code: 'conflict' }]);
  expect(await f.q('SELECT count(*)::int n FROM shifts')).toEqual([{ n: 2 }]);
});

it('preserves bounded diagnostic summaries through exact validation and the real model envelope', async () => {
  await f.q(`DELETE FROM location_coverage_windows WHERE location_id='loc-1';
    UPDATE locations SET name=repeat('F',150),short_name=repeat('L',48) WHERE id='loc-1';
    INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time)
      SELECT 'noisy-'||day||'-'||slot,'loc-1',day,make_time(slot/2,(slot%2)*30,0),make_time(slot/2,(slot%2)*30+5,0)
      FROM generate_series(0,6) day CROSS JOIN generate_series(0,11) slot;
    INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) VALUES('noisy-work-mon','loc-1',1,'08:00','12:00'),('noisy-work-tue','loc-1',2,'08:00','12:00');
    INSERT INTO positions(id,workspace_id,name) SELECT 'noisy-position-'||i,'workspace-fuel',repeat('P',76)||lpad(i::text,2,'0') FROM generate_series(1,50)i;
    INSERT INTO coverage_window_position_requirements(coverage_window_id,position_id,quantity)
      SELECT 'noisy-1-'||slot,'noisy-position-'||i,1 FROM generate_series(0,7)slot CROSS JOIN generate_series(1,50)i`);
  const result = await call(compare());
  expect(result.state).toBe('ready'); expect(result.comparison?.state).toBe('ready');
  expect(result.comparison!.alternatives).toHaveLength(2);
  const option = result.comparison!.alternatives[result.comparison!.alternatives.length-1];
  expect(option.remaining.total).toBeGreaterThan(40);
  expect(option.remaining.items.length).toBeLessThan(option.remaining.total);
  expect(result.comparison!.partial).toBe(true);
  expect(Buffer.byteLength(JSON.stringify(result.comparison),'utf8')).toBeLessThanOrEqual(11000);
  const full = await call({op:'read_week_plan',requestId:randomUUID(),reviewId:option.id});
  expect(full.review!.remaining.items.length).toBeGreaterThan(option.remaining.items.length);
  expect(full.review!.remaining.total).toBe(option.remaining.total);
  const { readWeeklyTool } = await import('./weekly-tool.server');
  const store = new AdvisorStore(f.owner,await admitOwner(f.owner,f.db.executor),f.db.executor);
  const tool = await readWeeklyTool(store,{weekStart:'2026-11-16',locationScope:{kind:'SELECTED',locationIds:['loc-1']}},signal(),
    {env,origin:{requestId:randomUUID(),profileRevision:0}},{sourceSlots:1,occurrence:1});
  expect(Buffer.byteLength(JSON.stringify(tool),'utf8')).toBeLessThanOrEqual(12288);
  expect(tool.weeklyPlans?.partial).toBe(true);
});

it('persists valid astral names crossing the display truncation boundary without broken Unicode', async () => {
  await f.q("UPDATE employees SET first_name=$1 WHERE id='target'",['A'+'😀'.repeat(60)]);
  const p = await reviewed();
  const name = p.result.review!.changes.additions[0].employeeName;
  expect(name.startsWith('A😀')).toBe(true);
  expect(name.length).toBeLessThanOrEqual(120);
  expect(Buffer.from(name,'utf8').toString('utf8')).toBe(name);
  expect((await call(p.apply)).state).toBe('saved');
});

it('keeps saved coverage on the originally included locations and identifies later scope changes', async () => {
  await f.q(`INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time)
    VALUES('other-mon','loc-2',1,'08:00','12:00'),('other-tue','loc-2',2,'08:00','12:00');
    INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES('target','loc-2');
    INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('published-other','loc-2','2026-11-16','PUBLISHED','owner')`);
  const compared = await call({...compare(),locationScope:{kind:'ALL'}});
  expect(compared.comparison!.baseline!.requiredMinutes).toBe(480);
  expect(compared.comparison!.locations.find(l=>l.id==='loc-2')?.state).toBe('PUBLISHED');
  const option=compared.comparison!.alternatives[0];
  const full=await call({op:'read_week_plan',requestId:randomUUID(),reviewId:option.id});
  const saved=await call({op:'apply_week_plan',requestId:randomUUID(),reviewId:option.id,termsDigest:option.termsDigest,readReceiptId:full.readReceiptId,acknowledged:true});
  expect(saved.progress!.coverage!.requiredMinutes).toBe(480);
  expect(saved.progress!.coverageScope).toEqual({includedLocationIds:['loc-1'],changed:false});
  await f.q("UPDATE schedules SET status='DRAFT' WHERE id='published-other'");
  const changed=await call({op:'check_week_plan',requestId:randomUUID(),reviewId:option.id});
  expect(changed.progress!.coverage!.requiredMinutes).toBe(480);
  expect(changed.progress).toMatchObject({state:'changed',coverageScope:{includedLocationIds:['loc-1'],changed:true}});
});
