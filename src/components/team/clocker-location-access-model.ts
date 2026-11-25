/* The rules behind the Owner's "Clock in at" control (Clocker UI step 1). Pure functions, shared by the server page (the
 * row's summary) and the client sheet, and tested without a browser. The data contract is Codex's
 * saveClockerLocationAccessAction: employeeId, mode, expectedUpdatedAt, and one locationId per selection only for
 * SELECTED (ASSIGNED and ALL send none). */
import { clockerLocationCopy, type ClockerLocationLang } from './clocker-location-access-copy';

export type ClockerLocationMode = 'ASSIGNED' | 'SELECTED' | 'ALL';
export type ClockerLocationBaseline = { mode: ClockerLocationMode; locationIds: string[]; updatedAt: string };
export type ClockerLocationPlace = { id: string; name: string };
/** Where the sheet stands: editing (idle), the request in flight, the server's confirmation, or its refusal. */
export type ClockerLocationStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'failed'; message: string; refresh: boolean };

const same = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join('\u0000') === [...b].sort().join('\u0000');

/** The places a mode lets them clock in at, in the company's location order. */
export function clockerLocationsAllowed(mode: ClockerLocationMode, selected: string[], work: string[], places: ClockerLocationPlace[]) {
  const ids = mode === 'ALL' ? places.map(place => place.id) : mode === 'ASSIGNED' ? work : selected;
  return places.filter(place => ids.includes(place.id));
}

/** The person page row's one line: the answer, said once. */
export function clockerLocationSummary(lang: ClockerLocationLang, baseline: Pick<ClockerLocationBaseline, 'mode' | 'locationIds'>, work: string[], places: ClockerLocationPlace[]) {
  const t = clockerLocationCopy[lang];
  if (baseline.mode === 'ALL') return `${t.every} · ${t.everyDetail}`;
  const names = clockerLocationsAllowed(baseline.mode, baseline.locationIds, work, places).map(place => place.name).join(', ') || t.none;
  return baseline.mode === 'ASSIGNED' ? `${t.where} · ${names}` : names;
}

/** "Works here", and "· Main" on their main location: where they work, beside where they may clock in. */
export function clockerLocationTag(lang: ClockerLocationLang, id: string, work: string[], primaryId: string | null) {
  const t = clockerLocationCopy[lang];
  return [work.includes(id) ? t.worksHere : null, id === primaryId ? t.main : null].filter(Boolean).join(' · ');
}

/** The ticks the sheet opens with: the saved list for SELECTED, otherwise where they work (a starting point if the Owner
 * chooses "Only these locations"). Only active locations can be ticked. */
export function clockerLocationInitialPicks(baseline: ClockerLocationBaseline, work: string[], places: ClockerLocationPlace[]) {
  const active = new Set(places.map(place => place.id));
  return (baseline.mode === 'SELECTED' ? baseline.locationIds : work).filter(id => active.has(id));
}

export function clockerLocationChanged(baseline: ClockerLocationBaseline, mode: ClockerLocationMode, picked: string[]) {
  return mode !== baseline.mode || (mode === 'SELECTED' && !same(picked, baseline.locationIds));
}

/** "Only these locations" with nothing ticked can't be saved. */
export function clockerLocationInvalid(mode: ClockerLocationMode, picked: string[]) {
  return mode === 'SELECTED' && picked.length === 0;
}

/** The action's fields, exactly: no other keys, one locationId per tick and only for SELECTED. */
export function clockerLocationFormData(employeeId: string, baseline: ClockerLocationBaseline, mode: ClockerLocationMode, picked: string[]) {
  const data = new FormData();
  data.set('employeeId', employeeId);
  data.set('mode', mode);
  data.set('expectedUpdatedAt', baseline.updatedAt);
  if (mode === 'SELECTED') for (const id of [...new Set(picked)]) data.append('locationId', id);
  return data;
}

export type ClockerLocationResult = { ok: true; access: { mode: ClockerLocationMode; locationIds: string[]; updatedAt: string } }
  | { ok: false; error: string; refresh: boolean };

/** What the sheet shows after a reply: the new baseline on success; the server's sentence and whether the profile must be
 * reloaded (stale or uncertain) on refusal. Decided by `ok` and `refresh`, never by the words. */
export function clockerLocationAfter(result: ClockerLocationResult, baseline: ClockerLocationBaseline): { baseline: ClockerLocationBaseline; status: ClockerLocationStatus } {
  if (result.ok) return { baseline: { mode: result.access.mode, locationIds: result.access.locationIds, updatedAt: result.access.updatedAt }, status: { kind: 'saved' } };
  return { baseline, status: { kind: 'failed', message: result.error, refresh: result.refresh } };
}
