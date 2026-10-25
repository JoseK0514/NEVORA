'use client';

import './u2.css';
import Link from 'next/link';
import {useState} from 'react';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {ClockCounterClockwiseIcon} from '@phosphor-icons/react/dist/ssr/ClockCounterClockwise';
import {CopyIcon} from '@phosphor-icons/react/dist/ssr/Copy';
import {DotsThreeCircleIcon} from '@phosphor-icons/react/dist/ssr/DotsThreeCircle';
import {FilesIcon} from '@phosphor-icons/react/dist/ssr/Files';
import {MagicWandIcon} from '@phosphor-icons/react/dist/ssr/MagicWand';
import {PrinterIcon} from '@phosphor-icons/react/dist/ssr/Printer';
import {SlidersHorizontalIcon} from '@phosphor-icons/react/dist/ssr/SlidersHorizontal';
import {QuietSheet, useSheetClose} from './quiet-sheet';
import {SheetBar, SheetBody, SheetChoice, SheetTrigger, U2Submit} from './u2-sheets';
import {ScheduleCopyForm} from '../schedule-copy-form';
import {publishScheduleAction} from '@/app/app/schedule/actions';
import type {CopyCommand} from '@/lib/data/schedule-copy';

/* Team U2 (Oct 25, 2026): the Owner and Manager Schedule's sheets. T-10 Location (checkmark, tap applies and closes),
 * T-8 "…" (Plan items only: no week items, no deadline field; UX-O-12/13/14), and the week's Publish confirmation. */

/** T-10: "Cancel · Location ·", radio rows with a checkmark on the current choice. */
export function LocationSheet({current, options}: {current: string; options: {href: string; label: string; current: boolean}[]}) {
  return <SheetTrigger title="Location" cancel className="q-sched-loc u2-loc" label={`Location: ${current}`}
    content={<><span className="u2-loc__name">{current}</span><CaretDownIcon className="q-ic q-ic--s" aria-hidden="true" /></>}>
    <ul className="q-list u2-sheet-list" aria-label="Locations">
      {options.map(option => <SheetChoice key={option.href} href={option.href} label={option.label} current={option.current} />)}
    </ul>
  </SheetTrigger>;
}

function MenuRow({icon, title, detail, href, onClick}: {icon: React.ReactNode; title: string; detail: string; href?: string; onClick?: () => void}) {
  const body = <><span className="q-row__ic" aria-hidden="true">{icon}</span><span className="q-rt"><b>{title}</b><i>{detail}</i></span><CaretRightIcon className="q-chev" aria-hidden="true" /></>;
  return <li>{href ? <Link className="q-row" href={href}>{body}</Link> : <button type="button" className="q-row q-row--btn" onClick={onClick}>{body}</button>}</li>;
}

/** T-8: the Schedule's "…": Build and publish, Copy previous week (confirmed in place), Templates, Activity,
 * Scheduling rules and Print. Changing the week uses the arrows in the bar. */
export function ScheduleMoreSheet({planHref, templatesHref, activityHref, rulesHref, previousLabel, weekLabel, actorId, copyCommand}: {
  planHref: string; templatesHref: string; activityHref: string; rulesHref: string;
  /** "Oct 12 – 18" and "Oct 19 – 25", for the copy confirmation. */
  previousLabel: string; weekLabel: string; actorId: string; copyCommand: CopyCommand;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'menu' | 'copy'>('menu');
  const close = () => { setOpen(false); setView('menu'); };
  return <>
    <button type="button" className="q-bar__icon" aria-haspopup="dialog" aria-expanded={open} aria-label="More schedule actions" onClick={() => setOpen(true)}>
      <DotsThreeCircleIcon className="q-ic" aria-hidden="true" />
    </button>
    <QuietSheet open={open} label={view === 'copy' ? 'Copy previous week' : 'Schedule'} onClose={close}>
      {view === 'menu' ? <>
        <SheetBar title="Schedule" done />
        <SheetBody>
          <ul className="q-list u2-sheet-list" aria-label="Plan">
            <MenuRow href={planHref} icon={<MagicWandIcon className="q-ic" />} title="Build and publish" detail="Fill the week, then publish it" />
            <MenuRow onClick={() => setView('copy')} icon={<CopyIcon className="q-ic" />} title="Copy previous week" detail={`From ${previousLabel}`} />
            <MenuRow href={templatesHref} icon={<FilesIcon className="q-ic" />} title="Templates" detail="Reusable weeks" />
            <MenuRow href={activityHref} icon={<ClockCounterClockwiseIcon className="q-ic" />} title="Activity" detail="Publications and changes" />
            <MenuRow href={rulesHref} icon={<SlidersHorizontalIcon className="q-ic" />} title="Scheduling rules" detail="Coverage and hour targets" />
            <MenuRow onClick={() => { close(); window.setTimeout(() => window.print(), 280); }} icon={<PrinterIcon className="q-ic" />} title="Print schedule" detail="A one-page week for the break room" />
          </ul>
        </SheetBody>
      </> : <>
        <div className="q-nav">
          <button type="button" className="q-nav__l q-nav__l--teal" onClick={() => setView('menu')}>Back</button>
          <h2 className="q-nav__t u2-sheet-title">Copy previous week</h2><span />
        </div>
        <div className="u2-copy">
          <p className="q-body">{`Adds the shifts from ${previousLabel} to ${weekLabel} as drafts. Shifts that would conflict are skipped, and nothing is published.`}</p>
          <ScheduleCopyForm actorId={actorId} command={copyCommand} label="Copy shifts" className="q-btn" />
          <button type="button" className="q-btn q-btn--sec" onClick={() => setView('menu')}>Keep this week</button>
        </div>
      </>}
    </QuietSheet>
  </>;
}

/** UX-O-14: Publish is the week's main action. It asks once ("Publish Oct 19 – 25 for Main Office?"); the server still
 * checks readiness and opens the review when something needs a look. */
export function PublishWeekButton({weekStart, locationId, locationName, weekLabel, shifts}: {weekStart: string; locationId: string; locationName: string; weekLabel: string; shifts: number}) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="q-bs q-bs--go" aria-haspopup="dialog" aria-label={`Publish ${locationName}`} onClick={() => setOpen(true)}>Publish</button>
    <QuietSheet open={open} label={`Publish ${locationName}`} onClose={() => setOpen(false)}>
      <SheetBar title="Publish" cancel />
      <div className="u2-confirm">
        <p className="u2-confirm__title">{`Publish ${weekLabel} for ${locationName}?`}</p>
        <p className="q-help u2-confirm__detail">{`${shifts} ${shifts === 1 ? 'shift' : 'shifts'}. Your team can see the week once it’s published.`}</p>
        <form action={publishScheduleAction}>
          <input type="hidden" name="weekStart" value={weekStart} />
          <input type="hidden" name="locationId" value={locationId} />
          <U2Submit className="q-btn" pendingText="Publishing…">Publish</U2Submit>
        </form>
        <SheetCancelButton />
      </div>
    </QuietSheet>
  </>;
}

/** The thumb-reach twin of the bar's Cancel. */
function SheetCancelButton() {
  const close = useSheetClose();
  return <button type="button" className="q-btn q-btn--sec" onClick={() => close?.()}>Not now</button>;
}
