'use client';

import Link from 'next/link';
import {type ReactNode} from 'react';
import {MegaphoneIcon} from '@phosphor-icons/react/dist/ssr/Megaphone';
import {PlusIcon} from '@phosphor-icons/react/dist/ssr/Plus';
import {BButtonLink, BCard, BHero, BIcon, BList, BRow, BScreen, BSegs, BState, type BStateKind} from './owner-b/b-kit';
import {CorpButtonLink, CorpNav, CorpPage, CorpTitle} from './corp/corp';
import type {CommunicationListRead, CommunicationRead} from '../lib/communications/types';
import './messages-manager-b.css';

/* Messages for Owners and Managers, Direction B (Phase 2, package Messages, Nov 23, 2026). The same reads, links and
 * commands as before; the screens are drawn with the kit the Lead's and Employee's Updates use (employee-b/messages-b.tsx):
 * a teal band with the title and one white action, then white cards of rows. On a phone the band is the BScreen hero; on
 * tablets and desktop it is the page's CorpTitle and the same cards follow it (Team's pattern, owner-b/team-b.tsx). */

export type ReadyUpdate = Extract<CommunicationRead, {state: 'ready'}>;

/** "Mon, Nov 23", the Lead's and Employee's day on an update row. */
export const updateDay = (at: string, timeZone: string) => new Intl.DateTimeFormat('en-US', {timeZone, weekday: 'short', month: 'short', day: 'numeric'}).format(new Date(at));
/** "Nov 23, 7:38 AM" (the year only when it isn't this year), the band's line on an update. */
export function updateStamp(at: string, timeZone: string, now = new Date()) {
  const d = new Date(at), year = (date: Date) => new Intl.DateTimeFormat('en-US', {timeZone, year: 'numeric'}).format(date);
  return new Intl.DateTimeFormat('en-US', {timeZone, month: 'short', day: 'numeric', ...(year(d) === year(now) ? {} : {year: 'numeric'}), hour: 'numeric', minute: '2-digit'}).format(d);
}
/** Who confirmed it. A recipient's receipt records an acknowledgement only (a "Mark as read" is not sent back), so the
 * count says acknowledged, the word the person's own button uses; it never claims who has read it. */
export function acknowledgedLine(item: ReadyUpdate) {
  const people = item.management?.recipients;
  return people?.length ? `${people.filter(person => person.acknowledgedAt).length} of ${people.length} acknowledged` : null;
}
/** The update's place, when the person manages more than one (one place is always the same, so it isn't repeated). */
export function updatePlace(item: ReadyUpdate, places: Record<string, string> | null) {
  const id = item.management?.draft.scope.locationId;
  return id && places ? places[id] ?? null : null;
}

export type ManagerListStatus = {kind: BStateKind; title: string; line?: string; action?: {label: string; href?: string; onClick?: () => void; busy?: boolean}};

/** The band, then the cards. The cards are drawn once (b-keep): on a phone they sit under the BScreen's hero and lift over
 * it as its stack would; on tablets and desktop they follow the page's CorpTitle, which the B layer paints as the band. So
 * every control, live region and focus target exists once. */
export function ManagerMessagesPage({className, titleId, title, sub, back, deskBack, action, phoneRight, cards, label, phoneBand, band, busy}: {
  /** A control that belongs to the band (filters): in the hero on a phone, under the title (the band) from 768px. */ phoneBand?: ReactNode; band?: ReactNode;
  /** A read is in flight. */ busy?: boolean;
  className: string; titleId: string; title: ReactNode; sub?: ReactNode; back?: {href: string; label: string; close?: boolean};
  /** Gaps item F9 (Nov 23, 2026): the back link also on the band from 768px ("‹ Home", "‹ Updates"), as Shift requests has. */ deskBack?: boolean;
  /** The band's one action on tablets and desktop. */ action?: ReactNode;
  /** The hero's one action on a phone. */ phoneRight?: ReactNode;
  cards: ReactNode; label?: string;
}) {
  return <CorpPage className={`c-page--narrow mb-page ${className}`} labelledBy={titleId}>
    <BScreen back={!!back}>
      <BHero back={back} title={title} titleId={`b-${titleId}`} sub={sub} right={phoneRight}>{phoneBand}</BHero>
    </BScreen>
    {deskBack && back ? <CorpNav back={back} phoneOnly /> : null}
    <CorpTitle id={titleId} title={title} sub={sub} actions={action} wide={!!back} />
    {band ?? null}
    <div className="b-keep mb-cards" role={label ? 'group' : undefined} aria-label={label} aria-busy={busy || undefined}>{cards}</div>
  </CorpPage>;
}

