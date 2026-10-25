// Accessibility measures the settled sheet, after its real CSS entrance motion.
// Poll the rendered style and animation state; never change page motion or sleep.
export async function waitForCalendarCopyReady(page, noticeText) {
  const ready = await page.waitForFunction(text => {
    const root = document.querySelector('[data-calendar-setting]');
    const notice = [...(root?.querySelectorAll('[role="status"]') ?? [])].find(element => element.textContent === text);
    const copy = [...(root?.querySelectorAll('button') ?? [])].find(element => element.textContent === 'Copy link');
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
  // A Signature sheet, or a v5 Quiet page root (its page itself is the sheet; it has no entrance motion).
  const selector = '[data-sig-sheet], [data-nv-page]';
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
