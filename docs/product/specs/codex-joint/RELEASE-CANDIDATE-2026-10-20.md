# October 20 release-candidate rehearsal

**Blocked at Wave A; this is not a completed release candidate.** No Claude branch was modified or pushed. No deployment. Refreshed against the newer Phase 1 and Wave A pushes discovered during final synchronization.

## Pinned inputs and merge order

| Order | Branch | Commit | Result |
|---|---|---|---|
| 0 | `claude/premium-phase-1` | `672232896b66a520d39939c1ae3e0227c8b1dc90` | Base |
| 1 | `claude/p35-profile-6cdee8` | `be4a232a1e6a26b58314ff549f88e5a8a79e82c6` | Merged; CSS conflict resolved |
| 2 | `claude/p35-wave-a-1283c8` | `c05e0c7cd703fbf19e05e60bb4d488e1d9b19bb0` | Merge in progress; two component/test conflicts unchosen |
| 3 | `claude/p35-wave-b-808dfd` | `b0e051a951642ff34692604147fcd76ba805a3e7` | Not reached |
| 4 | `claude/p35-wave-c-93e13c` | `b109ec3fea10418fb9f5c9da2af0a1e561dc2678` | Not reached |
| 5 | `claude/p4-desktop-240fe0` | `578748d705b941d14f37c0b01bfcfb1332343e31` | Not reached |
| 6 | `codex/premium-backend` | `4b9f607ae3bb59e8af6af2dcd7bc380d3d8366fe` | Not reached |

The clean candidate HEAD is **`bec0ed4e64be7a4db3351973e1dc9993eeb90e8b`**, pushed to `origin/codex/release-candidate` as a partial rehearsal only. It includes latest Phase 1 plus Profile. The earlier partial candidate `d91be8c` is retained as a parent through a normal merge, so the refresh was a fast-forward push and lost no published history. The refreshed Profile merge is `ee1ba7d`.

Wave A is held as an uncommitted merge in `/workspace/NEVORA-release`. Both non-CSS conflicts remain unchosen. Later branches cannot merge in the requested order while they are open. `INBOX_COUNT_ENDPOINT_READY` has not been changed because the combined merge has not completed. Backend updates after this input freeze must be refreshed at resume before its final merge.

## Conflicts

- **Profile merge, `src/app/app/portal-premium.css`:** kept the exact latest Phase 1 stylesheet. Incoming added rules were already represented; no duplicate rules were appended.
- **Wave A merge, same CSS:** kept latest Phase 1, checked incoming additions, and found all already present. No existing Phase 1 declaration was replaced. CSS is resolved/staged.
- **Wave A, `src/components/swap-shift-summary.tsx`: UNRESOLVED.** Phase 1/Profile retains the icon-led `swap-assignment` layout, whole dates and both designated-lead labels. Latest Wave A uses `wa-shift` and `MetaParts`, says “Shift lead” only for a lead, and omits the false-lead label. Common automatic changes also leave duplicate `keepWhole` imports until resolved.
- **Wave A, `src/components/swap-shift-summary.test.tsx`: UNRESOLVED.** Phase 1 expects “No designated lead” for a shift without a lead. Wave A expects no lead text at all.

Both conflicts belong to **Claude Wave A + Phase 1 coordinator**. Jose’s rule requires leaving every non-CSS conflict unchosen. Exact index sides follow.

### src/components/swap-shift-summary.tsx

Phase 1/Profile side (index stage 2):

```tsx
import { keepWhole } from '@/lib/keep-whole';
import { CalendarBlankIcon } from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import { timeZoneLabel } from '@/lib/time-zone-label';
import { MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { MedalIcon } from '@phosphor-icons/react/dist/ssr/Medal';
import { UserCircleIcon } from '@phosphor-icons/react/dist/ssr/UserCircle';
import type { ExchangeShift } from '@/lib/data/exchanges';
import { addDays, formatDayLabel, formatTime } from '@/lib/date-utils';

export function swapDateLabel(date: string) {
  return keepWhole(new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`)));
}

export function swapTimeLabel(shift: ExchangeShift) {
  const overnight = shift.endTime.slice(0, 5) < shift.startTime.slice(0, 5) || shift.endTime.slice(0, 5) === '24:00';
  const endDate = formatDayLabel(addDays(shift.date, 1));
  return keepWhole(`${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}${overnight ? ` (${endDate.weekday}, ${endDate.day})` : ''}`);
}

export function swapPositionLabel(shift: ExchangeShift) {
  return shift.positionName ?? (shift.positionId ? `Position ${shift.positionId}` : 'No assigned position');
}

export function SwapShiftSummary({ shift, label, employee = false }: { shift: ExchangeShift; label: string; employee?: boolean }) {
  return <section className="swap-assignment" aria-label={label}>
    <p className="swap-assignment-label">{label}</p>
    <p className="swap-assignment-date"><CalendarBlankIcon size={18} aria-hidden="true" /><time dateTime={shift.date}>{swapDateLabel(shift.date)}</time></p>
    <strong className="swap-assignment-time">{swapTimeLabel(shift)}</strong>
    <ul className="swap-assignment-details">
      {employee ? <li><UserCircleIcon size={18} aria-hidden="true" /><span>{shift.employeeName}</span></li> : null}
      <li><MapPinIcon size={18} aria-hidden="true" /><span>{shift.locationName}</span></li>
      <li><BriefcaseIcon size={18} aria-hidden="true" /><span>{swapPositionLabel(shift)}</span></li>
      <li><MedalIcon size={18} aria-hidden="true" /><span>{shift.isDesignatedLead ? 'Designated lead' : 'No designated lead'}</span></li>
    </ul>
    {shift.timeZone ? <p className="swap-timezone">Times in {timeZoneLabel(shift.timeZone)}</p> : null}
  </section>;
}
```

Wave A side (index stage 3):

```tsx
import { timeZoneLabel } from '@/lib/time-zone-label';
import type { ExchangeShift } from '@/lib/data/exchanges';
import { addDays, formatDayLabel, formatTime } from '@/lib/date-utils';
import { keepWhole } from '@/lib/keep-whole';
import { MetaParts } from '@/components/kit/kit';

