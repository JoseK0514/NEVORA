import 'server-only';
import type {DeliveryClaim, DeliveryCompletion, NotificationIntent, SqlExecutor} from '../notifications/types';
import type {NativeEnvironment, NativeMaterialBinding} from '../native-push/types';
import {parseNativeMaterialBinding} from '../native-push/protocol';
import {notificationOperationalAllowedSql} from './notification-operational-sql';
import {communicationIntentAllowedSql} from '../communications/sql';

export type NativeDeliveryClaim = Omit<DeliveryClaim, 'subscriptionId'> & {installationId: string};
export type NativeDeliveryInstallation = NativeMaterialBinding & {
  id: string; employeeId: string; encryptedMaterial: string; tokenRegisteredAt: string; consentAt: string;
};
type Options = {executor: SqlExecutor; origin: string; environment: NativeEnvironment};
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const iso = (value: unknown) => (value instanceof Date ? value : new Date(String(value))).toISOString();
const joins = `FROM notifications n JOIN native_push_installations i ON i.employee_id=n.employee_id AND i.environment=n.environment
  JOIN employees e ON e.id=i.employee_id JOIN workspaces w ON w.id=i.workspace_id`;
// Internal aliases and fixed parameter positions only. This is generic ownership
// admission, not a substitute for the canonical current business-source check.
const live = `i.origin=$1 AND i.environment=$2 AND i.status='active' AND e.active AND e.role IN ('EMPLOYEE','OWNER')
  AND w.singleton AND w.active AND n.environment=$2 AND n.cancelled_at IS NULL AND n.push_state NOT IN ('legacy','cancelled','expired')
  AND n.expires_at>clock_timestamp() AND n.source_kind<>'SELF_TEST' AND n.purpose<>'TEST' AND NOT n.management_alert_suppressed
  AND (n.purpose<>'SUMMARY' OR n.source_kind='MANAGER_SUMMARY')
  AND i.consent_at<=n.created_at AND ${notificationOperationalAllowedSql()}
  AND (n.source_kind<>'COMMUNICATION' OR ${communicationIntentAllowedSql()})
  AND EXISTS (SELECT 1 FROM employee_sessions s WHERE s.token_hash=i.session_hash AND s.employee_id=i.employee_id)`;
const missing = `NOT EXISTS (SELECT 1 FROM native_push_deliveries prior WHERE prior.notification_id=n.id AND prior.installation_id=i.id
  AND (prior.generation=i.generation OR NOT (prior.status='cancelled' AND COALESCE(prior.error_class,'')='registration_changed')))`;
function mappedClaim(row: Record<string, unknown>): NativeDeliveryClaim {
  const intent: NotificationIntent = {id: String(row.notification_id), employeeId: String(row.employee_id), type: String(row.type), title: String(row.title), body: String(row.body),
    actionHref: row.action_href ? String(row.action_href) : undefined, eventKey: String(row.event_key), environment: row.environment as NotificationIntent['environment'],
    source: {kind: row.source_kind as NotificationIntent['source']['kind'], id: String(row.source_id), version: String(row.source_version)},
    effectiveVersion: String(row.effective_version), purpose: row.purpose as NotificationIntent['purpose'], urgency: row.urgency as NotificationIntent['urgency'],
    dueAt: iso(row.due_at), expiresAt: iso(row.expires_at), itemKeys: Array.isArray(row.item_keys) ? row.item_keys as string[] : undefined};
  return {deliveryId: String(row.delivery_id), intentId: intent.id, installationId: String(row.installation_id), generation: String(row.generation),
    leaseToken: String(row.lease_token), leaseExpiresAt: iso(row.lease_expires_at), attemptCount: Number(row.attempt_count), intent};
}
function assertClaim(claim: NativeDeliveryClaim) {
  if (![claim.deliveryId, claim.installationId, claim.generation, claim.leaseToken].every(value => typeof value === 'string' && uuid.test(value))) throw Error('Invalid native delivery claim');
}
/** Native delivery state is independent of Web Push completion. Every update is
 * scope/generation/lease conditional; an expired or replaced worker grants no
 * permission to finish, invalidate or reschedule its replacement. */
