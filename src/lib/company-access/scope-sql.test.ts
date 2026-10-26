import {expect,it} from 'vitest';
import {employeeInScopeSql,footprintIds,scopeFootprint} from './scope-sql';

it('B-12: one membership predicate, Company-transparent and limited to primary or eligible locations', () => {
  const sql = employeeInScopeSql('e.id', '$1', '$2::text[]');
  // NULL scope (Company) matches every employee, so company-wide reads keep their rows.
  expect(sql.startsWith('($2::text[] IS NULL OR ')).toBe(true);
  expect(sql).toContain('scope_e.primary_location_id');
  expect(sql).toContain('employee_location_eligibility');
  // Owners' own time and requests stay with Owners and company-wide Managers.
  expect(sql).toContain("scope_o.role='OWNER'");
});

it('B-12: footprints come from the admitted scope, sorted and de-duplicated', () => {
  expect(scopeFootprint({mode: 'COMPANY', locationIds: []})).toEqual({kind: 'COMPANY'});
  expect(footprintIds({kind: 'COMPANY'})).toBeNull();
  expect(footprintIds(scopeFootprint({mode: 'LOCATIONS', locationIds: ['loc-2', 'loc-1', 'loc-2']}))).toEqual(['loc-1', 'loc-2']);
});
