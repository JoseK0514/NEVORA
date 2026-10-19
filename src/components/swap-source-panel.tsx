import { Card } from './kit/kit';
import { SwapShiftSummary } from './swap-shift-summary';
import type { ExchangeShift } from '@/lib/data/exchanges';

/** The shift you're giving, and how a swap works. */
export function SwapSourcePanel({ source }: { source: ExchangeShift }) {
  return <Card title="Your shift" id="swap-yours">
    <div className="wa-shifts"><SwapShiftSummary shift={source} label="You give" /></div>
    <details className="wa-disclosure" data-tone="neutral">
      <summary className="wa-disclosure__summary">How a swap works</summary>
      <p className="wa-card-note">Sending the request means you agree to it. The other person has to agree too. Swaps that fit the rules finish on their own; anything else waits for a manager.</p>
    </details>
  </Card>;
}
