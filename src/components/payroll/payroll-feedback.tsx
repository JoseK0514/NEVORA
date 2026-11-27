'use client';

import { useEffect, useRef } from 'react';
import { CorpBody, CorpButton, CorpCard } from '../corp/corp';
import { BState } from '../owner-b/b-kit';
import type { usePayrollOperation } from './use-payroll';
import { usePayrollLang } from './payroll-lang';
import { statusCopy } from './copy/status';

/** The action result, an unconfirmed reference to check, or an error (same wording as before, on the kit). */
export function Feedback({ operation }: { operation: Pick<ReturnType<typeof usePayrollOperation>, 'error' | 'message' | 'pending' | 'busy' | 'resuming' | 'retryAvailable' | 'resumeAvailable' | 'check' | 'retry' | 'resume' | 'pauseResume'> & { confirmed?: string | null } }) {
  // Phase 7 (moments): a receipt-confirmed action is the shared done state, with no flourish (money stays calm). Its
  // words are the hook's existing ones: the title the receipt confirms, then "Check the status below." The region
  // around it is already live, so the card adds no second announcement.
  const lang = usePayrollLang();
  const t = statusCopy[lang].feedback;
  const saved = statusCopy[lang].operation.savedCheck;
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
    {operation.error ? <p className="c-callout c-callout--red c-pay__error-notice" role="alert">{operation.error}</p> : null}
    {done ? <div className="b-done-host b-done-host--card c-pay__done"><BState silent kind="done" titleRef={title} title={operation.confirmed} line={t.checkStatus} /></div>
      : operation.message ? <p className="c-callout c-callout--teal">{operation.message}</p> : null}
    {operation.pending ? <CorpCard as="div" ariaLabel={t.unconfirmedLabel}><CorpBody>
      <b className="c-pay__strong">{operation.busy ? t.recording : t.checkUnconfirmed}</b>
      <p className="c-pay__detail">{t.keepReference}</p>
      <code className="c-pay__code">{operation.pending}</code>
      {operation.resuming ? <p className="c-pay__detail">{t.reenterNote}</p> : null}
      <div className="c-btns c-btns--stack c-pay__gap">
        <CorpButton kind="secondary" size="md" disabled={operation.busy} onClick={() => void operation.check()}>{t.checkReference}</CorpButton>
        {operation.retryAvailable ? <CorpButton kind="secondary" size="md" disabled={operation.busy} onClick={() => void operation.retry()}>{t.retrySame}</CorpButton> : null}
        {operation.resumeAvailable ? <CorpButton kind="secondary" size="md" onClick={operation.resume}>{t.reenter}</CorpButton> : null}
        {operation.resuming ? <CorpButton kind="secondary" size="md" onClick={operation.pauseResume}>{t.pause}</CorpButton> : null}
      </div>
    </CorpBody></CorpCard> : null}
  </div>;
}
