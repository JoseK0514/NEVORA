import {notificationOperationalAllowedSql} from './notification-operational-sql';
import {communicationIntentAllowedSql} from '../communications/sql';
import type { DeliveryClaim, DeliveryRepository, NotificationIntent, PushEnvironment, SqlExecutor } from '../notifications/types';
import { neonNotificationExecutor } from './notification-transactions';

function mapClaim(row: Record<string, unknown>): DeliveryClaim {
  const iso = (value:unknown) => value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
  const intent: NotificationIntent = {
    id:String(row.notification_id),employeeId:String(row.employee_id),type:String(row.type),title:String(row.title),body:String(row.body),
    actionHref:row.action_href ? String(row.action_href) : undefined,eventKey:String(row.event_key),
    environment:row.environment as NotificationIntent['environment'],source:{kind:row.source_kind as NotificationIntent['source']['kind'],id:String(row.source_id),version:String(row.source_version)},
    effectiveVersion:String(row.effective_version),purpose:row.purpose as NotificationIntent['purpose'],urgency:row.urgency as NotificationIntent['urgency'],
    dueAt:iso(row.due_at),expiresAt:iso(row.expires_at),itemKeys:row.item_keys as string[],
  };
  return {deliveryId:String(row.delivery_id),intentId:intent.id,subscriptionId:String(row.subscription_id),generation:String(row.generation),
    leaseToken:String(row.lease_token),leaseExpiresAt:iso(row.lease_expires_at),attemptCount:Number(row.attempt_count),intent};
}

/** SELF_TEST SourceRef.id is the authenticated installation’s internal subscription
 * id; SourceRef.version is its current ownership generation. Tests never fan out. */
