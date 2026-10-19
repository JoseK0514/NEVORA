'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Card, KitLink, PageBand } from '../kit/kit';
import { Notice } from './parts';
import { SwapShiftSummary } from '../swap-shift-summary';
import type { ExchangeShift } from '@/lib/data/exchanges';

type Sent = { give: ExchangeShift; receive: ExchangeShift };
const SentContext = createContext<(sent: Sent) => void>(() => {});

/** Once a swap is recorded, the server stops offering that shift and the page refreshes (it may now have no shifts to
 * swap). This boundary stays mounted through that refresh and shows what was sent, so the result never disappears. */
export function SwapSentBoundary({ children }: { children: ReactNode }) {
  const [sent, setSent] = useState<Sent | null>(null);
  const notice = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sent) return;
    requestAnimationFrame(() => { notice.current?.scrollIntoView({ block: 'center' }); notice.current?.focus({ preventScroll: true }); });
  }, [sent]);
  if (!sent) return <SentContext.Provider value={setSent}>{children}</SentContext.Provider>;
  return <div className="nv-page wa-page wa-swap" data-nv-page="">
    <PageBand back={{ href: '/app/exchange?tab=requests', label: 'Shift requests' }} eyebrow="Swap a shift" title="Swap request sent"
      summary={`${sent.receive.employeeName} needs to agree before anything changes.`} />
    <div className="nv-content wa-narrow">
      <div ref={notice} tabIndex={-1} className="wa-target">
        <Notice tone="done" title="Swap request sent">Your schedule changes only after they agree and any review is done.</Notice>
      </div>
      <Card title="What you sent" id="swap-sent">
        <div className="wa-shifts wa-shifts--pair"><SwapShiftSummary shift={sent.give} label="You give" /><SwapShiftSummary shift={sent.receive} label="You receive" employee /></div>
        <div className="wa-card-body wa-card-body--tight"><KitLink href="/app/exchange?tab=requests">View request status</KitLink></div>
      </Card>
    </div>
  </div>;
}

export function useSwapSent() {
  return useContext(SentContext);
}
