import { afterEach, beforeEach, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { companyAccessFixture } from '@/test/integration/company-access-fixture';
import { AdvisorStore } from './store.server';
import { admitOwner } from './authority.server';
import { captureCoverageSource, coverageSourceVersion } from './coverage-plan.server';
import { mapGenerationSource } from '@/lib/data/schedule-generation-snapshot';
import { compareWeeklyPlans } from './weekly-plan.server';
import { WeeklyStore } from './weekly-store.server';
import { captureWeeklyContext, weeklyMemoryAdmission } from './weekly-context.server';
import { weeklyDigest } from './weekly-digest.server';
import { companyKnowledgeService } from './company-knowledge.server';
import { AdvisorMemory } from './memory.server';
import { ownerMemoryContext } from './memory';
import { addDays } from '@/lib/date-utils';

let f: Awaited<ReturnType<typeof companyAccessFixture>>;
const env = { NEVORA_OWNER_ADVISOR_ENABLED: 'true' };
const signal = () => new AbortController().signal;
beforeEach(async () => { f = await companyAccessFixture(); });
afterEach(async () => { await f?.db.dispose(); });
async function setup(proof = f.owner, settings = env) {
  const advisor = new AdvisorStore(proof, await admitOwner(proof, f.db.executor), f.db.executor);
  const context = await captureWeeklyContext(advisor, settings, undefined, signal());
  return { advisor, context, store: new WeeklyStore(advisor, settings) };
}
async function modelOrigin(advisor: AdvisorStore, profileRevision = 0) {
  const memory = new AdvisorMemory(advisor, signal(), env), read = await memory.read();
  if (read.state !== 'ready') throw Error('Expected model memory');
  return { requestId: randomUUID(), profileRevision, notebookRevision: 0, memoryRevision: read.memory.revision,
    memoryAdmission: weeklyMemoryAdmission(read.memory, await memory.clock(), advisor.original.workspace.timeZone) };
}
async function prepared(settings = env) {
  const s = await setup(f.owner, settings);
  const { source, observedAt } = await captureCoverageSource(s.advisor, signal());
  const { input } = mapGenerationSource({ workspaceId: s.advisor.original.workspace.id, actorEmployeeId: 'owner', weekStart: '2026-11-16',
    mode: 'FILL_GAPS_ONLY', locationScope: { kind: 'ALL' } }, source, observedAt);
  const draft = await compareWeeklyPlans(input, { weekStart: input.weekStart, observedAt, sourceVersion: coverageSourceVersion(source),
    contextDigest: weeklyDigest(s.context), validUntil: s.context.validUntil }, signal());
  return { ...s, source, draft, id: randomUUID(), hash: weeklyDigest({ fixture: 'weekly-compare' }) };
}
async function saveProposal() {
  const p = await prepared();
  await p.store.reserveComparison(p.id, p.hash, p.context, signal());
  await p.store.completeComparison(p.id, p.hash, p.context, p.source, p.draft, signal());
  return p;
}

it.each([false, true])('binds the original complete source to comparison operation even when unavailable=%s', async unavailable => {
  const p = await prepared();
  if (unavailable) p.draft = { comparison: { ...p.draft.comparison, state: 'unavailable', reason: 'INPUT_LIMIT', sourceVersion: null,
    alternatives: [], baseline: null, partial: true }, reviews: [] };
  await p.store.reserveComparison(p.id, p.hash, p.context, signal());
  await p.store.completeComparison(p.id, p.hash, p.context, p.source, p.draft, signal());
  expect(await f.q('SELECT source_version FROM owner_advisor_weekly_operations WHERE request_id=$1', [p.id])).toEqual([{ source_version: coverageSourceVersion(p.source) }]);
});

it('reserves before work, rejects a duplicate running comparison and atomically persists the same immutable result', async () => {
  const p = await prepared();
  expect(await p.store.reserveComparison(p.id, p.hash, p.context, signal())).toEqual({ admitted: true });
  await expect(p.store.reserveComparison(p.id, p.hash, p.context, signal())).rejects.toMatchObject({ code: 'busy' });
  expect(await p.store.completeComparison(p.id, p.hash, p.context, p.source, p.draft, signal())).toEqual(p.draft.comparison);
  expect(await p.store.reserveComparison(p.id, p.hash, p.context, signal())).toEqual({ admitted: false, comparison: p.draft.comparison });
  expect((await p.store.readReview(p.draft.reviews[0].review.id, signal())).payload).toEqual(p.draft.reviews[0]);
  expect(await f.q('SELECT (SELECT count(*)::int FROM shifts) shifts,(SELECT count(*)::int FROM notifications) notifications,(SELECT count(*)::int FROM owner_advisor_weekly_operations) operations')).toEqual([{ shifts: 0, notifications: 0, operations: 1 }]);
});

it('does not accept a reused comparison identity for changed input or failed work', async () => {
  const p = await prepared(); await p.store.reserveComparison(p.id, p.hash, p.context, signal());
  await expect(p.store.reserveComparison(p.id, 'c'.repeat(64), p.context, signal())).rejects.toMatchObject({ code: 'conflict' });
  await p.store.failComparison(p.id, p.hash, signal());
  await expect(p.store.reserveComparison(p.id, p.hash, p.context, signal())).rejects.toMatchObject({ code: 'prior_attempt_failed' });
  expect(await f.q('SELECT state FROM owner_advisor_weekly_operations')).toEqual([{ state: 'failed' }]);
});

it('serializes concurrent identical reservations and never reports both callers newly admitted', async () => {
  const p = await prepared();
  const results = await Promise.allSettled(Array.from({ length: 4 }, () => p.store.reserveComparison(p.id, p.hash, p.context, signal())));
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  expect(await f.q('SELECT count(*)::int n FROM owner_advisor_weekly_operations')).toEqual([{ n: 1 }]);
});

it('rejects stale source before proposal completion without persisting half its alternatives', async () => {
  const p = await prepared(); await p.store.reserveComparison(p.id, p.hash, p.context, signal());
  await f.q("UPDATE employees SET first_name='Changed' WHERE id='target'");
  await expect(p.store.completeComparison(p.id, p.hash, p.context, p.source, p.draft, signal())).rejects.toMatchObject({ code: 'conflict' });
  expect(await f.q('SELECT count(*)::int n FROM owner_advisor_weekly_reviews')).toEqual([{ n: 0 }]);
  expect(await f.q('SELECT state FROM owner_advisor_weekly_operations')).toEqual([{ state: 'running' }]);
});

it('keeps quota admission atomic across sessions without exposing a different session review', async () => {
  const p = await saveProposal();
  await f.q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('c',64),'owner',clock_timestamp()+interval '1 hour')");
  const second = await setup({ ...f.owner, sessionTokenHash: 'c'.repeat(64) });
  await expect(second.store.readReview(p.draft.reviews[0].review.id, signal())).rejects.toMatchObject({ code: 'forbidden' });
  await expect(second.store.reserveComparison(p.id, p.hash, second.context, signal())).rejects.toMatchObject({ code: 'conflict' });
  for (let n = 1; n < 20; n++) {
    const next = await prepared();
    await next.store.reserveComparison(next.id, next.hash, next.context, signal());
    await next.store.completeComparison(next.id, next.hash, next.context, next.source, next.draft, signal());
  }
  await expect(second.store.reserveComparison(randomUUID(), p.hash, second.context, signal())).rejects.toMatchObject({ code: 'limit' });
  expect(await f.q('SELECT count(*)::int n FROM owner_advisor_weekly_reviews')).toEqual([{ n: 20 }]);
}, 30000);

