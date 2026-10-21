import {it,expect,vi} from 'vitest';
import {randomBytes,randomUUID} from 'node:crypto';
import {createServer} from 'node:http';
import type {SqlExecutor} from '../../lib/notifications/types';
import {companyAccessFixture} from './company-access-fixture';
import {issued,ownedPassword} from './company-access-claim.test-support';
import * as passwords from '../../lib/auth/password';
import {issueOrRevokeInvitation,readInvitationStatus,invitationProofDigest,invitationEmailFingerprint} from '../../lib/auth/invitations/service.server';
import {requestPasswordRecovery} from '../../lib/auth/recovery.server';
const context=vi.hoisted(()=>({executor:null as SqlExecutor|null}));
vi.mock('server-only',()=>({}));
vi.mock('../../lib/data/notification-transactions',async importOriginal=>({...await importOriginal<typeof import('../../lib/data/notification-transactions')>(),neonNotificationExecutor:()=>{if(!context.executor)throw Error('No owned executor');return context.executor;}}));
import {claimInvitation,clearTerminalInvitationDigests} from '../../lib/auth/invitations/claim.server';
import {activateEmployeeCredential} from '../../lib/data/employees';
import {POST} from '../../app/api/auth/activate/route';
const req=(value:unknown,headers:Record<string,string>={},query='')=>new Request('http://127.0.0.1/api/auth/activate'+query,{method:'POST',headers:{origin:'http://127.0.0.1','content-type':'application/json','x-nevora-activation':'1',...headers},body:JSON.stringify(value)});
it('live registered-email possession creates one hashed credential, consumes once and discloses only own login ID on known success',async()=>{
 const f=await companyAccessFixture();try{
  const invite=await issued(f);
  expect(await claimInvitation(invite.proof,ownedPassword,f.db.executor)).toEqual({state:'activated',employeeId:'target'});
  expect(await claimInvitation(invite.proof,ownedPassword,f.db.executor)).toEqual({state:'invalid'});
  const [credential]=await f.q<{password_hash:string}>("SELECT password_hash FROM employee_credentials WHERE employee_id='target'");
  expect(await passwords.verifyPassword(ownedPassword,credential.password_hash)).toBe(true);
  expect(await f.q("SELECT count(*)::integer AS count FROM company_invitation_events WHERE action='CONSUME'")).toEqual([{count:1}]);
  expect(await f.q("SELECT employee_id FROM employee_sessions WHERE employee_id='target'")).toEqual([]);
  const persisted=JSON.stringify(await f.q("SELECT to_jsonb(i) AS row FROM company_invitations i"));
  expect(persisted.includes(invite.proof)).toBe(false);expect(persisted.includes(ownedPassword)).toBe(false);
 }finally{await f.db.dispose();}
});
it.each(['revoke','reissue','contact','inactive','credential','issuer_role_cycle','issuer_inactive','workspace_inactive'] as const)('unusable %s proof is generic invalid before counters or password derivation',async kind=>{
 const f=await companyAccessFixture(),hash=vi.spyOn(passwords,'hashPassword');try{
  const invite=await issued(f);
  if(kind==='revoke')expect((await issueOrRevokeInvitation(f.owner,'target',{action:'REVOKE',operationId:randomUUID(),invitationId:invite.receipt.invitationId,expectedInvitationRevision:invite.receipt.revision},null,f.db.executor)).state).toBe('saved');
  if(kind==='reissue')await issued(f);
  if(kind==='contact')await f.q("UPDATE employees SET email='changed@example.invalid',updated_at=clock_timestamp() WHERE id='target'");
  if(kind==='inactive')await f.q("UPDATE employees SET active=false WHERE id='target'");
  if(kind==='credential')await f.q("INSERT INTO employee_credentials(employee_id,password_hash) VALUES('target','owned-existing-hash')");
  if(kind==='issuer_role_cycle')await f.q("UPDATE employees SET role='EMPLOYEE' WHERE id='owner';UPDATE employees SET role='OWNER' WHERE id='owner'");
  if(kind==='issuer_inactive')await f.q("UPDATE employees SET active=false WHERE id='owner'");
  if(kind==='workspace_inactive')await f.q("UPDATE workspaces SET active=false WHERE singleton");
  expect(await claimInvitation(invite.proof,ownedPassword,f.db.executor)).toEqual({state:'invalid'});
  expect(hash).not.toHaveBeenCalled();expect(await f.q('SELECT * FROM company_invitation_claim_counters')).toEqual([]);
  expect(await f.q("SELECT * FROM company_invitation_events WHERE action='CONSUME'")).toEqual([]);
 }finally{hash.mockRestore();await f.db.dispose();}
});
it('legacy ID+phone helper cannot initialize credentials and credentialed recovery cannot initialize an uncredentialed target',async()=>{
 const f=await companyAccessFixture();context.executor=f.db.executor;try{
  expect(await activateEmployeeCredential({employeeId:'target',phone:'555003',passwordHash:'owned-legacy-hash'})).toBeNull();
  let sent=0;await requestPasswordRecovery('target','target@example.invalid',{async send(){sent++;}},f.db.executor);
  expect(sent).toBe(0);expect(await f.q("SELECT employee_id FROM employee_credentials WHERE employee_id='target'")).toEqual([]);
  expect(await f.q('SELECT employee_id FROM password_recovery_proofs')).toEqual([]);
 }finally{context.executor=null;await f.db.dispose();}
});
it('strict bounded public JSON rejects identity/phone/query/transport overrides without allocation or identity disclosure',async()=>{
 const f=await companyAccessFixture();context.executor=f.db.executor;const hash=vi.spyOn(passwords,'hashPassword');try{
  const proof=randomBytes(32).toString('base64url');
  const cases=[
   req({employeeId:'target',phone:'555003',password:ownedPassword}),
   req({proof,password:ownedPassword,employeeId:'target'}),
   req({proof,password:ownedPassword},{},'?employeeId=target'),
   req({proof,password:ownedPassword},{origin:'http://other.invalid'}),
   req({proof,password:ownedPassword},{'x-nevora-activation':''}),
   req({proof,password:ownedPassword},{'sec-fetch-site':'cross-site'}),
   req({proof,password:'x'.repeat(8193)}),
   new Request('http://127.0.0.1/api/auth/activate',{method:'POST',headers:{origin:'http://127.0.0.1','content-type':'application/json','x-nevora-activation':'1'},body:'{'}),
  ];
  for(const request of cases){const response=await POST(request);expect(response.ok).toBe(false);expect(await response.json()).toEqual({state:'invalid'});expect(response.headers.get('Cache-Control')).toContain('no-store');expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');expect(response.headers.has('Set-Cookie')).toBe(false);}
  expect(hash).not.toHaveBeenCalled();expect(await f.q('SELECT * FROM company_invitation_claim_counters')).toEqual([]);
 }finally{hash.mockRestore();context.executor=null;await f.db.dispose();}
});
it('expired custody is invalid and terminal digests clear only after the 24-hour grace',async()=>{
 const f=await companyAccessFixture();try{
  const proof=randomBytes(32).toString('base64url'),id=randomUUID();
  await f.q(`WITH observed AS MATERIALIZED(SELECT clock_timestamp() AS at)
   INSERT INTO company_invitations(workspace_id,id,employee_id,revision,target_version,email_fingerprint,issuer_employee_id,issuer_generation,proof_digest,issued_at,expires_at)
   SELECT 'workspace-fuel',$1,'target',1,updated_at::text,$2,'owner',1,$3,observed.at-interval '25 hours 15 minutes',observed.at-interval '25 hours' FROM employees CROSS JOIN observed WHERE id='target'`,[id,invitationEmailFingerprint('target@example.invalid'),invitationProofDigest(proof)]);
  expect(await f.q("SELECT expires_at-issued_at=interval '15 minutes' AS exact_lifetime FROM company_invitations WHERE id=$1",[id])).toEqual([{exact_lifetime:true}]);
  expect(await claimInvitation(proof,ownedPassword,f.db.executor)).toEqual({state:'invalid'});
  expect(await clearTerminalInvitationDigests(f.db.executor)).toBe(1);
  expect(await f.q('SELECT proof_digest FROM company_invitations WHERE id=$1',[id])).toEqual([{proof_digest:null}]);
  await f.q("UPDATE company_invitations SET retired_at=clock_timestamp(),retired_reason='EXPIRED' WHERE id=$1",[id]);
  const fresh=await issued(f);await claimInvitation(fresh.proof,ownedPassword,f.db.executor);
  expect(await clearTerminalInvitationDigests(f.db.executor)).toBe(0);
  expect(await f.q('SELECT proof_digest IS NOT NULL AS retained FROM company_invitations WHERE id=$1',[fresh.receipt.invitationId])).toEqual([{retained:true}]);
 }finally{await f.db.dispose();}
});
it('5000 unknown actual loopback HTTP claims allocate no counters or hash work and leave a valid invitation usable',async()=>{
 const f=await companyAccessFixture();context.executor=f.db.executor;let url='';
 const server=createServer(async(request,response)=>{
  try{
   const chunks:Buffer[]=[];for await(const chunk of request)chunks.push(Buffer.from(chunk));
   const headers=new Headers();for(const [key,value]of Object.entries(request.headers)){if(typeof value==='string')headers.set(key,value);}
   const result=await POST(new Request(url+'/api/auth/activate',{method:'POST',headers,body:Buffer.concat(chunks)}));
   response.writeHead(result.status,Object.fromEntries(result.headers));response.end(Buffer.from(await result.arrayBuffer()));
  }catch{response.writeHead(503,{'Cache-Control':'no-store'});response.end('{"state":"unavailable"}');}
 });
 const hash=vi.spyOn(passwords,'hashPassword');try{
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();if(!address||typeof address==='string')throw Error('Owned loopback');url='http://127.0.0.1:'+address.port;
  const valid=await issued(f),before=await f.q('SELECT * FROM company_invitation_claim_counters');
  for(let n=0;n<5000;n+=25){
   const responses=await Promise.all(Array.from({length:25},()=>fetch(url+'/api/auth/activate',{method:'POST',headers:{origin:url,'content-type':'application/json','x-nevora-activation':'1'},body:JSON.stringify({proof:randomBytes(32).toString('base64url'),password:ownedPassword})})));
   for(const response of responses){expect(response.status).toBe(400);expect(await response.json()).toEqual({state:'invalid'});}
  }
  expect(hash).not.toHaveBeenCalled();expect(await f.q('SELECT * FROM company_invitation_claim_counters')).toEqual(before);
  expect(await f.q("SELECT * FROM company_invitation_events WHERE action='CONSUME'")).toEqual([]);
  await f.q("INSERT INTO employees(id,first_name,last_name,phone,email,role,primary_location_id) VALUES('exhausted-http','Fictional','QA','555008','exhausted@example.invalid','EMPLOYEE','loc-1')");
  const exhausted=await issued(f,'exhausted-http');
  await f.q("INSERT INTO company_invitation_claim_counters VALUES('workspace-fuel',$1,date_bin(interval '15 minutes',clock_timestamp(),timestamptz '2000-01-01'),10)",[exhausted.receipt.invitationId]);
  for(let n=0;n<100;n++){
   const response=await fetch(url+'/api/auth/activate',{method:'POST',headers:{origin:url,'content-type':'application/json','x-nevora-activation':'1'},body:JSON.stringify({proof:exhausted.proof,password:ownedPassword})});
   expect(response.status).toBe(400);expect(await response.json()).toEqual({state:'invalid'});
  }
  expect(hash).not.toHaveBeenCalled();expect(await f.q('SELECT attempts FROM company_invitation_claim_counters WHERE invitation_id=$1',[valid.receipt.invitationId])).toEqual([]);
  const response=await fetch(url+'/api/auth/activate',{method:'POST',headers:{origin:url,'content-type':'application/json','x-nevora-activation':'1'},body:JSON.stringify({proof:valid.proof,password:ownedPassword})});
  expect(response.status).toBe(200);expect(await response.json()).toEqual({state:'activated',employeeId:'target'});expect(hash).toHaveBeenCalledTimes(1);
  expect(await f.q('SELECT attempts FROM company_invitation_claim_counters WHERE invitation_id=$1',[valid.receipt.invitationId])).toEqual([{attempts:1}]);
  expect(await f.q('SELECT attempts FROM company_invitation_claim_counters WHERE invitation_id=$1',[exhausted.receipt.invitationId])).toEqual([{attempts:10}]);
  expect(await f.q('SELECT count(*)::integer AS count FROM company_invitation_claim_counters')).toEqual([{count:2}]);
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));hash.mockRestore();context.executor=null;await f.db.dispose();}
},120000);
