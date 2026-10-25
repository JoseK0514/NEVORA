'use client';

import Link from 'next/link';
import {useState} from 'react';
import {PlusIcon} from '@phosphor-icons/react/dist/ssr/Plus';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {QuietSheet, SheetCancel} from '@/components/quiet/quiet-sheet';

/** UX-E-21: Plus on Requests asks what to start, instead of always starting time off. Only the company's modules. */
export function RequestHubAdd({timeOff, marketplace}: {timeOff: boolean; marketplace: boolean}) {
  const [open, setOpen] = useState(false);
  if (!timeOff && !marketplace) return null;
  const option = (href: string, title: string, detail: string) => <li><Link className="q-row" href={href} onClick={() => setOpen(false)}>
    <span className="q-rt"><b>{title}</b><i>{detail}</i></span><CaretRightIcon className="q-chev" aria-hidden="true"/>
  </Link></li>;
  return <>
    <button type="button" className="q-bar__icon" aria-label="New request" aria-haspopup="dialog" onClick={() => setOpen(true)}><PlusIcon className="q-ic" aria-hidden="true"/></button>
    <QuietSheet open={open} label="New request" onClose={() => setOpen(false)}>
      <div className="q-nav"><SheetCancel href="/app/requests/hub"/><span className="q-nav__t">New request</span><span/></div>
      <ul className="q-list" style={{marginTop: 16}}>
        {timeOff ? option('/app/requests?tab=new', 'Take time off', 'A day, several days or part of a day') : null}
        {marketplace ? option('/app/schedule?view=open', 'Pick up a shift', 'Open shifts your team offers') : null}
        {marketplace ? option('/app/schedule', 'Change one of my shifts', 'Swap it, offer it for cover, or say you can’t work it') : null}
      </ul>
    </QuietSheet>
  </>;
}
