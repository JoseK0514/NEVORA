import { ArrowsLeftRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import { PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { MinusIcon } from '@phosphor-icons/react/dist/ssr/Minus';
import { SwapShiftSummary, swapDateLabel, swapTimeLabel } from './swap-shift-summary';
import type { ExchangeShift } from '@/lib/data/exchanges';

export function SwapSourcePanel({ source }: { source: ExchangeShift }) {
  return <aside className="swap-source-panel">
    <div className="swap-source-desktop"><SwapShiftSummary shift={source} label="Your shift" /></div>
    <details className="swap-source-mobile">
      <summary><span><span>Your shift</span><strong>{swapTimeLabel(source)}</strong><span>{swapDateLabel(source.date)} · {source.locationName}</span></span><PlusIcon className="swap-plus" size={18} aria-hidden="true" /><MinusIcon className="swap-minus" size={18} aria-hidden="true" /></summary>
      <SwapShiftSummary shift={source} label="Assignment details" />
    </details>
    <div className="swap-source-note"><ArrowsLeftRightIcon size={20} aria-hidden="true" /><p>You’re offering this assignment in exchange for another employee’s shift.</p></div>
    <details className="swap-help">
      <summary>How a trade works<PlusIcon className="swap-plus" size={18} aria-hidden="true" /><MinusIcon className="swap-minus" size={18} aria-hidden="true" /></summary>
      <p>You consent when you send the request. The other employee must consent too. Valid trades complete automatically when policy permits; exceptions wait for management.</p>
    </details>
  </aside>;
}
