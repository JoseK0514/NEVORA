import { expect, it } from 'vitest';
import { requestSnapshot } from './request-notifications';
import { buildNotificationIntents } from '../notifications/recipients';
import { notificationPolicyFor } from '../notifications/policy';
import type { ExchangeRecord } from './exchanges';
const record: ExchangeRecord = { id: 'offer', kind: 'SWAP', status: 'EMPLOYEE_PENDING', requestRevision: 2, requestedByEmployeeId: 'a', requestedByName: 'A', requestedByRole: 'EMPLOYEE', targetEmployeeId: 'b', createdAt: '2035-10-01T12:00:00Z', sourceShift: { id: 's', scheduleId: 'week', employeeId: 'a', employeeName: 'A', locationId: 'L', locationName: 'L', weekStart: '2035-10-01', date: '2035-10-02', startTime: '08:00', endTime: '16:00' } };
it('A064 new request events use monotonic revisions while legacy readers retain explicit status versions', () => {
    expect(requestSnapshot('EXCHANGE', record).source.version).toBe('r:2');
    expect(requestSnapshot('EXCHANGE', { ...record, requestRevision: undefined }).source.version).toBe('EMPLOYEE_PENDING');
});
it('A064 same-status new revision does not drop a new response event', () => {
    const result = buildNotificationIntents({ before: requestSnapshot('EXCHANGE', { ...record, requestRevision: 1 }), after: requestSnapshot('EXCHANGE', record), recipients: [{ employeeId: 'b', role: 'EMPLOYEE', active: true, allowedLocationIds: ['L'] }], environment: 'test', now: new Date('2035-10-01T12:00:00Z'), policy: notificationPolicyFor('America/Puerto_Rico') });
    expect(result).toHaveLength(1);
    expect(result[0].effectiveVersion).toBe('r:2');
});
it('A061 invitation includes known position and Lead responsibility with shift context',()=>{
 const coverage={...requestSnapshot('EXCHANGE',{...record,kind:'COVERAGE' as const,status:'OPEN' as const,targetEmployeeId:undefined}),eligibleEmployeeIds:['b']};
 coverage.record.sourceShift={...coverage.record.sourceShift,positionId:'position',positionName:'Barista',isDesignatedLead:true} as typeof coverage.record.sourceShift;
 const result=buildNotificationIntents({after:coverage,recipients:[{employeeId:'b',role:'LEAD',active:true,allowedLocationIds:['L']}],environment:'test',now:new Date('2035-10-01T12:00:00Z'),policy:notificationPolicyFor('America/Puerto_Rico')});
 expect(result).toHaveLength(1);expect(result[0].body).toContain('Barista');expect(result[0].body).toContain('Shift lead');
});