it('binds current private profile and optional admitted model context without storing its text', async () => {
  const p = await prepared();
  expect(p.context).toMatchObject({ profileRevision: 0, notebookRevision: null, memoryRevision: null, knowledgeEnabled: false, knowledge: null });
  await p.advisor.save({ op: 'save_priorities', requestId: randomUUID(), expectedRevision: 0, priorities: 'Fictional private current objective' });
  await expect(p.store.assertContext(p.context, signal())).rejects.toMatchObject({ code: 'conflict' });
  await expect(captureWeeklyContext(p.advisor, env, { requestId: randomUUID(), profileRevision: 0 }, signal())).rejects.toMatchObject({ code: 'conflict' });
  const current = await captureWeeklyContext(p.advisor, env, await modelOrigin(p.advisor, 1), signal());
  expect(current).toMatchObject({ profileRevision: 1, notebookRevision: 0, memoryRevision: 0 });
  expect(JSON.stringify(current)).not.toContain('Fictional private current objective');
});

it('fences company-knowledge withdrawal and cannot replay tagged proposals with the feature off', async () => {
  const settings = { ...env, NEVORA_OWNER_ADVISOR_KNOWLEDGE_ENABLED: 'true' };
  const p = await prepared(settings);
  await p.store.reserveComparison(p.id, p.hash, p.context, signal());
  await p.store.completeComparison(p.id, p.hash, p.context, p.source, p.draft, signal());
  const saved = await companyKnowledgeService(f.owner, f.db.executor, signal(), { op: 'draft_document', requestId: randomUUID(), expectedRevision: 0,
    documentId: null, title: 'Fictional procedure', body: 'Private procedure text must not enter the weekly context record.', category: 'operations', locale: 'en' });
  expect(saved.state).toBe('draft_saved');
  await expect(p.store.assertContext(p.context, signal())).rejects.toMatchObject({ code: 'conflict' });
  const disabled = new WeeklyStore(p.advisor, env);
  await expect(disabled.assertContext(p.context, signal())).rejects.toMatchObject({ code: 'conflict' });
  expect(JSON.stringify(p.context)).not.toContain('Private procedure');
});

