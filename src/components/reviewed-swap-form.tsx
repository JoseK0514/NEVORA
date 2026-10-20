'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowsLeftRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { useSwapSent } from './wave-a/swap-sent';
import { timeZoneLabel } from '@/lib/time-zone-label';
import { ShiftChangeForm } from './shift-change-form';
import { SwapHalf, swapDateLabel, swapTimeLabel, swapPositionLabel } from './swap-shift-summary';
import { FormActions } from './wave-a/parts';
import { PendingButton } from './wave-a/pending-button';
import { SigDay, SigHead } from './signature/signature';
import { formatDayLabel, formatWeekRange } from '@/lib/date-utils';
import { keepWhole } from '@/lib/keep-whole';
import sr from './shift-requests-signature.module.css';
import type { ExchangeShift } from '@/lib/data/exchanges';
import type { ReviewedSource, ReviewedTarget } from '@/lib/shift-changes/types';

/** The swap form in the Signature style (phase 3): the shifts you could take (one choice), both side by side as a ticket,
 * then Send. Same fields, single explicit choice, sent boundary and actions as the Wave A form. */
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

  return <ShiftChangeForm fields={{ kind: 'PROPOSE_SWAP', ...sourceFields }} className={`wa-form shift-change-form ${sr.srSwapForm}`} resolvedHref="/app/exchange?tab=requests" actions={<>
    <FormActions note={target ? `Nothing changes until ${first} agrees and any review is done.` : undefined}>
      <PendingButton pending="Sending…" disabled={!target} block>Send swap request</PendingButton>
      <Link className="sg-link" href="/app/exchange?tab=requests">Cancel</Link>
    </FormActions>
    </>}>
    <div ref={body} className={sr.srSwapBody}>
    <SigHead id={`${id}-choices`} title="Choose a shift to take" count={targets.length} />
    <fieldset className={`sg-card ${sr.srChoices}`} aria-describedby={`${id}-hint`}>
      <legend className="nv-sr">Shifts you can take this week</legend>
      <p className="nv-sr" id={`${id}-hint`}>{keepWhole(formatWeekRange(source.weekStart))}. Choose one to compare.</p>
      {sorted.map(({ shift }) => {
        const day = formatDayLabel(shift.date);
        const details = [shift.employeeName, shift.locationName, swapPositionLabel(shift), shift.isDesignatedLead ? 'Shift lead' : null].filter(Boolean) as string[];
        return <label className="sg-r" key={shift.id} data-selected={selected === shift.id ? 'true' : undefined}>
          <SigDay top={day.weekday} day={Number(shift.date.slice(8))} />
          <span className="sg-copy">
            <span className="sg-time">{keepWhole(swapTimeLabel(shift))}</span>
            <span>{details.join(' · ')}</span>
            {shift.timeZone ? <span>{timeZoneLabel(shift.timeZone)}</span> : null}
          </span>
          <input type="radio" name="targetShiftId" value={shift.id} required checked={selected === shift.id} onChange={() => setSelected(shift.id)}
            aria-label={`${swapDateLabel(shift.date)} · ${swapTimeLabel(shift)} · ${shift.employeeName} · ${shift.locationName} · ${swapPositionLabel(shift)} · ${shift.isDesignatedLead ? 'Shift lead' : 'Not the shift lead'}${shift.timeZone ? ` · Times in ${shift.timeZone.replaceAll('_', ' ')}` : ''}`} />
          <span className={sr.srRadio} aria-hidden="true" />
        </label>;
      })}
    </fieldset>

    <SigHead title="Review your swap" />
    <div className="sg-card">
      <p className="nv-sr" role="status">{target ? `Selected ${swapDateLabel(target.shift.date)}, ${swapTimeLabel(target.shift)}, with ${target.shift.employeeName}. Review both shifts below.` : ''}</p>
      {target ? <>
        <div className="sg-ticket"><SwapHalf shift={source} label="You give" /><i aria-hidden="true"><ArrowsLeftRightIcon size={18} /></i><SwapHalf shift={target.shift} label="You receive" employee /></div>
        <p className="sg-card-foot"><InfoIcon size={18} aria-hidden="true" />Sending means you agree to this swap.</p>
        <input type="hidden" name="targetEpisodeId" value={target.fields.targetEpisodeId} />
        <input type="hidden" name="targetTermsFingerprint" value={target.fields.targetTermsFingerprint} />
      </> : <p className={sr.srPick}>Choose a shift above to see both side by side.</p>}
      <details className={sr.srHow}>
        <summary>How a swap works</summary>
        <p>Sending the request means you agree to it. The other person has to agree too. Swaps that fit the rules finish on their own; anything else waits for a manager.</p>
      </details>
    </div>

    <noscript><p className={sr.srMuted}>Turn on JavaScript to compare and send a swap. Cancel goes back to Shift requests.</p></noscript>
    </div>
  </ShiftChangeForm>;
}
