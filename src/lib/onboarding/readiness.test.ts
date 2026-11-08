import {it,expect} from 'vitest';
import {deriveReadiness} from './readiness.server';
it('never makes optional payroll/timekeeping a core blocker or treats a skip as configuration',()=>{
 const result=deriveReadiness({businessValid:true,activeLocations:1,activePositions:0,schedulingIssues:[],teamCount:0,uninvitedCount:0,missingEmailCount:0,payrollEnabled:false,timekeepingConfigured:false,payrollConfigured:false});
 expect(result.find(s=>s.id==='BUSINESS')?.state).toBe('READY');expect(result.find(s=>s.id==='PAYROLL')?.state).toBe('OPTIONAL');expect(result.find(s=>s.id==='POSITIONS')?.state).toBe('OPTIONAL');
});
