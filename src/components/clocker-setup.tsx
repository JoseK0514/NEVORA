"use client";
import {copy as pageWords} from "./clocker-setup-copy";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import {ClockerPresentation,ClockerLanguageToggle,ClockerText,useClockerPresentation,useClockerCopy,useClockerKeepNames} from './clocker-language';
import {clockerErrorText,type ClockerLocale} from './clocker-copy';
import styles from './clocker.module.css';
import setup from './clocker-tablet-setup.module.css';
import { ClockerPinGate } from './clocker-pin-gate';
import { clearRosterHint, type RosterHint } from './clocker-roster';
import { ClockerShell } from './clocker-shell';
import { ClockerIcon } from './clocker-icon';
import { DoneTick } from './owner-b/b-glyphs';
import { isSetupCode, setupCodeFromHash } from './clocker-setup-link';

type SetupState = { state: 'prepared' | 'unregistered' } | { state: 'connected'; deviceName: string };
type Feedback = { message: string; uncertain: boolean; offline?: boolean };
class SetupFailure extends Error {
  constructor(message: string, readonly uncertain: boolean) { super(message); }
}
const OFFLINE = 'This tablet is offline. Connect it to Wi-Fi, then try again.';
/** How long the "connected" confirmation stays before the time clock opens by itself. */
export const SETUP_WELCOME_MS = 6000;


