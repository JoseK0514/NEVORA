'use client';

import Link from 'next/link';
import {useState, type MouseEvent, type ReactNode} from 'react';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {ArrowsLeftRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import {HandCoinsIcon} from '@phosphor-icons/react/dist/ssr/HandCoins';
import {UserMinusIcon} from '@phosphor-icons/react/dist/ssr/UserMinus';
import {UserPlusIcon} from '@phosphor-icons/react/dist/ssr/UserPlus';
import './employee-shift-sheet.css';
import {QuietSheet, SheetCancel} from './quiet/quiet-sheet';
import {Dotted} from './employee-b/parts';
import {usePortalLang} from '@/lib/i18n/portal-lang';
import {employeeScheduleCopy} from './employee-schedule-copy';

/* v5 Schedule (mockup E03): tapping a shift opens it as a sheet over the week: the shift in full, then the ways to
 * change it. Swap, Offer it for cover and Unable to work open their own sheets (intercepted routes) over Schedule.
 * The row is a real link (?shift=…) so the sheet also opens from a shared URL or without script. */

export type ShiftSheetShift = {
  id: string;
  /** "Sunday, Oct 25" */
  day: string;
  /** "8:00 AM – 4:00 PM" */
  hours: string;
  /** "8 hours" */
  length: string;
  ends?: string | null;
  location: string;
  position?: string | null;
  lead: boolean;
  calloutApproved: boolean;
  /** What can still change: a swap or cover offer needs an upcoming shift; Unable to work needs one not yet ended. */
  canSwap: boolean;
  canReport: boolean;
};

export function ShiftSheetRow({shift, href, closeHref, title, detail, initiallyOpen = false}: {shift: ShiftSheetShift; href: string; closeHref: string; title: string; detail: string; initiallyOpen?: boolean}) {
  const [open, setOpen] = useState(initiallyOpen);
  const t = employeeScheduleCopy(usePortalLang());
  const id = encodeURIComponent(shift.id);
  return <li>
    <Link className="q-row" href={href} scroll={false} aria-haspopup="dialog" onClick={event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      setOpen(true);
    }}>
      <span className="q-rt"><b>{title}</b><i>{detail}</i></span>
      <CaretRightIcon weight="bold" className="q-chev" aria-hidden="true"/>
    </Link>
    <QuietSheet open={open} labelledBy={`shift-${shift.id}-title`} onClose={() => {
      setOpen(false);
      // Opened from a shared URL: drop ?shift= so Back and a refresh don't reopen it.
      if (initiallyOpen && window.location.search.includes('shift=')) window.history.replaceState(window.history.state, '', closeHref);
    }}>
      <div className="q-nav"><span/><span className="q-nav__t">{t.shift}</span><SheetCancel href={closeHref} className="q-nav__r q-nav__r--b">{t.done}</SheetCancel></div>
      <div className="q-hd"><h1 id={`shift-${shift.id}-title`}>{shift.day}</h1><p>{shift.hours} · {shift.length}{shift.ends ? ` · ${t.endsLower(shift.ends)}` : ''}</p></div>
      <ul className="q-list" style={{marginTop: 16}}>
        <li><div className="q-row q-row--one"><span className="q-rt"><b>{t.location}</b></span><span className="q-rv q-rv--l">{shift.location}</span></div></li>
        {shift.position ? <li><div className="q-row q-row--one"><span className="q-rt"><b>{t.position}</b></span><span className="q-rv q-rv--l">{shift.position}</span></div></li> : null}
        {shift.lead ? <li><div className="q-row q-row--one"><span className="q-rt"><b>{t.shiftLead}</b></span><span className="q-rv q-rv--l">{t.you}</span></div></li> : null}
        {shift.calloutApproved ? <li><div className="q-row q-row--one"><span className="q-rt"><b>{t.cantWork}</b></span><span className="q-rv q-rv--l">{t.approved}</span></div></li> : null}
      </ul>
      {shift.canSwap || shift.canReport ? <>
        <div className="q-grp"><h2>{t.changeShift}</h2></div>
        <ul className="q-list" onClick={event => { if ((event.target as HTMLElement).closest('a')) setOpen(false); }}>
          {shift.canSwap ? <li><Link className="q-row q-row--one" href={`/app/exchange/swap?sourceShiftId=${id}`}><span className="q-row__ic" aria-hidden="true"><ArrowsLeftRightIcon weight="bold" className="q-ic"/></span><span className="q-rt"><b>{t.swapTeammate}</b></span><CaretRightIcon weight="bold" className="q-chev" aria-hidden="true"/></Link></li> : null}
          {shift.canSwap ? <li><Link className="q-row q-row--one" href={`/app/exchange/swap?sourceShiftId=${id}&mode=cover`}><span className="q-row__ic" aria-hidden="true"><HandCoinsIcon weight="bold" className="q-ic"/></span><span className="q-rt"><b>{t.offerCover}</b></span><CaretRightIcon weight="bold" className="q-chev" aria-hidden="true"/></Link></li> : null}
          {shift.canReport ? <li><Link className="q-row q-row--one q-row--danger" href={`/app/exchange/callout?shiftId=${id}`}><span className="q-row__ic" aria-hidden="true"><UserMinusIcon weight="bold" className="q-ic"/></span><span className="q-rt"><b>{t.cantWorkShift}</b></span><CaretRightIcon weight="bold" className="q-chev" aria-hidden="true"/></Link></li> : null}
        </ul>
        <p className="q-help">{t.staysYours}</p>
      </> : null}
    </QuietSheet>
  </li>;
}

