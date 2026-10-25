import { ShiftChangeForm } from './shift-change-form';
import { PendingButton } from './wave-a/pending-button';
import { SwapSentBoundary } from './wave-a/swap-sent';
import { ReviewedSwapForm, SwapShiftRow } from './reviewed-swap-form';
import { SheetCancel } from './quiet/quiet-sheet';
import { QuietList, QuietPage } from './quiet/quiet';
import type { ExchangeShift } from '@/lib/data/exchanges';
import type { ReviewedSource, ReviewedTarget } from '@/lib/shift-changes/types';

/* Swap a shift, or offer it for cover, in the v5 "One look" (approved Oct 24, 2026; mockup E04). Opened from a shift it
 * is a sheet over Schedule; opened by its URL it is the same content as a page. Cancel · title · Send in the bar, your
 * shift, then the shifts you could take. Same reviewed fields, coverage check and fallbacks as before. */
export function SwapPageContent({ source, sourceFields, targets, coverage = null, mode = 'swap' }: {
  source: ExchangeShift;
  sourceFields: ReviewedSource;
  targets: { shift: ExchangeShift; fields: ReviewedTarget }[];
  /** Offer-for-coverage check, for Offer it for cover or the no-target fallback; null otherwise. */
  coverage?: { allowed: boolean; notice: string | null } | null;
  mode?: 'swap' | 'cover';
}) {
  const cover = mode === 'cover' || !targets.length;
  return <SwapSentBoundary>
    <QuietPage className="q-shiftchange">
      {!cover ? <ReviewedSwapForm source={source} sourceFields={sourceFields} targets={targets} />
        : coverage?.allowed ? <ShiftChangeForm fields={{ kind: 'OFFER_COVERAGE', ...sourceFields }} resolvedHref="/app/exchange?tab=requests" className="shift-change-form q-scform">
          <div className="q-nav"><SheetCancel href="/app/schedule" /><h1 className="q-nav__t">Offer for cover</h1><PendingButton pending="Offering…" className="q-nav__r q-nav__r--b">Offer</PendingButton></div>
          <div className="q-grp q-grp--m"><h2>Your shift</h2></div>
          <QuietList><SwapShiftRow shift={source} /></QuietList>
          {mode === 'swap' ? <p className="q-help">No shifts to swap: no one has a shift you can trade for it this week, so you can offer it for someone to pick up instead.</p> : null}
          <p className="q-help">Your team sees it as an open shift. It stays your shift until someone picks it up and any review is done.</p>
        </ShiftChangeForm>
        : <>
          <div className="q-nav"><SheetCancel href="/app/schedule" /><h1 className="q-nav__t">{mode === 'cover' ? 'Offer for cover' : 'Swap shift'}</h1><span /></div>
          <div className="q-grp q-grp--m"><h2>Your shift</h2></div>
          <QuietList><SwapShiftRow shift={source} /></QuietList>
          <p className="q-empty" role="status">{mode === 'swap' ? 'No shifts to swap right now. ' : ''}{coverage?.notice ?? 'Check back later.'}</p>
        </>}
    </QuietPage>
  </SwapSentBoundary>;
}