it('returns unavailable for a missing additive schema rather than an empty successful plan store', async () => {
  const p = await prepared(); await f.q('DROP TABLE owner_advisor_weekly_reviews,owner_advisor_weekly_operations CASCADE');
  await expect(p.store.reserveComparison(p.id, p.hash, p.context, signal())).rejects.toMatchObject({ code: 'unavailable' });
});

it('makes proposal terms immutable independently of later receipt/review metadata', async () => {
  const p = await saveProposal();
  await expect(f.q("UPDATE owner_advisor_weekly_reviews SET payload='{}' WHERE review_id=$1", [p.draft.reviews[0].review.id])).rejects.toThrow();
  expect((await p.store.readReview(p.draft.reviews[0].review.id, signal())).payload).toEqual(p.draft.reviews[0]);
});

it('rolls back comparison admission if a database trigger changes its authority custody', async () => {
  const p = await prepared();
  await f.q("CREATE FUNCTION alter_weekly_reservation() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN NEW.session_hash:=repeat('d',64); RETURN NEW; END$$; CREATE TRIGGER alter_weekly_reservation BEFORE INSERT ON owner_advisor_weekly_operations FOR EACH ROW EXECUTE FUNCTION alter_weekly_reservation()");
  await expect(p.store.reserveComparison(p.id, p.hash, p.context, signal())).rejects.toMatchObject({ code: 'conflict' });
  expect(await f.q('SELECT count(*)::int n FROM owner_advisor_weekly_operations')).toEqual([{ n: 0 }]);
});

it('rolls back all proposal rows if a trigger alters independently stored source custody', async () => {
  const p = await prepared(); await p.store.reserveComparison(p.id, p.hash, p.context, signal());
  await f.q("CREATE FUNCTION alter_weekly_source() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN NEW.source_version:=repeat('d',64); RETURN NEW; END$$; CREATE TRIGGER alter_weekly_source BEFORE INSERT ON owner_advisor_weekly_reviews FOR EACH ROW EXECUTE FUNCTION alter_weekly_source()");
  await expect(p.store.completeComparison(p.id, p.hash, p.context, p.source, p.draft, signal())).rejects.toMatchObject({ code: 'conflict' });
  expect(await f.q('SELECT count(*)::int n FROM owner_advisor_weekly_reviews')).toEqual([{ n: 0 }]);
  expect(await f.q('SELECT state FROM owner_advisor_weekly_operations')).toEqual([{ state: 'running' }]);
});

