'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { PinActionResult } from '@/app/app/employees/[employeeId]/clocker-pin/actions';
import { Card } from './kit/kit';
import { Field, FieldPair, FormActions, Notice } from './wave-a/parts';

/** Phase 3.5 Wave A: Clocker PIN in the shared form pattern. The PIN never enters React state, the fields clear
 * before the request leaves, one request at a time, and the button says "Saving…" while it is out. */
export function ClockerPinForm({ employeeId, initialVersion, action }: {
  employeeId: string;
  initialVersion: number;
  action: (data: FormData) => Promise<PinActionResult>;
}) {
  const [version, setVersion] = useState(initialVersion);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<PinActionResult | null>(null);
  const lock = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  const employeeHref = `/app/employees/${encodeURIComponent(employeeId)}`;
  const blocked = Boolean(result && !result.ok && result.refresh);
  const configured = version > 0;

  useEffect(() => {
    if (result) feedback.current?.focus();
  }, [result]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || blocked) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    // Keep PINs out of React state and clear the DOM before the network request.
    form.reset();
    lock.current = true;
    setPending(true);
    setResult(null);
    try {
      const next = await action(data);
      setResult(next);
      if (next.ok) setVersion(next.version);
    } catch {
      setResult({ ok: false, error: 'PIN changes could not be confirmed. Reload before trying again.', refresh: true });
    } finally {
      data.delete('pin');
      data.delete('confirmPin');
      lock.current = false;
      setPending(false);
    }
  }

  return <>
    {result ? <div ref={feedback} tabIndex={-1} className="wa-target">
      {result.ok
        ? <Notice tone="done" title="PIN saved">Share it with them privately. They can use it on the shared tablet now.</Notice>
        : <Notice tone="urgent" title={result.refresh ? 'Reload before trying again' : 'The PIN wasn’t saved'}>{result.error}</Notice>}
      {result.ok ? <a className="nv-link" href={employeeHref}>Back to employee</a> : result.refresh ? <a className="nv-link" href={`${employeeHref}/clocker-pin`}>Reload PIN settings</a> : null}
    </div> : null}
    <Card title={configured ? 'Reset the PIN' : 'Create a PIN'} id="pin-form">
      <p className="wa-card-lead">{configured ? 'Choose a new PIN for the shared tablet.' : 'Give them access to the shared tablet.'}</p>
      <form onSubmit={submit} aria-busy={pending} className="wa-form">
        <input type="hidden" name="employeeId" value={employeeId} />
        <input type="hidden" name="expectedVersion" value={version} />
        <fieldset disabled={pending || blocked}>
          <div className="wa-fields">
            <FieldPair>
              <Field label="New PIN"><input id="new-clocker-pin" name="pin" type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{4}" minLength={4} maxLength={4} required aria-describedby="pin-help" /></Field>
              <Field label="Confirm PIN"><input id="confirm-clocker-pin" name="confirmPin" type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{4}" minLength={4} maxLength={4} required aria-describedby="pin-help" /></Field>
            </FieldPair>
            <p id="pin-help" className="wa-hint">Four digits, the same in both fields. Each person needs a different PIN.</p>
            {configured ? <Notice tone="review" quiet>The old PIN will stop working. They’ll need to use the new one on the tablet.</Notice> : null}
          </div>
          <div className="wa-card-body">
            <FormActions>
              <button type="submit" className="nv-btn" data-kind="primary" data-block="true">{pending ? 'Saving…' : configured ? 'Reset PIN' : 'Save PIN'}</button>
              <a className="nv-btn" data-kind="secondary" data-block="true" href={employeeHref}>Cancel</a>
            </FormActions>
          </div>
        </fieldset>
        {pending ? <p role="status" className="nv-sr">Saving the PIN.</p> : null}
      </form>
    </Card>
    <Card title="About the PIN" id="pin-about">
      <ul className="nv-rows">
        <li><div className="nv-row"><span className="nv-row__text"><span className="nv-row__title">Only for the shared tablet</span><span className="nv-row__meta">It’s separate from their portal password.</span></span></div></li>
        <li><div className="nv-row"><span className="nv-row__text"><span className="nv-row__title">Private</span><span className="nv-row__meta">No one can see an existing PIN. If they forget it, make a new one here.</span></span></div></li>
        <li><div className="nv-row"><span className="nv-row__text"><span className="nv-row__title">Nothing else changes</span><span className="nv-row__meta">Changing a PIN keeps portal access and recorded time unchanged.</span></span></div></li>
      </ul>
    </Card>
  </>;
}
