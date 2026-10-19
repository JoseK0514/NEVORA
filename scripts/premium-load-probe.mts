import { createHash } from 'node:crypto';
import { employeeViewAuthority } from '../src/lib/employee-view-authority.server';
import { writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { ownedRuntime, sessionCookie } from './lib/premium-owned-runtime.mjs';
import { seedOwnedApp } from '../src/test/integration/owned-app-fixture';
import { fictionalProfile } from '../src/test/fixtures/shift-changes';
import { businessDate } from '../src/lib/business-time';
import { addDays, weekStartFor } from '../src/lib/date-utils';
import { publishScheduleWithRevision } from '../src/test/integration/management-api';

const evidence = resolve(process.env.NEVORA_PREMIUM_EVIDENCE ?? '/tmp/nevora-premium-load');
const app = await ownedRuntime(evidence, true);
const q = (text: string, values: readonly unknown[] = []) => app.database.executor.query<Record<string, unknown>>({ text, values });
const results: Record<string, unknown> = { checkpoint: app.checkpoint, root: app.root, runtime: 'Next production build/start; owned loopback pg transport (not hosted Neon)', probes: [] };
try {
  await seedOwnedApp(app.database.executor);
  await q("INSERT INTO employees(id,first_name,last_name,phone,email,role,primary_location_id) SELECT 'LOAD-'||n,'Fictional Long Given Name '||n,'Rivera With An Intentionally Long Family Name For Inspection','555-0199','load-'||n||'@example.invalid',CASE WHEN n=0 THEN 'MANAGER' ELSE 'EMPLOYEE' END,'loc-1' FROM generate_series(0,198) n");
  await q("INSERT INTO employee_location_eligibility SELECT id,'loc-1' FROM employees WHERE id LIKE 'LOAD-%'");
  await q("INSERT INTO employee_positions SELECT id,'qa-pos' FROM employees WHERE id LIKE 'LOAD-%'");
  await q("INSERT INTO employee_scheduling_settings(employee_id,target_weekly_hours,maximum_weekly_hours,operational_rule_profile) SELECT id,40,80,$1::jsonb FROM employees WHERE id LIKE 'LOAD-%'", [JSON.stringify(fictionalProfile())]);
  await q("INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) SELECT 'load-av-'||id||'-'||d,id,d,'00:00','24:00' FROM employees CROSS JOIN generate_series(0,6) d WHERE id LIKE 'LOAD-%'");
  const week = weekStartFor(businessDate(new Date(), 'America/Puerto_Rico'));
  await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('load-week','loc-1',$1,'DRAFT','QAOWNER')", [week]);
  await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id,assignment_origin) SELECT 'load-shift-'||d||'-'||n,'load-week','LOAD-'||n,$1::date+d,'08:00','16:00','qa-pos','MANAGER' FROM generate_series(0,6) d CROSS JOIN generate_series(1,50) n", [week]);
  await publishScheduleWithRevision({ locationId: 'loc-1', weekStart: week, managerId: 'QAOWNER' }, app.database.executor);
  await q("INSERT INTO clocker_devices(id,location_id,name) VALUES('load-device','loc-1','Fictional Load Device')");
  await q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status) SELECT 'load-time-'||n||'-'||d,'LOAD-'||n,'loc-1','load-device',($1::date-d+time '08:00') AT TIME ZONE 'America/Puerto_Rico',($1::date-d+time '16:00') AT TIME ZONE 'America/Puerto_Rico','CLOCKED_OUT' FROM generate_series(1,11) n CROSS JOIN generate_series(1,365) d", [businessDate(new Date(), 'America/Puerto_Rico')]);
  await q('ANALYZE');
  results.seed = (await q("SELECT (SELECT count(*) FROM employees)::int AS employees,(SELECT count(*) FROM shifts)::int AS shifts,(SELECT count(*) FROM time_entries)::int AS closed_entries"))[0];
  const manager = await sessionCookie(app.database, 'LOAD-0'), employee = await sessionCookie(app.database, 'LOAD-1');
  await q("UPDATE employees SET role='LEAD' WHERE id='LOAD-2'");
  const lead=await sessionCookie(app.database,'LOAD-2');
  const leadAuthority=employeeViewAuthority({employee:{id:'LOAD-2',firstName:'Fictional',lastName:'Lead',role:'LEAD',primaryLocationId:'loc-1'},sessionTokenHash:createHash('sha256').update(lead.slice('fuel_session='.length)).digest('hex')},'profile');
  const profileAuthority = employeeViewAuthority({employee:{id:'LOAD-1',firstName:'Fictional',lastName:'Employee',role:'EMPLOYEE',primaryLocationId:'loc-1'},sessionTokenHash:createHash('sha256').update(employee.slice('fuel_session='.length)).digest('hex')},'profile');
  const period = { startDate: week, endDate: addDays(week, 6) };
  const targets = [
    { name: 'Home-manager', path: '/app', cookie: manager },
    { name: 'Home-employee', path: '/app', cookie: employee },
    { name: 'Inbox', path: '/api/manager/action-center', cookie: manager, header: 'x-nevora-action-center', body: { weekStart: week } },
    { name: 'Schedule-manager', path: '/app/schedule', cookie: manager },
    { name: 'Schedule-employee', path: '/app/schedule', cookie: employee },
    { name: 'Timecards', path: '/api/timecards', cookie: manager, header: 'x-nevora-timecards', body: period },
    { name: 'My-time', path: '/api/employee/my-time', cookie: employee, header: 'x-nevora-my-time' },
    { name: 'Insights', path: '/api/reports', cookie: manager, header: 'x-nevora-reports', body: period },
    { name: 'Profile-manager', path: '/api/management/profile', cookie: manager },
    { name: 'Profile-employee', path: '/api/employee/profile', cookie: employee, authority: profileAuthority },
    { name: 'Profile-lead', path: '/api/employee/profile', cookie: lead, authority: leadAuthority },
    { name: 'Inbox-count', path: '/api/manager/inbox-count', cookie: manager },
    { name: 'Attendance', path: '/api/manager/attendance', cookie: manager, header: 'x-nevora-attendance' },
  ];
  const run = async (target: typeof targets[number]) => {
    const start = performance.now();
    try {
      const response = await fetch(app.url + target.path, { method: target.body ? 'POST' : 'GET', redirect: 'manual', headers: { Cookie: target.cookie, Origin: app.url, 'Sec-Fetch-Site': 'same-origin', 'x-nevora-actor': target.cookie === manager ? 'LOAD-0' : 'LOAD-1', ...('authority' in target ? { 'x-nevora-employee-view': target.authority! } : {}), ...(target.header ? { [target.header]: '1' } : {}), ...(target.body ? { 'Content-Type': 'application/json' } : {}) }, ...(target.body ? { body: JSON.stringify(target.body) } : {}), signal: AbortSignal.timeout(60000) });
      const body = await response.text();
      const state = response.headers.get('content-type')?.includes('application/json') ? JSON.parse(body).state : /This page could not be loaded|Workspace configuration is unavailable/.test(body) ? 'rendered-failure' : 'html';
      return { ms: performance.now() - start, status: response.status, state };
    } catch (error) { return { ms: performance.now() - start, status: 0, state: error instanceof Error ? error.name : 'error' }; }
  };
  for (const concurrency of [10, 20]) for (const target of targets.filter(t=>process.env.NEVORA_PROFILE_ONLY!=='1'||t.name.startsWith('Profile-'))) {
    const warmup = await run(target), samples: Awaited<ReturnType<typeof run>>[] = [];
    let next = 0;
    await Promise.all(Array.from({ length: concurrency }, async () => { while (next++ < 40) samples.push(await run(target)); }));
    const times = samples.map(s => s.ms).sort((a, b) => a - b);
    const result = { name: target.name, concurrency, n: samples.length, warmup, p50: Math.round(times[Math.ceil(times.length * .5) - 1]), p95: Math.round(times[Math.ceil(times.length * .95) - 1]), outcomes: samples.reduce<Record<string, number>>((out, s) => { const key = s.status + ':' + s.state; out[key] = (out[key] ?? 0) + 1; return out; }, {}) };
    (results.probes as unknown[]).push(result);
    await writeFile(join(evidence, 'load-results.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(result));
    if(target.name.startsWith('Profile-')&&samples.some(s=>s.status!==200||s.state!=='ready'))throw Error(target.name+' returned an unavailable or unsuccessful response');
  }
  results.indexes = await q("SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename IN ('time_entries','timecard_revisions','shifts','schedules','employee_sessions') ORDER BY tablename,indexname");
  results.plans = await q("EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT * FROM time_entries WHERE employee_id='LOAD-1' ORDER BY clock_in_at DESC LIMIT 20");
} finally {
  await app.close();
  results.closed = true;
  await writeFile(join(evidence, 'load-results.json'), JSON.stringify(results, null, 2));
}
