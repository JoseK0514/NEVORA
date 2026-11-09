/** IS-58: after "Try again", keep keyboard and screen-reader users where they were.
 * Once the recovered content appears, focus its heading (or card); if the retry fails and the
 * button comes back, focus the button again. Stops as soon as the user moves focus themselves. */
export function focusAfterRetry(target: string, retry: string, timeout = 15000) {
  const start = performance.now();
  const from = document.activeElement;
  const land = (element: HTMLElement) => {
    if (!element.matches("a, button, input, select, textarea, summary, [tabindex]")) element.tabIndex = -1;
    element.focus();
  };
  const tick = () => {
    const active = document.activeElement;
    // The user went somewhere else: leave them there.
    if (active && active !== document.body && active !== from && !(active as HTMLElement).matches(retry)) return;
    const found = document.querySelector<HTMLElement>(target);
    if (found) return land(found);
    const again = document.querySelector<HTMLElement>(retry);
    if (again && again !== from && document.activeElement === document.body) return land(again);
    if (performance.now() - start < timeout) window.setTimeout(tick, 100);
  };
  window.setTimeout(tick, 100);
}
