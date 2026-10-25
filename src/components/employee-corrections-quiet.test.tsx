import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it, vi} from 'vitest';
import {CorrectionFields, RequestRow, emptyDraft} from './employee-corrections-quiet';
import type {EmployeeTimeCorrections, PublicCorrectionItem} from '@/lib/time-corrections/read-model';

vi.mock('next/link', () => ({default: ({children, ...props}: React.ComponentProps<'a'>) => createElement('a', props, children)}));
vi.mock('next/navigation', () => ({useRouter: () => ({back: vi.fn()}), usePathname: () => '/app/my-time'}));

const zone = 'America/Puerto_Rico';
const ready: Extract<EmployeeTimeCorrections, {state: 'ready'}> = {
  state: 'ready', observedAt: '2026-10-25T21:00:00Z', timeZone: zone, totalRequests: 0,
  locations: [{id: 'main', name: 'Main Office'}, {id: 'west', name: 'West Office'}], requests: [],
  targets: [{kind: 'ENTRY_BOUNDARY', timeEntryId: 'entry-1', breakEntryId: null, recordedStartAt: '2026-10-24T12:05:00Z', recordedEndAt: '2026-10-24T20:00:00Z',
    context: {state: 'confirmed', sourceKind: 'RECORDED', startAt: '2026-10-24T12:05:00Z', endAt: '2026-10-24T20:00:00Z', totalDecisions: 0, decisions: []}}],
};
const plain = (html: string) => html.replace(/[  ]/g, ' ');
const fields = (extra: Partial<Parameters<typeof CorrectionFields>[0]> = {}) => plain(renderToStaticMarkup(createElement(CorrectionFields, {draft: emptyDraft('main'), set: () => {}, ready, zone, disabled: false, errors: {}, ...extra})));

describe('T-19 correction sheet', () => {
  it('asks what to fix, then when (teal picker rows, no ticket), then a required note', () => {
    const html = fields();
    for (const text of ['What to fix', 'Missing time', 'Wrong clock-in', 'Wrong clock-out', 'When', 'Day', 'Location', 'Starts', 'Ends', 'Why wasn’t it recorded?', '0/500', 'Your manager reviews it. Your original punches are kept.']) expect(html).toContain(text);
    expect(html).toContain('type="date"');
    expect(html).toContain('type="time"');
    expect(html).not.toContain('datetime-local');
    expect(html).not.toContain('Tap a time to change it');
    expect(html).not.toContain('START');
  });

  it('offers clock-in and clock-out only for a recorded entry with a confirmed time, and a filled-in missing shift reads plainly', () => {
    expect(fields({ready: {...ready, targets: []}})).not.toContain('Wrong clock-in');
    const html = fields({draft: {...emptyDraft('main'), day: '2026-10-25', from: '22:00', to: '06:00'}});
    expect(html).toContain('Sun, Oct 25');
    expect(html).toContain('10:00 PM');
    expect(html).toContain('6:00 AM next day');
  });

  it('says what is missing under its group', () => {
    const html = fields({errors: {when: 'Choose the day and when you started and finished.', reason: 'Say why it wasn’t recorded.'}});
    expect(html).toContain('Choose the day and when you started and finished.');
    expect(html).toContain('Say why it wasn’t recorded.');
  });
});

describe('T-19 correction history row', () => {
  const item: PublicCorrectionItem = {id: 'c1', kind: 'MISSING_ENTRY', status: 'PENDING', revision: 1, createdAt: '2026-10-25T21:10:00Z', locationId: 'main', locationName: 'Main Office',
    originalStartAt: null, originalEndAt: null, proposedStartAt: '2026-10-25T12:00:00Z', proposedEndAt: '2026-10-25T20:00:00Z', breakName: null, reason: 'Clocker was offline', baseChanged: false, context: {state: 'none'}};
  const row = (extra: Partial<PublicCorrectionItem> = {}) => plain(renderToStaticMarkup(createElement('ul', null, createElement(RequestRow, {item: {...item, ...extra}, zone, onReplace: () => {}, busy: false}))));

  it('is one row: what and when, the hours and location, and Waiting; its sheet has Before and After', () => {
    const html = row();
    expect(html).toContain('Missing time · Oct 25');
    expect(html).toContain('8:00 AM – 4:00 PM · Main Office');
    expect(html).toContain('Waiting');
    expect(html).toContain('Not recorded');
    expect(html).toContain('Clocker was offline');
    expect(html).not.toContain('Current effective');
    expect(html).not.toContain('<s>');
  });

  it('names a clock-in fix and a decided request plainly', () => {
    const html = row({kind: 'ENTRY_BOUNDARY', status: 'APPROVED', originalStartAt: '2026-10-25T12:20:00Z', originalEndAt: '2026-10-25T20:00:00Z'});
    expect(html).toContain('Wrong clock-in · Oct 25');
    expect(html).toContain('Approved');
    expect(html).toContain('8:20 AM – 4:00 PM');
  });
});
