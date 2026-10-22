// Accessibility measures the settled sheet, after its real CSS entrance motion.
// Poll the rendered style and animation state; never change page motion or sleep.
export async function waitForSheetEntrance(page) {
  const selector = '[data-sig-sheet]';
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
