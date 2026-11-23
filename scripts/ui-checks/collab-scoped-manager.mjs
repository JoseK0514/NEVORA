import assert from 'node:assert/strict';

const correctionsPath = '/api/manager/time-corrections';

async function readFeeds(page, { week, actor }) {
  return page.evaluate(async ({ week, actor, correctionsPath }) => {
    const read = async (path, options) => {
      const response = await fetch(path, options);
      return { status: response.status, body: await response.json() };
    };
    return Promise.all([
      read('/api/manager/action-center', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Nevora-Action-Center': '1', 'X-Nevora-Actor': actor },
        body: JSON.stringify({ weekStart: week }),
      }),
      read(correctionsPath, { headers: { 'X-Nevora-Time-Correction': '1', 'X-Nevora-Actor': actor } }),
      read('/api/manager/today', { headers: { 'X-Nevora-Today': '1' } }),
      read('/api/manager/inbox-count'),
    ]);
  }, { week, actor, correctionsPath });
}

function assertFeedCoverage(feeds, included, excluded) {
  const endpoints = ["Action center", "Corrections", "Today", "Inbox count"];
  for (const [index, feed] of feeds.entries()) assert.equal(feed.status, 200, endpoints[index] + ": " + JSON.stringify(feed.body));
  const [inbox, corrections, today, count] = feeds.map(feed => feed.body);
  assert.ok(inbox.items.some(item => item.id === 'TIME_CORRECTION:' + included.correctionId));
  const leave = inbox.items.find(item => item.id === 'TIME_OFF:' + included.leaveId);
  assert.equal(new URL(leave?.href, 'https://nevora.invalid').pathname, '/app/requests');
  assert.ok(corrections.requests.some(request => request.id === included.correctionId));
  assert.ok(today.shifts.some(shift => shift.employeeId === included.employeeId));
  assert.equal(count.state, 'ready');
  if (excluded) {
    assert.ok(today.shifts.every(shift => shift.locationId === included.location));
    assert.ok(corrections.requests.every(request => request.locationId === included.location));
    const wire = JSON.stringify([inbox, corrections, today]);
    for (const privateValue of [excluded.name, excluded.employeeId, excluded.correctionId, excluded.leaveId, excluded.location]) {
      assert.ok(!wire.includes(privateValue), 'A location outside the test Manager’s scope appeared in a feed.');
    }
  }
  return corrections.authority;
}

export async function checkScopedManager({ runtime, login, captureWidths, record }) {
  const { week, records: [mainOffice, westOffice] } = runtime.scopedManager;
  // Company-wide controls prove both locations have equivalent real records.
  const company = await login(runtime.profiles.M);
  try {
    const feeds = await readFeeds(company, { week, actor: runtime.profiles.M });
    assertFeedCoverage(feeds, mainOffice);
    assertFeedCoverage(feeds, westOffice);
  } finally {
    await company.context().close();
  }
  const manager = await login(runtime.profiles.Ml);
  try {
    const actor = runtime.profiles.Ml;
    const authority = assertFeedCoverage(await readFeeds(manager, { week, actor }), mainOffice, westOffice);
    const inboxLink = manager.locator('a[href="/app/inbox"]').filter({ visible: true }).first();
    await manager.emulateMedia({ reducedMotion: 'reduce' });
    await inboxLink.click();
    const correctionHref = '/app/timecards/corrections#correction-' + mainOffice.correctionId;
    const correctionLink = manager.locator('main').locator(`a[href="${correctionHref}"]`).filter({ visible: true }).first();
    await correctionLink.waitFor();
    assert.doesNotMatch(await manager.locator('main').innerText(), /West Office|WestScopeWorker/);
    assert.equal(await manager.locator('main a[href="/app/exchange"], main a[href="/app/availability"]').count(), 0);
    await captureWidths(manager, 'scoped-things-to-do');
    record('B4', 'Location Manager opened Things to Do with scoped coverage, time off, clock-ins and corrections');
    await correctionLink.click();

    const row = manager.locator('#correction-' + mainOffice.correctionId);
    await row.getByText('Main Office', { exact: true }).waitFor();
    assert.equal(await manager.locator('#correction-' + westOffice.correctionId).count(), 0);
    await captureWidths(manager, 'scoped-time-corrections');

    const forbidden = await manager.evaluate(async ({ actor, authority, correctionsPath, requestId }) => {
      const response = await fetch(correctionsPath, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Nevora-Time-Correction': '1',
          'X-Nevora-Actor': actor, 'X-Nevora-Correction-Authority': authority },
        body: JSON.stringify({ operationId: crypto.randomUUID(), requestId, expectedRevision: 1, decision: 'REJECT' }),
      });
      return { ok: response.ok, body: await response.json() };
    }, { actor, authority, correctionsPath, requestId: westOffice.correctionId });
    assert.equal(forbidden.ok, false);
    assert.deepEqual(forbidden.body, { state: 'unavailable' });

    await row.getByRole('button', { name: /decline/i }).press('Enter');
    await manager.getByRole('button', { name: 'Decline correction for ' + mainOffice.name + ' Fictional', exact: true }).click();
    await manager.getByText('Correction declined', { exact: true }).first().waitFor();
    record('D2', 'Location Manager reviewed a Main Office correction and could not review a West Office correction');
  } finally {
    await manager.context().close();
  }

  const companyAfterReview = await login(runtime.profiles.M);
  try {
    const [, queue] = await readFeeds(companyAfterReview, { week, actor: runtime.profiles.M });
    assert.equal(queue.status, 200);
    assert.ok(queue.body.requests.some(request => request.id === westOffice.correctionId));
    assert.ok(!queue.body.requests.some(request => request.id === mainOffice.correctionId));
  } finally {
    await companyAfterReview.context().close();
  }
}