/** Corporate (Release 1, board E-ShiftDetail; Nov 1 upscale S5, S12): the same row and sheet on the corporate kit. The row is a kit row (day in
 * the lead column, hours and place); the sheet shows the shift in full, then Swap, Offer for cover and I can't work. */
export function ShiftSheetCorpRow({shift, href, closeHref, lead, title, detail, trail, initiallyOpen = false, b}: {shift: ShiftSheetShift; href: string; closeHref: string; lead?: string; title: string; detail: string; trail?: ReactNode; initiallyOpen?: boolean;
  /** Direction B (Employee phones): the same row and sheet, drawn as the phone screen's row (day lead, a chip beside the hours, a chevron). */
  b?: {lead: ReactNode; chip?: ReactNode; label?: string; /** The facts line when the caller draws it (Schedule joins a time fact to it on narrow phones); else `detail`. */ sub?: ReactNode}}) {
  const [open, setOpen] = useState(initiallyOpen);
  const t = employeeScheduleCopy(usePortalLang());
  const id = encodeURIComponent(shift.id);
  // Upscale S5/S12: the details on one line ("Barista · Condado · 8 h"), in a white card under the "Tomorrow, Nov 2" title.
  const facts = [shift.position, shift.location, shift.length, shift.ends ? t.endsLower(shift.ends) : null, shift.lead ? t.youreLead : null, shift.calloutApproved ? t.cantWorkApproved : null].filter(Boolean).join(' · ');
  const opener = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    setOpen(true);
  };
  return <li className={b ? 'b-li' : undefined}>
    {b ? <Link className="b-row b-row--link" href={href} scroll={false} aria-haspopup="dialog" aria-label={b.label} onClick={opener}>
      {b.lead}
      <span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">{title}</span>{b.chip ?? null}</span><span className="b-row__s">{b.sub ?? <Dotted text={detail}/>}</span></span>
      <CaretRightIcon className="b-chev" size={18} weight="bold" aria-hidden="true"/>
    </Link> : <Link className="c-row" href={href} scroll={false} aria-haspopup="dialog" onClick={opener}>
      {lead ? <span className="c-row__lead">{lead}</span> : null}
      <span className="c-row__main"><span className="c-row__title">{title}</span><span className="c-row__detail"><span>{detail}</span>{trail ?? null}</span></span>
      {/* Board G-E-Schedule: a row with a status pill has no chevron. */}
      {trail ? null : <CaretRightIcon className="c-chev" weight="bold" aria-hidden="true"/>}
    </Link>}
    <QuietSheet open={open} labelledBy={`shift-${shift.id}-title`} onClose={() => {
      setOpen(false);
      if (initiallyOpen && window.location.search.includes('shift=')) window.history.replaceState(window.history.state, '', closeHref);
    }}>
      <div className="c-sheet c-esheet" data-corp="">
        <div className="c-sheet__nav"><span/><h1 className="c-sheet__title" id={`shift-${shift.id}-title`}>{shift.day}</h1><SheetCancel href={closeHref} className="c-sheet__done">{t.done}</SheetCancel></div>
        <div className="c-card c-sheet__shift c-esheet__card">
          <b className="c-big">{shift.hours}</b>
          <span className="c-sheet__place">{facts}</span>
        </div>
        {shift.canSwap || shift.canReport ? <>
          <ul className="c-card c-rows c-sheet__actions" aria-label={t.changeShift} onClick={event => { if ((event.target as HTMLElement).closest('a')) setOpen(false); }}>
            {shift.canSwap ? <li><Link className="c-row c-row--one" href={`/app/exchange/swap?sourceShiftId=${id}`}><span className="c-row__icon" aria-hidden="true"><ArrowsLeftRightIcon className="c-ic" weight="bold"/></span><span className="c-row__main"><span className="c-row__title">{t.swapSomeone}</span></span><CaretRightIcon className="c-chev" weight="bold" aria-hidden="true"/></Link></li> : null}
            {shift.canSwap ? <li><Link className="c-row c-row--one" href={`/app/exchange/swap?sourceShiftId=${id}&mode=cover`}><span className="c-row__icon" aria-hidden="true"><UserPlusIcon className="c-ic" weight="bold"/></span><span className="c-row__main"><span className="c-row__title">{t.offerForCover}</span></span><CaretRightIcon className="c-chev" weight="bold" aria-hidden="true"/></Link></li> : null}
            {shift.canReport ? <li><Link className="c-row c-row--danger" href={`/app/exchange/callout?shiftId=${id}`}><span className="c-row__icon" aria-hidden="true"><UserMinusIcon className="c-ic" weight="bold"/></span><span className="c-row__main"><span className="c-row__title">{t.iCantWork}</span><span className="c-row__detail"><span>{t.tellsManager}</span></span></span><CaretRightIcon className="c-chev" weight="bold" aria-hidden="true"/></Link></li> : null}
          </ul>
          {/* Employee desktop (Nov 8, 2026): the panel says what changing it means; shown only there (employee-b-desktop.css). */}
          <p className="c-esheet__note">{t.staysYours}</p>
        </> : null}
      </div>
    </QuietSheet>
  </li>;
}
