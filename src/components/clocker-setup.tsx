"use client";

import { useEffect, useRef, useState, type FormEvent } from 'react';
import styles from './clocker-setup.module.css';

type SetupState = { state: 'prepared' | 'unregistered' } | { state: 'connected'; deviceName: string };
class SetupFailure extends Error {
  constructor(message: string, readonly uncertain: boolean) { super(message); }
}
async function send(locationKey: string, body: object, signal?: AbortSignal): Promise<SetupState> {
  const response = await fetch(`/api/clocker/${encodeURIComponent(locationKey)}/setup`, {
    method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', 'X-Nevora-Clocker': '1' },
    body: JSON.stringify(body), signal: signal ?? AbortSignal.timeout(12000),
  });
  const data = await response.json();
  if (!response.ok) throw new SetupFailure(typeof data?.error === 'string' ? data.error : 'Tablet setup could not be confirmed.', response.status >= 500);
  if (data.state === 'connected' && typeof data.deviceName === 'string') return { state: 'connected', deviceName: data.deviceName };
  if (data.state === 'prepared' || data.state === 'unregistered') return { state: data.state };
  throw new SetupFailure('Tablet setup could not be confirmed. Choose Check Setup before trying again.', true);
}

export function ClockerSetup({ locationKey, locationLabel }: { locationKey: string; locationLabel: string; timeZone: string }) {
  const [state, setState] = useState<SetupState>({ state: 'unregistered' });
  const [pending, setPending] = useState(true);
  const [feedback, setFeedback] = useState<{ message: string; uncertain: boolean } | null>(null);
  const busy = useRef(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const failed = (error: unknown) => setFeedback(error instanceof SetupFailure ? { message: error.message, uncertain: error.uncertain }
    : { message: 'We could not confirm tablet setup. Check the connection, then choose Check Setup before trying again.', uncertain: true });

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    let current = true;
    send(locationKey, { step: 'status' }, controller.signal).then(result => {
      if (current) setState(result);
    }).catch(error => { if (current) failed(error); }).finally(() => {
      clearTimeout(timeout); if (current) setPending(false);
    });
    return () => { current = false; clearTimeout(timeout); controller.abort(); };
  }, [locationKey]);

  async function check() {
    if (busy.current) return;
    busy.current = true; setPending(true); setFeedback(null);
    try { setState(await send(locationKey, { step: 'status' })); }
    catch (error) { failed(error); }
    finally { busy.current = false; setPending(false); }
  }
  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || pending || feedback?.uncertain) return;
    const code = input.current?.value.trim() ?? '';
    if (!/^nev_enr_[a-f0-9]{64}$/.test(code)) {
      setFeedback({ message: 'Paste the complete setup code from Owner Settings.', uncertain: false }); return;
    }
    busy.current = true; setPending(true); setFeedback(null);
    try {
      const prepared = await send(locationKey, { step: 'prepare' });
      if (prepared.state !== 'connected') await send(locationKey, { step: 'redeem', enrollmentToken: code });
      // Read back through the browser cookie before showing success.
      const confirmed = await send(locationKey, { step: 'status' });
      if (confirmed.state !== 'connected') throw new SetupFailure('Setup could not be verified. Allow cookies and choose Check Setup.', true);
      if (input.current) input.current.value = '';
      setState(confirmed);
    } catch (error) { failed(error); }
    finally { busy.current = false; setPending(false); }
  }

  return <main className={styles.tabletPage}>
    <section className={styles.tabletCard} aria-busy={pending}>
      <p className={styles.eyebrow}>NEVORA Workforce · Clocker</p>
      <div className={styles.tabletLocation}>{locationLabel}</div>
      {feedback?.uncertain ? <>
        <h1>Check Tablet Setup</h1>
      </> : state.state === 'connected' ? <>
        <div className={styles.connectedMark} aria-hidden="true">✓</div>
        <h1>Tablet Connected</h1>
        <p>{state.deviceName} is registered for this location.</p>
        <div className={styles.tabletNotice}><strong>Timekeeping is not available yet.</strong>Employee PINs and real time punches are being connected. Do not use this tablet to record worked time yet.</div>
        <p className={styles.footnote}>Owner access has been signed out on this tablet.</p>
        <button className="button secondary" type="button" disabled={pending} onClick={check}>Check Connection</button>
      </> : <>
        <h1>Set Up This Tablet</h1>
        <p>Ask your Owner to add this device in Settings → Clocker Devices. Paste the one-use code below to connect this shared tablet.</p>
        <form onSubmit={connect} className={styles.tabletForm}>
          <fieldset disabled={pending || Boolean(feedback?.uncertain)}>
            <label className={styles.field}>Setup code<textarea ref={input} name="enrollmentToken" rows={3} required maxLength={72} autoComplete="off" autoCapitalize="none" spellCheck={false} aria-describedby="clocker-setup-help" /></label>
            <p id="clocker-setup-help" className={styles.hint}>This is the tablet setup code, not an employee PIN. Cookies must be allowed.</p>
            <button className="button primary" type="submit">{pending ? 'Checking Setup…' : 'Connect Tablet'}</button>
          </fieldset>
        </form>
      </>}
      {pending ? <p role="status">Checking this tablet…</p> : null}
      {feedback ? <div><p role="alert" className={styles.error}>{feedback.message}</p>
        <button className="button secondary" type="button" disabled={pending} onClick={check}>Check Setup</button></div> : null}
      <p className={styles.footnote}>NEVORA · Powered by VELANI LLC</p>
    </section>
  </main>;
}
