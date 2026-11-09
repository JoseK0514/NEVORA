import { randomUUID } from 'node:crypto';
import type { CleanupResult, InstallationProof, PushSubscriptionRecord, SqlExecutor, SqlStatement, SubscriptionRepository, InstallationRecord } from '../notifications/types';
import { neonNotificationExecutor } from './notification-transactions';
import { notificationIntentStatements } from './notifications';

function lockStatements(keys: readonly string[]): SqlStatement {
  return { text: `SELECT pg_advisory_xact_lock(hashtextextended(key, 0))
    FROM (SELECT unnest($1::text[]) AS key ORDER BY key) locks`, values: [[...keys]] };
}
function mapSubscription(row: Record<string, unknown>): PushSubscriptionRecord {
  const iso = (value: unknown) => value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
  return {
    id:String(row.id),employeeId:String(row.employee_id),installationHash:String(row.installation_hash),
    environment:row.environment as PushSubscriptionRecord['environment'],endpointFingerprint:String(row.endpoint_fingerprint),
    encryptedMaterial:String(row.encrypted_material),generation:String(row.generation),sessionHash:String(row.session_hash),
    consentAt:iso(row.consent_at),updatedAt:iso(row.updated_at),expiresAt:row.expires_at ? iso(row.expires_at) : null,
    status:'active',lastTestAt:row.last_test_at ? iso(row.last_test_at) : null,
  };
}

/** Encrypted material/proofs are constructed by the authenticated service, never
 * directly from client JSON. All owner changes fail closed; detach needs no session. */
