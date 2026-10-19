"use client";

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react';
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
import { EmptyState, GuideCard, Notice, SettingsFrame } from '../app/app/settings/wave-c-kit';
import { ButtonLabel, Field, FieldErrors, FormActions, lockPageScroll, useFieldErrors } from '../app/app/settings/wave-c-form';

type Operation = 'REGISTER' | 'RENAME' | 'ROTATE' | 'REVOKE';
type Selection = { operation: Operation; device?: ClockerDeviceView };
const statuses = { UNREGISTERED: 'Needs setup', PENDING: 'Awaiting setup', EXPIRED: 'Setup expired', ACTIVE: 'Registered', REVOKED: 'Revoked' };

/** Wave C: Clocker devices on the kit. Every operation goes through one dialog (a bottom sheet on
 * phones); the server's answer decides what the list shows. Setup codes stay on screen only until they expire. */
export function ClockerDeviceManager({ initialDevices, locations, timeZone, action }: {
  initialDevices: ClockerDeviceView[]; locations: ClockerLocationView[]; timeZone: string;
  action(form: FormData): Promise<ClockerOwnerResult>;
}) {
  const [devices, setDevices] = useState(initialDevices);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; refresh: boolean } | null>(null);
  const [notice, setNotice] = useState('');
  const [setup, setSetup] = useState<{ code: string; expiresAt: string; device: ClockerDeviceView } | null>(null);
  const [copyMessage, setCopyMessage] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'SETUP' | 'REVOKED'>('ALL');
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const codeField = useRef<HTMLTextAreaElement>(null);
  const searchField = useRef<HTMLInputElement>(null);
  const setupCard = useRef<HTMLElement>(null);
  const errorBox = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const activeLocations = locations.filter(location => location.active);
  const needsSetup = (device: ClockerDeviceView) => ['UNREGISTERED', 'PENDING', 'EXPIRED'].includes(device.state);
  const registered = devices.filter(device => device.state === 'ACTIVE').length;
  const waiting = devices.filter(needsSetup).length;
  const revoked = devices.filter(device => device.state === 'REVOKED').length;
  const visibleDevices = devices.filter(device => {
    const location = locations.find(item => item.id === device.locationId);
    const matches = `${device.name} ${location?.name ?? ''}`.toLowerCase().includes(query.trim().toLowerCase());
    return matches && (filter === 'ALL' || (filter === 'SETUP' ? needsSetup(device) : device.state === 'REVOKED'));
  });
  const { errors, handlers, clear } = useFieldErrors({ name: { missing: 'Enter a device name.' }, locationId: { missing: 'Choose a location.' } });
  const date = (value: string) => {
    // ICU versions disagree on joining literals (", " versus " at ").
    // Use semantic parts and fixed separators so Node and WebKit hydrate identically.
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
    }).formatToParts(new Date(value));
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? '';
    return `${part('month')} ${part('day')}, ${part('hour')}:${part('minute')} ${part('dayPeriod')}`;
  };

  useEffect(() => {
    if (!selection) return;
    const element = dialog.current;
    element?.showModal();
    // Destructive confirms (revoke, new code) start on Cancel.
    element?.querySelector<HTMLElement>('input[name="name"], [data-autofocus], button[type="submit"]')?.focus({ preventScroll: true });
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
      setFilter('ALL'); setQuery('');
    } catch { setError({ message: 'We couldn’t confirm the update. Refresh devices before trying again.', refresh: true }); }
    finally { busy.current = false; setPending(false); }
  }
  async function copyCode() {
    if (!setup) return;
    try { await navigator.clipboard.writeText(setup.code); setCopyMessage('Setup code copied.'); }
    catch { codeField.current?.focus(); codeField.current?.select(); setCopyMessage('Select and copy the setup code.'); }
  }
  const locationForSetup = locations.find(location => location.id === setup?.device.locationId);
  const title = selection?.operation === 'REGISTER' ? 'Add device' : selection?.operation === 'RENAME' ? 'Rename device'
    : selection?.operation === 'REVOKE' ? 'Revoke this device’s access?' : 'Create a new setup code?';
  const submitLabel = selection?.operation === 'REGISTER' ? 'Create setup code' : selection?.operation === 'RENAME' ? 'Save name' : selection?.operation === 'REVOKE' ? 'Revoke device' : 'Create new code';

  return <SettingsFrame title="Clocker devices" eyebrow={`${devices.length} ${devices.length === 1 ? 'device' : 'devices'}`}
    summary="A shared tablet at each location, with access you control."
    bandAside={<button className="nv-band-control" type="button" disabled={!activeLocations.length} onClick={event => open({ operation: 'REGISTER' }, event)}><Plus size={18} weight="bold" aria-hidden="true" />Add device</button>}
    aside={<>
      <GuideCard title="Connect a shared tablet" action={<Link className="nv-link" href="/app/settings/locations">Manage locations<CaretRight size={16} weight="bold" aria-hidden="true" /></Link>}>
        <ol className="wc-steps">
          <li><strong>Add your device</strong>Name the tablet and choose its location.</li>
          <li><strong>Open the location’s Clocker</strong>Use the Clocker link on the shared tablet.</li>
          <li><strong>Enter the setup code</strong>Stay signed in here, then refresh devices once it connects.</li>
        </ol>
        <p>Replacing a tablet or revoking access keeps existing punches and time records.</p>
      </GuideCard>
    </>}>
    {!activeLocations.length ? <Notice tone="info" title="No active location"
      action={<Link className="nv-link" href="/app/settings/locations">Go to Locations</Link>}>Add or reactivate a location before registering a tablet.</Notice> : null}
    <section className="nv-card" aria-labelledby="clocker-overview-title">
      <div className="nv-card__head"><h2 className="nv-card__title" id="clocker-overview-title">Overview</h2></div>
      <dl className="nv-stats wc-stats" style={{ ['--nv-stat-cols' as string]: 3 }} aria-label="Device overview">
        <div className="nv-stat"><dt className="nv-stat__label">Registered</dt><dd className="nv-stat__value">{registered}</dd></div>
        <div className="nv-stat"><dt className="nv-stat__label">Needs setup</dt><dd className="nv-stat__value">{waiting}</dd></div>
        <div className="nv-stat"><dt className="nv-stat__label">Revoked</dt><dd className="nv-stat__value">{revoked}</dd></div>
      </dl>
    </section>
    {notice ? <div role="status"><Notice tone="info">{notice}</Notice></div> : null}
    {setup && locationForSetup ? <section className="nv-card wc-setup" aria-labelledby="clocker-code-title" ref={setupCard} tabIndex={-1}>
      <div className="nv-card__head">
        <h2 className="nv-card__title" id="clocker-code-title">Connect {setup.device.name}</h2>
        <span className="nv-card__meta">Expires {date(setup.expiresAt)}</span>
      </div>
      <div className="nv-card__body wc-fields">
        <p className="wc-muted">Open this location’s Clocker on the tablet, then paste this one-time setup code.</p>
        <div className="wc-field">
          <label className="wc-label" htmlFor="clocker-setup-code">Setup code</label>
          <textarea id="clocker-setup-code" ref={codeField} className="wc-control wc-code" value={setup.code} readOnly rows={2} spellCheck={false} autoComplete="off" aria-describedby="clocker-setup-hint" />
          <p className="wc-help" id="clocker-setup-hint">Stay signed in here until the tablet connects. Then refresh devices to see its status.</p>
        </div>
        <div className="wc-actions">
          <button className="nv-btn" data-kind="primary" type="button" onClick={copyCode}><Copy size={18} aria-hidden="true" />Copy setup code</button>
          <Link className="nv-btn" data-kind="secondary" href={`/clocker/${locationForSetup.clockerKey}`} target="_blank" rel="noopener noreferrer">Open {locationForSetup.name} Clocker<ArrowSquareOut size={18} aria-hidden="true" /></Link>
        </div>
        <p role="status" className="wc-muted wc-live">{copyMessage}</p>
      </div>
      <div className="wc-card-actions"><button className="nv-link" type="button" onClick={() => setSetup(null)}>Hide code</button></div>
    </section> : null}
    {devices.length ? <section className="nv-card" aria-labelledby="clocker-find-title">
      <div className="nv-card__head"><h2 className="nv-card__title" id="clocker-find-title">Find devices</h2></div>
      <div className="wc-find">
        <span className="wc-search"><MagnifyingGlass size={20} aria-hidden="true" /><input ref={searchField} className="wc-control" type="search" aria-label="Search devices" placeholder="Search device or location" value={query} onChange={event => setQuery(event.target.value)} autoComplete="off" /></span>
        <div className="wc-pills" role="group" aria-label="Filter devices">
          {([['ALL', 'All devices', devices.length], ['SETUP', 'Needs setup', waiting], ['REVOKED', 'Revoked', revoked]] as const).map(([value, label, count]) =>
            <button key={value} type="button" className="nv-filter" aria-pressed={filter === value} aria-label={`${label}, ${count}`} onClick={() => setFilter(value)}>{label} <span className="wc-count" aria-hidden="true">{count}</span></button>)}
        </div>
        <p className="wc-count-line" role="status">Showing {visibleDevices.length} of {devices.length} {devices.length === 1 ? 'device' : 'devices'}</p>
      </div>
    </section> : null}
    <section className="nv-card" aria-labelledby="clocker-devices-title">
      <div className="nv-card__head"><h2 className="nv-card__title" id="clocker-devices-title">Your devices</h2></div>
      {visibleDevices.length ? <ul className="nv-rows">{visibleDevices.map(device => {
        const location = locations.find(item => item.id === device.locationId);
        const label = location?.active === false && device.state !== 'REVOKED' ? 'Location inactive' : statuses[device.state];
        const tone: KitTone = device.state === 'ACTIVE' && location?.active ? 'done' : device.state === 'REVOKED' ? 'neutral' : 'review';
        const hint = location?.active === false ? 'Reactivate this location before reconnecting.' : device.state === 'EXPIRED' ? 'Create a new setup code to connect this tablet.'
          : device.state === 'PENDING' ? 'Finish setup on the shared tablet.' : device.state === 'UNREGISTERED' ? 'Create a setup code to connect this tablet.' : null;
        return <li key={device.id}>
          <article className="nv-row wc-action-row" data-leading="true" data-clocker-device={device.id} aria-label={device.name}>
            <span className="nv-tile" data-tone={device.state === 'REVOKED' ? 'neutral' : 'accent'} aria-hidden="true"><DeviceTablet size={22} /></span>
            <span className="nv-row__text">
              <span className="nv-row__title">{device.name}</span>
              <span className="nv-row__meta">{location?.name ?? 'Location unavailable'}</span>
              <span className="nv-row__meta">{device.lastSeenAt ? `Last checked ${date(device.lastSeenAt)}` : device.state === 'ACTIVE' ? 'Registered, not checked in yet' : 'No tablet has connected yet'}</span>
              <span className="nv-row__status"><Status tone={tone}>{label}</Status></span>
              {hint ? <span className="nv-row__meta wc-hint">{hint}</span> : null}
              <span className="wc-row-actions">
                <button className="nv-link" type="button" aria-label={`Rename ${device.name}`} onClick={event => open({ operation: 'RENAME', device }, event)}>Rename</button>
                <button className="nv-link" type="button" disabled={!location?.active} aria-label={`${device.state === 'ACTIVE' ? 'Replace tablet' : device.state === 'REVOKED' ? 'Reconnect tablet' : 'New setup code'} for ${device.name}`} onClick={event => open({ operation: 'ROTATE', device }, event)}>{device.state === 'ACTIVE' ? 'Replace tablet' : device.state === 'REVOKED' ? 'Reconnect tablet' : 'New setup code'}</button>
                {device.state !== 'REVOKED' ? <button className="nv-link wc-danger" type="button" aria-label={`Revoke access for ${device.name}`} onClick={event => open({ operation: 'REVOKE', device }, event)}>Revoke access</button> : null}
              </span>
            </span>
          </article>
        </li>;
      })}</ul> : <EmptyState headingLevel={3} icon={<DeviceTablet size={22} weight="bold" />} title={devices.length ? 'No matching devices' : 'Your first tablet starts here'}
        action={devices.length ? <button className="nv-btn" data-kind="secondary" type="button" onClick={() => { setQuery(''); setFilter('ALL'); searchField.current?.focus({ preventScroll: true }); }}><X size={18} aria-hidden="true" />Clear filters</button>
          : <button className="nv-btn" data-kind="primary" type="button" disabled={!activeLocations.length} onClick={event => open({ operation: 'REGISTER' }, event)}><Plus size={18} aria-hidden="true" />Add your first device</button>}>
        {devices.length ? 'Try another device name, location or status.' : 'Add a device, choose its location, and finish setup on the shared tablet.'}
      </EmptyState>}
      <div className="wc-card-actions wc-card-actions--note">
        <span className="wc-muted">Status shows registration, not a live connection.</span>
        <button className="nv-link" type="button" onClick={() => window.location.reload()}><ArrowClockwise size={18} aria-hidden="true" />Refresh devices</button>
      </div>
    </section>
    <dialog ref={dialog} className="wc-dialog" aria-labelledby="clocker-dialog-title" aria-describedby="clocker-dialog-text" onCancel={event => { event.preventDefault(); close(); }}>
      {selection ? <form noValidate onSubmit={submit} key={`${selection.operation}-${selection.device?.id ?? 'new'}`} aria-busy={pending} className="wc-dialog__form" {...handlers}>
        <div className="wc-dialog__head">
          <div>
            <h2 className="wc-dialog__title" id="clocker-dialog-title">{title}</h2>
            <p className="wc-dialog__text" id="clocker-dialog-text">{selection.device ? <strong className="wc-strong">{selection.device.name}. </strong> : null}
              {selection.operation === 'REGISTER' ? 'Name the tablet and choose its permanent location.'
                : selection.operation === 'RENAME' ? 'The new name shows in this list only.'
                  : selection.operation === 'ROTATE' ? 'Any old setup code and tablet access stop right away. The location and time records stay the same.'
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
        {error ? <div ref={errorBox} role="alert" tabIndex={-1} className="wc-feedback"><Notice tone="urgent" title="Not saved">{error.message}</Notice></div> : null}
        <p role="status" className="nv-sr">{pending ? 'Saving…' : ''}</p>
        <FormActions>
          {error?.refresh ? <button className="nv-btn" data-kind="primary" type="button" onClick={() => window.location.reload()}><ArrowClockwise size={18} aria-hidden="true" />Refresh devices</button>
            : <button className="nv-btn" data-kind={selection.operation === 'REVOKE' ? 'danger' : 'primary'} type="submit" disabled={pending}><ButtonLabel pending={pending} idle={submitLabel} busy="Saving…" /></button>}
          <button className="nv-btn" data-kind="secondary" type="button" disabled={pending} onClick={close} data-autofocus={selection.operation === 'REVOKE' || selection.operation === 'ROTATE' ? '' : undefined}>Cancel</button>
        </FormActions>
      </form> : null}
    </dialog>
  </SettingsFrame>;
}
