'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useSwapSent } from './wave-a/swap-sent';
import { timeZoneLabel } from '@/lib/time-zone-label';
import { ShiftChangeForm } from './shift-change-form';
import { swapDateLabel, swapTimeLabel, swapPositionLabel } from './swap-shift-summary';
import { PendingButton } from './wave-a/pending-button';
import { SheetCancel } from './quiet/quiet-sheet';
import { QuietList, initialsOf } from './quiet/quiet';
import { formatWeekRange } from '@/lib/date-utils';
import { keepWhole } from '@/lib/keep-whole';
import type { ExchangeShift } from '@/lib/data/exchanges';
import type { ReviewedSource, ReviewedTarget } from '@/lib/shift-changes/types';

const shortDay = (date: string) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00Z`));

/** "Sun, Oct 25 · 8:00 AM – 4:00 PM": the shift being changed, as one row. */
export function SwapShiftRow({ shift }: { shift: ExchangeShift }) {
  const where = [shift.locationName, shift.positionName, shift.isDesignatedLead ? 'Shift lead' : null].filter(Boolean).join(' · ');
  return <li><div className="q-row q-row--one">
    <span className="q-rt"><b><time dateTime={shift.date}>{keepWhole(shortDay(shift.date))}</time><span className="nv-sr">, {where}{shift.timeZone ? `, times in ${timeZoneLabel(shift.timeZone)}` : ''}</span></b></span>
    <span className="q-rv q-rv--l">{keepWhole(swapTimeLabel(shift))}</span>
  </div></li>;
}

/** The swap form in the v5 sheet (mockup E04): your shift, the shifts you could take (one choice), Send in the bar.
 * Same fields, single explicit choice, sent boundary and actions as before. */
export function ReviewedSwapForm({ source, sourceFields, targets }: {
  source: ExchangeShift;
  sourceFields: ReviewedSource;
  targets: { shift: ExchangeShift; fields: ReviewedTarget }[];
}) {
  const [selected, setSelected] = useState('');
  const id = useId();
  const target = targets.find(item => item.shift.id === selected);
  // After a send is recorded the server stops offering that shift and the page refreshes; SwapSentBoundary keeps the result.
  const markSent = useSwapSent();
  const sending = useRef<ExchangeShift | null>(null);
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const form = body.current?.closest('form');
    if (!form) return;
    const onSubmit = () => { sending.current = targets.find(item => item.shift.id === selected)?.shift ?? null; };
    const check = () => {
      if (form.querySelector(':scope > .form-success') && sending.current) markSent({ give: source, receive: sending.current });
    };
    form.addEventListener('submit', onSubmit, true);
    const observer = new MutationObserver(check);
    observer.observe(form, { childList: true });
    return () => { form.removeEventListener('submit', onSubmit, true); observer.disconnect(); };
  }, [selected, targets, source, markSent]);
  const sorted = [...targets].sort((a, b) => a.shift.date.localeCompare(b.shift.date) || a.shift.startTime.localeCompare(b.shift.startTime) || a.shift.employeeName.localeCompare(b.shift.employeeName));
  const first = target?.shift.employeeName.split(/\s+/)[0];

  return <ShiftChangeForm fields={{ kind: 'PROPOSE_SWAP', ...sourceFields }} className="shift-change-form q-scform" resolvedHref="/app/exchange?tab=requests">
    <div ref={body}>
      <div className="q-nav"><SheetCancel href="/app/schedule" /><h1 className="q-nav__t">Swap shift</h1><PendingButton pending="Sending…" disabled={!target} className="q-nav__r q-nav__r--b" label={target ? `Send swap request to ${target.shift.employeeName}` : 'Send swap request, choose a shift first'}>Send</PendingButton></div>
      <div className="q-grp q-grp--m"><h2>Your shift</h2></div>
      <QuietList><SwapShiftRow shift={source} /></QuietList>
      <fieldset className="q-fieldset" aria-describedby={`${id}-hint`}>
        <legend className="q-grp">Trade with</legend>
        <p className="nv-sr" id={`${id}-hint`}>{keepWhole(formatWeekRange(source.weekStart))}. Choose one shift to take.</p>
        <ul className="q-list">
          {sorted.map(({ shift }) => {
            const detail = [keepWhole(`${shortDay(shift.date)} · ${swapTimeLabel(shift)}`), shift.locationName !== source.locationName ? shift.locationName : null, shift.positionName && shift.positionName !== source.positionName ? shift.positionName : null, shift.isDesignatedLead ? 'Shift lead' : null].filter(Boolean).join(' · ');
            return <li key={shift.id}><label className="q-row q-row--av q-row--pick">
              <span className="q-av" aria-hidden="true">{initialsOf(shift.employeeName)}</span>
              <span className="q-rt"><b>{shift.employeeName}</b><i>{detail}</i></span>
              <input className="q-pick" type="radio" name="targetShiftId" value={shift.id} required checked={selected === shift.id} onChange={() => setSelected(shift.id)}
                aria-label={`${swapDateLabel(shift.date)} · ${swapTimeLabel(shift)} · ${shift.employeeName} · ${shift.locationName} · ${swapPositionLabel(shift)} · ${shift.isDesignatedLead ? 'Shift lead' : 'Not the shift lead'}${shift.timeZone ? ` · Times in ${shift.timeZone.replaceAll('_', ' ')}` : ''}`} />
              <span className="q-radio" aria-hidden="true" />
            </label></li>;
          })}
        </ul>
      </fieldset>
      {target ? <>
        <input type="hidden" name="targetEpisodeId" value={target.fields.targetEpisodeId} />
        <input type="hidden" name="targetTermsFingerprint" value={target.fields.targetTermsFingerprint} />
      </> : null}
      <p className="q-help" role="status">{target
        ? `Sending means you agree to trade with ${first}. ${first} agrees next; swaps that fit the rules finish on their own, anything else waits for your manager.`
        : 'Choose the shift you’d take instead. Nothing changes until they agree and any review is done.'}</p>
      <noscript><p className="q-help">Turn on JavaScript to choose and send a swap.</p></noscript>
    </div>
  </ShiftChangeForm>;
}
