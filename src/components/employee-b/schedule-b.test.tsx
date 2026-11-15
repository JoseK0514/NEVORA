import {createElement, type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, vi} from 'vitest';
vi.mock('next/link', () => ({default: ({children, scroll: _scroll, prefetch: _prefetch, ...props}: ComponentProps<'a'> & {scroll?: boolean; prefetch?: boolean}) => createElement('a', props, children)}));
import {ScheduleB, type ScheduleBProps} from './schedule-b';

/* Employee Schedule on the phone, Direction B (fictional data): the screen draws what the page passes. */
const base: ScheduleBProps = {sub: 'Main Office', range: 'Nov 9 – 15', confirmed: false, todayHref: null, prevHref: '/app/schedule?week=2026-11-02', nextHref: '/app/schedule?week=2026-11-16', days: [],
  confirm: {title: 'Confirm this week', detail: 'Your manager asked you to check it', control: <button type="submit" className="employee-action">Confirm</button>},
  celebration: null, changes: null, swap: null, error: null, receipt: null, unavailable: null, unpublished: null,
  open: {count: 2, detail: 'Sat, Nov 14 and Sun, Nov 15', label: 'Open shifts, 2 to pick up', href: '/app/schedule?week=2026-11-09&view=open'},
  list: {label: 'This week', wholeWeekHref: null, rows: null, empty: 'No shifts this week.'}};
const draw = (patch: Partial<ScheduleBProps> = {}) => renderToStaticMarkup(<ScheduleB {...base} {...patch}/>);

it('Confirm is the one filled pill: open shifts get a tinted pill that says where it goes (inspection Nov 14, EM-004)', () => {
  const html = draw();
  expect(html).toContain('<a class="b-btn b-btn--ghost" href="/app/schedule?week=2026-11-09&amp;view=open" aria-label="See open shifts, 2 to pick up">See open shifts</a>');
  // Below the band, nothing but the page's own Confirm control is a filled teal pill.
  expect(html.slice(html.indexOf('class="b-stack"'))).not.toContain('b-btn--teal');expect(html).not.toContain('>See</a>');
  expect(draw({open: {...base.open!, count: 1}})).toContain('aria-label="See open shifts, 1 to pick up"');
  // None to pick up stays a fact with no button.
  expect(draw({open: {...base.open!, count: 0, detail: 'None right now'}})).not.toContain('See open shifts');
});
