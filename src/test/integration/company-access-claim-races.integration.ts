import {it,expect,vi} from 'vitest';
import {Client} from 'pg';
import {randomUUID,randomBytes} from 'node:crypto';
import {companyAccessFixture} from './company-access-fixture';
import {issued,ownedPassword,type ClaimFixture} from './company-access-claim.test-support';
import {claimInvitation} from '../../lib/auth/invitations/claim.server';
import {issueOrRevokeInvitation,readInvitationStatus,invitationProofDigest,invitationEmailFingerprint} from '../../lib/auth/invitations/service.server';
vi.mock('server-only',()=>({}));
async function wait(f:ClaimFixture,pattern:string){
 const end=Date.now()+3500;while(Date.now()<end){const [r]=await f.q<{waiting:boolean}>("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE $1) AS waiting",[pattern]);if(r.waiting)return;await new Promise(r=>setTimeout(r,10));}throw Error('Actual claim SQL wait not observed');
}
async function cleanup(f:ClaimFixture,barrier:Client,pending?:Promise<unknown>,writer?:Client){
 await barrier.query('ROLLBACK').catch(()=>{});await barrier.query('SELECT pg_advisory_unlock_all()').catch(()=>{});
 await pending;await writer?.end();await barrier.end();await f.db.dispose();
}
const changes=[
 {name:'contact',id:'target',sql:"UPDATE employees SET email='changed@example.invalid',updated_at=clock_timestamp() WHERE id='target'"},
 {name:'deactivation',id:'target',sql:"UPDATE employees SET active=false,updated_at=clock_timestamp() WHERE id='target'"},
 {name:'issuer role',id:'owner',sql:"UPDATE employees SET role='EMPLOYEE' WHERE id='owner'"},
 {name:'credential insertion',id:'target',sql:"INSERT INTO employee_credentials(employee_id,password_hash) VALUES('target','owned-competing-credential')"},
] as const;
it.each(changes)('claim waiting behind $name rechecks binding before admission/hash and creates no credential or consume event',async c=>{
 const f=await companyAccessFixture(),writer=new Client({connectionString:f.db.connectionString,statement_timeout:5000});let pending:ReturnType<typeof claimInvitation>|undefined;
 try{
  const invite=await issued(f);await writer.connect();await writer.query('BEGIN');await writer.query('SELECT id FROM employees WHERE id=$1 FOR UPDATE',[c.id]);
  pending=claimInvitation(invite.proof,ownedPassword,f.db.executor);await wait(f,'%SELECT id FROM employees WHERE id=ANY%');
  await writer.query(c.sql);await writer.query('COMMIT');expect(await pending).toEqual({state:'invalid'});
  expect(await f.q('SELECT * FROM company_invitation_claim_counters')).toEqual([]);expect(await f.q("SELECT * FROM company_invitation_events WHERE action='CONSUME'")).toEqual([]);
  expect(await f.q("SELECT count(*)::integer AS count FROM employee_credentials WHERE employee_id='target'")).toEqual([{count:c.name==='credential insertion'?1:0}]);
 }finally{await cleanup(f,writer,pending);}
});
it.each(['REVOKE','ISSUE'] as const)('claim blocked behind %s cannot consume the retired proof',async action=>{
 const f=await companyAccessFixture(),barrier=new Client({connectionString:f.db.connectionString,statement_timeout:5000});let pending:ReturnType<typeof claimInvitation>|undefined,changing:ReturnType<typeof issueOrRevokeInvitation>|undefined;
 try{
  const invite=await issued(f),status=await readInvitationStatus(f.owner,'target',f.db.executor);if(status.state!=='ready')throw Error('Owner status');
  await barrier.connect();await barrier.query('SELECT pg_advisory_lock(321041)');
  await f.q(`CREATE FUNCTION test_owned_issue_claim_wait() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind='INVITATION' THEN PERFORM pg_advisory_xact_lock(321041);END IF;RETURN NEW;END $$;
   CREATE TRIGGER test_owned_issue_claim_wait BEFORE INSERT ON company_access_operations FOR EACH ROW EXECUTE FUNCTION test_owned_issue_claim_wait()`);
  const command=action==='REVOKE'?{action,operationId:randomUUID(),invitationId:invite.receipt.invitationId,expectedInvitationRevision:invite.receipt.revision}:{action,operationId:randomUUID(),expectedEmployeeVersion:status.employeeVersion,expectedInvitationRevision:status.invitationRevision};
  changing=issueOrRevokeInvitation(f.owner,'target',command,{async send(){return {providerAccepted:true};}},f.db.executor);await wait(f,'%INSERT INTO company_access_operations%');
  pending=claimInvitation(invite.proof,ownedPassword,f.db.executor);await wait(f,'%SELECT id FROM workspaces WHERE singleton=true ORDER BY id FOR SHARE%');
  await barrier.query('SELECT pg_advisory_unlock(321041)');expect((await changing).state).toBe('saved');expect(await pending).toEqual({state:'invalid'});
  expect(await f.q("SELECT * FROM employee_credentials WHERE employee_id='target'")).toEqual([]);expect(await f.q("SELECT * FROM company_invitation_events WHERE action='CONSUME'")).toEqual([]);
 }finally{await barrier.query('SELECT pg_advisory_unlock_all()').catch(()=>{});await changing;await cleanup(f,barrier,pending);}
});
async function consumeBarrier(f:ClaimFixture,barrier:Client){
 await barrier.connect();await barrier.query('SELECT pg_advisory_lock(321042)');
 await f.q(`CREATE FUNCTION test_owned_claim_consume_wait() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='CONSUME' THEN PERFORM pg_advisory_xact_lock(321042);END IF;RETURN NEW;END $$;
  CREATE TRIGGER test_owned_claim_consume_wait BEFORE INSERT ON company_invitation_events FOR EACH ROW EXECUTE FUNCTION test_owned_claim_consume_wait()`);
}
it.each(changes)('a claim holding its locks commits before waiting $name and the credential is retained',async c=>{
 const f=await companyAccessFixture(),barrier=new Client({connectionString:f.db.connectionString,statement_timeout:5000}),writer=new Client({connectionString:f.db.connectionString,statement_timeout:5000});let pending:ReturnType<typeof claimInvitation>|undefined,changing:Promise<unknown>|undefined;
 try{
  const invite=await issued(f);await consumeBarrier(f,barrier);await writer.connect();
  pending=claimInvitation(invite.proof,ownedPassword,f.db.executor);await wait(f,'%INSERT INTO company_invitation_events%');
  changing=writer.query(c.sql).then(()=>({changed:true}),error=>({changed:false,code:error.code}));await wait(f,c.name==='credential insertion'?'%INSERT INTO employee_credentials%':'%UPDATE employees SET%');
  await barrier.query('SELECT pg_advisory_unlock(321042)');expect(await pending).toEqual({state:'activated',employeeId:'target'});
  expect(await changing).toEqual(c.name==='credential insertion'?{changed:false,code:'23505'}:{changed:true});
  expect(await f.q("SELECT count(*)::integer AS count FROM employee_credentials WHERE employee_id='target'")).toEqual([{count:1}]);expect(await f.q("SELECT count(*)::integer AS count FROM company_invitation_events WHERE action='CONSUME'")).toEqual([{count:1}]);
 }finally{await barrier.query('SELECT pg_advisory_unlock_all()').catch(()=>{});await changing;await cleanup(f,barrier,pending,writer);}
});
it.each(['REVOKE','ISSUE'] as const)('a claim holding its locks consumes before waiting %s and no later invitation operation can undo it',async action=>{
 const f=await companyAccessFixture(),barrier=new Client({connectionString:f.db.connectionString,statement_timeout:5000});let pending:ReturnType<typeof claimInvitation>|undefined,changing:ReturnType<typeof issueOrRevokeInvitation>|undefined;
 try{
  const invite=await issued(f),status=await readInvitationStatus(f.owner,'target',f.db.executor);if(status.state!=='ready')throw Error('Owner status');
  await consumeBarrier(f,barrier);pending=claimInvitation(invite.proof,ownedPassword,f.db.executor);await wait(f,'%INSERT INTO company_invitation_events%');
  const command=action==='REVOKE'?{action,operationId:randomUUID(),invitationId:invite.receipt.invitationId,expectedInvitationRevision:invite.receipt.revision}:{action,operationId:randomUUID(),expectedEmployeeVersion:status.employeeVersion,expectedInvitationRevision:status.invitationRevision};
  let sent=0;changing=issueOrRevokeInvitation(f.owner,'target',command,{async send(){sent++;return {providerAccepted:true};}},f.db.executor);await wait(f,'%SELECT id FROM workspaces WHERE singleton=true ORDER BY id FOR NO KEY UPDATE%');
  await barrier.query('SELECT pg_advisory_unlock(321042)');expect(await pending).toEqual({state:'activated',employeeId:'target'});
  expect((await changing).state).not.toBe('saved');expect(sent).toBe(0);
  expect(await f.q("SELECT count(*)::integer AS count FROM employee_credentials WHERE employee_id='target'")).toEqual([{count:1}]);expect(await f.q("SELECT count(*)::integer AS count FROM company_invitation_events WHERE action='CONSUME'")).toEqual([{count:1}]);
 }finally{await barrier.query('SELECT pg_advisory_unlock_all()').catch(()=>{});await changing;await cleanup(f,barrier,pending);}
});
it('final wall-clock expiry after credential insertion and consumption rolls both and the audit event back',async()=>{
 const f=await companyAccessFixture(),barrier=new Client({connectionString:f.db.connectionString,statement_timeout:5000});let pending:ReturnType<typeof claimInvitation>|undefined;
 try{
  const proof=randomBytes(32).toString('base64url'),id=randomUUID();
  await consumeBarrier(f,barrier);
  await f.q(`INSERT INTO company_invitations(workspace_id,id,employee_id,revision,target_version,email_fingerprint,issuer_employee_id,issuer_generation,proof_digest,expires_at)
   SELECT 'workspace-fuel',$1,'target',1,updated_at::text,$2,'owner',1,$3,clock_timestamp()+interval '2500 milliseconds' FROM employees WHERE id='target'`,[id,invitationEmailFingerprint('target@example.invalid'),invitationProofDigest(proof)]);
  pending=claimInvitation(proof,ownedPassword,f.db.executor);await wait(f,'%INSERT INTO company_invitation_events%');
  const end=Date.now()+3500;let expired=false;while(!expired&&Date.now()<end){const [r]=await f.q<{expired:boolean}>('SELECT expires_at<=clock_timestamp() AS expired FROM company_invitations WHERE id=$1',[id]);expired=r.expired;if(!expired)await new Promise(r=>setTimeout(r,20));}
  expect(expired).toBe(true);await barrier.query('SELECT pg_advisory_unlock(321042)');expect(await pending).toEqual({state:'invalid'});
  expect(await f.q("SELECT * FROM employee_credentials WHERE employee_id='target'")).toEqual([]);expect(await f.q('SELECT consumed_at FROM company_invitations WHERE id=$1',[id])).toEqual([{consumed_at:null}]);expect(await f.q("SELECT * FROM company_invitation_events WHERE action='CONSUME'")).toEqual([]);
 }finally{await cleanup(f,barrier,pending);}
});
