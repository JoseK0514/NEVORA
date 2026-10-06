import assert from 'node:assert/strict';
export { validateOutput } from './verify-fuel-phase-3-config.mjs';
export const widths = [320, 375, 390, 430, 768, 1024, 1440];
export const engines = ['chromium', 'webkit'];
export const protectedScreens = [
  ...['employee', 'lead', 'manager', 'owner'].flatMap(role =>
    (['employee', 'lead'].includes(role)
      ? ['/app', '/app/schedule', '/app/availability', '/app/requests', '/app/exchange', '/app/my-time']
      : ['/app', '/app/schedule', '/app/schedule/settings', '/app/requests', '/app/availability', '/app/exchange', '/app/employees', '/app/schedule/templates', '/app/settings'])
      .map(path => ({ role, path }))),
  ...['/login', '/activate'].map(path => ({ role: 'employee', path })),
];
export const genericScreens = [
  '/app/schedule?manager', '/app/schedule?manager&one', '/app/schedule?manager&twenty',
  '/app/schedule?manager&one&long', '/app/schedule?manager&long',
  ...['natural', 'wide'].flatMap(kind => ['', '&one', '&two'].map(count => `/app/schedule?manager&${kind}${count}`)),
  '/app/settings?owner', '/app/settings/workspace?owner', '/app/settings/workspace?owner&locked',
  '/app/settings/locations?owner', '/app/settings/locations?owner&one', '/app/settings/locations?owner&twenty',
  '/app/settings/locations?owner&empty', '/app/settings/locations/new?owner', '/app/settings/locations/main?owner',
  '/app/settings/positions?owner', '/app/employees/new?owner', '/app/employees/sam?owner',
  '/app/schedule/settings?owner', '/app/schedule/settings?manager',
  '/app/schedule/new?owner&employeeId=sam', '/app/schedule/edit?owner&shiftId=shift-sam',
  '/login', '/activate', '/app/settings/locations?owner&long',
  '/app/settings/positions?owner&empty', '/app/schedule/settings?owner&empty',
];
export function loopbackOrigin(value) {
  let url; try { url = new URL(value); } catch { throw Error('Supply an explicit loopback HTTP origin.'); }
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.protocol !== 'http:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw Error('Only bare loopback HTTP origins are allowed.');
  return url.origin;
}
export const caseId = (...parts) => parts.join('|');
export function matrixPlan() {
  return {
    protected: engines.flatMap(engine => [
      ...protectedScreens.flatMap(({ role, path }) => widths.map(width => caseId(engine, role, path, width))),
      ...['/clocker/2', '/clocker/110'].flatMap(path => [768, 1024].map(width => caseId(engine, 'employee', path, width))),
    ]),
    generic: engines.flatMap(engine => genericScreens.flatMap(path => widths.map(width => caseId(engine, path, width)))),
    setup: engines.flatMap(engine => ['ready', 'denied', 'error', 'enabled'].flatMap(state => widths.map(width => caseId(engine, state, width)))),
  };
}
export function assertComplete(results, plan = matrixPlan()) {
  for (const [key, ids] of Object.entries(plan)) {
    assert.deepEqual(results[key]?.map(row => row.id).sort(), [...ids].sort(), `${key}: every unique case must be present exactly once`);
    assert(results[key].every(row => row.passed === true), `${key}: unresolved failures`);
  }
}
/** Apply explicit, evidence-bound review decisions; never bless a changed hash,
 * missing case or runtime error merely because a route was reviewed previously. */
export function applyReviewedComparisons(results, decisions) {
  assert.deepEqual(results.errors, [], 'Runtime errors must be resolved before review');
  const remaining = new Map();
  for (const decision of decisions) {
    assert(!remaining.has(decision.id), 'Duplicate review decision');
    assert(typeof decision.reason === 'string' && decision.reason.trim().length > 20, 'Explain the specific intentional change');
    remaining.set(decision.id, decision);
  }
  for (const key of ['protected', 'setup']) for (const row of results[key]) {
    if (row.passed) continue;
    const decision = remaining.get(row.id);
    assert(decision && !row.error, `${row.id}: unresolved comparison`);
    assert.equal(decision.beforeSha256, row.before?.sha256, 'Stale before review');
    assert.equal(decision.afterSha256, row.after?.sha256, 'Stale after review');
    assert(row.before?.sha256 && row.after?.sha256, 'Review requires captured images');
    if (key === 'protected' && !row.freshBaselineMatches) {
      // Native empty-date placeholders use the host calendar, outside JS Date.
      // Require explicit three-image review, never a general screenshot exemption.
      assert.equal(decision.kind, 'native-empty-date-placeholder');
      assert.equal(row.engine, 'webkit');
      assert.equal(row.path, '/app/requests');
      assert(['employee', 'lead'].includes(row.role));
      assert.equal(decision.immutableSha256, row.immutableBaselineHash);
      assert(row.immutableBaselineHash && row.before.sha256 === row.after.sha256);
      assert(row.pixelsEqual && row.geometryEqual && row.textEqual);
      assert.equal(decision.allChangesInsideEmptyDateInputs, true);
      assert.equal(decision.fields?.length, 2);
      assert(decision.fields.every(field => field.value === ''));
      assert.deepEqual(decision.currentValues, ['', '']);
      assert(decision.changedPixels > 0);
    }
    row.review = decision;
    row.passed = true;
    remaining.delete(row.id);
  }
  assert.equal(remaining.size, 0, 'Unused or stale review decisions');
  assertComplete(results);
  return results;
}

export function assertRouteIdentity(requested, actual, heading) {
  const expected = new URL(requested);
  const current = new URL(actual);
  assert.equal(current.origin + current.pathname, expected.origin + expected.pathname, 'Captured route changed');
  const queryEntries = url => [...url.searchParams.entries()].sort(([a, av], [b, bv]) => a.localeCompare(b) || av.localeCompare(bv));
  assert.deepEqual(queryEntries(current), queryEntries(expected), 'Captured query identity changed');
  if (expected.pathname === '/app/exchange') {
    assert.equal(heading, 'Shift Requests', 'Captured heading does not identify Shift Requests');
  }
}

export function assertScheduleLocationFit(audit) {
  assert.deepEqual(audit.locationTextBounds, [], 'Location glyphs must remain within controls and viewport');
  assert.equal(audit.locationActionOverlap, false, 'Location labels must not intersect action controls');
  assert(audit.locationPeerRegions.includes('Schedule week'), 'Schedule week must be included in the collision oracle');
  assert.deepEqual(audit.locationPeerOverlaps, [], 'Location labels must not intersect any toolbar control');
}
