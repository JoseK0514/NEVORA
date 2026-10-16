"use client";

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { ActionMenu } from './action-menu';
import { SelectField } from './select-field';
import { StatusPill } from './status-pill';
import { DeviceTablet } from '@phosphor-icons/react/dist/ssr/DeviceTablet';
import { ShieldCheck } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { Plus } from '@phosphor-icons/react/dist/ssr/Plus';
import { ArrowClockwise } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { MagnifyingGlass } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { Copy } from '@phosphor-icons/react/dist/ssr/Copy';
import { ArrowSquareOut } from '@phosphor-icons/react/dist/ssr/ArrowSquareOut';
import { CaretDown } from '@phosphor-icons/react/dist/ssr/CaretDown';
import type { ClockerDeviceView, ClockerLocationView, ClockerOwnerResult } from '../lib/clocker/views';
import styles from './clocker-device-manager.module.css';

type Operation = 'REGISTER' | 'RENAME' | 'ROTATE' | 'REVOKE';
type Selection = { operation: Operation; device?: ClockerDeviceView };
const statuses = { UNREGISTERED: 'Needs setup', PENDING: 'Awaiting setup', EXPIRED: 'Setup expired', ACTIVE: 'Registered', REVOKED: 'Revoked' };

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
      setFilter('ALL'); setQuery('');
    } catch { setError({ message: 'We could not confirm the update. Refresh Devices before trying again.', refresh: true }); }
    finally { busy.current = false; setPending(false); }
  }
  async function copyCode() {
    if (!setup) return;
    try { await navigator.clipboard.writeText(setup.code); setCopyMessage('Setup code copied.'); }
    catch { codeField.current?.focus(); codeField.current?.select(); setCopyMessage('Select and copy the setup code.'); }
  }
  const locationForSetup = locations.find(location => location.id === setup?.device.locationId);
  const title = selection?.operation === 'REGISTER' ? 'Add device' : selection?.operation === 'RENAME' ? 'Rename device'
    : selection?.operation === 'REVOKE' ? 'Revoke Device Access?' : 'Create a New Setup Code?';

  return <div className={styles.manager}>
    <div className={styles.toolbar}>
      <p>One device per shared tablet, assigned to a location.</p>
      <div className={styles.buttons}>
        <button className="button secondary" type="button" onClick={() => window.location.reload()}><ArrowClockwise size={18} aria-hidden="true" />Refresh devices</button>
        <button className="button primary" type="button" disabled={!activeLocations.length} onClick={event => open({ operation: 'REGISTER' }, event)}><Plus size={18} aria-hidden="true" />Add device</button>
      </div>
    </div>
    {!activeLocations.length ? <p className={styles.locationNotice}>Add or reactivate a location in <Link href="/app/settings/locations">Locations</Link> before registering a tablet.</p> : null}
    <dl className={styles.summary} aria-label="Device overview">
      <div><dt>Registered</dt><dd>{registered}<p>Tablet setup completed</p></dd></div>
      <div><dt>Needs setup</dt><dd>{waiting}<p>Waiting for a tablet</p></dd></div>
      <div><dt>Revoked</dt><dd>{revoked}<p>Tablet access disabled</p></dd></div>
    </dl>
    {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
    {setup && locationForSetup ? <section className={styles.setupCode} aria-labelledby="clocker-code-title">
      <div className={styles.codeHeader}><div><p className={styles.eyebrow}>Finish on your shared tablet</p><h2 id="clocker-code-title">Connect {setup.device.name}</h2></div>
        <button className="button ghost" type="button" onClick={() => setSetup(null)}>Hide code</button></div>
      <p>Open this location’s Clocker on the tablet, then paste the one-use setup code.</p>
      <Link className="button secondary" href={`/clocker/${locationForSetup.clockerKey}`} target="_blank" rel="noopener noreferrer">Open {locationForSetup.name} Clocker<ArrowSquareOut size={18} aria-hidden="true" /></Link>
      <label className={styles.field}>Setup code<textarea ref={codeField} value={setup.code} readOnly rows={2} spellCheck={false} autoComplete="off" /></label>
      <div className={styles.codeFooter}><button className="button primary" type="button" onClick={copyCode}><Copy size={18} aria-hidden="true" />Copy setup code</button><span>Expires {date(setup.expiresAt)}</span></div>
      {copyMessage ? <p role="status">{copyMessage}</p> : null}
      <p className={styles.hint}>Keep this Owner session signed in until the tablet connects. Then choose Refresh Devices to see its status.</p>
    </section> : null}
    <div className={styles.layout}>
    <section className={styles.deviceList} aria-labelledby="clocker-devices-title">
      <div className={styles.listHeader}><div><h2 id="clocker-devices-title">Your devices</h2><p>Manage each tablet’s setup and access.</p></div><span className={styles.total}>{devices.length} {devices.length === 1 ? 'device' : 'devices'}</span></div>
      {devices.length ? <div className={styles.listControls}>
        <label className={styles.search}><MagnifyingGlass size={19} aria-hidden="true" /><input ref={searchField} type="search" aria-label="Search devices" placeholder="Search device or location" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <div className={styles.filters} role="group" aria-label="Filter devices">
          {([['ALL', 'All devices'], ['SETUP', 'Needs setup'], ['REVOKED', 'Revoked']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}
        </div>
        <p className={styles.resultCount} role="status">Showing {visibleDevices.length} of {devices.length} devices</p>
      </div> : null}
      {visibleDevices.length ? visibleDevices.map(device => {
        const location = locations.find(item => item.id === device.locationId);
        const label = location?.active === false && device.state !== 'REVOKED' ? 'Location inactive' : statuses[device.state];
        return <article className={styles.deviceRow} data-clocker-device={device.id} key={device.id}>
          <div className={styles.deviceIdentity}><span className={`${styles.deviceIcon} ${device.state === 'REVOKED' ? styles.revokedIcon : ''}`}><DeviceTablet size={25} aria-hidden="true" /></span>
          <div className={styles.deviceCopy}><h3>{device.name}</h3><p>{location?.name ?? 'Location unavailable'}</p>
            <small>{device.lastSeenAt ? `Last checked ${date(device.lastSeenAt)}` : 'Not checked by a tablet yet'}</small>
            {location?.active === false ? <p className={styles.stateHint}>Reactivate this location before reconnecting.</p> : device.state === 'EXPIRED' ? <p className={styles.stateHint}>Create a new setup code to connect this tablet.</p> : device.state === 'PENDING' ? <p className={styles.stateHint}>Finish setup on the shared tablet.</p> : device.state === 'UNREGISTERED' ? <p className={styles.stateHint}>Create a setup code to connect this tablet.</p> : null}
          </div></div>
          <div className={styles.rowActions}><StatusPill tone={device.state === 'ACTIVE' && location?.active ? 'success' : device.state === 'REVOKED' ? 'neutral' : 'warning'}>{label}</StatusPill>
            <ActionMenu id={`clocker-manage-${device.id}`} label="Manage" ariaLabel={`Manage ${device.name}`}>
              <button className="nevora-action-menu-item" type="button" onClick={event => open({ operation: 'RENAME', device }, event)}>Rename</button>
              <button className="nevora-action-menu-item" type="button" disabled={!location?.active} onClick={event => open({ operation: 'ROTATE', device }, event)}>
                {device.state === 'ACTIVE' ? 'Replace tablet' : device.state === 'REVOKED' ? 'Reconnect tablet' : 'New setup code'}
              </button>
              {device.state !== 'REVOKED' ? <button className={`nevora-action-menu-item ${styles.dangerText}`} type="button" onClick={event => open({ operation: 'REVOKE', device }, event)}>Revoke access</button> : null}
            </ActionMenu></div>
        </article>;
      }) : <div className={styles.empty}><DeviceTablet size={40} weight="duotone" aria-hidden="true" /><h3>{devices.length ? 'No matching devices' : 'Your first tablet starts here'}</h3><p>{devices.length ? 'Try another device name, location, or status.' : 'Add a device, choose its location, and finish setup on the shared tablet.'}</p>
        {devices.length ? <button className="button secondary" type="button" onClick={() => { setQuery(''); setFilter('ALL'); searchField.current?.focus({ preventScroll: true }); }}>Clear filters</button> : <button className="button primary" type="button" disabled={!activeLocations.length} onClick={event => open({ operation: 'REGISTER' }, event)}><Plus size={18} aria-hidden="true" />Add your first device</button>}
      </div>}
      <p className={styles.listFootnote}>Device status reflects registration, not a live connection. Refresh to see the latest setup state.</p>
    </section>
    <aside className={styles.guidance}>
      <div className={styles.guidanceIntro}><span className={styles.guidanceIcon}><ShieldCheck size={28} weight="duotone" aria-hidden="true" /></span><h2>Connect a shared tablet</h2><p>Create a setup code here, then finish on the tablet at its assigned location.</p></div>
      <details className={styles.guideDetails} open><summary>Setup steps<CaretDown size={18} aria-hidden="true" /></summary><ol>
        <li><span>1</span><div><strong>Add your device</strong><p>Name the tablet and choose its permanent location.</p></div></li>
        <li><span>2</span><div><strong>Open the location’s Clocker</strong><p>Use the Clocker link on the shared tablet.</p></div></li>
        <li><span>3</span><div><strong>Enter the setup code</strong><p>Keep your Owner session signed in, then refresh devices after connecting.</p></div></li>
      </ol></details>
      <div className={styles.retention}><ShieldCheck size={19} aria-hidden="true" /><p>Replacing a tablet or revoking access keeps existing punches and time records intact.</p></div>
      <Link className={styles.locationLink} href="/app/settings/locations">Manage locations<ArrowSquareOut size={17} aria-hidden="true" /></Link>
    </aside>
    </div>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="clocker-dialog-title" onCancel={event => { event.preventDefault(); close(); }}>
      {selection ? <form onSubmit={submit} key={`${selection.operation}-${selection.device?.id ?? 'new'}`} aria-busy={pending}>
        <span className={styles.dialogIcon}><DeviceTablet size={28} aria-hidden="true" /></span><h2 id="clocker-dialog-title">{title}</h2>
        {selection.device ? <p className={styles.deviceContext}>{selection.device.name}</p> : <p>Name the tablet and choose its permanent location.</p>}
        {selection.operation === 'ROTATE' ? <p>Any old setup code and tablet access will stop immediately. The device’s location and time records will stay unchanged.</p> : null}
        {selection.operation === 'REVOKE' ? <p>This tablet will lose access immediately. Existing punches and time records will not be deleted.</p> : null}
        <fieldset disabled={pending || Boolean(error?.refresh)} className={styles.fields}>
          {selection.operation === 'REGISTER' || selection.operation === 'RENAME' ? <label className={styles.field}>Device name<input name="name" placeholder="e.g. Front desk tablet" defaultValue={selection.device?.name ?? ''} required maxLength={80} autoComplete="off" autoFocus /></label> : null}
          {selection.operation === 'REGISTER' ? <SelectField name="locationId" label="Location" required defaultValue="" options={[{ value: '', label: 'Choose a location', disabled: true }, ...activeLocations.map(location => ({ value: location.id, label: location.name }))]} /> : null}
          <div className={styles.dialogActions}>
            <button className={`button ${selection.operation === 'REVOKE' ? styles.dangerButton : 'primary'}`} type="submit">
              {pending ? 'Saving…' : selection.operation === 'REGISTER' ? 'Create setup code' : selection.operation === 'RENAME' ? 'Save name' : selection.operation === 'REVOKE' ? 'Revoke device' : 'Create new code'}
            </button>
          </div>
        </fieldset>
        {error ? <p role="alert" className={styles.error}>{error.message}</p> : null}
        <div className={styles.dialogFooter}>
          <button className="button secondary" type="button" disabled={pending} onClick={close}>Cancel</button>
          {error?.refresh ? <button className="button primary" type="button" onClick={() => window.location.reload()}>Refresh devices</button> : null}
        </div>
      </form> : null}
    </dialog>
  </div>;
}
