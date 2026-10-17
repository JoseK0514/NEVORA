/** A person-facing name for an IANA time zone (D5): "America/Puerto_Rico" reads
 * "Puerto Rico time", matching the "Times in Puerto Rico" wording used elsewhere. */
export function timeZoneLabel(timeZone: string): string {
  const place = timeZone.split('/').at(-1)?.replaceAll('_', ' ').trim();
  return place ? `${place} time` : timeZone;
}
