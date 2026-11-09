import type {ActionItem} from '../action-center/project';
import type {StaffingConflict} from './model';
import {addDays} from '../date-utils';

/** Compatible TIME_OFF discriminator, distinct purpose and identity. Existing
 * pending-request decision handlers cannot interpret this as another approval. */
export function staffingRepairActions(items:readonly StaffingConflict[],weekStart:string):ActionItem[]{
 return items.filter(item=>item.state==='repair_required').map(item=>({
  id:item.id,type:'TIME_OFF',purpose:'STAFFING_REPAIR',category:'scheduling',priority:'URGENT',
  title:'Repair staffing for approved leave',detail:`${item.employeeName} · ${item.locationName} · Approved leave overlaps published work.`,
  employeeId:item.employeeId,locationId:item.locationId,ownerEmployeeId:item.ownerEmployeeId,
  dateTime:`${item.date}T${item.startTime}`,endDateTime:`${item.endTime<=item.startTime?addDays(item.date,1):item.date}T${item.endTime}`,
  href:`/app/schedule?week=${weekStart}&location=${encodeURIComponent(item.locationId)}&employeeId=${encodeURIComponent(item.employeeId)}&leaveRepair=${encodeURIComponent(item.id)}`,
 }));
}
