'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { BellIcon } from '@phosphor-icons/react/dist/ssr/Bell';
import { DeviceMobileIcon } from '@phosphor-icons/react/dist/ssr/DeviceMobile';
import { ReceiptIcon } from '@phosphor-icons/react/dist/ssr/Receipt';
import { SignOutIcon } from '@phosphor-icons/react/dist/ssr/SignOut';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { Card, KitLink, Row, Rows, Tile } from '@/components/kit/kit';
import { PortalSignout } from '@/components/portal-signout';
import { createPrivateSnapshotController, type PrivatePanelState } from '@/lib/private-snapshot-client';
import { MANAGER_ALERTS_ENDPOINT, MANAGER_PROFILE_ENDPOINT, parseManagerProfile, type ManagerAlertTopic, type ManagerProfileSnapshot } from './contract';

/** What the page already knows from today's session and workspace reads. */
export type ManagerProfileIdentity = {
  employeeId: string;
  name: string;
  owner: boolean;
  company: string;
  timeZone: string;
  /** Shown only when the role's navigation already offers My pay. */
  payHref: string | null;
  /** The workplace has device alerts turned on (the existing device settings sheet). */
  deviceAlerts: boolean;
};

export type AlertSave = { pending: boolean; error: null | 'offline' | 'signed_out' | 'failed' };
type View = { identity: ManagerProfileIdentity; state: PrivatePanelState<ManagerProfileSnapshot>; onRetry: () => void; saves?: Record<string, AlertSave>; overrides?: Record<string, boolean>; onToggle?: (topic: ManagerAlertTopic, on: boolean) => void };

/** The fixed topic set per role (CODEX.md), so the loading rows match the ready card. */
export const ALERT_TOPIC_COUNT = { owner: 5, manager: 4 } as const;

/** Every state of the read lives in space the card already has, so nothing moves when it changes: loading and
 * pause are words in the head line; a failed read or an ended session puts its action there and its words in the
 * rows it couldn't fill. A screen reader hears the full sentence once. */
function readState(state: View['state']) {
  if (state.paused) return { kind: 'paused' as const, head: typeof navigator !== 'undefined' && !navigator.onLine ? 'You’re offline' : 'Updates paused' };
  const snapshot = state.snapshot;
  if (!snapshot) return { kind: 'loading' as const, head: 'Checking…' };
  if (snapshot.state === 'ready') return { kind: 'ready' as const, head: null };
  if (snapshot.reason === 'access_denied') return { kind: 'denied' as const, head: null, row: 'Sign in to see this', said: 'Your session ended. Sign in again to see your contact details, locations and alert choices.' };
  return { kind: 'failed' as const, head: null, row: 'Couldn’t load', said: 'We couldn’t load your contact details, locations and alert choices.' };
}

function Placeholder({ text }: { text?: string }) {
  if (text) return <span className="pmp-muted">{text}</span>;
  return <><span aria-hidden="true">–</span><span className="sr-only">Not shown yet</span></>;
}

/** Contact values break only between their parts: an address after the @ and before dots, a phone number at its
 * spaces. A part too long for any line (over 24 characters) may still wrap inside, so nothing spills out. */
function Parts({ parts }: { parts: { text: string; joinBefore?: string }[] }) {
  return <>{parts.map((part, index) => <span key={index}>{index ? part.joinBefore === ' ' ? ' ' : <wbr /> : null}<span className={part.text.length > 24 ? undefined : 'pmp-nowrap'}>{part.joinBefore && part.joinBefore !== ' ' ? part.joinBefore : null}{part.text}</span></span>)}</>;
}
function Email({ address }: { address: string }) {
  const at = address.indexOf('@');
  if (at < 1) return <Parts parts={[{ text: address }]} />;
  const local = address.slice(0, at).split('.').map((text, index) => ({ text, joinBefore: index ? '.' : undefined }));
  const domain = address.slice(at + 1).split('.').map((text, index) => ({ text, joinBefore: index ? '.' : '@' }));
  return <Parts parts={[...local, ...domain]} />;
}
function Phone({ number }: { number: string }) {
  return <Parts parts={number.split(/\s+/).map((text, index) => ({ text, joinBefore: index ? ' ' : undefined }))} />;
}

