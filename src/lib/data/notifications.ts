import {notificationCompanySql} from './notification-operational-sql';
import { randomUUID } from "node:crypto";
import { getDb, queryRows } from "../db";
import type { NotificationIntent, SourceRef, SqlStatement } from "../notifications/types";
import type { NotificationEvent } from "../assistance/notification-events";

export type NotificationListItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  actionHref?: string;
  readAt?: string;
  createdAt: string;
};

function isoValue(value: unknown) {
  return value instanceof Date
    ? value.toISOString()
    : new Date(String(value)).toISOString();
}

function mapNotification(row: Record<string, unknown>): NotificationListItem {
  return {
    id: String(row.id),
    type: String(row.type),
    title: String(row.title),
    body: String(row.body),
    actionHref: row.action_href ? String(row.action_href) : undefined,
    readAt: row.read_at ? isoValue(row.read_at) : undefined,
    createdAt: isoValue(row.created_at),
  };
}

export async function createNotification(event: NotificationEvent) {
  const sql = getDb();
  const rows = queryRows<{ id: string }>(
    await sql.query(
      `INSERT INTO notifications (
         id,
         employee_id,
         type,
         title,
         body,
         action_href,
         event_key
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (event_key)
         WHERE event_key IS NOT NULL AND environment IS NULL
       DO NOTHING
       RETURNING id`,
      [
        randomUUID(),
        event.employeeId,
        event.type,
        event.title,
        event.body,
        event.actionHref ?? null,
        event.eventKey,
      ],
    ),
  );

  return Boolean(rows[0]);
}

export async function listNotifications(
  employeeId: string,
  limit = 20,
): Promise<NotificationListItem[]> {
  const sql = getDb();
  const safeLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
  const rows = queryRows(
    await sql.query(
      `SELECT
         id,
         type,
         title,
         body,
         action_href,
         read_at,
         created_at
       FROM notifications
       WHERE employee_id = $1
         AND (to_jsonb(notifications)->>'management_alert_suppressed') IS DISTINCT FROM 'true'
       ORDER BY created_at DESC, id DESC
       LIMIT $2`,
      [employeeId, safeLimit],
    ),
  );

  return rows.map((row) => mapNotification(row as Record<string, unknown>));
}

export async function countUnreadNotifications(employeeId: string) {
  const sql = getDb();
  const rows = queryRows<{ unread_count: string | number }>(
    await sql.query(
      `SELECT count(*) AS unread_count
       FROM notifications
       WHERE employee_id = $1
         AND (to_jsonb(notifications)->>'management_alert_suppressed') IS DISTINCT FROM 'true'
         AND read_at IS NULL`,
      [employeeId],
    ),
  );

  return Number(rows[0]?.unread_count ?? 0);
}

export async function markNotificationRead(
  notificationId: string,
  employeeId: string,
) {
  const sql = getDb();
  const rows = queryRows<{ id: string }>(
    await sql.query(
      `UPDATE notifications
       SET read_at = COALESCE(read_at, now())
       WHERE id = $1
         AND employee_id = $2
       RETURNING id`,
      [notificationId, employeeId],
    ),
  );

  return Boolean(rows[0]);
}

export async function markAllNotificationsRead(employeeId: string) {
  const sql = getDb();
  const rows = queryRows<{ id: string }>(
    await sql.query(
      `UPDATE notifications
       SET read_at = now()
       WHERE employee_id = $1
         AND read_at IS NULL
       RETURNING id`,
      [employeeId],
    ),
  );

  return rows.length;
}

/** Append these statements to the business batch. Conflict returns the persisted
 * id (the newly generated candidate id must never be used for an existing row). */
export function notificationIntentStatements(intents: readonly NotificationIntent[]): SqlStatement[] {
  return intents.map(intent => {const statement={
    text: `INSERT INTO notifications (id, employee_id, type, title, body, action_href, event_key,
      environment, source_kind, source_id, source_version, effective_version, purpose,
      urgency, due_at, expires_at, item_keys, push_state)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'pending')
      ON CONFLICT (environment, event_key) WHERE environment IS NOT NULL AND event_key IS NOT NULL
      DO UPDATE SET event_key = notifications.event_key RETURNING id`,
    values: [intent.id,intent.employeeId,intent.type,intent.title,intent.body,intent.actionHref ?? null,
      intent.eventKey,intent.environment,intent.source.kind,intent.source.id,intent.source.version,
      intent.effectiveVersion,intent.purpose,intent.urgency,intent.dueAt,intent.expiresAt,[...(intent.itemKeys ?? [])]],
  };
    // Independent financial/device consumers retain the exact original VALUES
    // contract. Operational candidates are authorized at actual persistence.
    if(!['PAYROLL_PREPARATION','PAYROLL_STATEMENT','SELF_TEST'].includes(intent.source.kind)){
      const values="VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'pending')";
      const selected=`SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'pending'
      FROM employees notification_recipient WHERE notification_recipient.id=$2 AND notification_recipient.active
      AND((notification_recipient.role IN('EMPLOYEE','LEAD') AND $9::text<>'MANAGER_SUMMARY' AND $13::text<>'SUMMARY') OR ${notificationCompanySql('notification_recipient')})`;
      const guarded=statement.text.replace(values,selected);if(guarded===statement.text)throw Error('Operational outbox contract changed');statement.text=guarded;
    }
    return statement;
  });
}

export function cancelNotificationStatements(source: SourceRef, recipientId?: string): SqlStatement[] {
  return [{
    text: `WITH cancelled AS (
      UPDATE notifications SET push_state = 'cancelled', cancelled_at = now()
      WHERE source_kind = $1 AND source_id = $2 AND (source_version = $3 OR ($1 IN ('EXCHANGE','CALLOUT') AND $3 ~ '^r:[1-9][0-9]*$' AND (source_version IN ('OPEN','EMPLOYEE_PENDING','MANAGER_PENDING','PENDING','APPROVED','DENIED','CANCELLED','EXPIRED') OR CASE WHEN source_version ~ '^r:[1-9][0-9]*$' THEN substring(source_version from 3)::numeric <= substring($3 from 3)::numeric ELSE false END)))
        AND ($4::text IS NULL OR employee_id = $4)
        AND push_state IN ('pending','materialized','no_active_subscription') RETURNING id
    ) UPDATE push_deliveries SET status = 'cancelled', lease_token = NULL,
      lease_expires_at = NULL, updated_at = now()
      WHERE notification_id IN (SELECT id FROM cancelled)
        AND status IN ('queued','retry_pending','processing') RETURNING id`,
    values: [source.kind,source.id,source.version,recipientId ?? null],
  }];
}
