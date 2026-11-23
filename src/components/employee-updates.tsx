'use client';

import {keepWhole} from '@/lib/keep-whole';
import Link from 'next/link';
import {QuietHeader, QuietNav} from '@/components/quiet/quiet';
import {useState} from 'react';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';

import {updateKinds} from './update-visual';
import {PlusIcon} from '@phosphor-icons/react/dist/ssr/Plus';
import {useCommunicationResource, type CommunicationMode} from '../lib/communications/client';
import type {CommunicationListRead, CommunicationRead} from '../lib/communications/types';
import {ManagerUpdatesView, type ManagerListStatus} from './messages-manager-b';
import './updates-review.css';
import {usePortalLang} from '@/lib/i18n/portal-lang';
import {employeeUpdatesCopy, UPDATES_LOCALE} from './employee-updates-copy';

type ReadyUpdate = Extract<CommunicationRead, {state: 'ready'}>;
type Filter = 'all' | 'to-review' | 'reviewed';
const isReviewed = (item: ReadyUpdate) => Boolean(item.acknowledgement === 'REQUIRED' ? item.ownAcknowledgedAt : item.ownReadAt || item.ownAcknowledgedAt);

export function EmployeeUpdatesView({list, mode, paused, refreshing, unavailableReason, onRefresh, places}: {
 /** Owners and Managers: each location's name, when they manage more than one. */
 places?: Record<string, string> | null;
 list: Extract<CommunicationListRead, {state: 'complete' | 'partial'}> | null;
 mode: CommunicationMode;
 paused: boolean;
 refreshing: boolean;
 unavailableReason?: string;
 onRefresh: () => void;
}) {
  // H4 QA: a 401 (session_ended) and a 403 (access_denied) both mean signing in again; a 401 showed "Couldn’t load" with a Try again that kept failing.
  const signedOut = unavailableReason === 'access_denied' || unavailableReason === 'session_ended';
 const lang = usePortalLang(), t = employeeUpdatesCopy(lang), locale = UPDATES_LOCALE[lang];
 const [filter, setFilter] = useState<Filter>('all');
 const [refreshFrom, setRefreshFrom] = useState<string | null>(null);
 const current = paused ? null : list;
 const items = current?.items.filter((item): item is ReadyUpdate => item.state === 'ready') ?? [];
 const inReviewGroup = (item: ReadyUpdate) => mode === 'manager' ? item.acknowledgement === 'REQUIRED' : !isReviewed(item);
 const toReview = items.filter(inReviewGroup).length;
 const visible = items.filter(item => filter === 'all' || (filter === 'to-review' ? inReviewGroup(item) : !inReviewGroup(item)));
 const groups = new Map<string, ReadyUpdate[]>();
 for (const item of visible) {
  const date = new Intl.DateTimeFormat(locale, {timeZone: item.timeZone, dateStyle: 'long'}).format(new Date(item.publishedAt));
  groups.set(date, [...(groups.get(date) ?? []), item]);
 }
 const filters = [{id: 'all', label: t.all, count: items.length}, {id: 'to-review', label: mode === 'manager' ? t.required : t.toReview, count: toReview}, {id: 'reviewed', label: mode === 'manager' ? t.optional : t.reviewed, count: items.length - toReview}] as const;
 const emptyTitle = current?.state === 'partial' ? t.emptyPartial : filter === 'all' ? t.emptyAll : mode === 'manager' ? filter === 'to-review' ? t.emptyRequired : t.emptyOptional : filter === 'to-review' ? t.emptyToReview : t.emptyReviewed;
 const emptyDescription = current?.state === 'partial' ? t.descPartial : filter === 'all' ? t.descAll : mode === 'manager' ? t.descManager : filter === 'reviewed' ? t.descReviewed : t.descToReview;

 // Phase 3: the kit band; the compose action leads the content column. Clean Manager (v3): for managers at 1300px and wider
 // it sits in the top bar, as the mockups place page actions.

 // A Refresh the reader asked for says so until a newer read lands (as on the Inbox); background polls stay quiet.
 const userRefreshing = refreshFrom !== null && current?.observedAt === refreshFrom;
 if (refreshFrom !== null && !userRefreshing) setRefreshFrom(null);
 if (mode === 'manager') {
  // Phase 2 (package Messages, Nov 23, 2026): Owners and Managers get the Direction B Updates (messages-manager-b.tsx).
  // The read, its states and the links are the same; the list, its band and its cards are the kit's.
  const offline = paused && typeof navigator !== 'undefined' && navigator.onLine === false;
  const status: ManagerListStatus | null = current ? null
   : paused ? {kind: offline ? 'offline' : 'paused', title: t.pausedTitle, line: t.pausedLine}
   : signedOut ? {kind: 'locked', title: t.endedTitle, line: t.endedLine, action: {label: t.signIn, href: '/login'}}
   : unavailableReason ? {kind: 'failed', title: t.failedTitle, line: t.failedLine, action: {label: t.tryAgain, onClick: () => { setRefreshFrom(null); onRefresh(); }, busy: refreshing}}
   : {kind: 'loading', title: t.loading};
  return <>
   <ManagerUpdatesView list={current} status={status} partial={current?.state === 'partial'} places={places ?? null} />
   <span className="c-sr" role="status">{userRefreshing ? t.refreshing : ''}</span>
  </>;
 }
 // v5 "One look" (Jose approved round 2 "exactly like this" on Oct 24, 2026; mockup E13): Back to More, Plus messages
 // today's team, the segments, one row per update, and the note that opening doesn't confirm. Same reads and states.
 const required = items.filter(item => !isReviewed(item) && item.acknowledgement === 'REQUIRED').length;
 const longDate = (item: ReadyUpdate) => new Intl.DateTimeFormat(locale, {timeZone: item.timeZone, dateStyle: 'long'}).format(new Date(item.publishedAt));
 const shortDate = (item: ReadyUpdate) => keepWhole(new Intl.DateTimeFormat(locale, {timeZone: item.timeZone, month: 'short', day: 'numeric'}).format(new Date(item.publishedAt)));
 const status = (item: ReadyUpdate) => item.ownAcknowledgedAt ? t.acknowledged : item.acknowledgement === 'REQUIRED' ? t.reviewNeeded : item.ownReadAt ? t.reviewed : t.notRead;
 const stateText = paused ? t.statePaused : signedOut ? t.stateEnded : unavailableReason ? t.stateFailed : t.loading;
 const sub = !current ? '\u00a0' : required ? t.toConfirm(required) : toReview ? t.toReviewCount(toReview) : t.caughtUp;
 const kind = (item: ReadyUpdate) => updateKinds[item.type];
 return <div className="q-page q-updates-e" data-nv-page="">
  <QuietNav back={{href: '/app/more', label: t.more}} right={<Link className="q-nav__r q-nav__r--ink" href="/app/updates/compose" aria-label={t.messageTeam}><PlusIcon weight="bold" className="q-ic" aria-hidden="true" /></Link>} />
  <QuietHeader title={t.title} sub={sub} />
  <section aria-label={t.workplaceUpdates} aria-busy={refreshing}>
   <div className="q-seg" role="group" aria-label={t.filter}>{filters.map(option => <button key={option.id} type="button" aria-pressed={filter === option.id} disabled={!current} onClick={() => setFilter(option.id)}>{option.id !== 'all' && current && option.count ? `${option.label} ${option.count}` : option.label}</button>)}</div>
   {current?.state === 'partial' ? <p className="q-help" role="status">{t.partialHelp}</p> : null}
   {!current ? <div role="status" style={{marginTop: 24}}><p className="q-empty">{stateText}</p>
     {signedOut ? <Link className="q-btn q-btn--sec" href="/login">{t.signIn}</Link> : unavailableReason ? <button type="button" className="q-btn q-btn--sec" disabled={paused || refreshing} onClick={onRefresh}>{refreshing ? t.checking : t.tryAgain}</button> : null}</div>
    : visible.length ? <ul className="q-list updates-list" style={{marginTop: 16}}>{visible.map(item => {
     const {Icon, label} = kind(item);
     return <li key={item.id}><Link className="q-row q-row--av" href={'/app/updates/' + item.id} prefetch={false} aria-label={`${item.title}, ${label}, ${status(item)}, ${longDate(item)}`}>
      <span className={`q-av${!isReviewed(item) ? ' q-av--tint' : ''}`} aria-hidden="true"><Icon weight="bold" className="q-ic" /></span>
      <span className="q-rt"><b>{item.title}</b><i>{[item.authorContext, `${status(item)} ${shortDate(item)}`].filter(Boolean).join(' · ')}</i></span>
      <CaretRightIcon weight="bold" className="q-chev" aria-hidden="true" />
     </Link></li>;
    })}</ul>
    : <div role="status" style={{marginTop: 24}}><p className="q-empty">{emptyTitle}. {emptyDescription}</p>{filter !== 'all' ? <button type="button" className="q-btn q-btn--quiet" onClick={() => setFilter('all')}>{t.viewAll}</button> : null}</div>}
  </section>
  <p className="q-help">{t.openingNote}</p>
 </div>;
}