export function sqlDeliveryRepository(environment: PushEnvironment, executor: SqlExecutor = neonNotificationExecutor()): DeliveryRepository {
  return {
    async materialize(intentIds) {
      if (!intentIds.length) return;
      await executor.transaction([{text:`WITH intents AS (
        SELECT n.* FROM notifications n WHERE n.id = ANY($1::text[]) AND n.environment = $2 AND n.push_state = 'pending'
          AND n.cancelled_at IS NULL AND n.due_at <= now() AND n.expires_at > now() AND ${notificationOperationalAllowedSql()}
          AND (n.purpose <> 'SUMMARY' OR n.source_kind = 'MANAGER_SUMMARY')
          AND (n.source_kind <> 'COMMUNICATION' OR ${communicationIntentAllowedSql()})
        ORDER BY n.id FOR UPDATE
      ), inserted AS (
        INSERT INTO push_deliveries (notification_id, subscription_id, generation, next_attempt_at, expires_at)
        SELECT n.id, s.id, s.generation, n.due_at, n.expires_at FROM intents n
          JOIN push_subscriptions s ON s.employee_id = n.employee_id AND s.environment = n.environment
          JOIN employees e ON e.id = s.employee_id AND e.active = true
        WHERE s.status = 'active' AND (s.expires_at IS NULL OR s.expires_at > now())
          AND (n.purpose <> 'EVENT' OR s.consent_at <= n.created_at)
          AND (n.purpose <> 'TEST' OR (n.source_kind = 'SELF_TEST' AND s.id = n.source_id AND s.generation = n.source_version))
          AND (n.source_kind <> 'SELF_TEST' OR n.purpose = 'TEST')
          AND EXISTS (SELECT 1 FROM employee_sessions session
            WHERE session.token_hash = s.session_hash AND session.employee_id = s.employee_id)
        ON CONFLICT (notification_id, subscription_id, generation) DO NOTHING RETURNING notification_id
      ) UPDATE notifications n SET push_state = CASE
          WHEN EXISTS (SELECT 1 FROM inserted i WHERE i.notification_id = n.id)
            OR EXISTS (SELECT 1 FROM push_deliveries d WHERE d.notification_id = n.id)
          THEN 'materialized' ELSE 'no_active_subscription' END
        WHERE n.id IN (SELECT id FROM intents) RETURNING n.id, n.push_state`,values:[[...intentIds],environment]},
        {text:`UPDATE notifications SET push_state = 'expired'
          WHERE id = ANY($1::text[]) AND environment = $2 AND push_state = 'pending' AND expires_at <= now() RETURNING id`,
          values:[[...intentIds],environment]}]);
    },
    async claim(input) {
      if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 10 || input.leaseSeconds !== 120
        || !['new','retry','all'].includes(input.mode)) throw new Error('Invalid delivery claim limits');
      const results = await executor.transaction([
        {text:`UPDATE push_deliveries SET status = CASE WHEN expires_at <= now() THEN 'expired' ELSE 'failed' END,
          lease_token = NULL, lease_expires_at = NULL, updated_at = now()
          WHERE notification_id IN (SELECT id FROM notifications WHERE environment = $1)
            AND status IN ('queued','retry_pending','processing')
            AND (expires_at <= now() OR (attempt_count >= 5
              AND (status <> 'processing' OR lease_expires_at <= now()))) RETURNING id`,values:[environment]},
        {text:`WITH candidates AS (
          SELECT d.id FROM push_deliveries d JOIN notifications n ON n.id = d.notification_id
            JOIN push_subscriptions s ON s.id = d.subscription_id JOIN employees e ON e.id = s.employee_id
          WHERE d.expires_at > now() AND d.next_attempt_at <= now() AND d.attempt_count < 5
            AND ($5::text[] IS NULL OR n.employee_id = ANY($5::text[]))
            AND (n.purpose <> 'SUMMARY' OR n.source_kind = 'MANAGER_SUMMARY')
            AND (n.source_kind <> 'COMMUNICATION' OR ${communicationIntentAllowedSql()})
            AND n.environment = $4 AND n.push_state = 'materialized' AND n.cancelled_at IS NULL AND n.expires_at > now() AND ${notificationOperationalAllowedSql()}
            AND s.status = 'active' AND s.generation = d.generation AND e.active = true
            AND s.employee_id = n.employee_id AND s.environment = n.environment
            AND (n.purpose <> 'TEST' OR (n.source_kind = 'SELF_TEST' AND s.id = n.source_id AND s.generation = n.source_version))
            AND (n.source_kind <> 'SELF_TEST' OR n.purpose = 'TEST')
            AND (s.expires_at IS NULL OR s.expires_at > now())
            AND EXISTS (SELECT 1 FROM employee_sessions session
              WHERE session.token_hash = s.session_hash AND session.employee_id = s.employee_id)
            AND (($3 = 'new' AND d.status = 'queued')
              OR ($3 = 'retry' AND (d.status = 'retry_pending' OR (d.status = 'processing' AND d.lease_expires_at <= now())))
              OR ($3 = 'all' AND (d.status IN ('queued','retry_pending') OR (d.status = 'processing' AND d.lease_expires_at <= now()))))
          ORDER BY d.next_attempt_at, d.id LIMIT $1 FOR UPDATE OF d SKIP LOCKED
        ), claimed AS (
          UPDATE push_deliveries d SET status = 'processing', attempt_count = d.attempt_count + 1,
            lease_token = gen_random_uuid()::text, lease_expires_at = now() + $2::int * interval '1 second', updated_at = now()
          WHERE d.id IN (SELECT id FROM candidates) RETURNING d.*
        ) SELECT c.id AS delivery_id, c.notification_id, c.subscription_id, c.generation, c.lease_token,
          c.lease_expires_at, c.attempt_count, n.* FROM claimed c JOIN notifications n ON n.id = c.notification_id`,
          values:[input.limit,input.leaseSeconds,input.mode,environment,input.recipientIds ? [...input.recipientIds] : null]},
      ]);
      return (results[1] as Record<string,unknown>[]).map(mapClaim);
    },
    async finish(claim, result) {
      if (!['provider_accepted','retry_pending','failed','expired','cancelled'].includes(result.state)
        || (result.state === 'retry_pending' && (!result.nextAttemptAt || !Number.isFinite(Date.parse(result.nextAttemptAt))))
        || (result.errorClass !== undefined && !/^[a-z][a-z0-9_]{0,63}$/.test(result.errorClass))) throw new Error('Invalid delivery completion');
      const rows = await executor.query({text:`UPDATE push_deliveries d SET
        status = CASE WHEN $4 = 'retry_pending' AND (d.attempt_count >= 5 OR $5::timestamptz >= d.expires_at)
          THEN CASE WHEN d.attempt_count >= 5 THEN 'failed' ELSE 'expired' END ELSE $4 END,
        next_attempt_at = CASE WHEN $4 = 'retry_pending' AND d.attempt_count < 5 AND $5::timestamptz < d.expires_at
          THEN $5::timestamptz ELSE d.next_attempt_at END,
        accepted_at = CASE WHEN $4 = 'provider_accepted' THEN now() ELSE NULL END,
        error_class = $6, lease_token = NULL, lease_expires_at = NULL, updated_at = now()
        WHERE d.id = $1 AND d.generation = $2 AND d.lease_token = $3
          AND d.status = 'processing' AND d.lease_expires_at > now()
          AND EXISTS (SELECT 1 FROM notifications WHERE id = d.notification_id AND environment = $7)
          AND ($4 <> 'retry_pending' OR $5::timestamptz > now())
          AND ($4 IN ('cancelled','expired') OR EXISTS (
            SELECT 1 FROM notifications n JOIN push_subscriptions s ON s.id = d.subscription_id
              JOIN employees e ON e.id = s.employee_id
            WHERE n.id = d.notification_id AND n.push_state = 'materialized' AND n.cancelled_at IS NULL AND n.expires_at > now()
              AND s.status = 'active' AND s.generation = d.generation AND e.active = true
              AND s.employee_id = n.employee_id AND s.environment = n.environment
            AND (n.purpose <> 'TEST' OR (n.source_kind = 'SELF_TEST' AND s.id = n.source_id AND s.generation = n.source_version))
            AND (n.source_kind <> 'SELF_TEST' OR n.purpose = 'TEST')
              AND (s.expires_at IS NULL OR s.expires_at > now())
              AND EXISTS (SELECT 1 FROM employee_sessions session
                WHERE session.token_hash = s.session_hash AND session.employee_id = s.employee_id)
          )) RETURNING d.id`,values:[claim.deliveryId,claim.generation,claim.leaseToken,result.state,result.nextAttemptAt ?? null,result.errorClass ?? null,environment]});
      return rows.length > 0;
    },
    async release(claim) {
      const rows = await executor.query({text:`UPDATE push_deliveries SET
        status = CASE WHEN attempt_count = 1 THEN 'queued' ELSE 'retry_pending' END,
        attempt_count = attempt_count - 1, lease_token = NULL, lease_expires_at = NULL, updated_at = now()
        WHERE id = $1 AND generation = $2 AND lease_token = $3
          AND status = 'processing' AND lease_expires_at > now()
          AND notification_id IN (SELECT id FROM notifications WHERE environment = $4) RETURNING id`,
        values:[claim.deliveryId,claim.generation,claim.leaseToken,environment]});
      return rows.length > 0;
    },
    async defer(claim, nextAttemptAt) {
      if (!Number.isFinite(nextAttemptAt.getTime())) throw new Error('Invalid delivery deferral');
      const rows = await executor.query({text:`UPDATE push_deliveries d SET
        status = CASE WHEN $5::timestamptz >= d.expires_at THEN 'expired'
          WHEN attempt_count = 1 THEN 'queued' ELSE 'retry_pending' END,
        next_attempt_at = CASE WHEN $5::timestamptz >= d.expires_at THEN d.next_attempt_at
          ELSE GREATEST(d.next_attempt_at, $5::timestamptz) END,
        attempt_count = attempt_count - 1, lease_token = NULL, lease_expires_at = NULL, updated_at = now()
        WHERE d.id = $1 AND d.generation = $2 AND d.lease_token = $3
          AND d.status = 'processing' AND d.lease_expires_at > now() AND d.attempt_count > 0
          AND $5::timestamptz > now()
          AND EXISTS (SELECT 1 FROM notifications n WHERE n.id = d.notification_id AND n.environment = $4
            AND n.cancelled_at IS NULL AND n.push_state = 'materialized') RETURNING d.id`,
        values:[claim.deliveryId,claim.generation,claim.leaseToken,environment,nextAttemptAt.toISOString()]});
      return rows.length > 0;
    },
    async cancelForGeneration(installationHash, generation) {
      await executor.query({text:`UPDATE push_deliveries d SET status = 'cancelled', lease_token = NULL,
        lease_expires_at = NULL, updated_at = now()
        FROM push_subscriptions s WHERE s.id = d.subscription_id
          AND s.installation_hash = $1 AND d.generation = $2 AND s.environment = $3
          AND d.status IN ('queued','retry_pending','processing') RETURNING d.id`,values:[installationHash,generation,environment]});
    },
  };
}
