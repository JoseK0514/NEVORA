import {employeeInScopeSql} from '../company-access/scope-sql';

/** B-12: a correction request is in a location-scoped Manager's reach only when its employee is in the scope AND every
 * location it touches is: the request's location, the location in its captured source, the recorded entry it
 * changes, and the adjustment it builds on. A correction at a location outside the scope stays refused, even for an
 * in-scope employee. `ids` is a text[] SQL expression; NULL means Company and matches every request. */
export function correctionInScopeSql(request:string,workspace:string,ids:string):string{
  return `(${ids} IS NULL OR (${employeeInScopeSql(`${request}.employee_id`,workspace,ids)}
    AND ${request}.location_id=ANY(${ids})
    AND (${request}.source_snapshot->>'locationId' IS NULL OR ${request}.source_snapshot->>'locationId'=ANY(${ids}))
    AND (${request}.time_entry_id IS NULL OR EXISTS(SELECT 1 FROM time_entries scope_t WHERE scope_t.id=${request}.time_entry_id AND scope_t.location_id=ANY(${ids})))
    AND (${request}.base_adjustment_id IS NULL OR EXISTS(SELECT 1 FROM time_correction_adjustments scope_a WHERE scope_a.id=${request}.base_adjustment_id AND scope_a.location_id=ANY(${ids})))))`;
}
