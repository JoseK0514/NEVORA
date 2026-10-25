import {describe, expect, it} from 'vitest';
import {correctionHref, findMissedShifts} from './missed-shifts';

const zone = 'America/Puerto_Rico';
const locations = [{id: 'main', shortName: 'Main Office'}];
const shift = (id: string, date: string, startTime = '08:00', endTime = '16:00') => ({id, date, startTime, endTime, locationId: 'main', isCalloutApproved: false});
// Sunday Oct 25, 2026 at 5:00 PM in Puerto Rico (UTC−4).
const now = new Date('2026-10-25T21:00:00Z');

describe('UX-E-01 missed shifts', () => {
  it('finds an ended shift today with nothing recorded and links to a filled-in correction', () => {
    const found = findMissedShifts({shifts: [shift('s1', '2026-10-25')], entries: [], corrections: [], locations, today: '2026-10-25', now, timeZone: zone});
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({id: 's1', day: 'today', hours: '8:00 AM – 4:00 PM', locationName: 'Main Office'});
    expect(found[0].href).toBe('/app/my-time?fix=2026-10-25&from=08%3A00&to=16%3A00&location=main#corrections');
  });

  it('ignores shifts that have not ended, other days, approved call-outs and recorded or corrected time', () => {
    const later = shift('later', '2026-10-25', '18:00', '22:00');
    const old = shift('old', '2026-10-22');
    const called = {...shift('called', '2026-10-24'), isCalloutApproved: true};
    const worked = shift('worked', '2026-10-24');
    const fixed = shift('fixed', '2026-10-25');
    const found = findMissedShifts({
      shifts: [later, old, called, worked, fixed], locations, today: '2026-10-25', now, timeZone: zone,
      entries: [{clockInAt: '2026-10-24T12:05:00Z', clockOutAt: '2026-10-24T20:00:00Z'}],
      corrections: [{status: 'PENDING', proposedStartAt: '2026-10-25T12:00:00Z', proposedEndAt: '2026-10-25T20:00:00Z'}],
    });
    expect(found).toEqual([]);
  });

  it('a declined correction does not cover the shift; yesterday counts', () => {
    const found = findMissedShifts({shifts: [shift('y', '2026-10-24')], entries: [], locations, today: '2026-10-25', now, timeZone: zone,
      corrections: [{status: 'REJECTED', proposedStartAt: '2026-10-24T12:00:00Z', proposedEndAt: '2026-10-24T20:00:00Z'}]});
    expect(found.map(item => [item.id, item.day])).toEqual([['y', 'yesterday']]);
  });

  it('a shift that runs to midnight links with an end of 00:00 (the next day)', () => {
    expect(correctionHref({date: '2026-10-24', startTime: '16:00', endTime: '24:00', locationId: 'main'})).toContain('to=00%3A00');
  });
});
