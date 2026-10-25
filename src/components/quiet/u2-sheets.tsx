'use client';

import './u2.css';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect, useRef, useState, type MouseEvent, type ReactNode} from 'react';
import {useFormStatus} from 'react-dom';
import {CheckIcon} from '@phosphor-icons/react/dist/ssr/Check';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {QuietSheet, useSheetClose} from './quiet-sheet';
import {toast} from '../toaster';

/* Team U2 (Schedule, Oct 25, 2026): the Schedule's sheets on the v5 sheet (E03 header grammar: Cancel · Title · Done),
 * never a footer Close. A choice that changes the page (a link) closes its sheet (F4). */

/** Closes the sheet it sits in when a link inside is followed (a plain click; a new-tab click leaves it open). */
function closeOnLink(close: (() => void) | null) {
  return (event: MouseEvent<HTMLElement>) => {
    if (!close || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if ((event.target as Element).closest('a[href]')) close();
  };
}

/** The sheet's bar: an optional Cancel on the left, the title, an optional Done on the right. */
export function SheetBar({title, cancel = false, done = false, titleId}: {title: string; cancel?: boolean; done?: boolean; titleId?: string}) {
  const close = useSheetClose();
  return <div className="q-nav">
    {cancel ? <button type="button" className="q-nav__l q-nav__l--teal" onClick={() => close?.()}>Cancel</button> : <span />}
    <h2 className="q-nav__t u2-sheet-title" id={titleId}>{title}</h2>
    {done ? <button type="button" className="q-nav__r q-nav__r--b" onClick={() => close?.()}>Done</button> : <span />}
  </div>;
}

/** The content of a sheet: closes it when one of its links is followed. */
export function SheetBody({children, className}: {children: ReactNode; className?: string}) {
  const close = useSheetClose();
  return <div className={className} onClick={closeOnLink(close)}>{children}</div>;
}

/** A bar or row button that opens a sheet. */
export function SheetTrigger({label, className, content, title, children, cancel, done, id}: {
  /** The button's accessible name ("Location: Main Office"). */
  label: string; className: string; content: ReactNode;
  /** The sheet's title in its bar. */
  title: string; cancel?: boolean; done?: boolean; id?: string; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" id={id} className={className} aria-haspopup="dialog" aria-expanded={open} aria-label={label} onClick={() => setOpen(true)}>{content}</button>
    <QuietSheet open={open} label={title} onClose={() => setOpen(false)}>
      <SheetBar title={title} cancel={cancel} done={done} />
      <SheetBody>{children}</SheetBody>
    </QuietSheet>
  </>;
}

/** A radio-style row that navigates (T-10, the week items it replaced): a checkmark on the current choice. */
export function SheetChoice({href, label, detail, current}: {href: string; label: string; detail?: string; current?: boolean}) {
  return <li><Link className={`q-row${detail ? '' : ' q-row--one'} u2-choice`} href={href} aria-current={current ? 'true' : undefined} scroll={false}>
    <span className="q-rt"><b>{label}</b>{detail ? <i>{detail}</i> : null}</span>
    {current ? <CheckIcon className="q-check" aria-hidden="true" /> : <span className="u2-choice__space" aria-hidden="true" />}
  </Link></li>;
}

/** A sheet that is open because the address says so (`?plan=1`); closing it drops those parameters. */
export function RouteParamSheet({label, params, children}: {label: string; params: string[]; children: ReactNode}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  return <QuietSheet open={open} label={label} onClose={() => {
    setOpen(false);
    const url = new URL(window.location.href);
    params.forEach(name => url.searchParams.delete(name));
    url.hash = '';
    router.replace(`${url.pathname}${url.search}`, {scroll: false});
  }}>{children}</QuietSheet>;
}

/** A confirmed outcome (a redirect flag the server checked, or a receipt) shown once as a toast. */
export function ToastOnArrival({id, message, dropParams = []}: {id: string; message: string; /** One-time address parameters to remove after showing (a reload doesn't repeat it). */ dropParams?: string[]}) {
  const drop = dropParams.join(',');
  const shown = useRef<string | null>(null);
  useEffect(() => {
    if (drop) {
      const url = new URL(window.location.href);
      drop.split(',').forEach(name => url.searchParams.delete(name));
      window.history.replaceState(window.history.state, '', url);
    }
    // Once per arrival: a refresh of the same page keeps this mount (and its ref); a new arrival mounts it again.
    if (shown.current === id) return;
    shown.current = id;
    toast(message);
  }, [id, message, drop]);
  return null;
}

/** A row that opens a sheet of its own (How the order is chosen, Skipped). */
export function SheetRowButton({title, detail, value, sheetTitle, children, tone}: {title: string; detail?: string; value?: string; sheetTitle: string; children: ReactNode; tone?: 'go'}) {
  const [open, setOpen] = useState(false);
  return <li>
    <button type="button" className={`q-row q-row--btn${detail ? '' : ' q-row--one'}${tone === 'go' ? ' u2-row--go' : ''}`} aria-haspopup="dialog" onClick={() => setOpen(true)}>
      <span className="q-rt"><b>{title}</b>{detail ? <i>{detail}</i> : null}</span>
      {value ? <span className="q-rv">{value}</span> : null}
      <CaretRightIcon className="q-chev" aria-hidden="true" />
    </button>
    <QuietSheet open={open} label={sheetTitle} onClose={() => setOpen(false)}>
      <SheetBar title={sheetTitle} done />
      <SheetBody>{children}</SheetBody>
    </QuietSheet>
  </li>;
}

/** A submit that names its target ("Publish Main Office") and shows a spinner while it is sending; a second press is refused. */
export function U2Submit({children, pendingText, className, ariaLabel, disabled = false}: {children: ReactNode; pendingText: string; className: string; ariaLabel?: string; disabled?: boolean}) {
  const {pending} = useFormStatus();
  return <button type="submit" className={className} aria-label={ariaLabel} disabled={(disabled && !pending) || undefined} aria-disabled={pending || undefined} aria-busy={pending || undefined}
    onClick={event => { if (pending) event.preventDefault(); }}>
    {pending ? <><span className="u2-spin" aria-hidden="true" />{pendingText}</> : children}
  </button>;
}
