import { beforeEach, expect, it, vi } from 'vitest';
import { reviewCalloutAction, submitCalloutAction } from './actions';
import { requireRoles, requireSelfService } from '@/lib/auth/permissions';
import { approveCalloutAndOpenCoverage, createCallout, getCallout } from '@/lib/data/callouts';
import { getPublishedShift } from '@/lib/data/exchanges';
import { clearWeekAcknowledgements } from '@/lib/data/acknowledgements';
vi.mock('@/lib/auth/permissions',()=>({ MANAGER_ROLES:['OWNER','MANAGER'],requireRoles:vi.fn(),requireSelfService:vi.fn() }));
vi.mock('@/lib/data/callouts',()=>({ approveCalloutAndOpenCoverage:vi.fn(),createCallout:vi.fn(),getCallout:vi.fn(),denyCallout:vi.fn(),cancelPendingCallout:vi.fn() }));
vi.mock('@/lib/data/exchanges',()=>({ getPublishedShift:vi.fn() }));
vi.mock('@/lib/data/acknowledgements',()=>({ clearWeekAcknowledgements:vi.fn() }));
vi.mock('@/lib/date-utils',()=>({ currentDateInPuertoRico:()=> '2030-10-07' }));
vi.mock('next/navigation',()=>({ redirect:(path:string)=>{throw new Error(`redirect:${path}`);} }));
vi.mock('next/cache',()=>({ revalidatePath:vi.fn() }));
const shift={id:'s1',employeeId:'E',employeeName:'Employee',scheduleId:'a',locationId:'L',locationName:'Location',weekStart:'2030-10-07',date:'2030-10-11',startTime:'09:00',endTime:'17:00'};
beforeEach(()=>{vi.clearAllMocks();vi.mocked(requireRoles).mockResolvedValue({id:'M',role:'MANAGER',firstName:'Manager',lastName:'Test',primaryLocationId:'L'});vi.mocked(requireSelfService).mockResolvedValue({id:'E',role:'EMPLOYEE',firstName:'Employee',lastName:'Test',primaryLocationId:'L'});vi.mocked(getCallout).mockResolvedValue({...shift,id:'r1',shiftId:'s1',reasonCode:'ILLNESS',status:'PENDING',createdAt:'2030-10-07T12:00:00Z'});});
it('approval uses session actor and does not clear unaffected acknowledgements after atomic repository commit',async()=>{
 vi.mocked(approveCalloutAndOpenCoverage).mockResolvedValue(true);const data=new FormData();data.set('calloutId','r1');data.set('decision','APPROVED');data.set('managerId','other');
 await expect(reviewCalloutAction(data)).rejects.toThrow('calloutApproved=1');expect(approveCalloutAndOpenCoverage).toHaveBeenCalledWith({calloutId:'r1',managerId:'M'});expect(clearWeekAcknowledgements).not.toHaveBeenCalled();
});
it('status race never shows callout approval success',async()=>{
 vi.mocked(approveCalloutAndOpenCoverage).mockResolvedValue(false);const data=new FormData();data.set('calloutId','r1');data.set('decision','APPROVED');await expect(reviewCalloutAction(data)).rejects.toThrow('error=EXCHANGE_CHANGED');expect(clearWeekAcknowledgements).not.toHaveBeenCalled();
});
it('callout submission ignores body employee identity',async()=>{
 vi.mocked(getPublishedShift).mockResolvedValue(shift);vi.mocked(createCallout).mockResolvedValue('r1');const data=new FormData();data.set('shiftId','s1');data.set('reasonCode','ILLNESS');data.set('employeeId','other');await expect(submitCalloutAction(data)).rejects.toThrow('calloutSubmitted=1');expect(createCallout).toHaveBeenCalledWith(expect.objectContaining({employeeId:'E'}));
});
it('callout cannot be submitted for another employee shift',async()=>{
 vi.mocked(getPublishedShift).mockResolvedValue({...shift,employeeId:'other'});const data=new FormData();data.set('shiftId','s1');data.set('reasonCode','ILLNESS');await expect(submitCalloutAction(data)).rejects.toThrow('error=INVALID_SHIFT');expect(createCallout).not.toHaveBeenCalled();
});
