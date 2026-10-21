'use client';

import {useEffect, useId, useRef, useState, useSyncExternalStore} from 'react';
import Link from 'next/link';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {DeviceTabletIcon} from '@phosphor-icons/react/dist/ssr/DeviceTablet';
import {MagnifyingGlassIcon} from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import {ReceiptIcon} from '@phosphor-icons/react/dist/ssr/Receipt';
import {SpinnerGapIcon} from '@phosphor-icons/react/dist/ssr/SpinnerGap';
import {WarningCircleIcon} from '@phosphor-icons/react/dist/ssr/WarningCircle';
import {createPrivateSnapshotController} from '../lib/private-snapshot-client';
import type {RecoveryReview} from '../lib/clocker/recovery-review.server';
import {keepWhole} from '../lib/keep-whole';
import {EmptyState, GuideCard, Notice, SettingsFrame} from '../app/app/settings/wave-c-kit';
import {ButtonLabel, FormActions} from '../app/app/settings/wave-c-form';
import {ScopedReadFrame,type ScopedObservation} from './company-access/scoped-read-frame';

const subscribe = () => () => {};
const actionNames: Record<string, string> = {
  CLOCK_IN: 'Clock in', CLOCK_OUT: 'Clock out', START_BREAK: 'Start break', END_BREAK: 'End break',
};

/** Wave C: Clocker recovery on the kit (Owners and Managers). The private snapshot controller,
 * its pause-on-blur and the request are unchanged; checking a receipt never changes recorded time. */
