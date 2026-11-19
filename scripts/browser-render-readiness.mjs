// Accessibility measures the settled sheet, after its real CSS entrance motion.
// Poll the rendered style and animation state; never change page motion or sleep.
// Login is complete when the authenticated shell and its protected notification
// read are ready. Unrelated dashboard polling cannot define page readiness.
export async function waitForPortalReady(page) {
  await page.locator('.app-shell.nevora-portal').waitFor();
  await page.waitForFunction(() => document.querySelector('.portal-notification-bell')?.getAttribute('data-state') === 'ready');
}

// Contrast and target geometry describe the settled control. Wait for its own
// and ancestor motion without changing styles, emulating reduced motion or
// accepting unfinished/infinite animations. Keep one original bounded deadline.
export async function waitForControlPaint(control, timeout = 2000) {
  if (!Number.isFinite(timeout) || timeout <= 0) throw new RangeError('A positive paint deadline is required');
  const deadline = performance.now() + timeout;
  const element = await control.elementHandle({timeout});
  if (!element) throw new Error('The expected control is absent');
  try {
    if (performance.now() >= deadline) throw new Error('Control paint exceeded its original deadline');
    const ready = await control.page().waitForFunction(element => {
      if (!element.isConnected) return false;
      for (let node = element; node; node = node.parentElement) {
        node.getBoundingClientRect();
        if (node.getAnimations().some(animation => animation.pending || animation.playState === 'running' || animation.playState === 'paused')) return false;
      }
      return true;
    }, element, {timeout: Math.max(1, deadline - performance.now())});
    await ready.dispose();
    if (performance.now() >= deadline) throw new Error('Control paint exceeded its original deadline');
  } finally {await element.dispose();}
}

export async function waitForCalendarCopyReady(page, noticeText) {
  const ready = await page.waitForFunction(text => {
    const root = [...document.querySelectorAll('.b-screen:has(#b-calendar-title), [data-calendar-setting]')].find(element => element.getClientRects().length > 0);
    const notice = [...(root?.querySelectorAll('[role="status"]') ?? [])].find(element => element.textContent === text);
    const copy = [...(root?.querySelectorAll('button') ?? [])].find(element => element.textContent === 'Copy calendar link');
    return notice?.parentElement === document.activeElement && copy && !copy.disabled &&
      copy.getAnimations().every(animation => !Number.isFinite(animation.effect?.getComputedTiming().endTime) ||
        (!animation.pending && animation.playState === 'finished'));
  }, noticeText);
  await ready.dispose();
}

export async function waitForReviewedTimeOff(page, requestId) {
  const ready = await page.waitForFunction(id =>
    [...document.querySelectorAll('.q-timeoff [role="status"]')].some(element => element.textContent === 'Decision saved.') &&
    !document.getElementById('request-' + id), requestId);
  await ready.dispose();
}

export async function waitForSheetEntrance(page) {
  // A Signature sheet, a v5 Quiet / corporate page root, or an employee phone page root (.em-requests).
  const selector = '[data-sig-sheet], [data-nv-page], .em-requests';
  await page.locator(selector).first().waitFor({state: 'visible'});
  const sample = () => page.locator(selector).evaluateAll(elements => elements.map(element => ({
    opacity: Number(getComputedStyle(element).opacity),
    animations: element.getAnimations().map(animation => ({
      name: animation.animationName ?? null,
      state: animation.playState,
      pending: animation.pending,
      time: animation.currentTime,
      end: animation.effect?.getComputedTiming().endTime,
    })),
  })));
  const before = await sample();
  await page.waitForFunction(selector => [...document.querySelectorAll(selector)].every(element => {
    const opacity = Number(getComputedStyle(element).opacity);
    return opacity === 1 && element.getAnimations().every(animation =>
      !Number.isFinite(animation.effect?.getComputedTiming().endTime) ||
      (!animation.pending && animation.playState === 'finished'));
  }), selector);
  return {before, after: await sample()};
}

export async function restoreSheetMotion(page) {
  await page.emulateMedia({reducedMotion: 'no-preference'});
  return waitForSheetEntrance(page);
}

export async function waitForPrivateIntentClear(page) {
  await page.locator('input[name="authority"]').waitFor({state: 'detached'});
  return page.locator('input[name="authority"]').count();
}

// Native open state precedes rendered ::details-content during its CSS transition.
// Keep the real motion and require its finite animations to finish before measuring.
export async function waitForDisclosureReady(disclosure, timeout = 15000) {
  if (!Number.isFinite(timeout) || timeout <= 0) throw new RangeError('A positive disclosure deadline is required');
  const deadline = performance.now() + timeout;
  const element = await disclosure.elementHandle({timeout});
  if (!element) throw new Error('The expected disclosure is absent');
  try {
    if (performance.now() >= deadline) throw new Error('Disclosure readiness exceeded its original deadline');
    const ready = await disclosure.page().waitForFunction(element => {
      element.getBoundingClientRect();
      return element.isConnected && element.open &&
      getComputedStyle(element, '::details-content').contentVisibility !== 'hidden' &&
      element.getAnimations({subtree: true}).every(animation =>
        !Number.isFinite(animation.effect?.getComputedTiming().endTime) ||
        (!animation.pending && animation.playState === 'finished'));
    }, element, {timeout: Math.max(1, deadline - performance.now())});
    await ready.dispose();
    if (performance.now() >= deadline) throw new Error('Disclosure readiness exceeded its original deadline');
  } finally {
    await element.dispose();
  }
}