it('rolls back a suppressed proposal insert instead of returning a success manifest', async () => {
  const p = await prepared(); await p.store.reserveComparison(p.id, p.hash, p.context, signal());
  await f.q("CREATE FUNCTION suppress_weekly_review() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RETURN NULL; END$$; CREATE TRIGGER suppress_weekly_review BEFORE INSERT ON owner_advisor_weekly_reviews FOR EACH ROW EXECUTE FUNCTION suppress_weekly_review()");
  await expect(p.store.completeComparison(p.id, p.hash, p.context, p.source, p.draft, signal())).rejects.toMatchObject({ code: 'conflict' });
  expect(await f.q('SELECT state FROM owner_advisor_weekly_operations')).toEqual([{ state: 'running' }]);
});

it('denies another current Owner even when they know the private review ID', async () => {
  const p = await saveProposal(); await f.q("UPDATE employees SET role='OWNER' WHERE id='manager'");
  const other = await setup({ ...f.manager, employee: { ...f.manager.employee, role: 'OWNER' } });
  await expect(other.store.readReview(p.draft.reviews[0].review.id, signal())).rejects.toMatchObject({ code: 'forbidden' });
});

it('does not renew an expired comparison lease when the same request is retried', async () => {
  const p = await prepared();
  // Fictional pre-existing reservation; current API writes never alter its lease.
  await f.q(`INSERT INTO owner_advisor_weekly_operations(workspace_id,owner_id,request_id,command_kind,command_hash,authority,session_hash,context,context_digest,created_at,lease_until)
    VALUES($1,'owner',$2,'compare_week',$3,$4,$5,$6::jsonb,$7,clock_timestamp()-interval '1 minute',clock_timestamp()-interval '1 second')`,
  [p.advisor.original.workspace.id, p.id, p.hash, p.advisor.original.authority, f.owner.sessionTokenHash, JSON.stringify(p.context), weeklyDigest(p.context)]);
  await expect(p.store.reserveComparison(p.id, p.hash, p.context, signal())).rejects.toMatchObject({ code: 'prior_attempt_failed' });
  expect(await f.q('SELECT lease_until<clock_timestamp() AS expired FROM owner_advisor_weekly_operations')).toEqual([{ expired: true }]);
});

it('enforces the retained operation cap even when no live alternatives remain', async () => {
  const p = await prepared();
  await f.q(`INSERT INTO owner_advisor_weekly_operations(workspace_id,owner_id,request_id,command_kind,command_hash,authority,session_hash,context,context_digest,state)
    SELECT $1,'owner',gen_random_uuid(),'compare_week',$2,$3,$4,$5::jsonb,$6,'failed' FROM generate_series(1,200)`,
  [p.advisor.original.workspace.id, p.hash, p.advisor.original.authority, f.owner.sessionTokenHash, JSON.stringify(p.context), weeklyDigest(p.context)]);
  await expect(p.store.reserveComparison(p.id, p.hash, p.context, signal())).rejects.toMatchObject({ code: 'limit' });
  expect(await f.q('SELECT count(*)::int n FROM owner_advisor_weekly_operations')).toEqual([{ n: 200 }]);
});

it('rolls back a suppressed completion update without returning half-prepared success', async () => {
  const p = await prepared(); await p.store.reserveComparison(p.id, p.hash, p.context, signal());
  await f.q("CREATE FUNCTION suppress_weekly_complete() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RETURN NULL; END$$; CREATE TRIGGER zz_suppress_weekly_complete BEFORE UPDATE ON owner_advisor_weekly_operations FOR EACH ROW EXECUTE FUNCTION suppress_weekly_complete()");
  await expect(p.store.completeComparison(p.id, p.hash, p.context, p.source, p.draft, signal())).rejects.toMatchObject({ code: 'conflict' });
  expect(await f.q('SELECT count(*)::int n FROM owner_advisor_weekly_reviews')).toEqual([{ n: 0 }]);
  expect(await f.q('SELECT state FROM owner_advisor_weekly_operations')).toEqual([{ state: 'running' }]);
});

