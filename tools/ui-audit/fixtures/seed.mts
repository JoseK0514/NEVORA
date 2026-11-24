// UI audit fixtures (tools/ui-audit). One fictional business on the owned disposable database, with a sign-in for every
// audited role and the records the state variants need. Every step reuses the app's server functions or the integration
// fixtures' recipes (through seed-owner.mts and seed-employee.mts, from tools/ui-scan). A step that fails is logged and
// skipped, so a missing record shows up in the report as a setup note, not a crash. No real people, money, email, SMS,
// notifications or credentials: every person, phone and address is fictional and the password is the fixtures' own.
import {randomUUID} from 'node:crypto';
import type {SqlExecutor} from '../../../src/lib/notifications/types';
import {seedOwnedApp,seedOwnedScenario,grantOwnedManagerWorkforcePermission,TEST_PASSWORD} from '../../../src/test/integration/owned-app-fixture';
import {publishScheduleWithRevision} from '../../../src/test/integration/management-api';
import {fixtureProof} from '../../../src/test/integration/shift-change-api';
import {readOwnerOperationalScope,assignOperationalScope} from '../../../src/lib/company-access/operational-scope.server';
import {registerClockerDevice} from '../../../src/lib/clocker/devices.server';
import {setEmployeeClockerPin} from '../../../src/lib/clocker/pins.server';
import {hashPassword} from '../../../src/lib/auth/password';
import {businessDate} from '../../../src/lib/business-time';
import {weekStartFor,addDays} from '../../../src/lib/date-utils';
import {seedOwnerBefore,seedOwnerSchedules,seedOwnerAfter,ownerPayExtra,OWNER_PEOPLE} from './seed-owner.mts';
import {seedEmployeeRich} from './seed-employee.mts';

/** The sign-in for each role. `public` and `clocker` have none (signed out, and a registered kiosk tablet). */
export type AuditLogins = Record<string, string | null>;
export type AuditSeed = {
  logins: AuditLogins;
  week: string;
  nextWeek: string;
  today: string;
  actors: string[];
  /** Text that is people data (names, the workspace, locations, positions): reported apart from product copy. */
  peopleData: string[];
  /** Ids the routes file may reference as {name}. */
  ids: Record<string, string>;
  setupLog: unknown[];
  /** Registers a fresh kiosk tablet for a location and returns its one-time enrolment token. */
  clockerEnrollment: (locationId: string) => Promise<string>;
};

