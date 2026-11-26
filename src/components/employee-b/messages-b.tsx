'use client';

import Link from 'next/link';
import { WholeWordHeading } from '@/components/whole-word-heading';
import {Fragment, useState, type MouseEvent, type ReactNode} from 'react';
import {BellIcon} from '@phosphor-icons/react/dist/ssr/Bell';
import {CalendarBlankIcon} from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import {CalendarCheckIcon} from '@phosphor-icons/react/dist/ssr/CalendarCheck';
import {UserCheckIcon} from '@phosphor-icons/react/dist/ssr/UserCheck';
import {ArrowsLeftRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import {MegaphoneIcon} from '@phosphor-icons/react/dist/ssr/Megaphone';
import {ReceiptIcon} from '@phosphor-icons/react/dist/ssr/Receipt';
import {CalendarMinusIcon} from '@phosphor-icons/react/dist/ssr/CalendarMinus';
import {UserMinusIcon} from '@phosphor-icons/react/dist/ssr/UserMinus';
import {DeviceMobileIcon} from '@phosphor-icons/react/dist/ssr/DeviceMobile';
import {MagnifyingGlassIcon} from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {CheckIcon} from '@phosphor-icons/react/dist/ssr/Check';
import {PencilSimpleIcon} from '@phosphor-icons/react/dist/ssr/PencilSimple';
import {BButton, BButtonLink, BCard, BChip, BHero, BIcon, BScreen, BSeg, BStack, BState, type BStateKind, type BTone} from '../owner-b/b-kit';
import type {EmployeeNotificationItem} from '../../lib/employee-view';
import {type NotificationKind} from '../../lib/notification-labels';
import {notificationKindFor} from '../../lib/notification-facts';
import type {CommunicationRecoveryState} from '../../lib/communications/recovery';
import {notificationGroup, notificationHeadline, type NotificationTab} from '../employee-mobile/notifications-list';
import {messageTime, type MessageFilter, type ReadyUpdate} from '../employee-mobile/messages-view';
import {NoHeaderActions} from './account-host';
import {Dotted} from './parts';
import {ACCOUNT_LOCALE, accountCopy, type AccountCopy, type AccountLang} from './account-copy';
import {updateAuthorContext} from '../communication-copy';
import {usePortalLang} from '@/lib/i18n/portal-lang';
import './account.css';

/* Employee phones, Direction B: Notifications, Updates, an update and Write an update (mock e-notifications,
 * e-updates). The phone page (employee-mobile/messages.tsx) owns the reads, the session and every command; these screens
 * draw what it passes. */

/** A read that hasn't arrived, or a notice with its own Try again. Review F2 (NV-075): the shared state card (icon circle,
 * one line, one teal pill); without `kind`, signed out is locked, an available retry means it failed, else it is checking. */
export type BStatus = {copy: string; signIn?: boolean; retry?: {label: string; onClick: () => void; disabled?: boolean}; kind?: BStateKind};
export function BStatusCard({status, title}: {status: BStatus; title?: string}) {
  const {common, messages} = accountCopy(usePortalLang());
  const kind: BStateKind = status.kind ?? (status.signIn ? 'locked' : status.retry && !status.retry.disabled ? 'failed' : 'loading');
  const waiting = kind === 'paused' || kind === 'offline';
  return <BCard title={title}>
    <BState kind={kind} line={status.copy} action={status.signIn ? {label: common.signIn, href: '/login'}
      : status.retry && !waiting ? {label: status.retry.label, onClick: status.retry.onClick, busy: status.retry.disabled, busyLabel: messages.checking} : undefined}/>
  </BCard>;
}

/** The submission status (MessageRecovery's copy and actions). */
export function BMessageRecovery({state, allowed, onLookup, onRetry}: {state: CommunicationRecoveryState; allowed: boolean; onLookup: () => void; onRetry: () => void}) {
  const t = accountCopy(usePortalLang()).messages;
  if (!state.pending && !state.notice && !state.hasUnknown) return null;
  const copy = state.pending ? t.checking : state.hasUnknown ? t.unconfirmed : state.notice === 'committed' ? t.committed : state.notice === 'conflict' ? t.conflict : state.notice === 'signed-out' ? t.signedOut : state.notice === 'blocked' ? t.blocked : t.checkFailed;
  return <section className="b-card" aria-label={t.submissionStatus}><div className="eb-status">
    <p className="b-state" role="status">{copy}</p>
    {state.hasUnknown ? <div className="eb-btns">
      <BButton kind="quiet" onClick={onLookup} disabled={!allowed || state.pending}>{t.checkStatus}</BButton>
      {state.canRetry ? <BButton kind="quiet" onClick={onRetry} disabled={!allowed || state.pending}>{t.retrySubmission}</BButton> : null}
    </div> : null}
  </div></section>;
}

/** "An earlier submission still needs to be checked" with the way back to it. */
export function BReturnCard({href}: {href: string}) {
  const t = accountCopy(usePortalLang()).messages;
  return <BCard><div className="eb-status"><p className="b-state">{t.earlier}</p>
    <BButtonLink href={href} kind="quiet" full>{t.returnTo}</BButtonLink></div></BCard>;
}

export type BPager = {newer?: () => void; newest?: () => void; older?: () => void};
function Pager({pager}: {pager?: BPager | null}) {
  const t = accountCopy(usePortalLang()).messages;
  if (!pager || !(pager.newer || pager.older)) return null;
  return <nav className="eb-btns eb-pager" aria-label={t.pages}>
    {pager.newer ? <BButton kind="quiet" onClick={pager.newer}>{t.newer}</BButton> : null}
    {pager.newest ? <BButton kind="quiet" onClick={pager.newest}>{t.newest}</BButton> : null}
    {pager.older ? <BButton kind="quiet" onClick={pager.older}>{t.older}</BButton> : null}
  </nav>;
}

type Open = (event: MouseEvent<HTMLAnchorElement>, id: string, href: string) => void;
type Shared = {recovery?: ReactNode; returnHref?: string | null; status?: BStatus | null; pager?: BPager | null; opening?: boolean; openError?: boolean};

// Phase 9 (spec 3.6): one glyph per concept, the navigation's: CalendarMinus for time off, UserMinus for can't work,
// Megaphone for Updates. Final review C (row 4): UserCheck for Availability (the navigation's), and a schedule notice that
// asks you to confirm the week is CalendarCheck, as Home's to-do and Schedule's Confirm this week are.
const KIND_ICON: Record<NotificationKind, typeof BellIcon> = {SCHEDULE: CalendarBlankIcon, TIME_OFF: CalendarMinusIcon, EXCHANGE: ArrowsLeftRightIcon, CALLOUT: UserMinusIcon,
  AVAILABILITY: UserCheckIcon, SELF_TEST: DeviceMobileIcon, COMMUNICATION: MegaphoneIcon, PAYROLL_STATEMENT: ReceiptIcon};
/* A notice's lead glyph: approved leads with the done check (green); a declined one keeps its kind's glyph in the grey
 * circle (final review C, row 16: the x read as a dismiss control and is not in the spec's set), so "Time off declined" is
 * CalendarMinus; "Confirm your schedule" (a schedule notice that needs you) is CalendarCheck. */
const clock = (at: string, zone: string, lang: AccountLang = 'en') => new Intl.DateTimeFormat(ACCOUNT_LOCALE[lang], {timeZone: zone, hour: 'numeric', minute: '2-digit'}).format(new Date(at));
const shortDate = (at: string, zone: string, lang: AccountLang = 'en') => new Intl.DateTimeFormat(ACCOUNT_LOCALE[lang], {timeZone: zone, month: 'short', day: 'numeric'}).format(new Date(at)).replace(/\.$/, '');
const longDay = (at: string, zone: string, lang: AccountLang = 'en') => new Intl.DateTimeFormat(ACCOUNT_LOCALE[lang], {timeZone: zone, weekday: 'short', month: 'short', day: 'numeric'}).format(new Date(at));

/** Phase 8 (review C, row 18): the same notice sent more than once (the same title and the same object, such as two
 * reminders to confirm one week) is one row that opens in place and lists each one, each opened and read on its own
 * (DESIGN.MD Phase 3, "a folded notification opens in place"). Order is kept: a fold sits where its newest notice was. */
function folds(items: EmployeeNotificationItem[]) {
  const out: {key: string; items: EmployeeNotificationItem[]}[] = [], byKey = new Map<string, {key: string; items: EmployeeNotificationItem[]}>();
  for (const item of items) {
    const head = notificationHeadline(item), key = `${notificationKindFor(item) ?? ''}|${head.title}|${head.object ?? ''}|${head.decided ?? ''}`;
    const fold = byKey.get(key);
    if (fold) fold.items.push(item); else { const next = {key, items: [item]}; byKey.set(key, next); out.push(next); }
  }
  return out;
}
/** Final polish, round 2 (H2, N1): the one amber chip of a row that waits on this person. A notice the person must act on
 * says "Action needed"; a swap or cover request waiting for their answer says "Needs your answer", the Requests page's
 * words. The chip is the row's last part at every width: title, grey line, chip (the kit row's order). */
const needsYou = (A: AccountCopy, required: boolean, forYou: boolean) => required ? A.actionNeeded : forYou ? A.needsAnswer : null;
// Sweep Z (B3): rows are named by their own text (title, line, chip, time); the unread dot's meaning is b-sr text.
function FoldRow({id, items, zone, earlier, open, onToggle}: {id: string; items: EmployeeNotificationItem[]; zone: string; earlier: boolean; open: boolean; onToggle: () => void}) {
  const lang = usePortalLang(), A = accountCopy(lang);
  const first = items[0], head = notificationHeadline(first, lang), kind = notificationKindFor(first);
  const unread = items.filter(item => item.reviewState === 'unread').length, required = items.some(item => item.actionState === 'required');
  const Icon = head.decided === 'approved' ? CheckIcon : !kind ? BellIcon : kind === 'SCHEDULE' && required ? CalendarCheckIcon : KIND_ICON[kind];
  const chip = needsYou(A, required, head.forYou), tone: BTone = chip ? 'amber' : head.decided === 'approved' ? 'green' : 'grey';
  const time = clock(first.at, zone, lang), when = earlier ? `${shortDate(first.at, zone, lang)}, ${time}` : time, phoneWhen = earlier ? shortDate(first.at, zone, lang) : time;
  const object = [head.object, A.folded(items.length)].filter(Boolean).join(' · ');
  return <li className="b-li">
    <button type="button" className={`b-row b-row--link eb-notif eb-fold${unread ? ' eb-notif--unread' : ''}`} id={id} aria-expanded={open} onClick={onToggle}>
      <BIcon tone={tone}><Icon weight="bold" /></BIcon>
      <span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">{head.title}</span></span>
        <span className="b-row__s eb-notif__s"><span className="eb-notif__o eb-notif__o--w"><Dotted text={object}/></span>
          <span className="eb-notif__o eb-notif__o--p"><Dotted text={`${object} · ${phoneWhen}`}/></span>
          {chip ? <BChip tone="amber">{chip}</BChip> : null}</span></span>
      <span className="b-row__end eb-when">{unread ? <><i className="eb-unread" aria-hidden="true" /><span className="b-sr">{`${unread} ${A.unread}, `}</span></> : null}<span className="eb-when__t">{when}</span></span>
      <CaretDownIcon className="b-chev eb-fold__caret" size={18} weight="bold" aria-hidden="true" />
    </button>
  </li>;
}

export type NotificationsBList = {items: EmployeeNotificationItem[]; partial: boolean; tab: NotificationTab; onTab: (tab: NotificationTab) => void; timeZone: string; onOpen: Open; opening: string | null; more: boolean; now?: Date};

/** Notifications (board E-Notifications): All and Unread on glass, then the notices grouped by day, one row per notice
 * with a grey icon for its kind (an update that needs you is amber), its time and a teal dot while unread. */
export function EmployeeNotificationsB({settingsHref, list, recovery, returnHref, status, pager, opening, openError}: Shared & {settingsHref?: string; list?: NotificationsBList | null}) {
  const lang = usePortalLang(), A = accountCopy(lang), c = A.common, t = A.messages;
  const zone = list?.timeZone ?? 'UTC', at = list?.now ?? new Date();
  const unread = list ? list.items.filter(item => item.reviewState === 'unread').length : 0;
  const shown = list ? list.tab === 'unread' ? list.items.filter(item => item.reviewState === 'unread') : list.items : [];
  const groups = (['Today', 'Yesterday', 'Earlier'] as const).map(name => ({name, rows: shown.filter(item => notificationGroup(item.at, zone, at) === name)})).filter(group => group.rows.length);
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  // One row per notification (Phase 4, EM-005 and EM-009).
  const notificationRow = (item: EmployeeNotificationItem, group: string, inFold = false) => {
    const isUnread = item.reviewState === 'unread', required = item.actionState === 'required', busy = list?.opening === item.id, kind = notificationKindFor(item);
    // Phase 4 (EM-005): the title is the outcome and the sub-line is what it is about. A decision leads with its
    // state (green check approved, grey x declined); one that needs you, or waits for your answer, is amber (review B1, NV-142); the rest
    // carry their kind's icon, teal because the row opens (EM-017, employee-b-account.css).
    const head = notificationHeadline(item, lang);
    const Icon = head.decided === 'approved' ? CheckIcon : !kind ? BellIcon : kind === 'SCHEDULE' && required ? CalendarCheckIcon : KIND_ICON[kind];
    const chip = needsYou(A, required, head.forYou), tone: BTone = chip ? 'amber' : head.decided === 'approved' ? 'green' : 'grey';
    const earlier = group === 'Earlier', time = clock(item.at, zone, lang);
    // Phase 4 (EM-009): from 768px one trailing line, the dot then the time (an earlier day leads with its date). On a
    // phone that column would leave a title 96px at 320, so only the dot trails and the time ends the sub-line, once
    // ("Week of Nov 23 · 4 shifts · 9:56 AM"; an earlier day shows its date). The row's label says both.
    const phoneWhen = earlier ? shortDate(item.at, zone, lang) : time;
    return <li className={inFold ? 'b-li eb-fold__item' : 'b-li'} key={item.id}><Link id={'b-message-' + item.id} className={`b-row b-row--link eb-notif${isUnread ? ' eb-notif--unread' : ''}${head.decided === 'declined' ? ' eb-notif--declined' : ''}${busy ? ' eb-notif--busy' : ''}`} href={item.href} prefetch={false}
      onClick={event => list?.onOpen(event, item.id, item.href)} aria-busy={busy || undefined}>
      <BIcon tone={tone}><Icon weight="bold" /></BIcon>
      <span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">{head.title}</span></span>
        <span className={chip || head.object ? 'b-row__s eb-notif__s' : 'b-row__s eb-notif__s eb-notif__s--p'}>{head.object ? <span className="eb-notif__o eb-notif__o--w"><Dotted text={head.object}/></span> : null}
          <span className="eb-notif__o eb-notif__o--p"><Dotted text={head.object ? `${head.object} · ${phoneWhen}` : phoneWhen}/></span>
          {chip ? <BChip tone="amber">{chip}</BChip> : null}</span></span>
      <span className="b-row__end eb-when">{busy ? <span className="eb-spin b-spin b-spin--sm" aria-hidden="true" /> : isUnread ? <><i className="eb-unread" aria-hidden="true" /><span className="b-sr">{`${A.unread}, `}</span></> : null}
        <span className="eb-when__t">{earlier ? `${shortDate(item.at, zone, lang)}, ${time}` : time}</span></span>
      <CaretRightIcon className="b-chev" size={18} weight="bold" aria-hidden="true" />
    </Link></li>;
  };
  return <BScreen back>
    <NoHeaderActions />
    <BHero back={{href: '/app', label: c.home}} title={lang === 'es' ? <WholeWordHeading text={c.notifications} /> : c.notifications} titleId="b-notifications-title"
      right={settingsHref ? <BButtonLink href={settingsHref} kind="glass" label={t.settingsLabel}>{t.settings}</BButtonLink> : undefined}>
      {list ? <BSeg label={t.showNotifications} items={[
        {key: 'all', label: t.all, current: list.tab === 'all', onSelect: () => list.onTab('all')},
        // Review B6 (NV-281): the count is the same small pill the other tabs use.
        {key: 'unread', // Sweep Z (B3): named by its text ("Unread 9"); the space before the count collapses in the grid, so nothing moves.
        label: unread ? <>{t.unreadTab}{' '}<span className="eb-segn">{unread}</span></> : t.unreadTab, current: list.tab === 'unread', onSelect: () => list.onTab('unread')},
      ]} /> : null}
    </BHero>
    <BStack>
      {recovery}
      {returnHref ? <BReturnCard href={returnHref} /> : null}
      {status ? <BStatusCard status={status} /> : list ? <>
        {list.partial ? <p className="b-note" role="status">{t.partial}</p> : null}
        {groups.length ? groups.map(group => <BCard key={group.name} title={t.groups[group.name]} id={'b-notifications-' + group.name.toLowerCase()}>
          {/* Phase 8 (review C, row 18): an open fold lists its notices as indented rows right under it, in this list. */}
          <ul className="b-list" aria-label={t.groupLabel(t.groups[group.name])}>{folds(group.rows).map(fold => fold.items.length === 1 ? notificationRow(fold.items[0], group.name)
            : <Fragment key={fold.key}><FoldRow id={`b-fold-${group.name.toLowerCase()}-${fold.items[0].id}`} items={fold.items} zone={zone} earlier={group.name === 'Earlier'} open={!!opened[fold.key]}
                onToggle={() => setOpened(current => ({...current, [fold.key]: !current[fold.key]}))}/>{opened[fold.key] ? fold.items.map(item => notificationRow(item, group.name, true)) : null}</Fragment>)}</ul>
        </BCard>) : <BCard><div className="eb-empty"><BIcon tone="grey"><BellIcon weight="bold" /></BIcon><b>{list.tab === 'unread' ? t.caughtUp : list.partial ? t.nothingConfirmed : t.noNotifications}</b>
          <span>{list.tab === 'unread' ? t.noUnread : list.partial ? t.partialEmpty : t.willShow}{list.more ? t.olderItems : ''}</span></div></BCard>}
      </> : null}
      <Pager pager={pager} />
      {opening ? <p className="b-sr" role="status">{t.opening}</p> : null}
      {openError ? <p className="b-note" role="status">{t.openError}</p> : null}
    </BStack>
  </BScreen>;
}


export type UpdatesBList = {items: ReadyUpdate[]; partial: boolean; search: string; filter: MessageFilter; timeZone: string; onSearch: (value: string) => void; onFilter: (value: MessageFilter) => void;
  onOpen: Open; more: boolean; busy: boolean; onConfirm: (item: ReadyUpdate) => void; onCompose: () => void};

const updateRow = (item: ReadyUpdate, t: AccountCopy['messages']) => ({unread: !item.ownReadAt && !item.ownAcknowledgedAt, required: item.acknowledgement === 'REQUIRED' && !item.ownAcknowledgedAt,
  status: item.ownAcknowledgedAt ? t.confirmed : item.ownReadAt ? t.read : t.unreadState, at: item.editedAt ?? item.publishedAt});

/** Updates (board E-Updates): search and Show on glass; updates you must confirm first, each with its text and Open and
 * Confirm; the rest as rows; Write an update at the foot of the list. Search and Show are the page's own (this page). */
export function EmployeeUpdatesB({list, notice, recovery, returnHref, status, pager, opening, openError}: Shared & {list?: UpdatesBList | null; notice?: BStatus | null}) {
  const lang = usePortalLang(), A = accountCopy(lang), t = A.messages;
  const rows = list ? list.items.map(item => ({item, ...updateRow(item, t)})) : [];
  const matches = list ? rows.filter(row => (list.filter === 'all' || list.filter === 'unread' && row.unread || list.filter === 'action' && row.required)
    && row.item.title.toLocaleLowerCase().includes(list.search.trim().toLocaleLowerCase())) : [];
  const confirm = matches.filter(row => row.required), earlier = matches.filter(row => !row.required);
  const narrowed = !!list && (!!list.search || list.filter !== 'all');
  return <BScreen back>
    {/* Write an update is the band's action at every width (review B6, NV-166), never a row under the read items. Phase 4
      * (EM-021): the glass pill at every width, since writing is a secondary action for an hourly employee and the page's
      * one filled button is Acknowledge. The pencil means compose everywhere. */}
    <BHero back={{href: '/app/more', label: A.common.more}} title={t.updates} titleId="b-updates-title"
      right={list ? <Link className="b-btn b-btn--glass eb-write" href="/app/updates/compose" onClick={list.onCompose}><PencilSimpleIcon size={16} weight="bold" aria-hidden="true" />{t.write}</Link> : undefined}>
      {list ? <div className="eb-tools">
        <label className="b-search b-glass eb-tools__search"><MagnifyingGlassIcon size={18} weight="bold" aria-hidden="true" /><span className="b-sr">{t.search}</span>
          <input id="b-updates-search" type="search" maxLength={120} value={list.search} onChange={event => list.onSearch(event.target.value)} autoComplete="off" placeholder={t.searchPlaceholder} /></label>
        <label className="eb-select b-glass"><span className="b-sr">{t.show}</span><span className="eb-select__v" aria-hidden="true">{t.filter[list.filter]}</span>
          <select id="b-updates-filter" value={list.filter} onChange={event => list.onFilter(event.target.value as MessageFilter)}><option value="all">{t.filter.all}</option><option value="unread">{t.filter.unread}</option><option value="action">{t.filter.action}</option></select>
          <CaretDownIcon size={16} weight="bold" aria-hidden="true" /></label>
      </div> : null}
    </BHero>
    <BStack>
      {recovery}
      {returnHref ? <BReturnCard href={returnHref} /> : null}
      {status ? <BStatusCard status={status} /> : notice ? <BStatusCard status={notice} /> : list ? <>
        {list.partial && matches.length ? <p className="b-note" role="status">{t.partialUpdates}</p> : null}
        {confirm.length ? <BCard title={A.toAcknowledge} id="b-updates-confirm">
          <ul className="b-list">{confirm.map(({item, at}) => <li className="b-li" key={item.id}><div className="eb-upd">
            {/* Final review C (row 5): an update that waits for your acknowledgement leads with the amber circle, as the same
              * notice does on Home and in Notifications (it was grey, quieter than the read-only rows under it). */}
            <div className="b-row eb-upd__head"><BIcon tone="amber"><MegaphoneIcon weight="bold" /></BIcon>
              <span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">{item.title}</span><BChip tone="amber">{A.actionNeeded}</BChip></span><span className="b-row__s"><Dotted text={`${updateAuthorContext(item.authorContext, lang)} · ${longDay(at, list.timeZone, lang)}`} /></span></span></div>
            {/* Phase 4 (EM-033): a preview is one paragraph (line breaks become spaces) of at most three lines; the update's own page keeps its paragraphs. */}
            {/* Phase 8 (review C, row 32): a hyphenated word ("back-of-house") keeps its hyphens unbreakable here, so the preview's
              * "…" never lands right after a hyphen. */}
            <p className="eb-upd__body">{item.body.replace(/\s*\n+\s*/g, ' ').trim().replace(/(\w)-(?=\w)/g, '$1\u2011')}</p>
            <div className="eb-upd__acts" lang={lang}>
              <Link id={'b-message-' + item.id} className="b-btn b-btn--ghost" href={'/app/updates/' + item.id} onClick={event => list.onOpen(event, item.id, '/app/updates/' + item.id)} aria-label={t.openLabel(item.title)}>{t.open}</Link>
              <BButton kind="ghost" onClick={() => list.onConfirm(item)} disabled={list.busy} label={t.confirmLabel(item.title)}><CheckIcon size={16} weight="bold" aria-hidden="true" />{t.confirm}</BButton>
            </div>
          </div></li>)}</ul>
        </BCard> : null}
        {earlier.length || !confirm.length ? <BCard title={confirm.length ? A.otherUpdates : undefined} label={confirm.length ? undefined : t.yourUpdates} id="b-updates-list">
          {earlier.length ? <ul className="b-list" aria-label={t.yourUpdates}>{earlier.map(({item, unread, status: state, at}) => <li className="b-li" key={item.id}>
            <Link id={'b-message-' + item.id} className={unread ? 'b-row b-row--link eb-updrow eb-updrow--unread' : 'b-row b-row--link eb-updrow'} href={'/app/updates/' + item.id} onClick={event => list.onOpen(event, item.id, '/app/updates/' + item.id)}>
              <BIcon tone="grey"><MegaphoneIcon weight="bold" /></BIcon>
              <span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">{item.title}</span></span><span className="b-row__s"><Dotted text={`${updateAuthorContext(item.authorContext, lang)} · ${longDay(at, list.timeZone, lang)}${unread ? '' : ` · ${state}`}`} /></span></span>
              {/* Sweep Z (B6): the row is named by its own text; an unread row's state, drawn as the dot, is b-sr text. */}
              {unread ? <span className="b-row__end eb-when"><i className="eb-unread" aria-hidden="true" /><span className="b-sr">{state}</span></span> : null}
              <CaretRightIcon className="b-chev" size={18} weight="bold" aria-hidden="true" />
            </Link></li>)}</ul>
          : <>
            <div className="eb-empty" role={list.partial ? 'status' : undefined}><BIcon tone="grey"><MegaphoneIcon weight="bold" /></BIcon>{list.partial
              ? <><b>{rows.length ? t.noConfirmedMatches : t.nothingConfirmed}</b><span>{t.partialUpdatesEmpty}{narrowed ? t.tryNarrowedPartial : t.refreshAgain}</span></>
              : <><b>{narrowed ? t.noMatches : t.noUpdates}</b><span>{narrowed ? t.tryNarrowed : t.noItems}{list.more ? t.olderItems : ''}</span></>}</div>
          </>}
        </BCard> : null}
      </> : null}
      <Pager pager={pager} />
      {opening ? <p className="b-sr" role="status">{t.opening}</p> : null}
      {openError ? <p className="b-note" role="status">{t.openError}</p> : null}
    </BStack>
  </BScreen>;
}

/** An update (the detail): what it says, your reading status with Acknowledge or Mark as read, and Withdraw for your own. */
export function EmployeeUpdateB({back, item, busy, onAction, withdraw, onWithdraw, notice, recovery, returnHref, status, opening, openError}: Shared & {
  back: {href: string; label: string}; item?: ReadyUpdate | null; busy: boolean; onAction: (kind: 'MARK_READ' | 'ACKNOWLEDGE' | 'WITHDRAW') => void;
  withdraw: boolean; onWithdraw: (value: boolean) => void; notice?: BStatus | null;
}) {
  const required = !!item && item.acknowledgement === 'REQUIRED' && !item.ownAcknowledgedAt;
  const lang = usePortalLang(), A = accountCopy(lang), t = A.messages, when = (at: string, zone: string) => messageTime(at, zone, lang);
  return <BScreen back>
    {/* Review B7 (NV-284): the update's own title leads; "Team update" moves to the sub line. */}
    <BHero back={back} title={item ? item.title : t.teamUpdate} titleId="b-update-title" sub={item ? t.teamUpdateSub(updateAuthorContext(item.authorContext, lang), when(item.publishedAt, item.timeZone)) : t.readReview} />
    <BStack>
      {recovery}
      {returnHref ? <BReturnCard href={returnHref} /> : null}
      {status ? <BStatusCard status={status} /> : notice ? <BStatusCard status={notice} /> : item ? <>
        <article className="b-card eb-update" aria-label={t.content} data-update-revision={item.revisionId}>
          {/* The band already says the title, author and time (review B7, NV-284); the card says each fact once: the chip,
            * when it was edited, its audience, then the text. */}
          {required ? <div className="eb-update__head"><BChip tone="amber">{A.actionNeeded}</BChip></div> : null}
          {item.editedAt ? <p className="eb-update__meta">{t.edited(when(item.editedAt, item.timeZone))}</p> : null}
          {item.sentCount !== undefined ? <p className="eb-update__meta">{t.audience(item.sentCount)}</p> : null}
          <p className="eb-update__body">{item.body}</p>
        </article>
        <BCard title={t.readingStatus} id="b-update-status">
          <div className="eb-status">
            <p className="eb-para">{item.ownAcknowledgedAt ? t.confirmedAt(when(item.ownAcknowledgedAt, item.timeZone)) : item.ownReadAt ? t.readAt(when(item.ownReadAt, item.timeZone)) : t.notRead}</p>
            {item.expiresAt ? <p className="eb-para">{t.availableUntil(when(item.expiresAt, item.timeZone))}</p> : null}
            {required ? <p className="eb-para">{t.confirmNote}</p> : null}
            {item.acknowledgement !== 'NONE' && !item.ownAcknowledgedAt ? <BButton kind="teal" full disabled={busy} onClick={() => onAction('ACKNOWLEDGE')}>{t.confirmRead}</BButton> : null}
            {item.acknowledgement !== 'REQUIRED' && !item.ownReadAt && !item.ownAcknowledgedAt ? <BButton kind={item.acknowledgement === 'NONE' ? 'teal' : 'quiet'} full disabled={busy} onClick={() => onAction('MARK_READ')}>{t.markRead}</BButton> : null}
          </div>
        </BCard>
        {item.canWithdraw ? <BCard title={t.published} id="b-update-withdraw">
          <div className="eb-status">{withdraw ? <>
            <p className="eb-para">{t.withdrawText}</p>
            <div className="eb-btns"><BButton kind="quiet" disabled={busy} onClick={() => onWithdraw(false)}>{t.keepUpdate}</BButton><button type="button" className="b-btn eb-btn-danger" disabled={busy} onClick={() => onAction('WITHDRAW')}>{t.confirmWithdraw}</button></div>
          </> : <button type="button" className="b-btn eb-btn-danger-quiet b-btn--full" disabled={busy} onClick={() => onWithdraw(true)}>{t.withdraw}</button>}</div>
        </BCard> : null}
      </> : null}
      {opening ? <p className="b-sr" role="status">{t.opening}</p> : null}
      {openError ? <p className="b-note" role="status">{t.openError}</p> : null}
    </BStack>
  </BScreen>;
}

/** Write an update: the form's hero (the form itself is the page's own, kept beside this screen and lifted under it). */
export function EmployeeComposeB() {
  const t = accountCopy(usePortalLang()).messages;
  return <BScreen back>
    <BHero back={{href: '/app/updates', label: t.cancel, close: true}} title={t.write} titleId="b-compose-title" sub={t.composeSub} />
  </BScreen>;
}
