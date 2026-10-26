/**
 * Phase A of the fictional demo company "Isla Verde Cafés (fictional)": structure.
 *
 * Run after `npm run setup:company`, against the same database, with every
 * private value in an env file (never on the command line):
 *
 *   node --env-file=<demo env file> --conditions=react-server \
 *     --import ./scripts/node-server-context.mjs --import tsx scripts/seed-demo-company.mts
 *
 * Required environment:
 *   DATABASE_URL               the demo database (name nevora_demo or nevora_demo*)
 *   NEVORA_DEMO_PASSWORD       sign-in password for every seeded person (not the Owner)
 *   NEVORA_DEMO_ACCOUNTS_FILE  where to write the account list (IDs and roles, no passwords)
 * Optional: NEVORA_SETUP_ENVIRONMENT (production is refused).
 *
 * Writes go through the app's own services wherever an invariant exists
 * (locations, positions, people and Manager scope, rule profiles, hour targets,
 * shift policy, break types, Clocker devices, availability, shifts and
 * publication). Recorded punches are inserted directly, as the owned fixtures
 * do; the BEFORE INSERT trigger captures each entry's schedule context.
 * Fictional data only. No notification is delivered: this script never runs a
 * notification or push worker, and it never prints a password.
 *
 * A second run refuses: the seeded IDs already exist. Reset by recreating the
 * database and running setup:company again (see docs/product/specs/codex-joint/DEMO-DATABASE.md).
 */
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import pg from 'pg';
import type { SqlExecutor, SqlStatement } from '../src/lib/notifications/types';
import type { SessionMutationProof } from '../src/lib/shift-changes/types';
import { hashPassword } from '../src/lib/auth/password';
import { businessDate } from '../src/lib/business-time';
import { addDays, weekStartFor } from '../src/lib/date-utils';
import { createLocation } from '../src/lib/data/locations';
import { createPosition } from '../src/lib/data/positions';
import { createEmployeeWithAccess } from '../src/lib/company-access/employee-profile.server';
import { saveScheduleHealthSettings, createCoverageWindow } from '../src/lib/data/schedule-health';
import { saveShiftChangePolicy, saveOperationalRuleProfile } from '../src/lib/data/shift-change-policy';
import { replaceAvailability } from '../src/lib/data/availability';
import { insertShiftAtLocation } from '../src/lib/data/schedules';
import { publishScheduleWithRevision } from '../src/lib/data/publication-revisions';
import { saveBreakType } from '../src/lib/clocker/break-types.server';
import { registerClockerDevice, redeemClockerEnrollment } from '../src/lib/clocker/devices.server';

const TIME_ZONE = 'America/Puerto_Rico';

// ---------------------------------------------------------------- guards
function fail(message: string): never { throw new Error(message); }
const env = process.env;
if (env.NEVORA_SETUP_ENVIRONMENT === 'production') fail('Refusing: NEVORA_SETUP_ENVIRONMENT=production. The demo seed is for development databases only.');
const databaseUrl = env.DATABASE_URL ?? fail('DATABASE_URL is required (load it with --env-file).');
let target: URL;
try { target = new URL(databaseUrl); } catch { fail('DATABASE_URL is not a valid PostgreSQL URL.'); }
if (!['postgres:', 'postgresql:'].includes(target.protocol)) fail('DATABASE_URL is not a PostgreSQL URL.');
const databaseName = decodeURIComponent(target.pathname.slice(1));
const demoName = (name: string) => name === 'nevora_demo' || name.startsWith('nevora_demo');
if (!demoName(databaseName)) fail('Refusing: the database name must be nevora_demo or start with nevora_demo.');
const password = env.NEVORA_DEMO_PASSWORD ?? '';
if (password.length < 12) fail('NEVORA_DEMO_PASSWORD (at least 12 characters) is required in the env file.');
const accountsFile = env.NEVORA_DEMO_ACCOUNTS_FILE ?? fail('NEVORA_DEMO_ACCOUNTS_FILE is required (a JSON output path).');

// ---------------------------------------------------------------- database
const client = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 15000, application_name: 'nevora-demo-seed' });
const executor: SqlExecutor = {
  async query<T>(statement: SqlStatement) {
    const result = await client.query(statement.text, [...statement.values]) as pg.QueryResult | pg.QueryResult[];
    return (Array.isArray(result) ? result.at(-1)?.rows ?? [] : result.rows) as T[];
  },
  async transaction(statements: readonly SqlStatement[]) {
    await client.query('BEGIN');
    try {
      const rows: unknown[][] = [];
      for (const statement of statements) {
        const result = await client.query(statement.text, [...statement.values]) as pg.QueryResult | pg.QueryResult[];
        rows.push(Array.isArray(result) ? result.at(-1)?.rows ?? [] : result.rows);
      }
      await client.query('COMMIT');
      return rows;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    }
  },
};
const q = <T = Record<string, unknown>,>(text: string, values: unknown[] = []) => executor.query<T>({ text, values });