export async function seedAudit(ex: SqlExecutor): Promise<AuditSeed> {
  const setupLog: unknown[] = [];
  const q = (text: string, values: unknown[] = []) => ex.query({text, values});
  const step = async (name: string, fn: () => Promise<unknown>) => {
    try { await fn(); setupLog.push(name + ' ok'); } catch (e) { setupLog.push(name + ' failed: ' + String((e as Error)?.message ?? e).slice(0, 300)); }
  };
  await seedOwnedApp(ex);
  const f = await seedOwnedScenario(ex, 'AUD', 0);
  const names = [['Maria', 'Rivera'], ['James', 'Ortiz'], ['Ana', 'Colon']];
  for (const [i, id] of f.actors.entries()) await q('UPDATE employees SET first_name=$2,last_name=$3 WHERE id=$1', [id, names[i][0], names[i][1]]);
  await q("UPDATE employees SET first_name='Fictional',last_name='Owner' WHERE id='QAOWNER'");
  await step('owner team', () => seedOwnerBefore(ex, {actors: f.actors}, setupLog));
  const today = businessDate(new Date(), 'America/Puerto_Rico'), week = weekStartFor(today), nextWeek = addDays(week, 7);
  await step('this week published', async () => {
    await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('aud-week','loc-1',$1,'DRAFT','QAOWNER')", [week]);
    let n = 0;
    for (let d = 0; d < 7; d++) for (const [i, id] of f.actors.entries()) {
      if ((d + i) % 3 === 2) continue;
      await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id) VALUES($1,'aud-week',$2,$3,$4,$5,'qa-pos')", ['aud-' + (n++), id, addDays(week, d), ['07:00', '09:00', '12:00'][i], ['15:00', '17:00', '20:00'][i]]);
    }
    await publishScheduleWithRevision({locationId: 'loc-1', weekStart: week, managerId: 'QAOWNER'}, ex);
  });
  await step('owner schedules', () => seedOwnerSchedules(ex, {actors: f.actors, today, week}, setupLog));
  await step('employee records', () => seedEmployeeRich(ex, {actors: f.actors, actor: f.actors[1], today, week, scenario: {sourceId: f.sourceId, week: f.week}, payWeeks: [4, 3], correctionWeek: 3, payAnchor: addDays(week, -28), payExtra: ownerPayExtra(ex)}, setupLog));
  await step('owner records', () => seedOwnerAfter(ex, {actors: f.actors, today, week}, setupLog));
  // Draft week: next week, one location, unpublished.
  await step('next week draft', async () => {
    await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('aud-draft','loc-1',$1,'DRAFT','QAOWNER') ON CONFLICT DO NOTHING", [nextWeek]);
    for (const [i, id] of f.actors.entries()) await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id) VALUES($1,'aud-draft',$2,$3,'09:00','17:00','qa-pos') ON CONFLICT DO NOTHING", ['aud-draft-' + i, id, addDays(nextWeek, i + 1)]);
  });
  // Roles. Employee: James (rich records). Lead: Ana. Manager: Elena (company-wide, from seed-owner). Scoped manager: a
  // Manager limited to West Office with the leave, publish and time-exception permissions. Empty variants: a new
  // employee with no shifts or requests, and a Manager limited to an empty third location.
  const hash = await hashPassword(TEST_PASSWORD);
  await step('lead role', () => q("UPDATE employees SET role='LEAD' WHERE id=$1", [f.actors[2]]));
  const scoped = async (id: string, first: string, last: string, loc: string, grants: string[]) => {
    await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES($1,$2,$3,'555-0190','MANAGER',$4)", [id, first, last, loc]);
    await q('INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false)', [id, hash]);
    await q('INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [id, loc]);
    const owner = await fixtureProof(ex, 'QAOWNER');
    const view = await readOwnerOperationalScope(owner, id, ex);
    if (view.state !== 'ready') throw Error('scope view ' + view.state);
    const c = view.data.current;
    const r = await assignOperationalScope(owner, id, {action: 'ASSIGN', operationId: randomUUID(), expectedEmployeeVersion: c.employeeUpdatedAt, expectedRoleGeneration: c.roleGeneration, expectedScopeRevision: c.scopeRevision, scope: {mode: 'LOCATIONS', locationIds: [loc]}}, ex);
    if (r.state !== 'saved') throw Error('scope ' + r.state);
    for (const g of grants) await grantOwnedManagerWorkforcePermission(ex, id, loc, g as never);
  };
  await step('scoped manager (West Office)', () => scoped('AUD-SCOPED', 'Daniel', 'Fictional-Reyes', 'loc-2', ['APPROVE_LEAVE', 'PUBLISH_SCHEDULE', 'REVIEW_TIME_EXCEPTION']));
  await step('empty location', () => q("INSERT INTO locations(id,name,short_name) VALUES('loc-aud-empty','Harbor Kiosk','Harbor')"));
  await step('scoped manager (empty location)', () => scoped('AUD-EMPTYMGR', 'Irene', 'Fictional-Paz', 'loc-aud-empty', ['APPROVE_LEAVE', 'PUBLISH_SCHEDULE']));
  await step('new employee', async () => {
    await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('AUD-NEW','Nora','Fictional-Lugo','555-0191','EMPLOYEE','loc-1')");
    await q("INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES('AUD-NEW',$1,false)", [hash]);
    await q("INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES('AUD-NEW','loc-1') ON CONFLICT DO NOTHING");
  });
  // Clocker: fictional kiosk keys and PINs. A tablet is enrolled by the driver with a token from clockerEnrollment.
  const ownerProof = await fixtureProof(ex, 'QAOWNER');
  const owner = {employeeId: 'QAOWNER', sessionTokenHash: ownerProof.sessionTokenHash};
  await step('clocker keys', async () => {
    await q("UPDATE locations SET clocker_key='aud-kiosk-main' WHERE id='loc-1'");
    await q("UPDATE locations SET clocker_key='aud-kiosk-west' WHERE id='loc-2'");
  });
  await step('clocker pins', async () => {
    const key = Buffer.from('ab'.repeat(32), 'hex');
    await setEmployeeClockerPin(owner, {employeeId: f.actors[1], pin: '2468', expectedVersion: 0}, key, ex);
  });
  const people = [...names.map(([a, b]) => `${a} ${b}`), ...names.flat(), ...OWNER_PEOPLE.flatMap(p => [p.first, p.last, `${p.first} ${p.last}`]),
    'Fictional Owner', 'Fictional', 'Owner', 'Daniel Fictional-Reyes', 'Irene Fictional-Paz', 'Nora Fictional-Lugo', 'Harbor Kiosk'];
  const rows = async (text: string) => { const r = await q(text) as unknown; return (Array.isArray(r) ? r : (r as {rows: unknown[]}).rows) as Record<string, string>[]; };
  for (const r of await rows('SELECT name FROM locations UNION SELECT name FROM positions UNION SELECT name FROM workspaces').catch(() => [])) if (r.name) people.push(r.name);
  return {
    logins: {owner: 'QAOWNER', manager: 'OWN-ELENA', 'scoped-manager': 'AUD-SCOPED', 'empty-manager': 'AUD-EMPTYMGR', lead: f.actors[2], employee: f.actors[1], 'new-employee': 'AUD-NEW', public: null, clocker: null},
    week, nextWeek, today, actors: f.actors, peopleData: [...new Set(people)].filter(Boolean), setupLog,
    ids: {employee: f.actors[1], lead: f.actors[2], person: f.actors[0], week, nextWeek, location: 'loc-1', clockerJames: f.actors[1]},
    clockerEnrollment: async (locationId: string) => (await registerClockerDevice(owner, {name: 'Audit tablet ' + locationId, locationId}, ex)).enrollmentToken,
  };
}
