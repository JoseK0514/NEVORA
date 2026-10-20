'use client';

import {keepWhole} from '@/lib/keep-whole';
import {PageBand} from './kit/kit';
import {KeepSelectedVisible} from './kit/keep-selected-visible';
import Link from 'next/link';
import {useState} from 'react';
import {CheckCircleIcon} from '@phosphor-icons/react/dist/ssr/CheckCircle';
import {TrayIcon} from '@phosphor-icons/react/dist/ssr/Tray';
import {NavIcon} from './nav-icon';
import {HoldHeight} from './kit/hold-height';
import {UpdateEntrance, UpdateKind} from './update-visual';
import {useCommunicationResource, type CommunicationMode} from '../lib/communications/client';
import type {CommunicationListRead, CommunicationRead} from '../lib/communications/types';
import './updates-review.css';

type ReadyUpdate = Extract<CommunicationRead, {state: 'ready'}>;
type Filter = 'all' | 'to-review' | 'reviewed';
const isReviewed = (item: ReadyUpdate) => Boolean(item.acknowledgement === 'REQUIRED' ? item.ownAcknowledgedAt : item.ownReadAt || item.ownAcknowledgedAt);

export function EmployeeUpdatesView({list, mode, paused, refreshing, unavailableReason, onRefresh}: {
 list: Extract<CommunicationListRead, {state: 'complete' | 'partial'}> | null;
 mode: CommunicationMode;
 paused: boolean;
 refreshing: boolean;
 unavailableReason?: string;
 onRefresh: () => void;
}) {
  // H4 QA: a 401 (session_ended) and a 403 (access_denied) both mean signing in again; a 401 showed "Couldn’t load" with a Try again that kept failing.
  const signedOut = unavailableReason === 'access_denied' || unavailableReason === 'session_ended';
 const [filter, setFilter] = useState<Filter>('all');
 const current = paused ? null : list;
 const items = current?.items.filter((item): item is ReadyUpdate => item.state === 'ready') ?? [];
 const inReviewGroup = (item: ReadyUpdate) => mode === 'manager' ? item.acknowledgement === 'REQUIRED' : !isReviewed(item);
 const toReview = items.filter(inReviewGroup).length;
 const visible = items.filter(item => filter === 'all' || (filter === 'to-review' ? inReviewGroup(item) : !inReviewGroup(item)));
 const groups = new Map<string, ReadyUpdate[]>();
 for (const item of visible) {
  const date = new Intl.DateTimeFormat('en-US', {timeZone: item.timeZone, dateStyle: 'long'}).format(new Date(item.publishedAt));
  groups.set(date, [...(groups.get(date) ?? []), item]);
 }
 const filters = [{id: 'all', label: 'All', count: items.length}, {id: 'to-review', label: mode === 'manager' ? 'Required' : 'To review', count: toReview}, {id: 'reviewed', label: mode === 'manager' ? 'Optional' : 'Reviewed', count: items.length - toReview}] as const;
 const emptyTitle = current?.state === 'partial' ? 'No updates available in this view' : filter === 'all' ? 'No current updates' : mode === 'manager' ? filter === 'to-review' ? 'No updates requiring acknowledgement' : 'No optional updates' : filter === 'to-review' ? 'No updates waiting for review' : 'No reviewed updates yet';
 const emptyDescription = current?.state === 'partial' ? 'Some updates could not be checked. Refresh to try again.' : filter === 'all' ? 'New workplace updates will appear here.' : mode === 'manager' ? 'View all updates to check other review requirements.' : filter === 'reviewed' ? 'Updates you mark read or acknowledge will appear here.' : 'You can still find your reviewed updates in All.';

 // Phase 3: the kit band; the compose action leads the content column.
 return <UpdateEntrance className="employee-view communication-view updates-page">
  <div className="nv-page premium-updates" data-nv-page="">
  <PageBand title="Updates" summary="Workplace news and notes, all in one place." overlap={false}/>
  <div className="premium-employee-content">
  <Link className="nv-btn updates-compose" data-kind="secondary" href="/app/updates/compose"><NavIcon name={mode === 'manager' ? 'updates' : 'employees'} />{mode === 'manager' ? 'Create update' : "Message today’s team"}</Link>
  <section className="updates-inbox" aria-label="Workplace updates" aria-busy={refreshing}>
   <div className="updates-toolbar">
    {/* P3-ST-05: the filters are there from the first frame (disabled, counts "–" until read), so the list never jumps down. */}
    <fieldset className="updates-filters" disabled={!current}><legend className="sr-only">Filter updates</legend>{filters.map(option => <button key={option.id} type="button" aria-pressed={filter === option.id} onClick={() => setFilter(option.id)}>{option.label}<span className="updates-filter-count">{current ? option.count : '–'}</span></button>)}<KeepSelectedVisible /></fieldset>
    {/* Signed out, Refresh would only fetch the same refusal; Sign in is the way forward (QA r3). */}
    {signedOut ? null : <button type="button" className="updates-refresh" disabled={paused || refreshing} onClick={onRefresh}><NavIcon name="refresh" /><span>{refreshing ? 'Checking…' : unavailableReason ? 'Try again' : 'Refresh'}</span></button>}
   </div>
   {/* QA r3: paused, offline, a failed read or a signed-out read keeps the list's height; the state shows in its place. */}
   <HoldHeight holding={!current} memory={`updates-${mode}`}>
   {current?.state === 'partial' ? <p className="updates-partial" role="status"><NavIcon name="alert" />Some updates couldn’t load. Try again to check for the rest.</p> : null}
   {!current ? <div className="updates-empty" role="status"><TrayIcon size={32} aria-hidden="true" /><h2>{paused ? 'Updates paused' : signedOut ? 'Your session ended' : unavailableReason ? 'Couldn’t load updates' : 'Loading updates…'}</h2><p>{paused ? 'Return online and to this page to refresh.' : signedOut ? 'Sign in again to see updates.' : unavailableReason ? 'Check your connection, then try again.' : 'Checking for current workplace updates.'}</p>{signedOut ? <Link className="nv-btn" data-kind="primary" href="/login">Sign in</Link> : null}</div> : visible.length ? <div className="updates-groups">{[...groups].map(([date, rows]) => <section className="updates-date-group" key={date} aria-label={date}>
    <h2>{keepWhole(date)}</h2><ul className="updates-list">{rows.map(item => {
     const reviewed = isReviewed(item);
     const status = mode === 'manager' ? item.acknowledgement === 'REQUIRED' ? 'Acknowledgement required' : 'Optional update' : item.ownAcknowledgedAt ? 'Acknowledged' : item.acknowledgement === 'REQUIRED' ? 'Review needed' : item.ownReadAt ? 'Read' : 'Not read';
     return <li key={item.id}><Link className={`updates-row${reviewed ? ' is-reviewed' : ''}`} href={'/app/updates/' + item.id} prefetch={false}>
      <UpdateKind type={item.type} iconOnly />
      <div className="updates-row-copy"><div className="updates-row-meta">{/* Clean Manager (v3): one label per row for managers (the status); employees keep the kind too. */}{mode === 'manager' ? null : <UpdateKind type={item.type} />}<span className={`updates-status${reviewed ? ' is-reviewed' : ''}`}>{reviewed ? <CheckCircleIcon size={14} aria-hidden="true" /> : <span className="updates-status-dot" aria-hidden="true" />}{status}</span></div><h3>{item.title}</h3><p className="updates-preview">{item.body}</p><time dateTime={item.publishedAt}>{keepWhole(new Intl.DateTimeFormat('en-US', {timeZone: item.timeZone, dateStyle: 'medium', timeStyle: 'short'}).format(new Date(item.publishedAt)))}</time></div>
      <span className="updates-row-action"><span>Review update</span><NavIcon name="arrowRight" /></span>
     </Link></li>;
    })}</ul>
   </section>)}</div> : <div className="updates-empty" role="status"><TrayIcon size={32} aria-hidden="true" /><h2>{emptyTitle}</h2><p>{emptyDescription}</p>{filter !== 'all' ? <button className="button secondary" onClick={() => setFilter('all')}>View all updates</button> : null}</div>}
   </HoldHeight>
  </section>
  {/* Clean Manager (v3): the manager footnote goes; the employee one prevents a mistake and stays. */}
  {mode === 'manager' ? null : <p className="updates-footnote">Opening an update doesn’t confirm it. Read the full message, then confirm.</p>}
  </div>
  </div>
 </UpdateEntrance>;
}

export function EmployeeUpdates({authority, mode}: {authority: string; mode: CommunicationMode}) {
 const {state, value, refresh} = useCommunicationResource(mode, authority, '');
 const list = value && 'items' in value ? value : null;
 return <EmployeeUpdatesView list={list} mode={mode} paused={state.paused} refreshing={state.refreshing} unavailableReason={state.snapshot?.state === 'unavailable' ? state.snapshot.reason : undefined} onRefresh={refresh} />;
}
