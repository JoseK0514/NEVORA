'use client';

import Link from 'next/link';
import {Fragment, useRef, useState, type ReactNode} from 'react';
import {BellIcon} from '@phosphor-icons/react/dist/ssr/Bell';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {BCard, BIcon, BSeg, BSegs, BState} from './owner-b/b-kit';
import {CorpSegments} from './corp/corp';
import {useEmployeeAccountRead} from './employee-account-panel';
import {notificationIcons, reviewLabels, rowFacts, rowText} from './notification-inbox';
import {notificationGroup} from './employee-mobile/notifications-list';
import {ManagerMessagesPage, ManagerStateCard, type ManagerListStatus} from './messages-manager-b';
import {collapseNotifications, notificationPresentation, notificationTitle} from '../lib/notification-inbox-view';
import {relativeTimeText} from '../lib/duration-format';
import type {EmployeeNotificationItem} from '../lib/employee-view';

/* Notifications for Owners and Managers, Direction B (Phase 2, package Messages, Nov 23, 2026; B3). The same read
 * (/api/notifications), the same Mark read on open and the same folds as before (notification-inbox.tsx), drawn as the
 * Lead's and Employee's Notifications are (employee-b/messages-b.tsx): All and Unread in the band, then one card per day
 * (Today, Yesterday, Earlier) of rows with the kind's icon, a teal dot while unread and the time. */

type Filter = 'all' | 'unread';
const GROUPS = ['Today', 'Yesterday', 'Earlier'] as const;

