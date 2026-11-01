"use client";

import ownerStyles from './clocker-owner.module.css';
import Link from 'next/link';
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type MouseEvent } from 'react';
import { ArrowClockwise } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { ArrowSquareOut } from '@phosphor-icons/react/dist/ssr/ArrowSquareOut';
import { CaretRight } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { Copy } from '@phosphor-icons/react/dist/ssr/Copy';
import { DeviceTablet } from '@phosphor-icons/react/dist/ssr/DeviceTablet';
import { MagnifyingGlass } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { Plus } from '@phosphor-icons/react/dist/ssr/Plus';
import { X } from '@phosphor-icons/react/dist/ssr/X';
import type { ClockerDeviceView, ClockerLocationView, ClockerOwnerResult } from '../lib/clocker/views';
import { Status, type KitTone } from './kit/kit';
import { toast } from './toaster';
import { keepWhole } from '../lib/keep-whole';
import { EmptyState, GuideCard, Notice, SettingsFrame } from '../app/app/settings/wave-c-kit';
import { ButtonLabel, Field, FieldErrors, FormActions, lockPageScroll, useFieldErrors } from '../app/app/settings/wave-c-form';

type Operation = 'REGISTER' | 'RENAME' | 'ROTATE' | 'REVOKE';
type Selection = { operation: Operation; device?: ClockerDeviceView };
const statuses = { UNREGISTERED: 'Needs setup', PENDING: 'Awaiting setup', EXPIRED: 'Setup expired', ACTIVE: 'Registered', REVOKED: 'Revoked' };
const subscribe = () => () => {};

/** Wave C: Clocker devices on the kit. Every operation goes through one dialog (a bottom sheet on
 * phones); the server's answer decides what the list shows. Setup codes stay on screen only until they expire. */
