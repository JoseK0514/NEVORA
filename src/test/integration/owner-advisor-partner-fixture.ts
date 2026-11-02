import { seedResilienceScenario, type ResilienceDatabase } from './owner-advisor-resilience-fixture';
import { resilienceForPartner } from '../fixtures/owner-advisor-partner';
export async function seedPartnerFixture(f: ResilienceDatabase, fixture: string) {
  const setup = await seedResilienceScenario(f,resilienceForPartner(fixture));
  if (fixture === 'covered') {
    await f.q(`INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('partner-one','loc-1','2026-11-02','DRAFT','owner'),('partner-two','loc-2','2026-11-02','DRAFT','owner');
    INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id) VALUES('partner-riley','partner-one','lab-riley','2026-11-05','08:00','12:00',NULL),('partner-target','partner-two','target','2026-11-05','08:00','12:00','lab-barista');`);
  }
  // Pin meaningful submission/publication event versions in fictional seed data;
  // these are compared, never normalized away from the evidence.
  await f.q("UPDATE weekly_availability_submissions SET submitted_at='2026-11-01T12:00:00Z',updated_at='2026-11-01T12:00:00Z'");
  await f.q("UPDATE schedule_publication_revisions SET created_at='2026-11-01T12:00:00Z'::timestamptz + revision_number * interval '1 minute'");
  return setup;
}

export async function partnerFactSnapshot(f: ResilienceDatabase) {
  const {readGenerationSource}=await import('../../lib/data/generation-guards');
  const {mapGenerationSource}=await import('../../lib/data/schedule-generation-snapshot');
  const {source,changedAt}=await readGenerationSource(f.db.executor);
  const input=mapGenerationSource({workspaceId:'workspace-fuel',actorEmployeeId:'owner',weekStart:'2026-11-02',mode:'FILL_GAPS_ONLY',locationScope:{kind:'ALL'}},source,changedAt).input;
  const [owner] = await f.q<{context:unknown}>(`SELECT jsonb_build_object(
    'workspaceDate',(SELECT (clock_timestamp() AT TIME ZONE time_zone)::date::text FROM workspaces WHERE id='workspace-fuel'),
    'profile',COALESCE((SELECT jsonb_build_object('revision',revision,'priorities',priorities,'history',history) FROM owner_advisor_profiles WHERE workspace_id='workspace-fuel' AND owner_id='owner'),'{"revision":0,"priorities":"","history":[]}'::jsonb),
    'notebook',COALESCE((SELECT jsonb_build_object('revision',revision,'goals',goals,'tasks',tasks) FROM owner_advisor_notebooks WHERE workspace_id='workspace-fuel' AND owner_id='owner'),'{"revision":0,"goals":[],"tasks":[]}'::jsonb),
    'memory',COALESCE((SELECT jsonb_build_object('revision',revision,'intents',intents,'decisions',decisions) FROM owner_advisor_memories WHERE workspace_id='workspace-fuel' AND owner_id='owner'),'{"revision":0,"intents":[],"decisions":[]}'::jsonb)) AS context`);
  // Only non-business workspace/position audit metadata is omitted. Domain
  // projection excludes opaque generated shift episode IDs; raw source retains
  // them exactly. Submission versions, publication/event dates, revisions and
  // Owner context are preserved, not normalized to hide fixture differences.
  const auditless = (v:object) => Object.fromEntries(Object.entries(v).filter(([key])=>key!=='createdAt'&&key!=='updatedAt'));
  const canonicalFacts={input:{...input,workspace:auditless(input.workspace),positions:input.positions.map(auditless)},publications:source.schedule_publication_revisions,publishedShifts:source.schedule_publication_revision_shifts,ownerContext:owner.context};
  return {source,canonicalFacts};
}
