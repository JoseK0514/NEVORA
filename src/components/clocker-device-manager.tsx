"use client";

import ownerStyles from './clocker-owner.module.css';
import Link from 'next/link';
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type MouseEvent } from 'react';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import type { ClockerDeviceView, ClockerLocationView, ClockerOwnerResult } from '../lib/clocker/views';
import { toast } from './toaster';
import { keepWhole } from '../lib/keep-whole';
import { Notice, SettingsFrame } from '../app/app/settings/wave-c-kit';
import { ButtonLabel, Field, FieldErrors, lockPageScroll, useFieldErrors } from '../app/app/settings/wave-c-form';
import { CorpButton, CorpCard } from './corp/corp';
import { QuietSheet } from './quiet/quiet-sheet';
import './clocker-device-manager.css';

type Operation = 'REGISTER' | 'RENAME' | 'ROTATE' | 'REVOKE';
type Selection = { operation: Operation; device?: ClockerDeviceView };
const statuses = { UNREGISTERED: 'Not set up', PENDING: 'Awaiting setup', EXPIRED: 'Setup expired', ACTIVE: 'Registered', REVOKED: 'Removed' };
const subscribe = () => () => {};

/** Wave C: Clocker devices on the kit. Every operation goes through one sheet (the kit's bottom sheet: a centred title
 * with Done or Cancel); the server's answer decides what the list shows. Setup codes stay on screen only until they expire. */
