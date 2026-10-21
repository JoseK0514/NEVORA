import Link from 'next/link';
import { ArrowsLeftRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { ReviewedSwapForm } from './reviewed-swap-form';
import { ShiftChangeForm } from './shift-change-form';
import { Notice } from './wave-a/parts';
import { PendingButton } from './wave-a/pending-button';
import { SwapSentBoundary } from './wave-a/swap-sent';
import { SigBand, SigHead, SigPage } from './signature/signature';
import { swapBandDay, swapBandLine } from './swap-shift-summary';
import sr from './shift-requests-signature.module.css';
import type { ExchangeShift } from '@/lib/data/exchanges';
import type { ReviewedSource, ReviewedTarget } from '@/lib/shift-changes/types';

/* Swap a shift in the Signature style (phase 3, approved Oct 20, 2026; target:
 * docs/product/specs/employee-style/signature/phase-3/p3c-board-b.png). The band is the shift you give; the sheet lists
 * the shifts you could take, then both side by side, then Send. Same reviewed fields and fallbacks as before. */
export function SwapBand({ source, title }: { source: ExchangeShift; title?: string }) {
  return <SigBand eyebrow="Swap a shift">
    <h1 className="nv-sr">{title ?? 'Swap a shift'}</h1>
    <p className="sg-word">{swapBandDay(source.date)}</p>
    <p className="sg-sub"><span>{swapBandLine(source)}</span></p>
    <Link className="sg-band-link" href="/app/exchange?tab=requests"><CaretLeftIcon size={14} aria-hidden="true" />Shift requests</Link>
  </SigBand>;
}

export function SwapPageContent({ source, sourceFields, targets, coverage = null }: {
  source: ExchangeShift;
  sourceFields: ReviewedSource;
  targets: { shift: ExchangeShift; fields: ReviewedTarget }[];
  /** Offer-for-coverage check for the no-target fallback; null when targets exist. */
  coverage?: { allowed: boolean; notice: string | null } | null;
}) {
  return <SwapSentBoundary>
    <SigPage className={sr.srRoot} band={<SwapBand source={source} title={targets.length ? 'Choose a shift' : 'No shifts to swap'} />}>
      {targets.length ? <ReviewedSwapForm source={source} sourceFields={sourceFields} targets={targets} /> : <>
        <SigHead title="No shifts to swap" />
        <div className="sg-card">
          <div className="sg-card-head"><span className="sg-tile" aria-hidden="true"><ArrowsLeftRightIcon size={22} /></span>
            <span className={sr.srHeadCopy}><b>This shift can’t be swapped right now</b><small>No one has a shift you can trade for it this week.</small></span></div>
          {coverage?.allowed ? <div className="sg-card-body"><ShiftChangeForm fields={{ kind: 'OFFER_COVERAGE', ...sourceFields }} resolvedHref="/app/exchange?tab=requests" className={`wa-form shift-change-form ${sr.srCoverage}`}>
            <p className={sr.srMuted}>You can offer it for someone to pick up instead. It stays your shift until someone does.</p>
            <PendingButton pending="Offering…" block>Offer for coverage</PendingButton>
          </ShiftChangeForm></div> : <div className="sg-card-body">
            {coverage?.notice ? <Notice tone="review" quiet>{coverage.notice}</Notice> : <p className={sr.srMuted}>Check back later.</p>}
          </div>}
        </div>
        <div className="sg-center"><Link className="sg-link" href="/app/exchange?tab=requests">Back to Shift requests</Link></div>
      </>}
    </SigPage>
  </SwapSentBoundary>;
}
