import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from '@rstest/core';

/**
 * Data minimization for migration 0068 (security requirement). The birth date is
 * sensitive: only the management employment-date reader/writers and their edit
 * form may touch it, so every other projection (rosters, schedules, Clocker,
 * notifications, exports, calendar feeds, the owner advisor, employee-facing
 * views) cannot select it. Hire and termination dates are management-only too;
 * the Christmas bonus hours report is their one reader outside the edit form.
 * A new reference must be reviewed and added here deliberately.
 */
const ROOTS = ['src', 'db', 'scripts', 'services', 'functions', 'tools'];
const SOURCE = /\.(?:ts|tsx|mts|mjs|js|sql)$/;
function sources(dir: string): string[] {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return []; }
  return entries.flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' || entry.name.startsWith('.') ? [] : sources(path);
    return SOURCE.test(entry.name) && !/\.test\.[cm]?[tj]sx?$/.test(entry.name) && !path.startsWith(join('src', 'test')) ? [path] : [];
  });
}
const files = ROOTS.flatMap(sources).map(path => ({ path, text: readFileSync(path, 'utf8') }));
const referencing = (pattern: RegExp) => files.filter(file => pattern.test(file.text)).map(file => file.path).sort();

it('selects or writes birth_date only in the migration and the management employee data module', () => {
  expect(referencing(/\bbirth_date\b/)).toEqual([join('db', 'migrations', '0068_employee_employment_dates.sql'), join('src', 'lib', 'data', 'employees.ts')]);
});

it('carries birthDate only through the management edit path', () => {
  expect(referencing(/\bbirthDate\b/)).toEqual([
    join('src', 'components', 'company-access', 'commands.ts'),
    join('src', 'components', 'employment-date-fields.tsx'),
    join('src', 'lib', 'company-access', 'employee-profile.server.ts'),
    join('src', 'lib', 'company-access', 'operational-read.server.ts'),
    join('src', 'lib', 'data', 'employees.ts'),
    join('src', 'lib', 'employment-dates.ts'),
  ]);
});

it('reads hire and termination dates only in the employee data module and the Christmas bonus report', () => {
  expect(referencing(/\b(?:hire_date|termination_date)\b/)).toEqual([
    join('db', 'migrations', '0068_employee_employment_dates.sql'),
    join('src', 'lib', 'data', 'employees.ts'),
    join('src', 'lib', 'reports', 'christmas-bonus.server.ts'),
  ]);
});

it('keeps the dates out of the shared Employee DTO', () => {
  const domain = readFileSync(join('src', 'lib', 'domain.ts'), 'utf8');
  const employee = domain.slice(domain.indexOf('export type Employee = {'), domain.indexOf('};', domain.indexOf('export type Employee = {')));
  expect(employee).not.toMatch(/hireDate|terminationDate|birthDate/);
});
