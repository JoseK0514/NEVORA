import Link from 'next/link';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { ArrowsLeftRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import { ReviewedSwapForm } from './reviewed-swap-form';
import { SwapSourcePanel } from './swap-source-panel';
import { ShiftChangeForm } from './shift-change-form';
import type { ExchangeShift } from '@/lib/data/exchanges';
import type { ReviewedSource, ReviewedTarget } from '@/lib/shift-changes/types';

export function SwapPageContent({ source, sourceFields, targets, coverage = null }: {
  source: ExchangeShift;
  sourceFields: ReviewedSource;
  targets: { shift: ExchangeShift; fields: ReviewedTarget }[];
  /** Offer-for-coverage check for the no-target fallback; null when targets exist. */
  coverage?: { allowed: boolean; notice: string | null } | null;
}) {
  return <div className="employee-view swap-page">
    <Link className="swap-back" href="/app/exchange?tab=requests"><ArrowLeftIcon size={18} aria-hidden="true" />Shift requests</Link>
    <header className="swap-page-heading"><span className="swap-heading-icon"><ArrowsLeftRightIcon size={26} aria-hidden="true" /></span><div><p className="swap-kicker">Swap a shift</p><h1>Choose a shift</h1><p>Find a shift that works for you. Review the exchange, then send your request.</p></div></header>
    {targets.length ? <ReviewedSwapForm source={source} sourceFields={sourceFields} targets={targets} /> : <div className="swap-layout"><SwapSourcePanel source={source} /><section className="swap-empty"><span className="swap-heading-icon"><ArrowsLeftRightIcon size={26} aria-hidden="true" /></span><h2>No shifts to swap</h2>{coverage?.allowed ? <><p>No shifts are available to swap with right now. You can offer it for coverage instead. Your shift stays assigned to you until a coverage request completes.</p><ShiftChangeForm fields={{ kind: 'OFFER_COVERAGE', ...sourceFields }} resolvedHref="/app/exchange?tab=requests"><button className="swap-button primary" type="submit">Offer for coverage</button></ShiftChangeForm></> : <p>No shifts are available to swap with right now.{coverage?.notice ? ` ${coverage.notice}` : ''}</p>}<Link className="swap-back" href="/app/exchange?tab=requests">Back to Shift requests</Link></section></div>}
  </div>;
}
