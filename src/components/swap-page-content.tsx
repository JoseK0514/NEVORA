import Link from 'next/link';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { SwapSentBoundary } from './wave-a/swap-sent';
import { ReviewedSwapForm, SwapShiftRow } from './reviewed-swap-form';
import { OfferCoverForm } from './offer-cover-form';
import { SheetCancel } from './quiet/quiet-sheet';
import { QuietList, QuietPage } from './quiet/quiet';
import type { ExchangeShift } from '@/lib/data/exchanges';
import type { ReviewedSource, ReviewedTarget } from '@/lib/shift-changes/types';
import './quiet/u3.css';

/* Swap a shift, or offer it for cover, in the v5 "One look" (approved Oct 24, 2026; mockup E04). Opened from a shift it
 * is a sheet over Schedule; opened by its URL it is the same content as a page. Cancel · title · Send in the bar, your
 * shift, then the shifts you could take. Same reviewed fields, coverage check and fallbacks as before.
 * T-25 (Oct 25, 2026): the sheet keeps the title the person tapped. With no one to swap with, "Swap shift" says so and
 * offers "Offer it for cover instead"; it never turns into the cover form by itself. */
export function SwapPageContent({ source, sourceFields, targets, coverage = null, mode = 'swap' }: {
  source: ExchangeShift;
  sourceFields: ReviewedSource;
  targets: { shift: ExchangeShift; fields: ReviewedTarget }[];
  /** Offer-for-coverage check, for Offer it for cover; null otherwise. */
  coverage?: { allowed: boolean; notice: string | null } | null;
  mode?: 'swap' | 'cover';
}) {
  const coverHref = `/app/exchange/swap?sourceShiftId=${encodeURIComponent(source.id)}&mode=cover`;
  return <SwapSentBoundary>
    <QuietPage className="q-shiftchange">
      {mode === 'swap' && targets.length ? <ReviewedSwapForm source={source} sourceFields={sourceFields} targets={targets} />
        : mode === 'swap' ? <>
          <div className="q-nav"><SheetCancel href="/app/schedule" /><h1 className="q-nav__t">Swap shift</h1><span /></div>
          <div className="q-grp q-grp--m"><h2>Your shift</h2></div>
          <QuietList><SwapShiftRow shift={source} /></QuietList>
          <section aria-labelledby="swap-trade-with">
            <div className="q-grp"><h2 id="swap-trade-with">Trade with</h2></div>
            <ul className="q-list">
              <li><div className="q-row" role="status"><span className="q-rt"><b>No one can swap this week</b><i>No teammate has a shift you can trade for.</i></span></div></li>
              <li><Link className="q-row q-row--one q-row--go" href={coverHref} replace><span className="q-rt"><b>Offer it for cover instead</b></span><CaretRightIcon className="q-chev" aria-hidden="true" /></Link></li>
            </ul>
          </section>
        </>
        : coverage?.allowed ? <OfferCoverForm source={source} sourceFields={sourceFields} />
        : <>
          <div className="q-nav"><SheetCancel href="/app/schedule" /><h1 className="q-nav__t">Offer for cover</h1><span /></div>
          <div className="q-grp q-grp--m"><h2>Your shift</h2></div>
          <QuietList><SwapShiftRow shift={source} /></QuietList>
          <p className="q-empty" role="status">{coverage?.notice ?? 'Check back later.'}</p>
        </>}
    </QuietPage>
  </SwapSentBoundary>;
}
