'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { BellIcon } from '@phosphor-icons/react/dist/ssr/Bell';
import { DeviceMobileIcon } from '@phosphor-icons/react/dist/ssr/DeviceMobile';
import { ReceiptIcon } from '@phosphor-icons/react/dist/ssr/Receipt';
import { SignOutIcon } from '@phosphor-icons/react/dist/ssr/SignOut';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { PauseCircleIcon } from '@phosphor-icons/react/dist/ssr/PauseCircle';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { Card, KitLink, Row, Rows, Tile } from '@/components/kit/kit';
import { PortalSignout } from '@/components/portal-signout';
import { createPrivateSnapshotController, type PrivatePanelState } from '@/lib/private-snapshot-client';
import { ALERT_TOPIC_SIZING, MANAGER_ALERTS_ENDPOINT, MANAGER_PROFILE_ENDPOINT, parseManagerProfile, type ManagerAlertTopic, type ManagerProfileSnapshot } from './contract';

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
  /** Payroll is on, so an Owner's alert set includes "Payroll ready to review" (approved set, CODEX.md). */
  payrollAlerts?: boolean;
};

export type AlertSave = { pending: boolean; error: null | 'offline' | 'signed_out' | 'failed' };
type View = {
  identity: ManagerProfileIdentity; state: PrivatePanelState<ManagerProfileSnapshot>; onRetry: (from?: 'details' | 'alerts') => void;
  saves?: Record<string, AlertSave>; overrides?: Record<string, boolean>; onToggle?: (topic: ManagerAlertTopic, on: boolean) => void;
  /** A retry the reader asked for is under way (a background re-read never says "Trying again…"). */
  retrying?: boolean;
  /** How the reader's last retry ended, so it can be announced. */
  retried?: 'loaded' | 'failed' | null;
  /** The latest failed save, spoken once ("Time-off requests: Not saved. Try again."). */
  announcement?: string;
  /** The last ready read. While paused, offline or failed it holds each row's size (hidden, under the note), and
   * while re-reading after a return it stays on screen, so the page doesn't collapse and regrow. */
  held?: Ready | null;
  /** The read rows' last heights, kept only while the session has ended (the values themselves are cleared). */
  rowHeights?: Record<string, number> | null;
};
type Ready = Extract<ManagerProfileSnapshot, { state: 'ready' }>;

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

/** Two labels in one cell: the button keeps the wider one's width, so it never moves under the finger. */
function Labels({ busy, idle, working }: { busy: boolean; idle: string; working: string }) {
  return <span className="pmp-label-stack"><span data-shown={!busy}>{idle}</span><span data-shown={busy}>{working}</span></span>;
}

function Placeholder({ text }: { text?: string }) {
  if (text) return <span className="pmp-muted">{text}</span>;
  return <><span aria-hidden="true">–</span><span className="sr-only">Not shown yet</span></>;
}

/** Contact values break only between their parts: an address after the @ and before dots, a phone number at its
 * spaces. Each part is a box that moves whole to the next line; only a part wider than the whole line wraps inside
 * its own box, so nothing is ever clipped and the characters stay as typed for copying. */
function Parts({ parts }: { parts: string[] }) {
  return <>{parts.map((part, index) => <span key={index}>{index ? part.startsWith(' ') ? ' ' : <wbr /> : null}<span className="pmp-part">{part.trimStart()}</span></span>)}</>;
}
function Email({ address }: { address: string }) {
  const at = address.lastIndexOf('@');
  if (at < 1) return <Parts parts={[address]} />;
  const local = address.slice(0, at).split('.').map((part, index) => index ? `.${part}` : part);
  local[local.length - 1] += '@';
  const domain = address.slice(at + 1).split('.').map((part, index) => index ? `.${part}` : part);
  return <Parts parts={[...local, ...domain]} />;
}
function Phone({ number }: { number: string }) {
  // An extension word stays with its number ("ext. 4021" is one part), so the number never sits alone (WR-4).
  const words = number.split(/\s+/), parts: string[] = [];
  for (let index = 0; index < words.length; index++) {
    const word = words[index];
    if (/^(ext\.?|extension|x)$/i.test(word) && index + 1 < words.length) { parts.push(`${word} ${words[++index]}`); continue; }
    parts.push(word);
  }
  return <Parts parts={parts.map((part, index) => index ? ` ${part}` : part)} />;
}