/** Keep the Settings path together while it fits in the instruction's text column. */
function SpanishSetupInstruction({ text }: { text: string }) {
  const instruction = useRef<HTMLSpanElement>(null);
  const [wrapPath, setWrapPath] = useState(false);
  useLayoutEffect(() => {
    const line = instruction.current;
    const path = text.match(/[^\s]+\u00a0→\u00a0[^\s]+/u)?.[0];
    const canvas = document.createElement('canvas').getContext('2d');
    if (!line || !path || !canvas) return;
    const measure = () => {
      const style = getComputedStyle(line);
      canvas.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      setWrapPath(canvas.measureText(path).width > line.getBoundingClientRect().width);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(line);
    document.fonts.addEventListener('loadingdone', measure);
    return () => {
      observer.disconnect();
      document.fonts.removeEventListener('loadingdone', measure);
    };
  }, [text]);
  return <span ref={instruction}>{wrapPath ? text.replace('\u00a0→\u00a0', ' → ') : text}</span>;
}

async function send(locationKey: string, body: object, signal?: AbortSignal): Promise<SetupState> {
  const response = await fetch(`/api/clocker/${encodeURIComponent(locationKey)}/setup`, {
    method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', 'X-Nevora-Clocker': '1' },
    body: JSON.stringify(body), signal: signal ?? AbortSignal.timeout(12000),
  });
  const data = await response.json();
  // The stable code picks the sentence, so a reworded server message keeps its Spanish line; a code the kiosk doesn't
  // know keeps the server's own words.
  if (!response.ok) throw new SetupFailure(clockerErrorText('en', { code: data?.code, error: typeof data?.error === 'string' ? data.error : 'Tablet setup could not be confirmed.' }), response.status >= 500);
  if (data.state === 'connected' && typeof data.deviceName === 'string') return { state: 'connected', deviceName: data.deviceName };
  if (data.state === 'prepared' || data.state === 'unregistered') return { state: data.state };
  throw new SetupFailure('We couldn’t confirm the setup. Tap Check setup before trying again.', true);
}

/* Setting up a tablet (Phase 6, JR-26). The enrolment calls are the ones this screen has always made (status, prepare,
 * redeem, status); what changed is how the code arrives and what each answer looks like.
 *
 * The setup code is a credential. It reaches this screen in one of two ways: typed or pasted into the field, or in the
 * fragment of the link the Owner's QR code opens. A code from a link is read once, the fragment is removed from the
 * address bar in the same tick, and the code is held only in a ref (never in React state, never in storage, never
 * logged). It leaves memory when the tablet connects, when the server refuses it, when someone chooses to type a code
 * instead, and when the page goes away. Nothing connects until someone taps Connect tablet: a link opened on the wrong
 * device (the Owner's own phone) must not enrol that device or use up the code. */
function ClockerSetupBody({ locationKey, locationLabel, timeZone, pinEnabled = false, punchEnabled = false, brand, workspaceName, layoutHint = null }: { locationKey: string; locationLabel: string; timeZone: string; pinEnabled?: boolean; punchEnabled?: boolean; brand?: { style?: Record<string, string>; logoUrl?: string | null }; workspaceName?: string;
  /** The sign-in layout this tablet last had here (the server read its path-scoped cookie): 'picker', 'id' or none. */
  layoutHint?: RosterHint | null }) {
  const {locale}=useClockerPresentation();
  const t=useClockerCopy(),keep=useClockerKeepNames();
  const [state, setState] = useState<SetupState>({ state: 'unregistered' });
  const [pending, setPending] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  // "received": a code came in the link and waits, in the ref below, for Connect tablet.
  const [mode, setMode] = useState<'type' | 'received'>('type');
  // True after this visit connected the tablet: the confirmation shows before the time clock.
  const [welcome, setWelcome] = useState(false);
  const linked = useRef<string | null>(null);
  const busy = useRef(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const failed = useCallback((error: unknown) => setFeedback(error instanceof SetupFailure ? { message: error.message, uncertain: error.uncertain }
    : typeof navigator !== 'undefined' && navigator.onLine === false ? { message: OFFLINE, uncertain: true, offline: true }
    : { message: 'We couldn’t confirm the setup. Check the connection, then tap Check setup.', uncertain: true }), []);
  const forget = useCallback(() => { linked.current = null; }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    let current = true;
    send(locationKey, { step: 'status' }, controller.signal).then(result => {
      // A tablet that isn't connected here has no sign-in to size for: its layout hint goes.
      if (result.state !== 'connected') clearRosterHint(locationKey);
      if (current) setState(result);
    }).catch(error => { if (current) failed(error); }).finally(() => {
      clearTimeout(timeout); if (current) setPending(false);
    });
    return () => { current = false; clearTimeout(timeout); controller.abort(); };
  }, [locationKey, failed]);

  // The code from the Owner's link: read once, then gone from the address bar (and from this history entry).
  useEffect(() => {
    const take = () => {
      const code = setupCodeFromHash(window.location.hash);
      if (code === null) return;
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
      if (code) { linked.current = code; setFeedback(current => current?.uncertain ? current : null); setMode('received'); }
      else { linked.current = null; setMode('type'); setFeedback(current => current?.uncertain ? current : { message: 'That link doesn’t have a complete setup code. Type the code from Owner Settings.', uncertain: false }); }
    };
    take();
    window.addEventListener('hashchange', take);
    const leaving = () => { linked.current = null; };
    window.addEventListener('pagehide', leaving);
    // The ref is not cleared here: React runs an effect's cleanup and the effect again on a development mount, and the
    // fragment is already gone from the address bar by then. The ref goes with the component.
    return () => { window.removeEventListener('hashchange', take); window.removeEventListener('pagehide', leaving); };
  }, []);

  const check = useCallback(async () => {
    if (busy.current) return;
    busy.current = true; setPending(true); setFeedback(null);
    try { const result = await send(locationKey, { step: 'status' }); setState(result); if (result.state === 'connected') forget(); }
    catch (error) { failed(error); }
    finally { busy.current = false; setPending(false); }
  }, [locationKey, failed, forget]);
  // Back online while the screen says there is no connection: check again without being asked.
  const offline = Boolean(feedback?.offline);
  useEffect(() => {
    if (!offline) return;
    const online = () => void check();
    window.addEventListener('online', online);
    return () => window.removeEventListener('online', online);
  }, [offline, check]);

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || pending || feedback?.uncertain) return;
    const code = mode === 'received' ? linked.current ?? '' : input.current?.value.trim() ?? '';
    if (!isSetupCode(code)) {
      forget(); setMode('type');
      setFeedback({ message: 'Enter the whole setup code the Owner sees in Settings → Clocker tablets.', uncertain: false }); return;
    }
    // Nothing is sent while the tablet says it is offline, so the code is still good and stays where it is.
    if (navigator.onLine === false) { setFeedback({ message: OFFLINE, uncertain: false, offline: true }); return; }
    busy.current = true; setPending(true); setConnecting(true); setFeedback(null);
    try {
      const prepared = await send(locationKey, { step: 'prepare' });
      if (prepared.state !== 'connected') await send(locationKey, { step: 'redeem', enrollmentToken: code });
      // Read back through the browser cookie before showing success.
      const confirmed = await send(locationKey, { step: 'status' });
      if (confirmed.state !== 'connected') throw new SetupFailure('We couldn’t confirm the setup. Allow cookies, then tap Check setup.', true);
      if (input.current) input.current.value = '';
      forget(); setMode('type'); setWelcome(true);
      setState(confirmed);
    } catch (error) {
      // A definite refusal ends this code's use here: it leaves memory and the field asks for another.
      if (error instanceof SetupFailure && !error.uncertain) { forget(); setMode('type'); }
      failed(error);
    }
    finally { busy.current = false; setPending(false); setConnecting(false); }
  }
  function typeInstead() { forget(); setFeedback(null); setMode('type'); }

  const uncertain = Boolean(feedback?.uncertain);
  const connected = state.state === 'connected';
  const checkingSignIn = Boolean(layoutHint) && pinEnabled && pending && state.state === 'unregistered' && !feedback && mode === 'type';
  const greeted = connected && welcome && pinEnabled && !uncertain;
  const linkedGate = connected && pinEnabled && !uncertain && !welcome;
  const view = uncertain ? 'uncertain' : greeted ? 'welcome' : connected ? 'connected' : mode;
  // The confirmation gives way to the time clock by itself, as every kiosk screen does; the button is the same step.
  useEffect(() => {
    if (!greeted || !punchEnabled) return;
    const timer = window.setTimeout(() => setWelcome(false), SETUP_WELCOME_MS);
    return () => window.clearTimeout(timer);
  }, [greeted, punchEnabled]);
  // Focus follows the step: the heading of a new state, or the field when its code was refused.
  const shown = useRef(view), error = feedback && !uncertain ? feedback.message : null;
  useEffect(() => {
    if (shown.current === view) return;
    shown.current = view;
    if (view === 'type' && error) input.current?.focus(); else heading.current?.focus();
  }, [view, error]);
  useEffect(() => { if (error && view === 'type' && !pending) input.current?.focus(); }, [error, view, pending]);

  const [deviceBefore, deviceAfter = ''] = t('{device} is connected to this location.', { device: '\u0000' }).split('\u0000');
  // Phase 8 (#20): the location reads as one name. A short name keeps its words on one line; a long one may still wrap.
  // Gate check (Nov 23): the band's pill already names the location, so the card doesn't repeat it.
  const placeLine = pageWords[locale].thisTabletBecomesThisLocationsTimeClock;
  const settingsStep = t('On another device, the Owner opens Settings → Clocker tablets.');
  const [readyBefore, readyAfter = ''] = t('{device} is ready. Your team can clock in now.', { device: '\u0000' }).split('\u0000');
  const fieldError = error && view === 'type';
  const punchNote = <div className={styles.note} data-tone="amber"><ClockerIcon name="warning" size={20} mark/><p><strong>{t("Timekeeping is not available yet.")}</strong>{t("Punching in isn’t turned on yet. Don’t use this tablet to record time.")} {t("Ask your Owner to contact NEVORA support.")}</p></div>;
  return <ClockerShell locationLabel={locationLabel} timeZone={timeZone} brand={brand} workspaceName={workspaceName}
    deviceName={state.state === 'connected' ? state.deviceName : undefined}
    status={uncertain ? offline ? 'offline' : 'unconfirmed' : pending ? 'checking' : connected ? 'connected' : 'setup'}>
    {linkedGate ? <ClockerPinGate locationKey={locationKey} timeZone={timeZone} punchEnabled={punchEnabled} layoutHint={layoutHint} />
    /* A tablet that signed people in here before (the layout hint) checks its setup in the sign-in card's own waiting
     * shape, the same title line and reserved height the sign-in draws while its names load, so the hand-off from the
     * check to sign-in moves nothing (lead, Nov 25). A tablet never set up has no hint and keeps the setup screen. */
    : checkingSignIn ? <div className={styles.content} data-align="center" aria-busy="true" data-clocker-checking="">
      <div className={styles.head}><h1 ref={heading} tabIndex={-1} className={styles.title} data-waiting="">{t('Enter your Employee ID')}</h1></div>
      <div className="np-wait" data-hint={layoutHint ?? undefined}/>
      <div className={styles.meta} data-clocker-foot="" data-align="end"><ClockerLanguageToggle/></div>
    </div>
    : <div className={`${styles.content} ${setup.root}`} data-align="center" aria-busy={pending} data-clocker-setup={view} data-refused={fieldError ? '' : undefined}>
      {view === 'uncertain' ? <>
        {/* Premium pass (decision 2): a setup that can't be confirmed is the amber Question; no connection is red. */}
        <span className={styles.ring} data-tone={offline ? 'red' : 'amber'}><ClockerIcon name={offline ? 'offline' : 'unknown'} size={28} mark/></span>
        <h1 ref={heading} tabIndex={-1} className={styles.title}>{t(offline ? 'No connection' : 'Setup not confirmed')}</h1>
      </> : view === 'welcome' ? <>
        <span className={styles.check} data-size="sm"><DoneTick size={30}/></span>
        <h1 ref={heading} tabIndex={-1} className={styles.title}>{t('This tablet is connected to {location}', { location: locationLabel })}</h1>
        <p className={styles.lead}>{readyBefore}<strong>{state.state === 'connected' ? state.deviceName : ''}</strong>{readyAfter}</p>
        {punchEnabled ? null : punchNote}
        <div className={styles.stack}><button className={styles.btn} data-kind="primary" type="button" onClick={() => setWelcome(false)}>{t('Open the time clock')}<ClockerIcon name="arrow" size={20}/></button></div>
        <p className={styles.clears}>{t("Owner access has been signed out on this tablet.")}{punchEnabled ? <>{' '}{t('The time clock opens in a few seconds.')}</> : null}</p>
      </> : view === 'connected' ? <>
        <span className={styles.check} data-size="sm" data-still={welcome ? undefined : ''}><DoneTick size={30}/></span>
        <h1 ref={heading} tabIndex={-1} className={styles.title}>{welcome ? t('This tablet is connected to {location}', { location: locationLabel }) : t("Tablet connected")}</h1>
        {/* One sentence with a placeholder (Nov 10 review, NV-173). */}
        <p className={styles.lead}>{deviceBefore}<strong>{state.state === 'connected' ? state.deviceName : ''}</strong>{deviceAfter}</p>
        {punchNote}
        <p className={styles.clears}>{t("Owner access has been signed out on this tablet.")}</p>
        <div className={styles.stack}><button className={styles.btn} data-kind="secondary" type="button" disabled={pending} onClick={check}>{t("Check connection")}</button></div>
      </> : view === 'received' ? <>
        <span className={styles.ring}><ClockerIcon name="tablet" size={28} mark/></span>
        <h1 ref={heading} tabIndex={-1} className={styles.title}>{t('Setup code received')}</h1>
        <p className={styles.lead}>{placeLine} {keep(t('Tap Connect tablet to finish. The code works one time.'))}</p>
        <form onSubmit={connect} className={styles.form}>
          <fieldset disabled={pending}>
            {feedback && !uncertain ? <p role="alert" className={`${styles.msg} ${setup.center}`}><ClockerIcon name={feedback.offline ? 'offline' : 'stop'} size={18}/><span><ClockerText text={feedback.message}/></span></p> : null}
            <button className={styles.btn} data-kind="primary" data-busy={pending ? '' : undefined} type="submit">{pending ? <span className={styles.spin} aria-hidden="true"/> : null}{t(connecting ? 'Connecting…' : pending ? 'Checking setup…' : 'Connect tablet')}{!pending ? <ClockerIcon name="arrow" size={20}/> : null}</button>
          </fieldset>
        </form>
        <div className={styles.links}><button className={styles.link} type="button" disabled={pending} onClick={typeInstead}>{pageWords[locale].typeACodeInstead}</button></div>
      </> : <>
        <p className={`${styles.eyebrow} ${setup.eyebrow}`}>{t("One-time setup")}</p>
        <h1 ref={heading} tabIndex={-1} className={styles.title}>{t("Set up this tablet")}</h1>
        <p className={`${styles.lead} ${setup.lead}`}>{placeLine}</p>
        <ol className={setup.steps} aria-label={t('How to set it up')}>
          <li><span className={setup.n} aria-hidden="true">1</span>{locale === 'es' ? <SpanishSetupInstruction text={settingsStep}/> : <span>{settingsStep}</span>}</li>
          <li><span className={setup.n} aria-hidden="true">2</span><span>{t('The Owner adds this tablet and gets its setup code.')}</span></li>
          <li><span className={setup.n} aria-hidden="true">3</span><span>{t('Point this tablet’s camera at the code, or type the code below.')}</span></li>
        </ol>
        <form onSubmit={connect} className={styles.form}>
          <fieldset disabled={pending}>
            <label data-clocker-setup-field className={`${styles.field} ${setup.field}`}>{t("Setup code")}<textarea ref={input} name="enrollmentToken" rows={2} required maxLength={4096} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false}
              aria-invalid={fieldError ? true : undefined} aria-describedby={fieldError ? 'clocker-setup-error clocker-setup-help' : 'clocker-setup-help'} /></label>
            {fieldError ? <p id="clocker-setup-error" role="alert" className={styles.msg}><ClockerIcon name={feedback?.offline ? 'offline' : 'stop'} size={18}/><span><ClockerText text={error}/></span></p> : null}
            <button className={`${styles.btn} ${setup.go}`} data-kind="primary" data-busy={pending ? '' : undefined} type="submit">{pending ? <span className={styles.spin} aria-hidden="true"/> : null}{t(connecting ? 'Connecting…' : pending ? 'Checking setup…' : 'Connect tablet')}{!pending ? <ClockerIcon name="arrow" size={20}/> : null}</button>
          </fieldset>
        </form>
      </>}
      {/* The busy state shows in the button; this line is for screen readers only (Nov 10 review, NV-298). */}
      <p role="status" className={styles.sr}>{connecting ? t('Connecting this tablet…') : pending ? t("Checking this tablet…") : ''}</p>
      {/* A definite answer about a connected tablet sits under the card's content with Check setup. */}
      {feedback && !uncertain && view === 'connected' ? <><p role="alert" className={styles.msg}><ClockerIcon name="stop" size={18}/><span><ClockerText text={feedback.message}/></span></p>
        <div className={styles.links}><button className={styles.link} type="button" disabled={pending} onClick={check}>{t("Check setup")}</button></div></> : null}
      {uncertain ? <><p role="alert" className={styles.smsg}><ClockerText text={feedback?.message ?? ''}/></p>
        <div className={styles.stack}><button className={styles.btn} data-kind="primary" data-busy={pending ? '' : undefined} type="button" disabled={pending} onClick={check}>{pending ? <span className={styles.spin} aria-hidden="true"/> : null}{t(pending ? 'Checking setup…' : 'Check setup')}</button></div></> : null}
      {view === 'type' ? <div className={`${styles.meta} ${setup.meta}`}><p id="clocker-setup-help">{t("Use the tablet’s setup code here, not an employee PIN. Allow cookies in this browser.")}</p><ClockerLanguageToggle/></div>
        : <div className={styles.meta} data-align="center"><ClockerLanguageToggle/></div>}
    </div>}
  </ClockerShell>;
}

export function ClockerSetup({initialLocale,...props}:Parameters<typeof ClockerSetupBody>[0]&{initialLocale?:ClockerLocale}){
 return <ClockerPresentation initialLocale={initialLocale}><ClockerSetupBody {...props}/></ClockerPresentation>;
}
