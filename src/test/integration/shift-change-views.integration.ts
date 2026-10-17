import {randomUUID} from 'node:crypto';import {beforeAll,afterAll,expect,it,vi} from 'vitest';
import {createDisposableExchangeDatabase} from './local-postgres';import {seedShiftChanges,proof,fixtureShift} from './shift-change-fixture';
import {executeShiftChange} from '../../lib/data/shift-changes';import {listEmployeePublishedShifts} from '../../lib/data/exchanges';
let db:Awaited<ReturnType<typeof createDisposableExchangeDatabase>>;
vi.mock('../../lib/db',()=>({getDb:()=>({query:(text:string,values:readonly unknown[]=[])=>db.executor.query({text,values})}),queryRows:(r:unknown)=>r}));
beforeAll(async()=>{db=await createDisposableExchangeDatabase({mode:'current-runtime'});await seedShiftChanges(db.executor);});afterAll(async()=>{await db?.dispose();});
it('callout-capable reader preserves current assigned SOURCE and TARGET trades while ordinary trade reader excludes them',async()=>{
 const source=await fixtureShift(db.executor,'view-source','e1','2035-10-03'),target=await fixtureShift(db.executor,'view-target','e2','2035-10-04');
 expect((await executeShiftChange(proof('e1'),{kind:'PROPOSE_SWAP',operationId:randomUUID(),...source,targetShiftId:target.sourceShiftId,targetEpisodeId:target.sourceEpisodeId,targetTermsFingerprint:target.sourceTermsFingerprint},db.executor)).status).toBe('pending');
 expect(await listEmployeePublishedShifts('e1','2035-10-01')).toEqual([]);expect(await listEmployeePublishedShifts('e2','2035-10-01')).toEqual([]);
 expect((await listEmployeePublishedShifts('e1','2035-10-01',undefined,true)).map(s=>s.id)).toEqual(['view-source']);expect((await listEmployeePublishedShifts('e2','2035-10-01',undefined,true)).map(s=>s.id)).toEqual(['view-target']);
});
it('manager attention reader excludes effectively expired pending records before maintenance runs',async()=>{
 await db.executor.query({text:`UPDATE workspaces SET shift_change_policy=jsonb_set(shift_change_policy,'{coverage,mode}','"MANAGER_REVIEW"')`,values:[]});
 const terms=await fixtureShift(db.executor,'view-expired','e1','2035-10-06');const offered=await executeShiftChange(proof('e1'),{kind:'OFFER_COVERAGE',operationId:randomUUID(),...terms},db.executor);expect(offered.status).toBe('pending');if(offered.status!=='pending')throw Error('offer failed');
 expect((await executeShiftChange(proof('e2'),{kind:'ACCEPT',operationId:randomUUID(),requestId:offered.requestId,expectedRevision:1},db.executor)).status).toBe('pending');
 await db.executor.query({text:"UPDATE shift_exchanges SET completion_deadline=now()-interval '1 minute' WHERE id=$1",values:[offered.requestId]});
 const {listManagerPendingExchanges}=await import('../../lib/data/exchanges');expect(await listManagerPendingExchanges()).toEqual([]);
});
it('preview refuses unknown mandatory rules using the same guarded command plan and exposes no peer profile',async()=>{
 const terms=await fixtureShift(db.executor,'view-unknown','e1','2035-10-08');const offer=await executeShiftChange(proof('e1'),{kind:'OFFER_COVERAGE',operationId:randomUUID(),...terms},db.executor);if(offer.status!=='pending')throw Error(JSON.stringify(offer));
 const accepted=await executeShiftChange(proof('e2'),{kind:'ACCEPT',operationId:randomUUID(),requestId:offer.requestId,expectedRevision:1},db.executor);expect(accepted.status).toBe('pending');
 await db.executor.query({text:"UPDATE employee_scheduling_settings SET operational_rule_profile=jsonb_set(operational_rule_profile,'{breaks}','{\"status\":\"UNKNOWN\"}') WHERE employee_id='e2'",values:[]});
 const {readShiftChangeAvailability}=await import('../../lib/data/shift-changes');const command={kind:'MANAGER_APPROVE' as const,operationId:randomUUID(),requestId:offer.requestId,expectedRevision:2};
 const before=await db.executor.query({text:'SELECT count(*) AS count FROM shift_change_events',values:[]});expect(await readShiftChangeAvailability(proof('owner'),command,db.executor)).toMatchObject({allowed:false,notice:'Needs Owner rule review',refusal:'review'});expect(await db.executor.query({text:'SELECT count(*) AS count FROM shift_change_events',values:[]})).toEqual(before);expect((await executeShiftChange(proof('owner'),command,db.executor)).status).toBe('blocked');
 const [{employee_id}]=await db.executor.query<{employee_id:string}>({text:"SELECT employee_id FROM shifts WHERE id='view-unknown'",values:[]});expect(employee_id).toBe('e1');
});
it('history presentation retains original terms after live shift deletion and excludes a foreign peer',async()=>{
 const {readShiftChangeHistoryView}=await import('../../lib/data/shift-change-views');const terms=await fixtureShift(db.executor,'view-history','e1','2035-10-10');const offer=await executeShiftChange(proof('e1'),{kind:'OFFER_COVERAGE',operationId:randomUUID(),...terms},db.executor);if(offer.status!=='pending')throw Error(JSON.stringify(offer));
 await executeShiftChange(proof('e1'),{kind:'CANCEL',operationId:randomUUID(),requestId:offer.requestId,expectedRevision:1},db.executor);await db.executor.query({text:"DELETE FROM shifts WHERE id='view-history'",values:[]});
 const rows=await readShiftChangeHistoryView(proof('e1'),offer.requestId,db.executor);expect(rows).toHaveLength(2);expect(rows[0].source).toContain('2035-10-10 · 08:00 – 16:00');expect(Object.keys(rows[0]).sort()).toEqual(['at','event','mode','revision','source','target']);expect(await readShiftChangeHistoryView(proof('e3'),offer.requestId,db.executor)).toEqual([]);
});
