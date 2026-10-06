"use client";

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { ActionMenu } from './action-menu';
import { SelectField } from './select-field';
import { StatusPill } from './status-pill';
import type { ClockerDeviceView, ClockerLocationView, ClockerOwnerResult } from '../lib/clocker/views';
import styles from './clocker-setup.module.css';

type Operation = 'REGISTER' | 'RENAME' | 'ROTATE' | 'REVOKE';
type Selection = { operation: Operation; device?: ClockerDeviceView };
const statuses = { UNREGISTERED: 'Needs Setup', PENDING: 'Awaiting Setup', EXPIRED: 'Setup Expired', ACTIVE: 'Registered', REVOKED: 'Revoked' };

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
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const codeField = useRef<HTMLTextAreaElement>(null);
  const busy = useRef(false);
  const activeLocations = locations.filter(location => location.active);
  const date = (value: string) => {
    // ICU versions disagree on joining literals (", " versus " at ").
    // Use semantic parts and fixed separators so Node and WebKit hydrate identically.
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
    }).formatToParts(new Date(value));
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? '';
    return `${part('month')} ${part('day')}, ${part('hour')}:${part('minute')} ${part('dayPeriod')}`;
  };

  useEffect(() => {
    if (!selection) return;
    const element = dialog.current;
    element?.showModal();
    return () => { if (element?.open) element.close(); };
  }, [selection]);
  useEffect(() => {
    if (!setup) return;
    const duration = Math.max(0, new Date(setup.expiresAt).getTime() - Date.now());
    const timeout = window.setTimeout(() => { setSetup(null); setNotice('The setup code expired. Use Manage to create a new one.'); }, duration);
    return () => window.clearTimeout(timeout);
  }, [setup]);

  function open(next: Selection, event: MouseEvent<HTMLButtonElement>) {
    const trigger = event.currentTarget;
    returnFocus.current = trigger.closest('[data-clocker-device]')?.querySelector<HTMLElement>('[popovertarget]') ?? trigger;
    const popover = trigger.closest<HTMLElement>('[popover]');
    if (popover?.matches(':popover-open')) popover.hidePopover();
    setError(null); setSelection(next);
  }
  function close() {
    if (busy.current) return;
    const target = returnFocus.current;
    dialog.current?.close(); setSelection(null); setError(null);
    requestAnimationFrame(() => target?.focus({ preventScroll: true }));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !selection) return;
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
      setCopyMessage('');
      if (result.setup) setSetup({ ...result.setup, device: result.device });
      else if (setup?.device.id === result.device.id && selection.operation === 'REVOKE') setSetup(null);
      setNotice(selection.operation === 'RENAME' ? 'Device name updated.' : selection.operation === 'REVOKE'
        ? 'Access revoked. Existing time records are preserved.' : 'Setup code created. Finish connecting the shared tablet below.');
      busy.current = false; close();
    } catch { setError({ message: 'We could not confirm the update. Refresh Devices before trying again.', refresh: true }); }
    finally { busy.current = false; setPending(false); }
  }
  async function copyCode() {
    if (!setup) return;
    try { await navigator.clipboard.writeText(setup.code); setCopyMessage('Setup code copied.'); }
    catch { codeField.current?.focus(); codeField.current?.select(); setCopyMessage('Select and copy the setup code.'); }
  }
  const locationForSetup = locations.find(location => location.id === setup?.device.locationId);
  const title = selection?.operation === 'REGISTER' ? 'Add Device' : selection?.operation === 'RENAME' ? 'Rename Device'
    : selection?.operation === 'REVOKE' ? 'Revoke Device Access?' : 'Create a New Setup Code?';

  return <div className={styles.manager}>
    <div className={styles.toolbar}>
      <p>One registration for each shared tablet. Time records remain intact when access changes.</p>
      <div className={styles.buttons}>
        <button className="button secondary" type="button" onClick={() => window.location.reload()}>Refresh Devices</button>
        <button className="button primary" type="button" disabled={!activeLocations.length} onClick={event => open({ operation: 'REGISTER' }, event)}>Add Device</button>
      </div>
    </div>
    {!activeLocations.length ? <p className={styles.hint}>Add or reactivate a location in <Link href="/app/settings/locations">Locations</Link> before registering a tablet.</p> : null}
    {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
    {setup && locationForSetup ? <section className={styles.setupCode} aria-labelledby="clocker-code-title">
      <div className={styles.codeHeader}><div><p className={styles.eyebrow}>Finish on your shared tablet</p><h2 id="clocker-code-title">Connect {setup.device.name}</h2></div>
        <button className="button ghost" type="button" onClick={() => setSetup(null)}>Hide Code</button></div>
      <p>Open this location’s Clocker on the tablet, then paste the one-use setup code.</p>
      <Link className="button secondary" href={`/clocker/${locationForSetup.clockerKey}`} target="_blank" rel="noopener noreferrer">Open {locationForSetup.name} Clocker</Link>
      <label className={styles.field}>Setup code<textarea ref={codeField} value={setup.code} readOnly rows={2} spellCheck={false} autoComplete="off" /></label>
      <div className={styles.codeFooter}><button className="button secondary" type="button" onClick={copyCode}>Copy Setup Code</button><span>Expires {date(setup.expiresAt)}</span></div>
      {copyMessage ? <p role="status">{copyMessage}</p> : null}
      <p className={styles.hint}>Keep this Owner session signed in until the tablet connects. Then choose Refresh Devices to see its status.</p>
    </section> : null}
    <section className={`panel ${styles.deviceList}`} aria-label="Registered Clocker devices">
      {devices.length ? devices.map(device => {
        const location = locations.find(item => item.id === device.locationId);
        const label = location?.active === false && device.state !== 'REVOKED' ? 'Location Inactive' : statuses[device.state];
        return <article className={styles.deviceRow} data-clocker-device={device.id} key={device.id}>
          <div className={styles.deviceCopy}><h2>{device.name}</h2><p>{location?.name ?? 'Location unavailable'}</p>
            <small>{device.lastSeenAt ? `Last checked ${date(device.lastSeenAt)}` : 'Not checked by a tablet yet'}</small></div>
          <div className={styles.rowActions}><StatusPill tone={device.state === 'ACTIVE' && location?.active ? 'success' : device.state === 'REVOKED' ? 'neutral' : 'warning'}>{label}</StatusPill>
            <ActionMenu id={`clocker-manage-${device.id}`} label="Manage" ariaLabel={`Manage ${device.name}`}>
              <button className="nevora-action-menu-item" type="button" onClick={event => open({ operation: 'RENAME', device }, event)}>Rename</button>
              <button className="nevora-action-menu-item" type="button" disabled={!location?.active} onClick={event => open({ operation: 'ROTATE', device }, event)}>
                {device.state === 'ACTIVE' ? 'Replace Tablet' : device.state === 'REVOKED' ? 'Reconnect Tablet' : 'New Setup Code'}
              </button>
              {device.state !== 'REVOKED' ? <button className={`nevora-action-menu-item ${styles.dangerText}`} type="button" onClick={event => open({ operation: 'REVOKE', device }, event)}>Revoke Access</button> : null}
            </ActionMenu></div>
        </article>;
      }) : <div className={styles.empty}><h2>No tablets connected yet</h2><p>Add a device, choose its location, and finish setup on the shared tablet.</p></div>}
    </section>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="clocker-dialog-title" onCancel={event => { event.preventDefault(); close(); }}>
      {selection ? <form onSubmit={submit} key={`${selection.operation}-${selection.device?.id ?? 'new'}`} aria-busy={pending}>
        <p className={styles.eyebrow}>Clocker device management</p><h2 id="clocker-dialog-title">{title}</h2>
        {selection.device ? <p className={styles.deviceContext}>{selection.device.name}</p> : <p>Name the tablet and choose its permanent location.</p>}
        {selection.operation === 'ROTATE' ? <p>Any old setup code and tablet access will stop immediately. The device’s location and time records will stay unchanged.</p> : null}
        {selection.operation === 'REVOKE' ? <p>This tablet will lose access immediately. Existing punches and time records will not be deleted.</p> : null}
        <fieldset disabled={pending || Boolean(error?.refresh)} className={styles.fields}>
          {selection.operation === 'REGISTER' || selection.operation === 'RENAME' ? <label className={styles.field}>Device name<input name="name" defaultValue={selection.device?.name ?? ''} required maxLength={80} autoComplete="off" autoFocus /></label> : null}
          {selection.operation === 'REGISTER' ? <SelectField name="locationId" label="Location" required defaultValue="" options={[{ value: '', label: 'Choose a location', disabled: true }, ...activeLocations.map(location => ({ value: location.id, label: location.name }))]} /> : null}
          <div className={styles.dialogActions}>
            <button className={`button ${selection.operation === 'REVOKE' ? styles.dangerButton : 'primary'}`} type="submit">
              {pending ? 'Saving…' : selection.operation === 'REGISTER' ? 'Create Setup Code' : selection.operation === 'RENAME' ? 'Save Name' : selection.operation === 'REVOKE' ? 'Revoke Device' : 'Create New Code'}
            </button>
          </div>
        </fieldset>
        {error ? <p role="alert" className={styles.error}>{error.message}</p> : null}
        <div className={styles.dialogFooter}>
          <button className="button secondary" type="button" disabled={pending} onClick={close}>Cancel</button>
          {error?.refresh ? <button className="button primary" type="button" onClick={() => window.location.reload()}>Refresh Devices</button> : null}
        </div>
      </form> : null}
    </dialog>
  </div>;
}
