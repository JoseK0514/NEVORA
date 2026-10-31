import {expect, it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {AvailabilityDayRows} from './availability-corp';
import {availabilityWeekLabel} from './availability-week-label';

it('shows each day on one row with its hours or Not available (board E-Availability)', () => {
  const html = renderToStaticMarkup(<AvailabilityDayRows days={[
    {key: 1, name: 'Monday', hours: '7:00 AM – 4:00 PM', label: 'Monday, 7:00 AM – 4:00 PM', onOpen: () => {}},
    {key: 3, name: 'Wednesday', hours: null, label: 'Wednesday, not available', onOpen: () => {}},
  ]}/>);
  expect(html).toContain('>Monday<');
  expect(html).toContain('7:00 AM – 4:00 PM');
  expect(html).toContain('c-avail__hours c-avail__hours--off">Not available<');
  expect(html).toContain('aria-haspopup="dialog"');
});

it('keeps a week short enough for a card header', () => {
  expect(availabilityWeekLabel('2026-11-02')).toBe('Nov 2 – 8');
  expect(availabilityWeekLabel('2026-10-26')).toBe('Oct 26 – Nov 1');
});
