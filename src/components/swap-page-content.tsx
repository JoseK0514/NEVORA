import Link from 'next/link';
import { ReviewedSwapForm } from './reviewed-swap-form';
import { SwapSourcePanel } from './swap-source-panel';
import { ShiftChangeForm } from './shift-change-form';
import { Card, PageBand } from './kit/kit';
import { Notice } from './wave-a/parts';
import { PendingButton } from './wave-a/pending-button';
import type { ExchangeShift } from '@/lib/data/exchanges';
import type { ReviewedSource, ReviewedTarget } from '@/lib/shift-changes/types';

/** Phase 3.5 Wave A: Swap a shift on the kit (Employee and Lead). */
export function SwapPageContent({ source, sourceFields, targets, coverage = null }: {
  source: ExchangeShift;
  sourceFields: ReviewedSource;
  targets: { shift: ExchangeShift; fields: ReviewedTarget }[];
  /** Offer-for-coverage check for the no-target fallback; null when targets exist. */
  coverage?: { allowed: boolean; notice: string | null } | null;
}) {
  return <div className="nv-page wa-page wa-swap" data-nv-page="">
    <PageBand back={{ href: '/app/exchange?tab=requests', label: 'Shift requests' }} eyebrow="Swap a shift" title={targets.length ? 'Choose a shift' : 'No shifts to swap'}
      summary={targets.length ? 'Pick a shift to trade for yours, check both, then send.' : 'No one has a shift you can trade for right now.'} />
    <div className="nv-content wa-narrow">
      {targets.length ? <ReviewedSwapForm source={source} sourceFields={sourceFields} targets={targets} /> : <>
        <SwapSourcePanel source={source} />
        <Card title="What you can do" id="swap-empty">
          {coverage?.allowed ? <ShiftChangeForm fields={{ kind: 'OFFER_COVERAGE', ...sourceFields }} resolvedHref="/app/exchange?tab=requests" className="wa-form wa-card-body">
            <p className="wa-text">You can offer it for someone to pick up instead. It stays your shift until someone does.</p>
            <PendingButton pending="Offering…" block>Offer for coverage</PendingButton>
          </ShiftChangeForm> : <div className="wa-card-body">
            {coverage?.notice ? <Notice tone="review" quiet>{coverage.notice}</Notice> : <p className="wa-text">Check back later.</p>}
          </div>}
          <div className="wa-card-body"><Link className="nv-btn" data-kind="secondary" data-block="true" href="/app/exchange?tab=requests">Back to Shift requests</Link></div>
        </Card>
      </>}
    </div>
  </div>;
}
