'use client';

import { useId, useState } from 'react';
import { timeZoneLabel } from '@/lib/time-zone-label';
import Link from 'next/link';
import { ArrowRightIcon, CheckIcon, MapPinIcon, UserCircleIcon, ArrowsLeftRightIcon } from '@phosphor-icons/react';
import { ShiftChangeForm } from './shift-change-form';
import { SwapMotion } from './swap-motion';
import { SwapSourcePanel } from './swap-source-panel';
import { SwapShiftSummary, swapDateLabel, swapTimeLabel, swapPositionLabel } from './swap-shift-summary';
import { formatDayLabel, formatWeekRange } from '@/lib/date-utils';
import type { ExchangeShift } from '@/lib/data/exchanges';
import type { ReviewedSource, ReviewedTarget } from '@/lib/shift-changes/types';

export function ReviewedSwapForm({ source, sourceFields, targets }: {
  source: ExchangeShift;
  sourceFields: ReviewedSource;
  targets: { shift: ExchangeShift; fields: ReviewedTarget }[];
}) {
  const [selected, setSelected] = useState('');
  const id = useId();
  const target = targets.find(item => item.shift.id === selected);
  const sorted = [...targets].sort((a, b) => a.shift.date.localeCompare(b.shift.date) || a.shift.startTime.localeCompare(b.shift.startTime) || a.shift.employeeName.localeCompare(b.shift.employeeName));

  return <ShiftChangeForm fields={{ kind: 'PROPOSE_SWAP', ...sourceFields }} className="swap-form shift-change-form" resolvedHref="/app/exchange?tab=requests">
    <div className="swap-layout">
      <SwapSourcePanel source={source} />

      <div className="swap-choices-panel">
        <fieldset className="swap-options" aria-describedby={`${id}-selection-hint`}>
          <legend className="sr-only">Available shifts this week</legend>
          <h2 className="swap-options-title">Available shifts this week</h2>
          <div className="swap-options-topline"><span>{formatWeekRange(source.weekStart)}</span><span>{targets.length} {targets.length === 1 ? 'shift' : 'shifts'}</span></div>
          <p id={`${id}-selection-hint`} className="swap-section-hint">Choose one to review the swap.</p>
          <div className="swap-options-list">
            {sorted.map(({ shift }) => {
              const day = formatDayLabel(shift.date);
              return <label className={`swap-option${selected === shift.id ? ' is-selected' : ''}`} key={shift.id}>
                <input type="radio" name="targetShiftId" value={shift.id} required checked={selected === shift.id} onChange={() => setSelected(shift.id)} aria-label={`${swapDateLabel(shift.date)} · ${swapTimeLabel(shift)} · ${shift.employeeName} · ${shift.locationName} · ${swapPositionLabel(shift)} · ${shift.isDesignatedLead ? 'Designated lead' : 'No designated Lead'}${shift.timeZone ? ` · Times in ${shift.timeZone.replaceAll('_', ' ')}` : ''}`} />
                <span className="swap-date-tile" aria-hidden="true"><span>{day.weekday}</span><strong>{Number(shift.date.slice(-2))}</strong><span>{day.day.split(' ')[0]}</span></span>
                <span className="swap-option-copy">
                  <strong>{swapTimeLabel(shift)}</strong>
                  <span><UserCircleIcon size={16} aria-hidden="true" />{shift.employeeName}</span>
                  <span><MapPinIcon size={16} aria-hidden="true" />{shift.locationName}</span>
                  <span className="swap-option-role">{swapPositionLabel(shift)} · {shift.isDesignatedLead ? 'Designated lead' : 'No designated Lead'}</span>
                  {shift.timeZone ? <span className="swap-timezone">{timeZoneLabel(shift.timeZone)}</span> : null}
                </span>
                <span className="swap-selection-mark" aria-hidden="true">{selected === shift.id ? <CheckIcon size={14} weight="bold" /> : null}</span>
              </label>;
            })}
          </div>
        </fieldset>

        <section className={`swap-review${target ? ' has-selection' : ''}`} aria-labelledby={`${id}-review-title`}>
          <div className="swap-review-heading"><span className="swap-review-icon"><ArrowsLeftRightIcon size={20} aria-hidden="true" /></span><div><h2 id={`${id}-review-title`}>Review your swap</h2><p>{target ? 'Check both assignments before you send.' : 'Your swap summary will appear here.'}</p></div></div>
          <p className="sr-only" role="status">{target ? `Selected ${swapDateLabel(target.shift.date)}, ${swapTimeLabel(target.shift)}, with ${target.shift.employeeName}. Review both assignments below.` : ''}</p>
          <SwapMotion selection={selected}>
            {target ? <div className="swap-review-content">
              <div className="swap-review-pair"><SwapShiftSummary shift={source} label="You give" /><SwapShiftSummary shift={target.shift} label="You receive" employee /></div>
              <p className="swap-consent-note">Sending this request gives your consent to this swap. Your schedule changes only after the required consent and review.</p>
              <input type="hidden" name="targetEpisodeId" value={target.fields.targetEpisodeId} />
              <input type="hidden" name="targetTermsFingerprint" value={target.fields.targetTermsFingerprint} />
            </div> : <p className="swap-review-placeholder">Select a shift above to compare dates, times, locations, and responsibilities.</p>}
          </SwapMotion>
        </section>
        <div className="swap-footer"><Link className="swap-button secondary" href="/app/exchange?tab=requests">Cancel</Link><button className="swap-button primary" type="submit" disabled={!target}>Send swap request<ArrowRightIcon size={18} aria-hidden="true" /></button></div>
        <noscript><p className="swap-no-script">Enable JavaScript to review and send a swap request. You can return to Shift requests using Cancel.</p></noscript>
      </div>
    </div>
  </ShiftChangeForm>;
}
