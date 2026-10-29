import {it,expect} from 'vitest';
import {createDisposableExchangeDatabase} from './local-postgres';
import {seedOwnedApp} from './owned-app-fixture';
import {fixtureProof} from './shift-change-api';
import {readEmployeeNotificationList,readEmployeeNotificationPage} from '../../lib/data/employee-notification-list.server';
import type {EmployeeViewSnapshot} from '../../lib/employee-view';
import {makeOwnedCommunicationNoticesDue} from './employee-mobile-communications-fixtures';
const notifications=(r:EmployeeViewSnapshot)=>{if(r.state!=='ready'||r.kind!=='notifications')throw Error('Own notices unavailable');return r;};
async function setup(){const db=await createDisposableExchangeDatabase({mode:'current-runtime'});try{await seedOwnedApp(db.executor);const q=<T=Record<string,unknown>>(text:string,values:unknown[]=[])=>db.executor.query<T>({text,values});await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('MSG-A','Fictional','Employee','555-0191','EMPLOYEE','loc-1'),('MSG-B','Fictional','Peer','555-0192','LEAD','loc-1');INSERT INTO employee_location_eligibility VALUES('MSG-A','loc-1'),('MSG-B','loc-1')");return {db,q,proof:await fixtureProof(db.executor,'MSG-A'),peer:await fixtureProof(db.executor,'MSG-B')};}catch(error){await db.dispose();throw error;}}
it('pages the complete own notification candidates without leaking a peer or weakening the legacy bounded list',async()=>{
 const {db,q,proof,peer}=await setup();try{
  for(const [actor,n] of [['MSG-A',30],['MSG-B',3]] as const)for(let i=0;i<n;i++){
   const id=actor+'-'+String(i).padStart(3,'0');await q("INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status,reason) VALUES($1,$2,current_date+30,current_date+30,'APPROVED','Fictional approved leave')",['leave-'+id,actor]);
   await q("INSERT INTO notifications(id,employee_id,type,title,body,event_key,environment,source_kind,source_id,source_version,effective_version,purpose,due_at,expires_at,urgency,push_state,created_at) VALUES($1,$2,'TIME_OFF_APPROVED','Fictional','Fictional',$1,'test','TIME_OFF',$3,'APPROVED','APPROVED','EVENT',now()-interval '1 hour',now()+interval '1 day','high','pending','2026-10-27T15:00:00.123456Z')",[id,actor,'leave-'+id]);
  }
  const first=await readEmployeeNotificationPage(proof,'test',db.executor);expect(notifications(first.value).items).toHaveLength(25);expect(notifications(first.value).coverage).toBe('complete');expect(first.nextCursor).toBeTruthy();
  const older=await readEmployeeNotificationPage(proof,'test',db.executor,first.nextCursor!);expect(notifications(older.value).items).toHaveLength(5);expect(older.nextCursor).toBeNull();
  const ids=[...notifications(first.value).items,...notifications(older.value).items].map(x=>x.id);expect(new Set(ids).size).toBe(30);expect(ids.every(id=>id.startsWith('MSG-A-'))).toBe(true);
  expect(notifications(await readEmployeeNotificationList(proof,'test',db.executor)).coverage).toBe('partial');expect(notifications((await readEmployeeNotificationPage(peer,'test',db.executor)).value).items).toHaveLength(3);
 }finally{await db.dispose();}
});
it('refuses invalid page selectors and changed role or session before publishing own notices',async()=>{
 const {db,q,proof}=await setup();try{
  expect((await readEmployeeNotificationPage(proof,'test',db.executor,'invalid')).value.state).toBe('unavailable');
  await q("UPDATE employees SET role='MANAGER' WHERE id='MSG-A'");expect((await readEmployeeNotificationPage(proof,'test',db.executor)).value).toEqual({state:'unavailable',reason:'access_denied'});
  await q("UPDATE employees SET role='EMPLOYEE' WHERE id='MSG-A'");await q('DELETE FROM employee_sessions WHERE token_hash=$1',[proof.sessionTokenHash]);expect((await readEmployeeNotificationPage(proof,'test',db.executor)).value.state).toBe('unavailable');
 }finally{await db.dispose();}
});
async function publishUpdates(executor:import('../../lib/notifications/types').SqlExecutor,count:number){
 const {previewCommunicationAudience,executeCommunicationCommand}=await import('../../lib/communications/service.server');const {randomUUID}=await import('node:crypto');const owner=await fixtureProof(executor,'QAOWNER'),ids:string[]=[];
 for(let i=0;i<count;i++){
  const draft={type:'LOCATION_ANNOUNCEMENT' as const,scope:{kind:'LOCATION' as const,locationId:'loc-1'},title:'Fictional update '+i,body:'Actual test-only workplace message.',acknowledgement:'OPTIONAL' as const,expiresAt:null};
  const preview=await previewCommunicationAudience(owner,draft,executor);if(preview.state!=='ready')throw Error('No current audience');
  const result=await executeCommunicationCommand(owner,{kind:'PUBLISH',operationId:randomUUID(),authority:preview.authority,draft,audienceFingerprint:preview.fingerprint},executor);if(result.status!=='committed')throw Error('Publication unavailable');ids.push(result.id);
 }
 await makeOwnedCommunicationNoticesDue(executor,ids,['MSG-A','MSG-B'],count*2);
 return {owner,ids};
}
it('retains the existing finite notification-read budget for a full page of distinct team updates',async()=>{
 const {db,proof}=await setup();try{
  await publishUpdates(db.executor,26);
  const old=notifications(await readEmployeeNotificationList(proof,'test',db.executor));expect(old.items).toHaveLength(25);
  const first=await readEmployeeNotificationPage(proof,'test',db.executor);expect(notifications(first.value).items).toHaveLength(25);expect(first.nextCursor).toBeTruthy();
  expect(notifications((await readEmployeeNotificationPage(proof,'test',db.executor,first.nextCursor!)).value).items).toHaveLength(1);
 }finally{await db.dispose();}
});
it('pages current updates with exact own read status and no coworker receipt roster',async()=>{
 const {db,q,proof,peer}=await setup();try{
  const {listEmployeeCommunications,readEmployeeCommunicationPage}=await import('../../lib/communications/service.server');await publishUpdates(db.executor,27);
  const first=await readEmployeeCommunicationPage(proof,db.executor);expect(first.value.state).toBe('complete');if(first.value.state!=='complete'&&first.value.state!=='partial')throw Error('Own updates unavailable');expect(first.value.items).toHaveLength(25);expect(first.value.items.every(r=>!('management'in r))).toBe(true);
  const older=await readEmployeeCommunicationPage(proof,db.executor,first.nextCursor!);if(older.value.state!=='complete'&&older.value.state!=='partial')throw Error('Older updates unavailable');expect(older.value.items).toHaveLength(2);expect(older.nextCursor).toBeNull();expect(new Set([...first.value.items,...older.value.items].map(r=>r.state==='ready'?r.id:'')).size).toBe(27);
  const legacy=await listEmployeeCommunications(proof,db.executor);if(legacy.state!=='complete')throw Error('Legacy source changed');expect(legacy.items).toHaveLength(27);
  await q("UPDATE employees SET primary_location_id='loc-2' WHERE id='MSG-B';DELETE FROM employee_location_eligibility WHERE employee_id='MSG-B'");const lost=await readEmployeeCommunicationPage(peer,db.executor);expect(lost.value.state).toBe('complete');if(lost.value.state==='complete')expect(lost.value.items).toHaveLength(0);expect(lost.nextCursor).toBeNull();
 }finally{await db.dispose();}
});
it('rechecks Updates module permission inside the actual employee command transaction',async()=>{
 const {db,q,proof}=await setup();try{
  const {employeeUpdatesExecutor}=await import('../../lib/data/employee-message-module.server');const {executeCommunicationCommand,readCommunication}=await import('../../lib/communications/service.server');const {saveWorkspacePresentation}=await import('../../lib/workspace-presentation/service');const {randomUUID}=await import('node:crypto');
  const {owner,ids}=await publishUpdates(db.executor,1),read=await readCommunication(proof,ids[0],db.executor);if(read.state!=='ready')throw Error('Own update unavailable');let changed=false;
  const racing:import('../../lib/notifications/types').SqlExecutor={query:db.executor.query,async transaction(statements,signal){if(!changed&&statements.some(s=>/INSERT INTO communication_receipts/.test(s.text))){changed=true;await saveWorkspacePresentation(owner,{operationId:randomUUID(),expectedRevision:0,section:'modules',disabled:['updates']},db.executor);}return db.executor.transaction(statements,signal);}};
  const guarded=await employeeUpdatesExecutor(proof,racing),command={kind:'ACKNOWLEDGE' as const,operationId:randomUUID(),authority:read.authority,communicationId:read.id,expectedRevisionId:read.revisionId,contentHash:read.contentHash};
  expect((await executeCommunicationCommand(proof,command,guarded)).status).toBe('blocked');expect(changed).toBe(true);expect((await q<{n:number}>('SELECT count(*)::integer AS n FROM communication_receipts WHERE employee_id=$1',[proof.employee.id]))[0].n).toBe(0);
  await saveWorkspacePresentation(owner,{operationId:randomUUID(),expectedRevision:1,section:'modules',disabled:[]},db.executor);
  expect((await executeCommunicationCommand(proof,command,await employeeUpdatesExecutor(proof,db.executor))).status).toBe('committed');
 }finally{await db.dispose();}
});
it('treats superseded (cancelled) own notices as gone, not as notices that could not be checked',async()=>{
 const {db,q,proof}=await setup();try{
  // A republished schedule cancels its earlier notices. They are no longer current, so the list must not call itself partial.
  const notice=(id:string,created:string,cancelled:boolean)=>q("INSERT INTO notifications(id,employee_id,type,title,body,event_key,environment,source_kind,source_id,source_version,effective_version,purpose,due_at,expires_at,urgency,push_state,created_at,cancelled_at) VALUES($1,'MSG-A','TIME_OFF_APPROVED','Fictional','Fictional',$1,'test','TIME_OFF','own-leave','APPROVED','APPROVED','EVENT',now()-interval '1 hour',now()+interval '1 day','high',CASE WHEN $3 THEN 'cancelled' ELSE 'pending' END,$2::timestamptz,CASE WHEN $3 THEN now() END)",[id,created,cancelled]);
  await q("INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status,reason) VALUES('own-leave','MSG-A',current_date+30,current_date+30,'APPROVED','Fictional approved leave')");
  await notice('superseded-notice','2026-10-27T15:00:00Z',true);await notice('current-notice','2026-10-27T14:00:00Z',false);
  for(const read of [(await readEmployeeNotificationPage(proof,'test',db.executor)).value,await readEmployeeNotificationList(proof,'test',db.executor)]){
   const value=notifications(read);expect(value.items.map(i=>i.id)).toEqual(['current-notice']);expect(value.coverage).toBe('complete');
  }
  // Superseded notices must not use up the page window either: 25 newer cancelled rows leave the older current notice listed.
  for(let i=0;i<25;i++)await notice('superseded-'+String(i).padStart(2,'0'),'2026-10-27T16:00:00Z',true);
  const page=await readEmployeeNotificationPage(proof,'test',db.executor);expect(notifications(page.value).items.map(i=>i.id)).toEqual(['current-notice']);expect(notifications(page.value).coverage).toBe('complete');expect(page.nextCursor).toBeNull();
 }finally{await db.dispose();}
});
it('hides disabled-module notifications while retaining unrelated own notices',async()=>{
 const {db,q,proof}=await setup();try{
  const {owner}=await publishUpdates(db.executor,1);expect(notifications((await readEmployeeNotificationPage(proof,'test',db.executor)).value).items.some(i=>i.label==='Team update')).toBe(true);
  const {saveWorkspacePresentation}=await import('../../lib/workspace-presentation/service');const {randomUUID}=await import('node:crypto');await saveWorkspacePresentation(owner,{operationId:randomUUID(),expectedRevision:0,section:'modules',disabled:['updates']},db.executor);
  await q("INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status,reason) VALUES('own-leave','MSG-A',current_date+30,current_date+30,'APPROVED','Fictional approved leave')");
  await q("INSERT INTO notifications(id,employee_id,type,title,body,event_key,environment,source_kind,source_id,source_version,effective_version,purpose,due_at,expires_at,urgency,push_state) VALUES('unrelated-leave','MSG-A','TIME_OFF_APPROVED','Fictional','Fictional','unrelated-leave','test','TIME_OFF','own-leave','APPROVED','APPROVED','EVENT',now()-interval '1 hour',now()+interval '1 day','high','pending')");
  const value=notifications((await readEmployeeNotificationPage(proof,'test',db.executor)).value);expect(value.items.map(i=>i.id)).toEqual(['unrelated-leave']);
 }finally{await db.dispose();}
});
it('binds finite mobile views to current own identity and keeps a disabled Updates capability separate',async()=>{
 const {db,q,proof,peer}=await setup();try{
  const {readEmployeeMessages}=await import('../../lib/data/employee-messages.server');const {owner,ids}=await publishUpdates(db.executor,1);
  for(const [view,selection] of [['notifications','first'],['updates','first'],['detail',ids[0]],['compose','new']] as const){const read=await readEmployeeMessages(proof,view,selection,'test',db.executor);expect(read.state).toBe('ready');if(read.state==='ready'){expect(read.validForMs).toBeGreaterThan(0);expect(read.validForMs).toBeLessThanOrEqual(45000);expect(read.view).toBe(view);expect(read.selection).toBe(selection);}}
  await q("UPDATE employees SET primary_location_id='loc-2' WHERE id='MSG-B';DELETE FROM employee_location_eligibility WHERE employee_id='MSG-B'");const denied=await readEmployeeMessages(peer,'detail',ids[0],'test',db.executor);expect(denied.state).toBe('ready');if(denied.state==='ready'&&denied.view==='detail')expect(denied.data?.state).toBe('unauthorized');
  const {saveWorkspacePresentation}=await import('../../lib/workspace-presentation/service');const {randomUUID}=await import('node:crypto');await saveWorkspacePresentation(owner,{operationId:randomUUID(),expectedRevision:0,section:'modules',disabled:['updates']},db.executor);
  const off=await readEmployeeMessages(proof,'updates','first','test',db.executor);expect(off.state).toBe('ready');if(off.state==='ready'){expect(off.updates).toBe('off');expect(off.data).toBeNull();}
  expect((await readEmployeeMessages(proof,'notifications','first','test',db.executor)).state).toBe('ready');await q('DELETE FROM employee_sessions WHERE token_hash=$1',[proof.sessionTokenHash]);expect(await readEmployeeMessages(proof,'compose','new','test',db.executor)).toEqual({state:'unavailable',reason:'access_denied'});
 }finally{await db.dispose();}
});
it('resolves exact notification destinations through current canonical access without recording read or acknowledgement',async()=>{
 const {db,q,proof,peer}=await setup();try{
  const {readEmployeeMessageDestination}=await import('../../lib/data/employee-message-destination.server');const {ids}=await publishUpdates(db.executor,1);const [notice]=await q<{id:string}>("SELECT id FROM notifications WHERE employee_id='MSG-A' AND source_id=$1",[ids[0]]);
  const target=await readEmployeeMessageDestination(proof,notice.id,'test',db.executor);expect(target).toEqual({state:'ready',href:'/app/updates/'+ids[0]});expect((await q<{n:number}>('SELECT count(*)::integer AS n FROM communication_receipts'))[0].n).toBe(0);expect((await q<{n:number}>("SELECT count(*)::integer AS n FROM employee_attention_receipts WHERE source_kind='COMMUNICATION'"))[0].n).toBe(0);
  expect((await readEmployeeMessageDestination(peer,notice.id,'test',db.executor)).state).toBe('unavailable');await q("UPDATE employees SET primary_location_id='loc-2' WHERE id='MSG-A';DELETE FROM employee_location_eligibility WHERE employee_id='MSG-A'");expect((await readEmployeeMessageDestination(proof,notice.id,'test',db.executor)).state).toBe('unavailable');
 }finally{await db.dispose();}
});