export function ClockerDeviceManager({ initialDevices, locations, timeZone, action }: {
  initialDevices: ClockerDeviceView[]; locations: ClockerLocationView[]; timeZone: string;
  action(form: FormData): Promise<ClockerOwnerResult>;
}) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [devices, setDevices] = useState(initialDevices);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; refresh: boolean } | null>(null);
  const [notice, setNotice] = useState('');
  const [setup, setSetup] = useState<{ code: string; expiresAt: string; device: ClockerDeviceView } | null>(null);
  const [copyMessage, setCopyMessage] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const codeField = useRef<HTMLTextAreaElement>(null);
  const setupCard = useRef<HTMLElement>(null);
  const errorBox = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const activeLocations = locations.filter(location => location.active);
  const needsSetup = (device: ClockerDeviceView) => ['UNREGISTERED', 'PENDING', 'EXPIRED'].includes(device.state);
  const registered = devices.filter(device => device.state === 'ACTIVE').length;
  const waiting = devices.filter(needsSetup).length;
  const revoked = devices.filter(device => device.state === 'REVOKED').length;
  const { errors, handlers, clear } = useFieldErrors({ name: { missing: 'Enter a device name.' }, locationId: { missing: 'Choose a location.' } });
  const date = (value: string) => {
    // ICU versions disagree on joining literals (", " versus " at ").
    // Use semantic parts and fixed separators so Node and WebKit hydrate identically.
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
    }).formatToParts(new Date(value));
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? '';
    return keepWhole(`${part('month')} ${part('day')}, ${part('hour')}:${part('minute')} ${part('dayPeriod')}`);
  };

  useEffect(() => {
    if (!selection) return;
    const element = dialog.current;
    element?.showModal();
    // Destructive confirms (revoke, new code) start on Cancel.
    (element?.querySelector<HTMLElement>('[data-autofocus]') ?? element?.querySelector<HTMLElement>('input[name="name"], button[type="submit"]'))?.focus({ preventScroll: true });
    const unlock = lockPageScroll();
    return () => { unlock(); if (element?.open) element.close(); };
  }, [selection]);
  useEffect(() => {
    if (!setup) return;
    const duration = Math.max(0, new Date(setup.expiresAt).getTime() - Date.now());
    const timeout = window.setTimeout(() => { setSetup(null); setNotice('The setup code expired. Create a new one from the device’s row.'); }, duration);
    return () => window.clearTimeout(timeout);
  }, [setup]);
  useEffect(() => { if (setup) setupCard.current?.focus({ preventScroll: false }); }, [setup]);
  useEffect(() => { if (error) errorBox.current?.focus(); }, [error]);

  function open(next: Selection, event: MouseEvent<HTMLButtonElement>) {
    returnFocus.current = event.currentTarget;
    setError(null); clear(); setSelection(next);
  }
  function close() {
    if (busy.current) return;
    const target = returnFocus.current;
    dialog.current?.close(); setSelection(null); setError(null);
    requestAnimationFrame(() => { if (target?.isConnected) target.focus({ preventScroll: true }); });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !selection) return;
    if (!event.currentTarget.checkValidity()) return;
    const form = new FormData(event.currentTarget);
    form.set('operation', selection.operation);
    if (selection.device) {
      form.set('deviceId', selection.device.id);
      form.set('expectedVersion', String(selection.device.version));
    }
    busy.current = true; setPending(true); setError(null);
    try {
      const result = await action(form);
      if (!result.ok) { setError({ message: result.error, refresh: result.refresh }); return; }
      setDevices(current => current.some(device => device.id === result.device.id)
        ? current.map(device => device.id === result.device.id ? result.device : device)
        : [...current, result.device]);
      setCopyMessage(''); setNotice('');
      if (result.setup) setSetup({ ...result.setup, device: result.device });
      else if (setup?.device.id === result.device.id && selection.operation === 'REVOKE') setSetup(null);
      toast(selection.operation === 'RENAME' ? 'Device name updated.' : selection.operation === 'REVOKE'
        ? 'Access revoked. Existing time records are kept.' : 'Setup code created. Finish on the shared tablet.');
      busy.current = false;
      if (result.setup) { returnFocus.current = null; dialog.current?.close(); setSelection(null); setError(null); }
      else close();
    } catch { setError({ message: 'It may not have saved. Refresh devices before you try again.', refresh: true }); }
    finally { busy.current = false; setPending(false); }
  }
  async function copyCode() {
    if (!setup) return;
    try { await navigator.clipboard.writeText(setup.code); setCopyMessage('Setup code copied.'); }
    catch { codeField.current?.focus(); codeField.current?.select(); setCopyMessage('Select and copy the setup code.'); }
  }
  const locationForSetup = locations.find(location => location.id === setup?.device.locationId);
  // A tablet that was never connected (C1): its sheet is titled with its name and leads with "Get setup code"; getting
  // its code replaces nothing that works, so that confirm starts on its action instead of Cancel.
  const firstSetup = !!selection?.device && needsSetup(selection.device);
  const title = selection?.operation === 'REGISTER' ? 'Add a tablet' : selection?.operation === 'RENAME' ? selection.device?.name ?? 'Tablet'
    : selection?.operation === 'REVOKE' ? 'Revoke this device’s access?' : firstSetup ? 'Get a setup code?' : 'Create a new setup code?';
  const submitLabel = selection?.operation === 'REGISTER' ? 'Get setup code' : selection?.operation === 'RENAME' ? 'Save name' : selection?.operation === 'REVOKE' ? 'Revoke access'
    : firstSetup ? 'Get setup code' : 'Create new code';
  // One row per tablet: name, then location, any exception in words, and last use. Active is the normal state, so it has
  // no pill; the one amber pill is the card's "2 need setup" (Owner premium: say it once).
  const deviceRow = (device: ClockerDeviceView) => {
    const location = locations.find(item => item.id === device.locationId);
    const inactive = location?.active === false && device.state !== 'REVOKED';
    const seen = device.lastSeenAt ? `Used ${date(device.lastSeenAt)}` : device.state === 'ACTIVE' ? 'Not used yet' : null;
    const exception = inactive ? 'Location inactive' : needsSetup(device) ? statuses[device.state] : null;
    return <li key={device.id}>
      <button type="button" className="q-row" data-clocker-device={device.id} aria-label={`${device.name}, options`} disabled={!hydrated} onClick={event => open({ operation: 'RENAME', device }, event)}>
        <DeviceTablet className="q-row__ic" aria-hidden="true" />
        <span className="q-rt"><b>{device.name}</b><i>{[exception, location?.name ?? 'Location unavailable', seen].filter(Boolean).join(' · ')}</i></span>
        <CaretRight className="q-chev" aria-hidden="true" />
      </button>
    </li>;
  };

  // Release 1 (board O-ClockerDevices, "Clocker tablets"): the tablets in one card (name, location and last use, a status
  // pill), then "Add a tablet in 3 steps" with Set up a new tablet. No "+" in the bar and no tab rows. A row opens its sheet.
  const current = devices.filter(device => device.state !== 'REVOKED');
  const removed = devices.filter(device => device.state === 'REVOKED');
  return <SettingsFrame className={ownerStyles.owner} title="Clocker tablets">
    {!activeLocations.length ? <Notice tone="info" title="No active location"
      action={<Link className="q-btn q-btn--quiet" href="/app/settings/locations">Go to Locations</Link>}>Add or reactivate a location before registering a tablet.</Notice> : null}
    {notice ? <div role="status"><Notice tone="info">{notice}</Notice></div> : null}
    {setup && locationForSetup ? <section aria-labelledby="clocker-code-title" ref={setupCard} tabIndex={-1}>
      <div className="q-grp"><h2 id="clocker-code-title">Connect {setup.device.name}</h2></div>
      <div className="q-fl" style={{ marginTop: 8 }}>
        <label className="q-fl__label" htmlFor="clocker-setup-code">Setup code · expires {date(setup.expiresAt)}</label>
        <textarea id="clocker-setup-code" ref={codeField} className="q-in" style={{ height: 76, marginTop: 8 }} value={setup.code} readOnly rows={2} spellCheck={false} autoComplete="off" aria-describedby="clocker-setup-hint" />
        <p className="q-fl__help" id="clocker-setup-hint">Open this location’s Clocker on the tablet and paste the code.</p>
      </div>
      <button className="q-btn" type="button" onClick={copyCode}>Copy setup code</button>
      <Link className="q-btn q-btn--sec" style={{ marginTop: 12 }} href={`/clocker/${locationForSetup.clockerKey}`} target="_blank" rel="noopener noreferrer">Open {locationForSetup.name} Clocker</Link>
      <button className="q-btn q-btn--quiet" type="button" onClick={() => setSetup(null)}>Hide code</button>
      <p role="status" className="q-sr">{copyMessage}</p>
    </section> : null}
    <p className="q-sr" role="status">{`${registered} registered, ${waiting} waiting for setup, ${revoked} removed`}</p>
    {current.length ? <ul className="q-list" aria-label="Your devices">
      <li className="wc-cardhead" aria-hidden="true"><span>{`Tablets (${current.length})`}</span>{waiting ? <span className="wc-pill wc-pill--amber">{`${waiting} need${waiting === 1 ? 's' : ''} setup`}</span> : null}</li>
      {current.map(deviceRow)}
    </ul> : null}
    {/* Corporate (Release 1, board O-ClockerDevices): the three setup steps as plain rows and the one way to start. While a
      tablet still waits for setup, its own row is the way in and adding another is the secondary action (C1). */}
    <section className="clocker-steps" aria-labelledby="clocker-steps-title">
      <ol className="q-list clocker-steps__list">
        <li className="wc-cardhead"><h2 id="clocker-steps-title">{waiting ? 'Set up a tablet in 3 steps' : 'Add a tablet in 3 steps'}</h2></li>
        <li><div className="q-row q-row--one"><span className="q-rt"><b>1. On the tablet, open the Clocker page.</b></span></div></li>
        <li><div className="q-row q-row--one"><span className="q-rt"><b>{waiting ? '2. Tap the tablet above, then Get setup code.' : '2. Tap below to get a setup code.'}</b></span></div></li>
        <li><div className="q-row q-row--one"><span className="q-rt"><b>3. Pick the location. People use their PIN.</b></span></div></li>
        <li className="wc-cardfoot"><button className={waiting ? 'q-btn q-btn--sec' : 'q-btn'} type="button" disabled={!hydrated || !activeLocations.length} onClick={event => open({ operation: 'REGISTER' }, event)}>{waiting ? 'Add another tablet' : 'Set up a new tablet'}</button></li>
      </ol>
      <p className="wc-foot">One tablet per location works best.</p>
    </section>
    {removed.length ? <ul className="q-list" aria-label="Removed devices">
      <li className="wc-cardhead" aria-hidden="true"><span>{`Removed (${removed.length})`}</span></li>
      {removed.map(deviceRow)}
    </ul> : null}
    <dialog ref={dialog} className="wc-dialog" aria-labelledby="clocker-dialog-title" aria-describedby="clocker-dialog-text" onCancel={event => { event.preventDefault(); close(); }}>
      {selection ? <form noValidate onSubmit={submit} key={`${selection.operation}-${selection.device?.id ?? 'new'}`} aria-busy={pending} className="wc-dialog__form" {...handlers}>
        <div className="wc-dialog__head">
          <div>
            <h2 className="wc-dialog__title" id="clocker-dialog-title">{title}</h2>
            <p className="wc-dialog__text" id="clocker-dialog-text">{selection.device && selection.operation !== 'RENAME' ? <strong className="wc-strong">{selection.device.name}. </strong> : null}
              {selection.operation === 'REGISTER' ? 'Name the tablet and choose its permanent location.'
                : selection.operation === 'RENAME' ? (firstSetup ? 'Not connected yet. Get a setup code, then enter it on the tablet. The name shows in this list only.'
                  : selection.device?.state === 'REVOKED' ? 'Its access was revoked. Reconnect it with a new setup code.' : 'The name shows in this list only.')
                  : selection.operation === 'ROTATE' ? (firstSetup ? 'Any earlier setup code stops working. Enter the new code on the tablet.' : 'Any old setup code and tablet access stop right away. The location and time records stay the same.')
                    : 'This tablet loses access right away. Existing punches and time records aren’t deleted.'}</p>
          </div>
          <button type="button" className="wc-dialog__close" aria-label="Close" disabled={pending} onClick={close}><X size={22} aria-hidden="true" /></button>
        </div>
        <fieldset disabled={pending || Boolean(error?.refresh)} className="wc-fieldset">
          <FieldErrors errors={errors}>
            {selection.operation === 'REGISTER' || selection.operation === 'RENAME' ? <div className="wc-fields">
              <Field label="Device name" id="clocker-device-name" name="name" placeholder="e.g. Front desk tablet" defaultValue={selection.device?.name ?? ''} required maxLength={80} autoComplete="off" />
              {selection.operation === 'REGISTER' ? <Field kind="select" label="Location" id="clocker-device-location" name="locationId" required defaultValue="">
                <option value="" disabled>Choose a location</option>
                {activeLocations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
              </Field> : null}
            </div> : null}
          </FieldErrors>
        </fieldset>
        {error ? <div ref={errorBox} role="alert" tabIndex={-1} className="wc-feedback"><Notice tone="urgent" title={error.message.startsWith('It may not have saved') ? 'Not saved yet' : 'Not saved'}>{error.message}</Notice></div> : null}
        <p role="status" className="nv-sr">{pending ? 'Saving…' : ''}</p>
        <FormActions>
          {/* A tablet waiting for setup leads with Get setup code; Save name steps back to a secondary button. */}
          {selection.operation === 'RENAME' && firstSetup && !error?.refresh ? <button className="q-btn" type="button" disabled={pending || !locations.find(item => item.id === selection.device!.locationId)?.active}
            onClick={() => { setError(null); setSelection({ operation: 'ROTATE', device: selection.device }); }}>Get setup code</button> : null}
          {error?.refresh ? <button className="q-btn" type="button" onClick={() => window.location.reload()}>Refresh devices</button>
            : <button className={selection.operation === 'REVOKE' ? 'q-btn q-btn--danger' : selection.operation === 'RENAME' && firstSetup ? 'q-btn q-btn--sec' : 'q-btn'} type="submit" disabled={pending}><ButtonLabel pending={pending} idle={submitLabel} busy="Saving…" /></button>}
          {selection.operation === 'RENAME' && selection.device && !firstSetup ? <>
            <button className="q-btn q-btn--sec" type="button" disabled={pending || !locations.find(item => item.id === selection.device!.locationId)?.active}
              onClick={() => { setError(null); setSelection({ operation: 'ROTATE', device: selection.device }); }}>{selection.device.state === 'ACTIVE' ? 'Replace tablet' : 'Reconnect tablet'}</button>
            {selection.device.state !== 'REVOKED' ? <button className="q-btn q-btn--danger" type="button" disabled={pending}
              onClick={() => { setError(null); setSelection({ operation: 'REVOKE', device: selection.device }); }}>Revoke access</button> : null}
          </> : null}
          {selection.operation === 'RENAME' && firstSetup ? <button className="q-btn q-btn--danger" type="button" disabled={pending}
            onClick={() => { setError(null); setSelection({ operation: 'REVOKE', device: selection.device }); }}>Revoke access</button> : null}
          <button className="q-btn q-btn--sec" type="button" disabled={pending} onClick={close} data-autofocus={selection.operation === 'REVOKE' || (selection.operation === 'ROTATE' && !firstSetup) ? '' : undefined}>Cancel</button>
        </FormActions>
      </form> : null}
    </dialog>
  </SettingsFrame>;
}
