import {randomUUID} from 'node:crypto';
import {expect, it} from '@rstest/core';
import {readOwnerActivityPage} from '../../lib/activity/owner-feed.server';
import {parseOwnerActivityPage} from '../../lib/activity/owner-feed-page.server';
import {saveEmployeeCoreAccessProfile} from '../../lib/company-access/employee-profile.server';
import {assignOperationalScope} from '../../lib/company-access/operational-scope.server';
import {employeeWages} from '../../lib/compensation/wages.server';
import {companyAccessFixture} from './company-access-fixture';

function page(limit = 25, cursor: string | null = null) {
  const request = parseOwnerActivityPage({limit, cursor});
  if (!request) throw new Error('Invalid test page');
  return request;
}

it('admits only a current Owner and distinguishes an empty history from a missing source', async () => {
  const {db, q, owner, manager} = await companyAccessFixture();
  try {
    expect(await readOwnerActivityPage(owner, page(), db.executor)).toEqual({state: 'ready', entries: [], nextCursor: null});
    expect(await readOwnerActivityPage(manager, page(), db.executor)).toEqual({state: 'access_denied'});
    const staleOwner = {...manager, employee: {...manager.employee, role: 'OWNER' as const}};
    expect(await readOwnerActivityPage(staleOwner, page(), db.executor)).toEqual({state: 'access_denied'});

    await q('ALTER TABLE native_payroll_profile_revisions RENAME TO unavailable_payroll_revisions');
    expect(await readOwnerActivityPage(owner, page(), db.executor)).toEqual({state: 'unavailable'});
  } finally {
    await db.dispose();
  }
});

it('reads the existing schedule, Manager, employment and wage records with exact keyset paging and redaction', async () => {
  const {db, q, owner} = await companyAccessFixture();
  try {
    const updateStatus = async (active: boolean) => {
      const [{version}] = await q<{version: string}>("SELECT updated_at::text AS version FROM employees WHERE id='target'");
      const result = await saveEmployeeCoreAccessProfile(owner, {
        operationId: randomUUID(), employeeId: 'target', expectedEmployeeUpdatedAt: version,
        profile: {
          firstName: 'Target', lastName: 'QA', phone: '7875550103', email: 'target@example.invalid',
          role: 'EMPLOYEE', primaryLocationId: 'loc-1', active,
        },
      }, db.executor);
      expect(result.state).toBe('saved');
    };
    await updateStatus(true);
    await updateStatus(false);
    await updateStatus(true);
    await updateStatus(true);
    const [{version: managerVersion}] = await q<{version: string}>("SELECT updated_at::text AS version FROM employees WHERE id='manager'");
    expect((await assignOperationalScope(owner, 'manager', {
      action: 'ASSIGN', operationId: randomUUID(), expectedRoleGeneration: '1', expectedScopeRevision: 1, expectedEmployeeVersion: managerVersion,
      scope: {mode: 'LOCATIONS', locationIds: ['loc-2']},
    }, db.executor)).state).toBe('saved');
    expect((await assignOperationalScope(owner, 'manager', {
      action: 'REVOKE', operationId: randomUUID(), expectedRoleGeneration: '1', expectedScopeRevision: 2, expectedEmployeeVersion: managerVersion,
    }, db.executor)).state).toBe('saved');
    const wage = {id: 'rate', effectiveFrom: '2026-10-01T04:00:00Z', effectiveTo: null, locationIds: ['loc-1'], hourlyRateMinor: '142567891'};
    await employeeWages(owner, {
      action: 'SAVE_WAGES', employeeId: 'target', expectedRevision: 0, operationId: randomUUID(),
      reason: 'PRIVATE WAGE REASON', wages: [wage],
    }, db.executor);
    await q(`INSERT INTO native_payroll_profile_revisions(workspace_id, employee_id, revision, payload)
      SELECT workspace_id, employee_id, 2, payload || jsonb_build_object('revision', 2, 'createdAt', clock_timestamp(), 'tax', jsonb_build_object('private', true))
      FROM native_payroll_profiles_current WHERE employee_id='target'`);
    await q(`INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by,created_at,affected_location_id)
      VALUES ('initial','2010-09-20',1,'PUBLISH','owner','2010-09-20T13:05:00.123456Z','loc-1'),
        ('edit','2010-09-20',2,'MANAGER_MUTATION','manager','2010-09-20T13:05:00.123456Z','loc-1'),
        ('exchange','2010-09-20',3,'EXCHANGE','manager','2010-09-20T13:05:00.123457Z','loc-2')`);

    const full = await readOwnerActivityPage(owner, page(), db.executor);
    if (full.state !== 'ready') throw new Error(`Expected activity, received ${full.state}`);
    expect(full.entries.map(({change}) => change.kind)).toEqual([
      'WAGE_CHANGED', 'MANAGER_SCOPE_REVOKED', 'MANAGER_SCOPE_ASSIGNED', 'EMPLOYEE_ACTIVATED', 'EMPLOYEE_DEACTIVATED',
      'SCHEDULE_EXCHANGE', 'SCHEDULE_PUBLISHED', 'SCHEDULE_EDITED',
    ]);
    expect(full.entries[0]).toMatchObject({
      actor: {id: 'owner', name: 'Owner QA'},
      change: {kind: 'WAGE_CHANGED', employeeId: 'target', employeeName: 'Target QA'},
    });
    expect(full.entries[2].change).toMatchObject({scope: {mode: 'LOCATIONS', locationIds: ['loc-2']}});
    expect(full.entries.at(-1)).toMatchObject({
      actor: {id: 'manager', name: 'Manager QA'},
      change: {kind: 'SCHEDULE_EDITED', locationId: 'loc-1', weekStart: '2010-09-20'},
      occurredAt: '2010-09-20T13:05:00.123456Z',
    });
    for (const secret of [wage.hourlyRateMinor, 'PRIVATE WAGE REASON', 'target@example.invalid', 'hourlyRateMinor', 'command_hash']) {
      expect(JSON.stringify(full)).not.toContain(secret);
    }
    const paged = [];
    let cursor: string | null = null;
    for (let i = 0; i < full.entries.length; i++) {
      const next = await readOwnerActivityPage(owner, page(1, cursor), db.executor);
      if (next.state !== 'ready') throw new Error('Activity page unavailable');
      paged.push(...next.entries);
      cursor = next.nextCursor;
      if (!cursor) break;
    }
    expect(cursor).toBeNull();
    expect(paged).toEqual(full.entries);
  } finally {
    await db.dispose();
  }
});
