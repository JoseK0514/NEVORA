import 'server-only';
import type {ControlStore} from './control-store.server';
import type {EnabledConfig} from './config.server';
/** Bounded private maintenance: retire ephemeral bearer ciphertext and old
 * admission counters, preserving operation tombstones and business provenance.
 * No resource deletion, identity adoption or uncertain-delivery retry. */
export async function cleanupOnboardingControl(store:ControlStore,config:EnabledConfig):Promise<{retiredCiphertexts:number;retiredVerifications:number;removedCounters:number}>{
 return store.transaction(async client=>{
  const deliveries=await client.query(`WITH old AS(SELECT d.operation_id FROM nevora_onboarding.verification_deliveries d JOIN nevora_onboarding.registration_requests q ON q.operation_id=d.operation_id JOIN nevora_onboarding.registrations r ON r.id=q.registration_id WHERE r.environment=$1 AND d.payload_ciphertext IS NOT NULL AND d.expires_at<=clock_timestamp()-interval '24 hours' ORDER BY d.expires_at LIMIT 100 FOR UPDATE OF d SKIP LOCKED)
   UPDATE nevora_onboarding.verification_deliveries d SET payload_ciphertext=NULL,delivery_state=CASE WHEN d.delivery_state='SENDING' THEN 'UNKNOWN' WHEN d.delivery_state='PREPARED' THEN 'FAILED' ELSE d.delivery_state END,completed_at=COALESCE(d.completed_at,clock_timestamp()) FROM old WHERE d.operation_id=old.operation_id RETURNING d.operation_id`,[config.environment]);
  const claims=await client.query(`WITH old AS(SELECT c.operation_id FROM nevora_onboarding.verification_claim_receipts c JOIN nevora_onboarding.registrations r ON r.id=c.registration_id WHERE r.environment=$1 AND c.session_ciphertext IS NOT NULL AND c.expires_at<=clock_timestamp()-interval '24 hours' ORDER BY c.expires_at LIMIT 100 FOR UPDATE OF c SKIP LOCKED)
   UPDATE nevora_onboarding.verification_claim_receipts c SET session_ciphertext=NULL FROM old WHERE c.operation_id=old.operation_id RETURNING c.operation_id`,[config.environment]);
  const grants=await client.query(`WITH old AS(SELECT g.operation_id FROM nevora_onboarding.owner_grant_requests g JOIN nevora_onboarding.registrations r ON r.id=g.registration_id WHERE r.environment=$1 AND g.token_ciphertext<>'' AND g.expires_at<=clock_timestamp()-interval '24 hours' ORDER BY g.expires_at LIMIT 100 FOR UPDATE OF g SKIP LOCKED)
   UPDATE nevora_onboarding.owner_grant_requests g SET state=CASE WHEN g.state IN('QUEUED','READY') THEN 'EXPIRED' ELSE g.state END,token_ciphertext='' FROM old WHERE g.operation_id=old.operation_id RETURNING g.operation_id`,[config.environment]);
  const verifications=await client.query(`WITH old AS(SELECT id FROM nevora_onboarding.registrations WHERE environment=$1 AND verification_digest IS NOT NULL AND verification_expires_at<=clock_timestamp()-interval '24 hours' ORDER BY verification_expires_at LIMIT 100 FOR UPDATE SKIP LOCKED)
   UPDATE nevora_onboarding.registrations r SET verification_digest=NULL,verification_retired_at=COALESCE(verification_retired_at,clock_timestamp()),version=version+1 FROM old WHERE r.id=old.id RETURNING r.id`,[config.environment]);
  const counters=await client.query(`WITH old AS(SELECT environment,kind,subject_digest,bucket_start FROM nevora_onboarding.admission_counters WHERE environment=$1 AND bucket_start<clock_timestamp()-interval '24 hours' ORDER BY bucket_start LIMIT 100)
   DELETE FROM nevora_onboarding.admission_counters c USING old WHERE(c.environment,c.kind,c.subject_digest,c.bucket_start)=(old.environment,old.kind,old.subject_digest,old.bucket_start) RETURNING c.environment`,[config.environment]);
  return {retiredCiphertexts:(deliveries.rowCount??0)+(claims.rowCount??0)+(grants.rowCount??0),retiredVerifications:verifications.rowCount??0,removedCounters:counters.rowCount??0};
 });
}
