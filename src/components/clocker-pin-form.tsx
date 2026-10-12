'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { PinActionResult } from '@/app/app/employees/[employeeId]/clocker-pin/actions';
import { ClockerPinIcon } from './clocker-pin-icon';
import styles from './clocker-pin.module.css';

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

  return (
    <div className={styles.layout}>
      <section className={styles.management} aria-labelledby="pin-form-title">
        <div className={styles.formHeading}>
          <div className={styles.iconTile}><ClockerPinIcon name="lock" size={24} /></div>
          <div>
            <h2 id="pin-form-title">{configured ? 'Reset the PIN' : 'Create a PIN'}</h2>
            <p>{configured ? 'Choose a new PIN for the shared tablet.' : 'Give this employee access to the shared tablet.'}</p>
          </div>
        </div>

        <form onSubmit={submit} aria-busy={pending}>
          <input type="hidden" name="employeeId" value={employeeId} />
          <input type="hidden" name="expectedVersion" value={version} />
          <fieldset disabled={pending || blocked}>
            <div className={styles.fields}>
              <label htmlFor="new-clocker-pin">
                <span className={styles.labelRow}>New PIN <span>4 digits</span></span>
                <input id="new-clocker-pin" name="pin" type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{4}" minLength={4} maxLength={4} required aria-describedby="pin-help" />
              </label>
              <label htmlFor="confirm-clocker-pin">
                <span className={styles.labelRow}>Confirm PIN <span>Enter it again</span></span>
                <input id="confirm-clocker-pin" name="confirmPin" type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{4}" minLength={4} maxLength={4} required aria-describedby="pin-help" />
              </label>
            </div>
            <p id="pin-help" className={styles.fieldHelp}>Use the same four digits in both fields. Each employee needs a different PIN.</p>
            {configured ? (
              <div className={styles.resetNotice}>
                <ClockerPinIcon name="reset" size={20} />
                <p>The old PIN will stop working. The employee will need to verify again on the tablet.</p>
              </div>
            ) : null}
            <div className={styles.formActions}>
              <button type="submit" className={styles.primary}>
                <ClockerPinIcon name={pending ? 'clock' : configured ? 'reset' : 'lock'} size={18} />
                {pending ? 'Saving PIN...' : configured ? 'Reset PIN' : 'Save PIN'}
              </button>
              <a className={styles.secondary} href={employeeHref}>Cancel</a>
            </div>
          </fieldset>
        </form>

        {pending ? <p role="status" className={styles.pending}>Saving the PIN. Please wait.</p> : null}
        {result ? (
          <div ref={feedback} tabIndex={-1} className={`${styles.feedback} ${result.ok ? styles.saved : styles.failed}`}>
            <ClockerPinIcon name={result.ok ? 'check' : 'alert'} size={22} />
            <div>
              {result.ok ? (
                <div role="status"><strong>PIN saved</strong><p>Share it privately with the employee. They can now use it on the shared tablet.</p></div>
              ) : <div role="alert"><strong>{result.refresh ? 'Reload before trying again' : 'PIN was not saved'}</strong><p>{result.error}</p></div>}
              {result.ok ? <a className={styles.feedbackLink} href={employeeHref}>Back to employee <ClockerPinIcon name="arrow" size={16} /></a> : result.refresh ? <a className={styles.feedbackLink} href={`${employeeHref}/clocker-pin`}>Reload PIN settings <ClockerPinIcon name="reset" size={16} /></a> : null}
            </div>
          </div>
        ) : null}
      </section>

      <aside className={styles.guide} aria-labelledby="pin-guide-title">
        <h2 id="pin-guide-title">A PIN for the tablet.</h2>
        <p className={styles.guideIntro}>A simple way for this employee to verify before clocking in or out.</p>
        <div className={styles.guideRow}><ClockerPinIcon name="tablet" size={22} /><div><h3>Shared tablet access</h3><p>This PIN is separate from their portal password.</p></div></div>
        <div className={styles.guideRow}><ClockerPinIcon name="lock" size={22} /><div><h3>Keep it private</h3><p>Existing PINs cannot be viewed. If it is forgotten, create a new one here.</p></div></div>
        <div className={styles.guideRow}><ClockerPinIcon name="clock" size={22} /><div><h3>Time records stay intact</h3><p>Changing a PIN keeps portal access and recorded time unchanged.</p></div></div>
      </aside>
    </div>
  );
}
