import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it, vi} from 'vitest';
import {EmployeeHomeQuietView, type EmployeeHomeQuietViewProps, type HomeWeek} from './employee-home-quiet';
import {HOME_SOURCES, projectEmployeeHome} from '../lib/employee-home/project';
import type {HomeSnapshot} from '../lib/employee-home/types';

vi.mock('next/link', () => ({default: ({children, ...props}: React.ComponentProps<'a'>) => createElement('a', props, children)}));

const at = '2030-10-07T21:00:00.000Z';
function snapshot(extra: Partial<HomeSnapshot> = {}): HomeSnapshot {
  return {
    observedAt: at, authority: 'a'.repeat(64), validForMs: 45000, timeZone: 'America/Puerto_Rico',
    sources: Object.fromEntries(HOME_SOURCES.map(key => [key, {state: 'complete', observedAt: at, version: 'source-1', reason: null}])) as HomeSnapshot['sources'],
    publicationState: 'complete', nextShift: null, currentShift: null, attention: [], ...extra,
  };
}
const week: HomeWeek = {
  weekStart: '2030-10-07', today: '2030-10-07', dates: Array.from({length: 7}, (_, day) => `2030-10-${String(7 + day).padStart(2, '0')}`),
  shifts: [{date: '2030-10-07', startTime: '08:00', endTime: '16:00'}],
  missed: [{id: 'missed-1', date: '2030-10-07', startTime: '08:00', endTime: '16:00', locationId: 'main', locationName: 'Main Office', day: 'today', hours: '8:00 AM – 4:00 PM', href: '/app/my-time?fix=2030-10-07&from=08%3A00&to=16%3A00&location=main#corrections'}],
};
const render = (props: Partial<EmployeeHomeQuietViewProps>) => renderToStaticMarkup(createElement(EmployeeHomeQuietView, {
  home: null, status: 'loading', refreshing: false, onRetry: () => {}, ownTimeSlot: null, displayName: 'Alexandra', timeZone: 'America/Puerto_Rico', ...props,
})).replace(/[  ]/g, ' ');

describe('Employee Home (U3, Oct 25, 2026)', () => {
  it('UX-E-04 / visual #1: a failed read is one plain row with a visible Try again, the greeting stays, no shift card', () => {
    const markup = render({status: 'unavailable'});
    expect(markup.match(/Couldn’t load Home/g)).toHaveLength(1);
    expect(markup).not.toContain('Couldn’t load your shift');
    expect(markup).toMatch(/<h1><span>Good (morning|afternoon|evening)<\/span><\/h1>/);
    expect(markup).not.toContain('Alexandra');
    expect(markup).toMatch(/class="q-btn q-btn--sec"[^>]*data-home-refresh/);
    expect(markup).not.toContain('q-next');
  });

  it('UX-E-01: an ended shift with nothing recorded is a Needs you row that opens the filled-in correction', () => {
    const home = projectEmployeeHome(snapshot());
    const markup = render({home, status: 'ready', week});
    expect(markup).toContain('No clock-in for today’s shift');
    expect(markup).toContain('8:00 AM – 4:00 PM · Main Office · Fix it');
    expect(markup).toContain('href="/app/my-time?fix=2030-10-07&amp;from=08%3A00&amp;to=16%3A00&amp;location=main#corrections"');
    expect(markup).not.toContain('You’re all set');
  });

  it('the missed shift is private Home data: it clears with Home while paused', () => {
    const home = projectEmployeeHome(snapshot());
    expect(render({home, status: 'paused', week})).not.toContain('No clock-in');
  });

  it('UX-E-03: a location that hasn’t published is not repeated on Home', () => {
    const home = projectEmployeeHome(snapshot({publicationState: 'partial', unpublishedLocations: ['West Office']} as Partial<HomeSnapshot>));
    const markup = render({home, status: 'ready', week: {...week, missed: []}});
    expect(markup).not.toContain('West Office');
    expect(markup).not.toContain('hasn’t published');
  });
});
