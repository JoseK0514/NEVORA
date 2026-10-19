'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useSwapSent } from './wave-a/swap-sent';
import { timeZoneLabel } from '@/lib/time-zone-label';
import Link from 'next/link';
import { ShiftChangeForm } from './shift-change-form';
import { SwapSourcePanel } from './swap-source-panel';
import { SwapShiftSummary, swapDateLabel, swapTimeLabel, swapPositionLabel } from './swap-shift-summary';
import { Card, MetaParts } from './kit/kit';
import { FormActions } from './wave-a/parts';
import { PendingButton } from './wave-a/pending-button';
import { formatDayLabel, formatWeekRange } from '@/lib/date-utils';
import { keepWhole } from '@/lib/keep-whole';
import type { ExchangeShift } from '@/lib/data/exchanges';
import type { ReviewedSource, ReviewedTarget } from '@/lib/shift-changes/types';

/** Phase 3.5 Wave A: the swap form. Your shift, the shifts you could take (one choice), both side by side, then Send. */
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

  return <ShiftChangeForm fields={{ kind: 'PROPOSE_SWAP', ...sourceFields }} className="wa-form shift-change-form" resolvedHref="/app/exchange?tab=requests">
    <div ref={body} className="wa-swap-body">
    <SwapSourcePanel source={source} />

    <Card title="Shifts you can take" id="swap-choices" meta={`${targets.length} ${targets.length === 1 ? 'shift' : 'shifts'}`}>
      <fieldset className="wa-options" aria-describedby={`${id}-hint`}>
        <legend className="nv-sr">Shifts you can take this week</legend>
        <p className="wa-card-lead" id={`${id}-hint`}>{keepWhole(formatWeekRange(source.weekStart))}. Choose one to compare.</p>
        <div className="wa-options__list">
          {sorted.map(({ shift }) => {
            const day = formatDayLabel(shift.date);
            const details = [shift.locationName, swapPositionLabel(shift), shift.isDesignatedLead ? 'Shift lead' : null].filter(Boolean) as string[];
            return <label className="wa-option" key={shift.id} data-selected={selected === shift.id ? 'true' : undefined}>
              <input type="radio" name="targetShiftId" value={shift.id} required checked={selected === shift.id} onChange={() => setSelected(shift.id)}
                aria-label={`${swapDateLabel(shift.date)} · ${swapTimeLabel(shift)} · ${shift.employeeName} · ${shift.locationName} · ${swapPositionLabel(shift)} · ${shift.isDesignatedLead ? 'Shift lead' : 'Not the shift lead'}${shift.timeZone ? ` · Times in ${shift.timeZone.replaceAll('_', ' ')}` : ''}`} />
              <span className="wa-option__text">
                <span className="wa-option__title">{keepWhole(`${day.weekday},\u00a0${day.day}`)} · <span className="nv-keep">{keepWhole(swapTimeLabel(shift))}</span></span>
                <span className="wa-option__meta">{shift.employeeName}</span>
                <span className="wa-option__meta"><MetaParts text={details.join(' · ')} /></span>
                {shift.timeZone ? <span className="wa-option__meta">{timeZoneLabel(shift.timeZone)}</span> : null}
              </span>
            </label>;
          })}
        </div>
      </fieldset>
    </Card>

    <Card title="Review your swap" id="swap-review">
      <p className="nv-sr" role="status">{target ? `Selected ${swapDateLabel(target.shift.date)}, ${swapTimeLabel(target.shift)}, with ${target.shift.employeeName}. Review both shifts below.` : ''}</p>
      {target ? <>
        <div className="wa-shifts wa-shifts--pair"><SwapShiftSummary shift={source} label="You give" /><SwapShiftSummary shift={target.shift} label="You receive" employee /></div>
        <p className="wa-card-note">Sending means you agree to this swap. Your schedule changes only after the other person agrees and any review is done.</p>
        <input type="hidden" name="targetEpisodeId" value={target.fields.targetEpisodeId} />
        <input type="hidden" name="targetTermsFingerprint" value={target.fields.targetTermsFingerprint} />
      </> : <p className="wa-card-note wa-card-note--top">Choose a shift above to see both side by side.</p>}
    </Card>

    <FormActions>
      <PendingButton pending="Sending…" disabled={!target} block>Send swap request</PendingButton>
      <Link className="nv-btn" data-kind="secondary" data-block="true" href="/app/exchange?tab=requests">Cancel</Link>
    </FormActions>
    <noscript><p className="wa-card-note">Turn on JavaScript to compare and send a swap. Cancel goes back to Shift requests.</p></noscript>
    </div>
  </ShiftChangeForm>;
}
