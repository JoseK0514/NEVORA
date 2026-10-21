import {it,expect,vi} from 'vitest';
import {Client} from 'pg';
import {randomUUID} from 'node:crypto';
import {companyAccessFixture} from './company-access-fixture';
vi.mock('server-only',()=>({}));
import {issueOrRevokeInvitation,readInvitationStatus} from '../../lib/auth/invitations/service.server';

type Fixture=Awaited<ReturnType<typeof companyAccessFixture>>;
async function blocked(f:Fixture,pattern:string){
 const until=Date.now()+3500;
 while(Date.now()<until){
  const [row]=await f.q<{waiting:boolean}>(`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE $1) AS waiting`,[pattern]);
  if(row.waiting)return;
  await new Promise(resolve=>setTimeout(resolve,10));
 }
 throw Error('Expected a real PostgreSQL lock wait was not observed');
}
async function command(f:Fixture){
 const status=await readInvitationStatus(f.owner,'target',f.db.executor);if(status.state!=='ready')throw Error('status');
 return {action:'ISSUE' as const,operationId:randomUUID(),expectedEmployeeVersion:status.employeeVersion,expectedInvitationRevision:0};
}
const beforeCases=[
 {name:'target contact',lock:"SELECT id FROM employees WHERE id='target' FOR UPDATE",change:"UPDATE employees SET email='changed@example.invalid',updated_at=clock_timestamp() WHERE id='target'",want:'conflict'},
 {name:'target deactivation',lock:"SELECT id FROM employees WHERE id='target' FOR UPDATE",change:"UPDATE employees SET active=false,updated_at=clock_timestamp() WHERE id='target'",want:'conflict'},
 {name:'credential creation',lock:"SELECT id FROM employees WHERE id='target' FOR UPDATE",change:"INSERT INTO employee_credentials(employee_id,password_hash) VALUES('target','fictional-local-only')",want:'invalid'},
 {name:'issuer role loss',lock:"SELECT id FROM employees WHERE id='owner' FOR UPDATE",change:"UPDATE employees SET role='EMPLOYEE' WHERE id='owner'",want:'unavailable'},
 {name:'issuer session expiry',lock:"SELECT token_hash FROM employee_sessions WHERE employee_id='owner' FOR UPDATE",change:"UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE employee_id='owner'",want:'unavailable'},
] as const;
it.each(beforeCases)('issuance waiting behind $name rechecks after the lock and leaves no side effects',async test=>{
 const f=await companyAccessFixture(),client=new Client({connectionString:f.db.connectionString,statement_timeout:5000});let sent=0;
 try{
  const issue=await command(f);await client.connect();await client.query('BEGIN');await client.query(test.lock);
  const pending=issueOrRevokeInvitation(f.owner,'target',issue,{async send(){sent++;return {providerAccepted:true};}},f.db.executor);
  await blocked(f,test.name==='issuer session expiry'?'%SELECT token_hash FROM employee_sessions%':'%SELECT id FROM employees WHERE id=ANY%');
  await client.query(test.change);await client.query('COMMIT');
  expect((await pending).state).toBe(test.want);expect(sent).toBe(0);
  for(const table of ['company_invitations','company_access_operations','company_invitation_events','company_invitation_issue_counters'])expect(await f.q(`SELECT count(*)::integer AS count FROM ${table}`)).toEqual([{count:0}]);
 }finally{await client.query('ROLLBACK').catch(()=>{});await client.end().catch(()=>{});await f.db.dispose();}
});
async function receiptBarrier(f:Fixture,client:Client){
 await client.connect();await client.query('SELECT pg_advisory_lock(321004)');
 await f.q(`CREATE FUNCTION test_owned_invitation_receipt_wait() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_advisory_xact_lock(321004);RETURN NEW;END $$;
 CREATE TRIGGER test_owned_invitation_receipt_wait BEFORE INSERT ON company_access_operations FOR EACH ROW EXECUTE FUNCTION test_owned_invitation_receipt_wait()`);
}
it('Owner wall-clock expiry after the last blocking write rolls back invitation, counters, events and receipt',async()=>{
 const f=await companyAccessFixture(),client=new Client({connectionString:f.db.connectionString,statement_timeout:5000});let sent=0;
 try{
  const issue=await command(f);await receiptBarrier(f,client);
  await f.q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '1 second' WHERE employee_id='owner'");
  const pending=issueOrRevokeInvitation(f.owner,'target',issue,{async send(){sent++;return {providerAccepted:true};}},f.db.executor);
  await blocked(f,'%INSERT INTO company_access_operations%');
  let expired=false;const until=Date.now()+2500;
  while(!expired&&Date.now()<until){
   [expired]=await f.q<{expired:boolean}>("SELECT expires_at<=clock_timestamp() AS expired FROM employee_sessions WHERE employee_id='owner'").then(rows=>rows.map(row=>row.expired));
   if(!expired)await new Promise(resolve=>setTimeout(resolve,20));
  }
  expect(expired).toBe(true);await client.query('SELECT pg_advisory_unlock(321004)');
  expect((await pending).state).toBe('unavailable');expect(sent).toBe(0);
  for(const table of ['company_invitations','company_access_operations','company_invitation_events','company_invitation_issue_counters'])expect(await f.q(`SELECT count(*)::integer AS count FROM ${table}`)).toEqual([{count:0}]);
 }finally{await client.query('SELECT pg_advisory_unlock_all()').catch(()=>{});await client.end().catch(()=>{});await f.db.dispose();}
});
it.each(beforeCases.slice(0,3))('issuance that owns the locks commits before a waiting $name change and later status invalidates its proof',async test=>{
 const f=await companyAccessFixture(),barrier=new Client({connectionString:f.db.connectionString,statement_timeout:5000}),writer=new Client({connectionString:f.db.connectionString,statement_timeout:5000});
 try{
  const issue=await command(f);await receiptBarrier(f,barrier);await writer.connect();
  const pending=issueOrRevokeInvitation(f.owner,'target',issue,{async send(){return {providerAccepted:true};}},f.db.executor);
  await blocked(f,'%INSERT INTO company_access_operations%');
  const changing=writer.query(test.change);
  await blocked(f,test.name==='credential creation'?'%INSERT INTO employee_credentials%':'%UPDATE employees SET%');
  await barrier.query('SELECT pg_advisory_unlock(321004)');
  expect((await pending).state).toBe('saved');await changing;
  const status=await readInvitationStatus(f.owner,'target',f.db.executor);if(status.state!=='ready')throw Error('status');
  expect(status.invitation?.state).toBe('INVALIDATED');
  expect(await f.q('SELECT count(*)::integer AS count FROM company_access_operations')).toEqual([{count:1}]);
 }finally{await barrier.query('SELECT pg_advisory_unlock_all()').catch(()=>{});await barrier.end().catch(()=>{});await writer.end().catch(()=>{});await f.db.dispose();}
});
