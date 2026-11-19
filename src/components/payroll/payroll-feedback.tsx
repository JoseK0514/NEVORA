'use client';

import { useEffect, useRef } from 'react';
import { CorpBody, CorpButton, CorpCard } from '../corp/corp';
import { BState } from '../owner-b/b-kit';
import type { usePayrollOperation } from './use-payroll';

/** The action result, an unconfirmed reference to check, or an error (same wording as before, on the kit). */
export function Feedback({ operation }: { operation: Pick<ReturnType<typeof usePayrollOperation>, 'error' | 'message' | 'pending' | 'busy' | 'resuming' | 'retryAvailable' | 'resumeAvailable' | 'check' | 'retry' | 'resume' | 'pauseResume'> & { confirmed?: string | null } }) {
  // Phase 7 (moments): a receipt-confirmed action is the shared done state, with no flourish (money stays calm). Its
  // words are the hook's existing ones: the title the receipt confirms, then "Check the status below." The region
  // around it is already live, so the card adds no second announcement.
  const saved = 'Saved. Check the status below.';
  const done = !!operation.confirmed && operation.message === saved;
  // The button that sent the action is disabled, then leaves when the fresh read lands. Focus goes to the result's
  // title when it would otherwise be lost (the copy on screen only), so a keyboard user stays at the result.
  const title = useRef<HTMLElement>(null);
  useEffect(() => {
    const target = title.current, active = document.activeElement;
    if (!done || !target?.getClientRects().length) return;
    if (!active || active === document.body || (active as HTMLButtonElement).disabled) target.focus({ preventScroll: true });
  }, [done]);
  // Said once: a confirmed result takes focus on its title, so the block is not also a live region for it.
  return <div className="c-pay__feedback" aria-live={done ? "off" : "polite"}>
    {operation.error ? <p className="c-callout c-callout--red" role="alert">{operation.error}</p> : null}
    {done ? <div className="b-done-host b-done-host--card c-pay__done"><BState silent kind="done" titleRef={title} title={operation.confirmed} line="Check the status below." /></div>
      : operation.message ? <p className="c-callout c-callout--teal">{operation.message}</p> : null}
    {operation.pending ? <CorpCard as="div" ariaLabel="Unconfirmed action"><CorpBody>
      <b className="c-pay__strong">{operation.busy ? 'Recording action…' : 'Check an unconfirmed action'}</b>
      <p className="c-pay__detail">Keep this reference until the server confirms the result.</p>
      <code className="c-pay__code">{operation.pending}</code>
      {operation.resuming ? <p className="c-pay__detail">Re-enter the original action below. Its saved reference will be reused; no new action reference will be created.</p> : null}
      <div className="c-btns c-btns--stack c-pay__gap">
        <CorpButton kind="secondary" size="md" disabled={operation.busy} onClick={() => void operation.check()}>Check action reference</CorpButton>
        {operation.retryAvailable ? <CorpButton kind="secondary" size="md" disabled={operation.busy} onClick={() => void operation.retry()}>Retry same action</CorpButton> : null}
        {operation.resumeAvailable ? <CorpButton kind="secondary" size="md" onClick={operation.resume}>Re-enter original action</CorpButton> : null}
        {operation.resuming ? <CorpButton kind="secondary" size="md" onClick={operation.pauseResume}>Pause re-entry</CorpButton> : null}
      </div>
    </CorpBody></CorpCard> : null}
  </div>;
}