export function ClockerDeviceManager({ initialDevices, locations, timeZone, action, shortNames = {} }: {
  initialDevices: ClockerDeviceView[]; locations: ClockerLocationView[]; timeZone: string;
  action(form: FormData): Promise<ClockerOwnerResult>;
  /** Each location's short name ("Condado") by id, as every other page names it; the full name when missing. */
  shortNames?: Record<string, string>;
}) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [devices, setDevices] = useState(initialDevices);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; refresh: boolean } | null>(null);
  const [notice, setNotice] = useState('');
  const [setup, setSetup] = useState<{ code: string; expiresAt: string; device: ClockerDeviceView } | null>(null);
  const [copyMessage, setCopyMessage] = useState('');
  const sheetForm = useRef<HTMLFormElement>(null);
  const dismissed = useRef(false);
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
  const { errors, handlers, clear } = useFieldErrors({ name: { missing: 'Enter a tablet name.' }, locationId: { missing: 'Choose a location.' } });
  const place = (id: string | undefined) => { const location = locations.find(item => item.id === id); return location ? shortNames[location.id] ?? location.name : undefined; };
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
    // The sheet (QuietSheet) opens itself; destructive confirms (remove, new code) then start on Cancel and Add tablet on
    // its name. A tablet's options start on the sheet, so no keyboard rises over the iPad's setup steps.
    sheetForm.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true });
    const unlock = lockPageScroll();
    return unlock;
  }, [selection]);
  useEffect(() => {
    if (!setup) return;
    const duration = Math.max(0, new Date(setup.expiresAt).getTime() - Date.now());
    const timeout = window.setTimeout(() => { setSetup(null); setNotice('The setup code expired. Get a new one from the tablet’s row.'); }, duration);
    return () => window.clearTimeout(timeout);
  }, [setup]);
  useEffect(() => { if (setup) setupCard.current?.focus({ preventScroll: false }); }, [setup]);
  useEffect(() => { if (error) errorBox.current?.focus(); }, [error]);

  function open(next: Selection, event: MouseEvent<HTMLButtonElement>) {
    returnFocus.current = event.currentTarget;
    dismissed.current = false; setError(null); clear(); setSelection(next);
  }
  function close() {
    // Escape, a drag or a tap outside can close the sheet while a save is running: its answer then comes as a toast.
    if (busy.current) dismissed.current = true;
    const target = returnFocus.current;
    setSelection(null); setError(null);
    requestAnimationFrame(() => { if (target?.isConnected) target.focus({ preventScroll: true }); });
  }
  /** Done: a changed name saves (the same rename), otherwise the sheet closes. */
  function done() {
    const form = sheetForm.current, input = form?.elements.namedItem('name');
    if (form && selection?.device && input instanceof HTMLInputElement && input.value.trim() !== selection.device.name) form.requestSubmit();
    else close();
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !selection) return;
    if (!event.currentTarget.checkValidity()) return;
    // A tablet's options have one field, so Return in it submits: an unchanged name just closes, like Done.
    const name = event.currentTarget.elements.namedItem('name');
    if (selection.operation === 'RENAME' && selection.device && name instanceof HTMLInputElement && name.value.trim() === selection.device.name) { close(); return; }
    const form = new FormData(event.currentTarget);
    form.set('operation', selection.operation);
    if (selection.device) {
      form.set('deviceId', selection.device.id);
      form.set('expectedVersion', String(selection.device.version));
    }
    busy.current = true; setPending(true); setError(null);
    try {
      const result = await action(form);
      if (!result.ok) { if (dismissed.current) toast(result.error); setError({ message: result.error, refresh: result.refresh }); return; }
      setDevices(current => current.some(device => device.id === result.device.id)
        ? current.map(device => device.id === result.device.id ? result.device : device)
        : [...current, result.device]);
      setCopyMessage(''); setNotice('');
      if (result.setup) setSetup({ ...result.setup, device: result.device });
      else if (setup?.device.id === result.device.id && selection.operation === 'REVOKE') setSetup(null);
      toast(selection.operation === 'RENAME' ? 'Tablet name saved.' : selection.operation === 'REVOKE'
        ? 'Tablet removed. Its time records are kept.' : 'Setup code ready. Finish on the tablet.');
      busy.current = false;
      if (result.setup) { returnFocus.current = null; setSelection(null); setError(null); }
      else if (!dismissed.current) close();
    } catch { if (dismissed.current) toast('It may not have saved. Refresh tablets before you try again.'); setError({ message: 'It may not have saved. Refresh tablets before you try again.', refresh: true }); }
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
  const options = selection?.operation === 'RENAME';
  const title = selection?.operation === 'REGISTER' ? 'Add tablet' : options ? selection.device?.name ?? 'Tablet'
    : selection?.operation === 'REVOKE' ? 'Remove this tablet?' : firstSetup ? 'Get a setup code?' : 'Create a new setup code?';
  const submitLabel = selection?.operation === 'REGISTER' ? 'Get setup code' : options ? 'Save name' : selection?.operation === 'REVOKE' ? 'Remove tablet'
    : firstSetup ? 'Get setup code' : 'Create new code';
  const locationActive = (device?: ClockerDeviceView) => !!locations.find(item => item.id === device?.locationId)?.active;
  const rotate = () => { setError(null); setSelection({ operation: 'ROTATE', device: selection!.device }); };
  // One row per tablet: name, then its state in words when it isn't working yet, the location's short name and last use.
  // No icon and no pill (Owner premium R3): the row says it once.
  const deviceRow = (device: ClockerDeviceView) => {
    const location = locations.find(item => item.id === device.locationId);
    const inactive = location?.active === false && device.state !== 'REVOKED';
    const seen = device.lastSeenAt ? `Used ${date(device.lastSeenAt)}` : device.state === 'ACTIVE' ? 'Not used yet' : null;
    const exception = inactive ? 'Location inactive' : needsSetup(device) ? statuses[device.state] : null;
    return <li key={device.id}>
      <button type="button" className="c-row c-tablets__row" data-clocker-device={device.id} aria-label={`${device.name}, options`} disabled={!hydrated} onClick={event => open({ operation: 'RENAME', device }, event)}>
        <span className="c-row__main"><span className="c-row__title c-row__title--b">{device.name}</span>
          <span className="c-row__detail"><span>{[exception, place(device.locationId) ?? 'Location unavailable', seen].filter(Boolean).join(' · ')}</span></span></span>
        <CaretRightIcon className="c-chev" weight="bold" aria-hidden="true" />
      </button>
    </li>;
  };

  // Release 1 (board O-ClockerDevices, "Clocker tablets"); Owner premium R3/R8 (round 2): the tablets in one card, then
  // "Set up a tablet" as three numbered steps (not rows) with one primary: set up the first waiting tablet, or add one.
  const current = devices.filter(device => device.state !== 'REVOKED');
  const removed = devices.filter(device => device.state === 'REVOKED');
  const firstWaiting = current.find(needsSetup);
  return <SettingsFrame className={`${ownerStyles.owner} c-tablets`} title="Clocker tablets">
    {!activeLocations.length ? <Notice tone="info" title="No active location"
      action={<Link className="q-btn q-btn--quiet" href="/app/settings/locations">Go to Locations</Link>}>Add or reactivate a location before you add a tablet.</Notice> : null}
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
    <div className="c-page c-embed c-tablets__page">
      <p className="c-sr" role="status">{`${registered} registered, ${waiting} waiting for setup, ${revoked} removed`}</p>
      {current.length ? <CorpCard as="div" label={`Tablets (${current.length})`}><ul className="c-rows" aria-label="Your tablets">{current.map(deviceRow)}</ul></CorpCard> : null}
      <section className="c-card c-tablets__steps" aria-labelledby="clocker-steps-title">
        <div className="c-card__head"><h2 className="c-card__label" id="clocker-steps-title">Set up a tablet</h2></div>
        <ol className="c-tablets__list">
          <li><span className="c-tablets__n" aria-hidden="true">1</span><span>On the tablet, open the Clocker page.</span></li>
          <li><span className="c-tablets__n" aria-hidden="true">2</span><span>{firstWaiting ? 'Tap the tablet above and get a code.' : 'Tap Add tablet to get a code.'}</span></li>
          <li><span className="c-tablets__n" aria-hidden="true">3</span><span>Pick the location. Your team clocks in with their PIN.</span></li>
        </ol>
        <div className="c-card__foot c-tablets__foot">
          {firstWaiting ? <CorpButton kind="secondary" size="md" disabled={!hydrated || !activeLocations.length} onClick={event => open({ operation: 'REGISTER' }, event)}>Add tablet</CorpButton> : null}
          {firstWaiting ? <CorpButton size="md" disabled={!hydrated} onClick={event => open({ operation: 'RENAME', device: firstWaiting }, event)}>{`Set up ${firstWaiting.name}`}</CorpButton>
            : <CorpButton size="md" disabled={!hydrated || !activeLocations.length} onClick={event => open({ operation: 'REGISTER' }, event)}>Add tablet</CorpButton>}
        </div>
      </section>
      <p className="c-tablets__note">One tablet per location works best.</p>
      {removed.length ? <CorpCard as="div" label={`Removed (${removed.length})`}><ul className="c-rows" aria-label="Removed tablets">{removed.map(deviceRow)}</ul></CorpCard> : null}
      {/* Inside the kit page so the sheet reads the kit's colour tokens. */}
      <QuietSheet open={!!selection} onClose={close} labelledBy="clocker-dialog-title">
        {selection ? <form ref={sheetForm} noValidate onSubmit={submit} key={`${selection.operation}-${selection.device?.id ?? 'new'}`} aria-busy={pending} aria-describedby="clocker-dialog-text" className="c-sheet c-tablet-sheet" {...handlers}>
          {/* Owner premium R8: the kit's sheet. A tablet's options: its name centred, Done on the right (a changed name saves).
            A confirm (add, new code, remove): Cancel on the left, the question centred, its one action below. */}
          <div className="c-sheet__nav">
            {options ? <span aria-hidden="true" /> : <button type="button" className="c-sheet-head__l" disabled={pending} onClick={close}
              data-autofocus={selection.operation === 'REVOKE' || (selection.operation === 'ROTATE' && !firstSetup) ? '' : undefined}>Cancel</button>}
            <h2 className="c-sheet__title" id="clocker-dialog-title">{title}</h2>
            {options ? <button type="button" className="c-sheet__done" disabled={pending} onClick={done}>{pending ? 'Saving…' : 'Done'}</button> : <span aria-hidden="true" />}
          </div>
          <p className="c-tablet-sheet__text" id="clocker-dialog-text">{selection.device && !options ? <strong>{selection.device.name}. </strong> : null}
            {selection.operation === 'REGISTER' ? 'Name the tablet and choose its location. You can’t move it later.'
              : options ? (firstSetup ? 'Not set up yet. Get a code, then type it on the iPad.'
                : selection.device?.state === 'REVOKED' ? 'This tablet was removed. Reconnect it with a new setup code.' : `At ${place(selection.device?.locationId) ?? 'an unavailable location'}.`)
                : selection.operation === 'ROTATE' ? (firstSetup ? 'Any earlier setup code stops working. Type the new code on the iPad.' : 'The old code and this tablet stop working right away. Its location and time records stay the same.')
                  : 'It stops working right away. Clock-ins and time records stay.'}</p>
          <fieldset disabled={pending || Boolean(error?.refresh)} className="wc-fieldset c-tablet-sheet__fields">
            <FieldErrors errors={errors}>
              {selection.operation === 'REGISTER' || options ? <div className="wc-fields">
                <Field label="Tablet name" id="clocker-device-name" name="name" placeholder="e.g. Condado iPad" defaultValue={selection.device?.name ?? ''} required maxLength={80} autoComplete="off" enterKeyHint="done"
                  help={options ? 'Only you see this name.' : undefined} data-autofocus={selection.operation === 'REGISTER' ? '' : undefined} />
                {selection.operation === 'REGISTER' ? <Field kind="select" label="Location" id="clocker-device-location" name="locationId" required defaultValue="">
                  <option value="" disabled>Choose a location</option>
                  {activeLocations.map(location => <option key={location.id} value={location.id}>{shortNames[location.id] ?? location.name}</option>)}
                </Field> : null}
              </div> : null}
            </FieldErrors>
          </fieldset>
          {error ? <div ref={errorBox} role="alert" tabIndex={-1} className="wc-feedback"><Notice tone="urgent" title={error.message.startsWith('It may not have saved') ? 'Not saved yet' : 'Not saved'}>{error.message}</Notice></div> : null}
          <p role="status" className="c-sr">{pending ? 'Saving…' : ''}</p>
          <div className="c-tablet-sheet__actions">
            {error?.refresh ? <CorpButton full onClick={() => window.location.reload()}>Refresh tablets</CorpButton>
              : options ? (selection.device?.state === 'ACTIVE'
                ? <CorpButton kind="secondary" full disabled={pending || !locationActive(selection.device)} onClick={rotate}>Replace tablet</CorpButton>
                : <CorpButton full disabled={pending || !locationActive(selection.device)} onClick={rotate}>{firstSetup ? 'Get setup code' : 'Reconnect tablet'}</CorpButton>)
                : <CorpButton type="submit" kind={selection.operation === 'REVOKE' ? 'danger' : 'primary'} full disabled={pending}><ButtonLabel pending={pending} idle={submitLabel} busy="Saving…" /></CorpButton>}
            {options && selection.device && selection.device.state !== 'REVOKED' ? <button type="button" className="c-tablet-sheet__remove" disabled={pending}
              onClick={() => { setError(null); setSelection({ operation: 'REVOKE', device: selection.device }); }}>Remove tablet</button> : null}
          </div>
        </form> : null}
      </QuietSheet>
    </div>
  </SettingsFrame>;
}
