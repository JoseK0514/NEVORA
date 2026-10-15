import {it,expect,vi} from 'vitest';
import {randomBytes} from 'node:crypto';
import {companyAccessFixture} from './company-access-fixture';
import {issued,ownedPassword,type ClaimFixture} from './company-access-claim.test-support';
import * as passwords from '../../lib/auth/password';
import {claimInvitation} from '../../lib/auth/invitations/claim.server';
vi.mock('server-only',()=>({}));
async function another(f:ClaimFixture,id:string){
 await f.q("INSERT INTO employees(id,first_name,last_name,phone,email,role,primary_location_id) VALUES($1,'Fictional','QA','555009',$2,'EMPLOYEE','loc-1')",[id,id+'@example.invalid']);return issued(f,id);
}
async function until(predicate:()=>boolean){const end=Date.now()+4000;while(!predicate()&&Date.now()<end)await new Promise(r=>setTimeout(r,5));expect(predicate()).toBe(true);}
it('four live password derivations have zero queued waiters; unknown proofs stay cheap and aborted work releases its slot after settling',async()=>{
 const f=await companyAccessFixture(),original=passwords.hashPassword,gates:(()=>void)[]=[],pending:Promise<unknown>[]=[];
 const hash=vi.spyOn(passwords,'hashPassword').mockImplementation(async value=>{await new Promise<void>(resolve=>gates.push(resolve));return original(value);});
 try{
  const invitations=[await issued(f)];for(let i=1;i<5;i++)invitations.push(await another(f,'slot-'+i));
  const abort=new AbortController();
  pending.push(...invitations.slice(0,4).map((invite,i)=>claimInvitation(invite.proof,ownedPassword,f.db.executor,i===0?abort.signal:undefined)));
  await until(()=>gates.length===4);
  expect(await claimInvitation(invitations[4].proof,ownedPassword,f.db.executor)).toEqual({state:'unavailable'});
  expect(await claimInvitation(randomBytes(32).toString('base64url'),ownedPassword,f.db.executor)).toEqual({state:'invalid'});
  expect(hash).toHaveBeenCalledTimes(4);
  expect(await f.q('SELECT attempts FROM company_invitation_claim_counters WHERE invitation_id=$1',[invitations[4].receipt.invitationId])).toEqual([]);
  abort.abort();for(const release of gates)release();const results=await Promise.all(pending);
  expect(results[0]).toEqual({state:'invalid'});expect(results.slice(1).every(r=>!!r&&typeof r==='object'&&'state'in r&&r.state==='activated')).toBe(true);
  expect(await f.q("SELECT employee_id FROM employee_credentials WHERE employee_id='target'")).toEqual([]);
  hash.mockRestore();
  expect((await claimInvitation(invitations[4].proof,ownedPassword,f.db.executor)).state).toBe('activated');
 }finally{for(const release of gates)release();await Promise.allSettled(pending);hash.mockRestore();await f.db.dispose();}
});
it('hash and SQL failures release work slots and never claim a credential commit',async()=>{
 const f=await companyAccessFixture(),hash=vi.spyOn(passwords,'hashPassword');try{
  const invite=await issued(f);hash.mockRejectedValueOnce(Error('Owned hash failure'));
  expect(await claimInvitation(invite.proof,ownedPassword,f.db.executor)).toEqual({state:'unavailable'});
  const actual=f.db.executor,failed={...actual,async transaction(statements:Parameters<typeof actual.transaction>[0]){
   if(statements.some(s=>s.text.startsWith('INSERT INTO employee_credentials')))throw Object.assign(Error('Owned rollback'),{code:'P0001'});return actual.transaction(statements);
  }};
  expect(await claimInvitation(invite.proof,ownedPassword,failed)).toEqual({state:'unavailable'});
  expect(await f.q("SELECT * FROM employee_credentials WHERE employee_id='target'")).toEqual([]);
  expect(await claimInvitation(invite.proof,ownedPassword,f.db.executor)).toEqual({state:'activated',employeeId:'target'});
 }finally{hash.mockRestore();await f.db.dispose();}
});
it('near-limit concurrent admission saturates at ten and permits only the two remaining derivations',async()=>{
 const f=await companyAccessFixture(),original=passwords.hashPassword,gates:(()=>void)[]=[],pending:Promise<unknown>[]=[];
 const hash=vi.spyOn(passwords,'hashPassword').mockImplementation(async value=>{await new Promise<void>(resolve=>gates.push(resolve));return original(value);});
 try{
  const invite=await issued(f);
  await f.q("INSERT INTO company_invitation_claim_counters VALUES('workspace-fuel',$1,date_bin(interval '15 minutes',clock_timestamp(),timestamptz '2000-01-01'),8)",[invite.receipt.invitationId]);
  pending.push(...Array.from({length:4},()=>claimInvitation(invite.proof,ownedPassword,f.db.executor)));
  await until(()=>gates.length===2);expect(await f.q('SELECT attempts FROM company_invitation_claim_counters')).toEqual([{attempts:10}]);
  for(const release of gates)release();const results=await Promise.all(pending);
  expect(results.filter(r=>!!r&&typeof r==='object'&&'state'in r&&r.state==='activated')).toHaveLength(1);
  expect(results.filter(r=>!!r&&typeof r==='object'&&'state'in r&&r.state==='invalid')).toHaveLength(3);
  expect(hash).toHaveBeenCalledTimes(2);expect(await f.q("SELECT count(*)::integer AS count FROM company_invitation_events WHERE action='CONSUME'")).toEqual([{count:1}]);
 }finally{for(const release of gates)release();await Promise.allSettled(pending);hash.mockRestore();await f.db.dispose();}
});
it('exhausted live proof pressure cannot consume a fresh invitation budget or derive passwords',async()=>{
 const f=await companyAccessFixture(),hash=vi.spyOn(passwords,'hashPassword');try{
  const exhausted=await issued(f),fresh=await another(f,'fresh-budget');
  await f.q("INSERT INTO company_invitation_claim_counters VALUES('workspace-fuel',$1,date_bin(interval '15 minutes',clock_timestamp(),timestamptz '2000-01-01'),10)",[exhausted.receipt.invitationId]);
  for(let n=0;n<100;n++)expect(await claimInvitation(exhausted.proof,ownedPassword,f.db.executor)).toEqual({state:'invalid'});
  expect(hash).not.toHaveBeenCalled();expect(await f.q('SELECT attempts FROM company_invitation_claim_counters WHERE invitation_id=$1',[fresh.receipt.invitationId])).toEqual([]);
  expect(await claimInvitation(fresh.proof,ownedPassword,f.db.executor)).toEqual({state:'activated',employeeId:'fresh-budget'});
  expect(await f.q('SELECT attempts FROM company_invitation_claim_counters WHERE invitation_id=$1',[exhausted.receipt.invitationId])).toEqual([{attempts:10}]);
 }finally{hash.mockRestore();await f.db.dispose();}
});
it('admission bounds its known invitation to 97 historic buckets and preserves other invitations counters',async()=>{
 const f=await companyAccessFixture();try{
  const invite=await issued(f),other=await another(f,'historic-counter');
  await f.q("INSERT INTO company_invitation_claim_counters SELECT 'workspace-fuel',$1,date_bin(interval '15 minutes',clock_timestamp(),timestamptz '2000-01-01')-n*interval '15 minutes',1 FROM generate_series(0,99)n",[invite.receipt.invitationId]);
  await f.q("INSERT INTO company_invitation_claim_counters SELECT 'workspace-fuel',$1,date_bin(interval '15 minutes',clock_timestamp(),timestamptz '2000-01-01')-n*interval '15 minutes',1 FROM generate_series(97,99)n",[other.receipt.invitationId]);
  const unrelated=await f.q('SELECT * FROM company_invitation_claim_counters WHERE invitation_id=$1 ORDER BY bucket_start',[other.receipt.invitationId]);
  expect((await claimInvitation(invite.proof,ownedPassword,f.db.executor)).state).toBe('activated');
  expect(await f.q('SELECT count(*)::integer AS count FROM company_invitation_claim_counters WHERE invitation_id=$1',[invite.receipt.invitationId])).toEqual([{count:97}]);
  expect(await f.q('SELECT * FROM company_invitation_claim_counters WHERE invitation_id=$1 ORDER BY bucket_start',[other.receipt.invitationId])).toEqual(unrelated);
  expect(await f.q('SELECT count(*)::integer AS count FROM company_invitation_claim_counters')).toEqual([{count:100}]);
 }finally{await f.db.dispose();}
});
it('lost commit acknowledgement returns no identity and replay cannot consume twice',async()=>{
 const f=await companyAccessFixture();try{
  const invite=await issued(f),actual=f.db.executor;
  const unknown={...actual,async transaction(statements:Parameters<typeof actual.transaction>[0]){
   const rows=await actual.transaction(statements);if(statements.some(s=>s.text.startsWith('INSERT INTO employee_credentials')))throw Error('Owned lost acknowledgement');return rows;
  }};
  expect(await claimInvitation(invite.proof,ownedPassword,unknown)).toEqual({state:'outcome_unknown'});
  expect(await claimInvitation(invite.proof,ownedPassword,actual)).toEqual({state:'invalid'});
  expect(await f.q("SELECT count(*)::integer AS count FROM employee_credentials WHERE employee_id='target'")).toEqual([{count:1}]);
  expect(await f.q("SELECT count(*)::integer AS count FROM company_invitation_events WHERE action='CONSUME'")).toEqual([{count:1}]);
 }finally{await f.db.dispose();}
});
