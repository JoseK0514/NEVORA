'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Card, KitLink, PageBand } from '../kit/kit';
import { Notice } from './parts';
import { SwapShiftSummary } from '../swap-shift-summary';
import type { ExchangeShift } from '@/lib/data/exchanges';

const SentContext = createContext<() => void>(() => {});

/** "Unable to work" after the report is recorded: the page refreshes underneath, so this boundary (above it) shows a
 * steady result with the shift, what happens next and the way to follow it. */
export function CalloutSentBoundary({ shift, children }: { shift: ExchangeShift; children: ReactNode }) {
  const [sent, setSent] = useState(false);
  const notice = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sent) return;
    requestAnimationFrame(() => { notice.current?.scrollIntoView({ block: 'center' }); notice.current?.focus({ preventScroll: true }); });
  }, [sent]);
  if (!sent) return <SentContext.Provider value={() => setSent(true)}>{children}</SentContext.Provider>;
  return <div className="nv-page wa-page wa-callout" data-nv-page="">
    <PageBand back={{ href: '/app/exchange?tab=my', label: 'Shift requests' }} title="Report sent" summary="Your manager will review it." />
    <div className="nv-content wa-narrow">
      <div ref={notice} tabIndex={-1} className="wa-target">
        <Notice tone="done" title="Report sent">It’s still your shift until a manager approves it. If they do, the shift opens for someone else to pick up.</Notice>
      </div>
      <Card title="Your shift" id="callout-sent">
        <div className="wa-shifts"><SwapShiftSummary shift={shift} label="Can’t work" /></div>
        <div className="wa-card-body wa-card-body--tight"><KitLink href="/app/exchange?tab=requests">See my requests</KitLink></div>
      </Card>
    </div>
  </div>;
}

export function useCalloutSent() {
  return useContext(SentContext);
}
