import {expect,it} from '@rstest/core';
import {shiftRequestStatus,timeOffStatus,timeOffStatusIn} from './request-status';
it('names request states in Spanish, and English stays the default',()=>{
 expect(timeOffStatusIn('es').CANCELLED).toBe('Retirada');expect(timeOffStatusIn().CANCELLED).toBe('Withdrawn');expect(timeOffStatus.PENDING).toBe('Waiting for approval');
 expect(shiftRequestStatus('MANAGER_PENDING',{},'es')).toBe('Esperando revisión del gerente');
 expect(shiftRequestStatus('EMPLOYEE_PENDING',{recipient:true},'es')).toBe('Necesita tu respuesta');
 expect(shiftRequestStatus('APPROVED',{callout:true,releaseApplies:true},'es')).toBe('Asignación liberada');
 expect(shiftRequestStatus('WHATEVER',{},'es')).toBe('Ábrela para ver el estado');
 expect(shiftRequestStatus('APPROVED')).toBe('Completed');
});
