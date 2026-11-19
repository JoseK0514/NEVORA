import { afterEach, beforeEach, expect, it, rs } from '@rstest/core';
import { randomUUID } from 'node:crypto';
import { companyAccessFixture } from '@/test/integration/company-access-fixture';
import { fictionalProfile } from '@/test/fixtures/shift-changes';
import { advisorService } from './service.server';
import type { SqlExecutor } from '@/lib/notifications/types';
import { weeklyService } from './weekly-service.server';
import { companyKnowledgeService } from './company-knowledge.server';
import { ownerDecision, decisionReply } from '@/test/fixtures/owner-decision';
import { applyMemoryCommand, emptyMemory, parseMemoryCommand } from './memory';
import { addDays } from '@/lib/date-utils';
import { localDateTimeToInstant } from '@/lib/business-time';
let f: Awaited<ReturnType<typeof companyAccessFixture>>;
const env = { NEVORA_OWNER_ADVISOR_ENABLED: 'true', NEVORA_OWNER_ADVISOR_WEEKLY_ENABLED: 'true', NEVORA_OWNER_ADVISOR_PROVIDER: 'openai',
  NEVORA_OWNER_ADVISOR_DATA_APPROVED: 'true', NEVORA_OWNER_ADVISOR_MODEL: 'fictional', NEVORA_OWNER_ADVISOR_DAILY_LIMIT: '100', OPENAI_API_KEY: 'fictional' };
beforeEach(async () => {
  f = await companyAccessFixture(); rs.spyOn(globalThis, 'fetch').mockRejectedValue(Error('No real provider requests'));
  await f.q(`UPDATE location_staffing_settings SET minimum_staff_per_shift=1,requires_designated_lead=false;
    INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES('target','loc-1');
    INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) VALUES('mon-one','loc-1',1,'08:00','12:00'),('tue-one','loc-1',2,'08:00','12:00');
    INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) VALUES('mon-av','target',1,'08:00','12:00'),('tue-av','target',2,'08:00','12:00');
    INSERT INTO weekly_availability_submissions(employee_id,week_start,uses_normal_availability) VALUES('target','2026-11-16',true);`);
  await f.q("INSERT INTO employee_scheduling_settings(employee_id,maximum_weekly_hours,operational_rule_profile) VALUES('target',40,$1::jsonb)", [JSON.stringify(fictionalProfile())]);
});
afterEach(async () => { rs.restoreAllMocks(); await f?.db.dispose(); });
const command = () => ({ op: 'ask', requestId: randomUUID(), message: 'Compare the week of November16 for location1. Wait for my exact review.' });
const prose = () => Response.json({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'Open the private weekly review before making a decision. Nothing has been saved to the schedule.' }] }] });
function scripted(onSecond?: () => Promise<void>, expectWeekly = true) {
  let calls = 0;
  const transport = rs.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)); calls++;
    expect(body.tools.some((t: { name: string }) => t.name === 'weekly_plan')).toBe(expectWeekly);
    if (calls === 1 && expectWeekly) return Response.json({ output: [{ type: 'function_call', name: 'weekly_plan', call_id: 'fictional-weekly-tool',
      arguments: JSON.stringify({ weekStart: '2026-11-16', locationScope: { kind: 'SELECTED', locationIds: ['loc-1'] } }) }] });
    if (onSecond) await onSecond(); return prose();
  });
  return transport;
}
const call = (value: unknown, transport: Parameters<typeof advisorService>[5], executor = f.db.executor, settings = env, proof = f.owner) => advisorService(proof, executor, settings, new AbortController().signal, value, transport);

it('advertises weekly inspection only on a new enabled investigation and attaches only trusted read-only evidence', async () => {
  const transport = scripted(), result = await call(command(), transport);
  expect(result).toMatchObject({ state: 'answered', answer: { weeklyPlans: { mode: 'FILL_GAPS_ONLY', occurrence: 1 } } });
  if (!('answer' in result)) throw Error('Expected answer');
  expect(result.answer.weeklyPlans?.alternatives[0].added).toBe(2);
  expect(result.answer.weeklyInspectionRefs).toBeUndefined();
  const modelInput = String(transport.mock.calls[1][1].body);
  expect(modelInput).toContain('weeklyPlans'); expect(modelInput).not.toMatch(/readReceiptId|generatedClaims|retainedDigest/);
  expect(await f.q('SELECT (SELECT count(*)::int FROM shifts) shifts,(SELECT count(*)::int FROM owner_advisor_weekly_reviews WHERE read_receipt_id IS NOT NULL) handles')).toEqual([{ shifts: 0, handles: 0 }]);
});

