import { expect, it } from 'vitest';
import { timeZoneLabel } from './time-zone-label';
it('names a zone by its place, never the raw identifier', () => {
  expect(timeZoneLabel('America/Puerto_Rico')).toBe('Puerto Rico time');
  expect(timeZoneLabel('America/Argentina/Buenos_Aires')).toBe('Buenos Aires time');
  expect(timeZoneLabel('UTC')).toBe('UTC time');
  expect(timeZoneLabel('')).toBe('');
});
