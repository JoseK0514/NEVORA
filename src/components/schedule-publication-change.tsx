'use client';

import type { PublicationChange, PublishedShiftSnapshot } from '../lib/assistance/publication-diff';
import { usePortalLang } from '@/lib/i18n/portal-lang';
import { scheduleCopy } from './schedule-copy';
import { keepWhole } from '@/lib/keep-whole';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';

/* Upscale S6 (Nov 1): one row per change, said plainly. "Added · Mon, Nov 2" with the shift under it
 * ("8:00 AM – 4:00 PM · Barista · Condado"); an edit adds what it was ("Was 9:00 AM – 5:00 PM"). Display only: the
 * changes are the server's publication diff, unchanged. */
type Words = ReturnType<typeof scheduleCopy>;

/** "8:00 AM – 4:00 PM". */
const range = (shift: PublishedShiftSnapshot, t: Words) => `${t.time(shift.startTime)} – ${t.time(shift.endTime)}`;

/** "8:00 AM – 4:00 PM · Barista · Condado", plus lead and can't-work facts. */
function shiftLine(shift: PublishedShiftSnapshot, locationNames: Readonly<Record<string, string>>, t: Words) {
  return keepWhole([range(shift, t), shift.positionName, locationNames[shift.locationId]?.trim() || t.change.locationUnavailable, shift.isDesignatedLead ? t.change.shiftLead : null, shift.isCalloutApproved ? t.change.cantWorkApproved : null].filter(Boolean).join(' · '));
}

/** What an edited shift was, naming only what changed when that is one thing. */
function was(change: PublicationChange, locationNames: Readonly<Record<string, string>>, t: Words) {
  const { before, after } = change;
  if (!before || !after) return null;
  const day = t.dayLabel;
  if (change.type === 'TIME_CHANGED') return keepWhole(t.change.was(`${before.date !== after.date ? `${day(before.date)} · ` : ''}${range(before, t)}`));
  if (change.type === 'LOCATION_CHANGED') return keepWhole(t.change.was(locationNames[before.locationId]?.trim() || t.change.locationUnavailable));
  if (change.type === 'POSITION_CHANGED') return before.positionName ? keepWhole(t.change.was(before.positionName)) : t.change.hadNoPosition;
  return keepWhole(t.change.was(`${day(before.date)} · ${shiftLine(before, locationNames, t)}`));
}

export function SchedulePublicationChange({ changes, locationNames = {} }: { changes: readonly PublicationChange[]; locationNames?: Readonly<Record<string, string>> }) {
  const t = scheduleCopy(usePortalLang());
  if (!changes.length) return null;
  // Review B2 (NV-226): in shift order (date, then start), each change with a tone chip: green added, grey removed, amber
  // for anything that changed.
  const ordered = changes.map((change, index) => ({ change, index })).sort((a, b) => {
    const x = a.change.after ?? a.change.before, y = b.change.after ?? b.change.before;
    return (x?.date ?? '').localeCompare(y?.date ?? '') || (x?.startTime ?? '').localeCompare(y?.startTime ?? '') || a.index - b.index;
  });
  return <details className="schedule-publication-change"><summary><span>{t.change.summary}</span><CaretDownIcon className="em-publication-caret" size={20} weight="bold" aria-hidden="true"/></summary><ul>{ordered.map(({ change, index }) => {
    const shift = change.after ?? change.before;
    const moved = change.type === 'TIME_CHANGED' && change.before && change.after && change.before.date !== change.after.date;
    const prior = change.type === 'ADDED' || change.type === 'REMOVED' ? null : was(change, locationNames, t);
    const tone = change.type === 'ADDED' ? 'green' : change.type === 'REMOVED' ? 'grey' : 'amber';
    return <li key={index}>
      <strong><span className={`b-chip b-chip--${tone} spc-chip`}>{moved ? t.change.moved : t.change.verbs[change.type]}</span>{shift ? keepWhole(` ${t.dayLabel(shift.date)}`) : null}</strong>
      {shift ? <span>{shiftLine(shift, locationNames, t)}</span> : null}
      {prior ? <span>{prior}</span> : null}
    </li>;
  })}</ul></details>;
}
