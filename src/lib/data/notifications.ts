import { randomUUID } from "node:crypto";
import { getDb, queryRows } from "../db";
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
         WHERE event_key IS NOT NULL
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