it('rejects a manifest that references a proposal missing from its atomic persisted set', async () => {
  const p = await prepared(); await p.store.reserveComparison(p.id, p.hash, p.context, signal());
  await expect(p.store.completeComparison(p.id, p.hash, p.context, p.source, { ...p.draft, reviews: [] }, signal())).rejects.toMatchObject({ code: 'conflict' });
  expect(await f.q('SELECT state FROM owner_advisor_weekly_operations')).toEqual([{ state: 'running' }]);
});

it.each(['display_terms', 'terms_digest', 'summary_measure'])('rejects inconsistent exact review custody before persistence (%s)', async kind => {
  const p = await prepared(); await p.store.reserveComparison(p.id, p.hash, p.context, signal());
  const changed = structuredClone(p.draft);
  if (kind === 'display_terms') changed.reviews[0].review.changes.additions.push({ employeeId: 'target', employeeName: 'Target QA', locationId: 'loc-1', locationName: 'Site', date: '2026-11-16', startTime: '08:00', endTime: '12:00', positionId: null, positionName: null, isDesignatedLead: false });
  else if (kind === 'terms_digest') changed.reviews[0].terms.retainedDigest = 'd'.repeat(64);
  else changed.comparison.alternatives[0].coverage.coveredMinutes = 999;
  await expect(p.store.completeComparison(p.id, p.hash, p.context, p.source, changed, signal())).rejects.toMatchObject({ code: 'conflict' });
  expect(await f.q('SELECT count(*)::int n FROM owner_advisor_weekly_reviews')).toEqual([{ n: 0 }]);
});

it('rejects duplicate allocation sets presented as two distinct alternatives', async () => {
  const p = await prepared(); await p.store.reserveComparison(p.id, p.hash, p.context, signal());
  const changed = structuredClone(p.draft), duplicate = structuredClone(changed.reviews[0]), id = randomUUID();
  duplicate.review.id = id; changed.reviews.push(duplicate);
  changed.comparison.alternatives.push({ ...structuredClone(changed.comparison.alternatives[0]), id });
  await expect(p.store.completeComparison(p.id, p.hash, p.context, p.source, changed, signal())).rejects.toMatchObject({ code: 'conflict' });
});

it('serializes admission into the last live quota slot across two current sessions', async () => {
  const p = await prepared();
  for (let n = 0; n < 19; n++) {
    const next = await prepared(); await next.store.reserveComparison(next.id, next.hash, next.context, signal());
    await next.store.completeComparison(next.id, next.hash, next.context, next.source, next.draft, signal());
  }
  await f.q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('c',64),'owner',clock_timestamp()+interval '1 hour')");
  const second = await setup({ ...f.owner, sessionTokenHash: 'c'.repeat(64) });
  const results = await Promise.allSettled([p.store.reserveComparison(randomUUID(), p.hash, p.context, signal()), second.store.reserveComparison(randomUUID(), p.hash, second.context, signal())]);
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter(r => r.status === 'rejected').map(r => (r as PromiseRejectedResult).reason.code)).toEqual(['limit']);
}, 30000);