/** One short-lived session row per seeding actor. The random token is never kept,
 * so the row can authorize only this run's service calls; the rows are deleted at the end. */
const proofs = new Map<string, SessionMutationProof>();
async function proof(employeeId: string): Promise<SessionMutationProof> {
  const cached = proofs.get(employeeId);
  if (cached) return cached;
  const [employee] = await q<SessionMutationProof['employee']>('SELECT id,first_name AS "firstName",last_name AS "lastName",role,primary_location_id AS "primaryLocationId" FROM employees WHERE id=$1', [employeeId]);
  if (!employee) fail(`Seeding actor ${employeeId} is missing.`);
  const sessionTokenHash = createHash('sha256').update('nevora-demo-seed:' + randomBytes(32).toString('hex')).digest('hex');
  await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,$2,now()+interval '2 hours')", [sessionTokenHash, employeeId]);
  const value = { employee, sessionTokenHash };
  proofs.set(employeeId, value);
  return value;
}

// ---------------------------------------------------------------- fictional company
type Role = 'OWNER' | 'MANAGER' | 'LEAD' | 'EMPLOYEE';
type LocationKey = 'condado' | 'viejo' | 'santurce' | 'rio' | 'aeropuerto';
type PositionKey = 'barista' | 'cashier' | 'kitchen' | 'bakery';
const LOCATIONS: { key: Exclude<LocationKey, 'condado'>; name: string; shortName: string; clockerKey: string }[] = [
  { key: 'viejo', name: 'Isla Verde Viejo San Juan', shortName: 'Viejo San Juan', clockerKey: 'viejo-san-juan' },
  { key: 'santurce', name: 'Isla Verde Santurce', shortName: 'Santurce', clockerKey: 'santurce' },
  { key: 'rio', name: 'Isla Verde Río Piedras', shortName: 'Río Piedras', clockerKey: 'rio-piedras' },
  { key: 'aeropuerto', name: 'Isla Verde Cafetería y Tostaduría Artesanal del Aeropuerto Internacional Luis Muñoz Marín, Terminal B (fictional)', shortName: 'Aeropuerto LMM', clockerKey: 'aeropuerto-lmm' },
];
const POSITIONS: { key: PositionKey; name: string }[] = [
  { key: 'barista', name: 'Barista' }, { key: 'cashier', name: 'Cashier' },
  { key: 'kitchen', name: 'Kitchen' }, { key: 'bakery', name: 'Pastelería' },
];
type Pattern = 'A' | 'B' | 'C';
type Person = {
  id: string; firstName: string; lastName: string; role: Role; location: LocationKey; position: PositionKey;
  scope?: 'COMPANY' | LocationKey[]; days?: number[]; pattern?: Pattern; availability?: boolean;
};
// days: 0=Mon … 6=Sun within the week. Patterns: A 06:00–14:00, B 10:00–18:00, C 14:00–22:00.
const weekdays = [0, 1, 2, 3, 4], midweek = [2, 3, 4, 5, 6], mixed = [0, 1, 4, 5, 6];
const PEOPLE: Person[] = [
  { id: 'IVC-201', firstName: 'Ramón', lastName: 'Agosto Vélez', role: 'MANAGER', location: 'condado', position: 'barista', scope: 'COMPANY' },
  { id: 'IVC-202', firstName: 'Lucía', lastName: 'Santiago Báez', role: 'MANAGER', location: 'santurce', position: 'cashier', scope: ['condado', 'santurce'] },
  { id: 'IVC-203', firstName: 'Ángel', lastName: 'Rivera Muñiz', role: 'MANAGER', location: 'viejo', position: 'kitchen', scope: ['viejo', 'aeropuerto'] },
  { id: 'IVC-301', firstName: 'Noemí', lastName: 'Cruz Peña', role: 'LEAD', location: 'condado', position: 'barista', days: weekdays, pattern: 'A' },
  { id: 'IVC-302', firstName: 'Iván', lastName: 'Colón Ortiz', role: 'LEAD', location: 'santurce', position: 'barista', days: midweek, pattern: 'B' },
  { id: 'IVC-303', firstName: 'Sofía', lastName: 'Martínez Nieves', role: 'LEAD', location: 'viejo', position: 'cashier', days: mixed, pattern: 'A' },
  // Condado (the first six are the shift-change cast; see the scenario block in the accounts file)
  { id: 'IVC-401', firstName: 'José Ángel', lastName: 'Rodríguez Pagán', role: 'EMPLOYEE', location: 'condado', position: 'barista', days: weekdays, pattern: 'B' },
  { id: 'IVC-402', firstName: 'María Inés', lastName: 'Peña Torres', role: 'EMPLOYEE', location: 'condado', position: 'barista', days: midweek, pattern: 'B' },
  { id: 'IVC-403', firstName: 'Héctor', lastName: 'Ramírez Ocasio', role: 'EMPLOYEE', location: 'condado', position: 'cashier', days: mixed, pattern: 'C' },
  { id: 'IVC-404', firstName: 'Yaritza', lastName: 'Figueroa Díaz', role: 'EMPLOYEE', location: 'condado', position: 'cashier', days: weekdays, pattern: 'C' },
  { id: 'IVC-405', firstName: 'Begoña', lastName: 'Quiñones Laboy', role: 'EMPLOYEE', location: 'condado', position: 'kitchen', days: midweek, pattern: 'A' },
  { id: 'IVC-406', firstName: 'María de los Ángeles', lastName: 'Concepción Rodríguez-Villanueva de la Torre y Santiago', role: 'EMPLOYEE', location: 'condado', position: 'bakery', days: weekdays, pattern: 'A' },
  // Viejo San Juan
  { id: 'IVC-407', firstName: 'Andrés', lastName: 'Maldonado Ríos', role: 'EMPLOYEE', location: 'viejo', position: 'barista', days: weekdays, pattern: 'B' },
  { id: 'IVC-408', firstName: 'Zoé', lastName: 'Hernández Lugo', role: 'EMPLOYEE', location: 'viejo', position: 'barista', days: midweek, pattern: 'C' },
  { id: 'IVC-409', firstName: 'Raúl', lastName: 'Vázquez Acevedo', role: 'EMPLOYEE', location: 'viejo', position: 'kitchen', days: mixed, pattern: 'A' },
  { id: 'IVC-410', firstName: 'Mónica', lastName: 'Ortega Cintrón', role: 'EMPLOYEE', location: 'viejo', position: 'bakery', days: weekdays, pattern: 'A' },
  { id: 'IVC-411', firstName: 'Tomás', lastName: 'Echevarría Ruiz', role: 'EMPLOYEE', location: 'viejo', position: 'cashier', days: midweek, pattern: 'B', availability: false },
  // Santurce
  { id: 'IVC-412', firstName: 'Ana Lucía', lastName: 'Morales Feliciano', role: 'EMPLOYEE', location: 'santurce', position: 'barista', days: weekdays, pattern: 'A' },
  { id: 'IVC-413', firstName: 'Iñaki', lastName: 'Soto Marrero', role: 'EMPLOYEE', location: 'santurce', position: 'cashier', days: mixed, pattern: 'B' },
  { id: 'IVC-414', firstName: 'Génesis', lastName: 'Burgos Rosario', role: 'EMPLOYEE', location: 'santurce', position: 'kitchen', days: midweek, pattern: 'C' },
  { id: 'IVC-415', firstName: 'Jesús', lastName: 'Alicea Serrano', role: 'EMPLOYEE', location: 'santurce', position: 'bakery', days: weekdays, pattern: 'A' },
  { id: 'IVC-416', firstName: 'Paola', lastName: 'Matos Cordero', role: 'EMPLOYEE', location: 'santurce', position: 'barista', days: midweek, pattern: 'B' },
  // Río Piedras
  { id: 'IVC-417', firstName: 'Óscar', lastName: 'Rosado Medina', role: 'EMPLOYEE', location: 'rio', position: 'barista', days: weekdays, pattern: 'A' },
  { id: 'IVC-418', firstName: 'Nayeli', lastName: 'Pérez Galarza', role: 'EMPLOYEE', location: 'rio', position: 'cashier', days: midweek, pattern: 'B' },
  { id: 'IVC-419', firstName: 'Efraín', lastName: 'Carrasquillo Otero', role: 'EMPLOYEE', location: 'rio', position: 'kitchen', days: mixed, pattern: 'C', availability: false },
  { id: 'IVC-420', firstName: 'Mariela', lastName: 'Domínguez Rivera', role: 'EMPLOYEE', location: 'rio', position: 'bakery', days: weekdays, pattern: 'A' },
  // Aeropuerto
  { id: 'IVC-421', firstName: 'Julián', lastName: 'Negrón Santos', role: 'EMPLOYEE', location: 'aeropuerto', position: 'barista', days: weekdays, pattern: 'A' },
  { id: 'IVC-422', firstName: 'Verónica', lastName: 'Lebrón Arroyo', role: 'EMPLOYEE', location: 'aeropuerto', position: 'cashier', days: midweek, pattern: 'B' },
  { id: 'IVC-423', firstName: 'Gonzalo', lastName: 'Miranda Toledo', role: 'EMPLOYEE', location: 'aeropuerto', position: 'kitchen', days: mixed, pattern: 'C' },
];
const PATTERN_TIMES: Record<Pattern, [string, string]> = { A: ['06:00', '14:00'], B: ['10:00', '18:00'], C: ['14:00', '22:00'] };
// Story cast (all at Condado): swaps 401↔402 and 403↔404, coverage offers by 405 and 406, a callout by 401.
const SCENARIO = {
  swaps: [['IVC-401', 'IVC-402'], ['IVC-403', 'IVC-404']],
  coverage: ['IVC-405', 'IVC-406'],
  callout: 'IVC-301',
  clockedInNow: ['IVC-412', 'IVC-417'],
  onBreakNow: 'IVC-421',
};
const NOW_PEOPLE = new Set([...SCENARIO.clockedInNow, SCENARIO.onBreakNow]);
const CAST = new Set([...SCENARIO.swaps.flat(), ...SCENARIO.coverage, SCENARIO.callout, ...NOW_PEOPLE]);

