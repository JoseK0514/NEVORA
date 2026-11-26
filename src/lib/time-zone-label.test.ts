import { describe, expect, it } from '@rstest/core';
import { formatWithZone, zoneAbbreviation } from './time-zone-label';

// Jose, Nov 26, 2026: zone names match in both languages (Spanish Intl said "GMT-4" where English said "AST").
describe('time zone names', () => {
  const nov = new Date('2026-11-26T19:00:00Z'), jul = new Date('2026-07-01T19:00:00Z');
  it('names Puerto Rico AST and New York EST or EDT', () => {
    expect(zoneAbbreviation('America/Puerto_Rico', nov)).toBe('AST');
    expect(zoneAbbreviation('America/Puerto_Rico', jul)).toBe('AST');
    expect(zoneAbbreviation('America/New_York', nov)).toBe('EST');
    expect(zoneAbbreviation('America/New_York', jul)).toBe('EDT');
  });
  it('reads in English exactly as Intl did, and uses the same name in Spanish', () => {
    const time = { hour: 'numeric', minute: '2-digit' } as const;
    expect(formatWithZone('en-US', time, nov, 'America/Puerto_Rico')).toBe(new Intl.DateTimeFormat('en-US', { ...time, timeZone: 'America/Puerto_Rico', timeZoneName: 'short' }).format(nov));
    expect(formatWithZone('es-PR', time, nov, 'America/Puerto_Rico')).toMatch(/^3:00\sp\.\s?m\. AST$/);
    expect(formatWithZone('es-PR', time, nov, 'America/New_York')).toMatch(/ EST$/);
    expect(formatWithZone('es-PR', time, nov, 'America/Puerto_Rico')).not.toContain('GMT');
  });
});
