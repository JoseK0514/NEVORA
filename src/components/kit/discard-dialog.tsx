'use client';

import {useEffect, useId, useRef} from 'react';
import {QuietSheet, useSheetClose} from '../quiet/quiet-sheet';
import {momentsCopy, type MomentsLang} from '../owner-b/moments-copy';
import {useDiscardGuard, useFormDirty} from './use-discard-guard';
import './discard-dialog.css';

/* "Discard changes?" (Jose, Nov 21, 2026; DESIGN.MD "One confirm"): the question asked when an Owner or Manager leaves
 * a form with edits that are not saved. It is the app's sheet (a native modal dialog: focus stays inside, Escape and a
 * tap outside are "Keep editing", the page behind is inert), drawn like the Remove tablet question: a centred 460px
 * dialog from 768px, a bottom sheet on phones, the safe way out as quiet text on the left and the red-edged commit on
 * the right. Its look is in discard-dialog.css; its motion is the kit's (b-motion.css). */

function Body({titleId, lineId, lang, onDiscard, open}: {titleId: string; lineId: string; lang: MomentsLang; onDiscard: () => void; open: boolean}) {
  const t = momentsCopy(lang), close = useSheetClose(), keep = useRef<HTMLButtonElement>(null);
  // A question that can lose work starts on the safe answer.
  useEffect(() => { if (open) keep.current?.focus({preventScroll: true}); }, [open]);
  return <div className="b-discard" data-discard-skip="" lang={lang === 'es' ? 'es' : undefined}>
    <h2 className="b-discard__t" id={titleId}>{t.discardTitle}</h2>
    <p className="b-discard__s" id={lineId}>{t.discardLine}</p>
    <div className="b-discard__acts">
      <button ref={keep} type="button" className="b-btn b-btn--quiet b-discard__keep" onClick={() => close?.()}>{t.discardKeep}</button>
      <button type="button" className="b-btn b-btn--quiet b-discard__go" onClick={onDiscard}>{t.discardGo}</button>
    </div>
  </div>;
}

export function DiscardDialog({open, onKeep, onDiscard, lang = 'en'}: {open: boolean; onKeep: () => void; onDiscard: () => void; lang?: MomentsLang}) {
  const id = useId(), titleId = `${id}-discard-t`, lineId = `${id}-discard-s`;
  return <QuietSheet open={open} onClose={onKeep} role="alertdialog" labelledBy={titleId} describedBy={lineId}>
    {open ? <Body titleId={titleId} lineId={lineId} lang={lang} onDiscard={onDiscard} open={open} /> : null}
  </QuietSheet>;
}

/** The guard for a form that knows when it is dirty: the hook and its question in one line. */
export function DiscardGuard({dirty, lang}: {dirty: boolean; lang?: MomentsLang}) {
  const guard = useDiscardGuard(dirty);
  return <DiscardDialog open={guard.asking} onKeep={guard.keep} onDiscard={guard.discard} lang={lang} />;
}

/** The guard for a form that keeps no "dirty" of its own: placed inside the form (or given its id), it compares the
 * form's named fields with where they started. `resetKey` changes on a confirmed save; `off` holds it clean (a result
 * is showing, the form is being sent away). */
export function FormDiscardGuard({form, off, resetKey, lang}: {form?: string; off?: boolean; resetKey?: unknown; lang?: MomentsLang}) {
  const mark = useRef<HTMLSpanElement>(null);
  const dirty = useFormDirty(() => (form ? document.getElementById(form) : mark.current?.closest('form')) as HTMLFormElement | null, {off, resetKey});
  return <><span ref={mark} hidden data-discard-guard="" /><DiscardGuard dirty={dirty} lang={lang} /></>;
}