it('preserves legacy investigations with weekly off and creates no weekly artifacts', async () => {
  const result = await call(command(), scripted(undefined, false), f.db.executor, { ...env, NEVORA_OWNER_ADVISOR_WEEKLY_ENABLED: 'false' });
  expect(result.state).toBe('answered'); expect('answer' in result && result.answer.weeklyPlans).toBeUndefined();
  expect(await f.q('SELECT count(*)::int n FROM owner_advisor_weekly_operations')).toEqual([{ n: 0 }]);
});

it('replays once without a provider call or new comparison and rejects a changed source rather than re-planning', async () => {
  const c = command(), transport = scripted(), result = await call(c, transport);
  const noProvider = rs.fn(async () => { throw Error('Replay must not run a provider'); });
  expect(await call(c, noProvider)).toMatchObject({ state: 'answered', answer: 'answer' in result ? result.answer : {} });
  await f.q("UPDATE employees SET first_name='Changed' WHERE id='target'");
  await expect(call(c, noProvider)).rejects.toMatchObject({ code: 'conflict' });
  expect(noProvider).not.toHaveBeenCalled(); expect(transport).toHaveBeenCalledTimes(2);
  expect(await f.q("SELECT count(*)::int n FROM owner_advisor_weekly_operations WHERE command_kind='compare_week'")).toEqual([{ n: 1 }]);
});

it('does not settle a model answer after the source changed during its explanation', async () => {
  await expect(call(command(), scripted(async () => { await f.q("UPDATE employees SET first_name='Changed' WHERE id='target'"); }))).rejects.toMatchObject({ code: 'conflict' });
  expect(await f.q("SELECT count(*)::int n FROM owner_advisor_requests WHERE state='completed' AND result IS NOT NULL")).toEqual([{ n: 0 }]);
});

it('rejects a source change immediately before the answer settlement lock and leaves history empty', async () => {
  let changed = false;
  const ex: SqlExecutor = { ...f.db.executor, async transaction(statements, signal) {
    if (!changed && statements.some(s => s.text.startsWith("UPDATE owner_advisor_requests SET state='completed'"))) {
      changed = true; await f.q("UPDATE employees SET first_name='Changed' WHERE id='target'");
    }
    return f.db.executor.transaction(statements, signal);
  } };
  await expect(call(command(), scripted(), ex)).rejects.toMatchObject({ code: 'conflict' });
  expect(await f.q("SELECT coalesce((SELECT jsonb_array_length(history) FROM owner_advisor_profiles WHERE owner_id='owner'),0)::int n")).toEqual([{ n: 0 }]);
});

it('rolls back an after-settlement trigger mutation, request completion and history together', async () => {
  await f.q("CREATE FUNCTION alter_source_after_weekly_answer() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN IF NEW.state='completed' THEN UPDATE employees SET first_name='Wrong trigger mutation' WHERE id='target'; END IF; RETURN NEW; END$$; CREATE TRIGGER zz_alter_source_after_weekly_answer AFTER UPDATE ON owner_advisor_requests FOR EACH ROW EXECUTE FUNCTION alter_source_after_weekly_answer()");
  await expect(call(command(), scripted())).rejects.toMatchObject({ code: 'conflict' });
  expect(await f.q("SELECT first_name FROM employees WHERE id='target'")).toEqual([{ first_name: 'Target' }]);
  expect(await f.q("SELECT coalesce((SELECT jsonb_array_length(history) FROM owner_advisor_profiles WHERE owner_id='owner'),0)::int n")).toEqual([{ n: 0 }]);
});

