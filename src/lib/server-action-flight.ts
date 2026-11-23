/** Server Actions this tab has started, for the scoped read frame (gaps G58, Nov 23, 2026).
 *
 * Next's router runs a Server Action at the head of its queue until the action's new state (its redirect included) is
 * applied. Any `router.replace` or `router.push` that starts first marks the action discarded: the caller still sees
 * the redirect error, but the redirect never happens. The frame's proactive refresh was such a replace, so a slow
 * Publish landed back on the review instead of Find cover. While an action is in flight, or has started since the
 * frame's page rendered, the frame refreshes with `router.refresh()`, which Next queues behind the action instead.
 *
 * This only records timing; it grants nothing and sends nothing. */
let started = 0, running = 0;

/** Call as a Server Action starts; call the returned function once it settles (resolved, rejected or redirected). */
export function serverActionStarted(): () => void {
  started++; running++;
  let done = false;
  return () => { if (done) return; done = true; running = Math.max(0, running - 1); };
}
/** True while a Server Action this tab started has not settled. */
export const serverActionRunning = () => running > 0;
/** How many Server Actions this tab has started; a frame compares it with the count when its page rendered. */
export const serverActionsStarted = () => started;
/** Test seam: a fresh tab. */
export function resetServerActionFlight() { started = 0; running = 0; }
