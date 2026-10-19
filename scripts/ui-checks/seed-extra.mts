// Extra fictional test data for one session's own preview database.
// Usage (from the main checkout, so tsx resolves):
//   PREVIEW_OUT=<your scratch folder>/preview node --import tsx scripts/ui-checks/seed-extra.mts
//   PREVIEW_OUT=<a second preview folder> node --import tsx scripts/ui-checks/seed-extra.mts --large
// Base: decided time-off requests (approved, partial-day approved, declined, withdrawn), one employee clocked in
// and one on break, the lead with published shifts this week and next, a swap partner (AUDIT-SWAP, next weekend only),
// and a lead with pay statements.
// --large: 200 more people, a location with a very long name, 50 shifts a day this week, and a year of timecards.
// Run --large on a second preview, so the normal screens keep their usual numbers.
// Safety: it writes only to the database that PREVIEW_OUT's own running preview owns, after checking the cluster's
// owner marker. It never prints the password. Re-running it is safe.
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { registerHooks } from 'node:module';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { tmpdir } from 'node:os';

const out = process.env.PREVIEW_OUT ? resolve(process.env.PREVIEW_OUT) : '';
if (!out) throw Error('Set PREVIEW_OUT to your own preview folder');
const large = process.argv.includes('--large');

// 1. Find this preview's database, and prove it is this preview's.
const run = (await readdir(out)).filter(name => name.startsWith('evidence-')).sort().at(-1);
if (!run) throw Error(`No preview run under ${out}`);
const appDir = (await readdir(join(out, run))).find(name => name.startsWith('owned-next-'));
if (!appDir) throw Error('The preview has not started its app yet');
const ownership = JSON.parse(await readFile(join(out, run, appDir, 'ownership.json'), 'utf8'));
if (!String(ownership.root).startsWith(out)) throw Error('ownership.json does not belong to PREVIEW_OUT');
const dbName: string = ownership.identity.name;
const suffix = /^nevora_exchange_test_audit_([0-9a-f]{12})$/.exec(dbName)?.[1];
if (!suffix) throw Error('Unexpected database name');
const cluster = join(process.env.NEVORA_PREVIEW_TMP ?? (process.platform === 'darwin' ? '/private/tmp' : tmpdir()), `nevora-ui-preview-${suffix.slice(0, 10)}`);
const owner = (await readFile(join(cluster, 'owner'), 'utf8')).trim();
if (!owner.startsWith(suffix)) throw Error('Cluster owner marker does not match this preview');
const port = Number((await readFile(join(cluster, 'data', 'postmaster.pid'), 'utf8')).split('\n')[3]);
const client = new pg.Client({ host: '127.0.0.1', port, user: 'nevora_audit', database: dbName });
await client.connect();
const q = (text: string, values: unknown[] = []) => client.query(text, values).then(r => r.rows);
const executor = {
  query: async (statement: { text: string; values?: readonly unknown[] }) => (await client.query(statement.text, statement.values as unknown[])).rows,
  transaction: async (statements: readonly { text: string; values?: readonly unknown[] }[]) => {
    await client.query('BEGIN');
    try { const rows = []; for (const s of statements) rows.push((await client.query(s.text, s.values as unknown[])).rows); await client.query('COMMIT'); return rows; }
    catch (error) { await client.query('ROLLBACK'); throw error; }
  },
};
const hook = registerHooks({ resolve(specifier, context, next) { return next(specifier === 'server-only' ? new URL('../../node_modules/next/dist/compiled/server-only/empty.js', import.meta.url).href : specifier, context); } });
const { publishScheduleWithRevision } = await import(new URL('../../src/test/integration/management-api.ts', import.meta.url).href);
const { businessDate } = await import(new URL('../../src/lib/business-time.ts', import.meta.url).href);
const { weekStartFor, addDays } = await import(new URL('../../src/lib/date-utils.ts', import.meta.url).href);
hook.deregister();

const zone = 'America/Puerto_Rico';
const today = businessDate(new Date(), zone), week = weekStartFor(today), next = addDays(week, 7);
const [{ password_hash: hash }] = await q("SELECT password_hash FROM employee_credentials WHERE employee_id='AUDIT-E'");
const [device] = await q("SELECT id FROM clocker_devices WHERE location_id='loc-1' ORDER BY created_at LIMIT 1");
if (!device) throw Error('No Clocker device at loc-1 in this preview');

