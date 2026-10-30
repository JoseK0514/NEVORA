"use client";

import { useEffect, useRef, useState, type FormEvent } from 'react';
import {ClockerPresentation,ClockerLanguageToggle,useClockerCopy,useClockerPresentation} from './clocker-language';
import type {ClockerLocale} from './clocker-copy';
import styles from './clocker-setup.module.css';
import { ClockerPinGate } from './clocker-pin-gate';
import { ClockerShell } from './clocker-shell';
import { ClockerIcon } from './clocker-icon';
import { useClockerMotion } from './clocker-motion';

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

function ClockerSetupBody({ locationKey, locationLabel, timeZone, pinEnabled = false, punchEnabled = false, brand }: { locationKey: string; locationLabel: string; timeZone: string; pinEnabled?: boolean; punchEnabled?: boolean; brand?: { style?: Record<string, string>; logoUrl?: string | null } }) {
  const t=useClockerCopy(),{v2}=useClockerPresentation();
  const [state, setState] = useState<SetupState>({ state: 'unregistered' });
  const [pending, setPending] = useState(true);
  const [feedback, setFeedback] = useState<{ message: string; uncertain: boolean } | null>(null);
  const busy = useRef(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const motion = useClockerMotion(feedback?.uncertain ? 'unconfirmed' : state.state);
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

  return <ClockerShell locationLabel={locationLabel} timeZone={timeZone} brand={brand}
    deviceName={state.state === 'connected' ? state.deviceName : undefined}
    status={feedback?.uncertain ? 'unconfirmed' : pending ? 'checking' : state.state === 'connected' ? 'connected' : 'setup'}>
    <div ref={motion} className={styles.kioskBody} aria-busy={pending}>
      {feedback?.uncertain ? <>
        <div data-clocker-setup-icon className={styles.kioskIcon} data-tone="amber"><ClockerIcon name="refresh" size={44} weight={v2?'regular':'duotone'}/></div>
        <h1>{t("Check tablet setup")}</h1>
      </> : state.state === 'connected' && pinEnabled ? <ClockerPinGate locationKey={locationKey} timeZone={timeZone} punchEnabled={punchEnabled} /> : state.state === 'connected' ? <>
        <div className={styles.connectedMark}><ClockerIcon name="check" size={48} weight={v2?'regular':'bold'}/></div>
        <h1>{t("Tablet connected")}</h1>
        <p className={styles.kioskLead}>{state.deviceName}{' '}{t("is registered for this location.")}</p>
        <div className={styles.tabletNotice}><strong>{t("Timekeeping is not available yet.")}</strong>{t("Employee PINs and real time punches are being connected. Do not use this tablet to record worked time yet.")}</div>
        <p className={styles.footnote}>{t("Owner access has been signed out on this tablet.")}</p>
        <button className="button secondary" type="button" disabled={pending} onClick={check}>{t("Check Connection")}</button>
      </> : <>
        <div data-clocker-setup-icon className={styles.kioskIcon}><ClockerIcon name="lock" size={44} weight={v2?'regular':'duotone'}/></div>
        <p data-clocker-eyebrow className={styles.kioskEyebrow}>{t("One-time setup")}</p>
        <h1>{t("Set up this tablet")}</h1>
        <p className={styles.kioskLead}>{t("Ask your Owner to add this device in Settings → Clocker devices. Then paste the one-use setup code.")}</p>
        <form onSubmit={connect} className={styles.tabletForm}>
          <fieldset disabled={pending || Boolean(feedback?.uncertain)}>
            <label data-clocker-setup-field className={styles.field}>{t("Setup code")}<textarea ref={input} name="enrollmentToken" rows={3} required maxLength={72} autoComplete="off" autoCapitalize="none" spellCheck={false} aria-describedby="clocker-setup-help" /></label>
            <p id="clocker-setup-help" className={styles.hint}>{t("This is the tablet setup code, not an employee PIN. Cookies must be allowed.")}</p>
            <button className="button primary" type="submit">{t(pending ? 'Checking setup...' : 'Connect tablet')}{!pending ? <ClockerIcon name="arrow" size={20}/> : null}</button>
          </fieldset>
        </form>
      </>}
      {v2&&!(state.state==='connected'&&pinEnabled) ? <ClockerLanguageToggle/> : null}
      {pending ? <p role="status" className={styles.kioskStatus}>{t("Checking this tablet...")}</p> : null}
      {feedback ? <div className={styles.kioskProblem}><p role="alert" className={styles.error}>{t(feedback.message)}</p>
        <button className="button secondary" type="button" disabled={pending} onClick={check}>{t("Check Setup")}</button></div> : null}
    </div>
  </ClockerShell>;
}

export function ClockerSetup(props:Parameters<typeof ClockerSetupBody>[0]&{uiV2?:boolean;initialLocale?:ClockerLocale}){
 return <ClockerPresentation v2={props.uiV2} initialLocale={props.initialLocale}><ClockerSetupBody {...props}/></ClockerPresentation>;
}