export function swapDateLabel(date: string) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}

export function swapTimeLabel(shift: ExchangeShift) {
  const overnight = shift.endTime.slice(0, 5) < shift.startTime.slice(0, 5) || shift.endTime.slice(0, 5) === '24:00';
  const endDate = formatDayLabel(addDays(shift.date, 1));
  return `${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}${overnight ? ` (${endDate.weekday}, ${endDate.day})` : ''}`;
}

export function swapPositionLabel(shift: ExchangeShift) {
  return shift.positionName ?? (shift.positionId ? `Position ${shift.positionId}` : 'No assigned position');
}

/** One side of a swap: the label ("You give"), the day, the time, then who, where and what. Times never split. */
export function SwapShiftSummary({ shift, label, employee = false }: { shift: ExchangeShift; label: string; employee?: boolean }) {
  const details = [employee ? shift.employeeName : null, shift.locationName, swapPositionLabel(shift), shift.isDesignatedLead ? 'Shift lead' : null].filter(Boolean) as string[];
  return <section className="wa-shift" aria-label={label}>
    <p className="wa-shift__label">{label}</p>
    <p className="wa-shift__when"><time dateTime={shift.date}>{keepWhole(swapDateLabel(shift.date))}</time></p>
    <p className="wa-shift__when wa-shift__time">{keepWhole(swapTimeLabel(shift)).replace(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun), /g, '$1,\u00a0')}</p>
    <p className="wa-shift__where"><MetaParts text={details.join(' · ')} /></p>
    {shift.timeZone ? <p className="wa-shift__where">Times in {timeZoneLabel(shift.timeZone)}</p> : null}
  </section>;
}
```

### src/components/swap-shift-summary.test.tsx

Phase 1/Profile side (index stage 2):

```tsx
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { SwapShiftSummary, swapTimeLabel } from './swap-shift-summary';
import type { ExchangeShift } from '@/lib/data/exchanges';

const shift: ExchangeShift = { id:'source', scheduleId:'schedule', employeeId:'self', employeeName:'Fictional Employee', locationId:'location', locationName:'North Office', weekStart:'2035-12-24', date:'2035-12-31', startTime:'22:00', endTime:'06:00', positionId:'support', isDesignatedLead:false, timeZone:'America/Puerto_Rico' };

const plain = (text: string) => text.replace(/\u00a0/g, ' ');

it('makes the overnight end date explicit across a year boundary', () => {
  expect(plain(swapTimeLabel(shift))).toBe('10:00 PM – 6:00 AM (Tue, Jan 1)');
  const html = renderToStaticMarkup(createElement(SwapShiftSummary, { shift, label:'You receive', employee:true }));
  expect(html).toContain('2035');
  expect(html).toContain('dateTime="2035-12-31"');
  expect(html).toContain('Position support');
  expect(html).toContain('No designated lead');
  expect(html).toContain('Times in Puerto Rico time');
  expect(html).toContain('Fictional Employee');
});

it('does not imply overnight for a same-day shift', () => {
  expect(plain(swapTimeLabel({ ...shift, startTime:'08:00', endTime:'16:00' }))).toBe('8:00 AM – 4:00 PM');
});
it('shows midnight at 24:00 as the following date', () => {
  expect(plain(swapTimeLabel({ ...shift, startTime:'16:00', endTime:'24:00' }))).toBe('4:00 PM – 12:00 AM (Tue, Jan 1)');
});
```

Wave A side (index stage 3):

```tsx
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
  // A shift that isn't led says nothing about leading (TC-WA-7: one word, "Shift lead", only when it applies).
  expect(html).not.toContain('lead');
  expect(html).toContain('Times in Puerto Rico time');
  expect(html).toContain('Fictional Employee');
});

it('does not imply overnight for a same-day shift', () => {
  expect(swapTimeLabel({ ...shift, startTime:'08:00', endTime:'16:00' })).toBe('8:00 AM – 4:00 PM');
});
it('shows midnight at 24:00 as the following date', () => {
  expect(swapTimeLabel({ ...shift, startTime:'16:00', endTime:'24:00' })).toBe('4:00 PM – 12:00 AM (Tue, Jan 1)');
});
```

## Checks and custody

Complete-candidate `npm ci`, production build, full Vitest, `tsc --noEmit`, lint and the full `scripts/ui-checks` matrix are **blocked, not passed**. An unresolved component/test merge cannot supply valid candidate evidence. Backend checks and limited preview observations are recorded separately in the joint README; they do not substitute for checks on the fully merged SHA. The separate per-branch cloud worker’s results are also distinct.

Initial attempt: Phase 1 `51f731d`, Wave A `157e25f`, partial candidate `d91be8c`; only the component had a non-CSS conflict. Final synchronization found Phase 1 `6722328` and Wave A `c05e0c7`, so the rehearsal was recreated from the latest base and Profile, the prior candidate history was normally merged back in, and the latest Wave A was attempted. Both refreshed non-CSS sides are retained above.

After Claude/Jose resolves both files, continue Wave B, Wave C, Desktop and the then-current backend tip in order, set the Inbox constant, and run every required candidate check. Refresh/pin and repeat whenever Jose reports new pushes. The real merge and deployment remain unauthorized.