it.each([{ saved: false, limit: 200 }, { saved: true, limit: 1000 }])('bounds retained review rows independently of active review count ($saved)', async ({ saved, limit }) => {
  const p = await prepared();
  // Fictional historical quota rows only, not scheduling-save evidence.
  await f.q(`INSERT INTO owner_advisor_weekly_operations(workspace_id,owner_id,request_id,command_kind,command_hash,authority,session_hash,context,context_digest,state,completed_at,result)
    VALUES($1,'owner',$2,'compare_week',$3,$4,$5,$6::jsonb,$7,'completed',clock_timestamp(),'{}')`,
  [p.advisor.original.workspace.id, p.id, p.hash, p.advisor.original.authority, f.owner.sessionTokenHash, JSON.stringify(p.context), weeklyDigest(p.context)]);
  const seed = async (count: number) => f.q(`INSERT INTO owner_advisor_weekly_reviews(workspace_id,owner_id,review_id,comparison_id,authority,session_hash,context,context_digest,source_version,terms_digest,payload,prepared_at,expires_at,
    read_receipt_id,applied_operation,apply_hash,receipt,created_assignments,removed_assignments)
    SELECT $1,'owner',gen_random_uuid(),$2,$3,$4,$5::jsonb,$6,$7,$8,$9,clock_timestamp()-interval '2 minutes',clock_timestamp()-interval '1 minute',
      CASE WHEN $10::boolean THEN gen_random_uuid() END,CASE WHEN $10::boolean THEN gen_random_uuid() END,
      CASE WHEN $10::boolean THEN repeat('a',64) END,CASE WHEN $10::boolean THEN '{}'::jsonb END,
      CASE WHEN $10::boolean THEN '[{"id":"historical-fictional-shift"}]'::jsonb END,CASE WHEN $10::boolean THEN '[]'::jsonb END FROM generate_series(1,$11::integer)`,
  [p.advisor.original.workspace.id, p.id, p.advisor.original.authority, f.owner.sessionTokenHash, JSON.stringify(p.context), weeklyDigest(p.context),
    p.draft.comparison.sourceVersion, p.draft.reviews[0].review.termsDigest, JSON.stringify(p.draft.reviews[0]), saved, count]);
  await seed(limit - 1);
  expect(await p.store.reserveComparison(randomUUID(), p.hash, p.context, signal())).toEqual({ admitted: true });
  await seed(1);
  await expect(p.store.reserveComparison(randomUUID(), p.hash, p.context, signal())).rejects.toMatchObject({ code: 'limit' });
  expect(await f.q('SELECT count(*)::int n FROM owner_advisor_weekly_reviews')).toEqual([{ n: limit }]);
});

it('binds model-origin memory expiry to the business-local boundary without copying private intent', async () => {
  const p = await prepared();
  const [clock] = await f.q<{ today: string; boundary: string }>("SELECT (clock_timestamp() AT TIME ZONE $1)::date::text AS today,(((clock_timestamp() AT TIME ZONE $1)::date+1)::timestamp AT TIME ZONE $1)::text AS boundary", [p.advisor.original.workspace.timeZone]);
  await new AdvisorMemory(p.advisor, signal(), env).save({ op: 'memory', requestId: randomUUID(), expectedRevision: 0,
    change: { kind: 'save_intent', intentId: randomUUID(), kindOfIntent: 'preference', text: 'Private limited-term objective', focus: { kind: 'general' }, effectiveDate: clock.today, expiryDate: clock.today } });
  const current = await captureWeeklyContext(p.advisor, env, await modelOrigin(p.advisor), signal());
  expect(current.validUntil).toBe(new Date(clock.boundary).toISOString());
  expect(JSON.stringify(current)).not.toContain('Private limited-term objective');
});

it('invalidates a future guidance activation even when no knowledge revision changes', async () => {
  const settings = { ...env, NEVORA_OWNER_ADVISOR_KNOWLEDGE_ENABLED: 'true' };
  const [clock] = await f.q<{ activation: string }>("SELECT (clock_timestamp()+interval '1.5 seconds')::text AS activation");
  const saved = await companyKnowledgeService(f.owner, f.db.executor, signal(), { op: 'draft_document', requestId: randomUUID(), expectedRevision: 0,
    documentId: null, title: 'Future guidance', body: 'Fictional future procedure.', category: 'operations', locale: 'en', effectiveFrom: clock.activation });
  if (!('documentId' in saved)) throw Error('Expected draft receipt');
  await companyKnowledgeService(f.owner, f.db.executor, signal(), { op: 'publish', requestId: randomUUID(), expectedRevision: 1,
    documentId: saved.documentId, versionId: saved.versionId, reviewedTextDigest: saved.textDigest });
  const p = await prepared(settings); expect(p.context.validUntil).not.toBeNull();
  await p.store.assertContext(p.context, signal());
  await f.q('SELECT pg_sleep(1.6)');
  await expect(p.store.assertContext(p.context, signal())).rejects.toMatchObject({ code: 'conflict' });
  expect(await f.q('SELECT revision FROM owner_advisor_company_knowledge_state')).toEqual([{ revision: 2 }]);
});