export function ManagerNotifications({authority, notice}: {authority: string; /** The Owner's plan and billing notice, while it applies. */ notice?: ReactNode}) {
  const {state, refresh} = useEmployeeAccountRead('notifications', authority, '/api/notifications');
  const [filter, setFilter] = useState<Filter>('all');
  const [expanded, setExpanded] = useState<string[]>([]);
  const [readFailed, setReadFailed] = useState(false);
  const gate = useRef(false);
  const ready = !state.paused && state.snapshot?.state === 'ready' && state.snapshot.kind === 'notifications' ? state.snapshot : null;
  const denied = state.snapshot?.state === 'unavailable' && state.snapshot.reason === 'access_denied';
  const unavailable = state.snapshot?.state === 'unavailable';
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  const zone = ready?.timeZone;
  // Opening an unread notice marks that one read (never the others in a fold), as before.
  const markRead = async (id: string) => {
    if (gate.current) return; gate.current = true; setReadFailed(false);
    try {
      const response = await fetch('/api/notifications/read', {method: 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000),
        headers: {'Content-Type': 'application/json', 'X-Nevora-Notification-Read': '1', 'X-Nevora-Employee-View': authority}, body: JSON.stringify({notificationId: id})});
      if (!response.ok) throw Error('Read not confirmed');
      refresh(); window.dispatchEvent(new Event('nevora:notifications-changed'));
    } catch { setReadFailed(true); } finally { gate.current = false; }
  };
  const unread = ready ? ready.items.filter(item => item.reviewState === 'unread').length : 0;
  const sorted = ready ? [...ready.items].filter(item => filter === 'all' || item.reviewState === 'unread').sort((a, b) => Date.parse(b.at) - Date.parse(a.at)) : [];
  const now = new Date();
  const groups = GROUPS.map(name => ({name, rows: collapseNotifications(sorted.filter(item => notificationGroup(item.at, zone ?? 'UTC', now) === name))})).filter(group => group.rows.length);
  // A relative time never breaks inside itself on a narrow phone ("5 h ago", not "5 / h ago").
  const ago = (at: string) => relativeTimeText(at, undefined, zone).replace(/(\d+) (h|min|d|days?|hours?|minutes?)\b/g, '$1 $2');
  const lead = (item: EmployeeNotificationItem) => { const Icon = notificationIcons[notificationPresentation(item.label, item.eventType).icon]; return <BIcon tone={item.actionState === 'required' ? 'amber' : 'grey'}><Icon weight="bold" /></BIcon>; };
  const dot = (on: boolean) => on ? <span className="b-row__end mb-when"><i className="mb-dot" aria-hidden="true" /></span> : null;
  const row = (item: EmployeeNotificationItem, held = false) => {
    const review = item.reviewState ?? 'unavailable', text = rowText(item), facts = held ? rowFacts(item) : [];
    return <li className={held ? 'b-li mb-held' : 'b-li'} key={item.id}>
      <Link className="b-row b-row--link" href={item.href} prefetch={false} onClick={() => { if (review === 'unread') void markRead(item.id); }}
>
        {held ? <span className="b-lead-space" aria-hidden="true" /> : lead(item)}
        <span className="b-row__tx">
          {held ? <span className="b-row__t"><span className="b-row__tt">{facts.length ? <BSegs parts={facts} /> : <time dateTime={item.at}>{ago(item.at)}</time>}</span></span>
            : <span className="b-row__t"><span className="b-row__tt">{text.title}</span></span>}
          {held ? facts.length ? <span className="b-row__s"><time dateTime={item.at}>{ago(item.at)}</time></span> : null
            : <span className="b-row__s"><BSegs parts={[text.detail, <time key="at" dateTime={item.at}>{ago(item.at)}</time>]} /></span>}
        </span>
        {dot(review === 'unread')}{review === 'unread' ? <span className="b-sr">{`, ${reviewLabels.unread}`}</span> : null}
        <CaretRightIcon className="b-chev" size={16} weight="bold" aria-hidden="true" />
      </Link>
    </li>;
  };
  const status: ManagerListStatus | null = ready ? null
    : state.paused ? {kind: offline ? 'offline' : 'paused', title: 'Notifications paused', line: 'Come back to this window while online.'}
    : denied ? {kind: 'locked', title: 'Your session ended', line: 'Sign in again to see notifications.', action: {label: 'Sign in', href: '/login'}}
    : unavailable ? {kind: 'failed', title: 'Notifications didn’t load', line: offline ? 'Check your connection, then try again.' : undefined, action: {label: 'Try again', onClick: refresh, busy: state.refreshing}}
    : {kind: 'loading', title: 'Loading notifications…'};
  const cards = <>
    {notice}
    {status ? <ManagerStateCard status={status} /> : <>
      {ready?.coverage === 'partial' ? <p className="b-note mb-note" role="status">Some notifications couldn’t be checked.</p> : null}
      {groups.length ? groups.map(group => <BCard key={group.name} title={group.name} id={'notifications-' + group.name.toLowerCase()}>
        <ul className="b-list" aria-label={group.name + ' notifications'}>{group.rows.map(({item, count, unreadIds, items}) => {
          if (count === 1) return row(item);
          // A fold (repeats of one summary) says how many and the latest; opening it lists each one under it.
          const open = expanded.includes(item.id), listId = `notif-fold-${item.id}`, text = notificationTitle(item);
          return <Fragment key={item.id}>
            <li className="b-li"><button type="button" className="b-row b-row--link" aria-expanded={open} aria-controls={open ? listId : undefined}
              onClick={() => setExpanded(ids => ids.includes(item.id) ? ids.filter(id => id !== item.id) : [...ids, item.id])}>
              {lead(item)}
              <span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">{text.title}</span></span>
                <span className="b-row__s"><BSegs parts={[`${count} notifications`, <span key="at">latest <time dateTime={item.at}>{ago(item.at)}</time></span>]} /></span></span>
              {dot(unreadIds.length > 0)}{unreadIds.length ? <span className="b-sr">{`, ${unreadIds.length} unread`}</span> : null}
              <CaretDownIcon className="b-chev mb-caret" data-open={open || undefined} size={16} weight="bold" aria-hidden="true" />
            </button></li>
            {open ? <li className="b-li mb-fold"><ul className="b-list" id={listId} aria-label={`${text.title}, ${count} notifications`}>{items.map(one => row(one, true))}</ul></li> : null}
          </Fragment>;
        })}</ul>
      </BCard>)
      // MG-008: an empty list doesn't mean nothing is waiting. Requests are decided in Things to do, so the card leads there.
      : <BCard label="Notifications"><BState kind="empty" icon={<BellIcon weight="bold" />} title={filter === 'unread' ? 'You’re all caught up' : 'Nothing new'}
        line={filter === 'unread' ? 'Nothing unread. Earlier notifications stay under All.' : 'Requests from your team are in Things to do.'}
        action={filter === 'unread' ? undefined : {label: 'Open Things to do', href: '/app/inbox'}} /></BCard>}
      {readFailed ? <p className="b-note mb-note" role="status">We couldn’t mark that one read.</p> : null}
      <p className="b-sr" role="status" aria-live="polite">{sorted.length} {sorted.length === 1 ? 'notification' : 'notifications'}{filter === 'unread' ? ' unread' : ''}</p>
    </>}
  </>;
  const tabs = ready && ready.items.length ? [
    {key: 'all', label: 'All', current: filter === 'all', onSelect: () => setFilter('all')},
    {key: 'unread', label: unread ? <>Unread<span className="b-sr"> </span><span className="mb-segn">{unread}</span></> : 'Unread', current: filter === 'unread', onSelect: () => setFilter('unread'), aria: undefined as string | undefined},
  ] : null;
  return <ManagerMessagesPage className="mb-notifs" titleId="notifications-title" title="Notifications" back={{href: '/app', label: 'Home'}} deskBack
    phoneBand={tabs ? <BSeg label="Show notifications" items={tabs} /> : null}
    band={tabs ? <CorpSegments label="Show notifications" items={tabs.map(tab => ({key: tab.key, label: tab.label, current: tab.current, onSelect: tab.onSelect, ariaLabel: tab.aria}))} /> : null}
    cards={cards} busy={state.refreshing} />;
}