const SHOWN_LOCATIONS = 5;
function Locations({ snapshot, owner }: { snapshot: Extract<ManagerProfileSnapshot, { state: 'ready' }>; owner: boolean }) {
  const [all, setAll] = useState(false);
  const { scope, names } = snapshot.locations;
  if (!names.length) return <span className="pmp-muted">{owner ? 'No locations yet' : 'None assigned yet'}</span>;
  const shown = all ? names : names.slice(0, SHOWN_LOCATIONS);
  return <>
    {scope === 'all' ? <span className="pmp-locations-scope">{names.length === 1 ? 'All locations' : `All ${names.length} locations`}</span> : null}
    <ul className="pmp-locations" aria-label="Locations">{shown.map((name, index) => <li key={`${index}-${name}`}>{name}</li>)}</ul>
    {names.length > SHOWN_LOCATIONS ? <button type="button" className="pmp-text-button" aria-expanded={all} onClick={() => setAll(value => !value)}>{all ? 'Show fewer' : `Show all ${names.length}`}</button> : null}
  </>;
}

function SignOutButton() {
  const { pending } = useFormStatus();
  return <button type="submit" className="nv-row pmp-button-row" disabled={pending} aria-disabled={pending || undefined}>
    <Tile><SignOutIcon size={20} aria-hidden="true" /></Tile>
    <span className="nv-row__text"><span className="nv-row__title">{pending ? 'Signing out…' : 'Sign out'}</span></span>
  </button>;
}

function saveMessage(error: AlertSave['error']) {
  if (error === 'offline') return 'Not saved. Check your connection and try again.';
  if (error === 'signed_out') return 'Not saved. Sign in again, then try.';
  return 'Not saved. Try again.';
}

