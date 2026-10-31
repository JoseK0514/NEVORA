'use client';

import { CorpBody, CorpButton, CorpCard } from '../corp/corp';
import type { usePayrollOperation } from './use-payroll';

/** The action result, an unconfirmed reference to check, or an error (same wording as before, on the kit). */
export function Feedback({ operation }: { operation: Pick<ReturnType<typeof usePayrollOperation>, 'error' | 'message' | 'pending' | 'busy' | 'resuming' | 'retryAvailable' | 'resumeAvailable' | 'check' | 'retry' | 'resume' | 'pauseResume'> }) {
  return <div className="c-pay__feedback" aria-live="polite">
    {operation.error ? <p className="c-callout c-callout--red" role="alert">{operation.error}</p> : null}
    {operation.message ? <p className="c-callout c-callout--teal">{operation.message}</p> : null}
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
