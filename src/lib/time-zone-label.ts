/** A person-facing name for an IANA time zone (D5): "America/Puerto_Rico" reads
 * "Puerto Rico time", matching the "Times in Puerto Rico" wording used elsewhere. */
export function timeZoneLabel(timeZone: string, lang: 'en' | 'es' = 'en'): string {
  const place = timeZone.split('/').at(-1)?.replaceAll('_', ' ').trim();
  // Signed-in Spanish (es-rest R2): "Hora de Puerto Rico".
  return place ? lang === 'es' ? `Hora de ${place}` : `${place} time` : timeZone;
}
