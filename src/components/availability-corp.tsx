'use client';

import './availability-corp.css';
import type {InputHTMLAttributes, ReactNode} from 'react';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {QuietSheet, SheetCancel} from './quiet/quiet-sheet';

/* Availability on the corporate kit (Release 1, board E-Availability), shared by the phone and desktop pages. Look only:
 * each page keeps its own reads, drafts, field names, validation and saving. One card of seven one-line day rows (day,
 * hours or "Not available", chevron); a day opens as a sheet with its switch and times. */

export type AvailabilityDayRow = {
  key: number;
  name: string;
  /** "7:00 AM – 4:00 PM", or null when the day is not available. */
  hours: string | null;
  /** Full words for assistive tech ("Monday, 7:00 AM – 4:00 PM"). */
  label: string;
  onOpen: () => void;
};

export function AvailabilityDayRows({days}: {days: AvailabilityDayRow[]}) {
  return <ul className="c-avail__days" aria-label="Availability by day">
    {days.map(day => <li key={day.key}>
      <button type="button" className="c-avail__day" aria-haspopup="dialog" aria-label={day.label} onClick={day.onOpen}>
        <span className="c-avail__name">{day.name}</span>
        <span className={day.hours ? 'c-avail__hours' : 'c-avail__hours c-avail__hours--off'}>{day.hours ?? 'Not available'}</span>
        <CaretRightIcon className="c-chev" weight="bold" aria-hidden="true"/>
      </button>
    </li>)}
  </ul>;
}

/** A time field on the kit (48px, 1px ring). The browser's clock glyph is hidden; a click opens the picker. */
export function AvailabilityTime({label, ...props}: InputHTMLAttributes<HTMLInputElement> & {label: string}) {
  return <label className="c-field c-avail__time">
    <span className="c-field__label">{label}</span>
    <input {...props} type="time" className="c-in" onClick={event => { try { event.currentTarget.showPicker(); } catch { /* the browser's own picker */ } }}/>
  </label>;
}

/** A day's editor as a bottom sheet: the day centred with Done, the Available switch, then its times. */
export function AvailabilityDaySheet({open, onClose, day, closeHref, available, onAvailable, switchLabel, disabled, children, footer}: {
  open: boolean; onClose: () => void; day: string; closeHref: string; available: boolean; onAvailable: (value: boolean) => void;
  switchLabel: string; disabled: boolean; children?: ReactNode; footer?: ReactNode;
}) {
  const titleId = `avail-day-${day.toLowerCase()}`;
  return <QuietSheet open={open} labelledBy={titleId} onClose={onClose}>
    <div className="c-sheet c-avail-sheet" data-corp="">
      <div className="c-sheet__nav"><span/><h2 className="c-sheet__title" id={titleId}>{day}</h2><SheetCancel href={closeHref} className="c-sheet__done">Done</SheetCancel></div>
      <fieldset className="c-avail-sheet__fields" disabled={disabled}>
        <legend className="nv-sr">{day} availability</legend>
        <div className="c-card">
          <label className="c-avail-sheet__switch">
            <span>Available</span>
            <input type="checkbox" role="switch" className="c-switch" aria-label={switchLabel} checked={available} onChange={event => onAvailable(event.target.checked)}/>
          </label>
          {available ? children : null}
        </div>
      </fieldset>
      {footer}
    </div>
  </QuietSheet>;
}
