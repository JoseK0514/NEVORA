import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const roles = ['O', 'M', 'Ml', 'L', 'E'];
const special = new Map([
  ...['A15', 'A16', 'A17', 'A18', 'A19'].map(id => [id, 'Owned central billing browser fixture']),
  ['F3', 'Routed workspace and roster import'],
  ['J18', 'Isolated commerce recovery browser fixture'],
  ['K15', 'Isolated commerce recovery browser fixture'],
]);

async function readInventory() {
  const document = await readFile('docs/product/page-inventory.md', 'utf8');
  const table = document.slice(document.indexOf('\n## A.')).split('\n## Not separate pages')[0];
  const impact = new Map([
    ['C3:Ml', '✓'], ['C13:Ml', '✓ (grant)'], ['E1:Ml', '✓ (grant)'],
    ['D2:Ml', '✓ (grant)'], ['B4:Ml', '✓'],
  ]);
  const rows = table.split('\n').flatMap(line => {
    if (!/^\| [A-M]\d+ \|/.test(line)) return [];
    const [id, title, next, ...columns] = line.split(' | ').map(cell => cell.trim().replace(/^\| /, ''));
    const route = next.match(/^`(\/[^\u0060]*)`$/)?.[1];
    const group = id[0];
    const access = /^[B-I]$/.test(group)
      ? Object.fromEntries(roles.map((role, index) => [role, impact.get(id + ':' + role) ?? columns[index]]))
      : null;
    return [{ id, title: title.replaceAll('**', ''), route, group, access }];
  });
  assert.ok(rows.length > 0);
  assert.equal(new Set(rows.map(row => row.id)).size, rows.length);
  return rows;
}

function sourcePages(rows) {
  const routes = new Set(rows.map(row => row.route?.split('?')[0]));
  const sources = execFileSync('git', ['ls-files', 'src/app'], { encoding: 'utf8' }).trim().split('\n')
    .filter(path => /\/page\.tsx?$/.test(path)).map(path => ({
      file: path,
      route: path.replace(/^src\/app/, '').replace(/\/page\.tsx?$/, '') || '/',
    }));
  return sources.map(source => {
    const route = source.route.replace('[[...topic]]', '[topic]');
    if (route === '/app/@sheet' || route.startsWith('/app/@sheet/')) return { ...source, coverage: 'C14/C15 intercepted sheets or empty slot' };
    if (route === '/clocker/[location]') return { ...source, coverage: 'K1–K14 tablet flow' };
    if (route === '/clocker/access/paused') return { ...source, coverage: 'K15 commerce fixture' };
    return { ...source, coverage: routes.has(route) ? 'inventory' : 'unmapped' };
  });
}

function concreteRoutes(row, profile, runtime, replacement) {
  const { week, sourceId, targetId, sourceDate, actors, pages } = runtime;
  const actorShift = profile === 'E' ? targetId : sourceId;
  const query = (route, params) => route + '?' + new URLSearchParams(params);
  switch (row.id) {
    case 'A7':
      return ['', 'id', 'email', 'owner', 'owner-other', 'owner-contact', 'support', 'invitation', 'missing',
        'link', 'registered-email', 'activated', 'left'].map(topic => '/access-help' + (topic ? '/' + topic : '') + '?from=login');
    case 'B7': return ['/app/updates/' + pages.updateId];
    case 'B11': return ['/app/fictional-missing-page'];
    case 'C1': return [query(row.route, { week, location: 'all' })];
    case 'C3': return [replacement];
    case 'C4': return [query(row.route, { shiftId: sourceId })];
    case 'C5': return [query(row.route, { week, date: sourceDate, locationId: 'loc-1', start: '00:00', end: '08:00' })];
    case 'C6': return [query(row.route, { week: pages.copyWeek })];
    case 'C8': return [query(row.route, { operation: pages.copyId })];
    case 'C14': return [query(row.route, { sourceShiftId: actorShift })];
    case 'C15': return [query(row.route, { shiftId: actorShift })];
    case 'G3':
    case 'G4':
    case 'G5':
    case 'G6': return [query(row.route, { run: pages.payrollRunId })];
    case 'I2': return ['privacy', 'terms'].map(document => row.route.replace('[document]', document));
    default: return [row.route.replace('[employeeId]', actors[0]).replace('[locationId]', 'loc-1')];
  }
}

