'use client';

import Link from 'next/link';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {ShiftChangeForm} from './shift-change-form';
import {PendingButton} from './wave-a/pending-button';
import {SheetCancel, useSheetClose} from './quiet/quiet-sheet';
import {QuietList} from './quiet/quiet';
import {SwapShiftRow} from './reviewed-swap-form';
import {toast} from './toaster';
import type {ExchangeShift} from '@/lib/data/exchanges';
import type {ReviewedSource} from '@/lib/shift-changes/types';

/** Offer it for cover (E05 grammar, UX-E-12). Same reviewed fields and coverage command as before. Sent from the sheet
 * over Schedule, the sheet closes, a toast says "Offered to your team" and the shift's row shows "Offered". Sent from the
 * full page, the receipt stays and Cancel becomes Done. */
export function OfferCoverForm({source, sourceFields}: {source: ExchangeShift; sourceFields: ReviewedSource}) {
  const close = useSheetClose();
  const router = useRouter();
  const [done, setDone] = useState(false);
  return <ShiftChangeForm fields={{kind: 'OFFER_COVERAGE', ...sourceFields}} resolvedHref="/app/exchange?tab=requests" successText="Offered to your team." className="shift-change-form q-scform"
    onResolved={() => {
      if (close) {
        toast('Offered to your team');
        close();
        // The sheet goes back to Schedule; read it again so the shift shows "Offered".
        window.setTimeout(() => router.refresh(), 400);
      } else setDone(true);
    }}>
    <div className="q-nav">
      {done ? <Link className="q-nav__l q-nav__l--teal" href="/app/schedule?offered=1">Done</Link> : <SheetCancel href="/app/schedule" />}
      <h1 className="q-nav__t">Offer for cover</h1>
      {done ? <span /> : <PendingButton pending="Offering…" className="q-nav__r q-nav__r--b">Offer</PendingButton>}
    </div>
    <div className="q-grp q-grp--m"><h2>Your shift</h2></div>
    <QuietList><SwapShiftRow shift={source} /></QuietList>
    <p className="q-help">Your team sees it as an open shift. It stays your shift until someone picks it up and any review is done.</p>
  </ShiftChangeForm>;
}
