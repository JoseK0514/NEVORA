import {it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {companyAccessFixture} from './company-access-fixture';
import type {InvitationDelivery} from '../../lib/company-access/contracts';
vi.mock('server-only',()=>({}));
import {issueOrRevokeInvitation,readInvitationStatus,readInvitationOperation} from '../../lib/auth/invitations/service.server';

it('Owner issues only to current registered email; replay returns metadata without resending or spending another issue',async()=>{
 const f=await companyAccessFixture();const mail:{email:string;proof:string}[]=[];
 const delivery:InvitationDelivery={async send(v){mail.push({email:v.registeredEmail,proof:v.proof});return {providerAccepted:true};}};
 try{
  const status=await readInvitationStatus(f.owner,'target',f.db.executor);expect(status.state).toBe('ready');if(status.state!=='ready')throw Error('status');
  const command={action:'ISSUE' as const,operationId:randomUUID(),expectedEmployeeVersion:status.employeeVersion,expectedInvitationRevision:0};
  const result=await issueOrRevokeInvitation(f.owner,'target',command,delivery,f.db.executor);
  if(result.state!=='saved')throw Error('Issue failed: '+JSON.stringify(f.sqlFailures));expect(result.state).toBe('saved');expect(result.receipt.delivery).toBe('PROVIDER_ACCEPTED');
  expect(mail.length).toBe(1);expect(mail[0].email==='target@example.invalid').toBe(true);expect(mail[0].proof.length).toBe(43);
  const history=JSON.stringify(await f.q('SELECT to_jsonb(i) AS invitation FROM company_invitations i'))+JSON.stringify(await f.q('SELECT receipt FROM company_access_operations'))+JSON.stringify(result);
  expect(history.includes(mail[0].proof)).toBe(false);
  expect(await issueOrRevokeInvitation(f.owner,'target',command,null,f.db.executor)).toEqual(result);
  expect(mail.length).toBe(1);expect(await f.q("SELECT attempts FROM company_invitation_issue_counters WHERE kind='TARGET'")).toEqual([{attempts:1}]);
  const changed=await issueOrRevokeInvitation(f.owner,'target',{...command,expectedInvitationRevision:1},delivery,f.db.executor);
  expect(changed).toEqual({state:'conflict',reason:'changed_replay'});
  expect(await readInvitationOperation(f.owner,command.operationId,f.db.executor)).toEqual(result);
 }finally{mail.length=0;await f.db.dispose();}
});
it('denies non-Owner, forged or expired sessions and uninvitable targets without mutations',async()=>{
 const f=await companyAccessFixture();const delivery:InvitationDelivery={async send(){throw Error('must not send');}};
 try{
  const status=await readInvitationStatus(f.owner,'target',f.db.executor);if(status.state!=='ready')throw Error('status');
  const issue=()=>({action:'ISSUE' as const,operationId:randomUUID(),expectedEmployeeVersion:status.employeeVersion,expectedInvitationRevision:0});
  for(const proof of [f.manager,{...f.owner,sessionTokenHash:'c'.repeat(64)}]){
   expect((await issueOrRevokeInvitation(proof,'target',issue(),delivery,f.db.executor)).state).toBe('unavailable');
  }
  await f.q("UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE employee_id='owner'");
  expect((await issueOrRevokeInvitation(f.owner,'target',issue(),delivery,f.db.executor)).state).toBe('unavailable');
  await f.q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '1 hour' WHERE employee_id='owner'");
  for(const change of ["email=NULL","active=false"]){
   await f.q(`UPDATE employees SET ${change},updated_at=clock_timestamp() WHERE id='target'`);
   const current=await readInvitationStatus(f.owner,'target',f.db.executor);if(current.state!=='ready')throw Error('status');
   expect((await issueOrRevokeInvitation(f.owner,'target',{...issue(),expectedEmployeeVersion:current.employeeVersion},delivery,f.db.executor)).state).toBe('invalid');
  }
  expect(await f.q('SELECT count(*)::integer AS count FROM company_invitations')).toEqual([{count:0}]);
  expect(await f.q('SELECT count(*)::integer AS count FROM company_access_operations')).toEqual([{count:0}]);
 }finally{await f.db.dispose();}
});
it('reissue retires old custody, the fourth issue is limited, and explicit revoke is idempotent',async()=>{
 const f=await companyAccessFixture();const delivery:InvitationDelivery={async send(){return {providerAccepted:true};}};
 try{
  let last:Awaited<ReturnType<typeof issueOrRevokeInvitation>>|undefined;
  for(let revision=0;revision<4;revision++){
   const status=await readInvitationStatus(f.owner,'target',f.db.executor);if(status.state!=='ready')throw Error('status');
   const result=await issueOrRevokeInvitation(f.owner,'target',{action:'ISSUE',operationId:randomUUID(),expectedEmployeeVersion:status.employeeVersion,expectedInvitationRevision:revision},delivery,f.db.executor);
   expect(result.state).toBe(revision===3?'limited':'saved');if(revision<3)last=result;
  }
  expect(await f.q('SELECT count(*)::integer AS count FROM company_invitations WHERE retired_at IS NOT NULL')).toEqual([{count:2}]);
  if(last?.state!=='saved')throw Error('last');
  const revoke={action:'REVOKE' as const,operationId:randomUUID(),invitationId:last.receipt.invitationId,expectedInvitationRevision:3};
  const result=await issueOrRevokeInvitation(f.owner,'target',revoke,null,f.db.executor);expect(result.state).toBe('saved');
  expect(await issueOrRevokeInvitation(f.owner,'target',revoke,null,f.db.executor)).toEqual(result);
  expect(await f.q('SELECT count(*)::integer AS count FROM company_invitations WHERE retired_at IS NULL AND consumed_at IS NULL')).toEqual([{count:0}]);
 }finally{await f.db.dispose();}
});
it('unconfigured delivery leaves valid custody untouched and transport uncertainty never claims provider acceptance',async()=>{
 const f=await companyAccessFixture();try{
  const status=await readInvitationStatus(f.owner,'target',f.db.executor);if(status.state!=='ready')throw Error('status');
  const command={action:'ISSUE' as const,operationId:randomUUID(),expectedEmployeeVersion:status.employeeVersion,expectedInvitationRevision:0};
  expect(await issueOrRevokeInvitation(f.owner,'target',command,null,f.db.executor)).toEqual({state:'unavailable',reason:'delivery_unavailable'});
  const result=await issueOrRevokeInvitation(f.owner,'target',command,{async send(){throw Error('opaque transport failure');}},f.db.executor);
  expect(result.state).toBe('saved');if(result.state==='saved')expect(result.receipt.delivery).toBe('UNKNOWN');
  const current=await readInvitationStatus(f.owner,'target',f.db.executor);if(current.state!=='ready')throw Error('status');
  expect(current.delivery).toBe('UNKNOWN');
  expect(await issueOrRevokeInvitation(f.owner,'target',{...command,operationId:randomUUID(),expectedInvitationRevision:1},null,f.db.executor)).toEqual({state:'unavailable',reason:'delivery_unavailable'});
  expect(await f.q('SELECT count(*)::integer AS count FROM company_invitations WHERE retired_at IS NULL')).toEqual([{count:1}]);
 }finally{await f.db.dispose();}
});

it('a committed issuance with a lost response stays outcome-unknown and replay never reconstructs or resends its bearer',async()=>{
 const f=await companyAccessFixture();let sends=0,lose=true;
 try{
  const status=await readInvitationStatus(f.owner,'target',f.db.executor);if(status.state!=='ready')throw Error('status');
  const command={action:'ISSUE' as const,operationId:randomUUID(),expectedEmployeeVersion:status.employeeVersion,expectedInvitationRevision:0};
  const actual=f.db.executor;
  const uncertain={...actual,async transaction(statements:Parameters<typeof actual.transaction>[0]){
   const rows=await actual.transaction(statements);
   if(lose&&statements.some(s=>s.text.startsWith('INSERT INTO company_access_operations'))){lose=false;throw Error('Simulated lost committed response');}
   return rows;
  }};
  const delivery:InvitationDelivery={async send(){sends++;return {providerAccepted:true};}};
  expect(await issueOrRevokeInvitation(f.owner,'target',command,delivery,uncertain)).toEqual({state:'outcome_unknown',operationId:command.operationId});
  expect(await f.q('SELECT count(*)::integer AS count FROM company_invitations')).toEqual([{count:1}]);
  const replay=await issueOrRevokeInvitation(f.owner,'target',command,delivery,actual);expect(replay.state).toBe('saved');
  expect(sends).toBe(0);expect(await f.q("SELECT attempts FROM company_invitation_issue_counters WHERE kind='TARGET'")).toEqual([{attempts:1}]);
 }finally{await f.db.dispose();}
});
it('status invalidates custody when registered email changes even without a timestamp update',async()=>{
 const f=await companyAccessFixture();try{
  const status=await readInvitationStatus(f.owner,'target',f.db.executor);if(status.state!=='ready')throw Error('status');
  expect((await issueOrRevokeInvitation(f.owner,'target',{action:'ISSUE',operationId:randomUUID(),expectedEmployeeVersion:status.employeeVersion,expectedInvitationRevision:0},{async send(){return {providerAccepted:true};}},f.db.executor)).state).toBe('saved');
  await f.q("UPDATE employees SET email='changed@example.invalid' WHERE id='target'");
  const changed=await readInvitationStatus(f.owner,'target',f.db.executor);if(changed.state!=='ready')throw Error('status');
  expect(changed.employeeVersion).toBe(status.employeeVersion);expect(changed.invitation?.state).toBe('INVALIDATED');
 }finally{await f.db.dispose();}
});
it('an exact concurrent replay whose first lookup precedes the winner still reconciles after its target read',async()=>{
 const f=await companyAccessFixture();let sends=0;
 try{
  const status=await readInvitationStatus(f.owner,'target',f.db.executor);if(status.state!=='ready')throw Error('status');
  const command={action:'ISSUE' as const,operationId:randomUUID(),expectedEmployeeVersion:status.employeeVersion,expectedInvitationRevision:0};
  const actual=f.db.executor;let resume!:()=>void,entered!:()=>void;
  const paused=new Promise<void>(resolve=>{entered=resolve;}),continueRead=new Promise<void>(resolve=>{resume=resolve;});
  const follower={...actual,async transaction(statements:Parameters<typeof actual.transaction>[0]){
   if(statements.some(s=>s.text.startsWith('SELECT e.id AS "employeeId"'))){entered();await continueRead;}
   return actual.transaction(statements);
  }};
  const delivery:InvitationDelivery={async send(){sends++;return {providerAccepted:true};}};
  const pending=issueOrRevokeInvitation(f.owner,'target',command,delivery,follower);
  await paused;
  const winner=await issueOrRevokeInvitation(f.owner,'target',command,delivery,actual);
  resume();const replay=await pending;
  expect(winner.state).toBe('saved');expect(replay).toEqual(winner);expect(sends).toBe(1);
  expect(await f.q('SELECT count(*)::integer AS count FROM company_access_operations')).toEqual([{count:1}]);
 }finally{await f.db.dispose();}
});
it('authority loss during mail delivery suppresses the historical receipt response while preserving the committed delivery fact',async()=>{
 const f=await companyAccessFixture();try{
  const status=await readInvitationStatus(f.owner,'target',f.db.executor);if(status.state!=='ready')throw Error('status');
  const command={action:'ISSUE' as const,operationId:randomUUID(),expectedEmployeeVersion:status.employeeVersion,expectedInvitationRevision:0};
  const result=await issueOrRevokeInvitation(f.owner,'target',command,{async send(){await f.q("UPDATE employees SET role='EMPLOYEE' WHERE id='owner'");return {providerAccepted:true};}},f.db.executor);
  expect(result).toEqual({state:'outcome_unknown',operationId:command.operationId});
  expect(await f.q('SELECT count(*)::integer AS count FROM company_access_operations')).toEqual([{count:1}]);
  expect((await readInvitationOperation(f.owner,command.operationId,f.db.executor)).state).toBe('unavailable');
  expect(await f.q("SELECT count(*)::integer AS count FROM company_invitation_delivery_events WHERE state='PROVIDER_ACCEPTED'")).toEqual([{count:1}]);
 }finally{await f.db.dispose();}
});
it('Owner self-issue is denied and the authenticated global issue ceiling leaves target custody untouched',async()=>{
 const f=await companyAccessFixture();let sent=0;
 try{
  const own=await readInvitationStatus(f.owner,'owner',f.db.executor);if(own.state!=='ready')throw Error('status');expect(own.eligibility).toBe('SELF_ISSUE_DENIED');
  const delivery:InvitationDelivery={async send(){sent++;return {providerAccepted:true};}};
  expect((await issueOrRevokeInvitation(f.owner,'owner',{action:'ISSUE',operationId:randomUUID(),expectedEmployeeVersion:own.employeeVersion,expectedInvitationRevision:0},delivery,f.db.executor)).state).toBe('invalid');
  const status=await readInvitationStatus(f.owner,'target',f.db.executor);if(status.state!=='ready')throw Error('status');
  await f.q("INSERT INTO company_invitation_issue_counters VALUES('workspace-fuel',date_bin(interval '15 minutes',clock_timestamp(),timestamptz '2000-01-01 00:00:00Z'),'GLOBAL','',300)");
  const result=await issueOrRevokeInvitation(f.owner,'target',{action:'ISSUE',operationId:randomUUID(),expectedEmployeeVersion:status.employeeVersion,expectedInvitationRevision:0},delivery,f.db.executor);
  expect(result.state).toBe('limited');if(result.state==='limited'){expect(result.retryAfterMs).toBeGreaterThan(0);expect(result.retryAfterMs).toBeLessThanOrEqual(900000);}
  expect(sent).toBe(0);expect(await f.q('SELECT count(*)::integer AS count FROM company_invitations')).toEqual([{count:0}]);
 }finally{await f.db.dispose();}
});