export function ManagerProfileView({ identity, state, onRetry, saves = {}, overrides = {}, onToggle }: View) {
  const ready = !state.paused && state.snapshot?.state === 'ready' ? state.snapshot : null;
  const read = readState(state), row = 'row' in read ? read.row : undefined;
  const saveError = Object.entries(saves).find(([, save]) => save.error);
  const topicCount = identity.owner ? ALERT_TOPIC_COUNT.owner : ALERT_TOPIC_COUNT.manager;
  return <div className="pmp-grid">
    <div className="pmp-col">
      <Card id="profile-details" title="Your details" meta={<>
        {read.head ? <span role="status">{read.head}</span> : null}
        {read.kind === 'failed' ? <button type="button" className="pmp-text-button pmp-head-action" disabled={state.refreshing} onClick={onRetry} aria-label="Try loading your details again">{state.refreshing ? 'Trying again…' : 'Try again'}</button> : null}
        {read.kind === 'denied' ? <Link className="pmp-text-button pmp-head-action" href="/login">Sign in</Link> : null}
      </>} foot={identity.owner
        ? <KitLink href={`/app/employees/${encodeURIComponent(identity.employeeId)}`}>Edit your details</KitLink>
        : <p className="pmp-foot-copy">Something wrong here? Ask the account owner to update it.</p>}>
        <p className="sr-only" role="alert">{'said' in read ? read.said : ''}</p>
        <dl className="pmp-details">
          <div><dt>Name</dt><dd>{identity.name}</dd></div>
          <div><dt>Role</dt><dd>{identity.owner ? 'Owner' : 'Manager'}</dd></div>
          <div><dt>Company</dt><dd>{identity.company}</dd></div>
          <div><dt>Time zone</dt><dd>{identity.timeZone}</dd></div>
          {/* The read's rows come last, so a value that arrives taller only pushes what is below the card. */}
          <div><dt>Email</dt><dd>{ready ? ready.contact.email ? <Email address={ready.contact.email} /> : <span className="pmp-muted">Not added</span> : <Placeholder text={row} />}</dd></div>
          <div><dt>Phone</dt><dd>{ready ? ready.contact.phone ? <Phone number={ready.contact.phone} /> : <span className="pmp-muted">Not added</span> : <Placeholder text={row} />}</dd></div>
          <div><dt>Locations</dt><dd>{ready ? <Locations snapshot={ready} owner={identity.owner} /> : <Placeholder text={row} />}</dd></div>
        </dl>
      </Card>
    </div>
    <div className="pmp-col">
      {identity.payHref ? <Card id="profile-pay" title="Pay">
        <Rows><Row href={identity.payHref} leading={<Tile><ReceiptIcon size={20} aria-hidden="true" /></Tile>} title="My pay" meta="Your pay statements" /></Rows>
      </Card> : null}
      <Card id="profile-notifications" title="Notifications">
        <Rows>
          <Row href="/app/notifications" leading={<Tile><BellIcon size={20} aria-hidden="true" /></Tile>} title="Notifications" meta="Requests, schedule changes and team updates" />
          {identity.deviceAlerts
            ? <li><button type="button" className="nv-row pmp-button-row" data-leading="true" popoverTarget="portal-device-settings">
                <Tile><DeviceMobileIcon size={20} aria-hidden="true" /></Tile>
                <span className="nv-row__text"><span className="nv-row__title">Alerts on this device</span><span className="nv-row__meta">Choose how this device alerts you</span></span>
                <CaretRightIcon className="nv-row__chev" size={18} weight="bold" aria-hidden="true" />
              </button></li>
            : <li><div className="nv-row" data-leading="true"><Tile><DeviceMobileIcon size={20} aria-hidden="true" /></Tile><span className="nv-row__text"><span className="nv-row__meta pmp-note">Alerts on this device aren’t turned on for your workplace yet.</span></span></div></li>}
        </Rows>
        <h3 className="pmp-subhead" id="profile-alerts-title">You’re told about</h3>
        <ul className="nv-rows pmp-topics" aria-labelledby="profile-alerts-title">
          {ready ? ready.alerts.map(topic => {
            const save = saves[topic.id], on = overrides[topic.id] ?? topic.on, blocked = save?.pending || !onToggle;
            return <li key={topic.id}>
              <button type="button" role="switch" aria-checked={on} className="nv-row pmp-switch-row" disabled={blocked}
                aria-busy={save?.pending || undefined} onClick={() => onToggle?.(topic, !on)}>
                <span className="nv-row__text"><span className="nv-row__title">{topic.label}</span>
                  {/* The detail, "Saving…" and a failed save share one reserved space, so the row never changes height. */}
                  <span className="nv-row__meta pmp-meta-stack">
                    <span data-shown={!save?.pending && !save?.error}>{topic.detail}</span>
                    <span data-shown={!!save?.pending}>Saving…</span>
                    <span data-shown={!save?.pending && !!save?.error} className="pmp-save-error"><WarningCircleIcon size={16} weight="fill" aria-hidden="true" />{saveMessage(save?.error ?? null)}</span>
                  </span></span>
                <span className="pmp-switch" data-on={on} aria-hidden="true" />
              </button>
            </li>;
          }) : row
            ? <li className="pmp-topics-note"><span className="pmp-muted">{read.kind === 'denied' ? 'Sign in again to see your alert choices.' : 'Your alert choices couldn’t load.'}</span></li>
            // Placeholder rows use the ready row's two line boxes, so the list keeps its height when the choices arrive.
            : Array.from({ length: topicCount }, (_, index) => <li key={index} aria-hidden="true"><div className="nv-row pmp-switch-row pmp-topic-placeholder"><span className="nv-row__text"><span className="nv-row__title"><span className="pmp-bar" /></span><span className="nv-row__meta"><span className="pmp-bar pmp-bar--short" /></span></span><span className="pmp-switch" data-on="false" /></div></li>)}
        </ul>
        <p className="sr-only" role="status">{saveError ? `${ready?.alerts.find(topic => topic.id === saveError[0])?.label ?? 'Alert'}: ${saveMessage(saveError[1].error)}` : ''}</p>
        {ready && !ready.alerts.length ? <p className="pmp-empty">No alert choices for your role yet.</p> : null}
      </Card>
      <section className="nv-card pmp-signout" aria-label="Session">
        <PortalSignout><ul className="nv-rows"><li><SignOutButton /></li></ul></PortalSignout>
      </section>
    </div>
  </div>;
}

