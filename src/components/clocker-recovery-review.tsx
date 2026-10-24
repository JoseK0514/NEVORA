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
import {Notice, SettingsFrame} from '../app/app/settings/wave-c-kit';
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
  const back = from === 'settings' ? {href: '/app/settings', label: 'Settings'} : {href: '/app/employees', label: 'Team'};

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
  // Quiet (v4, approved Oct 23): the reference, Check, the receipt when there is one, and one row to Timecards.
  const content = <SettingsFrame back={back} settingsCrumb={false} title="Clocker recovery" summary="Look up a saved clock-in receipt.">
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
      <h2 className="q-sr" id="recovery-lookup-heading">Check a saved action</h2>
      <fieldset disabled={!hydrated || pending} className="q-fieldset">
        <div className="q-fl" data-invalid={invalid ? 'true' : undefined}>
          <label className="q-fl__label" htmlFor={inputId}>Saved reference</label>
          <input id={inputId} className="q-in" style={{ marginTop: 8 }} required value={reference} onChange={event => changeReference(event.target.value)}
            pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
            maxLength={36} autoComplete="off" autoCapitalize="none" spellCheck={false} aria-describedby={invalid ? `${errorId} ${helpId}` : helpId} aria-invalid={invalid ? true : undefined}
            placeholder="e.g. 12345678-1234…"/>
          {invalid ? <p className="q-fl__error" id={errorId}>{invalid}</p> : null}
          <p id={helpId} className="q-sr">Shown on the employee’s tablet, like 12345678-1234-1234-1234-123456789abc.</p>
        </div>
      </fieldset>
      <button className="q-btn" type="submit" disabled={!hydrated || pending}><ButtonLabel pending={pending} idle="Check" busy="Checking…"/></button>
      <noscript><Notice tone="info">Enable JavaScript to check a receipt.</Notice></noscript>
    </form>

    <section aria-labelledby="recovery-result-heading" aria-busy={pending}>
      <h2 className="q-sr" id="recovery-result-heading">Receipt</h2>
      {pending ? <p className="q-empty" role="status" style={{ marginTop: 24 }}>Checking the saved receipt…</p>
        : ready ? <div ref={feedback} tabIndex={-1} className="wc-feedback">
          <div role="status" className="q-lead" style={{ marginTop: 32 }}><b>{ready.receipts.length ? 'Recorded action found' : 'Not recorded yet'}</b>
            <i>{ready.receipts.length ? 'Check it with the employee, then they finish on the same tablet.' : 'It may still be in progress. They check again on the same tablet.'}</i></div>
          {ready.receipts.length ? <ul className="q-list" style={{ marginTop: 12 }}>{ready.receipts.map((receipt, index) => <li key={[receipt.employeeId, receipt.performedAt, index].join('-')}>
            <div className="q-row q-row--av"><span className="q-av" aria-hidden="true">{receipt.employeeName.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('')}</span>
              <span className="q-rt"><b>{`${receipt.employeeName} · ${actionNames[receipt.action] ?? 'Recorded action'}`}</b><i><time dateTime={receipt.performedAt}>{formattedTime(receipt.performedAt)}</time>{` · ${receipt.deviceName}, ${receipt.locationName}`}</i></span></div>
          </li>)}</ul> : null}
          <p className="q-sr">Reference checked: {ready.commandId}</p>
        </div>
        : unavailable ? <div ref={feedback} tabIndex={-1} className="wc-feedback" role="alert">
          <Notice tone="urgent" title={denied ? 'Your session ended' : 'Couldn’t check the receipt.'}
            action={denied ? <Link className="q-btn q-btn--quiet" href="/login">Sign in</Link> : undefined}>
            {denied ? 'Sign in again before checking this action.' : 'Keep the saved reference and check again when you’re back online.'}</Notice>
        </div> : null}
    </section>

    <ul className="q-list" style={{ marginTop: 40 }}>
      <li><Link href="/app/timecards" className="q-row"><span className="q-rt"><b>Time wrong or missing?</b><i>Fix it in Timecards</i></span><CaretRightIcon className="q-chev" aria-hidden="true"/></Link></li>
    </ul>
  </SettingsFrame>;
  return observation ? <ScopedReadFrame observation={observation}>{content}</ScopedReadFrame> : content;
}
