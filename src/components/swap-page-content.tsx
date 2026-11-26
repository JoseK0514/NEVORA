'use client';

import './shift-change-desktop.css';
import { usePortalLang } from '@/lib/i18n/portal-lang';
import { swapCopy } from './swap-copy';
import { ShiftChangeForm } from './shift-change-form';
import { PendingButton } from './wave-a/pending-button';
import { SwapSentBoundary } from './wave-a/swap-sent';
import { ReviewedSwapForm, SwapShiftRow } from './reviewed-swap-form';
import { SheetCancel } from './quiet/quiet-sheet';
import { QuietList, QuietPage } from './quiet/quiet';
import type {ExchangeShiftDisplay} from '@/lib/shift-changes/shift-display';
import type { ReviewedSource, ReviewedTarget } from '@/lib/shift-changes/types';

/* Swap a shift, or offer it for cover, in the v5 "One look" (approved Oct 24, 2026; mockup E04). Opened from a shift it
 * is a sheet over Schedule; opened by its URL it is the same content as a page. Cancel · title · Send in the bar, your
 * shift, then the shifts you could take. Same reviewed fields, coverage check and fallbacks as before. */
export function SwapPageContent({ source, sourceFields, targets, coverage = null, mode = 'swap' }: {
  source: ExchangeShiftDisplay;
  sourceFields: ReviewedSource;
  targets: { shift: ExchangeShiftDisplay; fields: ReviewedTarget }[];
  /** Offer-for-coverage check, for Offer it for cover or the no-target fallback; null otherwise. */
  coverage?: { allowed: boolean; notice: string | null } | null;
  mode?: 'swap' | 'cover';
}) {
  const t = swapCopy(usePortalLang()).page;
  const cover = mode === 'cover' || !targets.length;
  return <SwapSentBoundary>
    <QuietPage className="q-shiftchange">
      {!cover ? <ReviewedSwapForm source={source} sourceFields={sourceFields} targets={targets} />
        : coverage?.allowed ? <ShiftChangeForm fields={{ kind: 'OFFER_COVERAGE', ...sourceFields }} resolvedHref="/app/exchange?tab=requests" className="shift-change-form q-scform">
          <div className="q-nav"><SheetCancel href="/app/schedule" /><h1 className="q-nav__t">{t.offerForCover}</h1><PendingButton pending={t.offering} className="q-nav__r q-nav__r--b">{t.offer}</PendingButton></div>
          <div className="q-grp q-grp--m"><h2>{t.yourShift}</h2></div>
          <QuietList><SwapShiftRow shift={source} /></QuietList>
          {mode === 'swap' ? <p className="q-help">{t.noSwapsOffer}</p> : null}
          <p className="q-help">{t.teamSees}</p>
        </ShiftChangeForm>
        : <div className="q-shiftchange__card">
          <div className="q-nav"><SheetCancel href="/app/schedule" /><h1 className="q-nav__t">{mode === 'cover' ? t.offerForCover : t.swapShift}</h1><span /></div>
          <div className="q-grp q-grp--m"><h2>{t.yourShift}</h2></div>
          <QuietList><SwapShiftRow shift={source} /></QuietList>
          <p className="q-empty" role="status">{mode === 'swap' ? t.noSwapsNow : ''}{coverage?.notice ?? t.checkBack}</p>
        </div>}
    </QuietPage>
  </SwapSentBoundary>;
}