it('cleans only sufficiently old unsaved proposals while preserving saved receipt custody', async () => {
  const p = await saveProposal();
  const [old] = await f.q<{ at: string; expiry: string }>("SELECT (clock_timestamp()-interval '26 hours')::text AS at,(clock_timestamp()-interval '25 hours')::text AS expiry");
  const oldComparison = randomUUID(), oldReview = randomUUID(), savedReview = randomUUID();
  await f.q(`INSERT INTO owner_advisor_weekly_operations(workspace_id,owner_id,request_id,command_kind,command_hash,authority,session_hash,context,context_digest,state,created_at,lease_until,completed_at,result)
    VALUES($1,'owner',$2,'compare_week',$3,$4,$5,$6::jsonb,$7,'completed',$8,$8::timestamptz+interval '25 seconds',$8,$9)`,
  [p.advisor.original.workspace.id, oldComparison, p.hash, p.advisor.original.authority, f.owner.sessionTokenHash, JSON.stringify(p.context), weeklyDigest(p.context), old.at, JSON.stringify(p.draft.comparison)]);
  const seed = async (id: string, saved: boolean) => {
    // Historical fictional custody seeds exercise retention/quota only; they
    // are not evidence that this test performed a real scheduling save.
    const payload = structuredClone(p.draft.reviews[0]); payload.review.id = id;
    payload.review.observedAt = old.at; payload.review.expiresAt = old.expiry;
    await f.q(`INSERT INTO owner_advisor_weekly_reviews(workspace_id,owner_id,review_id,comparison_id,authority,session_hash,context,context_digest,source_version,terms_digest,payload,prepared_at,expires_at,
      read_receipt_id,applied_operation,apply_hash,receipt,created_assignments,removed_assignments)
      VALUES($1,'owner',$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17::jsonb,$18::jsonb)`,
    [p.advisor.original.workspace.id, id, oldComparison, p.advisor.original.authority, f.owner.sessionTokenHash, JSON.stringify(p.context), weeklyDigest(p.context),
      payload.review.sourceVersion, payload.review.termsDigest, JSON.stringify(payload), old.at, old.expiry, saved ? randomUUID() : null, saved ? randomUUID() : null,
      saved ? 'a'.repeat(64) : null, saved ? '{}' : null, saved ? '[{"id":"historical-fictional-shift"}]' : null, saved ? '[]' : null]);
  };
  await seed(oldReview, false); await seed(savedReview, true);
  await p.store.reserveComparison(randomUUID(), p.hash, p.context, signal());
  expect(await f.q('SELECT review_id::text FROM owner_advisor_weekly_reviews WHERE review_id=ANY($1::uuid[]) ORDER BY review_id', [[oldReview, savedReview]])).toEqual([{ review_id: savedReview }]);
  expect(await f.q('SELECT count(*)::int n FROM owner_advisor_weekly_operations WHERE request_id=$1', [oldComparison])).toEqual([{ n: 1 }]);
  await expect(f.q('DELETE FROM owner_advisor_weekly_reviews WHERE review_id=$1', [savedReview])).rejects.toThrow('advisor_weekly_saved_custody');
});

