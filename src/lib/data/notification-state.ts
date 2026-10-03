import { neonNotificationExecutor } from './notification-transactions';
import type { NotificationIntent, NotificationStateRepository, RecipientAccess, SourceKind, SqlExecutor } from '../notifications/types';
import type { UserRole } from '../domain';
const SOURCE_KINDS: readonly SourceKind[] = ['SCHEDULE', 'TIME_OFF', 'EXCHANGE', 'CALLOUT', 'AVAILABILITY', 'MANAGER_SUMMARY', 'SELF_TEST'];
function instant(value: unknown): string | null {
    const time = value instanceof Date ? value.getTime() : Date.parse(String(value));
    return Number.isFinite(time) ? new Date(time).toISOString() : null;
}
/** Real persisted recipient/intent lookup. Source evaluation is deliberately
 * unavailable until Task 7 implements current business-state queries here. */
export function sqlNotificationStateRepository(executor: SqlExecutor = neonNotificationExecutor()): NotificationStateRepository {
    return {
        async findIntent(notificationId) {
            const [row] = await executor.query<Record<string, unknown>>({ text: `SELECT * FROM notifications WHERE id = $1 AND environment IS NOT NULL AND cancelled_at IS NULL LIMIT 1`, values: [notificationId] });
            if (!row || (row.environment !== 'test' && row.environment !== 'production') || !SOURCE_KINDS.includes(row.source_kind as SourceKind))
                return null;
            const dueAt = instant(row.due_at), expiresAt = instant(row.expires_at);
            if (!dueAt || !expiresAt || !['EVENT', 'REMINDER', 'SUMMARY', 'TEST'].includes(String(row.purpose)) || !['normal', 'high'].includes(String(row.urgency)))
                return null;
            return { id: String(row.id), employeeId: String(row.employee_id), type: String(row.type), title: String(row.title), body: String(row.body), actionHref: row.action_href ? String(row.action_href) : undefined, eventKey: String(row.event_key), environment: row.environment,
                source: { kind: row.source_kind as SourceKind, id: String(row.source_id), version: String(row.source_version) }, effectiveVersion: String(row.effective_version), purpose: row.purpose as NotificationIntent['purpose'], urgency: row.urgency as NotificationIntent['urgency'], dueAt, expiresAt, itemKeys: Array.isArray(row.item_keys) && row.item_keys.every(item => typeof item === 'string') ? row.item_keys : undefined };
        },
        async recipientAccess(employeeId) {
            const [row] = await executor.query<{
                id: string;
                role: UserRole;
                active: boolean;
                allowed_location_ids: string[];
            }>({ text: `SELECT e.id, e.role, e.active,
        COALESCE(array_agg(elig.location_id ORDER BY elig.location_id) FILTER (WHERE elig.location_id IS NOT NULL), ARRAY[]::text[]) AS allowed_location_ids
        FROM employees e LEFT JOIN employee_location_eligibility elig ON elig.employee_id = e.id
        WHERE e.id = $1 GROUP BY e.id, e.role, e.active`, values: [employeeId] });
            if (!row || !['OWNER', 'MANAGER', 'LEAD', 'EMPLOYEE'].includes(row.role))
                return null;
            return { employeeId: row.id, role: row.role, active: row.active, allowedLocationIds: row.allowed_location_ids } satisfies RecipientAccess;
        },
        async readSource() { throw new Error('Authoritative notification source state is not implemented'); },
        async check(intent) { return { deliverable: false, reason: 'source_state_unavailable', effectiveVersion: intent.effectiveVersion, expiresAt: intent.expiresAt }; },
        async listReminderCandidates() { throw new Error('Authoritative notification reminders are not implemented'); },
    };
}
