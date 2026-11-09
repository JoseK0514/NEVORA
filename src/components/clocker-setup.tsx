"use client";

import { useEffect, useRef, useState, type FormEvent } from 'react';
import {ClockerPresentation,ClockerLanguageToggle,useClockerCopy} from './clocker-language';
import type {ClockerLocale} from './clocker-copy';
import styles from './clocker.module.css';
import { ClockerPinGate } from './clocker-pin-gate';
import { ClockerShell } from './clocker-shell';
import { ClockerIcon } from './clocker-icon';

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

function ClockerSetupBody({ locationKey, locationLabel, timeZone, pinEnabled = false, punchEnabled = false, brand, workspaceName }: { locationKey: string; locationLabel: string; timeZone: string; pinEnabled?: boolean; punchEnabled?: boolean; brand?: { style?: Record<string, string>; logoUrl?: string | null }; workspaceName?: string }) {
  const t=useClockerCopy();
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

  const linked=state.state === 'connected' && pinEnabled;
  return <ClockerShell locationLabel={locationLabel} timeZone={timeZone} brand={brand} workspaceName={workspaceName}
    deviceName={state.state === 'connected' ? state.deviceName : undefined}
    status={feedback?.uncertain ? 'unconfirmed' : pending ? 'checking' : state.state === 'connected' ? 'connected' : 'setup'}>
    {linked && !feedback?.uncertain ? <ClockerPinGate locationKey={locationKey} timeZone={timeZone} punchEnabled={punchEnabled} />
    : <div className={styles.content} data-align="center" aria-busy={pending}>
      {feedback?.uncertain ? <>
        <span className={styles.ring} data-tone="amber"><ClockerIcon name="refresh" size={28}/></span>
        <h1 className={styles.title}>{t("Check tablet setup")}</h1>
      </> : state.state === 'connected' ? <>
        <span className={styles.ring} data-tone="green"><ClockerIcon name="check" size={28}/></span>
        <h1 className={styles.title}>{t("Tablet connected")}</h1>
        <p className={styles.lead}><strong>{state.deviceName}</strong>{' '}{t("is registered for this location.")}</p>
        <div className={styles.note} data-tone="amber"><ClockerIcon name="warning" size={20}/><p><strong>{t("Timekeeping is not available yet.")}</strong>{t("Employee PINs and real time punches are being connected. Do not use this tablet to record worked time yet.")}</p></div>
        <p className={styles.clears}>{t("Owner access has been signed out on this tablet.")}</p>
        <div className={styles.stack}><button className={styles.btn} data-kind="secondary" type="button" disabled={pending} onClick={check}>{t("Check Connection")}</button></div>
      </> : <>
        <span className={styles.ring}><ClockerIcon name="lock" size={28}/></span>
        <p className={styles.eyebrow}>{t("One-time setup")}</p>
        <h1 className={styles.title}>{t("Set up this tablet")}</h1>
        <p className={styles.lead}>{t("Ask your Owner to add this device in Settings → Clocker tablets. Then paste the one-use setup code.")}</p>
        <form onSubmit={connect} className={styles.form}>
          <fieldset disabled={pending || Boolean(feedback?.uncertain)}>
            <label className={styles.field}>{t("Setup code")}<textarea ref={input} name="enrollmentToken" rows={3} required maxLength={72} autoComplete="off" autoCapitalize="none" spellCheck={false}
              aria-invalid={feedback && !feedback.uncertain ? true : undefined} aria-describedby={feedback && !feedback.uncertain ? 'clocker-setup-error clocker-setup-help' : 'clocker-setup-help'} /></label>
            {feedback && !feedback.uncertain ? <p id="clocker-setup-error" role="alert" className={styles.msg}><ClockerIcon name="warning" size={18}/><span>{t(feedback.message)}</span></p> : null}
            <p id="clocker-setup-help" className={styles.hint}>{t("This is the tablet setup code, not an employee PIN. Cookies must be allowed.")}</p>
            <button className={styles.btn} data-kind="primary" type="submit">{t(pending ? 'Checking setup...' : 'Connect tablet')}{!pending ? <ClockerIcon name="arrow" size={20}/> : null}</button>
          </fieldset>
        </form>
      </>}
      {pending ? <p role="status" className={styles.busy}><span className={styles.spin} aria-hidden="true"/>{t("Checking this tablet...")}</p> : null}
      {/* A definite answer from the server: its message under the field (on the form) or under the card's content, with
        * Check Setup as before. */}
      {feedback && !feedback.uncertain ? <>{state.state === 'connected' ? <p role="alert" className={styles.msg}><ClockerIcon name="warning" size={18}/><span>{t(feedback.message)}</span></p> : null}
        <div className={styles.links}><button className={styles.link} type="button" disabled={pending} onClick={check}><ClockerIcon name="refresh" size={18}/>{t("Check Setup")}</button></div></> : null}
      {feedback?.uncertain ? <><p role="alert" className={styles.smsg}>{t(feedback.message)}</p>
        <div className={styles.stack}><button className={styles.btn} data-kind="primary" type="button" disabled={pending} onClick={check}>{t("Check Setup")}</button></div></> : null}
      <div className={styles.meta} data-align="center"><ClockerLanguageToggle/></div>
    </div>}
  </ClockerShell>;
}

export function ClockerSetup({initialLocale,...props}:Parameters<typeof ClockerSetupBody>[0]&{initialLocale?:ClockerLocale}){
 return <ClockerPresentation initialLocale={initialLocale}><ClockerSetupBody {...props}/></ClockerPresentation>;
}