it('qualifies unselected weekly observations on replay without exposing their internal custody references', async () => {
  const c = command(); let round = 0;
  const transport = rs.fn(async () => {
    round++;
    if (round < 3) return Response.json({ output: [{ type: 'function_call', name: 'weekly_plan', call_id: `fictional-week-${round}`,
      arguments: JSON.stringify({ weekStart: round === 1 ? '2026-11-16' : '2026-11-23', locationScope: { kind: 'SELECTED', locationIds: ['loc-1'] } }) }] });
    return prose();
  });
  const result = await call(c, transport);
  if (!('answer' in result)) throw Error('Expected answer');
  expect(result.answer.weeklyPlans?.weekStart).toBe('2026-11-23'); expect(result.answer.weeklyInspectionRefs).toBeUndefined();
  const [stored] = await f.q<{ result: { weeklyInspectionRefs: { comparisonId: string }[] } }>('SELECT result FROM owner_advisor_requests WHERE request_id=$1', [c.requestId]);
  expect(stored.result.weeklyInspectionRefs).toHaveLength(2);
  const first = stored.result.weeklyInspectionRefs[0].comparisonId;
  const [review] = await f.q<{ review_id: string }>('SELECT review_id FROM owner_advisor_weekly_reviews WHERE comparison_id=$1 ORDER BY review_id LIMIT 1', [first]);
  await weeklyService(f.owner, f.db.executor, env, new AbortController().signal, { op: 'decline_week_plan', requestId: randomUUID(), reviewId: review.review_id });
  const noProvider = rs.fn(async () => { throw Error('No replay provider'); });
  await expect(call(c, noProvider)).rejects.toMatchObject({ code: 'conflict' }); expect(noProvider).not.toHaveBeenCalled();
  expect(await f.q("SELECT count(*)::int n FROM owner_advisor_weekly_operations WHERE command_kind='compare_week'")).toEqual([{ n: 2 }]);
});

it.each(['suppress', 'alter-result'])('rejects %s of weekly answer custody and rolls history back', async kind => {
  const mutation = kind === 'suppress' ? 'RETURN NULL;' : "NEW.result=jsonb_set(NEW.result,'{weeklyInspectionRefs}','[]'::jsonb);";
  await f.q(`CREATE FUNCTION corrupt_weekly_answer_custody() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN IF NEW.state='completed' THEN ${mutation} END IF; RETURN NEW; END$$;
    CREATE TRIGGER zz_corrupt_weekly_answer_custody BEFORE UPDATE ON owner_advisor_requests FOR EACH ROW EXECUTE FUNCTION corrupt_weekly_answer_custody()`);
  await expect(call(command(), scripted())).rejects.toMatchObject({ code: 'conflict' });
  expect(await f.q("SELECT coalesce((SELECT jsonb_array_length(history) FROM owner_advisor_profiles WHERE owner_id='owner'),0)::int n")).toEqual([{ n: 0 }]);
  expect(await f.q("SELECT count(*)::int n FROM owner_advisor_requests WHERE state='completed' AND result IS NOT NULL")).toEqual([{ n: 0 }]);
});

it('does not return a cached weekly answer with the weekly feature off', async () => {
  const c = command(); await call(c, scripted()); const noProvider = rs.fn(async () => { throw Error('No replay provider'); });
  await expect(call(c, noProvider, f.db.executor, { ...env, NEVORA_OWNER_ADVISOR_WEEKLY_ENABLED: 'false' })).rejects.toMatchObject({ code: 'conflict' });
  expect(noProvider).not.toHaveBeenCalled();
});