const SHOWN_LOCATIONS = 5;
/** "All locations" is one line: the count, never a list that arrives late and pushes the page. Assigned locations
 * are listed; past five, a count and the Show all toggle come first, so the toggle stays where it was pressed. */
function Locations({ snapshot, owner }: { snapshot: Extract<ManagerProfileSnapshot, { state: 'ready' }>; owner: boolean }) {
  const [open, setOpen] = useState(false);
  const { scope, names } = snapshot.locations;
  if (!names.length) return <span className="pmp-muted">{owner ? 'No locations yet' : 'None assigned yet'}</span>;
  if (scope === 'all') return <>{names.length === 1 ? names[0] : `All ${names.length} locations`}</>;
  const list = (items: string[], inline = false) => <ul className={inline ? 'pmp-locations pmp-locations--inline' : 'pmp-locations'} id="profile-assigned-locations" aria-label="Locations">{items.map((name, index) => <li key={`${index}-${name}`}>{name}</li>)}</ul>;
  // A short list reads as one line ("Main Office · West Office") and wraps only between names.
  if (names.length <= SHOWN_LOCATIONS) return list(names, true);
  return <>
    <span className="pmp-locations-scope">{names.length} locations</span>
    <button type="button" className="pmp-text-button" aria-expanded={open} aria-controls="profile-assigned-locations" onClick={() => setOpen(value => !value)}>{open ? 'Show fewer' : `Show all ${names.length}`}</button>
    {list(open ? names : names.slice(0, SHOWN_LOCATIONS))}
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
  if (error === 'offline') return 'Not saved. You’re offline.';
  if (error === 'signed_out') return 'Not saved. Sign in again.';
  return 'Not saved. Try again.';
}

/** One alert switch. Without onToggle (re-reading, or a size-holding copy) it reads as busy and ignores presses. */
function TopicRow({ topic, save, on, onToggle, skeleton = false }: { topic: ManagerAlertTopic; save?: AlertSave; on: boolean; onToggle?: (topic: ManagerAlertTopic, on: boolean) => void; skeleton?: boolean }) {
  const busy = !!save?.pending || !onToggle;
  // Loading rows: the expected words drawn as grey text-shaped bars, so each row is exactly a ready row's size.
  if (skeleton) return <li aria-hidden="true"><div className="nv-row pmp-switch-row pmp-topic-placeholder">
    <span className="nv-row__text"><span className="nv-row__title"><span className="pmp-ghost">{topic.label}</span></span><span className="nv-row__meta"><span className="pmp-ghost">{topic.detail}</span></span></span>
    <span className="pmp-switch" data-on="false" />
  </div></li>;
  return <li>
    {/* While busy it says so and ignores presses, but stays enabled, so keyboard focus stays on it. */}
    <button type="button" role="switch" aria-checked={on} className="nv-row pmp-switch-row" data-topic={topic.id}
      aria-disabled={busy || undefined} aria-busy={save?.pending || undefined} onClick={() => { if (!busy) onToggle?.(topic, !on); }}>
      <span className="nv-row__text"><span className="nv-row__title">{topic.label}</span>
        {/* The detail, "Saving…" and a failed save share one cell sized to the longest, so the row never changes height. */}
        <span className="nv-row__meta pmp-meta-stack">
          <span data-shown={!save?.pending && !save?.error}>{topic.detail}</span>
          <span data-shown={!!save?.pending}>Saving…</span>
          <span data-shown={!save?.pending && !!save?.error} className="pmp-save-error"><WarningCircleIcon weight="fill" aria-hidden="true" /><span>{saveMessage(save?.error ?? 'offline')}</span></span>
        </span></span>
      <span className="pmp-switch" data-on={on} aria-hidden="true" />
    </button>
  </li>;
}

