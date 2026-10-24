'use client';

import {useRef} from 'react';
import {SigPendingLabel, useKeepFocusWhileBusy} from './signature/sig-button';

/** The recovery forms' submit button. Before hydration it is natively disabled (the form can't work yet). While the
 * request runs it keeps its fill and focus (aria-disabled + aria-busy, never native disabled) and refuses a second
 * press; it sits outside the fieldset that locks the fields. */
export function RecoverySubmit({hydrated, busy, idle, pendingText, className = 'ap-primary'}: {hydrated: boolean; busy: boolean; idle: string; pendingText: string; className?: string}) {
 const button = useRef<HTMLButtonElement>(null);
 useKeepFocusWhileBusy(button, busy);
 return <button ref={button} type="submit" className={className} disabled={!hydrated || undefined} aria-disabled={busy || undefined} aria-busy={busy}
  onClick={event => {if (busy) event.preventDefault();}}>
  <SigPendingLabel pending={busy} pendingText={pendingText}>{idle}</SigPendingLabel>
 </button>;
}
