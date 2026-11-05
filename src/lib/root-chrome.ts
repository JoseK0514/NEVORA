/** Presentation only (QA D16). A page the shell can't recognise as a tab from its address (the signed-in 404, whose
 * address is whatever was typed) can still ask for a tab page's phone chrome: the shared header with the wordmark, bell
 * and avatar. A page claims it while mounted; the shell reads the claim. No route, data or access check depends on it. */
let claims = 0;
const listeners = new Set<() => void>();
const emit = () => { for (const listener of listeners) listener(); };

export function claimRootChrome(): () => void {
  claims += 1; emit();
  let released = false;
  return () => { if (released) return; released = true; claims -= 1; emit(); };
}
export function subscribeRootChrome(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export const rootChromeClaimed = (): boolean => claims > 0;