async function visit(page, origin, route, row) {
  let response;
  const target = new URL(route, origin);
  try {
    response = await page.goto(target.href);
  } catch (error) {
    if (!['I2', 'I4', 'I5'].includes(row.id)) throw error;
    // App Router can interrupt a navigation in order to apply a Profile
    // section redirect. Require the actual destination before recording it.
    await page.waitForURL(url => url.pathname === '/app/profile', { timeout: 5000 });
    await page.getByRole('heading', { name: 'Profile', exact: true }).first().waitFor({ timeout: 5000 });
  }
  if (row.id === 'A2') await page.locator('#login-employee-id').waitFor();
  if (!['A1', 'M1', 'M2'].includes(row.id)) {
    await page.getByRole('heading').first().waitFor({ state: 'attached', timeout: 4500 }).catch(() => {});
  }
  const pathname = new URL(page.url()).pathname;
  const final = page.url().slice(origin.length);
  const http = response?.status() ?? null;
  const heading = (await page.getByRole('heading').allTextContents()).map(text => text.trim()).filter(Boolean);
  const notice = await page.locator('[data-b-state="locked"], .b-state--locked, .cm-owner-only').count();
  let observed = 'rendered';
  if (['M1', 'M2'].includes(row.id)) observed = 'development error probe';
  else if (pathname === '/login' && row.id !== 'A2' && row.id !== 'A1') observed = 'sign-in';
  else if (pathname === '/app/restricted' && row.id !== 'B10') observed = 'restricted';
  else if (pathname !== new URL(route, origin).pathname) observed = 'redirect';
  else if (http >= 400 && row.id !== 'B11') observed = 'HTTP ' + http;
  else if (notice || heading.some(text => /^Company-wide access needed$|^Page unavailable$/.test(text))) observed = 'notice';
  else if (!heading.length && !['M1', 'M2'].includes(row.id)) observed = 'inspect';
  return { route, final, http, observed, heading };
}

export async function scanInventory({ evidence, origin, runtime, pageFor, login, priority, screenshots }) {
  const rows = await readInventory();
  const sources = sourcePages(rows);
  assert.equal(sources.filter(row => row.coverage === 'unmapped').length, 0,
    'A route is missing from the page inventory: ' + sources.filter(row => row.coverage === 'unmapped').map(row => row.route).join(', '));
  const replacement = priority.find(result => result.id === 'C3')?.route;
  const captures = join(evidence, 'inventory');
  if (screenshots) await mkdir(captures, { recursive: true });
  const results = [];
  const roleRows = rows.filter(row => row.access);
  const batches = [
    ['public', rows.filter(row => row.group === 'A' || /^M[1345]$/.test(row.id))],
    ...roles.map(role => [role, [
      ...roleRows,
      ...(role === 'O' ? rows.filter(row => row.group === 'J' || row.id === 'M2') : []),
    ]]),
  ];

  for (const [profile, batch] of batches) {
    console.log('Inventory', profile);
    const page = profile === 'public' ? await pageFor({ width: 390, height: 844 }) : await login(runtime.profiles[profile]);
    try {
      for (const row of batch) {
        const expected = row.access?.[profile] ?? '✓';
        const base = { id: row.id, title: row.title, profile, expected };
        if (special.has(row.id)) {
          results.push({ ...base, route: row.route, observed: 'separate fixture', detail: special.get(row.id) });
          continue;
        }
        if (row.id === 'C3' && expected.startsWith('✓') && !replacement) {
          results.push({ ...base, route: row.route, observed: 'manual workflow',
            detail: 'Schedule → Find Cover → Review replacement' });
          continue;
        }
        if (!expected.startsWith('✓') && !['B10', 'I2'].includes(row.id)) {
          results.push({ ...base, route: row.route, observed: 'outside assigned profile' });
          continue;
        }
        for (const [index, route] of concreteRoutes(row, profile, runtime, replacement).entries()) {
          try {
            const rendered = await visit(page, origin, route, row);
            const result = { ...base, ...rendered };
            if (screenshots && rendered.observed !== 'sign-in') {
              result.screenshot = join('inventory', [profile, row.id, index].join('-') + '.png');
              await page.screenshot({ path: join(evidence, result.screenshot), timeout: 15_000 });
            }
            results.push(result);
          } catch (error) {
            results.push({ ...base, route, observed: 'error', detail: String(error.message).split('\n')[0] });
          }
        }
      }
    } finally {
      await page.context().close();
    }
    await writeFile(join(evidence, 'collab-inventory-results.json'), JSON.stringify({ checkpoint: runtime.checkpoint, sources, results }, null, 2) + '\n');
  }
  return { rows, sources, results };
}

export async function finishInventory({ inventory, priority, extra, evidence, checkpoint }) {
  const { rows, sources, results } = inventory;
  for (const row of rows.filter(row => ['K', 'L'].includes(row.group))) {
    const entries = [...priority, ...extra].filter(entry => entry.id === row.id);
    for (const entry of entries) results.push({ observed: 'asserted workflow', ...entry, title: row.title, profile: row.group === 'K' ? 'tablet' : 'native' });
    if (!entries.length) results.push({ id: row.id, title: row.title, profile: row.group === 'K' ? 'tablet' : 'native',
      observed: special.has(row.id) ? 'separate fixture' : 'manual workflow', detail: special.get(row.id) });
  }
  assert.deepEqual([...new Set(results.map(row => row.id))].sort(), rows.map(row => row.id).sort(), 'Every inventory row must be accounted for.');
  for (const entry of extra.filter(entry => /^A\d+$/.test(entry.id))) {
    results.push({ ...entry, profile: 'public' });
  }
  const totals = Object.fromEntries([...new Set(results.map(result => result.observed))].sort()
    .map(state => [state, results.filter(result => result.observed === state).length]));
  await writeFile(join(evidence, 'collab-inventory-results.json'), JSON.stringify({ checkpoint, inventoryRows: rows.length, sourcePages: sources.length, totals, sources, results }, null, 2) + '\n');
  console.log('Inventory observations', JSON.stringify({ inventoryRows: rows.length, sourcePages: sources.length, totals }));
}