async function person(id: string, first: string, last: string, role: string, location = 'loc-1') {
  await q("INSERT INTO employees(id,first_name,last_name,phone,email,role,primary_location_id) VALUES($1,$2,$3,'7875550199',$4,$5,$6) ON CONFLICT (id) DO NOTHING", [id, first, last, id.toLowerCase() + '@example.invalid', role, location]);
  await q('INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false) ON CONFLICT DO NOTHING', [id, hash]);
  await q('INSERT INTO employee_location_eligibility VALUES($1,$2) ON CONFLICT DO NOTHING', [id, location]);
  await q("INSERT INTO employee_positions VALUES($1,'qa-pos') ON CONFLICT DO NOTHING", [id]);
}
async function shifts(scheduleId: string, start: string, people: string[], days: number) {
  for (let d = 0; d < days; d++) for (const id of people)
    await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id,is_designated_lead) VALUES($1,$2,$3,$4,'09:00','17:00','qa-pos',$5) ON CONFLICT (id) DO NOTHING",
      [`x-${scheduleId}-${id}-${d}`, scheduleId, id, addDays(start, d), id === 'AUDIT-LEAD']);
}
const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString();

// 2. Decided time-off requests (the timeline's "Approved by <name> · <date>" and "Withdrawn · <date>").
const requests: [string, string, number, number, string | null, string | null, string, string | null][] = [
  ['x-to-approved', 'AUDIT-E', 20, 21, null, null, 'APPROVED', 'AUDIT-M'],
  ['x-to-partial', 'AUDIT-E', 25, 25, '09:00', '13:00', 'APPROVED', 'QAOWNER'],
  ['x-to-declined', 'AUDIT-E', 30, 31, null, null, 'DENIED', 'AUDIT-M'],
  ['x-to-withdrawn', 'AUDIT-E', 40, 40, null, null, 'CANCELLED', 'AUDIT-E'],
  ['x-to-lead-approved', 'AUDIT-LEAD', 22, 23, null, null, 'APPROVED', 'AUDIT-M'],
];
for (const [id, employee, from, to, startTime, endTime, status, reviewer] of requests)
  await q("INSERT INTO time_off_requests(id,employee_id,start_date,end_date,start_time,end_time,reason,status,reviewed_by,reviewed_at,created_at) VALUES($1,$2,$3,$4,$5,$6,'Fictional appointment',$7,$8,now()-interval '2 days',now()-interval '5 days') ON CONFLICT (id) DO NOTHING",
    [id, employee, addDays(today, from), addDays(today, to), startTime, endTime, status, reviewer]);

// 3. One person clocked in and one on break, both on today's published schedule; the lead's shifts too.
await person('AUDIT-ON', 'Jordan', 'Rivera', 'EMPLOYEE');
await person('AUDIT-BREAK', 'Casey', 'Rivera', 'EMPLOYEE');
await shifts('audit-current', week, ['AUDIT-ON', 'AUDIT-BREAK', 'AUDIT-LEAD'], 7);
await shifts('audit-next', next, ['AUDIT-ON', 'AUDIT-BREAK', 'AUDIT-LEAD'], 5);
// A swap partner: AUDIT-SWAP works only next Saturday and Sunday, so AUDIT-E's weekday shifts and theirs can trade.
await person('AUDIT-SWAP', 'Riley', 'Rivera', 'EMPLOYEE');
for (const d of [5, 6]) await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id,is_designated_lead) VALUES($1,'audit-next','AUDIT-SWAP',$2,'08:00','16:00','qa-pos',false) ON CONFLICT (id) DO NOTHING", [`x-swap-${d}`, addDays(next, d)]);
await publishScheduleWithRevision({ locationId: 'loc-1', weekStart: week, managerId: 'QAOWNER' }, executor);
await publishScheduleWithRevision({ locationId: 'loc-1', weekStart: next, managerId: 'QAOWNER' }, executor);
for (const [id, status, minutes] of [['AUDIT-ON', 'CLOCKED_IN', 120], ['AUDIT-BREAK', 'ON_BREAK', 180]] as const) {
  const open = await q("SELECT id FROM time_entries WHERE employee_id=$1 AND clock_out_at IS NULL", [id]);
  if (open.length) continue;
  const entry = randomUUID();
  await q('INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status,version) VALUES($1,$2,$3,$4,$5,$6,1)', [entry, id, 'loc-1', device.id, at(minutes), status]);
  if (status === 'ON_BREAK') await q('INSERT INTO break_entries(id,time_entry_id,break_start_at,version) VALUES($1,$2,$3,1)', [randomUUID(), entry, at(10)]);
  await q('INSERT INTO clocker_employee_clock_state(employee_id,revision) VALUES($1,1) ON CONFLICT DO NOTHING', [id]);
}

