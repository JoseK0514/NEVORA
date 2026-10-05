import {reviewedFixtureSource} from './shift-change-api';
import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, expect, it } from 'vitest';
import { createDisposableExchangeDatabase } from './local-postgres';
import { executeShiftChange,findShiftChangeOperation } from '../../lib/data/shift-changes';
import { proof,seedShiftChanges,fixtureShift } from './shift-change-fixture';

import type { ShiftChangeCommand } from '../../lib/shift-changes/types';
let db: Awaited<ReturnType<typeof createDisposableExchangeDatabase>>;
const q = (text:string, values:readonly unknown[]=[]) => db.executor.query<Record<string,unknown>>({text,values});
beforeAll(async()=>{db=await createDisposableExchangeDatabase({mode:'current-runtime'});await seedShiftChanges(db.executor);});
afterAll(async()=>{await db?.dispose();});
const shift=(id:string,employee='e1',date='2035-10-02')=>fixtureShift(db.executor,id,employee,date);
it('A039/A048 atomic coverage creates a protected assignment once and reconciles original result',async()=>{
 const terms=await shift('coverage');
 const offer=await executeShiftChange(proof('e1'),{kind:'OFFER_COVERAGE',operationId:randomUUID(),...terms},db.executor);
 expect(offer).toMatchObject({status:'pending'}); if(offer.status!=='pending') return;
 const command:ShiftChangeCommand={kind:'ACCEPT',requestId:offer.requestId,expectedRevision:1,operationId:randomUUID()};
 const accepted=await executeShiftChange(proof('e2'),command,db.executor);
 expect(accepted).toMatchObject({status:'completed',requestId:offer.requestId,revision:2});
 expect(await executeShiftChange(proof('e2'),command,db.executor)).toEqual(accepted);
 expect(await findShiftChangeOperation(proof('e2'),command.operationId,db.executor)).toEqual(accepted);
 expect(await findShiftChangeOperation(proof('e3'),command.operationId,db.executor)).toBeNull();
 expect(await findShiftChangeOperation({...proof('e2'),sessionTokenHash:'f'.repeat(64)},command.operationId,db.executor)).toBeNull();
 expect(await executeShiftChange(proof('e2'),{...command,kind:'CANCEL'},db.executor)).toEqual({status:'conflict'});
 const [row]=await q("SELECT employee_id,assignment_origin,assignment_episode_id FROM shifts WHERE id='coverage'");
 expect(row).toMatchObject({employee_id:'e2',assignment_origin:'MANAGER'});expect(row.assignment_episode_id).not.toBe(terms.sourceEpisodeId);
 expect(await q('SELECT * FROM shift_change_participation WHERE exchange_id=$1',[offer.requestId])).toHaveLength(0);
 expect(await q('SELECT * FROM shift_change_events WHERE request_id=$1',[offer.requestId])).toHaveLength(2);
 expect(await q('SELECT * FROM shift_change_operations WHERE request_id=$1',[offer.requestId])).toHaveLength(2);
 const [request]=await q('SELECT resolved_by,outcome_mode FROM shift_exchanges WHERE id=$1',[offer.requestId]);
 expect(request).toEqual({resolved_by:null,outcome_mode:'AUTOMATIC'});
});
it('A041 atomic swap preserves both slots and replaces both episodes',async()=>{
 const a=await shift('swap-a','e1','2035-10-03'),b=await shift('swap-b','e3','2035-10-04');
 const offer=await executeShiftChange(proof('e1'),{kind:'PROPOSE_SWAP',operationId:randomUUID(),...a,targetShiftId:b.sourceShiftId,targetEpisodeId:b.sourceEpisodeId,targetTermsFingerprint:b.sourceTermsFingerprint},db.executor);
 expect(offer).toMatchObject({status:'pending'});if(offer.status!=='pending')return;
 expect(await executeShiftChange(proof('e3'),{kind:'ACCEPT',operationId:randomUUID(),requestId:offer.requestId,expectedRevision:1},db.executor)).toMatchObject({status:'completed'});
 expect(await q("SELECT id,employee_id,date::text FROM shifts WHERE id LIKE 'swap-%' ORDER BY id")).toEqual([{id:'swap-a',employee_id:'e3',date:'2035-10-03'},{id:'swap-b',employee_id:'e1',date:'2035-10-04'}]);
});
it('A019 approved callout release keeps private provenance and supports voluntary replacement',async()=>{
 await shift('callout','e1','2035-10-05');
 const submitted=await executeShiftChange(proof('e1'),{kind:'SUBMIT_CALLOUT',operationId:randomUUID(),...await reviewedFixtureSource(db.executor,'callout'),reasonCode:'ILLNESS',reasonNote:'Private detail'},db.executor);
 expect(submitted).toMatchObject({status:'pending'});if(submitted.status!=='pending')return;
 expect(await executeShiftChange(proof('owner'),{kind:'APPROVE_CALLOUT',operationId:randomUUID(),requestId:submitted.requestId,expectedRevision:1},db.executor)).toMatchObject({status:'completed'});
 const [offer]=await q('SELECT id,requester_consent,linked_callout_id FROM shift_exchanges WHERE linked_callout_id=$1',[submitted.requestId]);
 expect(offer.requester_consent).toBeNull();
 expect(JSON.stringify(await q('SELECT * FROM notifications WHERE source_id=$1 OR source_id=$2',[submitted.requestId,offer.id]))).not.toContain('Private detail');
 expect(await executeShiftChange(proof('e2'),{kind:'ACCEPT',operationId:randomUUID(),requestId:String(offer.id),expectedRevision:1},db.executor)).toMatchObject({status:'completed'});
 expect((await q("SELECT employee_id FROM shifts WHERE id='callout'"))[0].employee_id).toBe('e2');
});
it('A019/A020/A051 callout release reads reject material edits, timezone changes, wrong fingerprints and a returning owner',async()=>{
 const {readNotificationWeekState}=await import('../../lib/data/notification-transactions');
 const {updateShift}=await import('../../lib/data/schedules');
 await shift('release','e1','2035-10-06');
 const created=await executeShiftChange(proof('e1'),{kind:'SUBMIT_CALLOUT',operationId:randomUUID(),...await reviewedFixtureSource(db.executor,'release'),reasonCode:'ILLNESS'},db.executor);expect(created.status).toBe('pending');if(created.status!=='pending')return;
 await executeShiftChange(proof('owner'),{kind:'APPROVE_CALLOUT',operationId:randomUUID(),requestId:created.requestId,expectedRevision:1},db.executor);
 const released=async()=> (await readNotificationWeekState(['2035-10-01'],db.executor)).shifts.find(s=>s.sourceShiftId==='release')!.isCalloutApproved;
 expect(await released()).toBe(true);
 const [original]=await q('SELECT reviewed_terms_fingerprint FROM shift_callouts WHERE id=$1',[created.requestId]);
 await q("UPDATE shift_callouts SET reviewed_terms_fingerprint='v1:wrong' WHERE id=$1",[created.requestId]);expect(await released()).toBe(false);
 await q('UPDATE shift_callouts SET reviewed_terms_fingerprint=$2 WHERE id=$1',[created.requestId,original.reviewed_terms_fingerprint]);
 await q("UPDATE workspaces SET time_zone='America/New_York'");expect(await released()).toBe(false);await q("UPDATE workspaces SET time_zone='America/Puerto_Rico'");
 expect(await updateShift({shiftId:'release',employeeId:'e1',date:'2035-10-06',startTime:'09:00',endTime:'16:00',actorEmployeeId:'owner'},db.executor)).toBe(true);expect(await released()).toBe(false);
 await q("UPDATE shifts SET start_time='08:00',employee_id='e2' WHERE id='release'; UPDATE shifts SET employee_id='e1' WHERE id='release'");expect(await released()).toBe(false);
 const {readShiftChangeHistory}=await import('../../lib/data/shift-change-history');expect((await readShiftChangeHistory(proof('e1'),created.requestId,db.executor)).length).toBe(2);expect(await readShiftChangeHistory(proof('e3'),created.requestId,db.executor)).toEqual([]);
});
it('A005/A085/A089 manual mode persists through later policy loosening and approver is real',async()=>{
 await q("UPDATE workspaces SET shift_change_policy=jsonb_set(shift_change_policy,'{coverage,mode}','\"MANAGER_REVIEW\"')");
 const terms=await shift('manual','e1','2035-10-07');const offered=await executeShiftChange(proof('e1'),{kind:'OFFER_COVERAGE',operationId:randomUUID(),...terms},db.executor);expect(offered.status).toBe('pending');if(offered.status!=='pending')return;
 await q("UPDATE workspaces SET shift_change_policy=jsonb_set(shift_change_policy,'{coverage,mode}','\"AUTOMATIC_WHEN_VALID\"')");
 expect(await executeShiftChange(proof('e2'),{kind:'ACCEPT',operationId:randomUUID(),requestId:offered.requestId,expectedRevision:1},db.executor)).toMatchObject({status:'pending',revision:2});
 expect((await q("SELECT employee_id FROM shifts WHERE id='manual'"))[0].employee_id).toBe('e1');
 expect(await executeShiftChange(proof('owner'),{kind:'MANAGER_APPROVE',operationId:randomUUID(),requestId:offered.requestId,expectedRevision:2},db.executor)).toMatchObject({status:'completed',revision:3});
 expect((await q('SELECT resolved_by,outcome_mode FROM shift_exchanges WHERE id=$1',[offered.requestId]))[0]).toEqual({resolved_by:'owner',outcome_mode:'MANAGER'});
});
it.each(['DECLINE','CANCEL','WITHDRAW','MANAGER_DECLINE','MANAGER_CLOSE'] as const)('A003/A015/A022 %s closes only the authorized current lifecycle',async kind=>{
 const i=['DECLINE','CANCEL','WITHDRAW','MANAGER_DECLINE','MANAGER_CLOSE'].indexOf(kind);const terms=await shift('close-'+kind,'e1',`2035-10-${11+i}`);let r=await executeShiftChange(proof('e1'),{kind:'OFFER_COVERAGE',operationId:randomUUID(),...terms},db.executor);
 if(kind==='DECLINE'){
  if(r.status!=='pending')throw Error(JSON.stringify(r));await executeShiftChange(proof('e1'),{kind:'CANCEL',operationId:randomUUID(),requestId:r.requestId,expectedRevision:1},db.executor);
  const target=await shift('decline-target','e3','2035-10-20');r=await executeShiftChange(proof('e1'),{kind:'PROPOSE_SWAP',operationId:randomUUID(),...terms,targetShiftId:target.sourceShiftId,targetEpisodeId:target.sourceEpisodeId,targetTermsFingerprint:target.sourceTermsFingerprint},db.executor);
 }
 expect(r.status).toBe('pending');if(r.status!=='pending')return;let revision=1;
 if(kind==='WITHDRAW'){await q("UPDATE workspaces SET shift_change_policy=jsonb_set(shift_change_policy,'{coverage,mode}','\"MANAGER_REVIEW\"')");expect(await executeShiftChange(proof('e2'),{kind:'ACCEPT',operationId:randomUUID(),requestId:r.requestId,expectedRevision:1},db.executor)).toMatchObject({status:'pending'});revision=2;}
 const actor=kind.startsWith('MANAGER')?'owner':kind==='WITHDRAW'?'e2':kind==='DECLINE'?'e3':'e1';
 const result=await executeShiftChange(proof(actor),{kind,operationId:randomUUID(),requestId:r.requestId,expectedRevision:revision},db.executor);expect(result).toMatchObject({status:'closed'});
 expect(await q('SELECT * FROM shift_change_participation WHERE exchange_id=$1',[r.requestId])).toHaveLength(0);
 expect((await q('SELECT employee_id FROM shifts WHERE id=$1',[terms.sourceShiftId]))[0].employee_id).toBe('e1');
 await q("UPDATE workspaces SET shift_change_policy=jsonb_set(shift_change_policy,'{coverage,mode}','\"AUTOMATIC_WHEN_VALID\"')");
});
it('A004/A043/A068 direct wrong owner, wrong target, forged role and revoked proof cannot mutate',async()=>{
 const terms=await shift('authority','e1','2035-10-22');
 expect((await executeShiftChange(proof('e2'),{kind:'OFFER_COVERAGE',operationId:randomUUID(),...terms},db.executor)).status).toBe('blocked');
 expect(await executeShiftChange({...proof('e1'),employee:{...proof('e1').employee,role:'OWNER'}},{kind:'OFFER_COVERAGE',operationId:randomUUID(),...terms},db.executor)).toEqual({status:'unavailable'});
 expect(await executeShiftChange({...proof('e1'),sessionTokenHash:'f'.repeat(64)},{kind:'OFFER_COVERAGE',operationId:randomUUID(),...terms},db.executor)).toEqual({status:'unavailable'});
 const target=await shift('authority-target','e3','2035-10-23');const offer=await executeShiftChange(proof('e1'),{kind:'PROPOSE_SWAP',operationId:randomUUID(),...terms,targetShiftId:target.sourceShiftId,targetEpisodeId:target.sourceEpisodeId,targetTermsFingerprint:target.sourceTermsFingerprint},db.executor);expect(offer.status).toBe('pending');if(offer.status!=='pending')return;
 expect(await executeShiftChange(proof('e2'),{kind:'ACCEPT',operationId:randomUUID(),requestId:offer.requestId,expectedRevision:1},db.executor)).toEqual({status:'unavailable'});
 expect(await q('SELECT * FROM shift_change_events WHERE request_id=$1',[offer.requestId])).toHaveLength(1);
});
it('A019 legacy approval cannot release today’s assignment and expired trade does not prohibit reporting inability',async()=>{
 await shift('legacy-release','e1','2035-10-24');await q("INSERT INTO shift_callouts(id,shift_id,employee_id,reason_code,status) VALUES('legacy-approved','legacy-release','e1','ILLNESS','APPROVED')");
 const {readNotificationWeekState}=await import('../../lib/data/notification-transactions');expect((await readNotificationWeekState(['2035-10-01'],db.executor)).shifts.find(s=>s.sourceShiftId==='legacy-release')!.isCalloutApproved).toBe(false);
 await shift('late-report','e1','2026-01-01');expect(await executeShiftChange(proof('e1'),{kind:'SUBMIT_CALLOUT',operationId:randomUUID(),...await reviewedFixtureSource(db.executor,'late-report'),reasonCode:'ILLNESS'},db.executor)).toMatchObject({status:'pending'});
});
it('A051 same-owner material edit requires new explicit review even after editing back; a fresh report remains possible',async()=>{
 const {readNotificationWeekState}=await import('../../lib/data/notification-transactions');
 await shift('rereview','e1','2035-10-25');const first=await executeShiftChange(proof('e1'),{kind:'SUBMIT_CALLOUT',operationId:randomUUID(),...await reviewedFixtureSource(db.executor,'rereview'),reasonCode:'ILLNESS'},db.executor);expect(first.status).toBe('pending');if(first.status!=='pending')return;
 expect(await executeShiftChange(proof('owner'),{kind:'APPROVE_CALLOUT',operationId:randomUUID(),requestId:first.requestId,expectedRevision:1},db.executor)).toMatchObject({status:'completed'});
 await q("UPDATE shifts SET start_time='09:00' WHERE id='rereview'; UPDATE shifts SET start_time='08:00' WHERE id='rereview'");
 expect((await readNotificationWeekState(['2035-10-01'],db.executor)).shifts.find(s=>s.sourceShiftId==='rereview')!.isCalloutApproved).toBe(false);
 const second=await executeShiftChange(proof('e1'),{kind:'SUBMIT_CALLOUT',operationId:randomUUID(),...await reviewedFixtureSource(db.executor,'rereview'),reasonCode:'ILLNESS'},db.executor);expect(second.status).toBe('pending');if(second.status!=='pending')return;
 expect(await executeShiftChange(proof('owner'),{kind:'APPROVE_CALLOUT',operationId:randomUUID(),requestId:second.requestId,expectedRevision:1},db.executor)).toMatchObject({status:'completed'});
 expect((await q('SELECT status FROM shift_callouts WHERE id=$1',[first.requestId]))[0].status).toBe('APPROVED');
 expect((await readNotificationWeekState(['2035-10-01'],db.executor)).shifts.find(s=>s.sourceShiftId==='rereview')!.isCalloutApproved).toBe(true);
 expect(await executeShiftChange(proof('e1'),{kind:'SUBMIT_CALLOUT',operationId:randomUUID(),...await reviewedFixtureSource(db.executor,'rereview'),reasonCode:'ILLNESS'},db.executor)).toEqual({status:'conflict'});
});

