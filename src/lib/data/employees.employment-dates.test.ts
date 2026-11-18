import { describe, expect, it } from '@rstest/core';
import type { SqlExecutor } from '../notifications/types';
import type { Workspace } from '../domain';
import { prepareEmployeeCreationMutation, prepareEmployeeProfileMutation } from './employees';

const proof = { employee: { id: 'OWNER1', role: 'OWNER', firstName: 'Fictional', lastName: 'Owner', primaryLocationId: 'L1' }, sessionTokenHash: 'a'.repeat(64) } as never;
const workspace: Workspace = { id: 'W1', name: 'Fictional Café', timeZone: 'America/Puerto_Rico', active: true, createdAt: '2026-01-01', updatedAt: '2026-01-01 00:00:00+00' };
/** Preparation must not read once the workspace is supplied; any query is a test failure. */
const noReads: SqlExecutor = { query: async () => { throw Error('unexpected read'); }, transaction: async () => { throw Error('unexpected write'); } };
const core = { employeeId: 'E1', expectedUpdatedAt: '2026-11-01 12:00:00+00', firstName: 'Ana', lastName: 'Rivera', phone: '7875550101', role: 'EMPLOYEE' as const, primaryLocationId: 'L1', actorEmployeeId: 'OWNER1', proof };
const update = (batch: Awaited<ReturnType<typeof prepareEmployeeProfileMutation>>) => batch.writes.find(statement => statement.text.includes('UPDATE employees'))!;

describe('employee core profile writes with employment dates', () => {
  it('writes the three dates on the same versioned UPDATE without touching the account status', async () => {
    const batch = await prepareEmployeeProfileMutation({ ...core, active: true, employmentDates: { hireDate: '2015-03-02', terminationDate: '2026-06-30', birthDate: null } }, noReads, workspace);
    const statement = update(batch);
    expect(statement.text).toMatch(/hire_date=\$9::date,\s+termination_date=\$10::date,\s+birth_date=\$11::date/);
    // active comes only from the command's active flag ($7), which the edit sheet keeps as it was opened.
    expect(statement.values.slice(6, 8)).toEqual([true, 'E1']);
    expect(statement.values.slice(8)).toEqual(['2015-03-02', '2026-06-30', null]);
    expect(statement.text).not.toMatch(/active=\$(9|10|11)|termination_date[^,]*active/);
    // The stale-version guard is unchanged.
    expect(batch.guards.some(guard => guard.text.includes('employee_profile_stale') && guard.values[1] === core.expectedUpdatedAt)).toBe(true);
    // Sessions are removed only for an explicit deactivation, never because of a termination date.
    expect(batch.writes.find(statement => statement.text.includes('DELETE FROM employee_sessions'))!.values).toEqual(['E1', true]);
  });

  it('leaves stored dates untouched when the command has none (Deactivate and Reactivate)', async () => {
    const statement = update(await prepareEmployeeProfileMutation({ ...core, active: false }, noReads, workspace));
    expect(statement.text).not.toMatch(/hire_date|termination_date|birth_date/);
    expect(statement.values).toHaveLength(8);
  });

  it('inserts dates for a new employee only when given', async () => {
    const base = { id: 'E2', firstName: 'Luis', lastName: 'Ortiz', phone: '7875550102', role: 'EMPLOYEE' as const, primaryLocationId: 'L1', eligibleLocationIds: [], actorEmployeeId: 'OWNER1', proof };
    const withDates = (await prepareEmployeeCreationMutation({ ...base, employmentDates: { hireDate: '2017-01-26', terminationDate: null, birthDate: '2001-07-04' } }, noReads, workspace)).writes[0];
    expect(withDates.text).toContain('hire_date,termination_date,birth_date');
    expect(withDates.values.slice(7)).toEqual(['2017-01-26', null, '2001-07-04']);
    const without = (await prepareEmployeeCreationMutation(base, noReads, workspace)).writes[0];
    expect(without.text).toBe('INSERT INTO employees(id,first_name,last_name,phone,email,role,primary_location_id) VALUES($1,$2,$3,$4,$5,$6,$7)');
  });
});
