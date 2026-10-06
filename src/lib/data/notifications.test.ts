import { expect, it, vi } from 'vitest';
import * as repository from './notifications';
import type { NotificationIntent, SqlStatement } from '../notifications/types';
const queries = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('../db', async original => ({ ...await original<typeof import('../db')>(), getDb: () => queries }));
const intent: NotificationIntent = { id:'intent-1', employeeId:'employee-1', type:'TIME_OFF_APPROVED', title:'Update', body:'Review the portal', eventKey:'same-key', environment:'test', source:{kind:'TIME_OFF',id:'request-1',version:'v1'}, effectiveVersion:'v1', purpose:'EVENT', urgency:'normal', dueAt:'2030-10-01T12:00:00Z', expiresAt:'2030-10-02T12:00:00Z' };
it('outbox_statements_share_business_transaction', () => {
  expect(repository).toHaveProperty('notificationIntentStatements');
  const statements = repository.notificationIntentStatements([intent]);
  const batch: SqlStatement[] = [{ text:'UPDATE time_off_requests SET status = $1 WHERE id = $2', values:['APPROVED','request-1'] }, ...statements];
  expect(batch).toHaveLength(2);
  expect(queries.query).not.toHaveBeenCalled();
  expect(batch[1].text).toMatch(/ON CONFLICT \(environment, event_key\)/);
  expect(batch[1].text).toMatch(/RETURNING id/);
  expect(batch[1].text).not.toMatch(/DO NOTHING/);
  expect(batch[1].values).toContain('test');
  expect(batch[1].values).toContain('intent-1');
  expect(batch[1].text).not.toContain('request-1');
});
it('cancellation_fences_both_intent_and_processing_deliveries', () => {
  expect(repository).toHaveProperty('cancelNotificationStatements');
  const statements = repository.cancelNotificationStatements(intent.source, 'employee-1');
  expect(statements[0].text).toMatch(/UPDATE notifications/);
  expect(statements[0].text).toMatch(/UPDATE push_deliveries/);
  expect(statements[0].text).toMatch(/source_version/);
  expect(statements[0].values).toEqual(['TIME_OFF','request-1','v1','employee-1']);
});