export function ClockerRecoveryReview({actorId, timeZone, from, observation}: {actorId: string; timeZone: string; from?: 'settings'; observation?:ScopedObservation}) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [reference, setReference] = useState('');
  const [hasSelection, setHasSelection] = useState(false);
  const [state, setState] = useState<RecoveryReview | null>(null);
  const [loading, setLoading] = useState(true);
  const feedback = useRef<HTMLDivElement>(null);
  const submitted = useRef(false);
  const selected = useRef('');
  const controller = useRef<ReturnType<typeof createPrivateSnapshotController<RecoveryReview>> | null>(null);
  const inputId = useId();
  const helpId = useId();
  const [invalid, setInvalid] = useState('');
  const pending = loading && hasSelection;
  const ready = state?.state === 'ready' ? state : null;
  const denied = state?.state === 'unavailable' && state.reason === 'access_denied';
  const unavailable = state?.state === 'unavailable' && state.reason !== 'no_selection';
  const back = from === 'settings' ? {href: '/app/settings', label: 'Settings'} : {href: '/app', label: 'Home'};

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
    setInvalid('');
    selected.current = '';
    submitted.current = false;
    controller.current?.pause();
    if (document.visibilityState === 'visible' && navigator.onLine) controller.current?.start();
  }

  function formattedTime(value: string) {
    if (!Number.isFinite(Date.parse(value))) return 'Time unavailable';
    return keepWhole(new Intl.DateTimeFormat('en-US', {timeZone, month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short'}).format(new Date(value)));
  }

  const errorId = `${inputId}-error`;
  const content = <SettingsFrame back={back} settingsCrumb={false} title="Clocker recovery" summary="Check a saved Clocker action and help the employee finish recovery."
    aside={<GuideCard title="A clear path to recovery">
      <ol className="wc-steps">
        <li><strong>Find the saved reference</strong>It’s on the recovery screen of the registered tablet.</li>
        <li><strong>Review the receipt together</strong>Check the employee, action, time, tablet and location.</li>
        <li><strong>Return to the same tablet</strong>The employee enters their PIN and checks the action to finish recovery.</li>
      </ol>
      <p>Checking a receipt doesn’t change recorded time or retry a clock action.</p>
      <details className="wc-disclosure"><summary>Can others still use the tablet?<CaretDownIcon className="wc-caret" size={16} weight="bold" aria-hidden="true"/></summary>
        <div className="wc-disclosure__body"><p>Yes. Other employees can use their own PIN and record their work. If this tablet can’t store recovery data, use another registered tablet at the same location and keep the original record for review.</p></div></details>
    </GuideCard>}>
    <form noValidate className="wc-form" aria-label="Check a saved action" data-guard={hydrated ? undefined : ''}
      onInvalidCapture={event => { event.preventDefault(); setInvalid((event.target as HTMLInputElement).validity.valueMissing ? 'Enter the saved reference.' : 'Use the full reference: 32 letters and numbers in five groups, with dashes.'); (event.target as HTMLInputElement).focus(); }}
      onSubmit={event => {
        event.preventDefault();
        if (!hydrated || pending) return;
        if (event.currentTarget?.checkValidity && !event.currentTarget.checkValidity()) return;
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
      <section className="nv-card" aria-labelledby="recovery-lookup-heading">
        <div className="nv-card__head"><h2 className="nv-card__title" id="recovery-lookup-heading">Check a saved action</h2></div>
        <fieldset disabled={!hydrated || pending} className="nv-card__body wc-fields wc-plain-fieldset">
          <div className="wc-field" data-invalid={invalid ? 'true' : undefined}>
            <label className="wc-label" htmlFor={inputId}>Saved action reference</label>
            <input id={inputId} className="wc-control wc-code-input" required value={reference} onChange={event => changeReference(event.target.value)}
              pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
              maxLength={36} autoComplete="off" autoCapitalize="none" spellCheck={false} aria-describedby={invalid ? `${errorId} ${helpId}` : helpId} aria-invalid={invalid ? true : undefined}
              placeholder="Paste the saved reference"/>
            {invalid ? <p className="wc-error" id={errorId}><WarningCircleIcon size={18} weight="fill" aria-hidden="true"/>{invalid}</p> : null}
            <p id={helpId} className="wc-help">Shown on the employee’s tablet, like 12345678-1234-1234-1234-123456789abc. Include every character and dash.</p>
          </div>
        </fieldset>
        <div className="nv-card__body">
          <FormActions>
            <button className="nv-btn" data-kind="primary" type="submit" disabled={!hydrated || pending}>
              <ButtonLabel pending={pending} idle={<><MagnifyingGlassIcon size={20} className="wc-icon-before" aria-hidden="true"/>Check receipt</>} busy={<><SpinnerGapIcon size={20} className="wc-spin wc-icon-before" aria-hidden="true"/>Checking…</>}/>
            </button>
          </FormActions>
        </div>
        <noscript><div className="nv-card__body"><Notice tone="info">Enable JavaScript to check a receipt. You can still review timecards below.</Notice></div></noscript>
      </section>
    </form>

    <section className="nv-card wc-result" aria-labelledby="recovery-result-heading" aria-busy={pending}>
      <div className="nv-card__head"><h2 className="nv-card__title" id="recovery-result-heading">Receipt</h2></div>
      {pending ? <div role="status"><EmptyState headingLevel={3} icon={<SpinnerGapIcon size={22} weight="bold" className="wc-spin"/>} title="Checking the saved receipt">Looking for a recorded action with this reference.</EmptyState></div>
        : ready ? <div ref={feedback} tabIndex={-1} className="wc-feedback nv-card__body wc-fields">
          <div role="status"><Notice tone={ready.receipts.length ? 'done' : 'info'} title={ready.receipts.length ? 'Recorded action found' : 'Action still unconfirmed'}>
            {ready.receipts.length ? 'Review it with the employee before they finish on the tablet.' : 'No recorded action was found yet. The request may still be in progress.'}</Notice></div>
          <dl className="wc-facts"><div><dt>Reference checked</dt><dd className="wc-path">{ready.commandId}</dd></div></dl>
          {ready.receipts.length ? <>
            <ul className="wc-receipts">{ready.receipts.map((receipt, index) => <li key={[receipt.employeeId, receipt.performedAt, index].join('-')} className="wc-receipt-item">
              <div className="wc-receipt-item__who"><span className="nv-avatar" aria-hidden="true">{receipt.employeeName.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('')}</span>
                <div><h3 className="wc-receipt-item__name">{receipt.employeeName}</h3><p className="wc-muted">{actionNames[receipt.action] ?? 'Recorded action'}</p></div></div>
              <dl className="wc-facts"><div><dt>Recorded at</dt><dd><time dateTime={receipt.performedAt}>{formattedTime(receipt.performedAt)}</time></dd></div><div><dt>Tablet</dt><dd>{receipt.deviceName}</dd></div><div><dt>Location</dt><dd>{receipt.locationName}</dd></div></dl>
            </li>)}</ul>
            <div className="wc-fact"><span className="wc-fact__icon" aria-hidden="true"><DeviceTabletIcon size={20}/></span><div><span className="wc-fact__value">Finish on the same tablet</span><span className="wc-fact__note">Ask the employee to enter their PIN on the original tablet and check their action status. The tablet verifies the receipt before clearing the resolved action.</span></div></div>
          </> : <div className="wc-fact"><span className="wc-fact__icon" aria-hidden="true"><DeviceTabletIcon size={20}/></span><div><span className="wc-fact__value">Keep the original recovery record</span><span className="wc-fact__note">Ask the employee to enter their PIN and check the action on the same registered tablet. Not finding a receipt doesn’t cancel the request.</span></div></div>}
        </div>
        : unavailable ? <div ref={feedback} tabIndex={-1} className="wc-feedback nv-card__body" role="alert">
          <Notice tone="urgent" title={denied ? 'Your session ended' : 'Couldn’t check the receipt.'}
            action={denied ? <Link className="nv-link" href="/login">Sign in</Link> : undefined}>
            {denied ? 'Sign in again before checking this action.' : 'Keep the saved action and its original reference. Check again when your connection is back.'}</Notice>
        </div>
        : <EmptyState headingLevel={3} icon={<ReceiptIcon size={22} weight="bold"/>} title="Your receipt will appear here">Enter a saved reference to see whether the action was recorded.</EmptyState>}
    </section>

    <section className="nv-card" aria-labelledby="recovery-corrections-heading">
      <div className="nv-card__head"><h2 className="nv-card__title" id="recovery-corrections-heading">Time wrong or not recorded?</h2></div>
      <div className="nv-card__body"><p className="wc-muted">Review the employee’s evidence, then correct the time in Timecards. Keep the original action reference.</p></div>
      <div className="wc-card-actions"><Link href="/app/timecards" className="nv-link">Review timecards<CaretRightIcon size={16} weight="bold" aria-hidden="true"/></Link></div>
    </section>
  </SettingsFrame>;
  return observation ? <ScopedReadFrame observation={observation}>{content}</ScopedReadFrame> : content;
}
