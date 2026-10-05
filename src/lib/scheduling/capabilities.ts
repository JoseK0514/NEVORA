import type { Position, UserRole } from '../domain';
import { canFillRole, isLeadCapable } from './periods';
/** Access roles never confer an operational qualification. Inactive held catalog
 * memberships remain readable history but cannot qualify a new assignment. */
export function employeeCanWorkPosition(input: { employeePositionIds: readonly string[]; position: Position }): boolean {
  return input.position.active && input.employeePositionIds.includes(input.position.id);
}

export function employeeCanWorkLocation(employee: { active: boolean; eligibleLocationIds: readonly string[] }, locationId: string): boolean {
  return employee.active && employee.eligibleLocationIds.includes(locationId);
}

export function workspaceLocationAvailable(workspace: {id:string;active:boolean}, location: {id:string;workspaceId:string;active:boolean} | undefined, locationId:string):boolean {
 return workspace.active && Boolean(location?.active && location.id===locationId && location.workspaceId===workspace.id);
}

/** Shared assignment eligibility; persistence guards pin these inputs, not a
 * separate SQL implementation of the qualification rules. */
export function assignmentCapabilityIssues(input: {
  candidate: {locationId:string;positionId?:string | null;isDesignatedLead?:boolean;requiredRole?:UserRole};
  workspace: {id:string;active:boolean};
  location?: {id:string;workspaceId:string;active:boolean};
  position?: Position;
  employee: {active:boolean;role:UserRole;eligibleLocationIds:readonly string[];positionIds:readonly string[]};
}): ('EMPLOYEE_INACTIVE'|'LOCATION_INACTIVE'|'POSITION_INACTIVE'|'POSITION_INELIGIBLE'|'LOCATION_NOT_ELIGIBLE'|'LEAD_REQUIREMENT'|'ROLE_INELIGIBLE')[] {
 const {candidate,workspace,location,position,employee}=input;
 const issues: ReturnType<typeof assignmentCapabilityIssues> = [];
 if(!employee.active) issues.push('EMPLOYEE_INACTIVE');
 if(!workspaceLocationAvailable(workspace,location,candidate.locationId)) issues.push('LOCATION_INACTIVE');
 if(candidate.positionId) {
   if(!position?.active || position.id!==candidate.positionId || position.workspaceId!==workspace.id) issues.push('POSITION_INACTIVE');
   else if(!employeeCanWorkPosition({employeePositionIds:employee.positionIds,position})) issues.push('POSITION_INELIGIBLE');
 }
 if(!employeeCanWorkLocation(employee,candidate.locationId)) issues.push('LOCATION_NOT_ELIGIBLE');
 if((candidate.isDesignatedLead || candidate.requiredRole==='LEAD') && !isLeadCapable(employee.role)) issues.push('LEAD_REQUIREMENT');
 else if(!canFillRole(employee.role,candidate.requiredRole ?? 'EMPLOYEE')) issues.push('ROLE_INELIGIBLE');
 return issues;
}
