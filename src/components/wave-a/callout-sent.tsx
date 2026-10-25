'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { SheetCancel } from '../quiet/quiet-sheet';
import { QuietList, QuietPage, QuietRow } from '../quiet/quiet';
import { swapBandDay, swapBandLine } from '../swap-shift-summary';
import type { ExchangeShift } from '@/lib/data/exchanges';

const SentContext = createContext<() => void>(() => {});

/** "Unable to work" after the report is recorded: the page refreshes underneath, so this boundary (above it) shows a
 * steady result with the shift, what happens next and the way to follow it. v5 sheet style. */
export function CalloutSentBoundary({ shift, children }: { shift: ExchangeShift; children: ReactNode }) {
  const [sent, setSent] = useState(false);
  const notice = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sent) return;
    requestAnimationFrame(() => notice.current?.focus({ preventScroll: true }));
  }, [sent]);
  if (!sent) return <SentContext.Provider value={() => setSent(true)}>{children}</SentContext.Provider>;
  return <QuietPage className="q-shiftchange">
    <div className="q-nav"><span /><span className="q-nav__t">Unable to work</span><SheetCancel href="/app/exchange?tab=my" className="q-nav__r q-nav__r--b">Done</SheetCancel></div>
    <div ref={notice} tabIndex={-1} className="q-hd" role="status"><h1>Report sent</h1><p>Your manager will review it.</p></div>
    <QuietList style={{ marginTop: 16 }}>
      <QuietRow title={<time dateTime={shift.date}>{swapBandDay(shift.date)}</time>} detail={swapBandLine(shift)} />
    </QuietList>
    <QuietList style={{ marginTop: 24 }}>
      <QuietRow variant="tint" avatar={<CheckIcon className="q-ic" aria-hidden="true" />} title="It’s still your shift" detail="Until a manager approves it. If they do, the shift opens for someone else to pick up." />
    </QuietList>
    <Link className="q-btn q-btn--sec" href="/app/exchange?tab=requests">See my requests</Link>
  </QuietPage>;
}

export function useCalloutSent() {
  return useContext(SentContext);
}