// 4. A lead with pay statements: the payroll fixture's second employee becomes a lead.
await q("UPDATE employees SET role='LEAD', first_name='Robin' WHERE id='payroll-qa-b'");

// 5. Large data, on its own preview.
if (large) {
  const longName = 'Northside Distribution and Customer Service Center at Plaza Las Américas';
  await q("INSERT INTO locations(id,name,short_name,workspace_id,clocker_key,calendar_serial,calendar_modified_at) VALUES('loc-large',$1,'Plaza Las Américas Center','workspace-fuel',$2,1,now()) ON CONFLICT (id) DO NOTHING", [longName, randomUUID()]);
  await q("INSERT INTO clocker_devices(id,location_id,name) VALUES('x-device-large','loc-large','Front desk tablet') ON CONFLICT DO NOTHING");
  const firsts = ['María José', 'Juan Carlos', 'Ana', 'Luis Alberto', 'Carmen', 'José', 'Gabriela', 'Pedro', 'Yolanda', 'Héctor'];
  const lasts = ['Rivera Santiago', 'Rodríguez de la Torre y Valentín', 'Ortiz', 'Martínez Colón', 'Vázquez', 'Hernández Figueroa-Quiñones', 'Cruz', 'López'];
  const people: string[] = [];
  for (let i = 1; i <= 200; i++) {
    const id = `LD-${String(i).padStart(4, '0')}`;
    people.push(id);
    await person(id, firsts[i % firsts.length], lasts[i % lasts.length] + (i % 25 === 0 ? ' With An Exceptionally Long Family Name' : ''), i % 20 === 0 ? 'LEAD' : 'EMPLOYEE', 'loc-large');
  }
  await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('x-large-current','loc-large',$1,'DRAFT','QAOWNER') ON CONFLICT DO NOTHING", [week]);
  for (let d = 0; d < 7; d++) for (let s = 0; s < 50; s++) {
    const id = people[(d * 50 + s) % people.length], start = ['06:00', '08:00', '10:00', '14:00', '18:00'][s % 5], end = ['14:00', '16:00', '18:00', '22:00', '23:30'][s % 5];
    await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id,is_designated_lead) VALUES($1,'x-large-current',$2,$3,$4,$5,'qa-pos',false) ON CONFLICT (id) DO NOTHING", [`x-large-${d}-${s}`, id, addDays(week, d), start, end]);
  }
  await publishScheduleWithRevision({ locationId: 'loc-large', weekStart: week, managerId: 'QAOWNER' }, executor);
  // A year of closed timecards, weekdays only, for AUDIT-E and ten large-data people.
  for (const id of ['AUDIT-E', ...people.slice(0, 10)]) {
    const location = id === 'AUDIT-E' ? 'loc-1' : 'loc-large', deviceId = id === 'AUDIT-E' ? device.id : 'x-device-large';
    const existing = await q("SELECT count(*)::int n FROM time_entries WHERE employee_id=$1 AND id LIKE 'x-year-%'", [id]);
    if (existing[0].n) continue;
    for (let d = 1; d <= 365; d++) {
      const day = new Date(Date.now() - d * 86_400_000);
      if (day.getUTCDay() === 0 || day.getUTCDay() === 6) continue;
      const date = day.toISOString().slice(0, 10);
      await q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version) VALUES($1,$2,$3,$4,($5||' 08:00:00-04')::timestamptz,($5||' 16:30:00-04')::timestamptz,'CLOCKED_OUT',1)", [`x-year-${id}-${date}`, id, location, deviceId, date]);
    }
  }
}

const counts = await q("SELECT (SELECT count(*) FROM employees)::int people, (SELECT count(*) FROM time_off_requests)::int requests, (SELECT count(*) FROM time_entries WHERE clock_out_at IS NULL)::int open_entries, (SELECT count(*) FROM time_entries)::int entries");
console.log('seeded', dbName, JSON.stringify(counts[0]), large ? '(large)' : '');
await client.end();
