'use client';

import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import styles from './correction-time-ticket.module.css';
import { formatElapsed } from '@/lib/date-utils';

/* The correction form's Start and End, set like a ticket (phase 4 upscale, approved Oct 20, 2026): each half shows the
 * time large and the day under it, with the native date-and-time field over the half. Between them, the length.
 * The fields keep their names "Start" and "End" (aria-label), so the forms and their tests read the same. */

const time = (value: string) => {
  const [h, m] = value.slice(11, 16).split(':').map(Number);
  return { clock: `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}`, half: h < 12 ? 'AM' : 'PM' };
};
const day = (value: string) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
const valid = (value: string) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value);
const minutes = (value: string) => Date.parse(`${value.slice(0, 16)}:00Z`) / 60000;

function Half({ label, value, disabled, min, onChange }: { label: string; value: string; disabled: boolean; min?: string; onChange: (value: string) => void }) {
  const shown = valid(value) ? time(value) : null;
  return <label className={styles.ctHalf} data-empty={shown ? undefined : ''}>
    <small aria-hidden="true">{label}</small>
    <b aria-hidden="true">{shown ? <>{shown.clock}<em>{shown.half}</em></> : '–:––'}</b>
    <span aria-hidden="true">{shown ? day(value) : 'Choose a time'}</span>
    <input aria-label={label} type="datetime-local" step="60" required disabled={disabled} min={min} value={value}
      onClick={event => { try { event.currentTarget.showPicker(); } catch { /* the browser opens its own picker */ } }}
      onChange={event => onChange(event.target.value)} />
  </label>;
}

export function CorrectionTimeTicket({ start, end, disabled = false, onStart, onEnd }: { start: string; end: string; disabled?: boolean; onStart: (value: string) => void; onEnd: (value: string) => void }) {
  const length = valid(start) && valid(end) ? minutes(end) - minutes(start) : null;
  return <div className={`employee-time-correction-grid ${styles.ctTicket}`}>
    <Half label="Start" value={start} disabled={disabled} onChange={onStart} />
    <i className={styles.ctMid} aria-hidden="true"><ArrowRightIcon size={18} /></i>
    <Half label="End" value={end} disabled={disabled} min={start || undefined} onChange={onEnd} />
    <p className={styles.ctLength} data-invalid={length !== null && length <= 0 ? '' : undefined} aria-live="polite">
      {length === null ? 'Tap a time to change it' : length <= 0 ? 'End must be after start' : formatElapsed(length)}
    </p>
  </div>;
}