it.each(['en', 'es'])('reviews exact weekly identity and source-owned metrics with published guidance in %s using a scripted provider', async language => {
  const settings = { ...env, NEVORA_OWNER_ADVISOR_KNOWLEDGE_ENABLED: 'true' };
  const profile = await companyKnowledgeService(f.owner, f.db.executor, new AbortController().signal, { op: 'draft_profile', requestId: randomUUID(), expectedRevision: 0,
    locale: 'en', fields: { businessDescription: 'Fictional café. This guidance cannot approve scheduling changes.' } });
  if (!('documentId' in profile) || !profile.versionId || !profile.textDigest) throw Error('Expected profile draft');
  await companyKnowledgeService(f.owner, f.db.executor, new AbortController().signal, { op: 'publish', requestId: randomUUID(), expectedRevision: 1,
    documentId: profile.documentId, versionId: profile.versionId, reviewedTextDigest: profile.textDigest });
  let calls = 0; const requests: string[] = [];
  const transport = rs.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)); requests.push(String(init.body)); calls++;
    if (calls === 1) {
      expect(JSON.stringify(body.tools)).toContain('weekly_added_minutes');
      expect(String(init.body)).toContain('Fictional café');
      return Response.json({ output: [{ type: 'function_call', name: 'weekly_plan', call_id: 'weekly', arguments: JSON.stringify({ weekStart: '2026-11-16', locationScope: { kind: 'SELECTED', locationIds: ['loc-1'] } }) }] });
    }
    const reads = body.input.filter((i: { type: string }) => i.type === 'function_call_output').map((i: { output: string }) => JSON.parse(i.output));
    const current = reads.find((r: { weeklyPlans?: unknown }) => r.weeklyPlans), p = current.weeklyPlans, a = p.alternatives[0];
    const ref = { alternativeIndex: 0, reviewId: a.id, termsDigest: language === 'es' && calls === 2 ? 'c'.repeat(64) : a.termsDigest, weekStart: p.weekStart, locationScope: p.locationScope };
    const base = ownerDecision();
    const d = { ...base, language, summary: language === 'es' ? 'Revise el borrador semanal completo antes de decidir.' : 'Review the complete weekly draft before deciding.',
      changeCondition: 'Reconsider if requirements, source records or Owner priorities change.',
      observations: [{ statement: 'The server returned a scoped weekly draft comparison.', evidenceIds: [current.evidenceId] }],
      options: [{ ...base.options[0], feasibility: 'canonical_coverage', coverage: { evidenceId: current.evidenceId, ...ref }, evidenceIds: [current.evidenceId] }],
      metrics: [{ evidenceId: current.evidenceId, metric: 'weekly_added_minutes', weeklyPlan: ref }], acknowledgedPartialEvidence: ['E1', current.evidenceId] };
    return Response.json(decisionReply(d, `decision-${calls}`));
  });
  const c = { ...command(), op: 'ask_decision', objective: 'Inspect the selected location full-week draft', focus: { kind: 'general' } };
  const result = await call(c, transport, f.db.executor, settings).catch(error => {
    const feedback = requests.flatMap(raw => JSON.parse(raw).input).filter((item: { type?: string; output?: string }) => item.type === 'function_call_output' && item.output?.includes('"state":"revise"'));
    throw new Error(`Scripted weekly decision failed: ${JSON.stringify(feedback)}`, { cause: error });
  });
  if (!('answer' in result)) throw Error('Expected answer');
  expect(result.answer.weeklyPlans?.alternatives[0].added).toBe(2);
  expect(result.answer.text).toContain(language === 'es' ? 'Minutos semanales añadidos: 480' : 'Weekly added minutes: 480');
  expect(result.answer.text).toContain('2026-11-16'); expect(result.answer.text).toContain('2026-11-22');
  expect(result.answer.sources).toHaveLength(3);
  expect(result.answer.sources.some(s => s.href.includes('/knowledge/entries/'))).toBe(true);
  expect(result.answer.sources.some(s => s.href.startsWith('/app/ai-manager/weekly?review='))).toBe(true);
  expect(result.answer.weeklyInspectionRefs).toBeUndefined();
  if (language === 'es') { expect(calls).toBe(3); expect(requests[2]).toContain('INVALID_COVERAGE_REFERENCE'); }
  else expect(calls).toBe(2);
  expect(await f.q('SELECT (SELECT count(*)::int FROM shifts) shifts,(SELECT count(*)::int FROM owner_advisor_weekly_reviews WHERE read_receipt_id IS NOT NULL) handles')).toEqual([{ shifts: 0, handles: 0 }]);
});

