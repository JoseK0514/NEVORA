/** Owned SQL preflight; scripted/deterministic evidence is not model quality. */
import { afterEach,beforeEach,expect,it } from 'vitest';
import { companyAccessFixture } from '@/test/integration/company-access-fixture';
import { seedPartnerFixture } from '@/test/integration/owner-advisor-partner-fixture';
import { resilienceBusinessSnapshot } from '@/test/integration/owner-advisor-resilience-fixture';
import { partnerCases } from '@/test/fixtures/owner-advisor-partner';
import { AdvisorStore } from './store.server';
import { AdvisorTools } from './tools.server';
import { admitOwner } from './authority.server';
let f:Awaited<ReturnType<typeof companyAccessFixture>>;
beforeEach(async()=>{f=await companyAccessFixture();});
afterEach(async()=>{await f?.db.dispose();});
it('genuine no-problem fixture is configured and fully covered before any alternative',async()=>{
 const setup=await seedPartnerFixture(f,'covered');
 const before=await resilienceBusinessSnapshot(f);
 const result=await new AdvisorTools(new AdvisorStore(f.owner,await admitOwner(f.owner,f.db.executor),f.db.executor)).run(setup.tool);
 expect(result.coveragePlans).toMatchObject({state:'ready',partial:false,baseline:{remainingBlocks:0}});
 expect(result.coveragePlans!.locations).toHaveLength(2);
 expect(await resilienceBusinessSnapshot(f)).toEqual(before);
});
it('acceptance identities are separate from the prior pack and model samples are explicitly not-run',()=>{
 expect(partnerCases).toHaveLength(32); expect(new Set(partnerCases.map(c=>c.id)).size).toBe(32);
 expect(partnerCases.every(c=>c.facts && c.expected && c.criticalFailures.length && c.modelSample==='not-run')).toBe(true);
});

it.each(['scarce','joint','stale'])('preflights actual canonical source and unchanged business tables: %s',async fixture=>{
 const setup=await seedPartnerFixture(f,fixture),before=await resilienceBusinessSnapshot(f);
 const tools=new AdvisorTools(new AdvisorStore(f.owner,await admitOwner(f.owner,f.db.executor),f.db.executor));
 const result=await tools.run(setup.tool);
 if(fixture==='scarce') expect(result.coveragePlans).toMatchObject({state:'ready',baseline:{remainingBlocks:2},alternatives:expect.arrayContaining([expect.objectContaining({remaining:expect.objectContaining({total:1})})])});
 else if(fixture==='joint') {
   expect(result.coveragePlans!.alternatives[0]).toMatchObject({status:'COMPLETE',addedMinutes:480,remaining:{total:0}});
   expect(result.coveragePlans!.alternatives[0].assignments.map(a=>[a.employeeName,a.locationId]).sort()).toEqual([['Riley Fictional','loc-1'],['Target QA','loc-2']]);
 } else expect(result.data).toMatchObject({publication:'PUBLISHED',shifts:[]});
 expect(await resilienceBusinessSnapshot(f)).toEqual(before);
});
it('real availability removal invalidates the earlier complete canonical plan',async()=>{
 const setup=await seedPartnerFixture(f,'joint');
 const tools=new AdvisorTools(new AdvisorStore(f.owner,await admitOwner(f.owner,f.db.executor),f.db.executor));
 const first=await tools.run(setup.tool);
 expect(first.coveragePlans!.alternatives[0].remaining.total).toBe(0);
 await f.q("DELETE FROM availability_windows WHERE employee_id='lab-riley'");
 const next=await tools.run(setup.tool);
 expect(next.coveragePlans!.sourceVersion).not.toBe(first.coveragePlans!.sourceVersion);
 expect(next.coveragePlans!.alternatives.every(a=>a.remaining.total>0)).toBe(true);
});
it('one unclosed October2 entry is one carry-in record across later dates, never repeated absences',async()=>{
 await seedPartnerFixture(f,'period');
 const tools=new AdvisorTools(new AdvisorStore(f.owner,await admitOwner(f.owner,f.db.executor),f.db.executor));
 const first=await tools.run({name:'operational_insights',args:{startDate:'2026-10-01',endDate:'2026-10-07'}});
 const next=await tools.run({name:'operational_insights',args:{startDate:'2026-10-08',endDate:'2026-10-14'}});
 expect(first.data).toMatchObject({denominators:{effectiveEntryRecords:1,openEntryRecords:1,carryInEntryRecords:0}});
 expect(next.data).toMatchObject({denominators:{effectiveEntryRecords:1,openEntryRecords:1,carryInEntryRecords:1},suggestions:[expect.objectContaining({kind:'open_entries',observedRecords:1})]});
});

it('paired facts include real availability changes omitted by legacy business-only snapshots',async()=>{
 const {partnerFactSnapshot}=await import('@/test/integration/owner-advisor-partner-fixture');
 await seedPartnerFixture(f,'joint');const first=await partnerFactSnapshot(f);
 await f.q("DELETE FROM availability_windows WHERE employee_id='lab-riley'");
 const next=await partnerFactSnapshot(f);expect(next.canonicalFacts).not.toEqual(first.canonicalFacts);expect(next.source).not.toEqual(first.source);
});
it('independent no-gap fixtures compare the same canonical facts despite separately minted shift episodes',async()=>{
 const {partnerFactSnapshot}=await import('@/test/integration/owner-advisor-partner-fixture');
 await seedPartnerFixture(f,'covered');const first=await partnerFactSnapshot(f);
 await f.db.dispose();f=await companyAccessFixture();await seedPartnerFixture(f,'covered');const next=await partnerFactSnapshot(f);
 expect(next.canonicalFacts).toEqual(first.canonicalFacts);expect(next.source).not.toEqual(first.source);
});
it('paired facts include private Owner context and preserve publication snapshot terms',async()=>{
 const {partnerFactSnapshot}=await import('@/test/integration/owner-advisor-partner-fixture');
 const {advisorService}=await import('./service.server');const {randomUUID}=await import('node:crypto');
 await seedPartnerFixture(f,'stale');const first=await partnerFactSnapshot(f);
 await advisorService(f.owner,f.db.executor,{NEVORA_OWNER_ADVISOR_ENABLED:'true'},new AbortController().signal,{op:'save_priorities',requestId:randomUUID(),expectedRevision:0,priorities:'Current explicit Owner objective'});
 const intent=await partnerFactSnapshot(f);expect(intent.canonicalFacts).not.toEqual(first.canonicalFacts);expect(intent.source).toEqual(first.source);
 await f.q("DELETE FROM schedule_publication_revisions WHERE id='lab-new'");
 expect((await partnerFactSnapshot(f)).canonicalFacts).not.toEqual(intent.canonicalFacts);
});
