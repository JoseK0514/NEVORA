import {randomUUID} from 'node:crypto';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {createDisposableExchangeDatabase} from './local-postgres';
import {fixtureShift,seedShiftChanges,proof} from './shift-change-fixture';
import {reviewedFixtureTerms} from './shift-change-api';
import {executeShiftChange,findShiftChangeOperation} from '../../lib/data/shift-changes';
import {getPublishedShift,listOpenCoverage,listSwapTargets,listEmployeeExchangeActivity} from '../../lib/data/exchanges';
import {getCallout} from '../../lib/data/callouts';
import {matchesDisplayedShift} from '../../lib/shift-changes/displayed-terms';
import {shiftTermsFingerprint} from '../../lib/shift-changes/terms';
import {runShiftChangeMaintenance} from '../../lib/data/shift-change-maintenance';
import {loadWorkspaceNotificationConfig} from '../../lib/notifications/config';
import {readEmployeeRequests} from '../../lib/data/employee-requests.server';
import type {SqlExecutor} from '../../lib/notifications/types';
let db:Awaited<ReturnType<typeof createDisposableExchangeDatabase>>;
vi.mock('../../lib/db',()=>({getDb:()=>({query:(text:string,values:readonly unknown[]=[])=>db.executor.query({text,values})}),queryRows:(r:unknown)=>r}));
const q=(text:string,values:readonly unknown[]=[])=>db.executor.query<Record<string,unknown>>({text,values});
beforeEach(async()=>{db=await createDisposableExchangeDatabase({mode:'current-runtime'});await seedShiftChanges(db.executor,{companyAccess:true});});
afterEach(async()=>db?.dispose());
const review=async(id:string)=>{const t=await reviewedFixtureTerms(db.executor,id);return {sourceShiftId:id,sourceEpisodeId:t.assignmentEpisodeId,sourceTermsFingerprint:shiftTermsFingerprint(t)};};
async function offer(id='source'){const terms=await fixtureShift(db.executor,id);const r=await executeShiftChange(proof('e1'),{kind:'OFFER_COVERAGE',operationId:randomUUID(),...terms},db.executor);expect(r.status).toBe('pending');if(r.status!=='pending')throw Error(JSON.stringify(r));return r;}
const tick=async(executor=db.executor)=>runShiftChangeMaintenance({executor,clock:()=>new Date('2035-09-30T12:00:00Z'),config:await loadWorkspaceNotificationConfig({PUSH_ENVIRONMENT:'test'},db.executor),limit:50});
it('keeps an incoming swap out of own recent requests until the request is decided',async()=>{
 const source=await fixtureShift(db.executor,'dedup-source','e1','2035-10-03'),target=await fixtureShift(db.executor,'dedup-target','e2','2035-10-04');
 const offered=await executeShiftChange(proof('e1'),{kind:'PROPOSE_SWAP',operationId:randomUUID(),...source,targetShiftId:target.sourceShiftId,targetEpisodeId:target.sourceEpisodeId,targetTermsFingerprint:target.sourceTermsFingerprint},db.executor);
 expect(offered.status).toBe('pending');if(offered.status!=='pending')throw Error('Swap fixture was not created');
 const recipient=await readEmployeeRequests(proof('e2'),db.executor),sender=await readEmployeeRequests(proof('e1'),db.executor);
 expect(recipient.state).toBe('ready');expect(sender.state).toBe('ready');
 if(recipient.state!=='ready'||sender.state!=='ready')throw Error('Requests projection was unavailable');
 expect(recipient.incoming).toBe(1);
 expect(recipient.exchangeCounts).toEqual({open:0,forYou:1});
 const {readEmployeeExchange}=await import('../../lib/data/employee-exchange.server');
 for(const selection of [null,offered.requestId]){const exchange=await readEmployeeExchange(proof('e2'),db.executor,selection);expect(exchange).toMatchObject({state:'ready',exchangeCounts:{open:0,forYou:1}});}
 expect(recipient.recent?.filter(row=>row.id===offered.requestId)).toEqual([]);
 expect(sender.recent?.filter(row=>row.id===offered.requestId)).toHaveLength(1);
 expect((await executeShiftChange(proof('e1'),{kind:'CANCEL',operationId:randomUUID(),requestId:offered.requestId,expectedRevision:1},db.executor)).status).toBe('closed');
 const decided=await readEmployeeRequests(proof('e2'),db.executor);
 expect(decided.state).toBe('ready');if(decided.state!=='ready')throw Error('Decided requests projection was unavailable');
 expect(decided.incoming).toBe(0);expect(decided.exchangeCounts).toEqual({open:0,forYou:0});
 expect(decided.recent?.filter(row=>row.id===offered.requestId)).toEqual([expect.objectContaining({kind:'shift',status:'CANCELLED'})]);
});
it.each(['incoming-first','history-first'])('keeps a swap in exactly one Requests section when cancellation races the read (%s)',async(order)=>{
 const source=await fixtureShift(db.executor,'race-source','e1','2035-10-03'),target=await fixtureShift(db.executor,'race-target','e2','2035-10-04');
 const offered=await executeShiftChange(proof('e1'),{kind:'PROPOSE_SWAP',operationId:randomUUID(),...source,targetShiftId:target.sourceShiftId,targetEpisodeId:target.sourceEpisodeId,targetTermsFingerprint:target.sourceTermsFingerprint},db.executor);
 expect(offered.status).toBe('pending');if(offered.status!=='pending')throw Error('Swap fixture was not created');
 let release!:()=>void,cancelled=false;
 const firstObserved=new Promise<void>(resolve=>{release=resolve;});
 const racing:SqlExecutor={...db.executor,transaction:async(statements,signal)=>{
  const exchange=statements.find(s=>s.text.includes('FROM shift_exchanges x')&&s.text.includes('x.target_employee_id = $1'));
  if(exchange){
   const combined=exchange.text.includes('WITH request_candidates AS'),incoming=exchange.text.includes("WHERE x.kind = 'SWAP'");
   if(combined||(order==='incoming-first'?incoming:!incoming)){
    try{
     const rows=await db.executor.transaction(statements,signal);
     expect((await executeShiftChange(proof('e1'),{kind:'CANCEL',operationId:randomUUID(),requestId:offered.requestId,expectedRevision:1},db.executor)).status).toBe('closed');
     cancelled=true;return rows;
    }finally{release();}
   }
   await firstObserved;
  }
  return db.executor.transaction(statements,signal);
 }};
 const result=await readEmployeeRequests(proof('e2'),racing);
 expect(cancelled).toBe(true);expect(result.state).toBe('ready');if(result.state!=='ready')throw Error('Racing Requests read was unavailable');
 expect((result.incoming??0)+(result.recent?.filter(row=>row.id===offered.requestId).length??0)).toBe(1);
});
it('keeps sent and decided history visible behind twenty pending offers, including effective expiry',async()=>{
 await fixtureShift(db.executor,'history-self','e2','2035-10-03');await fixtureShift(db.executor,'history-peer','e1','2035-10-04');
 // Imported/legacy rows are valid read fixtures; current command writes are covered above.
 await q("INSERT INTO shift_exchanges(id,kind,source_shift_id,requested_by_employee_id,status,created_at) VALUES('sent-old','COVERAGE','history-self','e2','CANCELLED',now()-interval '3 hours')");
 await q("INSERT INTO shift_exchanges(id,kind,source_shift_id,target_shift_id,requested_by_employee_id,target_employee_id,status,created_at) VALUES('decided-old','SWAP','history-peer','history-self','e1','e2','DENIED',now()-interval '2 hours')");
 await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) SELECT 'crowd-'||side||n,'schedule',CASE WHEN side='source' THEN 'e1' ELSE 'e2' END,'2035-10-05','08:00','16:00' FROM generate_series(1,21)n CROSS JOIN (VALUES('source'),('target'))s(side)");
 await q("INSERT INTO shift_exchanges(id,kind,source_shift_id,target_shift_id,requested_by_employee_id,target_employee_id,status,created_at,completion_deadline) SELECT 'pending-'||n,'SWAP','crowd-source'||n,'crowd-target'||n,'e1','e2','EMPLOYEE_PENDING',now()-n*interval '1 minute',CASE WHEN n=21 THEN now()-interval '1 hour' ELSE NULL END FROM generate_series(1,21)n");
 const result=await readEmployeeRequests(proof('e2'),db.executor);
 expect(result.state).toBe('ready');if(result.state!=='ready')throw Error('Crowded Requests read was unavailable');
 expect(result.incoming).toBe(20);
 expect(result.recent).toEqual(expect.arrayContaining([
  expect.objectContaining({id:'sent-old',status:'CANCELLED'}),expect.objectContaining({id:'decided-old',status:'DENIED'}),expect.objectContaining({id:'pending-21',status:'EXPIRED'}),
 ]));
 expect(result.recent).toHaveLength(3);
});
it('retains older waiting time-off requests beyond the latest eight own requests',async()=>{
 await fixtureShift(db.executor,'waiting-history-shift','e2','2035-10-03');
 await q("INSERT INTO shift_exchanges(id,kind,source_shift_id,requested_by_employee_id,status,created_at) VALUES('waiting-recent-shift','COVERAGE','waiting-history-shift','e2','CANCELLED',now())");
 await q("INSERT INTO time_off_requests(id,employee_id,start_date,end_date,reason,status,created_at) SELECT 'waiting-decided-'||n,'e2','2035-10-10','2035-10-10','OWN PRIVATE REASON','APPROVED',now()-n*interval '1 hour' FROM generate_series(1,9)n");
 await q("INSERT INTO time_off_requests(id,employee_id,start_date,end_date,reason,status,created_at) VALUES('waiting-recent','e2','2035-10-11','2035-10-11','OWN PRIVATE REASON','PENDING',now()-interval '30 minutes'),('waiting-old-1','e2','2035-10-12','2035-10-12','OWN PRIVATE REASON','PENDING',now()-interval '2 days'),('waiting-old-2','e2','2035-10-13','2035-10-13','OWN PRIVATE REASON','PENDING',now()-interval '3 days'),('waiting-peer','e1','2035-10-14','2035-10-14','PEER PRIVATE REASON','PENDING',now()+interval '1 hour')");
 const result=await readEmployeeRequests(proof('e2'),db.executor);
 expect(result.state).toBe('ready');if(result.state!=='ready')throw Error('Crowded time-off Requests read was unavailable');
 expect(result.recent?.filter(row=>row.kind==='timeOff'&&row.status==='PENDING').map(row=>row.id)).toEqual(['waiting-recent','waiting-old-1','waiting-old-2']);
 // The original latest eight across request kinds stay intact; only older waiting time off is added.
 expect(result.recent?.map(row=>row.id)).toEqual(['waiting-recent-shift','waiting-recent','waiting-decided-1','waiting-decided-2','waiting-decided-3','waiting-decided-4','waiting-decided-5','waiting-decided-6','waiting-old-1','waiting-old-2']);
 expect(new Set(result.recent?.map(row=>row.kind+':'+row.id)).size).toBe(result.recent?.length);
 expect(JSON.stringify(result)).not.toMatch(/waiting-peer|PRIVATE REASON|employeeId|reviewerName|sessionTokenHash/);
 const repeated=await readEmployeeRequests(proof('e2'),db.executor);
 expect(repeated.state).toBe('ready');if(repeated.state!=='ready')throw Error('Repeated Requests read was unavailable');
 expect(repeated.recent).toEqual(result.recent);
});
it('keeps time-off source failure explicit and skips that source when its module is disabled',async()=>{
 let timeOffReads=0;
 const failing:SqlExecutor={...db.executor,transaction:async(statements,signal)=>{
  if(statements.some(s=>s.text.includes('FROM time_off_requests r'))){timeOffReads++;throw Error('Fictional private time-off outage');}
  return db.executor.transaction(statements,signal);
 }};
 const partial=await readEmployeeRequests(proof('e2'),failing);
 expect(partial.state).toBe('ready');if(partial.state!=='ready')throw Error('Partial time-off read was unavailable');
 expect(partial.recent).toBeNull();expect(partial.incoming).toBe(0);expect(partial.open).toEqual([]);expect(timeOffReads).toBe(1);
 expect(JSON.stringify(partial)).not.toContain('private time-off outage');
 await q("SELECT nevora_set_workspace_presentation($1,'workspace-fuel','owner',0,$2,repeat('a',64))",[randomUUID(),JSON.stringify({version:1,brand:{},modules:{disabled:['timeOff']}})]);
 const disabled=await readEmployeeRequests(proof('e2'),failing);
 expect(disabled.state).toBe('ready');if(disabled.state!=='ready')throw Error('Disabled time-off read was unavailable');
 expect(disabled.modules.timeOff).toBe(false);expect(disabled.recent).toEqual([]);expect(timeOffReads).toBe(1);
});
it('does not release Requests under a module revision changed during the source reads',async()=>{
 let changed=false;
 const changing:SqlExecutor={...db.executor,transaction:async(statements,signal)=>{
  const rows=await db.executor.transaction(statements,signal);
  if(!changed&&statements.some(s=>s.text.includes('FROM time_off_requests r'))){
   changed=true;
   await q("SELECT nevora_set_workspace_presentation($1,'workspace-fuel','owner',0,$2,repeat('b',64))",[randomUUID(),JSON.stringify({version:1,brand:{},modules:{disabled:['timeOff']}})]);
  }
  return rows;
 }};
 expect(await readEmployeeRequests(proof('e2'),changing)).toEqual({state:'unavailable',reason:'read_failed'});expect(changed).toBe(true);
});
it('refuses retained time-off history after the actual employee role or session loses authority',async()=>{
 await q("INSERT INTO time_off_requests(id,employee_id,start_date,end_date,reason,status) VALUES('guarded-waiting','e2','2035-10-10','2035-10-10','PRIVATE REASON','PENDING')");
 const authorized=await readEmployeeRequests(proof('e2'),db.executor);
 expect(authorized.state).toBe('ready');if(authorized.state!=='ready')throw Error('Authorized Requests read was unavailable');
 expect(authorized.recent?.map(row=>row.id)).toEqual(['guarded-waiting']);
 await q("UPDATE employees SET role='OWNER' WHERE id='e2'");
 expect(await readEmployeeRequests(proof('e2'),db.executor)).toEqual({state:'unavailable',reason:'access_denied'});
 expect(await readEmployeeRequests({...proof('e2'),employee:{...proof('e2').employee,role:'OWNER'}},db.executor)).toEqual({state:'unavailable',reason:'access_denied'});
 await q("UPDATE employees SET role='EMPLOYEE' WHERE id='e2'; UPDATE employee_sessions SET expires_at=now()-interval '1 minute' WHERE employee_id='e2'");
 expect(await readEmployeeRequests(proof('e2'),db.executor)).toEqual({state:'unavailable',reason:'access_denied'});
});
it('keeps a failed swap source explicit while retaining other available Requests sections',async()=>{
 const failing:SqlExecutor={...db.executor,transaction:async(statements,signal)=>{
  if(statements.some(s=>s.text.includes('FROM shift_exchanges x')&&s.text.includes('x.target_employee_id = $1')))throw Error('Fictional exchange source outage');
  return db.executor.transaction(statements,signal);
 }};
 const result=await readEmployeeRequests(proof('e2'),failing);
 expect(result.state).toBe('ready');if(result.state!=='ready')throw Error('Partial Requests read was unavailable');
 expect(result.open).toEqual([]);expect(result.incoming).toBeNull();expect(result.recent).toBeNull();
});
it('H01/A005 rejects different owning weeks at proposal without request side effects',async()=>{
 const source=await fixtureShift(db.executor,'source'),target=await fixtureShift(db.executor,'target','e2','2035-10-09');
 await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('next','loc-1','2035-10-08','PUBLISHED','owner'); UPDATE shifts SET schedule_id='next' WHERE id='target'");
 const t=await review(target.sourceShiftId);const result=await executeShiftChange(proof('e1'),{kind:'PROPOSE_SWAP',operationId:randomUUID(),...source,targetShiftId:t.sourceShiftId,targetEpisodeId:t.sourceEpisodeId,targetTermsFingerprint:t.sourceTermsFingerprint},db.executor);
 expect(result).toMatchObject({status:'blocked',issues:[{code:'CONSENT_REQUIRED',message:expect.stringContaining('same owning workweek')}]});
 for(const table of ['shift_exchanges','shift_change_participation','shift_change_events','shift_change_operations','notifications','schedule_publication_revisions'])expect(await q(`SELECT * FROM ${table}`)).toEqual([]);
 expect((await q('SELECT id,employee_id FROM shifts ORDER BY id'))).toEqual([{id:'source',employee_id:'e1'},{id:'target',employee_id:'e2'}]);
});
it.each(['ACCEPT','MANAGER_APPROVE'] as const)('H01 rejects existing cross-week %s without mutations',async(kind)=>{
 await fixtureShift(db.executor,'source');await fixtureShift(db.executor,'target','e2','2035-10-09');
 await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('next','loc-1','2035-10-08','PUBLISHED','owner'); UPDATE shifts SET schedule_id='next' WHERE id='target'");
 const a=await reviewedFixtureTerms(db.executor,'source'),b=await reviewedFixtureTerms(db.executor,'target');
 const consent={employeeId:'e1',consentedAt:new Date().toISOString(),source:a,target:b};
 await q("INSERT INTO shift_exchanges(id,kind,source_shift_id,target_shift_id,requested_by_employee_id,target_employee_id,status,legacy_manual,source_terms,target_terms,requester_consent,target_consent,recorded_approval_mode) VALUES('invalid','SWAP','source','target','e1','e2',$1,false,$2,$3,$4,$5,'AUTOMATIC_WHEN_VALID')",[kind==='ACCEPT'?'EMPLOYEE_PENDING':'MANAGER_PENDING',JSON.stringify(a),JSON.stringify(b),JSON.stringify(consent),kind==='MANAGER_APPROVE'?JSON.stringify({...consent,employeeId:'e2'}):null]);
 const before=await q('SELECT * FROM shift_exchanges');
 expect(await executeShiftChange(proof(kind==='ACCEPT'?'e2':'owner'),{kind,operationId:randomUUID(),requestId:'invalid',expectedRevision:1},db.executor)).toMatchObject({status:'blocked',issues:[{message:expect.stringContaining('same owning workweek')}]});
 expect(await q('SELECT * FROM shift_exchanges')).toEqual(before);expect(await q('SELECT * FROM shift_change_operations')).toEqual([]);expect(await q('SELECT * FROM shift_change_events')).toEqual([]);
});
it.each(['timezone','episode','revision'] as const)('H02 coherent display rejects %s change between readers for either side',async(kind)=>{
 for(const [id,employee] of [['source','e1'],['target','e2']])await fixtureShift(db.executor,id,employee);
 const displays=await Promise.all(['source','target'].map(id=>getPublishedShift(id)));
 if(kind==='timezone')await q("UPDATE workspaces SET time_zone='America/New_York'");
 if(kind==='episode')await q("UPDATE shifts SET employee_id='e3'; UPDATE shifts SET employee_id=CASE WHEN id='source' THEN 'e1' ELSE 'e2' END");
 if(kind==='revision')await q("UPDATE shifts SET start_time='09:00'; UPDATE shifts SET start_time='08:00'");
 for(let n=0;n<2;n++){const current=await reviewedFixtureTerms(db.executor,['source','target'][n]);expect(matchesDisplayedShift(displays[n]!,current)).toBe(false);expect(matchesDisplayedShift((await getPublishedShift(current.shiftId))!,current)).toBe(true);}
});
it.each(['time','episode','timezone','lead','position','date'] as const)('H03 callout cannot silently bind to changed displayed %s',async(kind)=>{
 const reviewed=await fixtureShift(db.executor,'source');
 if(kind==='time')await q("UPDATE shifts SET start_time='09:00'");
 if(kind==='episode')await q("UPDATE shifts SET employee_id='e2'; UPDATE shifts SET employee_id='e1'");
 if(kind==='timezone')await q("UPDATE workspaces SET time_zone='America/New_York'");
 if(kind==='lead')await q("UPDATE shifts SET is_designated_lead=true");
 if(kind==='date')await q("UPDATE shifts SET date='2035-10-03'");
 if(kind==='position')await q("INSERT INTO positions(id,workspace_id,name) VALUES('new','workspace-fuel','New'); UPDATE shifts SET position_id='new'");
 const result=await executeShiftChange(proof('e1'),{kind:'SUBMIT_CALLOUT',operationId:randomUUID(),...reviewed,reasonCode:'ILLNESS',reasonNote:'Retain this urgent report'},db.executor);
 expect(result).toMatchObject({status:'blocked',issues:[{code:'STALE_TERMS'}]});expect(await q('SELECT * FROM shift_callouts')).toEqual([]);
 const fresh=await review('source');expect((await executeShiftChange(proof('e1'),{kind:'SUBMIT_CALLOUT',operationId:randomUUID(),...fresh,reasonCode:'ILLNESS',reasonNote:'Retain this urgent report'},db.executor)).status).toBe('pending');
});
it('H04 proven stale maintenance atomically cancels intents and releases participation without assignment changes',async()=>{
 const r=await offer();await q("UPDATE shifts SET start_time='09:00'");
 const before=await q('SELECT * FROM shifts');
 await Promise.all([tick(),tick()]);
 expect(await q('SELECT status,outcome_reason FROM shift_exchanges WHERE id=$1',[r.requestId])).toEqual([{status:'CANCELLED',outcome_reason:'STALE_TERMS'}]);
 expect(await q('SELECT * FROM shift_change_participation')).toEqual([]);expect(await q('SELECT * FROM shifts')).toEqual(before);
 expect(await q("SELECT event_kind,outcome_reason,source_terms->>'startTime' AS original FROM shift_change_events WHERE request_id=$1 AND event_kind='STALE'",[r.requestId])).toEqual([{event_kind:'STALE',outcome_reason:'STALE_TERMS',original:'08:00'}]);
 expect(await q('SELECT id FROM notifications WHERE source_id=$1 AND cancelled_at IS NULL',[r.requestId])).toEqual([]);
 expect((await executeShiftChange(proof('e1'),{kind:'OFFER_COVERAGE',operationId:randomUUID(),...await review('source')},db.executor)).status).toBe('pending');
});
it('H04 stale retirement rolls back with history and participation on transaction failure',async()=>{
 const r=await offer();await q("UPDATE shifts SET start_time='09:00'");
 const before=await q('SELECT * FROM shift_exchanges');
 await expect(tick({...db.executor,transaction:statements=>db.executor.transaction([...statements,{text:'SELECT 1/0',values:[]}])})).rejects.toThrow();
 expect(await q('SELECT * FROM shift_exchanges')).toEqual(before);expect(await q('SELECT * FROM shift_change_participation WHERE exchange_id=$1',[r.requestId])).toHaveLength(1);expect(await q("SELECT * FROM shift_change_events WHERE event_kind='STALE'")).toEqual([]);
});
it('H05 discovery respects current location access while participant history remains',async()=>{
 const r=await offer();await fixtureShift(db.executor,'peer','e1','2035-10-03');await fixtureShift(db.executor,'mine','e2','2035-10-04');
 const mine=(await getPublishedShift('mine'))!;
 expect(await listOpenCoverage('e2','2035-10-01')).toHaveLength(1);expect((await listSwapTargets(mine,'e2')).map(s=>s.id)).toContain('peer');
 await q("DELETE FROM employee_location_eligibility WHERE employee_id='e2'");
 expect(await listOpenCoverage('e2','2035-10-01')).toEqual([]);expect(await listSwapTargets(mine,'e2')).toEqual([]);
 expect((await executeShiftChange(proof('e2'),{kind:'ACCEPT',operationId:randomUUID(),requestId:r.requestId,expectedRevision:1},db.executor)).status).toBe('blocked');
 await q("DELETE FROM employee_location_eligibility WHERE employee_id='e1'");expect((await listEmployeeExchangeActivity('e1')).map(x=>x.id)).toContain(r.requestId);
});
it.each(['2037-03-08','2037-11-01'])('H07 strict DST %s report is truthful and closure remains available',async(date)=>{
 const terms=await fixtureShift(db.executor,'source','e1',date);await q("UPDATE shifts SET start_time=$1",[date.includes('03-')?'02:30':'01:30']);
 const r=await executeShiftChange(proof('e1'),{kind:'OFFER_COVERAGE',operationId:randomUUID(),...await review('source')},db.executor);expect(r.status).toBe('pending');if(r.status!=='pending')throw Error(JSON.stringify(r));
 await q("UPDATE workspaces SET time_zone='America/New_York'");
 const command={kind:'SUBMIT_CALLOUT' as const,operationId:randomUUID(),...await review('source'),reasonCode:'ILLNESS' as const};
 let calls=0,admissions=0;const executor={...db.executor,transaction:(statements:Parameters<typeof db.executor.transaction>[0])=>{if(statements.some(s=>s.text.startsWith('INSERT INTO shift_change_operations')))calls++;else admissions++;return db.executor.transaction(statements);}};
 expect(await executeShiftChange(proof('e1'),command,executor)).toMatchObject({status:'pending'});expect(calls).toBe(1);
 expect(await findShiftChangeOperation(proof('e1'),command.operationId,db.executor)).toMatchObject({status:'pending'});
 const [{id:reportId}]=await q('SELECT id FROM shift_callouts');
 const approval={kind:'APPROVE_CALLOUT' as const,operationId:randomUUID(),requestId:String(reportId),expectedRevision:1};
 const {readGenerationSource}=await import('../../lib/data/generation-guards'),{readNotificationWeekState}=await import('../../lib/data/notification-transactions');
 const snapshot=async()=>({source:(await readGenerationSource(db.executor)).source,week:await readNotificationWeekState(['2035-10-01'],db.executor)}),beforeApproval=await snapshot();
 calls=0;expect(await executeShiftChange(proof('owner'),approval,executor)).toMatchObject({status:'blocked',issues:[{code:'INVALID_TIME_RANGE'}]});expect(calls).toBe(0);expect(await findShiftChangeOperation(proof('owner'),approval.operationId,db.executor)).toBeNull();expect(admissions).toBeGreaterThan(0);expect(await snapshot()).toEqual(beforeApproval);
 // The inability report cancels incompatible voluntary participation; a legacy status-only close needs no civil-time interpretation either.
 await q("UPDATE shift_callouts SET status='CANCELLED' WHERE shift_id='source'");
 await q("INSERT INTO shift_exchanges(id,kind,source_shift_id,requested_by_employee_id,status) VALUES('legacy-close','COVERAGE','source','e1','OPEN')");
 expect((await executeShiftChange(proof('owner'),{kind:'MANAGER_CLOSE',operationId:randomUUID(),requestId:'legacy-close',expectedRevision:1},db.executor)).status).toBe('closed');
 expect(terms.sourceShiftId).toBe('source');
});
it('H09 approved callout projection distinguishes historical approval from current release',async()=>{
 const terms=await fixtureShift(db.executor,'source');const r=await executeShiftChange(proof('e1'),{kind:'SUBMIT_CALLOUT',operationId:randomUUID(),...terms,reasonCode:'ILLNESS'},db.executor);expect(r.status).toBe('pending');if(r.status!=='pending')throw Error(JSON.stringify(r));
 expect((await executeShiftChange(proof('owner'),{kind:'APPROVE_CALLOUT',operationId:randomUUID(),requestId:r.requestId,expectedRevision:1},db.executor)).status).toBe('completed');
 expect(await getCallout(r.requestId,db.executor)).toMatchObject({status:'APPROVED',releaseApplies:true});
 await q("UPDATE shifts SET start_time='09:00'");expect(await getCallout(r.requestId,db.executor)).toMatchObject({status:'APPROVED',releaseApplies:false});
 await q('UPDATE shift_callouts SET legacy_manual=true,assignment_episode_id=NULL,source_terms=NULL,reviewed_terms_fingerprint=NULL WHERE id=$1',[r.requestId]);expect(await getCallout(r.requestId,db.executor)).toMatchObject({status:'APPROVED',releaseApplies:false});
});

