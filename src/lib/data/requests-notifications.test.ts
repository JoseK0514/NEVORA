import { beforeEach, afterEach, expect, it, vi } from 'vitest';
vi.mock('@/lib/db', () => ({ getDb: () => ({ query: async () => [{ id: 'legacy' }] }), queryRows: (value: unknown) => value }));
import { createTimeOffRequest, reviewTimeOffRequest } from './requests';
import { fixture, intents } from './request-notification-fixtures.test-support';
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2030-10-07T12:00:00Z')); });
afterEach(() => vi.useRealTimers());
it.each(['APPROVED', 'DENIED'] as const)('time_off_decision_returns_without_provider_contact: %s', async status => {
  const r = fixture('TIME_OFF'); const provider = vi.fn(() => new Promise(() => {})); vi.stubGlobal('fetch', provider);
  try {
    expect(await reviewTimeOffRequest({ requestId: 'request-1', managerId: 'M', status }, r.executor)).toBe(true);
    expect(r.batches).toHaveLength(1); expect(intents(r.batches[0])).toEqual([expect.objectContaining({ employee: 'E', kind: 'TIME_OFF', status, purpose: 'EVENT' })]);
    expect(r.batches[0].some(s => s.text.includes('push_deliveries') && s.text.includes('cancelled'))).toBe(true); expect(provider).not.toHaveBeenCalled();
  } finally { vi.unstubAllGlobals(); }
});
it('failed_decision_has_no_success_intent', async () => {
  const r = fixture('TIME_OFF'); vi.mocked(r.executor.transaction).mockRejectedValue(new Error('outbox insert failure'));
  await expect(reviewTimeOffRequest({ requestId: 'request-1', managerId: 'M', status: 'APPROVED' }, r.executor)).rejects.toThrow('outbox insert failure');
});
it('status-raced and repeated decisions return false', async () => {
  const r = fixture('TIME_OFF'); vi.mocked(r.executor.transaction).mockRejectedValue(Object.assign(new Error('request_transition_conflict'), { code: '22P02' }));
  expect(await reviewTimeOffRequest({ requestId: 'request-1', managerId: 'M', status: 'APPROVED' }, r.executor)).toBe(false);
  r.row.status = 'APPROVED'; vi.mocked(r.executor.transaction).mockClear();
  expect(await reviewTimeOffRequest({ requestId: 'request-1', managerId: 'M', status: 'APPROVED' }, r.executor)).toBe(false); expect(r.executor.transaction).not.toHaveBeenCalled();
});
it('submission queues only manager summary seeds and keeps the reason out of payloads', async () => {
  const r = fixture('TIME_OFF'); await createTimeOffRequest({ employeeId: 'E', startDate: '2030-10-11', endDate: '2030-10-11', reason: 'private reason' }, r.executor);
  expect(r.batches).toHaveLength(1); expect(intents(r.batches[0]).map(n => [n.employee, n.purpose])).toEqual([['M', 'SUMMARY'], ['O', 'SUMMARY']]); expect(JSON.stringify(intents(r.batches[0]))).not.toContain('private reason');
});
it('submission outbox failure rejects the whole transaction and has no separate notification write',async()=>{
 const r=fixture('TIME_OFF');vi.mocked(r.executor.transaction).mockRejectedValue(new Error('outbox failure'));
 await expect(createTimeOffRequest({employeeId:'E',startDate:'2030-10-11',endDate:'2030-10-11'},r.executor)).rejects.toThrow('outbox failure');
 expect(r.executor.transaction).toHaveBeenCalledTimes(1);expect(vi.mocked(r.executor.query).mock.calls.every(([statement])=>!statement.text.includes('INSERT'))).toBe(true);
});
