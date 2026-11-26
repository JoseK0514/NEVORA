/** A person-facing name for an IANA time zone (D5): "America/Puerto_Rico" reads
 * "Puerto Rico time", matching the "Times in Puerto Rico" wording used elsewhere. */
export function timeZoneLabel(timeZone: string): string {
  const place = timeZone.split('/').at(-1)?.replaceAll('_', ' ').trim();
  return place ? `${place} time` : timeZone;
}

/** The short name of a time zone at a moment, the same in every language (Jose, Nov 26, 2026): "AST" for Puerto Rico,
 * "EST" or "EDT" for New York, and so on for the zones US English names. Spanish Intl names these "GMT-4", so the
 * portal takes the US abbreviation in both languages. A zone US English doesn't name keeps its offset ("GMT+1"). */
export function zoneAbbreviation(timeZone: string, at: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' }).formatToParts(at).find(part => part.type === 'timeZoneName')?.value ?? timeZone;
}

/** A date or time in `locale` followed by the zone's short name from zoneAbbreviation. In US English it reads exactly
 * as Intl's own `timeZoneName: 'short'` ("3:00 PM AST"); in Spanish it reads "3:00 p. m. AST". */
export function formatWithZone(locale: string, options: Omit<Intl.DateTimeFormatOptions, 'timeZone' | 'timeZoneName'>, at: Date, timeZone?: string): string {
  // No zone given: this device's own, as Intl does.
  const zone = timeZone ?? new Intl.DateTimeFormat().resolvedOptions().timeZone;
  return `${new Intl.DateTimeFormat(locale, { ...options, timeZone: zone }).format(at)} ${zoneAbbreviation(zone, at)}`;
}
