'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { SigBand, SigPage } from '../signature/signature';
import { swapBandDay, swapBandLine } from '../swap-shift-summary';
import sr from '../shift-requests-signature.module.css';
import type { ExchangeShift } from '@/lib/data/exchanges';

const SentContext = createContext<() => void>(() => {});

/** "Unable to work" after the report is recorded: the page refreshes underneath, so this boundary (above it) shows a
 * steady result with the shift, what happens next and the way to follow it. Signature style (phase 3). */
export function CalloutSentBoundary({ shift, children }: { shift: ExchangeShift; children: ReactNode }) {
  const [sent, setSent] = useState(false);
  const notice = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sent) return;
    requestAnimationFrame(() => { notice.current?.scrollIntoView({ block: 'center' }); notice.current?.focus({ preventScroll: true }); });
  }, [sent]);
  if (!sent) return <SentContext.Provider value={() => setSent(true)}>{children}</SentContext.Provider>;
  return <SigPage className={sr.srRoot} band={<SigBand eyebrow="Unable to work">
    <h1 className="sg-word">Report sent</h1>
    <p className="sg-sub"><span>Your manager will review it.</span></p>
    <Link className="sg-band-link" href="/app/exchange?tab=my"><CaretLeftIcon size={14} aria-hidden="true" />Shift requests</Link>
  </SigBand>}>
    <div ref={notice} tabIndex={-1} className="sg-card" data-tone="tint" role="status">
      <div className="sg-card-head"><span className="sg-tile" data-tone="white" aria-hidden="true"><CheckCircleIcon size={22} /></span>
        <span className={sr.srHeadCopy}><b>Report sent</b><small>It’s still your shift until a manager approves it. If they do, the shift opens for someone else to pick up.</small></span></div>
    </div>
    <div className="sg-card">
      <div className="sg-card-head"><span className={sr.srHeadCopy}><b><time dateTime={shift.date}>{swapBandDay(shift.date)}</time></b><small>{swapBandLine(shift)}</small></span></div>
    </div>
    <Link className="sg-cta" href="/app/exchange?tab=requests">See my requests</Link>
  </SigPage>;
}

export function useCalloutSent() {
  return useContext(SentContext);
}