it('H01 valid same-owning-week cross-location overnight swap still completes',async()=>{
 await fixtureShift(db.executor,'source','e1','2035-10-07');await fixtureShift(db.executor,'target','e2','2035-10-03');
 await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('other-site','loc-2','2035-10-01','PUBLISHED','owner'); UPDATE shifts SET schedule_id='other-site' WHERE id='target'; UPDATE shifts SET start_time='22:00',end_time='06:00' WHERE id='source'");
 await q("INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) SELECT 'other-window-'||d,'loc-2',d,'00:00','24:00' FROM generate_series(0,6)d");
 const a=await review('source'),b=await review('target');
 const result=await executeShiftChange(proof('e1'),{kind:'PROPOSE_SWAP',operationId:randomUUID(),...a,targetShiftId:b.sourceShiftId,targetEpisodeId:b.sourceEpisodeId,targetTermsFingerprint:b.sourceTermsFingerprint},db.executor);
 expect(result.status).toBe('pending');if(result.status!=='pending')throw Error(JSON.stringify(result));
 expect((await executeShiftChange(proof('e2'),{kind:'ACCEPT',operationId:randomUUID(),requestId:result.requestId,expectedRevision:1},db.executor)).status).toBe('completed');
 expect(await q('SELECT id,employee_id FROM shifts ORDER BY id')).toEqual([{id:'source',employee_id:'e2'},{id:'target',employee_id:'e1'}]);
});
it('H04 unknown legacy exchanges stay reserved for explicit authorized closure',async()=>{
 await fixtureShift(db.executor,'source');
 await q("INSERT INTO shift_exchanges(id,kind,source_shift_id,requested_by_employee_id,status) VALUES('legacy','COVERAGE','source','e1','OPEN'); UPDATE shifts SET start_time='09:00'");
 await tick();expect(await q("SELECT status,legacy_manual FROM shift_exchanges WHERE id='legacy'")).toEqual([{status:'OPEN',legacy_manual:true}]);
 expect(await q("SELECT * FROM shift_change_participation WHERE exchange_id='legacy'")).toHaveLength(1);
 const [{request_revision}]=await q("SELECT request_revision FROM shift_exchanges WHERE id='legacy'");
 expect((await executeShiftChange(proof('owner'),{kind:'MANAGER_CLOSE',requestId:'legacy',expectedRevision:Number(request_revision),operationId:randomUUID()},db.executor)).status).toBe('closed');
});
it.each(['inactive-location','inactive-viewer','manager-viewer','never-eligible'] as const)('H05 discovery hides peers for %s',async(kind)=>{
 await offer();await fixtureShift(db.executor,'peer','e1','2035-10-03');await fixtureShift(db.executor,'mine','e2','2035-10-04');const mine=(await getPublishedShift('mine'))!;
 if(kind==='inactive-location')await q("UPDATE locations SET active=false WHERE id='loc-1'");
 if(kind==='inactive-viewer')await q("UPDATE employees SET active=false WHERE id='e2'");
 if(kind==='manager-viewer')await q("UPDATE employees SET role='MANAGER' WHERE id='e2'");
 if(kind==='never-eligible')await q("DELETE FROM employee_location_eligibility WHERE employee_id='e2'");
 expect(await listOpenCoverage('e2','2035-10-01')).toEqual([]);expect(await listSwapTargets(mine,'e2')).toEqual([]);
});
it('H05 authorized cross-location discovery survives without primary-location equality',async()=>{
 await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('other','loc-2','2035-10-01','PUBLISHED','owner')");
 await fixtureShift(db.executor,'peer','e1');await q("UPDATE shifts SET schedule_id='other' WHERE id='peer'");
 await fixtureShift(db.executor,'mine','e2','2035-10-03');const mine=(await getPublishedShift('mine'))!;
 expect((await listSwapTargets(mine,'e2')).map(s=>s.id)).toContain('peer');
 const result=await executeShiftChange(proof('e1'),{kind:'OFFER_COVERAGE',operationId:randomUUID(),...await review('peer')},db.executor);expect(result.status).toBe('pending');
 expect((await listOpenCoverage('e2','2035-10-01')).map(s=>s.sourceShift.locationId)).toEqual(['loc-2']);
});
it('H06 sparse history facts are explicitly unknown and current camelCase facts remain truthful',async()=>{
 await fixtureShift(db.executor,'source');
 await q("INSERT INTO shift_change_events(workspace_id,request_kind,request_id,request_revision,event_kind,source_terms,target_terms,participants) VALUES('workspace-fuel','EXCHANGE','sparse',1,'LEGACY_IMPORTED',$1,$2,$3)",[JSON.stringify({date:'2035-10-02'}),JSON.stringify({date:'2035-10-03',startTime:'08:00',endTime:'16:00',locationId:'loc-1',positionId:null,isDesignatedLead:false}),JSON.stringify({requesterEmployeeId:'e1'})]);
 const {readShiftChangeHistoryView}=await import('../../lib/data/shift-change-views');const [row]=await readShiftChangeHistoryView(proof('e1'),'sparse',db.executor);
 expect(row.source).toContain('Unknown time');expect(row.source).toContain('Position unknown');expect(row.source).toContain('Lead designation unknown');expect(row.target).toContain('08:00 – 16:00');expect(row.target).toContain('No assigned position · No shift lead');
});

