/** IS-58: after "Try again", keep keyboard and screen-reader users where they were.
 * Once the recovered content appears, focus its heading (or card); if the retry fails and the
 * button comes back, focus the button again. Stops as soon as the user moves focus themselves.
 * Nov 26, 2026 (QA O1): a recovered page can re-render once more after it first appears (the refresh's second pass), which
 * dropped the focus just given to its heading back to <body>. For SETTLE_MS after landing, focus that falls back to <body>
 * is put on the heading again. A full-page error screen passes `waitForGone`, so the heading is only taken once the error
 * screen itself has left the page. */
export const SETTLE_MS = 2000;

/* QA O1 at 1440 (Nov 26, 2026): the first match can be a heading hidden at that width (the phone-only bar's title, for
 * example); focusing a hidden element does nothing and leaves focus on <body>. Take the first match that is drawn. */
const visible = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)].find(element => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden') ?? null;

export function focusAfterRetry(target: string, retry: string, timeout = 15000, { waitForGone }: { waitForGone?: string } = {}) {
  const start = performance.now();
  const from = document.activeElement;
  let landed: HTMLElement | null = null, landedAt = 0;
  const land = (element: HTMLElement) => {
    if (!element.matches("a, button, input, select, textarea, summary, [tabindex]")) element.tabIndex = -1;
    element.focus();
    landed = element; landedAt = performance.now();
  };
  const tick = () => {
    const now = performance.now(), active = document.activeElement;
    // The user went somewhere else: leave them there.
    if (active && active !== document.body && active !== from && active !== landed && !(active as HTMLElement).matches(retry)) return;
    if (landed) {
      // Settling: keep the heading focused through a late re-render, then stop.
      if (now - landedAt > SETTLE_MS) return;
      if (active === document.body || active === null) { const found = visible(target); if (found) land(found); }
      window.setTimeout(tick, 100);
      return;
    }
    const screenGone = !waitForGone || !document.querySelector(waitForGone);
    const found = screenGone ? visible(target) : null;
    if (found) { land(found); window.setTimeout(tick, 100); return; }
    const again = document.querySelector<HTMLElement>(retry);
    if (again && again !== from && document.activeElement === document.body) return land(again);
    if (now - start < timeout) window.setTimeout(tick, 100);
  };
  window.setTimeout(tick, 100);
}
