# October 20 release-candidate rehearsal

**Blocked at Wave A; this is not a completed release candidate.** No Claude branch was modified or pushed. No deployment. Rehearsal base is the latest pushed Phase 1 observed immediately before creation. The backend tip includes the concurrent backend work preserved by normal merges.

## Pinned inputs and merge order

| Order | Branch | Commit | Result |
|---|---|---|---|
| 0 | `claude/premium-phase-1` | `51f731d399e9b94306f5d98556151933efe2ac7a` | Base |
| 1 | `claude/p35-profile-6cdee8` | `be4a232a1e6a26b58314ff549f88e5a8a79e82c6` | Merged; CSS conflict resolved |
| 2 | `claude/p35-wave-a-1283c8` | `157e25f7dab7a21542f54722746b237dc7b52afc` | Merge in progress; JSX conflict unchosen |
| 3 | `claude/p35-wave-b-808dfd` | `b0e051a951642ff34692604147fcd76ba805a3e7` | Not reached |
| 4 | `claude/p35-wave-c-93e13c` | `b109ec3fea10418fb9f5c9da2af0a1e561dc2678` | Not reached |
| 5 | `claude/p4-desktop-240fe0` | `578748d705b941d14f37c0b01bfcfb1332343e31` | Not reached |
| 6 | `codex/premium-backend` | `17d8089935d5988e4581092f2b84b78b8ac2c143` | Not reached |

The clean candidate HEAD after Profile is `d91be8c`, pushed to `origin/codex/release-candidate` as a partial rehearsal only. Wave A is held as an uncommitted merge in `/workspace/NEVORA-release`. No resolution was selected for the component conflict. Later branches cannot be merged in order while that conflict is open. `INBOX_COUNT_ENDPOINT_READY` has not been changed because the combined merge has not completed.

## Conflicts

- **Profile merge, `src/app/app/portal-premium.css`:** kept the exact Phase 1 stylesheet. Its incoming 24-line addition (16 rules including a media block) was already represented in the latest Phase 1 stylesheet; no duplicate rules were appended.
- **Wave A merge, same CSS:** kept Phase 1 and checked its incoming additions against the current sheet; all were already present. No extra rules were appended. No existing Phase 1 declaration was replaced. CSS is resolved/staged.
- **Wave A merge, `src/components/swap-shift-summary.tsx`: UNRESOLVED.** Phase 1/Profile side retains the icon-led `swap-assignment` layout and `keepWhole` date formatting. Wave A supplies `wa-shift` and `MetaParts`, removes the per-field icons, and moves `keepWhole` to its own import. The common automatic merge leaves duplicate `keepWhole` imports until this conflict is resolved. Owner: **Claude Wave A + Phase 1 coordinator**. Both exact index sides follow. Jose’s rule is to leave every non-CSS conflict unchosen.

### Phase 1/Profile side (index stage 2)

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

### Wave A side (index stage 3)

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
  const details = [employee ? shift.employeeName : null, shift.locationName, swapPositionLabel(shift), shift.isDesignatedLead ? 'Designated lead' : 'No designated Lead'].filter(Boolean) as string[];
  return <section className="wa-shift" aria-label={label}>
    <p className="wa-shift__label">{label}</p>
    <p className="wa-shift__when"><time dateTime={shift.date}>{keepWhole(swapDateLabel(shift.date))}</time></p>
    <p className="wa-shift__when wa-shift__time">{keepWhole(swapTimeLabel(shift))}</p>
    <p className="wa-shift__where"><MetaParts text={details.join(' · ')} /></p>
    {shift.timeZone ? <p className="wa-shift__where">Times in {timeZoneLabel(shift.timeZone)}</p> : null}
  </section>;
}
```

## Checks and custody

The requested complete-candidate `npm ci`, production build, full Vitest, `tsc --noEmit`, lint and full `scripts/ui-checks` screen matrix are **blocked, not passed**. An unresolved JSX conflict cannot supply valid candidate evidence. Independent backend checks on `17d8089` and any limited backend preview observations are recorded separately in the joint README; they do not substitute for checks on the fully merged candidate. No findings from the separate per-branch cloud worker are relabeled as candidate results.

Reproduce from the pinned base, merge Profile, retain the Phase 1 CSS plus any distinct added rules, then merge the pinned Wave A commit. Do not resolve the component until Claude/Jose chooses. After resolution, continue Wave B, Wave C, Desktop and the then agreed backend tip in order, set the Inbox endpoint constant, and run every required candidate check. When Jose reports new pushes, refresh/pin the inputs and repeat the rehearsal. Real merge and deployment remain unauthorized.
