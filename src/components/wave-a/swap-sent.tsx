'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowsLeftRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { SigBand, SigHead, SigPage } from '../signature/signature';
import { SwapHalf } from '../swap-shift-summary';
import sr from '../shift-requests-signature.module.css';
import type { ExchangeShift } from '@/lib/data/exchanges';

import { SigButton } from "../signature/sig-button";
type Sent = { give: ExchangeShift; receive: ExchangeShift };
const SentContext = createContext<(sent: Sent) => void>(() => {});

/** Once a swap is recorded, the server stops offering that shift and the page refreshes (it may now have no shifts to
 * swap). This boundary stays mounted through that refresh and shows what was sent, so the result never disappears.
 * Signature style (phase 3). */
export function SwapSentBoundary({ children }: { children: ReactNode }) {
  const [sent, setSent] = useState<Sent | null>(null);
  const notice = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sent) return;
    requestAnimationFrame(() => { notice.current?.scrollIntoView({ block: 'center' }); notice.current?.focus({ preventScroll: true }); });
  }, [sent]);
  if (!sent) return <SentContext.Provider value={setSent}>{children}</SentContext.Provider>;
  return <SigPage className={sr.srRoot} band={<SigBand eyebrow="Swap a shift">
    <h1 className="sg-word">Swap request sent</h1>
    <p className="sg-sub"><span>{sent.receive.employeeName} needs to agree before anything changes.</span></p>
    <Link className="sg-band-link" href="/app/exchange?tab=requests"><CaretLeftIcon size={14} aria-hidden="true" />Shift requests</Link>
  </SigBand>}>
    <div ref={notice} tabIndex={-1} className="sg-card" data-tone="tint" role="status">
      <div className="sg-card-head"><span className="sg-tile" data-tone="white" aria-hidden="true"><CheckCircleIcon size={22} /></span>
        <span className={sr.srHeadCopy}><b>Swap request sent</b><small>Your schedule changes only after they agree and any review is done.</small></span></div>
    </div>
    <SigHead title="What you sent" />
    <div className="sg-card">
      <div className="sg-ticket"><SwapHalf shift={sent.give} label="You give" /><i aria-hidden="true"><ArrowsLeftRightIcon size={18} /></i><SwapHalf shift={sent.receive} label="You receive" employee /></div>
    </div>
    <SigButton className="sg-cta" href="/app/exchange?tab=requests">View request status</SigButton>
  </SigPage>;
}

export function useSwapSent() {
  return useContext(SentContext);
}
