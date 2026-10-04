import type {AssignmentFacts} from './notification-transactions';
export function assignmentFacts(locationIds=['loc-1','loc-2'],employeeIds=['E','F']):AssignmentFacts {
 return {workspace:{id:'test-workspace',active:true,timeZone:'America/Puerto_Rico'},locations:locationIds.map(id=>({id,workspaceId:'test-workspace',active:true})),positions:['barista','cashier'].map(id=>({id,name:id,workspaceId:'test-workspace',active:true,createdAt:'2030-01-01',updatedAt:'2030-01-01'})),memberships:employeeIds.flatMap(employeeId=>['barista','cashier'].map(positionId=>({employeeId,positionId})))};
}
