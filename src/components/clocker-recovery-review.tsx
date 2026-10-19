'use client';

import {useEffect, useId, useRef, useState, useSyncExternalStore} from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import {useGSAP} from '@gsap/react';
import {ArrowLeftIcon} from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import {ArrowRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowRight';
import {CheckCircleIcon} from '@phosphor-icons/react/dist/ssr/CheckCircle';
import {ClockIcon} from '@phosphor-icons/react/dist/ssr/Clock';
import {DeviceTabletIcon} from '@phosphor-icons/react/dist/ssr/DeviceTablet';
import {MagnifyingGlassIcon} from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import {MinusIcon} from '@phosphor-icons/react/dist/ssr/Minus';
import {PlusIcon} from '@phosphor-icons/react/dist/ssr/Plus';
import {ReceiptIcon} from '@phosphor-icons/react/dist/ssr/Receipt';
import {ShieldCheckIcon} from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import {SpinnerGapIcon} from '@phosphor-icons/react/dist/ssr/SpinnerGap';
import {WarningCircleIcon} from '@phosphor-icons/react/dist/ssr/WarningCircle';
import {createPrivateSnapshotController} from '../lib/private-snapshot-client';
import type {RecoveryReview} from '../lib/clocker/recovery-review.server';
import styles from './clocker-recovery-review.module.css';

gsap.registerPlugin(useGSAP);
const subscribe = () => () => {};
const actionNames: Record<string, string> = {
  CLOCK_IN: 'Clock in', CLOCK_OUT: 'Clock out', START_BREAK: 'Start break', END_BREAK: 'End break',
};
const iconProps = {size: 20, 'aria-hidden': true, focusable: false} as const;

export function ClockerRecoveryReview({actorId, timeZone}: {actorId: string; timeZone: string}) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [reference, setReference] = useState('');
  const [hasSelection, setHasSelection] = useState(false);
  const [state, setState] = useState<RecoveryReview | null>(null);
  const [loading, setLoading] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const submitted = useRef(false);
  const selected = useRef('');
  const controller = useRef<ReturnType<typeof createPrivateSnapshotController<RecoveryReview>> | null>(null);
  const inputId = useId();
  const helpId = useId();
  const pending = loading && hasSelection;
  const ready = state?.state === 'ready' ? state : null;
  const denied = state?.state === 'unavailable' && state.reason === 'access_denied';
  const unavailable = state?.state === 'unavailable' && state.reason !== 'no_selection';

  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('[data-review-enter]', {y: 6, opacity: 0.65, duration: 0.3, stagger: 0.04, ease: 'power2.out', clearProps: 'transform,opacity'});
    });
    return () => media.revert();
  }, {scope: root});

  useEffect(() => {
    const c = createPrivateSnapshotController<RecoveryReview>(value => {
      setState(value.refreshing ? null : value.snapshot);
      setLoading(value.refreshing);
    }, async signal => {
      if (!selected.current) return {state: 'unavailable', reason: 'no_selection'};
      const response = await fetch('/api/manager/clocker-recovery', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store', signal,
        headers: {'Content-Type': 'application/json', 'X-Nevora-Clocker-Recovery': '1', 'X-Nevora-Actor': actorId},
        body: JSON.stringify({commandId: selected.current}),
      });
      if (response.status === 401 || response.status === 403) return {state: 'unavailable', reason: 'access_denied'};
      if (!response.ok) throw Error('Unavailable');
      return response.json();
    }, value => {
      const v = value as RecoveryReview;
      if (v?.state === 'unavailable') return v;
      if (v?.state !== 'ready' || v.commandId !== selected.current || !Array.isArray(v.receipts) || v.receipts.length > 100 || !Number.isFinite(v.validForMs) || v.validForMs < 1 || v.validForMs > 15000 || !Number.isFinite(Date.parse(v.observedAt))) throw Error('Invalid receipt review');
      return v;
    }, reason => ({state: 'unavailable', reason}), () => 'read_failed');
    controller.current = c;
    let live = false;
    const active = (event?: Event) => {
      if (event?.type === 'focus' && (event.target !== window || live)) return;
      live = document.visibilityState === 'visible' && navigator.onLine;
      if (live) c.start(); else c.pause();
    };
    const pause = (event?: Event) => {
      if (event?.type === 'blur' && event.target !== window) return;
      live = false;
      c.pause();
    };
    for (const name of ['focus', 'pageshow', 'online', 'storage']) window.addEventListener(name, active);
    for (const name of ['blur', 'pagehide', 'offline']) window.addEventListener(name, pause);
    document.addEventListener('visibilitychange', active);
    active();
    return () => {
      c.stop();
      for (const name of ['focus', 'pageshow', 'online', 'storage']) window.removeEventListener(name, active);
      for (const name of ['blur', 'pagehide', 'offline']) window.removeEventListener(name, pause);
      document.removeEventListener('visibilitychange', active);
      controller.current = null;
    };
  }, [actorId]);

  useEffect(() => {
    if (!loading && submitted.current && (ready || unavailable)) {
      submitted.current = false;
      feedback.current?.focus({preventScroll: true});
    }
  }, [loading, ready, unavailable]);

  function changeReference(value: string) {
    setReference(value);
    setHasSelection(false);
    selected.current = '';
    submitted.current = false;
    controller.current?.pause();
    if (document.visibilityState === 'visible' && navigator.onLine) controller.current?.start();
  }

  function formattedTime(value: string) {
    if (!Number.isFinite(Date.parse(value))) return 'Time unavailable';
    return new Intl.DateTimeFormat('en', {timeZone, month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short'}).format(new Date(value));
  }

  return <div ref={root} className={['clocker-review-page', styles.root].join(' ')}>
    <header className={styles.heading} data-review-enter>
      <Link href="/app" className={styles.back}><ArrowLeftIcon {...iconProps}/> Home</Link>
      <h1>Clocker recovery</h1>
      <p>Check a saved Clocker action and help the employee finish recovery.</p>
    </header>

    <div className={styles.workspace}>
      <section className={styles.lookup} aria-labelledby="recovery-lookup-heading" data-review-enter>
        <div className={styles.sectionHeading}>
          <span className={styles.iconWell}><ReceiptIcon size={24} aria-hidden="true"/></span>
          <div><h2 id="recovery-lookup-heading">Check a saved action</h2><p>Enter the reference shown on the employee’s tablet.</p></div>
        </div>
        <form onSubmit={event => {
          event.preventDefault();
          if (!hydrated || pending) return;
          selected.current = reference.trim().toLowerCase();
          setHasSelection(true);
          submitted.current = true;
          if (!navigator.onLine) {
            setLoading(false);
            setState({state: 'unavailable', reason: 'offline'});
            return;
          }
          controller.current?.refresh();
        }}>
          <fieldset disabled={!hydrated || pending} className={styles.fields}>
            <label htmlFor={inputId}>Saved action reference</label>
            <input id={inputId} required value={reference} onChange={event => changeReference(event.target.value)}
              pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
              maxLength={36} autoComplete="off" autoCapitalize="none" spellCheck={false} aria-describedby={helpId}
              placeholder="Paste the saved reference"/>
            <p id={helpId} className={styles.hint}>Example format: 12345678-1234-1234-1234-123456789abc. Include every character and dash.</p>
            <button className={styles.primary} type="submit" disabled={!hydrated || pending}>
              {pending ? <SpinnerGapIcon {...iconProps} className={styles.spinner}/> : <MagnifyingGlassIcon {...iconProps}/>}
              {pending ? 'Checking receipt…' : 'Check receipt'}
            </button>
          </fieldset>
        </form>
        <noscript><p className={styles.noScript}>Enable JavaScript to check a receipt. You can still review timecards below.</p></noscript>

        <div className={styles.resultArea} aria-busy={pending}>
          {pending ? <div className={styles.placeholder} role="status"><span className={styles.placeholderIcon}><SpinnerGapIcon size={28} className={styles.spinner} aria-hidden="true"/></span><h3>Checking the saved receipt</h3><p>Looking for a recorded action using this reference.</p></div>
          : ready ? <div ref={feedback} tabIndex={-1} className={styles.feedback}>
            <div className={[styles.resultHeading, ready.receipts.length ? styles.confirmed : styles.unconfirmed].join(' ')} role="status">
              {ready.receipts.length ? <CheckCircleIcon {...iconProps}/> : <WarningCircleIcon {...iconProps}/>}
              <h3>{ready.receipts.length ? 'Recorded action found' : 'Action still unconfirmed'}</h3>
            </div>
            <div className={styles.reference}><span>Reference checked</span><code>{ready.commandId}</code></div>
            {ready.receipts.length ? <>
              <div className={styles.receipts}>{ready.receipts.map((receipt, index) => <article key={[receipt.employeeId, receipt.performedAt, index].join('-')} className={styles.receipt}>
                <div className={styles.receiptTitle}><span className={styles.avatar} aria-hidden="true">{receipt.employeeName.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('')}</span><div><h4>{receipt.employeeName}</h4><p>{actionNames[receipt.action] ?? 'Recorded action'}</p></div></div>
                <dl><div><dt>Recorded at</dt><dd><time dateTime={receipt.performedAt}>{formattedTime(receipt.performedAt)}</time></dd></div><div><dt>Tablet</dt><dd>{receipt.deviceName}</dd></div><div><dt>Location</dt><dd>{receipt.locationName}</dd></div></dl>
              </article>)}</div>
              <div className={styles.nextStep}><DeviceTabletIcon {...iconProps}/><div><h4>Finish on the same tablet</h4><p>Review the receipt with the employee. Ask them to enter their PIN on the original tablet and check their action status. The tablet verifies the receipt before clearing their resolved action.</p></div></div>
            </> : <div className={styles.nextStep}><DeviceTabletIcon {...iconProps}/><div><h4>Keep the original recovery record</h4><p>No committed receipt was observed. The request may still be in progress. Ask the employee to verify their PIN and check the action on the same registered tablet. An absent receipt does not cancel the request.</p></div></div>}
          </div> : unavailable ? <div ref={feedback} tabIndex={-1} className={styles.feedback} role="alert">
            <div className={[styles.resultHeading, styles.unconfirmed].join(' ')}><WarningCircleIcon {...iconProps}/><h3>{denied ? 'Sign in to continue' : 'Receipt could not be checked'}</h3></div>
            <p className={styles.errorCopy}>{denied ? 'Your recovery review access ended. Sign in again before checking this action.' : 'Keep the saved action and its original reference. Try checking again when your connection is available.'}</p>
            {denied ? <Link href="/login" className={styles.secondary}>Go to sign in <ArrowRightIcon {...iconProps}/></Link> : null}
          </div> : <div className={styles.placeholder}><span className={styles.placeholderIcon}><ReceiptIcon size={30} weight="duotone" aria-hidden="true"/></span><h3>Your receipt will appear here</h3><p>Enter a saved reference to see whether the action was recorded.</p></div>}
        </div>
      </section>

      <aside className={styles.guide} aria-labelledby="recovery-guide-heading" data-review-enter>
        <div className={styles.guideHeading}><ShieldCheckIcon size={24} weight="duotone" aria-hidden="true"/><h2 id="recovery-guide-heading">A clear path to recovery</h2></div>
        <ol className={styles.steps}>
          <li><span aria-hidden="true">1</span><div><h3>Find the saved reference</h3><p>Use the action reference shown on the registered tablet’s recovery screen.</p></div></li>
          <li><span aria-hidden="true">2</span><div><h3>Review the receipt together</h3><p>Check the employee, action, time, tablet, and location.</p></div></li>
          <li><span aria-hidden="true">3</span><div><h3>Return to the same tablet</h3><p>The employee verifies their PIN and checks the action status to finish recovery.</p></div></li>
        </ol>
        <div className={styles.safety}><ShieldCheckIcon {...iconProps}/><p>Checking a receipt does not change recorded time or retry a clock action.</p></div>
        <details className={styles.details}><summary>Can others still use the tablet?<span className={styles.disclosure}><PlusIcon {...iconProps} className={styles.plus}/><MinusIcon {...iconProps} className={styles.minus}/></span></summary><p>Other employees can use their own PIN and record their work. If this tablet cannot store recovery data, use another registered tablet at the same location while keeping the original record for review.</p></details>
      </aside>
    </div>

    <section className={styles.corrections} aria-labelledby="recovery-corrections-heading" data-review-enter>
      <span className={styles.correctionIcon}><ClockIcon size={24} aria-hidden="true"/></span>
      <div><h2 id="recovery-corrections-heading">Time missing or incorrect?</h2><p>Review the employee’s evidence, then use the existing time correction workflow. Keep the original action reference.</p></div>
      <Link href="/app/timecards" className={styles.secondary}>Review timecards <ArrowRightIcon {...iconProps}/></Link>
    </section>
  </div>;
}
