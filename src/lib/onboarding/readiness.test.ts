import {it,expect} from 'vitest';
import {deriveReadiness} from './readiness.server';
it('never makes optional payroll/timekeeping a core blocker or treats a skip as configuration',()=>{
 const result=deriveReadiness({businessValid:true,activeLocations:1,activePositions:0,schedulingIssues:[],teamCount:0,uninvitedCount:0,missingEmailCount:0,payrollEnabled:false,timekeepingConfigured:false,payrollConfigured:false,invitationSenderAvailable:false});
 expect(result.find(s=>s.id==='BUSINESS')?.state).toBe('READY');expect(result.find(s=>s.id==='PAYROLL')?.state).toBe('OPTIONAL');expect(result.find(s=>s.id==='POSITIONS')?.state).toBe('OPTIONAL');
});
it('reports sender unavailability without advertising sends and retains status access',()=>{
 const base={businessValid:true,activeLocations:1,activePositions:0,schedulingIssues:[],teamCount:2,uninvitedCount:2,missingEmailCount:0,payrollEnabled:false,timekeepingConfigured:false,payrollConfigured:false};
 const disabled=deriveReadiness({...base,invitationSenderAvailable:false}).find(s=>s.id==='INVITATIONS')!;expect(disabled.allowedActions).not.toContain('INVITE');expect(disabled.allowedActions).toContain('CHECK_STATUS');expect(disabled.reasonCodes).toContain('DELIVERY_NOT_CONFIGURED');
 const enabled=deriveReadiness({...base,invitationSenderAvailable:true}).find(s=>s.id==='INVITATIONS')!;expect(enabled.allowedActions).toContain('INVITE');expect(enabled.reasonCodes).not.toContain('DELIVERY_NOT_CONFIGURED');
});