it('A043 review view returns only current authorized terms and refuses stale displayed timezone consent',async()=>{
 const {readShiftChangeTerms}=await import('../../lib/data/shift-change-snapshot');
 const t=await shift('review-view','e1','2035-11-01');
 const view=await readShiftChangeTerms(proof('e1'),t.sourceShiftId,undefined,db.executor);
 expect(view).toMatchObject({source:{shiftId:t.sourceShiftId,employeeId:'e1',timeZone:'America/Puerto_Rico'},sourceTermsFingerprint:t.sourceTermsFingerprint});
 expect(Object.keys(view!).sort()).toEqual(['observedAt','source','sourceTermsFingerprint','target','targetTermsFingerprint']);
 expect(Number.isFinite(Date.parse(view!.observedAt))).toBe(true);
 expect(await readShiftChangeTerms(proof('e2'),t.sourceShiftId,undefined,db.executor)).toBeNull();
 await q("UPDATE workspaces SET time_zone='America/New_York'");
 expect(await executeShiftChange(proof('e1'),{kind:'OFFER_COVERAGE',operationId:randomUUID(),...t},db.executor)).toMatchObject({status:'blocked'});
 await q("UPDATE workspaces SET time_zone='America/Puerto_Rico'");
 expect(await executeShiftChange(proof('e1'),{kind:'OFFER_COVERAGE',operationId:randomUUID(),...t},db.executor)).toMatchObject({status:'blocked'});
});
it('A054/A057 affected publication preserves uninvolved acknowledgement and creates no unrelated revision',async()=>{
 const {publishScheduleWithRevision}=await import('../../lib/data/publication-revisions');
 const {acknowledgeScheduleWeek}=await import('../../lib/data/acknowledgements');
 const {readNotificationWeekState,personalProjections}=await import('../../lib/data/notification-transactions');
 const t=await shift('ack-change','e1','2035-11-02');
 await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('unrelated-week','loc-2','2035-10-08','PUBLISHED','owner')");
 await publishScheduleWithRevision({locationId:'loc-1',weekStart:'2035-10-01',managerId:'owner'},db.executor);
 for(const id of ['e1','e2','e3'])expect(await acknowledgeScheduleWeek({weekStart:'2035-10-01',employeeId:id},db.executor)).toBe(true);
 const before=personalProjections(await readNotificationWeekState(['2035-10-01'],db.executor),'2035-10-01');
 const revisionsBefore=await q('SELECT id FROM schedule_publication_revisions');
 const offer=await executeShiftChange(proof('e1'),{kind:'OFFER_COVERAGE',operationId:randomUUID(),...t},db.executor);expect(offer.status).toBe('pending');if(offer.status!=='pending')return;
 const command:ShiftChangeCommand={kind:'ACCEPT',requestId:offer.requestId,expectedRevision:1,operationId:randomUUID()};
 const accepted=await executeShiftChange(proof('e2'),command,db.executor);expect(accepted.status).toBe('completed');
 const after=personalProjections(await readNotificationWeekState(['2035-10-01'],db.executor),'2035-10-01');
 expect(after.e3.effectiveVersion).toBe(before.e3.effectiveVersion);expect(after.e3.acknowledgement).toMatchObject({acknowledged:true,needsAcknowledgement:false});
 for(const id of ['e1','e2']) {expect(after[id].effectiveVersion).not.toBe(before[id].effectiveVersion);expect(after[id].acknowledgement?.needsAcknowledgement).toBe(true);}
 expect(await q('SELECT id FROM schedule_publication_revisions')).toHaveLength(revisionsBefore.length+1);
 expect(await q("SELECT id FROM schedule_publication_revisions WHERE week_start='2035-10-08'")).toHaveLength(0);
 const outbox=await q('SELECT * FROM notifications WHERE source_id=$1',[offer.requestId]);expect(outbox.length).toBeGreaterThan(0);
 expect(await executeShiftChange(proof('e2'),command,db.executor)).toEqual(accepted);
 expect(await q('SELECT * FROM notifications WHERE source_id=$1',[offer.requestId])).toEqual(outbox);
 expect(await q('SELECT id FROM schedule_publication_revisions')).toHaveLength(revisionsBefore.length+1);
});
it('A051 material revision is server-owned, changes for edits and parents, and ignores labels',async()=>{
 await shift('material-version','e1','2035-11-03');
 const get=async()=> (await q("SELECT terms_revision,assignment_episode_id FROM shifts WHERE id='material-version'"))[0];const original=await get();
 await q("UPDATE shifts SET terms_revision=900,notes='harmless label' WHERE id='material-version'");expect(await get()).toEqual(original);
 await q("UPDATE shifts SET start_time='09:00',terms_revision=900 WHERE id='material-version'");expect(await get()).toEqual({...original,terms_revision:2});
 await q("UPDATE shifts SET start_time='08:00' WHERE id='material-version'");expect(await get()).toEqual({...original,terms_revision:3});
 await q("UPDATE schedules SET week_start='2035-09-24' WHERE id='schedule'");expect(await get()).toEqual({...original,terms_revision:4});
 await q("UPDATE schedules SET week_start='2035-10-01' WHERE id='schedule'");expect(await get()).toEqual({...original,terms_revision:5});
});
it.each(['CANCEL_CALLOUT','DECLINE_CALLOUT'] as const)('R1/R2 %s after reassignment preserves original absence ownership, terms and atomic closure',async kind=>{
 const {readShiftChangeHistory}=await import('../../lib/data/shift-change-history');const {readGenerationSource}=await import('../../lib/data/generation-guards');const {readNotificationWeekState}=await import('../../lib/data/notification-transactions');
 const id='private-'+kind;await shift(id,'e1','2036-02-03');
 const created=await executeShiftChange(proof('e1'),{kind:'SUBMIT_CALLOUT',operationId:randomUUID(),...await reviewedFixtureSource(db.executor,id),reasonCode:'ILLNESS',reasonNote:'Original E1 private reason'},db.executor);expect(created.status).toBe('pending');if(created.status!=='pending')return;
 const [original]=await q('SELECT source_terms FROM shift_callouts WHERE id=$1',[created.requestId]);
 await q("UPDATE shifts SET employee_id='e2',start_time='09:00' WHERE id=$1",[id]);
 const before=await readGenerationSource(db.executor),weekBefore=await readNotificationWeekState(['2035-10-01'],db.executor);
 const command:ShiftChangeCommand={kind,requestId:created.requestId,expectedRevision:1,operationId:randomUUID()},actor=proof(kind==='CANCEL_CALLOUT'?'e1':'owner');
 const injected={query:db.executor.query,transaction:(statements:readonly import('../../lib/notifications/types').SqlStatement[])=>{const n=statements.findIndex(x=>x.text.startsWith('INSERT INTO shift_change_events'));expect(n).toBeGreaterThan(0);return db.executor.transaction([...statements.slice(0,n+1),{text:'SELECT 1/0',values:[]},...statements.slice(n+1)]);}};
 await expect(executeShiftChange(actor,command,injected)).rejects.toMatchObject({code:'22012'});
 expect((await readGenerationSource(db.executor)).source).toEqual(before.source);expect(await readNotificationWeekState(['2035-10-01'],db.executor)).toEqual(weekBefore);
 expect(await executeShiftChange(actor,command,db.executor)).toMatchObject({status:'closed',revision:2});
 const events=await q('SELECT source_terms,participants,actor_employee_id,outcome_mode FROM shift_change_events WHERE request_id=$1 ORDER BY request_revision',[created.requestId]);expect(events).toHaveLength(2);
 expect.soft(events[1]).toEqual({source_terms:original.source_terms,participants:{employeeId:'e1'},actor_employee_id:actor.employee.id,outcome_mode:kind==='CANCEL_CALLOUT'?null:'MANAGER'});
 const originalHistory=await readShiftChangeHistory(proof('e1'),created.requestId,db.executor);expect.soft(originalHistory).toHaveLength(2);expect.soft(JSON.stringify(originalHistory)).toContain('Original E1 private reason');
 expect.soft(await readShiftChangeHistory(proof('e2'),created.requestId,db.executor)).toEqual([]);
 expect.soft(await q("SELECT employee_id FROM notifications WHERE source_id=$1 AND employee_id='e2'",[created.requestId])).toEqual([]);
 if(kind==='DECLINE_CALLOUT')expect.soft(await q("SELECT employee_id FROM notifications WHERE source_id=$1 AND source_version='r:2' AND type='CALLOUT_DENIED'",[created.requestId])).toEqual([{employee_id:'e1'}]);
 expect((await q('SELECT employee_id FROM shifts WHERE id=$1',[id]))[0].employee_id).toBe('e2');expect(await q('SELECT * FROM shift_change_participation WHERE shift_id=$1',[id])).toHaveLength(0);
});
it.each(['COVERAGE','SWAP'] as const)('R1 %s stale closure retains original participants and both reviewed terms',async kind=>{
 const {readShiftChangeHistory}=await import('../../lib/data/shift-change-history');const a=await shift('close-source-'+kind,'e1','2036-03-03');
 const b=kind==='SWAP'?await shift('close-target','e3','2036-03-04'):null;
 const command:ShiftChangeCommand=b?{kind:'PROPOSE_SWAP',operationId:randomUUID(),...a,targetShiftId:b.sourceShiftId,targetEpisodeId:b.sourceEpisodeId,targetTermsFingerprint:b.sourceTermsFingerprint}:{kind:'OFFER_COVERAGE',operationId:randomUUID(),...a};
 const created=await executeShiftChange(proof('e1'),command,db.executor);expect(created.status).toBe('pending');if(created.status!=='pending')return;
 const [original]=await q('SELECT source_terms,target_terms FROM shift_exchanges WHERE id=$1',[created.requestId]);
 await q("UPDATE shifts SET employee_id='e2',start_time='09:00' WHERE id=ANY($1)",[[a.sourceShiftId,...(b?[b.sourceShiftId]:[])]]);
 expect(await executeShiftChange(proof('owner'),{kind:'MANAGER_DECLINE',requestId:created.requestId,expectedRevision:1,operationId:randomUUID()},db.executor)).toMatchObject({status:'closed'});
 const [closed]=await q("SELECT source_terms,target_terms,participants FROM shift_change_events WHERE request_id=$1 AND event_kind='DECLINED'",[created.requestId]);
 expect.soft(closed).toEqual({...original,participants:{requesterEmployeeId:'e1',targetEmployeeId:b?'e3':null}});
 expect.soft(await readShiftChangeHistory(proof('e2'),created.requestId,db.executor)).toEqual([]);expect.soft(await readShiftChangeHistory(proof('e1'),created.requestId,db.executor)).toHaveLength(2);
 expect.soft(await q("SELECT employee_id FROM notifications WHERE source_id=$1 AND source_version='r:2' AND type IN ('COVERAGE_DENIED','SWAP_DENIED') ORDER BY employee_id",[created.requestId])).toEqual(b?[{employee_id:'e1'},{employee_id:'e3'}]:[{employee_id:'e1'}]);
});
it('R1 stale linked coverage closure keeps the prior released employee separate from the new callout owner',async()=>{
 const {readShiftChangeHistory}=await import('../../lib/data/shift-change-history');const id='stale-linked-owner';await shift(id,'e1','2036-04-01');
 const created=await executeShiftChange(proof('e1'),{kind:'SUBMIT_CALLOUT',operationId:randomUUID(),...await reviewedFixtureSource(db.executor,id),reasonCode:'ILLNESS',reasonNote:'Prior owner secret'},db.executor);expect(created.status).toBe('pending');if(created.status!=='pending')return;
 await executeShiftChange(proof('owner'),{kind:'APPROVE_CALLOUT',requestId:created.requestId,expectedRevision:1,operationId:randomUUID()},db.executor);
 const [linked]=await q('SELECT id,source_terms FROM shift_exchanges WHERE linked_callout_id=$1',[created.requestId]);
 await q("UPDATE shifts SET employee_id='e2',start_time='09:00' WHERE id=$1",[id]);
 expect(await executeShiftChange(proof('e2'),{kind:'SUBMIT_CALLOUT',operationId:randomUUID(),...await reviewedFixtureSource(db.executor,id),reasonCode:'OTHER',reasonNote:'New owner reason'},db.executor)).toMatchObject({status:'pending'});
 expect((await q('SELECT status FROM shift_callouts WHERE id=$1',[created.requestId]))[0].status).toBe('APPROVED');
 const [stale]=await q("SELECT source_terms,participants FROM shift_change_events WHERE request_id=$1 AND event_kind='STALE'",[linked.id]);expect(stale).toEqual({source_terms:linked.source_terms,participants:{requesterEmployeeId:'e1',targetEmployeeId:null}});
 expect(await readShiftChangeHistory(proof('e2'),created.requestId,db.executor)).toEqual([]);expect(await readShiftChangeHistory(proof('e2'),String(linked.id),db.executor)).toEqual([]);
 expect(await q("SELECT * FROM notifications WHERE source_id=ANY($1) AND employee_id='e2'",[[created.requestId,linked.id]])).toEqual([]);
 expect(await q('SELECT * FROM shift_change_participation WHERE shift_id=$1',[id])).toHaveLength(1);
});
