import { describe, expect, it } from '@rstest/core';
import type { SqlExecutor } from '@/lib/notifications/types';
import { parseCreateEmployeeWithAccessCommand, saveEmployeeCoreAccessProfile } from './employee-profile.server';

const operationId = 'd56eb98d-27d9-49c0-a214-937c596929ed';
const proof = { employee: { id: 'OWNER1', role: 'OWNER', firstName: 'Fictional', lastName: 'Owner', primaryLocationId: 'L1' }, sessionTokenHash: 'a'.repeat(64) } as never;
const employee = { id: 'e2', firstName: 'Ana', lastName: 'Rivera', phone: '7875550101', email: null, role: 'EMPLOYEE', primaryLocationId: 'L1', eligibleLocationIds: [], positionIds: [] };
const untouched: SqlExecutor = { query: async () => { throw Error('unexpected read'); }, transaction: async () => { throw Error('unexpected write'); } };

describe('employee commands with employment dates', () => {
  it('keeps the create command unchanged when no dates are sent (roster and onboarding hashes stay the same)', () => {
    const parsed = parseCreateEmployeeWithAccessCommand({ operationId, employee });
    expect(parsed).not.toBeNull();
    expect(parsed).not.toHaveProperty('employmentDates');
  });

  it('accepts well-formed dates on create and refuses malformed ones', () => {
    const employmentDates = { hireDate: '2017-01-25', terminationDate: null, birthDate: '1990-05-01' };
    expect(parseCreateEmployeeWithAccessCommand({ operationId, employee, employmentDates })?.employmentDates).toEqual(employmentDates);
    expect(parseCreateEmployeeWithAccessCommand({ operationId, employee, employmentDates: { ...employmentDates, birthDate: '1990-02-30' } })).toBeNull();
    expect(parseCreateEmployeeWithAccessCommand({ operationId, employee, employmentDates: { hireDate: '2017-01-25' } })).toBeNull();
    // Dates belong beside the employee, not inside it: the employee record stays a closed shape.
    expect(parseCreateEmployeeWithAccessCommand({ operationId, employee: { ...employee, birthDate: '1990-05-01' } })).toBeNull();
  });

  it('refuses a malformed date on a profile save before any read or write', async () => {
    const command = { operationId, employeeId: 'E2', expectedEmployeeUpdatedAt: '2026-11-01 12:00:00+00',
      profile: { firstName: 'Ana', lastName: 'Rivera', phone: '7875550101', email: null, role: 'EMPLOYEE', primaryLocationId: 'L1', active: true },
      employmentDates: { hireDate: '2026-13-01', terminationDate: null, birthDate: null } };
    expect(await saveEmployeeCoreAccessProfile(proof, command as never, untouched)).toMatchObject({ state: 'invalid' });
  });
});