it('does not charge receipt-backed comparison parents against the temporary-operation quota', async () => {
  const p = await prepared();
  // Historical fictional metadata seeds test quota accounting only. They do not
  // claim 200 real business saves; real apply/receipt atomicity has separate tests.
  await f.q(`WITH ids AS MATERIALIZED(SELECT gen_random_uuid() AS parent,gen_random_uuid() AS review FROM generate_series(1,200)),
    parents AS(INSERT INTO owner_advisor_weekly_operations(workspace_id,owner_id,request_id,command_kind,command_hash,authority,session_hash,context,context_digest,state,completed_at,result)
      SELECT $1,'owner',parent,'compare_week',$2,$3,$4,$5::jsonb,$6,'completed',clock_timestamp(),$7 FROM ids RETURNING request_id)
    INSERT INTO owner_advisor_weekly_reviews(workspace_id,owner_id,review_id,comparison_id,authority,session_hash,context,context_digest,source_version,terms_digest,payload,prepared_at,expires_at,
      read_receipt_id,applied_operation,apply_hash,receipt,created_assignments,removed_assignments)
      SELECT $1,'owner',i.review,p.request_id,$3,$4,$5::jsonb,$6,$8,$9,$10,clock_timestamp()-interval '2 minutes',clock_timestamp()-interval '1 minute',
        gen_random_uuid(),gen_random_uuid(),repeat('a',64),'{}'::jsonb,'[{"id":"historical-fictional-shift"}]'::jsonb,'[]'::jsonb FROM parents p JOIN ids i ON i.parent=p.request_id`,
    [p.advisor.original.workspace.id,p.hash,p.advisor.original.authority,f.owner.sessionTokenHash,JSON.stringify(p.context),weeklyDigest(p.context),JSON.stringify(p.draft.comparison),
      p.draft.comparison.sourceVersion,p.draft.reviews[0].review.termsDigest,JSON.stringify(p.draft.reviews[0])]);
  expect(await f.q('SELECT count(*) FILTER(WHERE applied_operation IS NOT NULL)::int saved,count(*) FILTER(WHERE applied_operation IS NULL)::int unsaved FROM owner_advisor_weekly_reviews')).toEqual([{ saved: 200, unsaved: 0 }]);
  expect(await p.store.reserveComparison(randomUUID(),p.hash,p.context,signal())).toEqual({ admitted: true });
  expect(await f.q("SELECT count(*)::int n FROM owner_advisor_weekly_operations WHERE command_kind='compare_week'")).toEqual([{ n: 201 }]);
  expect(await f.q('SELECT count(*)::int n FROM owner_advisor_weekly_reviews WHERE applied_operation IS NOT NULL')).toEqual([{ n: 200 }]);
});

it('bounds model-origin context at decision activation without a memory revision change', async () => {
  const p=await prepared(),memory=new AdvisorMemory(p.advisor,signal(),env);
  const [clock]=await f.q<{today:string;boundary:string}>("SELECT (clock_timestamp() AT TIME ZONE $1)::date::text today,(((clock_timestamp() AT TIME ZONE $1)::date+1)::timestamp AT TIME ZONE $1)::text boundary",[p.advisor.original.workspace.timeZone]);
  await memory.save({op:'memory',requestId:randomUUID(),expectedRevision:0,change:{kind:'save_decision',decisionId:randomUUID(),summary:'Future fictional choice',course:'Inspect',reason:'Owner intent',focus:{kind:'general'},decisionDate:addDays(clock.today,1),expiryDate:addDays(clock.today,7)}});
  const context=await captureWeeklyContext(p.advisor,env,await modelOrigin(p.advisor),signal());
  expect(context.validUntil).toBe(new Date(clock.boundary).toISOString());
});
it('keeps the original admission boundary through tool preparation and answer settlement', async () => {
  const p=await prepared(),memory=new AdvisorMemory(p.advisor,signal(),env),current=await memory.read();
  if(current.state!=='ready')throw Error('Expected memory');
  const [clock]=await f.q<{at:string;until:string}>("SELECT clock_timestamp()::text at,(clock_timestamp()+interval '1.5 seconds')::text until");
  const memoryAdmission={focus:{kind:'general' as const},digest:weeklyDigest(ownerMemoryContext(current.memory,new Date(clock.at).toISOString(),{kind:'general'},p.advisor.original.workspace.timeZone)),validUntil:new Date(clock.until).toISOString()};
  const context=await captureWeeklyContext(p.advisor,env,{requestId:randomUUID(),profileRevision:0,memoryRevision:0,memoryAdmission},signal());
  expect(context.validUntil).toBe(memoryAdmission.validUntil);
  await f.q('SELECT pg_sleep(1.6)');
  await expect(p.store.assertContext(context,signal())).rejects.toMatchObject({code:'conflict'});
});