it.each(['source','decline','feature-off','second-session'])('keeps weekly-derived turns outside reusable history after %s while preserving ordinary history', async invalidation => {
  const prior = [{role:'user',content:'Earlier general question'},{role:'assistant',content:'Earlier ordinary advice'}];
  await f.q('INSERT INTO owner_advisor_profiles(workspace_id,owner_id,history) VALUES($1,$2,$3::jsonb)',['workspace-fuel','owner',JSON.stringify(prior)]);
  const base = scripted();
  const transport = rs.fn(async (url: string, init: RequestInit) => {
    const response = await base(url,init), body = await response.json();
    if (body.output[0].type === 'message') body.output[0].content[0].text = 'FICTIONAL_WEEKLY_PRIVATE_HISTORY_MARKER: scoped weekly advice.';
    return Response.json(body);
  });
  const first = await call(command(),transport);
  if (!('answer' in first)) throw Error('Expected weekly answer');
  expect(first.answer.text).toContain('FICTIONAL_WEEKLY_PRIVATE_HISTORY_MARKER');
  let settings = env, proof = f.owner;
  if (invalidation==='source') await f.q("UPDATE employees SET first_name='Changed' WHERE id='target'");
  if (invalidation==='decline') await weeklyService(proof,f.db.executor,env,new AbortController().signal,
    {op:'decline_week_plan',requestId:randomUUID(),reviewId:first.answer.weeklyPlans!.alternatives[0].id});
  if (invalidation==='feature-off') settings={...env,NEVORA_OWNER_ADVISOR_WEEKLY_ENABLED:'false'};
  if (invalidation==='second-session') {
    await f.q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('d',64),'owner',clock_timestamp()+interval '1 hour')");
    proof={...f.owner,sessionTokenHash:'d'.repeat(64)};
  }
  const snapshot = await advisorService(proof,f.db.executor,settings,new AbortController().signal);
  expect('history' in snapshot && snapshot.history).toEqual(prior);
  const next = rs.fn(async (_url:string,init:RequestInit) => {
    expect(String(init.body)).not.toContain('FICTIONAL_WEEKLY_PRIVATE_HISTORY_MARKER');
    expect(String(init.body)).toContain('Earlier ordinary advice');
    return prose();
  });
  expect((await call({...command(),message:'Give a new general briefing'},next,f.db.executor,settings,proof)).state).toBe('answered');
  expect(next).toHaveBeenCalledOnce();
});

it('rejects a decision activation between initial model memory admission and the weekly tool', async () => {
  const [clock]=await f.q<{today:string}>("SELECT (clock_timestamp() AT TIME ZONE 'America/Puerto_Rico')::date::text today");
  const priorAt=localDateTimeToInstant(`${addDays(clock.today,-1)}T23:59`,'America/Puerto_Rico');
  const memory=applyMemoryCommand(emptyMemory(),parseMemoryCommand({op:'memory',requestId:randomUUID(),expectedRevision:0,
    change:{kind:'save_decision',decisionId:randomUUID(),summary:'FUTURE_DECISION_ACTIVATION_MARKER',course:'Inspect the new objective',reason:'Fictional future Owner decision',focus:{kind:'general'},decisionDate:clock.today,expiryDate:addDays(clock.today,7)}}),priorAt,undefined,'America/Puerto_Rico');
  await f.q('INSERT INTO owner_advisor_memories(workspace_id,owner_id,revision,intents,decisions) VALUES($1,$2,$3,$4::jsonb,$5::jsonb)',['workspace-fuel','owner',memory.revision,JSON.stringify(memory.intents),JSON.stringify(memory.decisions)]);
  let providerStarted=false;
  const executor:SqlExecutor={...f.db.executor,async transaction(statements,signal){
    const results=await f.db.executor.transaction(statements,signal);
    // Deliberate clock transition only; all authority/source/business SQL stays real.
    if(!providerStarted)statements.forEach((statement,index)=>{if(statement.text==='SELECT clock_timestamp() AS now')results[index]=[{now:priorAt}];});
    return results;
  }};
  const base=scripted(),transport=rs.fn(async(url:string,init:RequestInit)=>{
    if(!providerStarted)expect(String(init.body)).not.toContain('FUTURE_DECISION_ACTIVATION_MARKER');
    providerStarted=true;return base(url,init);
  });
  await expect(call(command(),transport,executor)).rejects.toMatchObject({code:'conflict'});
  expect(await f.q("SELECT count(*)::int n FROM owner_advisor_requests WHERE state='completed'")).toEqual([{n:0}]);
});