it('H11 invalid OTHER details never persist any report or transaction; three characters permit report',async()=>{
 const source=await fixtureShift(db.executor,'source');let calls=0;
 const executor={...db.executor,transaction:(statements:Parameters<typeof db.executor.transaction>[0])=>{calls++;return db.executor.transaction(statements);}};
 for(const reasonNote of [undefined,'','   ','ab',' ab ']){
  expect(await executeShiftChange(proof('e1'),{kind:'SUBMIT_CALLOUT',operationId:randomUUID(),...source,reasonCode:'OTHER',...(reasonNote===undefined?{}:{reasonNote})},executor)).toEqual({status:'unavailable'});
  expect(calls).toBe(0);
  for(const table of ['shift_callouts','shift_change_participation','shift_change_events','shift_change_operations','notifications'])expect(await q(`SELECT * FROM ${table}`)).toEqual([]);
 }
 expect((await executeShiftChange(proof('e1'),{kind:'SUBMIT_CALLOUT',operationId:randomUUID(),...source,reasonCode:'OTHER',reasonNote:'abc'},executor)).status).toBe('pending');expect(calls).toBe(1);
 expect(await q('SELECT reason_note,status FROM shift_callouts')).toEqual([{reason_note:'abc',status:'PENDING'}]);
});

it.each(['manual-policy','recorded-policy','overtime'] as const)('H12 manager gets concrete safe %s reason without peer profile exposure',async(reason)=>{
 const {readShiftChangeAvailability}=await import('../../lib/data/shift-changes');
 if(reason!=='overtime')await q("UPDATE workspaces SET shift_change_policy=jsonb_set(shift_change_policy,'{coverage,mode}','\"MANAGER_REVIEW\"')");
 if(reason==='overtime')await q("UPDATE employee_scheduling_settings SET operational_rule_profile=jsonb_set(operational_rule_profile,'{projectedOvertime}',$1::jsonb) WHERE employee_id='e2'",[JSON.stringify({status:'CONFIGURED',revision:1,value:{weeklyMinutes:0,routing:'MANAGER_REVIEW',timeBasis:'WALL_CLOCK'}})]);
 const r=await offer();expect((await executeShiftChange(proof('e2'),{kind:'ACCEPT',operationId:randomUUID(),requestId:r.requestId,expectedRevision:1},db.executor)).status).toBe('pending');
 if(reason==='recorded-policy')await q("UPDATE workspaces SET shift_change_policy=jsonb_set(shift_change_policy,'{coverage,mode}','\"AUTOMATIC_WHEN_VALID\"')");
 const command={kind:'MANAGER_APPROVE' as const,operationId:randomUUID(),requestId:r.requestId,expectedRevision:2};
 const view=await readShiftChangeAvailability(proof('owner'),command,db.executor);
 expect(view).toEqual({allowed:true,notice:reason==='overtime'?'Projected scheduled overtime needs manager review.':reason==='manual-policy'?null:'This request was submitted under manager review.',policy:{managerReviewRequired:reason==='manual-policy',rulePath:'Scheduling rules › Trades'}});
 expect(JSON.stringify(view)).not.toMatch(/weeklyMinutes|operational|reviewedBy|classification|WALL_CLOCK/);
 expect(await readShiftChangeAvailability(proof('e3'),command,db.executor)).toMatchObject({allowed:false});
 await q("UPDATE employee_scheduling_settings SET operational_rule_profile=jsonb_set(operational_rule_profile,'{minimumRest}','{\"status\":\"UNKNOWN\"}') WHERE employee_id='e2'");
 expect(await readShiftChangeAvailability(proof('owner'),command,db.executor)).toMatchObject({allowed:false,notice:'Needs Owner rule review',refusal:'review'});
 await q("DELETE FROM employee_sessions WHERE employee_id='owner'");expect(await readShiftChangeAvailability(proof('owner'),command,db.executor)).toEqual({allowed:false,notice:'Unavailable for your current account.'});
});
async function reviseDecisionPolicies(mode:'AUTOMATIC_WHEN_VALID'|'MANAGER_REVIEW',expectedRevision=1){
 const {saveShiftChangePolicy,saveOperationalRuleProfile}=await import('../../lib/data/shift-change-policy');
 const {fictionalProfile}=await import('../fixtures/shift-changes');
 expect(await saveShiftChangePolicy({proof:proof('owner'),scope:'coverage',expectedRevision,replacement:{mode,submissionAdvanceMinutes:0,completionAdvanceMinutes:0}},db.executor)).toEqual({status:'saved',revision:expectedRevision+1});
 const {minimumRest,maximumShift,maximumDaily,breaks}=fictionalProfile();
 expect(await saveOperationalRuleProfile({proof:proof('owner'),employeeId:'e2',expectedRevision,replacement:{minimumRest,maximumShift,maximumDaily,breaks,projectedOvertime:{status:'CONFIGURED',revision:expectedRevision,value:{weeklyMinutes:0,routing:'ALLOW',timeBasis:'WALL_CLOCK'}}}},db.executor)).toEqual({status:'saved',revision:expectedRevision+1});
}
it.each(['AUTOMATIC_WHEN_VALID','MANAGER_REVIEW'] as const)('H13 %s records final decision version references while preserving creation and UI privacy',async(mode)=>{
 const r=await offer();const original=await q("SELECT * FROM shift_change_events WHERE request_id=$1 AND event_kind='CREATED'",[r.requestId]);
 await reviseDecisionPolicies(mode);
 const accept=await executeShiftChange(proof('e2'),{kind:'ACCEPT',operationId:randomUUID(),requestId:r.requestId,expectedRevision:1},db.executor);
 expect(accept.status).toBe(mode==='MANAGER_REVIEW'?'pending':'completed');
 if(mode==='MANAGER_REVIEW')expect((await executeShiftChange(proof('owner'),{kind:'MANAGER_APPROVE',operationId:randomUUID(),requestId:r.requestId,expectedRevision:2},db.executor)).status).toBe('completed');
 const [{participants}]=await q("SELECT participants FROM shift_change_events WHERE request_id=$1 AND event_kind='COMPLETED'",[r.requestId]);
 expect(participants).toMatchObject({decisionVersions:{policy:{version:1,revision:2,workflow:'coverage',workflowRevision:2},profiles:[{employeeId:'e2',version:1,revision:2,rules:{projectedOvertime:2}}]}});
 expect(JSON.stringify(participants)).not.toMatch(/weeklyMinutes|reviewedBy|routing|WALL_CLOCK/);
 expect(await q("SELECT * FROM shift_change_events WHERE request_id=$1 AND event_kind='CREATED'",[r.requestId])).toEqual(original);
 expect(await q('SELECT policy_revision FROM shift_exchanges WHERE id=$1',[r.requestId])).toEqual([{policy_revision:1}]);
 const {readShiftChangeHistoryView}=await import('../../lib/data/shift-change-views');const history=await readShiftChangeHistoryView(proof('e1'),r.requestId,db.executor);
 expect(JSON.stringify(history)).not.toMatch(/decisionVersions|profiles|projectedOvertime/);expect(Object.keys(history.at(-1)!).sort()).toEqual(['at','event','mode','revision','source','target']);
});
it('H13 policy/profile change between plan and transaction retries with actual final versions',async()=>{
 const r=await offer();await reviseDecisionPolicies('AUTOMATIC_WHEN_VALID');let transactions=0;
 const executor={...db.executor,transaction:async(statements:Parameters<typeof db.executor.transaction>[0])=>{if(transactions++===0)await reviseDecisionPolicies('AUTOMATIC_WHEN_VALID',2);return db.executor.transaction(statements);}};
 expect((await executeShiftChange(proof('e2'),{kind:'ACCEPT',operationId:randomUUID(),requestId:r.requestId,expectedRevision:1},executor)).status).toBe('completed');expect(transactions).toBe(2);
 expect(await q("SELECT participants->'decisionVersions' AS versions FROM shift_change_events WHERE request_id=$1 AND event_kind='COMPLETED'",[r.requestId])).toEqual([{versions:{policy:{version:1,revision:3,workflow:'coverage',workflowRevision:3},profiles:[{employeeId:'e2',version:1,revision:3,rules:{projectedOvertime:3}}]}}]);
});
it('H13 failed final transaction rolls back decision metadata with assignments and operation',async()=>{
 const r=await offer();await reviseDecisionPolicies('AUTOMATIC_WHEN_VALID');const before=await q('SELECT * FROM shift_change_events');const operationId=randomUUID();
 const executor={...db.executor,transaction:(statements:Parameters<typeof db.executor.transaction>[0])=>db.executor.transaction([...statements,{text:'SELECT 1/0',values:[]}])};
 await expect(executeShiftChange(proof('e2'),{kind:'ACCEPT',operationId,requestId:r.requestId,expectedRevision:1},executor)).rejects.toMatchObject({code:'22012'});
 expect(await q('SELECT * FROM shift_change_events')).toEqual(before);expect(await q("SELECT employee_id FROM shifts WHERE id='source'")).toEqual([{employee_id:'e1'}]);expect(await findShiftChangeOperation(proof('e2'),operationId,db.executor)).toBeNull();
});

it('shared exchange counts preserve an unavailable open-cover source rather than fabricating zero',async()=>{
 const failing:SqlExecutor={...db.executor,transaction:async(statements,signal)=>{
  if(statements.some(s=>s.text.includes("x.kind = 'COVERAGE'")&&s.text.includes('source.date >= $2')))throw Error('Fictional cover outage');
  return db.executor.transaction(statements,signal);
 }};
 expect(await readEmployeeRequests(proof('e2'),failing)).toMatchObject({state:'ready',exchangeCounts:{open:null,forYou:0}});
});
