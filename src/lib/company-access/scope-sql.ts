import type {OperationalFootprint,ScopeSelection} from './model';

/** B-12: the one definition of "an employee in a Manager's location scope": the employee's primary location, or one
 * of their eligible locations, is in the scope, and the employee is not an Owner (Owners' own time and requests stay
 * with Owners and company-wide Managers). `ids` is a text[] SQL expression and NULL means Company (every employee of
 * the workspace, unchanged). Readers put it in the same statement as the rows it filters; writers put it in their own
 * transaction through operationalMembersStatements. Plain SQL text, so data modules can share it. */
export function employeeInScopeSql(employee:string,workspace:string,ids:string):string{
 return `(${ids} IS NULL OR NOT EXISTS(SELECT 1 FROM employees scope_o WHERE scope_o.id=${employee} AND scope_o.role='OWNER')
  AND EXISTS(SELECT 1 FROM locations scope_l WHERE scope_l.workspace_id=${workspace} AND scope_l.id=ANY(${ids})
  AND(scope_l.id=(SELECT scope_e.primary_location_id FROM employees scope_e WHERE scope_e.id=${employee})
   OR EXISTS(SELECT 1 FROM employee_location_eligibility scope_g WHERE scope_g.employee_id=${employee} AND scope_g.location_id=scope_l.id))))`;
}
/** The footprint an actor's current scope covers, and its sorted location ids (null for Company). */
export function scopeFootprint(scope:ScopeSelection):OperationalFootprint{
 return scope.mode==='COMPANY'?{kind:'COMPANY'}:{kind:'LOCATIONS',locationIds:scope.locationIds};
}
export function footprintIds(footprint:OperationalFootprint):string[]|null{
 return footprint.kind==='COMPANY'?null:[...new Set(footprint.locationIds)].sort();
}
