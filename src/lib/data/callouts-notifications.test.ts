import { beforeEach, afterEach, expect, it, vi } from 'vitest';
vi.mock('@/lib/db', () => ({ getDb: () => ({ query: async () => [{ id: 'legacy' }] }), queryRows: (value: unknown) => value }));
import { approveCalloutAndOpenCoverage, cancelPendingCallout, createCallout, denyCallout } from './callouts';
import { fixture, intents } from './request-notification-fixtures.test-support';
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2030-10-07T12:00:00Z')); });
afterEach(() => vi.useRealTimers());
it('callout submission creates only manager summary seeds without sensitive reason',async()=>{
 const r=fixture('CALLOUT'); await createCallout({shiftId:'s1',employeeId:'E',reasonCode:'ILLNESS',reasonNote:'private illness'},r.executor);
 expect(r.batches).toHaveLength(1); expect(intents(r.batches[0]).map(n=>[n.employee,n.purpose])).toEqual([['M','SUMMARY'],['O','SUMMARY']]); expect(JSON.stringify(intents(r.batches[0]))).not.toContain('private illness');
});
it('approval atomically opens coverage, records approved callout snapshot and notifies only owner plus manager seeds',async()=>{
 const r=fixture('CALLOUT'); expect(await approveCalloutAndOpenCoverage({calloutId:'request-1',managerId:'M'},r.executor)).toBe(true);
 const b=r.batches[0]; expect(b.some(s=>s.text.includes('INSERT INTO shift_exchanges'))).toBe(true);
 expect(b.filter(s=>s.text.includes('INSERT INTO schedule_publication_revisions'))).toHaveLength(1);
 expect(JSON.parse(String(b.find(s=>s.text.includes('guarded_after'))!.values[1]))[0].isCalloutApproved).toBe(true);
 expect(intents(b).filter(n=>n.kind==='CALLOUT').map(n=>n.employee)).toEqual(['E']);
 expect(intents(b).filter(n=>n.kind==='EXCHANGE').map(n=>[n.employee,n.purpose])).toEqual([['O','SUMMARY']]);
 expect(b.some(s=>s.text.includes('DELETE FROM schedule_acknowledgements'))).toBe(false);
});
it.each([denyCallout,cancelPendingCallout])('decision commits cancellation and only relevant owner outcome',async run=>{
 const r=fixture('CALLOUT'); expect(await run({calloutId:'request-1',managerId:'M',employeeId:'E'},r.executor)).toBe(true);
 expect(intents(r.batches[0]).filter(n=>n.kind==='CALLOUT').map(n=>n.employee)).toEqual(run===denyCallout?['E']:[]);
 expect(r.batches[0].some(s=>s.text.includes('push_deliveries'))).toBe(true);
});
it.each([approveCalloutAndOpenCoverage,denyCallout,cancelPendingCallout])('failed/status-raced/repeated callout decisions never return success',async run=>{
 const r=fixture('CALLOUT'); vi.mocked(r.executor.transaction).mockRejectedValueOnce(new Error('outbox failure'));
 await expect(run({calloutId:'request-1',managerId:'M',employeeId:'E'},r.executor)).rejects.toThrow('outbox failure');
 vi.mocked(r.executor.transaction).mockRejectedValueOnce(Object.assign(new Error('request_transition_conflict'),{code:'22P02'}));
 expect(await run({calloutId:'request-1',managerId:'M',employeeId:'E'},r.executor)).toBe(false);
 r.row.status='APPROVED'; vi.mocked(r.executor.transaction).mockClear(); expect(await run({calloutId:'request-1',managerId:'M',employeeId:'E'},r.executor)).toBe(false); expect(r.executor.transaction).not.toHaveBeenCalled();
});
it('callout creation rejects ownership races without writes and propagates atomic persistence failure',async()=>{
 const r=fixture('CALLOUT');const input={shiftId:'s1',employeeId:'E',reasonCode:'ILLNESS' as const};vi.mocked(r.executor.transaction).mockRejectedValueOnce(new Error('outbox failure'));
 await expect(createCallout(input,r.executor)).rejects.toThrow('outbox failure');r.state.shifts[0].employeeId='F';vi.mocked(r.executor.transaction).mockClear();expect(await createCallout(input,r.executor)).toBe(null);expect(r.executor.transaction).not.toHaveBeenCalled();
});
it('callout approval cannot bless a reassigned shift',async()=>{
 const r=fixture('CALLOUT');r.state.shifts[0].employeeId='F';expect(await approveCalloutAndOpenCoverage({calloutId:'request-1',managerId:'M'},r.executor)).toBe(false);expect(r.executor.transaction).not.toHaveBeenCalled();
});
it('callout approval returns independently of a stalled provider',async()=>{
 const provider=vi.fn(()=>new Promise(()=>{}));vi.stubGlobal('fetch',provider);const r=fixture('CALLOUT');
 try{expect(await approveCalloutAndOpenCoverage({calloutId:'request-1',managerId:'M'},r.executor)).toBe(true);expect(provider).not.toHaveBeenCalled();}finally{vi.unstubAllGlobals();}
});
it('callout outcome access uses the current guarded location when the earlier callout read is stale',async()=>{
 const r=fixture('CALLOUT');r.state.shifts[0].locationId='NEW';r.state.schedules[0].locationId='NEW';r.state.revisions[0].shifts[0].locationId='NEW';
 expect(await denyCallout({calloutId:'request-1',managerId:'M'},r.executor)).toBe(true);
 expect(intents(r.batches[0]).filter(n=>n.kind==='CALLOUT')).toEqual([]);
});
