import { beforeEach, afterEach, expect, it, vi } from 'vitest';
vi.mock('@/lib/db', () => ({ getDb: () => ({ query: async () => [{ id: 'legacy' }] }), queryRows: (value: unknown) => value }));
import { approveCalloutAndOpenCoverage, cancelPendingCallout, createCallout, denyCallout } from './shift-change-compat.test-support';
import { fixture, intents, verifyReadOnlyFences } from './shift-change-compat.test-support';
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2030-10-07T12:00:00Z')); });
afterEach(() => { try { verifyReadOnlyFences(); } finally { vi.useRealTimers(); } });
it('callout submission creates only manager summary seeds without sensitive reason',async()=>{
 const r=fixture('CALLOUT'); await createCallout({shiftId:'s1',employeeId:'E',reasonCode:'ILLNESS',reasonNote:'private illness'},r.executor);
 expect(r.businessBatches).toHaveLength(1); expect(intents(r.businessBatches[0]).map(n=>[n.employee,n.purpose])).toEqual([['M','SUMMARY'],['O','SUMMARY']]); expect(JSON.stringify(intents(r.businessBatches[0]))).not.toContain('private illness');
});
it('approval atomically opens coverage, records approved callout snapshot and notifies only owner plus manager seeds',async()=>{
 const r=fixture('CALLOUT'); expect(await approveCalloutAndOpenCoverage({calloutId:'request-1',managerId:'M'},r.executor)).toBe(true);
 const b=r.businessBatches[0]; expect(b.some(s=>s.text.includes('INSERT INTO shift_exchanges'))).toBe(true);
 expect(b.filter(s=>s.text.includes('INSERT INTO schedule_publication_revisions'))).toHaveLength(1);
 expect(JSON.parse(String(b.find(s=>s.text.includes('guarded_after'))!.values[1]))[0].isCalloutApproved).toBe(true);
 expect(intents(b).filter(n=>n.kind==='CALLOUT').map(n=>n.employee)).toEqual(['E']);
 expect(intents(b).filter(n=>n.kind==='EXCHANGE').map(n=>[n.employee,n.purpose])).toEqual([['O','SUMMARY']]);
 expect(b.some(s=>s.text.includes('DELETE FROM schedule_acknowledgements'))).toBe(false);
});
it.each([denyCallout,cancelPendingCallout])('decision commits cancellation and only relevant owner outcome',async run=>{
 const r=fixture('CALLOUT'); expect(await run({calloutId:'request-1',managerId:'M',employeeId:'E'},r.executor)).toBe(true);
 expect(intents(r.businessBatches[0]).filter(n=>n.kind==='CALLOUT').map(n=>n.employee)).toEqual(run===denyCallout?['E']:[]);
 expect(r.businessBatches[0].some(s=>s.text.includes('push_deliveries'))).toBe(true);
});
it.each([approveCalloutAndOpenCoverage,denyCallout,cancelPendingCallout])('failed/status-raced/repeated callout decisions never return success',async run=>{
 const r=fixture('CALLOUT'); r.businessTransaction.mockRejectedValueOnce(Object.assign(new Error('outbox failure'),{code:'23514'}));
 await expect(run({calloutId:'request-1',managerId:'M',employeeId:'E'},r.executor)).rejects.toThrow('outbox failure');
 expect(r.businessTransaction).toHaveBeenCalledTimes(1);
 r.businessTransaction.mockRejectedValue(Object.assign(new Error('request_transition_conflict'),{code:'22P02'}));
 expect(await run({calloutId:'request-1',managerId:'M',employeeId:'E'},r.executor)).toBe(false);
 expect(r.businessTransaction).toHaveBeenCalledTimes(4);
 r.row.status='APPROVED'; const before=structuredClone(r.state); r.businessTransaction.mockClear(); expect(await run({calloutId:'request-1',managerId:'M',employeeId:'E'},r.executor)).toBe(false); expect(r.businessTransaction).not.toHaveBeenCalled(); expect(r.state).toEqual(before);
});
it('callout creation rejects ownership races without writes and propagates atomic persistence failure',async()=>{
 const r=fixture('CALLOUT');const input={shiftId:'s1',employeeId:'E',reasonCode:'ILLNESS' as const};r.businessTransaction.mockRejectedValueOnce(Object.assign(new Error('outbox failure'),{code:'23514'}));
 await expect(createCallout(input,r.executor)).rejects.toThrow('outbox failure');expect(r.businessTransaction).toHaveBeenCalledTimes(1);r.state.shifts[0].employeeId='F';const before=structuredClone(r.state);r.businessTransaction.mockClear();expect(await createCallout(input,r.executor)).toBe(null);expect(r.businessTransaction).not.toHaveBeenCalled();expect(r.state).toEqual(before);
});
it('callout approval cannot bless a reassigned shift',async()=>{
 const r=fixture('CALLOUT');r.state.shifts[0].employeeId='F';const before=structuredClone(r.state);expect(await approveCalloutAndOpenCoverage({calloutId:'request-1',managerId:'M'},r.executor)).toBe(false);expect(r.businessTransaction).not.toHaveBeenCalled();expect(r.businessBatches).toEqual([]);expect(r.state).toEqual(before);
});
it('callout approval returns independently of a stalled provider',async()=>{
 const provider=vi.fn(()=>new Promise(()=>{}));vi.stubGlobal('fetch',provider);const r=fixture('CALLOUT');
 try{expect(await approveCalloutAndOpenCoverage({calloutId:'request-1',managerId:'M'},r.executor)).toBe(true);expect(provider).not.toHaveBeenCalled();}finally{vi.unstubAllGlobals();}
});
it('callout outcome access uses the current guarded location when the earlier callout read is stale',async()=>{
 const r=fixture('CALLOUT');r.state.shifts[0].locationId='NEW';r.state.schedules[0].locationId='NEW';r.state.revisions[0].shifts[0].locationId='NEW';
 expect(await denyCallout({calloutId:'request-1',managerId:'M'},r.executor)).toBe(true);
 expect(intents(r.businessBatches[0]).filter(n=>n.kind==='CALLOUT')).toEqual([]);
});

// This SQL-assembly fixture models admission I/O only. Current SQL scope guards,
// snapshot and postcommit fences remain real; owned integration tests execute them.
vi.mock('@/lib/company-access/operational-scope.server', async original => ({
 ...await original<Record<string,unknown>>(),
 assertOperationalAccess: async () => ({
  scope:{mode:'COMPANY',locationIds:[]},authority:'b'.repeat(64),
  observedAt:'2030-10-07T12:00:00.000Z',validForMs:15000,
  workspace:{id:'northside',name:'Northside',active:true,timeZone:'America/New_York',createdAt:'2030-01-01 00:00:00+00',updatedAt:'2030-01-01 00:00:00.123456+00'},
 }),
}));