export function EmployeeUpdates({authority, mode}: {authority: string; mode: CommunicationMode}) {
 return mode === 'manager' ? <ManagerUpdates authority={authority} /> : <EmployeeUpdatesRead authority={authority} mode={mode} />;
}
function EmployeeUpdatesRead({authority, mode}: {authority: string; mode: CommunicationMode}) {
 const {state, value, refresh} = useCommunicationResource(mode, authority, '');
 const list = value && 'items' in value ? value : null;
 return <EmployeeUpdatesView list={list} mode={mode} paused={state.paused} refreshing={state.refreshing} unavailableReason={state.snapshot?.state === 'unavailable' ? state.snapshot.reason : undefined} onRefresh={refresh} />;
}
/** Owners and Managers: the list, and the places they can write to (the compose page's own read), so a row can say where
 * it went when there is more than one place. */
function ManagerUpdates({authority}: {authority: string}) {
 const {state, value, refresh} = useCommunicationResource('manager', authority, '');
 const context = useCommunicationResource('manager', authority, '/context').value;
 const list = value && 'items' in value ? value : null;
 const locations = context && 'locations' in context && context.state === 'ready' ? context.locations : [];
 const places = locations.length > 1 ? Object.fromEntries(locations.map(location => [location.id, location.label])) : null;
 return <EmployeeUpdatesView list={list} mode="manager" paused={state.paused} refreshing={state.refreshing} unavailableReason={state.snapshot?.state === 'unavailable' ? state.snapshot.reason : undefined} onRefresh={refresh} places={places} />;
}