export function sqlNativeDeliveryRepository({executor, origin, environment}: Options) {
  parseNativeMaterialBinding({origin, environment, platform: 'ios', provider: 'apns-sandbox', appId: 'com.nevora.validation', keyFingerprint: '0'.repeat(64), generation: '00000000-0000-4000-8000-000000000000'});
  const scope = [origin, environment];
  const identity = (claim: NativeDeliveryClaim) => {assertClaim(claim); return [...scope, claim.deliveryId, claim.installationId, claim.generation, claim.leaseToken];};
  const lease = `d.id=$3::uuid AND d.installation_id=$4::uuid AND d.generation=$5::uuid AND d.lease_token=$6::uuid
    AND d.status='processing' AND d.lease_expires_at>clock_timestamp()`;
  async function pendingIntentIds(limit: number): Promise<string[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 10) throw Error('Invalid native candidate limit');
    const rows = await executor.query<{id: string}>({text: `SELECT n.id FROM notifications n WHERE n.environment=$2 AND n.due_at<=clock_timestamp()
      AND EXISTS (SELECT 1 FROM native_push_installations i JOIN employees e ON e.id=i.employee_id JOIN workspaces w ON w.id=i.workspace_id
        WHERE i.employee_id=n.employee_id AND i.environment=n.environment AND ${live} AND ${missing})
      ORDER BY n.due_at,n.id LIMIT $3`, values: [...scope, limit]});
    return rows.map(row => row.id);
  }
  async function materialize(intentIds: readonly string[]): Promise<void> {
    if (!intentIds.length) return;
    if (intentIds.length > 10 || intentIds.some(id => typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id))) throw Error('Invalid native candidate IDs');
    await executor.query({text: `INSERT INTO native_push_deliveries(notification_id,installation_id,generation,next_attempt_at,expires_at)
      SELECT n.id,i.id,i.generation,n.due_at,n.expires_at ${joins}
      WHERE n.id=ANY($3::text[]) AND n.due_at<=clock_timestamp() AND ${live} AND ${missing}
      ON CONFLICT (notification_id,installation_id,generation) DO NOTHING`, values: [...scope, [...intentIds]]});
  }
  async function claim(input: {now: Date; limit: number; leaseSeconds: number; mode: 'new' | 'retry' | 'all'; recipientIds?: readonly string[]}): Promise<NativeDeliveryClaim[]> {
    if (!Number.isFinite(input.now.getTime()) || !Number.isInteger(input.limit) || input.limit < 1 || input.limit > 10 || input.leaseSeconds !== 120
      || !['new', 'retry', 'all'].includes(input.mode) || (input.recipientIds && (input.recipientIds.length > 32 || input.recipientIds.some(id => !/^[A-Za-z0-9_-]{1,128}$/.test(id))))) throw Error('Invalid native claim limits');
    const results = await executor.transaction([
      {text: `WITH stale AS (SELECT d.id FROM native_push_deliveries d JOIN native_push_installations i ON i.id=d.installation_id
        JOIN notifications n ON n.id=d.notification_id WHERE i.origin=$1 AND i.environment=$2 AND d.status IN ('queued','retry_pending','processing')
        AND (d.expires_at<=clock_timestamp() OR (d.attempt_count>=5 AND (d.status<>'processing' OR d.lease_expires_at<=clock_timestamp()))
          OR i.generation<>d.generation OR i.status<>'active' OR n.cancelled_at IS NOT NULL)
        ORDER BY d.id LIMIT 100 FOR UPDATE OF d SKIP LOCKED)
        UPDATE native_push_deliveries d SET status=CASE WHEN d.expires_at<=clock_timestamp() THEN 'expired'
          WHEN i.generation<>d.generation OR i.status<>'active' OR n.cancelled_at IS NOT NULL THEN 'cancelled' ELSE 'failed' END,
          error_class=CASE WHEN i.generation<>d.generation THEN 'registration_changed' WHEN i.status<>'active' THEN 'registration_revoked'
            WHEN n.cancelled_at IS NOT NULL THEN 'notification_cancelled' ELSE d.error_class END,
          lease_token=NULL,lease_expires_at=NULL,updated_at=clock_timestamp()
        FROM stale s,native_push_installations i,notifications n WHERE d.id=s.id AND i.id=d.installation_id AND n.id=d.notification_id`, values: scope},
      {text: `WITH candidates AS (SELECT d.id FROM native_push_deliveries d JOIN native_push_installations i ON i.id=d.installation_id
        JOIN notifications n ON n.id=d.notification_id JOIN employees e ON e.id=i.employee_id JOIN workspaces w ON w.id=i.workspace_id
        WHERE ${live} AND i.employee_id=n.employee_id AND i.environment=n.environment AND d.generation=i.generation
          AND d.expires_at>clock_timestamp() AND d.next_attempt_at<=clock_timestamp() AND d.attempt_count<5
          AND ($6::text[] IS NULL OR n.employee_id=ANY($6::text[]))
          AND (($5='new' AND d.status='queued') OR ($5='retry' AND (d.status='retry_pending' OR (d.status='processing' AND d.lease_expires_at<=clock_timestamp())))
            OR ($5='all' AND (d.status IN ('queued','retry_pending') OR (d.status='processing' AND d.lease_expires_at<=clock_timestamp()))))
        ORDER BY d.next_attempt_at,d.id LIMIT $3 FOR UPDATE OF d SKIP LOCKED), claimed AS (
        UPDATE native_push_deliveries d SET status='processing',attempt_count=attempt_count+1,lease_token=gen_random_uuid(),
          lease_expires_at=clock_timestamp()+$4::int*interval '1 second',updated_at=clock_timestamp()
        WHERE d.id IN (SELECT id FROM candidates) RETURNING d.*)
        SELECT c.id AS delivery_id,c.notification_id,c.installation_id,c.generation,c.lease_token,c.lease_expires_at,c.attempt_count,n.*
          FROM claimed c JOIN notifications n ON n.id=c.notification_id`, values: [...scope, input.limit, input.leaseSeconds, input.mode, input.recipientIds ? [...input.recipientIds] : null]},
    ]);
    return (results[1] as Record<string, unknown>[]).map(mappedClaim);
  }
  async function findForClaim(claim: NativeDeliveryClaim): Promise<NativeDeliveryInstallation | null> {
    const rows = await executor.query<Record<string, unknown>>({text: `SELECT i.* FROM native_push_deliveries d JOIN native_push_installations i ON i.id=d.installation_id
      JOIN notifications n ON n.id=d.notification_id JOIN employees e ON e.id=i.employee_id JOIN workspaces w ON w.id=i.workspace_id
      WHERE ${lease} AND ${live} AND i.generation=d.generation AND i.employee_id=n.employee_id AND i.environment=n.environment`, values: identity(claim)});
    const row = rows[0]; if (!row) return null;
    const binding = parseNativeMaterialBinding({origin: row.origin, environment: row.environment, platform: row.platform, provider: row.provider, appId: row.app_id, keyFingerprint: row.key_fingerprint, generation: row.generation});
    return {...binding, id: String(row.id), employeeId: String(row.employee_id), encryptedMaterial: String(row.encrypted_material), tokenRegisteredAt: iso(row.updated_at), consentAt: iso(row.consent_at)};
  }
  async function finish(claim: NativeDeliveryClaim, result: DeliveryCompletion): Promise<boolean> {
    if (!['provider_accepted', 'retry_pending', 'failed', 'expired', 'cancelled'].includes(result.state)
      || (result.state === 'retry_pending' && (!result.nextAttemptAt || !Number.isFinite(Date.parse(result.nextAttemptAt))))
      || (result.errorClass !== undefined && !/^[a-z][a-z0-9_]{0,63}$/.test(result.errorClass))) throw Error('Invalid native completion');
    const rows = await executor.query({text: `UPDATE native_push_deliveries d SET
      status=CASE WHEN $7='retry_pending' AND (d.attempt_count>=5 OR $8::timestamptz>=d.expires_at) THEN CASE WHEN d.attempt_count>=5 THEN 'failed' ELSE 'expired' END ELSE $7 END,
      next_attempt_at=CASE WHEN $7='retry_pending' AND d.attempt_count<5 AND $8::timestamptz<d.expires_at THEN $8::timestamptz ELSE d.next_attempt_at END,
      accepted_at=CASE WHEN $7='provider_accepted' THEN clock_timestamp() ELSE NULL END,error_class=$9,lease_token=NULL,lease_expires_at=NULL,updated_at=clock_timestamp()
      WHERE ${lease} AND ($7<>'retry_pending' OR $8::timestamptz>clock_timestamp())
      AND EXISTS (SELECT 1 FROM native_push_installations i WHERE i.id=d.installation_id AND i.origin=$1 AND i.environment=$2 AND i.generation=d.generation)
      AND ($7 IN ('cancelled','expired','failed') OR EXISTS (SELECT 1 ${joins} WHERE n.id=d.notification_id AND i.id=d.installation_id AND ${live} AND i.generation=d.generation))
      RETURNING d.id`, values: [...identity(claim), result.state, result.nextAttemptAt ?? null, result.errorClass ?? null]});
    return rows.length === 1;
  }
  async function release(claim: NativeDeliveryClaim): Promise<boolean> {
    const rows = await executor.query({text: `UPDATE native_push_deliveries d SET status=CASE WHEN attempt_count=1 THEN 'queued' ELSE 'retry_pending' END,
      attempt_count=attempt_count-1,lease_token=NULL,lease_expires_at=NULL,updated_at=clock_timestamp()
      WHERE ${lease} AND d.attempt_count>0 AND EXISTS (SELECT 1 FROM native_push_installations i WHERE i.id=d.installation_id AND i.origin=$1 AND i.environment=$2 AND i.generation=d.generation) RETURNING d.id`, values: identity(claim)});
    return rows.length === 1;
  }
  async function defer(claim: NativeDeliveryClaim, nextAttemptAt: Date): Promise<boolean> {
    if (!Number.isFinite(nextAttemptAt.getTime())) throw Error('Invalid native deferral');
    const rows = await executor.query({text: `UPDATE native_push_deliveries d SET status=CASE WHEN $7::timestamptz>=expires_at THEN 'expired'
      WHEN attempt_count=1 THEN 'queued' ELSE 'retry_pending' END,next_attempt_at=CASE WHEN $7::timestamptz>=expires_at THEN next_attempt_at ELSE GREATEST(next_attempt_at,$7::timestamptz) END,
      attempt_count=attempt_count-1,lease_token=NULL,lease_expires_at=NULL,updated_at=clock_timestamp()
      WHERE ${lease} AND d.attempt_count>0 AND $7::timestamptz>clock_timestamp()
      AND EXISTS (SELECT 1 ${joins} WHERE n.id=d.notification_id AND i.id=d.installation_id AND i.generation=d.generation AND ${live}) RETURNING d.id`, values: [...identity(claim), nextAttemptAt.toISOString()]});
    return rows.length === 1;
  }
  async function invalidate(claim: NativeDeliveryClaim, invalidatedAt?: number): Promise<boolean> {
    if (invalidatedAt !== undefined && (!Number.isSafeInteger(invalidatedAt) || invalidatedAt < 0 || invalidatedAt > Date.now())) throw Error('Invalid native invalidation time');
    const values = identity(claim);
    const results = await executor.transaction([
      {text: 'SELECT id FROM native_push_installations WHERE origin=$1 AND environment=$2 AND id=$3::uuid FOR UPDATE', values: [...scope, claim.installationId]},
      {text: 'SELECT id FROM native_push_deliveries WHERE id=$1::uuid FOR UPDATE', values: [claim.deliveryId]},
      {text: `UPDATE native_push_installations i SET status='invalid',encrypted_material=NULL,token_fingerprint=NULL,updated_at=clock_timestamp()
        WHERE i.origin=$1 AND i.environment=$2 AND i.id=$4::uuid AND i.generation=$5::uuid AND i.status='active'
          AND ($7::double precision IS NULL OR i.updated_at<=to_timestamp($7::double precision/1000))
          AND EXISTS (SELECT 1 FROM native_push_deliveries d WHERE ${lease}) RETURNING i.id`, values: [...values, invalidatedAt ?? null]},
      {text: `UPDATE native_push_deliveries d SET status='cancelled',lease_token=NULL,lease_expires_at=NULL,error_class='registration_invalid',updated_at=clock_timestamp()
        FROM native_push_installations i WHERE i.id=d.installation_id AND i.origin=$1 AND i.environment=$2 AND i.id=$4::uuid AND i.generation=$5::uuid
          AND i.status='invalid' AND d.generation=i.generation AND d.id<>$3::uuid AND d.status IN ('queued','retry_pending','processing')`, values: values.slice(0, 5)},
    ]);
    return results[2].length === 1;
  }
  return {pendingIntentIds, materialize, claim, findForClaim, finish, release, defer, invalidate};
}
export type NativeDeliveryRepository = ReturnType<typeof sqlNativeDeliveryRepository>;
