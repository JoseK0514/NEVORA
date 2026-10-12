import Link from 'next/link';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { ArrowsLeftRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import { ReviewedSwapForm } from './reviewed-swap-form';
import { SwapSourcePanel } from './swap-source-panel';
import type { ExchangeShift } from '@/lib/data/exchanges';
import type { ReviewedSource, ReviewedTarget } from '@/lib/shift-changes/types';

export function SwapPageContent({ source, sourceFields, targets }: {
  source: ExchangeShift;
  sourceFields: ReviewedSource;
  targets: { shift: ExchangeShift; fields: ReviewedTarget }[];
}) {
  return <div className="employee-view swap-page">
    <Link className="swap-back" href="/app/exchange?tab=requests"><ArrowLeftIcon size={18} aria-hidden="true" />Shift requests</Link>
    <header className="swap-page-heading"><span className="swap-heading-icon"><ArrowsLeftRightIcon size={26} aria-hidden="true" /></span><div><p className="swap-kicker">Shift trade</p><h1>Choose a shift</h1><p>Find a shift that works for you. Review the exchange, then send your request.</p></div></header>
    {targets.length ? <ReviewedSwapForm source={source} sourceFields={sourceFields} targets={targets} /> : <div className="swap-layout"><SwapSourcePanel source={source} /><section className="swap-empty"><span className="swap-heading-icon"><ArrowsLeftRightIcon size={26} aria-hidden="true" /></span><h2>No shifts to trade</h2><p>No shifts are currently available for this trade. You can still offer your shift for coverage.</p><Link className="swap-button primary" href={`/app/exchange/callout?sourceShiftId=${encodeURIComponent(source.id)}`}>Offer for coverage</Link><Link className="swap-back" href="/app/exchange?tab=requests">Back to Shift requests</Link></section></div>}
  </div>;
}