export function ManagerProfileView({ identity, state, onRetry, saves = {}, overrides = {}, onToggle, retrying = false, retried = null, announcement = '', held = null, rowHeights = null }: View) {
  const ready = !state.paused && state.snapshot?.state === 'ready' ? state.snapshot : null;
  const read = readState(state), row = 'row' in read ? read.row : undefined;
  // Approved set: without payroll an Owner isn't told about payroll, even if the read lists the topic (switched off).
  const visible = (snapshot: Ready | null): Ready | null => snapshot && identity.payrollAlerts === false ? { ...snapshot, alerts: snapshot.alerts.filter(topic => topic.id !== 'payroll-ready') } : snapshot;
  // Re-reading after a return keeps the last values on screen; paused, offline and failed keep only their size.
  const shown = visible(ready ?? (read.kind === 'loading' ? held : null));
  const sized = !shown && read.kind !== 'denied' ? visible(held) : null;
  const cell = (value: (snapshot: Ready) => ReactNode) => shown ? value(shown)
    : sized ? <span className="pmp-hold"><span className="pmp-hold-value" aria-hidden="true">{value(sized)}</span><span className="pmp-hold-note"><Placeholder text={row} /></span></span>
    : <Placeholder text={row} />;
  const note = read.kind === 'paused'
    ? read.head === 'You’re offline' ? 'You’re offline. Your alert choices show again when you’re back online.' : 'Updates paused. Your alert choices show again when you come back to this window.'
    : read.kind === 'denied' ? 'Your session ended. Sign in again to see your alert choices.' : 'Your alert choices couldn’t load.';
  const rowStyle = (row: string) => read.kind === 'denied' && rowHeights?.[row] ? { minHeight: rowHeights[row] } : undefined;
  const said = read.kind === 'failed' && retried === 'failed' ? 'Still couldn’t load your contact details, locations and alert choices.' : 'said' in read ? read.said : '';
  // What sizes the alert list while there is no ready read: the last read, or else the role's expected topics.
  const sizing = visible(held)?.alerts ?? (identity.owner ? identity.payrollAlerts === false ? ALERT_TOPIC_SIZING.manager : ALERT_TOPIC_SIZING.owner : ALERT_TOPIC_SIZING.manager);
  return <div className="pmp-grid">
    <div className="pmp-col">
      <Card id="profile-details" title="Your details" meta={<>
        {/* Never empty: the head lines up on this text's baseline in every state. */}
        {/* The head lines up on the first text in it: the state word, a non-breaking space, or the action. An empty span
            would give it a made-up baseline, so it is left out when an action shows (the alert below speaks for it). */}
        {read.kind === 'failed' || read.kind === 'denied' ? null : <span>{read.head ?? '\u00a0'}</span>}
        {/* Never disabled while busy, so focus stays on it; a second press only restarts the same read. */}
        {read.kind === 'failed' ? <button type="button" className="pmp-text-button pmp-head-action" aria-busy={retrying || undefined} aria-describedby="profile-read-said" onClick={() => onRetry('details')}><Labels busy={retrying} idle="Try again" working="Trying again…" /></button> : null}
        {read.kind === 'denied' ? <Link className="pmp-text-button pmp-head-action" href="/login">Sign in</Link> : null}
      </>} foot={identity.owner
        ? <KitLink href={`/app/employees/${encodeURIComponent(identity.employeeId)}`}>Edit your details</KitLink>
        : <p className="pmp-foot-copy">Something wrong here? Ask the account owner to update it.</p>}>
        <p className="sr-only" role="alert" id="profile-read-said">{said}</p>
        {/* Always present, so what it says is spoken: a pause, or the result of a retry the reader asked for. */}
        <p className="sr-only" role="status">{read.kind === 'paused' ? read.head : read.kind === 'ready' && retried === 'loaded' ? 'Your details loaded.' : ''}</p>
        <dl className="pmp-details" id="profile-details-list" tabIndex={-1} aria-labelledby="profile-details-title">
          <div><dt>Name</dt><dd>{identity.name}</dd></div>
          <div><dt>Role</dt><dd>{identity.owner ? 'Owner' : 'Manager'}</dd></div>
          <div><dt>Company</dt><dd>{identity.company}</dd></div>
          <div><dt>Time zone</dt><dd>{identity.timeZone}</dd></div>
          {/* The read's rows come last, so a value that arrives taller only pushes what is below the card. */}
          <div data-row="email" style={rowStyle('email')}><dt>Email</dt><dd>{cell(snapshot => snapshot.contact.email ? <Email address={snapshot.contact.email} /> : <span className="pmp-muted">Not added</span>)}</dd></div>
          <div data-row="phone" style={rowStyle('phone')}><dt>Phone</dt><dd>{cell(snapshot => snapshot.contact.phone ? <Phone number={snapshot.contact.phone} /> : <span className="pmp-muted">Not added</span>)}</dd></div>
          <div data-row="locations" style={rowStyle('locations')}><dt>Locations</dt><dd>{cell(snapshot => <Locations snapshot={snapshot} owner={identity.owner} />)}</dd></div>
        </dl>
      </Card>
    </div>
    <div className="pmp-col">
      {identity.payHref ? <Card id="profile-pay" title="Pay">
        <Rows><Row href={identity.payHref} leading={<Tile><ReceiptIcon size={20} aria-hidden="true" /></Tile>} title="My pay" meta="Your pay statements" /></Rows>
      </Card> : null}
      <Card id="profile-notifications" title="Notifications">
        <Rows>
          <Row href="/app/notifications" leading={<Tile><BellIcon size={20} aria-hidden="true" /></Tile>} title="All notifications" meta="Requests, schedule changes and team updates" />
          {identity.deviceAlerts
            ? <li><button type="button" className="nv-row pmp-button-row" data-leading="true" popoverTarget="portal-device-settings">
                <Tile><DeviceMobileIcon size={20} aria-hidden="true" /></Tile>
                <span className="nv-row__text"><span className="nv-row__title">Alerts on this device</span><span className="nv-row__meta">Choose how this device alerts you</span></span>
                <CaretRightIcon className="nv-row__chev" size={18} weight="bold" aria-hidden="true" />
              </button></li>
            : <li><div className="nv-row" data-leading="true"><Tile><DeviceMobileIcon size={20} aria-hidden="true" /></Tile><span className="nv-row__text"><span className="nv-row__meta pmp-note">Alerts on this device aren’t turned on for your workplace yet.</span></span></div></li>}
        </Rows>
        <h3 className="pmp-subhead" id="profile-alerts-title">You’re told about</h3>
        <ul className="nv-rows pmp-topics" id="profile-alerts-list" tabIndex={-1} aria-labelledby="profile-alerts-title">
          {shown ? shown.alerts.map(topic => <TopicRow key={topic.id} topic={topic} save={saves[topic.id]} on={overrides[topic.id] ?? topic.on} onToggle={ready ? onToggle : undefined} />)
            : read.kind === 'loading' ? sizing.map(topic => <TopicRow key={topic.id} topic={topic} on={false} skeleton />)
            // Any other state says what happened where the alert rows are, over their hidden copy, so nothing below moves.
            : <li className="pmp-hold pmp-topics-hold">
                <ul className="nv-rows pmp-hold-value" aria-hidden="true">{sizing.map(topic => <TopicRow key={topic.id} topic={topic} on={topic.on} />)}</ul>
                <div className="pmp-topics-note pmp-hold-note">
                  <Tile tone={read.kind === 'paused' ? 'neutral' : 'urgent'}>{read.kind === 'paused' ? <PauseCircleIcon size={20} aria-hidden="true" /> : <WarningCircleIcon size={20} weight="fill" aria-hidden="true" />}</Tile>
                  <p>{note}</p>
                  {read.kind === 'denied' ? <Link className="nv-btn" data-kind="secondary" href="/login">Sign in</Link> : null}
                  {read.kind === 'failed' ? <button type="button" className="nv-btn" data-kind="secondary" aria-busy={retrying || undefined} aria-describedby="profile-read-said" onClick={() => onRetry('alerts')}><Labels busy={retrying} idle="Try again" working="Trying again…" /></button> : null}
                </div>
              </li>}
        </ul>
        <p className="sr-only" role="status">{announcement}</p>
        {shown && !shown.alerts.length ? <p className="pmp-empty">No alert choices for your role yet.</p> : null}
      </Card>
      <section className="nv-card pmp-signout" aria-label="Session">
        <PortalSignout><ul className="nv-rows"><li><SignOutButton /></li></ul></PortalSignout>
      </section>
    </div>
  </div>;
}