export function sqlSubscriptionRepository(executor: SqlExecutor = neonNotificationExecutor()): SubscriptionRepository {
  async function detach(input: InstallationProof): Promise<CleanupResult> {
    await executor.transaction([
      lockStatements([`push-install:${input.environment}:${input.installationHash}`]),
      { text: `WITH detached AS (
          UPDATE push_subscriptions SET status = 'detached', generation = $4,
            encrypted_material = NULL, updated_at = now()
          WHERE installation_hash = $1 AND environment = $2 AND generation = $3
            AND status = 'active' RETURNING id, generation
        ), cancelled AS (
          UPDATE push_deliveries SET status = 'cancelled', lease_token = NULL,
            lease_expires_at = NULL, updated_at = now()
          WHERE subscription_id IN (SELECT id FROM detached) AND generation = $3
            AND status IN ('queued','retry_pending','processing') RETURNING id
        ) SELECT id, generation FROM detached`,
        values:[input.installationHash,input.environment,input.generation,randomUUID()] },
    ]);
    // Absence of the old active generation is already complete; repeats cannot
    // detach a newer generation. Storage errors propagate, never claim completion.
    return {state:'complete'};
  }
  return {
    async findInstallation(installationHash, environment) {
      const rows = await executor.query<Record<string,unknown>>({
        text: `SELECT id, employee_id, installation_hash, environment, generation,
          endpoint_fingerprint, session_hash, status, expires_at, last_test_at
          FROM push_subscriptions WHERE installation_hash = $1 AND environment = $2 LIMIT 1`,
        values:[installationHash,environment],
      });
      const row = rows[0]; if (!row) return null;
      const iso = (value: unknown) => value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
      return { id:String(row.id),employeeId:String(row.employee_id),installationHash:String(row.installation_hash),
        environment:row.environment as InstallationRecord['environment'],generation:String(row.generation),
        endpointFingerprint:String(row.endpoint_fingerprint),sessionHash:String(row.session_hash),
        status:row.status as InstallationRecord['status'],expiresAt:row.expires_at ? iso(row.expires_at) : null,
        lastTestAt:row.last_test_at ? iso(row.last_test_at) : null };
    },
    async queueSelfTest(input) {
      const {intent,proof} = input;
      if (intent.source.kind !== 'SELF_TEST' || intent.purpose !== 'TEST' || intent.environment !== 'test' ||
          proof.environment !== intent.environment || intent.source.version !== proof.generation || intent.employeeId !== input.employeeId) return false;
      const insert = notificationIntentStatements([intent])[0];
      // Reuse the canonical outbox columns/values; only replace VALUES with a
      // SELECT from the winning throttle row, inside the same SQL statement.
      const guardedInsert = insert.text.replace(/VALUES \(([^\n]+)\)/, 'SELECT $1 FROM allowed');
      if (guardedInsert === insert.text || insert.values.length !== 17) throw new Error('Unsupported outbox statement shape');
      const results = await executor.transaction([
        lockStatements([`push-install:${proof.environment}:${proof.installationHash}`]),
        {text:`WITH allowed AS (
          UPDATE push_subscriptions s SET last_test_at = now()
          WHERE s.id = $18 AND s.installation_hash = $19 AND s.environment = $8
            AND s.generation = $20 AND s.employee_id = $2 AND s.session_hash = $21
            AND s.status = 'active' AND (s.expires_at IS NULL OR s.expires_at > now())
            AND (s.last_test_at IS NULL OR s.last_test_at <= now() - interval '5 minutes')
            AND EXISTS (SELECT 1 FROM employee_sessions session JOIN employees e ON e.id = session.employee_id
              WHERE session.token_hash = $21 AND session.employee_id = $2 AND session.expires_at > now() AND e.active = true)
          RETURNING s.id
        ) ${guardedInsert}`,
        values:[...insert.values,intent.source.id,proof.installationHash,proof.generation,input.sessionHash]},
      ]);
      return !!results[1]?.length;
    },
    async enroll(input) {
      // Installation and endpoint locks serialize ownership decisions. Expected
      // generation is a compare-and-swap fence; a new generation cancels queued
      // deliveries for the old one instead of transferring them to a new owner.
      const results = await executor.transaction([
        lockStatements([`push-install:${input.environment}:${input.installationHash}`,`push-endpoint:${input.environment}:${input.endpointFingerprint}`]),
        { text: `WITH enrolled AS (
          INSERT INTO push_subscriptions (id, employee_id, installation_hash, environment,
            endpoint_fingerprint, encrypted_material, session_hash, generation, status, expires_at)
          SELECT $10,$1,$2,$3,$4,$5,$6::text,$7,'active',$8::timestamptz
          WHERE EXISTS (SELECT 1 FROM employee_sessions session JOIN employees e ON e.id = session.employee_id
            WHERE session.token_hash = $6 AND session.employee_id = $1 AND session.expires_at > now() AND e.active = true)
            AND ($9::text IS NULL OR EXISTS (SELECT 1 FROM push_subscriptions
              WHERE installation_hash = $2 AND environment = $3 AND generation = $9))
            AND NOT EXISTS (SELECT 1 FROM push_subscriptions
              WHERE endpoint_fingerprint = $4 AND environment = $3
                AND (employee_id <> $1 OR (status = 'active' AND installation_hash <> $2)))
          ON CONFLICT (installation_hash, environment) DO UPDATE
            SET encrypted_material = EXCLUDED.encrypted_material, endpoint_fingerprint = EXCLUDED.endpoint_fingerprint,
              session_hash = EXCLUDED.session_hash, generation = EXCLUDED.generation,
              expires_at = EXCLUDED.expires_at, updated_at = now(),
              consent_at = CASE WHEN push_subscriptions.generation = EXCLUDED.generation
                THEN push_subscriptions.consent_at ELSE now() END
            WHERE push_subscriptions.employee_id = EXCLUDED.employee_id
              AND push_subscriptions.status = 'active' AND push_subscriptions.generation = $9
              AND (push_subscriptions.endpoint_fingerprint = EXCLUDED.endpoint_fingerprint OR push_subscriptions.generation <> EXCLUDED.generation)
          RETURNING id, generation
        ), cancelled AS (
          UPDATE push_deliveries SET status = 'cancelled', lease_token = NULL,
            lease_expires_at = NULL, updated_at = now()
          WHERE subscription_id IN (SELECT id FROM enrolled) AND generation <> $7
            AND status IN ('queued','retry_pending','processing') RETURNING id
        ) SELECT generation FROM enrolled`,
          values:[input.employeeId,input.installationHash,input.environment,input.endpointFingerprint,
            input.encryptedMaterial,input.sessionHash,input.generation,input.expiresAt,input.expectedGeneration,randomUUID()] },
      ]);
      const row = results[1]?.[0] as {generation:string} | undefined;
      return row ? {state:'active',generation:row.generation} : {state:'conflict'};
    },
    detach,
    async cleanupRemovedSessions(environment, limit) {
      if (!Number.isInteger(limit) || limit < 1 || limit > 10) throw Error('Invalid cleanup batch limit');
      const rows = await executor.query<{ id: string }>({
        // The candidate row lock serializes enrollment's ON CONFLICT update.
        // SKIP LOCKED leaves an in-flight refresh to the next bounded invocation;
        // the update also fences the exact current generation/session association.
        text: `WITH candidates AS MATERIALIZED (
          SELECT s.id, s.generation, s.session_hash FROM push_subscriptions s
          WHERE s.environment = $1 AND s.status = 'active'
            AND NOT EXISTS (SELECT 1 FROM employee_sessions session
              WHERE session.token_hash = s.session_hash AND session.employee_id = s.employee_id)
          ORDER BY s.id LIMIT $2 FOR UPDATE OF s SKIP LOCKED
        ), detached AS (
          UPDATE push_subscriptions s SET status = 'detached', generation = $3,
            encrypted_material = NULL, updated_at = now()
          FROM candidates c WHERE s.id = c.id AND s.environment = $1 AND s.status = 'active'
            AND s.generation = c.generation AND s.session_hash = c.session_hash
            AND NOT EXISTS (SELECT 1 FROM employee_sessions session
              WHERE session.token_hash = s.session_hash AND session.employee_id = s.employee_id)
          RETURNING s.id, c.generation
        ), cancelled AS (
          UPDATE push_deliveries d SET status = 'cancelled', lease_token = NULL,
            lease_expires_at = NULL, updated_at = now()
          FROM detached s WHERE d.subscription_id = s.id AND d.generation = s.generation
            AND d.status IN ('queued','retry_pending','processing') RETURNING d.id
        ) SELECT id FROM detached`, values: [environment, limit, randomUUID()],
      });
      return rows.length;
    },
    async listActive(recipientId, environment) {
      const rows = await executor.query<Record<string,unknown>>({
        text: `SELECT s.* FROM push_subscriptions s JOIN employees e ON e.id = s.employee_id
          WHERE s.employee_id = $1 AND s.environment = $2 AND s.status = 'active' AND e.active = true
            AND (s.expires_at IS NULL OR s.expires_at > now())
            AND EXISTS (SELECT 1 FROM employee_sessions session
              WHERE session.token_hash = s.session_hash AND session.employee_id = s.employee_id)
          ORDER BY s.id`, values:[recipientId,environment],
      });
      return rows.map(mapSubscription);
    },
    async invalidate(subscriptionId, generation) {
      await executor.transaction([{text:`WITH invalidated AS (
        UPDATE push_subscriptions SET status = 'invalid', generation = $3,
          encrypted_material = NULL, updated_at = now()
        WHERE id = $1 AND generation = $2 AND status = 'active' RETURNING id
      ) UPDATE push_deliveries SET status = 'cancelled', lease_token = NULL,
        lease_expires_at = NULL, updated_at = now()
        WHERE subscription_id IN (SELECT id FROM invalidated) AND generation = $2
          AND status IN ('queued','retry_pending','processing') RETURNING id`,
        values:[subscriptionId,generation,randomUUID()]}]);
    },
    reconcile:detach,
  };
}