export function ManagerProfileLive({ identity }: { identity: ManagerProfileIdentity }) {
  const [state, setState] = useState<PrivatePanelState<ManagerProfileSnapshot>>({ snapshot: null, paused: false, refreshing: true });
  const [saves, setSaves] = useState<Record<string, AlertSave>>({});
  const [overrides, setOverrides] = useState<Record<string, { on: boolean; basis: string }>>({});
  const inFlight = useRef(new Set<string>());
  const control = useRef<ReturnType<typeof createPrivateSnapshotController<ManagerProfileSnapshot>> | null>(null);

  useEffect(() => {
    // Same privacy rhythm as the employee Profile: details clear when the window is left, and re-read on return.
    const controller = createPrivateSnapshotController<ManagerProfileSnapshot>(setState, async signal => {
      const response = await fetch(MANAGER_PROFILE_ENDPOINT, { cache: 'no-store', credentials: 'same-origin', redirect: 'error', signal, headers: { Accept: 'application/json' } });
      if (response.status === 401 || response.status === 403) return { state: 'unavailable', reason: 'access_denied' };
      if (!response.ok) throw Error('Profile unavailable');
      return response.json();
    }, parseManagerProfile, reason => ({ state: 'unavailable', reason }), () => 'read_failed');
    control.current = controller;
    let mounted = true;
    const pause = () => controller.pause();
    const sync = () => { controller.pause(); if (document.visibilityState !== 'hidden' && navigator.onLine) controller.start(); };
    document.addEventListener('visibilitychange', sync);
    for (const event of ['blur', 'pagehide', 'offline']) window.addEventListener(event, pause);
    for (const event of ['focus', 'pageshow', 'online']) window.addEventListener(event, sync);
    void Promise.resolve().then(() => { if (mounted) sync(); });
    return () => {
      mounted = false; controller.stop(); control.current = null;
      document.removeEventListener('visibilitychange', sync);
      for (const event of ['blur', 'pagehide', 'offline']) window.removeEventListener(event, pause);
      for (const event of ['focus', 'pageshow', 'online']) window.removeEventListener(event, sync);
    };
  }, []);

  // A saved choice shows until a newer read arrives; from then on the read is the truth.
  const ready = state.snapshot?.state === 'ready' ? state.snapshot : null;
  const shownOverrides = Object.fromEntries(Object.entries(overrides).filter(([, saved]) => ready?.observedAt === saved.basis).map(([id, saved]) => [id, saved.on]));

  async function toggle(topic: ManagerAlertTopic, on: boolean) {
    if (inFlight.current.has(topic.id)) return; // a second tap never sends a second request
    inFlight.current.add(topic.id);
    const savedBasis = ready?.observedAt ?? '';
    setSaves(current => ({ ...current, [topic.id]: { pending: true, error: null } }));
    let error: AlertSave['error'] = null;
    try {
      const response = await fetch(MANAGER_ALERTS_ENDPOINT, {
        method: 'POST', cache: 'no-store', credentials: 'same-origin', redirect: 'error', signal: AbortSignal.timeout(10000),
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Nevora-Profile-Alerts': '1' },
        body: JSON.stringify({ topicId: topic.id, on }),
      });
      if (response.status === 401 || response.status === 403) error = 'signed_out';
      else if (!response.ok) error = 'failed';
    } catch {
      error = navigator.onLine ? 'failed' : 'offline';
    }
    inFlight.current.delete(topic.id);
    if (!error) setOverrides(current => ({ ...current, [topic.id]: { on, basis: savedBasis } }));
    setSaves(current => ({ ...current, [topic.id]: { pending: false, error } }));
    // A saved choice is re-read; an ended session is re-read too, so the card's head offers Sign in.
    if (!error || error === 'signed_out') control.current?.refresh();
  }

  return <ManagerProfileView identity={identity} state={state} onRetry={() => control.current?.refresh()} saves={saves} overrides={shownOverrides} onToggle={toggle} />;
}