/** `initial`: the same read done on the server (CODEX.md, optional), so the page arrives with its details already
 * in place and nothing moves when the client's first read lands. Without it the client reads after hydration. */
function focusedTopic(): string | null {
  const active = document.activeElement;
  return active instanceof HTMLElement && active.dataset.topic ? active.dataset.topic : null;
}

export function ManagerProfileLive({ identity, initial = null }: { identity: ManagerProfileIdentity; initial?: Ready | null }) {
  const [state, setState] = useState<PrivatePanelState<ManagerProfileSnapshot>>({ snapshot: null, paused: false, refreshing: true });
  const [saves, setSaves] = useState<Record<string, AlertSave>>({});
  const [overrides, setOverrides] = useState<Record<string, { on: boolean; basis: string }>>({});
  const [held, setHeld] = useState<Ready | null>(initial);
  const [rowHeights, setRowHeights] = useState<Record<string, number> | null>(null);
  // A retry the reader asked for: pending until its read answers, then its outcome, tied to that one answer so
  // returning to the window later doesn't announce it again.
  const [retried, setRetried] = useState<{ pending: boolean; outcome: 'loaded' | 'failed' | null; snapshot: ManagerProfileSnapshot | null; from?: 'details' | 'alerts' }>({ pending: false, outcome: null, snapshot: null });
  const retryPending = useRef(false);
  // The switch that had focus when the page was left or a save ended the session: given focus back once, then forgotten.
  const restoreTo = useRef<string | null>(null);
  const [announced, setAnnounced] = useState({ text: '', count: 0 });
  const inFlight = useRef(new Set<string>());
  const control = useRef<ReturnType<typeof createPrivateSnapshotController<ManagerProfileSnapshot>> | null>(null);

  useEffect(() => {
    // Same privacy rhythm as the employee Profile: details clear when the window is left, and re-read on return.
    const changed = (next: PrivatePanelState<ManagerProfileSnapshot>) => {
      setState(next);
      if (retryPending.current && (next.paused || (!next.refreshing && next.snapshot))) {
        retryPending.current = false;
        setRetried(current => next.paused || !next.snapshot ? { pending: false, outcome: null, snapshot: null } : { pending: false, outcome: next.snapshot.state === 'ready' ? 'loaded' : 'failed', snapshot: next.snapshot, from: current.from });
      }
      if (next.snapshot?.state === 'ready') { setHeld(next.snapshot); setRowHeights(null); }
      else if (next.snapshot?.state === 'unavailable' && next.snapshot.reason === 'access_denied') {
        // An ended session keeps no values, only how tall their rows were, so the page doesn't jump (ST-02).
        setRowHeights(current => current ?? Object.fromEntries([...document.querySelectorAll<HTMLElement>('#profile-details [data-row]')].map(row => [row.dataset.row ?? '', row.getBoundingClientRect().height])));
        setHeld(null);
      }
    };
    const controller = createPrivateSnapshotController<ManagerProfileSnapshot>(changed, async signal => {
      const response = await fetch(MANAGER_PROFILE_ENDPOINT, { cache: 'no-store', credentials: 'same-origin', redirect: 'error', signal, headers: { Accept: 'application/json' } });
      if (response.status === 401 || response.status === 403) return { state: 'unavailable', reason: 'access_denied' };
      if (!response.ok) throw Error('Profile unavailable');
      return response.json();
    }, parseManagerProfile, reason => ({ state: 'unavailable', reason }), () => 'read_failed');
    control.current = controller;
    let mounted = true, away = true;
    // Leaving (blur, hidden, offline, page hidden) clears the read; coming back starts one. A focus or pageshow while
    // the page never left does nothing, so a finished read isn't thrown away and read twice (ST-01).
    const leave = () => { away = true; restoreTo.current = focusedTopic(); controller.pause(); };
    const back = () => {
      if (document.visibilityState === 'hidden' || !navigator.onLine) { leave(); return; }
      if (!away) return;
      away = false; controller.start();
    };
    const shown = (event: PageTransitionEvent) => { if (event.persisted) { away = true; back(); } };
    document.addEventListener('visibilitychange', back);
    for (const event of ['blur', 'pagehide', 'offline']) window.addEventListener(event, leave);
    for (const event of ['focus', 'online']) window.addEventListener(event, back);
    window.addEventListener('pageshow', shown);
    // Kept row heights belong to the width they were measured at; a resize lets the rows size themselves again.
    const resized = () => setRowHeights(null);
    window.addEventListener('resize', resized);
    void Promise.resolve().then(() => { if (mounted) back(); });
    return () => {
      mounted = false; controller.stop(); control.current = null;
      document.removeEventListener('visibilitychange', back);
      for (const event of ['blur', 'pagehide', 'offline']) window.removeEventListener(event, leave);
      for (const event of ['focus', 'online']) window.removeEventListener(event, back);
      window.removeEventListener('pageshow', shown);
      window.removeEventListener('resize', resized);
    };
  }, []);

  // A saved choice shows until a newer read arrives; from then on the read is the truth.
  const ready = state.snapshot?.state === 'ready' ? state.snapshot : null;
  const shownOverrides = Object.fromEntries(Object.entries(overrides).filter(([, saved]) => ready?.observedAt === saved.basis).map(([id, saved]) => [id, saved.on]));

  const retrying = retried.pending && state.refreshing;
  const outcome = retried.outcome && state.snapshot === retried.snapshot ? retried.outcome : null;
  const retry = (from: 'details' | 'alerts' = 'details') => { retryPending.current = true; setRetried({ pending: true, outcome: null, snapshot: null, from }); control.current?.refresh(); };
  const retriedFrom = retried.from;

  // Focus never falls to the page: a successful retry moves it to the details it loaded (the button is gone); a switch
  // that had focus when the page was left gets it back once when the list returns; an ended session moves it to Sign in.
  // Only when focus would otherwise be nowhere, and without scrolling, so a reader who moved on is never pulled back.
  const denied = state.snapshot?.state === 'unavailable' && state.snapshot.reason === 'access_denied';
  useEffect(() => {
    const lost = !document.activeElement || document.activeElement === document.body;
    if (!lost) { if (ready || denied) restoreTo.current = null; return; }
    // To what loaded where the reader pressed Try again: the details for the head's button, the alert list for the
    // panel's (IS-16), so focus is never placed far off screen.
    if (outcome === 'loaded') { document.getElementById(retriedFrom === 'alerts' ? 'profile-alerts-list' : 'profile-details-list')?.focus({ preventScroll: true }); return; }
    const topic = restoreTo.current;
    if (!topic || !(ready || denied)) return;
    restoreTo.current = null;
    const target = ready ? document.querySelector<HTMLElement>(`[data-topic="${CSS.escape(topic)}"]`) : document.querySelector<HTMLElement>('.pmp-topics-note a');
    target?.focus({ preventScroll: true });
  }, [outcome, ready, denied, retriedFrom]);

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
    // Each failure is spoken once with its own topic; a repeat of the same words still changes the region.
    if (error) setAnnounced(current => ({ text: `${topic.label}: ${saveMessage(error)}`, count: current.count + 1 }));
    // A saved choice is re-read; an ended session is re-read too, so the card's head offers Sign in.
    if (error === 'signed_out') restoreTo.current = focusedTopic();
    if (!error || error === 'signed_out') control.current?.refresh();
  }

  return <ManagerProfileView identity={identity} state={state} onRetry={retry} retrying={retrying} retried={outcome} saves={saves} overrides={shownOverrides} onToggle={toggle}
    held={held} rowHeights={rowHeights} announcement={announced.text ? announced.text + (announced.count % 2 ? '' : '\u00a0') : ''} />;
}
