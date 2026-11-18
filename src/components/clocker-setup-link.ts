/* The tablet setup link (Phase 6, JR-26). The Owner's "Clocker tablets" page draws it as a QR code; the kiosk's setup
 * screen reads it. The setup code is a credential, so it rides in the fragment ("#setup="): a browser never sends a
 * fragment to a server, never writes it to a server log and never puts it in a Referer header. It is never a query
 * string. Nothing here logs, stores or sends what it is given. */

/** The two shapes a setup code has (the same check the kiosk has always made before sending anything). */
export function isSetupCode(code: string): boolean {
  return code.length <= 4096 && (/^nev_enr_[a-f0-9]{64}$/.test(code) || /^nw1_v1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{22}$/.test(code));
}

/** The link for one location's kiosk with the code in its fragment. */
export function setupLink(origin: string, locationKey: string, code: string): string {
  return `${origin}/clocker/${encodeURIComponent(locationKey)}#setup=${encodeURIComponent(code)}`;
}

/** Reads a setup code out of a location fragment. `null`: the fragment is not a setup link. `''`: it is one, but the
 * code in it is not complete. */
export function setupCodeFromHash(hash: string): string | null {
  if (!hash.startsWith('#setup=')) return null;
  let code = '';
  try { code = decodeURIComponent(hash.slice('#setup='.length)).trim(); } catch { /* a broken escape is an incomplete code */ }
  return isSetupCode(code) ? code : '';
}
