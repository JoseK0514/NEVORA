import {it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {companyAccessFixture} from './company-access-fixture';
import {issued} from './company-access-claim.test-support';
import {invitationEmailFingerprint} from '../../lib/auth/invitations/service.server';
import {clearTerminalInvitationDigests} from '../../lib/auth/invitations/claim.server';
vi.mock('server-only',()=>({}));
it('digest maintenance clears deterministic capped batches while preserving recent/current custody, metadata, events and all counters',async()=>{
 const f=await companyAccessFixture();try{
  await f.q(`INSERT INTO company_invitations(workspace_id,id,employee_id,revision,target_version,email_fingerprint,issuer_employee_id,issuer_generation,proof_digest,issued_at,expires_at,retired_at,retired_reason)
   SELECT 'workspace-fuel',gen_random_uuid(),'target',n,e.updated_at::text,$1,'owner',1,encode(sha256(convert_to('owned-expired-digest-'||n,'UTF8')),'hex'),
    statement_timestamp()-interval '50 hours',statement_timestamp()-interval '49 hours 50 minutes',statement_timestamp()-interval '49 hours 45 minutes','EXPIRED'
   FROM generate_series(1,250)n CROSS JOIN employees e WHERE e.id='target'`,[invitationEmailFingerprint('target@example.invalid')]);
  const current=await issued(f),recentConsumed=randomUUID(),recentRetired=randomUUID();
  await f.q(`INSERT INTO company_invitations(workspace_id,id,employee_id,revision,target_version,email_fingerprint,issuer_employee_id,issuer_generation,proof_digest,issued_at,expires_at,consumed_at,retired_at,retired_reason)
   SELECT 'workspace-fuel',$1::uuid,'target',252,updated_at::text,$3,'owner',1,encode(sha256(convert_to('owned-recent-consumed','UTF8')),'hex'),
    statement_timestamp()-interval '2 hours',statement_timestamp()-interval '1 hour 50 minutes',statement_timestamp()-interval '1 hour 55 minutes',NULL,NULL FROM employees WHERE id='target'
   UNION ALL SELECT 'workspace-fuel',$2::uuid,'target',253,updated_at::text,$3,'owner',1,encode(sha256(convert_to('owned-recent-retired','UTF8')),'hex'),
    statement_timestamp()-interval '2 hours',statement_timestamp()-interval '1 hour 50 minutes',NULL,statement_timestamp()-interval '1 hour 45 minutes','REVOKED' FROM employees WHERE id='target'`,[recentConsumed,recentRetired,invitationEmailFingerprint('target@example.invalid')]);
  await f.q("INSERT INTO company_invitation_events(workspace_id,id,invitation_id,action,actor_employee_id) SELECT workspace_id,gen_random_uuid(),id,'EXPIRE','owner' FROM company_invitations WHERE revision<=250");
  await f.q("INSERT INTO company_invitation_claim_counters SELECT workspace_id,id,date_bin(interval '15 minutes',clock_timestamp(),timestamptz '2000-01-01')-interval '48 hours',2 FROM company_invitations WHERE revision IN(1,252)");
  const metadata=await f.q("SELECT to_jsonb(i)-'proof_digest' AS value FROM company_invitations i ORDER BY revision");
  const events=await f.q('SELECT to_jsonb(e) AS value FROM company_invitation_events e ORDER BY id');
  const receipts=await f.q('SELECT to_jsonb(o) AS value FROM company_access_operations o ORDER BY operation_id');
  const counters=await f.q('SELECT * FROM company_invitation_claim_counters ORDER BY invitation_id,bucket_start');
  const eligible=await f.q<{id:string}>("SELECT id::text FROM company_invitations WHERE revision<=250 ORDER BY COALESCE(consumed_at,retired_at,expires_at),workspace_id,id");
  let cleared=0;
  for(const count of [100,100,50]){
   expect(await clearTerminalInvitationDigests(f.db.executor)).toBe(count);cleared+=count;
   const actual=await f.q<{id:string}>("SELECT id::text FROM company_invitations WHERE proof_digest IS NULL ORDER BY COALESCE(consumed_at,retired_at,expires_at),workspace_id,id");
   expect(actual).toEqual(eligible.slice(0,cleared));
   expect(await f.q("SELECT count(*)::integer AS count FROM company_invitations WHERE revision<=250 AND proof_digest IS NOT NULL")).toEqual([{count:250-cleared}]);
  }
  expect(await clearTerminalInvitationDigests(f.db.executor)).toBe(0);
  expect(await f.q("SELECT count(*)::integer AS count FROM company_invitations WHERE id=ANY($1::uuid[]) AND proof_digest IS NOT NULL",[[current.receipt.invitationId,recentConsumed,recentRetired]])).toEqual([{count:3}]);
  expect(await f.q("SELECT to_jsonb(i)-'proof_digest' AS value FROM company_invitations i ORDER BY revision")).toEqual(metadata);
  expect(await f.q('SELECT to_jsonb(e) AS value FROM company_invitation_events e ORDER BY id')).toEqual(events);
  expect(await f.q('SELECT to_jsonb(o) AS value FROM company_access_operations o ORDER BY operation_id')).toEqual(receipts);
  expect(await f.q('SELECT * FROM company_invitation_claim_counters ORDER BY invitation_id,bucket_start')).toEqual(counters);
 }finally{await f.db.dispose();}
});
