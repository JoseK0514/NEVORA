/** Static preparation only. The coordinator must supply the frozen candidate SHA
 * and explicitly release verify.mjs before execution. No writes are forwarded.
 * IS-P4-11 uses source DOM contracts when present and records legacy URI-only
 * limits otherwise. Missing fixes produce completed negative assertions. */
export function registerScopedCases(h) {
  const {register, go, hold, check, evidence, until, wait, buttonData, hydrated, baseUrl} = h;
  const sizes = [[390, 844, 100], [320, 844, 200], [1440, 900, 100]];
  const accounts = ['AUDIT-E', 'AUDIT-LEAD'];
  const read = path => request => request.method() === 'GET' && new URL(request.url()).pathname === path;
  const readyTime = page => page.locator('.employee-time-current-heading [data-state]').count();
  const readyHome = page => page.locator('[data-home-updated="true"]').count();
  const settled = button => button.getAttribute('aria-busy').then(value => value !== 'true');
  const inboxBack = page => page.locator('main .nv-masthead__back').filter({hasText: /^Inbox$/}).first();
  const requestId = 'audit-timeoff', item = 'TIME_OFF:' + requestId;

  async function roleData(locator, role) {
    return locator.evaluate((element, role) => {
      const probe = document.createElement('span');
      probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none';
      probe.style.font = 'var(' + role + ')';
      document.body.append(probe);
      const style = getComputedStyle(element), reference = getComputedStyle(probe);
      const result = {text: element.textContent?.trim(), actual: {size: style.fontSize, lineHeight: style.lineHeight, weight: style.fontWeight}, expected: {size: reference.fontSize, lineHeight: reference.lineHeight, weight: reference.fontWeight}, box: element.getBoundingClientRect().toJSON()};
      probe.remove();
      return result;
    }, role);
  }

  async function recordedFooter(page, row) {
    const data = await page.locator('.employee-time-footer').first().evaluate(footer => {
      const box = element => element?.getBoundingClientRect().toJSON() ?? null;
      const small = footer.querySelector(':scope > small'), controls = footer.querySelector(':scope > .employee-time-controls');
      return {footer: box(footer), status: box(small), controls: box(controls), display: getComputedStyle(footer).display, rows: getComputedStyle(footer).gridTemplateRows, viewport: innerWidth, documentWidth: document.documentElement.scrollWidth};
    });
    row.recordedFooter = data;
    if (row.width < 600 && row.text >= 150) check(row, !!data.status && !!data.controls && data.controls.top >= data.status.bottom - 1, 'TC-P3-34: large-phone recorded-time status and controls occupy separate nonoverlapping rows', data);
    check(row, !!data.controls && data.controls.left >= -1 && data.controls.right <= row.width + 1 && data.documentWidth <= row.width + 1, 'Recorded-time footer controls fit viewport without document overflow', data);
  }

  async function readPending(page, row, gate, button, label) {
    await hydrated(button, 'onClick');
    await until(() => settled(button), label + ': initial read did not settle');
    await button.focus();
    const before = await buttonData(button), base = gate.count;
    await page.keyboard.press('Enter');
    await gate.wait(base + 1);
    // This SHA may lack the later focus fix. Observe its held request, then
    // report the actual state instead of timing out awaiting desired behavior.
    await wait(100);
    const pending = await buttonData(button);
    check(row, pending.focused, label + ': native Enter retains focus while read is held', pending);
    check(row, !pending.disabled && !pending.fieldsetDisabled, label + ': pending Refresh remains natively focusable', pending);
    check(row, pending.ariaDisabled === 'true', label + ': pending Refresh exposes aria-disabled', pending);
    await page.keyboard.press('Enter');
    // Direct DOM activation bypasses Playwright's aria-disabled actionability
    // check and exercises the application guard without forwarding a mutation.
    await button.evaluate(element => { element.click(); element.click(); });
    await wait(150);
    check(row, gate.count === base + 1, label + ': repeated keyboard and DOM activation send one read', {before: base, after: gate.count});
    await evidence(page, row, label + '-pending');
    return {base, before, pending};
  }

  async function pausedTime(page, context, row, gate, button, label) {
    const before = gate.count;
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await until(() => button.isDisabled(), label + ': offline pause did not natively disable Refresh');
    check(row, (await readyTime(page)) === 0, label + ': offline pause clears released recorded-time badge');
    await button.evaluate(element => element.click());
    await wait(100);
    check(row, gate.count === before, label + ': paused native control sends no read');
    await evidence(page, row, label + '-offline');
  }

  register('scoped-desktop-recorded-time-refresh', ['IS-P4-19', 'TC-P3-28', 'TC-P3-34', 'TC-P3-25'], async ({page, context, row}) => {
    if (row.variant === 'my-time') {
      await go(page, row, '/app/schedule');
      const today = page.locator('.my-week-today').first();
      await today.waitFor();
      row.scheduleToday = await roleData(today, '--nv-t-headline');
      if (row.width < 600) check(row, JSON.stringify(row.scheduleToday.actual) === JSON.stringify(row.scheduleToday.expected), 'TC-P3-28: Schedule Today uses the rendered kit headline role', row.scheduleToday);
      await evidence(page, row, 'schedule-today-role');
    }
    await go(page, row, row.variant === 'home-clock' ? '/app' : '/app/my-time');
    await until(() => readyTime(page), 'Owned fixture did not release a ready recorded-time snapshot');
    const button = page.locator('button.employee-time-refresh').first();
    await button.waitFor();
    const gate = await hold(page, read('/api/employee/my-time'));
    row.proofScope = 'Native keyboard focus and actual read dedupe; same-render callback closure is covered by affected existing view tests.';
    try {
      await evidence(page, row, 'ready');
      await recordedFooter(page, row);
      const {base} = await readPending(page, row, gate, button, 'recorded-time');
      await gate.release(base, 503);
      await until(() => settled(button), 'Failed recorded-time read did not settle');
      await until(async () => (await readyTime(page)) === 0, 'Failed recorded-time read retained released status');
      check(row, await button.evaluate(element => document.activeElement === element), 'Failed read preserves Refresh focus');
      check(row, (await buttonData(button)).visibleText === 'Try again', 'TC-P3-25: failed recorded-time read offers the visible Try again action');
      check(row, (await page.locator('.employee-time-entry,.employee-corporate-freshness time').count()) === 0, 'Failed read removes private entry/freshness DOM');
      await evidence(page, row, '503');
      await button.focus();
      await page.keyboard.press('Enter');
      await gate.wait(base + 2);
      check(row, gate.count === base + 2, 'A later settled render permits another recorded-time retry');
      await gate.release(base + 1, 'continue');
      await until(() => readyTime(page), 'Successful retry did not release fresh recorded-time status');
      await until(() => settled(button), 'Successful recorded-time retry remains busy');
      check(row, await button.evaluate(element => document.activeElement === element), 'Fresh recorded-time retry keeps originating Refresh focus');
      await evidence(page, row, 'fresh');
      await pausedTime(page, context, row, gate, button, 'recorded-time');
    } finally {
      row.reads = gate.summary();
      // Context teardown follows this case. Do not reconnect and start an
      // unobserved read after the final pause assertion.
    }
  }, {accounts, sizes, variants: ['my-time', 'home-clock']});

  register('scoped-desktop-home-refresh', ['IS-P4-19', 'TC-P3-25'], async ({page, context, row}) => {
    await go(page, row, '/app');
    await until(() => readyHome(page), 'Owned fixture did not release a ready Home snapshot');
    const button = page.locator('button[data-home-refresh]').first();
    const gate = await hold(page, read('/api/employee/home'));
    try {
      await evidence(page, row, 'ready');
      const {base} = await readPending(page, row, gate, button, 'home');
      await gate.release(base, 503);
      await until(() => settled(button), 'Failed Home refresh did not settle');
      await until(async () => (await readyHome(page)) === 0, 'Failed Home read retained private released freshness');
      check(row, await button.evaluate(element => document.activeElement === element), 'Home503 retains originating footer Refresh focus');
      check(row, (await buttonData(button)).visibleText === 'Try again', 'TC-P3-25: failed Home read offers the visible Try again action');
      check(row, (await page.locator('[data-home-state="ready"],[data-home-state="partial"]').count()) === 0, 'Home503 clears released ready/partial snapshot DOM');
      await evidence(page, row, '503');
      const fallback = page.locator('button.employee-time-refresh').first();
      await fallback.waitFor();
      await button.focus();
      await page.keyboard.press('Enter');
      await gate.wait(base + 2);
      await wait(100);
      const fallbackPending = await buttonData(fallback);
      check(row, !fallbackPending.disabled && fallbackPending.ariaDisabled === 'true', 'Pending Home fallback retains native focusability and announces guarded state', fallbackPending);
      await fallback.evaluate(element => { element.click(); element.click(); });
      await button.evaluate(element => element.click());
      await wait(150);
      check(row, gate.count === base + 2, 'Home footer and fallback clock share one guarded pending read');
      check(row, await button.evaluate(element => document.activeElement === element), 'Shared fallback activation does not move footer focus');
      await gate.release(base + 1, 'continue');
      await until(() => readyHome(page), 'Successful later Home retry did not release a fresh snapshot');
      await until(() => settled(button), 'Successful later Home retry remains busy');
      check(row, await button.evaluate(element => document.activeElement === element), 'Fresh Home retry preserves footer focus');
      await evidence(page, row, 'fresh');
      const count = gate.count;
      await context.setOffline(true);
      await page.evaluate(() => window.dispatchEvent(new Event('offline')));
      await until(() => button.isDisabled(), 'Offline Home footer did not become natively disabled');
      check(row, (await readyHome(page)) === 0, 'Offline Home clears private freshness');
      check(row, (await readyTime(page)) === 0, 'Offline Home clears private clock state');
      await button.evaluate(element => element.click());
      await wait(100);
      check(row, gate.count === count, 'Offline Home refuses programmatic Refresh');
      await evidence(page, row, 'offline');
    } finally { row.reads = gate.summary(); }
  }, {accounts, sizes});

  register('scoped-desktop-inbox-opening', ['ST-P4-13', 'IS-P4-21'], async ({page, context, row}) => {
    await page.emulateMedia({reducedMotion: 'no-preference'});
    await context.addInitScript(() => {
      const state = window.__desktopOpening = {from: 0, frames: [], shifts: [], supportsCLS: typeof PerformanceObserver !== 'undefined' && PerformanceObserver.supportedEntryTypes?.includes('layout-shift')};
      if (state.supportsCLS) new PerformanceObserver(list => {
        for (const entry of list.getEntries()) state.shifts.push({at: entry.startTime, value: entry.value, recent: entry.hadRecentInput, sources: entry.sources?.map(source => ({element: source.node?.nodeName, class: source.node?.className, before: source.previousRect.toJSON(), after: source.currentRect.toJSON()}))});
      }).observe({type: 'layout-shift', buffered: true});
      const frame = () => {
        const root = document.querySelector('.premium-inbox');
        if (root?.dataset.inboxState === 'ready' && root.querySelector('#inbox-exceptions')) {
          const selected = root.querySelector('.inbox-row[data-selected] [data-inbox-key]');
          const selectedGroup = selected?.closest('details');
          const group = selectedGroup ?? root.querySelector('.premium-group details');
          if (group && state.frames.length < 180) state.frames.push({at: performance.now(), key: selected?.dataset.inboxKey ?? null, selectedGroup: !!selectedGroup, open: group.open, height: group.getBoundingClientRect().height, scrollY});
        }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    if (row.text === 100) await go(page, row, '/app/inbox?filter=planning');
    else {
      await go(page, row, '/app/inbox?filter=now');
      await until(() => page.locator('[data-inbox-state="ready"]').count(), 'Inbox did not release the text-setup state');
      await page.evaluate(() => document.fonts.ready);
      await wait(200);
      await page.evaluate(() => { window.__desktopOpening.from = performance.now(); window.__desktopOpening.frames = []; });
      // Natural source filter render after text settles; no synthetic recent
      // keyboard/pointer exclusion is allowed to hide its layout shift.
      await page.getByRole('button', {name: 'Plan ahead', exact: true}).evaluate(element => element.click());
    }
    await until(() => page.locator('[data-inbox-state="ready"] #inbox-exceptions').count(), 'Owned planning fixture did not arrive');
    await wait(500);
    const opening = await page.evaluate(() => {
      const state = window.__desktopOpening, frames = state.frames.filter(frame => frame.at >= state.from), shifts = state.shifts.filter(shift => shift.at >= state.from && !shift.recent);
      const root = document.querySelector('.premium-inbox');
      return {mode: state.from ? 'source-filter-render-after-text-settles' : 'natural-document-opening', motion: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduce' : 'ordinary', supportsCLS: !!state.supportsCLS, cls: state.supportsCLS ? shifts.reduce((sum, shift) => sum + shift.value, 0) : null, frames, shifts, wide: matchMedia('(min-width:1024px)').matches, rootFont: getComputedStyle(document.documentElement).fontSize, rowCount: root?.querySelectorAll('[data-inbox-key]').length ?? 0};
    });
    row.opening = opening;
    check(row, opening.frames.length > 1, 'Opening captures first-ready and settled native group geometry', opening.frames);
    if (opening.wide) {
      check(row, opening.frames.some(frame => frame.selectedGroup), 'Wide fixture actually selects an item inside a native planning group');
      const last = opening.frames.at(-1);
      check(row, !!last && opening.frames.every(frame => frame.selectedGroup && frame.open && Math.abs(frame.height - last.height) <= 1), 'Selected planning group is open at first ready paint without late growth', opening.frames);
    } else check(row, opening.frames.every(frame => !frame.selectedGroup && !frame.open), 'Narrow source keeps native planning groups closed until the user opens one', opening.frames);
    if (opening.supportsCLS) check(row, opening.cls <= .01, 'Chromium natural opening CLS is at most0.01', {cls: opening.cls, shifts: opening.shifts});
    else check(row, opening.cls === null, 'Unsupported WebKit CLS is recorded as null; geometry supplies the opening evidence');
    await evidence(page, row, 'natural-opening');
    const bounds = () => page.evaluate(() => {
      const box = selector => document.querySelector(selector)?.getBoundingClientRect().toJSON() ?? null;
      return {scrollY, list: box('.inbox-list-column'), pane: box('.inbox-side-column'), selected: document.querySelector('[data-inbox-key][aria-current]')?.getAttribute('data-inbox-key') ?? null};
    });
    const refresh = page.locator('.premium-inbox .nv-pageband button').first();
    await hydrated(refresh, 'onClick');
    const gate = await hold(page, request => request.method() === 'POST' && new URL(request.url()).pathname === '/api/manager/action-center');
    try {
      await refresh.focus();
      const before = await bounds();
      await page.keyboard.press('Enter');
      await gate.wait(1);
      await wait(100);
      const pending = await bounds(), button = await buttonData(refresh);
      check(row, button.focused, 'Inbox held read retains the originating native Enter focus', button);
      check(row, !button.disabled && button.ariaDisabled === 'true', 'Inbox held read is focusable and exposes its guarded pending state', button);
      check(row, !!before.list && !!pending.list && Math.abs(before.list.height - pending.list.height) <= 1 && before.scrollY === pending.scrollY, 'Inbox held read retains list height and reader scroll', {before, pending});
      if (opening.wide) check(row, !!before.pane && !!pending.pane && Math.abs(before.pane.width - pending.pane.width) <= 1, 'Wide held read preserves the actual source pane width', {before, pending});
      await page.keyboard.press('Enter');
      await refresh.evaluate(element => { element.click(); element.click(); });
      await wait(150);
      check(row, gate.count === 1, 'Repeated held Inbox activation sends exactly one action-center read', {count: gate.count});
      await evidence(page, row, 'held-read');
      // IS-P4-21 concerns focus in content that is about to retire, rather than
      // stealing focus from the persistent Refresh control after a failed read.
      const retiring = page.locator('.premium-inbox [data-inbox-key]:visible, .premium-inbox .premium-group details > summary:visible').first();
      await retiring.focus();
      await gate.release(0, 503);
      await until(() => page.locator('[data-inbox-state="unavailable"]').count(), 'Answered503 did not settle to the source unavailable state');
      await wait(100);
      check(row, (await page.locator('.premium-inbox [data-inbox-key]').count()) === 0, 'Failed Inbox read removes private rows');
      const unavailable = await evidence(page, row, '503-private-cleared');
      check(row, unavailable.active?.cls?.includes('inbox-status-message'), 'Failed Inbox read moves retired-row/body focus to the actual status message', unavailable.active);
    } finally { row.reads = gate.summary(); }
  }, {accounts: ['AUDIT-M'], sizes: [[320, 844, 200], [1440, 900, 100]]});

  register('scoped-desktop-inbox-return-uri', ['IS-P4-11'], async ({page, row}) => {
    const filter = row.variant;
    const start = new URL('/app/inbox', baseUrl);
    start.searchParams.set('filter', filter);
    start.searchParams.set('item', item);
    await go(page, row, start.pathname + start.search);
    const sourceRow = page.locator('[data-inbox-key="' + item + '"]');
    await until(async () => (await sourceRow.count()) > 0 || (await page.locator('main a[href*="requestId=' + requestId + '"]').count()) > 0, 'Seeded authorized pending Inbox row did not arrive');
    const hasDesktopContract = (await sourceRow.count()) > 0;
    const link = hasDesktopContract ? sourceRow.first() : page.locator('main a[href*="requestId=' + requestId + '"]').first();
    await link.waitFor();
    const href = new URL(await link.getAttribute('href'), baseUrl);
    check(row, href.pathname === '/app/requests' && href.searchParams.get('requestId') === requestId, 'Released Inbox row opens only its matching time-off review', href.pathname + href.search);
    check(row, href.searchParams.get('filter') === filter, 'Originating row carries its actual Inbox filter');
    check(row, href.searchParams.get('item') === item, 'Originating row carries its allow-listed released item');
    row.selectionMarkup = await page.locator('[data-inbox-key]').count();
    row.proofLimit = hasDesktopContract ? 'Combined source has Desktop selection markup; wide view checks selected row and pane, narrow view checks direct review navigation.' : 'Legacy candidate URI/filter/item only; no selected-row/pane restoration pass is claimed.';
    await evidence(page, row, 'inbox');
    if (hasDesktopContract && row.width >= 1024) {
      await hydrated(link, 'onClick');
      // Click another row first when possible so selecting this item exercises
      // the actual pane transition instead of a same-key no-op.
      const other = page.locator('[data-inbox-key]');
      const alternate = await other.evaluateAll((elements, selected) => elements.find(element => element.dataset.inboxKey !== selected)?.dataset.inboxKey ?? null, item);
      if (alternate) {
        const alternateRow = page.locator('[data-inbox-key="' + alternate + '"]').first();
        await alternateRow.evaluate(element => element.closest('details')?.setAttribute('open', ''));
        await alternateRow.click();
      }
      await link.click();
      await wait(120);
      check(row, (await link.getAttribute('aria-current')) === 'true', 'Wide Inbox selects the original time-off row');
      check(row, new URL(page.url()).searchParams.get('item') === item, 'Wide selection keeps the valid original item in the Inbox URI');
      if (alternate) {
        check(row, await page.locator('#inbox-detail-title').evaluate(element => document.activeElement === element), 'Changing selection to the time-off row focuses its detail heading');
        await page.keyboard.press('Escape');
        check(row, await link.evaluate(element => document.activeElement === element), 'Escape returns detail focus to the selected row');
      } else row.paneFocusGap = 'Only one row in this filter: same-key selection does not exercise the selectedKey-change focus effect; full Desktop manual plan retains multirow proof.';
      const paneReview = page.locator('.inbox-detail__actions a[href*="requestId=' + requestId + '"]').first();
      await paneReview.waitFor();
      await Promise.all([page.waitForURL(url => url.pathname === '/app/requests' && url.searchParams.get('requestId') === requestId), paneReview.click()]);
    } else await Promise.all([page.waitForURL(url => url.pathname === '/app/requests' && url.searchParams.get('requestId') === requestId), link.click()]);
    const back = inboxBack(page);
    await back.waitFor();
    const backUrl = new URL(await back.getAttribute('href'), baseUrl);
    check(row, backUrl.origin === new URL(baseUrl).origin && backUrl.pathname === '/app/inbox', 'Review band returns to the internal Inbox');
    check(row, (backUrl.searchParams.get('filter') ?? 'all') === filter, 'Review band preserves the same normalized Inbox filter');
    check(row, backUrl.searchParams.get('item') === item, 'Review band preserves the original valid selected item');
    await evidence(page, row, 'review');
    await Promise.all([page.waitForURL(url => url.pathname === '/app/inbox'), back.click()]);
    const returned = new URL(page.url());
    check(row, (returned.searchParams.get('filter') ?? 'all') === filter && returned.searchParams.get('item') === item, 'Band Inbox link returns with the same filter and valid item URI');
    if (hasDesktopContract && row.width >= 1024) {
      await until(() => page.locator('[data-inbox-state="ready"]').count(), 'Returned Inbox did not release its ready source');
      await wait(100);
      check(row, await page.locator('[data-inbox-key="' + item + '"]').getAttribute('aria-current') === 'true', 'Band Inbox return restores the original selected row');
      check(row, (await page.locator('.inbox-detail__actions a[href*="requestId=' + requestId + '"]').count()) > 0, 'Band Inbox return restores the matching review pane');
    }
    await evidence(page, row, 'returned-inbox');
  }, {accounts: ['AUDIT-M'], sizes, variants: ['requests', 'all']});

  register('scoped-desktop-inbox-item-allowlist', ['IS-P4-11'], async ({page, row}) => {
    const url = new URL('/app/requests', baseUrl);
    url.searchParams.set('tab', 'pending');
    url.searchParams.set('requestId', row.variant === 'missing-request' ? 'audit-no-such-pending-request' : requestId);
    url.searchParams.set('filter', 'requests');
    url.searchParams.set('from', row.variant === 'home-origin' ? 'home' : 'inbox');
    if (row.variant !== 'absent') url.searchParams.set('item', row.variant === 'mismatch' ? 'TIME_OFF:audit-other-item' : row.variant === 'malformed' ? 'https://example.invalid/TIME_OFF:' + requestId : item);
    await go(page, row, url.pathname + url.search);
    const back = page.locator('main .nv-masthead__back').first();
    await back.waitFor();
    const target = new URL(await back.getAttribute('href'), baseUrl);
    check(row, target.origin === new URL(baseUrl).origin, 'Return target remains same-origin');
    check(row, !target.searchParams.has('item'), 'Absent, malformed, mismatched, nonpending or Home-origin item is not returned', {variant: row.variant, href: target.pathname + target.search});
    if (row.variant === 'home-origin') check(row, target.pathname === '/app' && !target.search, 'Home origin retains its fixed Home destination');
    else check(row, target.pathname === '/app/inbox' && target.searchParams.get('filter') === 'requests', 'Rejected item still preserves allow-listed Inbox filter');
    await evidence(page, row, 'allowlist');
  }, {accounts: ['AUDIT-M'], sizes: [[390, 844, 100]], variants: ['absent', 'mismatch', 'malformed', 'missing-request', 'home-origin']});
}
