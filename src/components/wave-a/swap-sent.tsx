'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { SheetCancel } from '../quiet/quiet-sheet';
import { QuietList, QuietPage, QuietRow } from '../quiet/quiet';
import { swapTimeLabel } from '../swap-shift-summary';
import { keepWhole } from '@/lib/keep-whole';
import type {ExchangeShiftDisplay} from '@/lib/shift-changes/shift-display';

type Sent = { give: ExchangeShiftDisplay; receive: ExchangeShiftDisplay };
const SentContext = createContext<(sent: Sent) => void>(() => {});
const shortDay = (date: string) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00Z`));

/** Once a swap is recorded, the server stops offering that shift and the page refreshes (it may now have no shifts to
 * swap). This boundary stays mounted through that refresh and shows what was sent, so the result never disappears.
 * v5 sheet style. */
export function SwapSentBoundary({ children }: { children: ReactNode }) {
  const [sent, setSent] = useState<Sent | null>(null);
  const notice = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sent) return;
    requestAnimationFrame(() => notice.current?.focus({ preventScroll: true }));
  }, [sent]);
  if (!sent) return <SentContext.Provider value={setSent}>{children}</SentContext.Provider>;
  return <QuietPage className="q-shiftchange">
    <div className="q-nav"><span /><span className="q-nav__t">Swap shift</span><SheetCancel href="/app/exchange?tab=requests" className="q-nav__r q-nav__r--b">Done</SheetCancel></div>
    <div ref={notice} tabIndex={-1} className="q-hd" role="status"><h1>Swap request sent</h1><p>{sent.receive.employeeName} needs to agree before anything changes.</p></div>
    <QuietList style={{ marginTop: 16 }}>
      <QuietRow title="You give" detail={keepWhole(`${shortDay(sent.give.date)} · ${swapTimeLabel(sent.give)}`)} />
      <QuietRow title="You receive" detail={keepWhole(`${shortDay(sent.receive.date)} · ${swapTimeLabel(sent.receive)} · from ${sent.receive.employeeName}`)} />
    </QuietList>
    <QuietList style={{ marginTop: 24 }}>
      <QuietRow variant="tint" avatar={<CheckIcon className="q-ic" aria-hidden="true" />} title="What happens next" detail="Your schedule changes only after they agree and any review is done." />
    </QuietList>
    <Link className="q-btn q-btn--sec" href="/app/exchange?tab=requests">View request status</Link>
  </QuietPage>;
}

export function useSwapSent() {
  return useContext(SentContext);
}
