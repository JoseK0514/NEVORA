/* The kiosk's name picker (Clocker UI step 3, Option C, Jose's pick Nov 25, 2026): the roster's rules, kept pure so they
 * are tested without a browser. Codex's contract (docs/handoffs/2026-11-23-clocker-name-picker.md, "Enrolled iPad"):
 * POST /api/clocker/[location]/pin {action:'roster'} answers {state:'employee_id'} or {state:'name_picker', people:
 * [{displayName, selection}]}; a name is verified with {action:'verify', selection, pin}. The roster lives in memory only.
 * Names that would be ambiguous never arrive (the server leaves them out), so those people use their Employee ID. */

export type RosterPerson = { displayName: string; selection: string };
/** loading: nothing in memory yet (the first read, or after the roster was cleared); id: the Employee ID form (the tablet
 * isn't in picker mode, or the list is empty); picker: the names; failed: the read failed, so the Employee ID form says
 * why. */
export type RosterState = { kind: 'loading' } | { kind: 'id' } | { kind: 'picker'; people: RosterPerson[] } | { kind: 'failed' };

/** Search appears above this many names (Jose, Nov 25). */
export const ROSTER_SEARCH_THRESHOLD = 12;

const SELECTION = /^[0-9a-f]{64}$/;

/** The roster reply, read strictly: names only with a well-formed selection; anything else is not a picker. An empty
 * list falls back to the Employee ID. A reply that isn't an object is a failed read. */
export function parseRoster(reply: unknown): RosterState {
  if (!reply || typeof reply !== 'object' || Array.isArray(reply)) throw Error('roster reply');
  const data = reply as { state?: unknown; people?: unknown };
  if (data.state !== 'name_picker' || !Array.isArray(data.people)) return { kind: 'id' };
  const people = data.people.flatMap((entry: unknown) => {
    if (!entry || typeof entry !== 'object') return [];
    const { displayName, selection } = entry as Record<string, unknown>;
    return typeof displayName === 'string' && displayName.trim() && typeof selection === 'string' && SELECTION.test(selection)
      ? [{ displayName: displayName.trim(), selection }] : [];
  });
  return people.length ? { kind: 'picker', people } : { kind: 'id' };
}

/** The PIN check's body: exactly one of employeeId or selection, never both, never neither. */
export function verifyBody(subject: { employeeId: string } | { selection: string }, pin: string) {
  return 'selection' in subject ? { action: 'verify', selection: subject.selection, pin } : { action: 'verify', employeeId: subject.employeeId, pin };
}

const fold = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** People in alphabetical order for the tablet's language. */
export function rosterSorted(people: RosterPerson[], lang: 'en' | 'es') {
  return [...people].sort((a, b) => a.displayName.localeCompare(b.displayName, lang === 'es' ? 'es' : 'en'));
}

/** A search matches the start of any word, without accents or case ("luc" finds "Lucía O."). */
export function rosterMatches(people: RosterPerson[], query: string) {
  const q = fold(query.trim());
  return q ? people.filter(person => fold(person.displayName).split(/\s+/).some(part => part.startsWith(q))) : people;
}

/** The tile's initials, from the name only ("Lucía O." → "LO"). */
export function rosterInitials(displayName: string) {
  return displayName.split(/\s+/).map(part => part.replace(/[^\p{L}]/gu, '')[0] ?? '').join('').slice(0, 2).toUpperCase();
}

/** After a denied PIN for a chosen name: the selection is stale when a fresh roster no longer carries it. */
export function selectionIsStale(fresh: RosterState, selection: string) {
  return fresh.kind !== 'picker' || !fresh.people.some(person => person.selection === selection);
}

/** A roster read is answered only if no newer read or clear started since (late replies for an old screen are dropped). */
export function rosterReplyCurrent(started: number, current: number) {
  return started === current;
}

/* The layout hint (lead, Nov 25): a tablet's sign-in mode rarely changes, so it remembers only its last mode, 'picker' or
 * 'id', per location, to reserve the right height while the roster loads. Never names, selections or counts. A wrong hint
 * costs one layout shift. Every read and write is guarded (private mode, blocked storage). */
export type RosterHint = 'picker' | 'id';
const hintKey = (locationKey: string) => `nevora.clocker.signin-layout.${locationKey}`;
/** What a roster reply says about the layout: only 'picker' or 'id'; a failed or pending read says nothing. */
export function rosterHintFor(state: RosterState): RosterHint | null {
  return state.kind === 'picker' ? 'picker' : state.kind === 'id' ? 'id' : null;
}
export function readRosterHint(locationKey: string): RosterHint | null {
  try { const value = window.localStorage.getItem(hintKey(locationKey)); return value === 'picker' || value === 'id' ? value : null; } catch { return null; }
}
export function writeRosterHint(locationKey: string, state: RosterState) {
  const hint = rosterHintFor(state); if (!hint) return;
  try { window.localStorage.setItem(hintKey(locationKey), hint); } catch { /* Storage blocked: no hint next time. */ }
}
export function clearRosterHint(locationKey: string) {
  try { window.localStorage.removeItem(hintKey(locationKey)); } catch { /* Storage blocked: nothing stored. */ }
}
/** A roster read that failed because the tablet is no longer set up (401). */
export class RosterReadError extends Error { constructor(readonly status: number) { super('roster ' + status); } }

/** The roster read. Its own short timeout: an Employee ID tablet waits for this answer before its form turns on. */
export async function readRoster(locationKey: string, signal?: AbortSignal): Promise<RosterState> {
  const response = await fetch(`/api/clocker/${encodeURIComponent(locationKey)}/pin`, {
    method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json', 'X-Nevora-Clocker': '1' },
    body: JSON.stringify({ action: 'roster' }), signal: signal ?? AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new RosterReadError(response.status);
  return parseRoster(await response.json());
}
