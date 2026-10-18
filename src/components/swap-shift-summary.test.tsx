import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { SwapShiftSummary, swapTimeLabel } from './swap-shift-summary';
import type { ExchangeShift } from '@/lib/data/exchanges';

const shift: ExchangeShift = { id:'source', scheduleId:'schedule', employeeId:'self', employeeName:'Fictional Employee', locationId:'location', locationName:'North Office', weekStart:'2035-12-24', date:'2035-12-31', startTime:'22:00', endTime:'06:00', positionId:'support', isDesignatedLead:false, timeZone:'America/Puerto_Rico' };

it('makes the overnight end date explicit across a year boundary', () => {
  expect(swapTimeLabel(shift)).toBe('10:00 PM – 6:00 AM (Tue, Jan 1)');
  const html = renderToStaticMarkup(createElement(SwapShiftSummary, { shift, label:'You receive', employee:true }));
  expect(html).toContain('2035');
  expect(html).toContain('dateTime="2035-12-31"');
  expect(html).toContain('Position support');
  expect(html).toContain('No designated Lead');
  expect(html).toContain('Times in Puerto Rico time');
  expect(html).toContain('Fictional Employee');
});

it('does not imply overnight for a same-day shift', () => {
  expect(swapTimeLabel({ ...shift, startTime:'08:00', endTime:'16:00' })).toBe('8:00 AM – 4:00 PM');
});
it('shows midnight at 24:00 as the following date', () => {
  expect(swapTimeLabel({ ...shift, startTime:'16:00', endTime:'24:00' })).toBe('4:00 PM – 12:00 AM (Tue, Jan 1)');
});