// ---------------------------------------------------------------- helpers
const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (minutes: number) => `${pad(Math.floor(((minutes % 1440) + 1440) % 1440 / 60))}:${pad(((minutes % 60) + 60) % 60)}`;
const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
// Deterministic jitter so a re-seeded database looks the same.
let seed = 20261025;
const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const between = (low: number, high: number) => low + Math.floor(random() * (high - low + 1));
function check<T>(result: T, label: string): T {
  const state = (result as { state?: string; status?: string } | null)?.state ?? (result as { status?: string } | null)?.status;
  if (state && !['saved', 'ready'].includes(state)) fail(`${label} failed: ${JSON.stringify(result)}`);
  return result;
}

try {
  await client.connect();
  const [{ name: actualName }] = await q<{ name: string }>('SELECT current_database() AS name');
  if (!demoName(actualName)) fail('Refusing: the connected database is not a nevora_demo database.');
  const [workspace] = await q<{ id: string; name: string; timeZone: string }>('SELECT id,name,time_zone AS "timeZone" FROM workspaces WHERE singleton AND active');
  if (!workspace) fail('Run npm run setup:company first: no configured company.');
  if (workspace.timeZone !== TIME_ZONE) fail(`The demo company must use ${TIME_ZONE}.`);
  const [adoption] = await q<{ state: string }>('SELECT state FROM company_access_adoption');
  if (adoption?.state !== 'ENFORCED') fail('Company Access is not adopted; run the full setup:company install.');
  const owners = await q<{ id: string }>("SELECT id FROM employees WHERE role='OWNER' AND active ORDER BY id");
  if (owners.length !== 1) fail('Expected exactly one active Owner from setup:company.');
  const ownerId = owners[0].id;
  const existing = await q<{ n: number }>('SELECT count(*)::int AS n FROM employees WHERE id=ANY($1::text[])', [PEOPLE.map(p => p.id)]);
  if (existing[0].n > 0) fail('Refusing a second run: the demo people already exist. Recreate the database, run setup:company, then seed again.');
  const [initial] = await q<{ id: string }>('SELECT id FROM locations WHERE workspace_id=$1 AND active ORDER BY name LIMIT 2', [workspace.id]);
  const locationCount = await q<{ n: number }>('SELECT count(*)::int AS n FROM locations WHERE workspace_id=$1', [workspace.id]);
  if (locationCount[0].n !== 1) fail('Refusing: expected only the initial location from setup:company.');
  const owner = await proof(ownerId);
  const log = (message: string) => console.log(`[phase A] ${message}`);

  // 1. Company basics: locations, positions, break types, one Clocker tablet per location.
  const locationIds = { condado: initial.id } as Record<LocationKey, string>;
  for (const location of LOCATIONS) {
    const created = await createLocation({ name: location.name, shortName: location.shortName, clockerKey: location.clockerKey, actorEmployeeId: ownerId, proof: owner }, executor);
    locationIds[location.key] = created.id;
  }
  const positionIds = {} as Record<PositionKey, string>;
  for (const position of POSITIONS) positionIds[position.key] = (await createPosition({ name: position.name, actorEmployeeId: ownerId, proof: owner }, executor)).id;
  log('5 locations and 4 positions ready');
  const clockerOwner = { employeeId: ownerId, sessionTokenHash: owner.sessionTokenHash };
  const rest = await saveBreakType(clockerOwner, { name: 'Rest break', category: 'REST', targetMinutes: 10, active: true, expectedVersion: 0 }, executor);
  const meal = await saveBreakType(clockerOwner, { name: 'Meal', category: 'MEAL', targetMinutes: 30, active: true, expectedVersion: 0 }, executor);
  const deviceIds = {} as Record<LocationKey, string>;
  const locationKeys = await q<{ id: string; key: string }>('SELECT id,clocker_key AS key FROM locations WHERE workspace_id=$1', [workspace.id]);
  for (const [key, id] of Object.entries(locationIds) as [LocationKey, string][]) {
    const pending = await registerClockerDevice(clockerOwner, { name: 'Front counter tablet', locationId: id }, executor);
    // The enrollment is redeemed here so the device is active; its credential is discarded, not stored or printed.
    await redeemClockerEnrollment({ enrollmentToken: pending.enrollmentToken, locationKey: locationKeys.find(l => l.id === id)!.key }, executor);
    deviceIds[key] = pending.device.id;
  }
  log('break types and Clocker tablets ready');

  // 2. People, with Manager scope assigned by the Owner at creation.
  const passwordHash = await hashPassword(password);
  const scheduled = PEOPLE.filter(p => p.role === 'LEAD' || p.role === 'EMPLOYEE');
  for (const [index, person] of PEOPLE.entries()) {
    const eligible = person.role === 'MANAGER' && person.scope !== 'COMPANY' ? (person.scope as LocationKey[]).map(k => locationIds[k]) : [locationIds[person.location]];
    const positions = person.role === 'MANAGER' ? [] : [positionIds[person.position], ...(person.position === 'barista' ? [positionIds.cashier] : [])];
    const result = await createEmployeeWithAccess(owner, {
      operationId: randomUUID(),
      employee: { id: person.id, firstName: person.firstName, lastName: person.lastName, phone: `78755501${pad(index + 1)}`,
        email: `${person.id.toLowerCase()}@example.invalid`, role: person.role, primaryLocationId: locationIds[person.location],
        eligibleLocationIds: eligible, positionIds: positions },
      ...(person.role === 'MANAGER' ? { initialManagerScope: person.scope === 'COMPANY' ? { mode: 'COMPANY', locationIds: [] } : { mode: 'LOCATIONS', locationIds: eligible } } : {}),
    } as Parameters<typeof createEmployeeWithAccess>[1], executor);
    check(result, `Create ${person.id}`);
    await q('INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false)', [person.id, passwordHash]);
  }
  // The Owner can work every location (for Clocker and schedule views).
  await q('INSERT INTO employee_location_eligibility(employee_id,location_id) SELECT $1,unnest($2::text[]) ON CONFLICT DO NOTHING', [ownerId, Object.values(locationIds)]);
  log(`${PEOPLE.length + 1} people ready (1 Owner, 3 Managers, 3 Leads, 23 Employees)`);

  // 3. Scheduling inputs: staffing, hour targets, reviewed rule profiles, shift-change policy, coverage windows.
  await saveScheduleHealthSettings({
    staffingSettings: Object.values(locationIds).map(locationId => ({ locationId, minimumStaffPerShift: 1, requiresDesignatedLead: false })),
    hourTargets: scheduled.map(p => ({ employeeId: p.id, targetWeeklyHours: 40, maximumWeeklyHours: 48 })),
    proof: owner,
  }, executor);
  const reviewed = { status: 'NOT_APPLICABLE' } as const;
  for (const person of scheduled) {
    check(await saveOperationalRuleProfile({ proof: owner, employeeId: person.id, expectedRevision: 0,
      replacement: { minimumRest: reviewed, maximumShift: reviewed, maximumDaily: reviewed, breaks: reviewed, projectedOvertime: reviewed } as unknown as Parameters<typeof saveOperationalRuleProfile>[0]['replacement'] }, executor), `Rule profile ${person.id}`);
  }
  for (const scope of ['swap', 'coverage'] as const) {
    check(await saveShiftChangePolicy({ proof: owner, expectedRevision: 0, scope, replacement: { mode: 'MANAGER_REVIEW', submissionAdvanceMinutes: 0, completionAdvanceMinutes: 0 } }, executor), `Shift policy ${scope}`);
  }
  for (const locationId of Object.values(locationIds)) {
    for (let day = 0; day < 7; day++) await createCoverageWindow({ locationId, dayOfWeek: day, startTime: '06:00', endTime: '22:00', minimumStaff: 1, positionRequirements: [], actorEmployeeId: ownerId, proof: owner }, executor);
  }
  log('staffing, rule profiles, Manager-review shift policy and coverage windows ready');

  // 4. Availability: weekly windows for most, two people with none, one dated exception next week.
  const today = businessDate(new Date(), TIME_ZONE);
  const currentWeek = weekStartFor(today), previousWeek = addDays(currentWeek, -7), olderWeek = addDays(currentWeek, -14), nextWeek = addDays(currentWeek, 7);
  for (const person of scheduled.filter(p => p.availability !== false)) {
    const [start, end] = person.pattern === 'C' ? ['12:00', '23:00'] : person.pattern === 'B' ? ['08:00', '20:00'] : ['05:00', '16:00'];
    const windows = Array.from({ length: 7 }, (_, d) => ({ dayOfWeek: d, startTime: start, endTime: end }));
    await replaceAvailability(person.id, windows, await proof(person.id), executor);
  }
  const submitted = scheduled.filter(p => p.availability !== false).slice(0, 20);
  for (const person of submitted) await q('INSERT INTO weekly_availability_submissions(week_start,employee_id,submitted_at,updated_at,uses_normal_availability) VALUES($1,$2,now(),now(),true) ON CONFLICT DO NOTHING', [nextWeek, person.id]);
  await q("INSERT INTO availability_exceptions(id,employee_id,date,kind,start_time,end_time,note) VALUES($1,'IVC-407',$2,'UNAVAILABLE',NULL,NULL,'Fictional university exam')", [randomUUID(), addDays(nextWeek, 2)]);
  log(`availability for ${scheduled.length - 2} people, 2 with none, 1 exception; ${submitted.length} submitted next week`);

  // 5. Four weeks of shifts: two past weeks, the current week and next week (left as a draft).
  const nowMinutes = (() => { const t = new Date().toLocaleTimeString('en-GB', { timeZone: TIME_ZONE, hour12: false }); return minutesOf(t); })();
  type Planned = { personId: string; locationKey: LocationKey; date: string; start: string; end: string; weekStart: string };
  const planned: Planned[] = [];
  for (const weekStart of [olderWeek, previousWeek, currentWeek, nextWeek]) {
    for (const person of scheduled) {
      for (const offset of person.days ?? weekdays) {
        const date = addDays(weekStart, offset);
        let [start, end] = PATTERN_TIMES[person.pattern ?? 'A'];
        if (date === today && NOW_PEOPLE.has(person.id)) {
          // A shift that is under way right now (overnight shifts are allowed).
          const startMinutes = Math.max(0, Math.floor(nowMinutes / 60) * 60 - 120);
          [start, end] = [hhmm(startMinutes), hhmm(startMinutes + 480)];
        }
        planned.push({ personId: person.id, locationKey: person.location, date, start, end, weekStart });
      }
    }
    // The three "clocked in now" people also work today even when it is their day off.
    if (weekStart === currentWeek) {
      for (const id of NOW_PEOPLE) {
        if (planned.some(p => p.personId === id && p.date === today)) continue;
        const person = scheduled.find(p => p.id === id)!;
        const startMinutes = Math.max(0, Math.floor(nowMinutes / 60) * 60 - 120);
        planned.push({ personId: id, locationKey: person.location, date: today, start: hhmm(startMinutes), end: hhmm(startMinutes + 480), weekStart });
      }
      // Early in the week (for example Monday before the first shifts end) there may be fewer than three
      // finished current-week shifts to leave without a clock-out. Then add short, already-finished
      // "closing inventory" shifts today for people outside the shift-change cast.
      const finishedPeople = new Set(planned.filter(p => p.weekStart === currentWeek && !CAST.has(p.personId) &&
        (p.date < today || (p.date === today && minutesOf(p.end) > minutesOf(p.start) && minutesOf(p.end) <= nowMinutes - 15))).map(p => p.personId));
      const inventoryEnd = Math.floor((nowMinutes - 30) / 15) * 15, inventoryStart = Math.max(0, inventoryEnd - 120);
      for (const person of scheduled.filter(p => !CAST.has(p.id) && !finishedPeople.has(p.id) && !planned.some(s => s.personId === p.id && s.date === today))) {
        if (finishedPeople.size >= 3 || inventoryEnd - inventoryStart < 30) break;
        planned.push({ personId: person.id, locationKey: person.location, date: today, start: hhmm(inventoryStart), end: hhmm(inventoryEnd), weekStart });
        finishedPeople.add(person.id);
      }
    }
  }
  const shiftIds = new Map<Planned, string>();
  for (const [index, shift] of planned.entries()) {
    const person = scheduled.find(p => p.id === shift.personId)!;
    const id = await insertShiftAtLocation({ locationId: locationIds[shift.locationKey], weekStart: shift.weekStart, employeeId: shift.personId, date: shift.date,
      startTime: shift.start, endTime: shift.end, positionId: positionIds[person.position], isDesignatedLead: person.role === 'LEAD',
      actorEmployeeId: ownerId, proof: owner }, executor);
    shiftIds.set(shift, id);
    if ((index + 1) % 100 === 0) log(`${index + 1}/${planned.length} shifts`);
  }
  for (const weekStart of [olderWeek, previousWeek, currentWeek]) {
    for (const locationId of Object.values(locationIds)) {
      const result = await publishScheduleWithRevision({ locationId, weekStart, managerId: ownerId, proof: owner }, executor);
      if (!result.published) fail(`Publishing ${weekStart} failed.`);
    }
  }
  log(`${planned.length} shifts; ${olderWeek}, ${previousWeek} and ${currentWeek} published, ${nextWeek} left as a draft`);

  // 6. Recorded time with breaks for both past weeks and the current week to date.
  const nowInstant = Date.now();
  const instant = async (date: string, time: string, overnight = false) => {
    const [row] = await q<{ at: Date }>(`SELECT ((($1::date + $3::int) || ' ' || $2)::timestamp AT TIME ZONE '${TIME_ZONE}') AS at`, [date, time, overnight ? 1 : 0]);
    return row.at.getTime();
  };
  const breakSnapshot = (type: typeof rest) => ({ id: type.id, version: type.version, name: type.name, category: type.category, targetMinutes: type.targetMinutes });
  let entries = 0, breaks = 0;
  type Finished = Planned & { startAt: number; endAt: number };
  const finished: Finished[] = [];
  for (const shift of planned.filter(p => p.weekStart !== nextWeek)) {
    if (NOW_PEOPLE.has(shift.personId) && shift.date === today) continue; // under way: handled below
    const overnight = minutesOf(shift.end) <= minutesOf(shift.start);
    const startAt = await instant(shift.date, shift.start), endAt = await instant(shift.date, shift.end, overnight);
    if (endAt <= nowInstant) finished.push({ ...shift, startAt, endAt }); // future and in-progress shifts get no punches
  }
  // Three missing clock-outs: the latest finished current-week shift of three people outside the shift-change cast.
  const latest = new Map<string, Finished>();
  for (const shift of finished.filter(s => s.weekStart === currentWeek && !CAST.has(s.personId))) {
    if ((latest.get(shift.personId)?.endAt ?? 0) < shift.endAt) latest.set(shift.personId, shift);
  }
  const missing = new Set([...latest.values()].sort((a, b) => b.endAt - a.endAt).slice(0, 3));
  const openPeople = new Set<string>();
  for (const shift of finished) {
    const inAt = shift.startAt + between(-7, 6) * 60_000, outAt = shift.endAt + between(-5, 8) * 60_000;
    const id = randomUUID(), location = locationIds[shift.locationKey], open = missing.has(shift);
    await q('INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version) VALUES($1,$2,$3,$4,$5,$6,$7,1)',
      [id, shift.personId, location, deviceIds[shift.locationKey], new Date(inAt), open ? null : new Date(outAt), open ? 'CLOCKED_IN' : 'CLOCKED_OUT']);
    entries++;
    if (open) { openPeople.add(shift.personId); continue; }
    if (random() < 0.62) {
      const mealStart = inAt + (225 + between(0, 45)) * 60_000;
      await q('INSERT INTO break_entries(id,time_entry_id,break_start_at,break_end_at,break_type_id,break_type_snapshot,version) VALUES($1,$2,$3,$4,$5,$6,1)',
        [randomUUID(), id, new Date(mealStart), new Date(mealStart + between(30, 36) * 60_000), meal.id, JSON.stringify(breakSnapshot(meal))]);
      breaks++;
    }
    if (random() < 0.18) {
      const restStart = inAt + (100 + between(0, 30)) * 60_000;
      await q('INSERT INTO break_entries(id,time_entry_id,break_start_at,break_end_at,break_type_id,break_type_snapshot,version) VALUES($1,$2,$3,$4,$5,$6,1)',
        [randomUUID(), id, new Date(restStart), new Date(restStart + between(9, 12) * 60_000), rest.id, JSON.stringify(breakSnapshot(rest))]);
      breaks++;
    }
  }
  if (missing.size < 3) console.warn(`[phase A] warning: only ${missing.size} missing clock-outs; the current week has too few finished shifts (run Tuesday–Saturday for the full scenario).`);
  // Two people clocked in now and one on break, on shifts that are under way.
  for (const id of NOW_PEOPLE) {
    const shift = planned.find(p => p.personId === id && p.date === today)!;
    const startAt = await instant(shift.date, shift.start);
    const inAt = Math.min(startAt + between(-5, 4) * 60_000, nowInstant - 20 * 60_000);
    const entryId = randomUUID(), onBreak = id === SCENARIO.onBreakNow;
    await q('INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version) VALUES($1,$2,$3,$4,$5,NULL,$6,1)',
      [entryId, id, locationIds[shift.locationKey], deviceIds[shift.locationKey], new Date(inAt), onBreak ? 'ON_BREAK' : 'CLOCKED_IN']);
    entries++;
    if (onBreak) {
      await q('INSERT INTO break_entries(id,time_entry_id,break_start_at,break_end_at,break_type_id,break_type_snapshot,version) VALUES($1,$2,$3,NULL,$4,$5,1)',
        [randomUUID(), entryId, new Date(nowInstant - 8 * 60_000), meal.id, JSON.stringify(breakSnapshot(meal))]);
      breaks++;
    }
  }
  await q('INSERT INTO clocker_employee_clock_state(employee_id) SELECT DISTINCT employee_id FROM time_entries ON CONFLICT DO NOTHING');
  log(`${entries} time entries with ${breaks} breaks; ${missing.size} missing clock-outs, 2 clocked in now, 1 on break`);

  // 7. Account list (IDs and roles only) for phase B and for people trying the demo.
  const accountRows = await q<{ id: string; firstName: string; lastName: string; role: Role; location: string }>(
    'SELECT e.id,e.first_name AS "firstName",e.last_name AS "lastName",e.role,l.short_name AS location FROM employees e JOIN locations l ON l.id=e.primary_location_id ORDER BY e.id');
  const scopeOf = (id: string) => { const p = PEOPLE.find(x => x.id === id); return p?.role === 'MANAGER' ? (p.scope === 'COMPANY' ? 'COMPANY' : (p.scope as LocationKey[]).map(k => LOCATIONS.find(l => l.key === k)?.shortName ?? 'Condado')) : undefined; };
  const accounts = {
    company: workspace.name, timeZone: TIME_ZONE, database: databaseName, generatedAt: new Date().toISOString(),
    passwords: 'Not stored here. The Owner signs in with BOOTSTRAP_PASSWORD and everyone else with NEVORA_DEMO_PASSWORD, from the env file.',
    weeks: { older: olderWeek, previous: previousWeek, current: currentWeek, next: nextWeek, today },
    accounts: accountRows.map(r => ({ employeeId: r.id, name: `${r.firstName} ${r.lastName}`, role: r.role, primaryLocation: r.location, ...(scopeOf(r.id) ? { managerScope: scopeOf(r.id) } : {}) })),
    scenario: { ...SCENARIO, owner: ownerId, companyManager: 'IVC-201', locationManagers: ['IVC-202', 'IVC-203'], missingClockOuts: [...openPeople], withoutAvailability: ['IVC-411', 'IVC-419'], availabilityException: 'IVC-407' },
    locations: Object.fromEntries(Object.entries(locationIds)), positions: positionIds, breakTypes: { rest: rest.id, meal: meal.id },
  };
  await mkdir(dirname(accountsFile), { recursive: true });
  await writeFile(accountsFile, JSON.stringify(accounts, null, 2) + '\n', { mode: 0o600 });
  log(`account list written (${accounts.accounts.length} accounts, no passwords)`);
} catch (error) {
  console.error('[phase A] failed:', error instanceof Error ? error.message : 'unknown error');
  process.exitCode = 1;
} finally {
  // Remove this run's seeding sessions; nothing else is deleted.
  if (proofs.size) await q('DELETE FROM employee_sessions WHERE token_hash=ANY($1::text[])', [[...proofs.values()].map(p => p.sessionTokenHash)]).catch(() => {});
  await client.end().catch(() => {});
}
