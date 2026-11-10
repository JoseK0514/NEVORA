'use client';

import Link from 'next/link';
import type {MouseEvent, ReactNode} from 'react';
import {BellIcon} from '@phosphor-icons/react/dist/ssr/Bell';
import {CalendarBlankIcon} from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import {CalendarCheckIcon} from '@phosphor-icons/react/dist/ssr/CalendarCheck';
import {ArrowsLeftRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import {MegaphoneSimpleIcon} from '@phosphor-icons/react/dist/ssr/MegaphoneSimple';
import {ReceiptIcon} from '@phosphor-icons/react/dist/ssr/Receipt';
import {SunIcon} from '@phosphor-icons/react/dist/ssr/Sun';
import {ProhibitIcon} from '@phosphor-icons/react/dist/ssr/Prohibit';
import {DeviceMobileIcon} from '@phosphor-icons/react/dist/ssr/DeviceMobile';
import {CircleNotchIcon} from '@phosphor-icons/react/dist/ssr/CircleNotch';
import {MagnifyingGlassIcon} from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {CheckIcon} from '@phosphor-icons/react/dist/ssr/Check';
import {PencilSimpleIcon} from '@phosphor-icons/react/dist/ssr/PencilSimple';
import {BButton, BButtonLink, BCard, BChip, BHero, BIcon, BScreen, BSeg, BStack, type BTone} from '../owner-b/b-kit';
import type {EmployeeNotificationItem} from '../../lib/employee-view';
import {notificationKind, type NotificationKind} from '../../lib/notification-labels';
import type {CommunicationRecoveryState} from '../../lib/communications/recovery';
import {notificationGroup, type NotificationTab} from '../employee-mobile/notifications-list';
import {messageTime, type MessageFilter, type ReadyUpdate} from '../employee-mobile/messages-view';
import {NoHeaderActions} from './account-host';
import {Dotted} from './parts';
import './account.css';

/* Employee phones, Direction B: Notifications, Updates, an update and Write an update (mock e-notifications,
 * e-updates). The phone page (employee-mobile/messages.tsx) owns the reads, the session and every command; these screens
 * draw what it passes. */

/** A read that hasn't arrived, or a notice with its own Try again. */
export type BStatus = {copy: string; signIn?: boolean; retry?: {label: string; onClick: () => void; disabled?: boolean}};
export function BStatusCard({status, title}: {status: BStatus; title?: string}) {
  return <BCard title={title}>
    <div className="eb-status">
      <p className="b-state" role="status">{status.copy}</p>
      {status.signIn ? <BButtonLink href="/login" kind="teal" full>Sign in</BButtonLink>
        : status.retry ? <BButton kind="quiet" full onClick={status.retry.onClick} disabled={status.retry.disabled}>{status.retry.label}</BButton> : null}
    </div>
  </BCard>;
}

/** The submission status (MessageRecovery's copy and actions). */
export function BMessageRecovery({state, allowed, onLookup, onRetry}: {state: CommunicationRecoveryState; allowed: boolean; onLookup: () => void; onRetry: () => void}) {
  if (!state.pending && !state.notice && !state.hasUnknown) return null;
  const copy = state.pending ? 'Checking your submission…' : state.hasUnknown ? 'The result hasn’t been confirmed. Check the original submission before trying anything new.' : state.notice === 'committed' ? 'Sent. Refresh to see its status.' : state.notice === 'conflict' ? 'This update or its audience changed. Review the current details before submitting again.' : state.notice === 'signed-out' ? 'Your session ended. Sign in again to continue.' : state.notice === 'blocked' ? 'This update changed. Refresh to see the latest.' : 'Your submission couldn’t be checked. Refresh to continue.';
  return <section className="b-card" aria-label="Submission status"><div className="eb-status">
    <p className="b-state" role="status">{copy}</p>
    {state.hasUnknown ? <div className="eb-btns">
      <BButton kind="quiet" onClick={onLookup} disabled={!allowed || state.pending}>Check submission status</BButton>
      {state.canRetry ? <BButton kind="quiet" onClick={onRetry} disabled={!allowed || state.pending}>Retry original submission</BButton> : null}
    </div> : null}
  </div></section>;
}

/** "An earlier submission still needs to be checked" with the way back to it. */
export function BReturnCard({href}: {href: string}) {
  return <BCard><div className="eb-status"><p className="b-state">An earlier submission still needs to be checked before starting another.</p>
    <BButtonLink href={href} kind="quiet" full>Return to my submission</BButtonLink></div></BCard>;
}

export type BPager = {newer?: () => void; newest?: () => void; older?: () => void};
function Pager({pager}: {pager?: BPager | null}) {
  if (!pager || !(pager.newer || pager.older)) return null;
  return <nav className="eb-btns eb-pager" aria-label="Message pages">
    {pager.newer ? <BButton kind="quiet" onClick={pager.newer}>Newer page</BButton> : null}
    {pager.newest ? <BButton kind="quiet" onClick={pager.newest}>Newest items</BButton> : null}
    {pager.older ? <BButton kind="quiet" onClick={pager.older}>Older page</BButton> : null}
  </nav>;
}

type Open = (event: MouseEvent<HTMLAnchorElement>, id: string, href: string) => void;
type Shared = {recovery?: ReactNode; returnHref?: string | null; status?: BStatus | null; pager?: BPager | null; opening?: boolean; openError?: boolean};

const KIND_ICON: Record<NotificationKind, typeof BellIcon> = {SCHEDULE: CalendarBlankIcon, TIME_OFF: SunIcon, EXCHANGE: ArrowsLeftRightIcon, CALLOUT: ProhibitIcon,
  AVAILABILITY: CalendarCheckIcon, SELF_TEST: DeviceMobileIcon, COMMUNICATION: MegaphoneSimpleIcon, PAYROLL_STATEMENT: ReceiptIcon};
const clock = (at: string, zone: string) => new Intl.DateTimeFormat('en-US', {timeZone: zone, hour: 'numeric', minute: '2-digit'}).format(new Date(at));
const shortDate = (at: string, zone: string) => new Intl.DateTimeFormat('en-US', {timeZone: zone, month: 'short', day: 'numeric'}).format(new Date(at));
const longDay = (at: string, zone: string) => new Intl.DateTimeFormat('en-US', {timeZone: zone, weekday: 'short', month: 'short', day: 'numeric'}).format(new Date(at));

export type NotificationsBList = {items: EmployeeNotificationItem[]; partial: boolean; tab: NotificationTab; onTab: (tab: NotificationTab) => void; timeZone: string; onOpen: Open; opening: string | null; more: boolean; now?: Date};

/** Notifications (board E-Notifications): All and Unread on glass, then the notices grouped by day, one row per notice
 * with a grey icon for its kind (an update that needs you is amber), its time and a teal dot while unread. */
export function EmployeeNotificationsB({settingsHref, list, recovery, returnHref, status, pager, opening, openError}: Shared & {settingsHref?: string; list?: NotificationsBList | null}) {
  const zone = list?.timeZone ?? 'UTC', at = list?.now ?? new Date();
  const unread = list ? list.items.filter(item => item.reviewState === 'unread').length : 0;
  const shown = list ? list.tab === 'unread' ? list.items.filter(item => item.reviewState === 'unread') : list.items : [];
  const groups = (['Today', 'Yesterday', 'Earlier'] as const).map(name => ({name, rows: shown.filter(item => notificationGroup(item.at, zone, at) === name)})).filter(group => group.rows.length);
  return <BScreen back>
    <NoHeaderActions />
    <BHero back={{href: '/app', label: 'Home'}} title="Notifications" titleId="b-notifications-title"
      right={settingsHref ? <BButtonLink href={settingsHref} kind="glass" label="Settings for alerts on this device">Settings</BButtonLink> : undefined}>
      {list ? <BSeg label="Show notifications" items={[
        {key: 'all', label: 'All', current: list.tab === 'all', onSelect: () => list.onTab('all')},
        {key: 'unread', label: unread ? `Unread ${unread}` : 'Unread', current: list.tab === 'unread', onSelect: () => list.onTab('unread'), aria: unread ? `Unread, ${unread}` : undefined},
      ]} /> : null}
    </BHero>
    <BStack>
      {recovery}
      {returnHref ? <BReturnCard href={returnHref} /> : null}
      {status ? <BStatusCard status={status} /> : list ? <>
        {list.partial ? <p className="b-note" role="status">Some current notices couldn’t be checked. Refresh before relying on this list.</p> : null}
        {groups.length ? groups.map(group => <BCard key={group.name} title={group.name} id={'b-notifications-' + group.name.toLowerCase()}>
          <ul className="b-list" aria-label={group.name + ' notifications'}>{group.rows.map(item => {
            const isUnread = item.reviewState === 'unread', required = item.actionState === 'required', busy = list.opening === item.id, kind = notificationKind(item.label);
            // Review B1 (NV-142): every item that needs an action is amber, whatever its kind.
            const Icon = kind ? KIND_ICON[kind] : BellIcon, tone: BTone = required ? 'amber' : 'grey';
            const earlier = group.name === 'Earlier', time = clock(item.at, zone);
            const sub = [required ? 'Action needed' : null, earlier ? `${longDay(item.at, zone)} · ${time}` : null].filter(Boolean).join(' · ');
            return <li className="b-li" key={item.id}><Link id={'b-message-' + item.id} className={`b-row b-row--link eb-notif${busy ? ' eb-notif--busy' : ''}`} href={item.href} prefetch={false}
              onClick={event => list.onOpen(event, item.id, item.href)} aria-busy={busy || undefined}
              aria-label={`${item.label}${isUnread ? ', unread' : ''}${required ? ', action needed' : ''}, ${earlier ? `${longDay(item.at, zone)} · ${time}` : time}`}>
              <BIcon tone={tone}><Icon weight="bold" /></BIcon>
              <span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">{item.label}</span></span>{sub ? <span className="b-row__s"><Dotted text={sub}/></span> : null}</span>
              <span className="b-row__end eb-when"><span>{earlier ? shortDate(item.at, zone) : time}</span>
                {busy ? <CircleNotchIcon className="eb-spin" size={16} weight="bold" aria-hidden="true" /> : isUnread ? <i className="eb-unread" aria-hidden="true" /> : null}</span>
            </Link></li>;
          })}</ul>
        </BCard>) : <BCard><div className="eb-empty"><BIcon tone="grey"><BellIcon weight="bold" /></BIcon><b>{list.tab === 'unread' ? 'You’re all caught up' : list.partial ? 'Nothing confirmed on this page' : 'No current notifications'}</b>
          <span>{list.tab === 'unread' ? 'No unread notifications.' : list.partial ? 'Some notices couldn’t be checked. Refresh to check again.' : 'New schedule, request and pay notices will show here.'}{list.more ? ' Older items may be on another page.' : ''}</span></div></BCard>}
      </> : null}
      <Pager pager={pager} />
      {opening ? <p className="b-sr" role="status">Opening current details…</p> : null}
      {openError ? <p className="b-note" role="status">This notice couldn’t be opened with your current access. Refresh and try again.</p> : null}
    </BStack>
  </BScreen>;
}

/** The action row at the foot of the Updates list. */
function WriteRow({onClick}: {onClick: () => void}) {
  return <li className="b-li"><Link className="b-add" href="/app/updates/compose" onClick={onClick}><span className="b-ico b-ico--teal" aria-hidden="true"><PencilSimpleIcon weight="bold" /></span>Write an update</Link></li>;
}

export type UpdatesBList = {items: ReadyUpdate[]; partial: boolean; search: string; filter: MessageFilter; timeZone: string; onSearch: (value: string) => void; onFilter: (value: MessageFilter) => void;
  onOpen: Open; more: boolean; busy: boolean; onConfirm: (item: ReadyUpdate) => void; onCompose: () => void};

const FILTER_LABEL: Record<MessageFilter, string> = {all: 'All', unread: 'Unread', action: 'Action needed'};
const updateRow = (item: ReadyUpdate) => ({unread: !item.ownReadAt && !item.ownAcknowledgedAt, required: item.acknowledgement === 'REQUIRED' && !item.ownAcknowledgedAt,
  status: item.ownAcknowledgedAt ? 'Acknowledged' : item.ownReadAt ? 'Read' : 'Unread', at: item.editedAt ?? item.publishedAt});

/** Updates (board E-Updates): search and Show on glass; updates you must confirm first, each with its text and Open and
 * Confirm; the rest as rows; Write an update at the foot of the list. Search and Show are the page's own (this page). */
export function EmployeeUpdatesB({list, notice, recovery, returnHref, status, pager, opening, openError}: Shared & {list?: UpdatesBList | null; notice?: BStatus | null}) {
  const rows = list ? list.items.map(item => ({item, ...updateRow(item)})) : [];
  const matches = list ? rows.filter(row => (list.filter === 'all' || list.filter === 'unread' && row.unread || list.filter === 'action' && row.required)
    && row.item.title.toLocaleLowerCase().includes(list.search.trim().toLocaleLowerCase())) : [];
  const confirm = matches.filter(row => row.required), earlier = matches.filter(row => !row.required);
  const narrowed = !!list && (!!list.search || list.filter !== 'all');
  return <BScreen back>
    {/* Desktop: Write an update is the band's white action (eb-desk); the phone's row sits at the foot of the list. */}
    <BHero back={{href: '/app/more', label: 'More'}} title="Updates" titleId="b-updates-title"
      right={list ? <span className="eb-desk"><Link className="b-btn b-btn--white" href="/app/updates/compose" onClick={list.onCompose}><PencilSimpleIcon size={17} weight="bold" aria-hidden="true" />Write an update</Link></span> : undefined}>
      {list ? <div className="eb-tools">
        <label className="b-search b-glass eb-tools__search"><MagnifyingGlassIcon size={19} weight="bold" aria-hidden="true" /><span className="b-sr">Search this page</span>
          <input id="b-updates-search" type="search" maxLength={120} value={list.search} onChange={event => list.onSearch(event.target.value)} autoComplete="off" placeholder="Search update titles" /></label>
        <label className="eb-select b-glass"><span className="b-sr">Show</span><span className="eb-select__v" aria-hidden="true">{FILTER_LABEL[list.filter]}</span>
          <select id="b-updates-filter" value={list.filter} onChange={event => list.onFilter(event.target.value as MessageFilter)}><option value="all">All</option><option value="unread">Unread</option><option value="action">Action needed</option></select>
          <CaretDownIcon size={13} weight="bold" aria-hidden="true" /></label>
      </div> : null}
    </BHero>
    <BStack>
      {recovery}
      {returnHref ? <BReturnCard href={returnHref} /> : null}
      {status ? <BStatusCard status={status} /> : notice ? <BStatusCard status={notice} /> : list ? <>
        {list.partial && matches.length ? <p className="b-note" role="status">Some current updates couldn’t be checked. Refresh before relying on this list.</p> : null}
        {confirm.length ? <BCard title="To confirm" id="b-updates-confirm">
          <ul className="b-list">{confirm.map(({item, at}) => <li className="b-li" key={item.id}><div className="eb-upd">
            <div className="b-row eb-upd__head"><BIcon tone="grey"><MegaphoneSimpleIcon weight="bold" /></BIcon>
              <span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">{item.title}</span><BChip tone="amber">Must read</BChip></span><span className="b-row__s">{item.authorContext} · {longDay(at, list.timeZone)}</span></span></div>
            <p className="eb-upd__body">{item.body}</p>
            <div className="eb-upd__acts">
              <Link id={'b-message-' + item.id} className="b-btn b-btn--quiet" href={'/app/updates/' + item.id} onClick={event => list.onOpen(event, item.id, '/app/updates/' + item.id)} aria-label={`Open ${item.title}`}>Open</Link>
              <BButton kind="teal" onClick={() => list.onConfirm(item)} disabled={list.busy} label={`Acknowledge ${item.title}`}><CheckIcon size={16} weight="bold" aria-hidden="true" />Acknowledge</BButton>
            </div>
          </div></li>)}</ul>
        </BCard> : null}
        {earlier.length || !confirm.length ? <BCard title={confirm.length ? 'Earlier' : undefined} label={confirm.length ? undefined : 'Your updates'} id="b-updates-list">
          {earlier.length ? <ul className="b-list" aria-label="Your updates">{earlier.map(({item, unread, status: state, at}) => <li className="b-li" key={item.id}>
            <Link id={'b-message-' + item.id} className="b-row b-row--link" href={'/app/updates/' + item.id} onClick={event => list.onOpen(event, item.id, '/app/updates/' + item.id)}
              aria-label={`${item.title}, ${state}, ${messageTime(at, list.timeZone)}`}>
              <BIcon tone="grey"><MegaphoneSimpleIcon weight="bold" /></BIcon>
              <span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">{item.title}</span></span><span className="b-row__s">{item.authorContext} · {longDay(at, list.timeZone)} · {state}</span></span>
              {unread ? <span className="b-row__end eb-when"><i className="eb-unread" aria-hidden="true" /></span> : null}
              <CaretRightIcon className="b-chev" size={18} weight="bold" aria-hidden="true" />
            </Link></li>)}
            <WriteRow onClick={list.onCompose} /></ul>
          : <>
            <div className="eb-empty" role={list.partial ? 'status' : undefined}><BIcon tone="grey"><MegaphoneSimpleIcon weight="bold" /></BIcon>{list.partial
              ? <><b>{rows.length ? 'No confirmed matches on this page' : 'Nothing confirmed on this page'}</b><span>Some current updates couldn’t be checked, so they aren’t listed. {narrowed ? 'Try a different search or show All, or refresh to check again.' : 'Refresh to check again.'}</span></>
              : <><b>{narrowed ? 'No matches on this page' : 'No current updates'}</b><span>{narrowed ? 'Try a different search or show All.' : 'There are no current items on this page.'}{list.more ? ' Older items may be on another page.' : ''}</span></>}</div>
            <ul className="b-list"><WriteRow onClick={list.onCompose} /></ul>
          </>}
        </BCard> : <BCard label="Write an update"><ul className="b-list"><WriteRow onClick={list.onCompose} /></ul></BCard>}
      </> : null}
      <Pager pager={pager} />
      {opening ? <p className="b-sr" role="status">Opening current details…</p> : null}
      {openError ? <p className="b-note" role="status">This notice couldn’t be opened with your current access. Refresh and try again.</p> : null}
    </BStack>
  </BScreen>;
}

/** An update (the detail): what it says, your reading status with Acknowledge or Mark as read, and Withdraw for your own. */
export function EmployeeUpdateB({back, item, busy, onAction, withdraw, onWithdraw, notice, recovery, returnHref, status, opening, openError}: Shared & {
  back: {href: string; label: string}; item?: ReadyUpdate | null; busy: boolean; onAction: (kind: 'MARK_READ' | 'ACKNOWLEDGE' | 'WITHDRAW') => void;
  withdraw: boolean; onWithdraw: (value: boolean) => void; notice?: BStatus | null;
}) {
  const required = !!item && item.acknowledgement === 'REQUIRED' && !item.ownAcknowledgedAt;
  return <BScreen back>
    {/* Review B7 (NV-284): the update's own title leads; "Team update" moves to the sub line. */}
    <BHero back={back} title={item ? item.title : "Team update"} titleId="b-update-title" sub={item ? `Team update · ${item.authorContext} · ${messageTime(item.publishedAt, item.timeZone)}` : "Read, review and respond"} />
    <BStack>
      {recovery}
      {returnHref ? <BReturnCard href={returnHref} /> : null}
      {status ? <BStatusCard status={status} /> : notice ? <BStatusCard status={notice} /> : item ? <>
        <article className="b-card eb-update" aria-label="Update content">
          <div className="eb-update__head"><h2>{item.title}</h2>{required ? <BChip tone="amber">Must read</BChip> : null}</div>
          <p className="eb-update__meta">{item.authorContext} · {messageTime(item.publishedAt, item.timeZone)}{item.editedAt ? ' · Edited ' + messageTime(item.editedAt, item.timeZone) : ''}</p>
          {item.sentCount !== undefined ? <p className="eb-update__meta">Original audience: {item.sentCount} {item.sentCount === 1 ? 'recipient' : 'recipients'}</p> : null}
          <p className="eb-update__body">{item.body}</p>
        </article>
        <BCard title="Your reading status" id="b-update-status">
          <div className="eb-status">
            <p className="eb-para">{item.ownAcknowledgedAt ? 'Acknowledged ' + messageTime(item.ownAcknowledgedAt, item.timeZone) : item.ownReadAt ? 'Read ' + messageTime(item.ownReadAt, item.timeZone) : 'You haven’t marked this update as read.'}</p>
            {item.expiresAt ? <p className="eb-para">Available until {messageTime(item.expiresAt, item.timeZone)}.</p> : null}
            {required ? <p className="eb-para">Your acknowledgement is required. Opening this update does not record it.</p> : null}
            {item.acknowledgement !== 'NONE' && !item.ownAcknowledgedAt ? <BButton kind="teal" full disabled={busy} onClick={() => onAction('ACKNOWLEDGE')}>Acknowledge update</BButton> : null}
            {item.acknowledgement !== 'REQUIRED' && !item.ownReadAt && !item.ownAcknowledgedAt ? <BButton kind={item.acknowledgement === 'NONE' ? 'teal' : 'quiet'} full disabled={busy} onClick={() => onAction('MARK_READ')}>Mark as read</BButton> : null}
          </div>
        </BCard>
        {item.canWithdraw ? <BCard title="Your published update" id="b-update-withdraw">
          <div className="eb-status">{withdraw ? <>
            <p className="eb-para">Withdraw this version? It will no longer be available to its recipients. This does not undo earlier reading or acknowledgement.</p>
            <div className="eb-btns"><BButton kind="quiet" disabled={busy} onClick={() => onWithdraw(false)}>Keep update</BButton><button type="button" className="b-btn eb-btn-danger" disabled={busy} onClick={() => onAction('WITHDRAW')}>Confirm withdrawal</button></div>
          </> : <button type="button" className="b-btn eb-btn-danger-quiet b-btn--full" disabled={busy} onClick={() => onWithdraw(true)}>Withdraw update</button>}</div>
        </BCard> : null}
      </> : null}
      {opening ? <p className="b-sr" role="status">Opening current details…</p> : null}
      {openError ? <p className="b-note" role="status">This notice couldn’t be opened with your current access. Refresh and try again.</p> : null}
    </BStack>
  </BScreen>;
}

/** Write an update: the form's hero (the form itself is the page's own, kept beside this screen and lifted under it). */
export function EmployeeComposeB() {
  return <BScreen back>
    <BHero back={{href: '/app/updates', label: 'Cancel', close: true}} title="Write an update" titleId="b-compose-title" sub="A message for today’s team" />
  </BScreen>;
}