/** A card with the kit's one state (loading, failed, paused, signed out, empty). */
export function ManagerStateCard({status}: {status: ManagerListStatus}) {
  return <BCard><BState kind={status.kind} title={status.title} line={status.line} action={status.action} /></BCard>;
}

/** Updates (B6): updates that must be read first, then the others; each row says where (with more than one place), when
 * and how many have acknowledged it. New update is the band's one action. */
export function ManagerUpdatesView({list, status, partial, places}: {
  list: Extract<CommunicationListRead, {state: 'complete' | 'partial'}> | null; status: ManagerListStatus | null; partial: boolean; places: Record<string, string> | null;
}) {
  const items = list?.items.filter((item): item is ReadyUpdate => item.state === 'ready') ?? [];
  const required = items.filter(item => item.acknowledgement === 'REQUIRED'), other = items.filter(item => item.acknowledgement !== 'REQUIRED');
  const row = (item: ReadyUpdate) => {
    const people = item.management?.recipients, waiting = item.acknowledgement === 'REQUIRED' && !!people?.some(person => !person.acknowledgedAt);
    return <BRow key={item.id} href={'/app/updates/' + item.id} lead={<BIcon tone={waiting ? 'amber' : 'grey'}><MegaphoneIcon weight="bold" /></BIcon>}
      title={item.title} sub={<BSegs parts={[updatePlace(item, places), updateDay(item.publishedAt, item.timeZone), acknowledgedLine(item)]} />} />;
  };
  const cards = status ? <ManagerStateCard status={status} /> : <>
    {partial ? <p className="b-note mb-note" role="status">Some updates couldn’t load. Try again to check for the rest.</p> : null}
    {required.length ? <BCard title="Must be confirmed" id="updates-required"><BList label="Must be confirmed">{required.map(row)}</BList></BCard> : null}
    {other.length ? <BCard title={required.length ? 'Other updates' : undefined} label={required.length ? undefined : 'Updates'} id="updates-other"><BList label={required.length ? 'Other updates' : 'Updates'}>{other.map(row)}</BList></BCard> : null}
    {!items.length ? <BCard label="Updates"><BState kind="empty" icon={<MegaphoneIcon weight="bold" />} title={partial ? 'No updates available in this view' : 'No updates yet'}
      line={partial ? 'Some updates couldn’t be checked. Try again to check for the rest.' : 'Tell your team about hours, menus or events.'} /></BCard> : null}
  </>;
  return <ManagerMessagesPage className="mb-updates" titleId="updates-title" title="Updates" back={{href: '/app/more', label: 'More'}}
    phoneRight={<BButtonLink href="/app/updates/compose" kind="white"><PlusIcon size={17} weight="bold" aria-hidden="true" />New update</BButtonLink>}
    action={<CorpButtonLink href="/app/updates/compose" size="md"><PlusIcon className="c-ic c-ic--s" weight="bold" aria-hidden="true" />New update</CorpButtonLink>}
    cards={cards} />;
}

/** A link styled as the kit's quiet button, for an action inside a card (Edit). */
export function ManagerCardLink({href, children}: {href: string; children: ReactNode}) {
  return <Link className="b-btn b-btn--quiet" href={href}>{children}</Link>;
}
