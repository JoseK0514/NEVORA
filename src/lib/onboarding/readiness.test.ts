import {it,expect} from 'vitest';
import {deriveReadiness} from './readiness.server';
import setupFixture from './fixtures/v1/setup-state.json';
import readinessCases from './fixtures/v1/readiness-cases.json';
it('gives Claude the actual empty-company sections, reasons and actions in the v1 setup fixture',()=>{
 const actual=deriveReadiness({businessValid:true,activeLocations:1,activePositions:0,schedulingIssues:['STAFFING_NOT_CONFIGURED','COVERAGE_NOT_CONFIGURED'],teamCount:0,uninvitedCount:0,missingEmailCount:0,payrollEnabled:false,timekeepingConfigured:false,payrollConfigured:false,invitationSenderAvailable:false});
 expect(setupFixture.sections).toEqual(actual);
});
it.each(readinessCases)('keeps the browser-safe $name fixture aligned with canonical readiness',({canonical,sections})=>{
 const actual=deriveReadiness(canonical);
 for(const section of sections)expect(actual.find(s=>s.id===section.id)).toEqual(section);
});
it('never makes optional payroll/timekeeping a core blocker or treats a skip as configuration',()=>{
 const result=deriveReadiness({businessValid:true,activeLocations:1,activePositions:0,schedulingIssues:[],teamCount:0,uninvitedCount:0,missingEmailCount:0,payrollEnabled:false,timekeepingConfigured:false,payrollConfigured:false,invitationSenderAvailable:false});
 expect(result.find(s=>s.id==='BUSINESS')?.state).toBe('READY');expect(result.find(s=>s.id==='PAYROLL')?.state).toBe('OPTIONAL');expect(result.find(s=>s.id==='POSITIONS')?.state).toBe('OPTIONAL');
});
it('reports sender unavailability without advertising sends and retains status access',()=>{
 const base={businessValid:true,activeLocations:1,activePositions:0,schedulingIssues:[],teamCount:2,uninvitedCount:2,missingEmailCount:0,payrollEnabled:false,timekeepingConfigured:false,payrollConfigured:false};
 const disabled=deriveReadiness({...base,invitationSenderAvailable:false}).find(s=>s.id==='INVITATIONS')!;expect(disabled.allowedActions).not.toContain('INVITE');expect(disabled.allowedActions).toContain('CHECK_STATUS');expect(disabled.reasonCodes).toContain('DELIVERY_NOT_CONFIGURED');
 const enabled=deriveReadiness({...base,invitationSenderAvailable:true}).find(s=>s.id==='INVITATIONS')!;expect(enabled.allowedActions).toContain('INVITE');expect(enabled.reasonCodes).not.toContain('DELIVERY_NOT_CONFIGURED');
});
