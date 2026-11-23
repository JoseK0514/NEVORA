'use client';
import { useViewLang } from '@/components/owner-b/use-owner-lang';

import Link from 'next/link';
import {AppRouterContext} from 'next/dist/shared/lib/app-router-context.shared-runtime';
import {createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode} from 'react';
import {ArrowsClockwiseIcon} from '@phosphor-icons/react/dist/ssr/ArrowsClockwise';
import {BellRingingIcon} from '@phosphor-icons/react/dist/ssr/BellRinging';
import {PauseCircleIcon} from '@phosphor-icons/react/dist/ssr/PauseCircle';
import {ProhibitIcon} from '@phosphor-icons/react/dist/ssr/Prohibit';
import {QuestionIcon} from '@phosphor-icons/react/dist/ssr/Question';
import {WarningCircleIcon} from '@phosphor-icons/react/dist/ssr/WarningCircle';
import {WifiSlashIcon} from '@phosphor-icons/react/dist/ssr/WifiSlash';
import {QuietSheet, useSheetClose} from '@/components/quiet/quiet-sheet';
import {BCallout} from '@/components/owner-b/b-kit';
import {reminderCopy, reminderWhen, type ReminderLang} from './copy';
import type {ReminderState, ReminderTarget} from './machine';
import type {ReminderTransport} from './client';
import {useReminders, type ReminderStore} from './use-reminders';
import {reminderLine, type ReminderLine} from './view';

/* Reminders (U10, Nov 17, 2026): the one reminder pattern. A page wraps its people in <ReminderProvider> and puts a
 * <ReminderControl> on each person's row (and, where several people can be reminded, a <ReminderBulkButton> in the
 * card's header). The provider reads eligibility, owns the confirmation sheet and announces results. The page is
 * never told "sent": a receipt is "queued". */

export type ReminderAbout = {kind: 'availability'; week: string} | {kind: 'update'; title: string};
export type ReminderUi = {
  store: ReminderStore; lang: ReminderLang; timeZone: string; actor?: 'OWNER' | 'MANAGER';
  line: (state: ReminderState) => ReminderLine;
  openOne: (employeeId: string) => void; openMany: () => void;
  act: (employeeId: string, action: NonNullable<ReminderLine['action']>) => void;
  rowId: (employeeId: string) => string; bulkId: string;
};
const Context = createContext<ReminderUi | null>(null);

export type ReminderOpen = null | {mode: 'one'; employeeId: string} | {mode: 'many'; people: ReminderTarget[]; stage: 'review' | 'results'; sent: string[]};

export function ReminderProvider({targets, authority, timeZone, actor, about, lang: langProp, onRefresh, transport, children}: {
  /** The people a reminder may be offered for, with the exact source the page is showing. Empty: nothing is offered. */
  targets: ReminderTarget[];
  /** The session's communication authority, from the server page. Without it no control is rendered. */
  authority: string | undefined;
  timeZone: string;
  /** Who is asking, where the page knows it: only the wording of "your access doesn't cover this" depends on it. */
  actor?: 'OWNER' | 'MANAGER'; about: ReminderAbout; lang?: ReminderLang;
  /** Re-reads the page's own source after a conflict. Default: the route's server data. */
  onRefresh?: () => void; transport?: ReminderTransport; children: ReactNode;
}) {
  const lang = useViewLang(langProp);
  // The route's router when there is one. Read from its context (not useRouter, which throws without one) so the pages
  // that mount this still render on their own in unit tests; without a router "Refresh" re-reads the reminder only.
  const router = useContext(AppRouterContext);
  const store = useReminders({targets, authority, transport});
  const [open, setOpen] = useState<ReminderOpen>(null);
  const [said, setSaid] = useState('');
  const prefix = useId();
  const t = reminderCopy[lang];
  const rowId = useCallback((employeeId: string) => `${prefix}rem-${employeeId}`, [prefix]);
  const bulkId = `${prefix}rem-all`;
  const line = useCallback((state: ReminderState) => reminderLine(state, {lang, timeZone, actor}), [lang, timeZone, actor]);
  const names = useMemo(() => new Map(targets.map(target => [target.employeeId, target.name])), [targets]);

  // One polite announcer for results that follow a person's own action (never for the first eligibility read).
  const watched = useRef(new Map<string, string>());
  useEffect(() => {
    for (const [employeeId, before] of watched.current) {
      const state = store.state(employeeId);
      if (!state || state.phase === before || state.phase === 'sending' || state.phase === 'checking' || (state.phase === 'unknown' && state.looking)) continue;
      watched.current.delete(employeeId);
      setSaid(`${names.get(employeeId) ?? ''}: ${line(state).text}`);
    }
  }, [store, names, line]);
  const watch = useCallback((employeeId: string) => { watched.current.set(employeeId, 'sending'); }, []);

  const focusRow = useCallback((employeeId: string) => {
    window.requestAnimationFrame(() => {
      const row = document.getElementById(rowId(employeeId));
      (row?.querySelector<HTMLElement>('button:not(:disabled), a[href]') ?? row)?.focus({preventScroll: false});
    });
  }, [rowId]);

  const refresh = useCallback(() => { if (onRefresh) onRefresh(); else router?.refresh(); }, [onRefresh, router]);
  const act = useCallback<ReminderUi['act']>((employeeId, action) => {
    if (action === 'open') setOpen({mode: 'one', employeeId});
    else if (action === 'refresh') { watch(employeeId); refresh(); store.recheck(employeeId); }
    else if (action === 'retry') { watch(employeeId); store.recheck(employeeId); }
    else if (action === 'check') { watch(employeeId); void store.lookup(employeeId); }
    else if (action === 'again') { watch(employeeId); void store.send(employeeId); }
  }, [store, refresh, watch]);

  const ui = useMemo<ReminderUi>(() => ({store, lang, timeZone, actor, line, act, rowId, bulkId,
    openOne: employeeId => setOpen({mode: 'one', employeeId}),
    openMany: () => { store.targets.forEach(target => store.want(target.employeeId)); setOpen({mode: 'many', people: store.targets, stage: 'review', sent: []}); },
  }), [store, lang, timeZone, actor, line, act, rowId, bulkId]);

  const one = open?.mode === 'one' ? targets.find(target => target.employeeId === open.employeeId) : undefined;
  const oneState = one ? store.state(one.employeeId) : undefined;
  const aboutText = about.kind === 'availability' ? t.aboutAvailability(about.week) : t.aboutUpdate(about.title);
  const titleId = `${prefix}rem-title`;

  return <Context.Provider value={ui}>
    {children}
    <p className="q-sr" role="status" aria-live="polite">{said}</p>
    <QuietSheet open={open !== null} labelledBy={titleId} onClose={() => {
      const was = open; setOpen(null);
      if (was?.mode === 'one') focusRow(was.employeeId);
      else if (was?.mode === 'many') window.requestAnimationFrame(() => {
        const bulk = document.getElementById(bulkId) as HTMLButtonElement | null;
        if (bulk && !bulk.disabled) bulk.focus(); else if (was.people[0]) focusRow(was.people[0].employeeId);
      });
    }}>
      {open?.mode === 'one' && one ? <OneBody titleId={titleId} target={one} state={oneState} ui={ui} about={aboutText} onSend={() => { watch(one.employeeId); void store.send(one.employeeId); }} /> : null}
      {open?.mode === 'many' ? <ManyBody titleId={titleId} open={open} ui={ui} about={aboutText}
        onSend={ids => { setOpen({...open, stage: 'results', sent: ids}); void store.sendMany(ids); }} /> : null}
    </QuietSheet>
  </Context.Provider>;
}

function Facts({rows}: {rows: [string, ReactNode][]}) {
  return <dl className="b-rem-facts">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

function useHeadingFocus(dep: unknown) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => { ref.current?.focus({preventScroll: true}); }, [dep]);
  return ref;
}

/** The check before sending, one person. Exported for the render tests. */
export function OneBody({titleId, target, state, ui, about, onSend}: {titleId: string; target: ReminderTarget; state: ReminderState | undefined; ui: ReminderUi; about: string; onSend: () => void}) {
  const t = reminderCopy[ui.lang], close = useSheetClose();
  const heading = useHeadingFocus(target.employeeId);
  const ready = state?.phase === 'ready' ? state : null;
  const offline = ui.store.offline;
  const rows: [string, ReactNode][] = [[t.factWho, target.name], [t.factAbout, about], [t.factHow, t.how]];
  if (ready) rows.push([t.factWhen, reminderWhen(ready.dueAt, ready.timeZone, ui.lang)], [target.source.kind === 'AVAILABILITY' ? t.factDue : t.factEnds, reminderWhen(ready.expiresAt, ready.timeZone, ui.lang)]);
  rows.push([t.factLimit, t.limit]);
  return <div className="b-rem-sheet">
    <h2 ref={heading} id={titleId} tabIndex={-1} className="b-rem-sheet__t">{t.oneTitle(target.name)}</h2>
    <Facts rows={rows} />
    {/* The person's state changed under the open sheet (or the device went offline): say so and keep Send off. */}
    {!ready && state ? <div className="b-rem-sheet__note"><BCallout tone={ui.line(state).tone === 'amber' ? 'amber' : ui.line(state).tone === 'red' ? 'red' : 'grey'} icon={ui.line(state).tone === 'amber' || ui.line(state).tone === 'red' ? undefined : 'info'} role="status">{ui.line(state).text}</BCallout></div> : null}
    {offline ? <div className="b-rem-sheet__note"><BCallout tone="amber" icon="offline" role="status">{t.offline}</BCallout></div> : null}
    <div className="b-rem-sheet__acts">
      <button type="button" className="b-btn b-btn--teal b-btn--full" disabled={!ready || offline} onClick={() => { onSend(); close?.(); }}>{t.send}</button>
      <button type="button" className="b-btn b-btn--quiet b-btn--full" onClick={() => close?.()}>{t.cancel}</button>
    </div>
  </div>;
}

/** The check before sending, several people, then each person's result. Exported for the render tests. */
export function ManyBody({titleId, open, ui, about, onSend}: {titleId: string; open: Extract<ReminderOpen, {mode: 'many'}>; ui: ReminderUi; about: string; onSend: (ids: string[]) => void}) {
  const t = reminderCopy[ui.lang], close = useSheetClose();
  const heading = useHeadingFocus(open.stage);
  const rows = open.people.map(person => ({person, state: ui.store.state(person.employeeId)}));
  const eligible = rows.filter(row => row.state?.phase === 'ready');
  const first = eligible[0]?.state?.phase === 'ready' ? eligible[0].state : null;
  const results = open.stage === 'results';
  const sent = rows.filter(row => open.sent.includes(row.person.employeeId));
  const working = results && sent.some(row => row.state?.phase === 'sending' || (row.state?.phase === 'unknown' && row.state.looking) || row.state?.phase === 'ready');
  const queued = sent.filter(row => row.state?.phase === 'queued').length;
  const facts: [string, ReactNode][] = [[t.factAbout, about], [t.factHow, t.how]];
  if (first) facts.push([t.factWhen, reminderWhen(first.dueAt, first.timeZone, ui.lang)], [open.people[0]?.source.kind === 'AVAILABILITY' ? t.factDue : t.factEnds, reminderWhen(first.expiresAt, first.timeZone, ui.lang)]);
  facts.push([t.factLimit, t.limit]);
  const list = (results ? sent : rows).map(({person, state}) => {
    const line = state ? ui.line(state) : null;
    const text = !line ? '' : line.kind === 'pill' ? (results ? t.sending : t.ready) : line.text;
    return <li key={person.employeeId} data-tone={line?.tone ?? 'grey'} data-phase={state?.phase}>
      <b>{person.name}</b>
      <span>{line?.kind === 'placeholder' ? <i className="b-rem__ph" aria-hidden="true" /> : null}{line?.kind === 'placeholder' ? <span className="q-sr">{text}</span> : text}</span>
      {results && line?.action === 'check' ? <button type="button" className="b-btn b-btn--ghost b-rem__act" aria-busy={line.busy || undefined} disabled={line.busy || ui.store.offline} onClick={() => ui.act(person.employeeId, 'check')}>{line.actionLabel}</button> : null}
    </li>;
  });
  return <div className="b-rem-sheet">
    <h2 ref={heading} id={titleId} tabIndex={-1} className="b-rem-sheet__t">{results ? t.resultsTitle : eligible.length ? t.manyTitle(eligible.length) : t.manyTitleNone}</h2>
    {results ? <p className="b-rem-sheet__sum" role="status" aria-live="polite">{working ? t.resultsWorking : t.resultsSummary(queued, sent.length)}</p>
      : <><Facts rows={facts} /><p className="b-rem-sheet__sum">{t.manyCount(eligible.length, rows.length)}</p></>}
    <ul className="b-rem-people" aria-label={t.people}>{list}</ul>
    {!results && ui.store.offline ? <div className="b-rem-sheet__note"><BCallout tone="amber" icon="offline" role="status">{t.offline}</BCallout></div> : null}
    <div className="b-rem-sheet__acts">
      {results ? <button type="button" className="b-btn b-btn--teal b-btn--full" onClick={() => close?.()}>{t.done}</button> : <>
        <button type="button" className="b-btn b-btn--teal b-btn--full" disabled={!eligible.length || ui.store.offline} onClick={() => onSend(eligible.map(row => row.person.employeeId))}>{t.sendMany(eligible.length)}</button>
        <button type="button" className="b-btn b-btn--quiet b-btn--full" onClick={() => close?.()}>{t.cancel}</button>
      </>}
    </div>
  </div>;
}

/* Colour is never the only signal: each amber or red state has its own glyph. */
const ICONS: Partial<Record<ReminderState['phase'], typeof PauseCircleIcon>> = {held: PauseCircleIcon, blocked: ProhibitIcon, conflict: ArrowsClockwiseIcon, unknown: QuestionIcon, error: WarningCircleIcon};

/** One person's reminder on their row. Renders nothing where reminders are not offered. */
export function ReminderControl({employeeId, name}: {employeeId: string; name: string}) {
  const ui = useContext(Context);
  const state = ui?.store.state(employeeId);
  if (!ui || !state) return null;
  return <Seen employeeId={employeeId} want={ui.store.want}><ReminderControlView id={ui.rowId(employeeId)} name={name} line={ui.line(state)} phase={state.phase} lang={ui.lang} offline={ui.store.offline} onAction={action => ui.act(employeeId, action)} /></Seen>;
}

/** Eligibility is read for a person once their row is on the page (not for rows inside a closed list). */
function Seen({employeeId, want, children}: {employeeId: string; want: (employeeId: string) => void; children: ReactNode}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (node.offsetParent !== null || typeof IntersectionObserver === 'undefined') { want(employeeId); return; }
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting || entry.intersectionRect.height > 0 || (entry.target as HTMLElement).offsetParent !== null)) { want(employeeId); observer.disconnect(); } }, {rootMargin: '100% 0px'});
    observer.observe(node);
    return () => observer.disconnect();
  }, [employeeId, want]);
  return <span ref={ref} className="b-rem-slot">{children}</span>;
}

/** The row control without its data: every state renders from a `ReminderLine` (tests render it in both languages). */
export function ReminderControlView({id, name, line, phase, lang: langProp, offline = false, onAction}: {
  id?: string; name: string; line: ReminderLine; phase: ReminderState['phase']; lang?: ReminderLang; offline?: boolean; onAction: (action: NonNullable<ReminderLine['action']>) => void;
}) {
  const lang = useViewLang(langProp);
  const t = reminderCopy[lang];
  const why = useId();
  if (line.kind === 'placeholder') return <span className="b-rem" id={id} data-phase={phase}><i className="b-rem__ph" aria-hidden="true" /><span className="q-sr">{line.text}</span></span>;
  if (line.kind === 'pill') return <span className="b-rem" id={id} data-phase={phase} data-offline={offline || undefined}>
    {offline ? <span className="b-rem__tx" id={why} data-tone="grey"><WifiSlashIcon weight="bold" aria-hidden="true" />{t.offline}</span> : null}
    <button type="button" className="b-btn b-btn--ghost b-rem__go" aria-haspopup="dialog" aria-label={t.remindAria(name)} aria-describedby={offline ? why : undefined} disabled={offline} onClick={() => onAction('open')}><BellRingingIcon weight="bold" aria-hidden="true" />{line.text}</button>
  </span>;
  const Icon = ICONS[phase] ?? null;
  const action = line.action, label = line.actionLabel;
  return <span className="b-rem" id={id} data-phase={phase} data-tone={line.tone} tabIndex={-1}>
    <span className="b-rem__tx" data-tone={line.tone}>{Icon ? <Icon weight="bold" aria-hidden="true" /> : null}<span>{line.text}{line.detail ? <small>{line.detail}</small> : null}</span></span>
    {action === 'signin' ? <Link className="b-btn b-btn--ghost b-rem__act" href="/login">{label}</Link>
      : action === 'support' ? <Link className="b-btn b-btn--quiet b-rem__act" href="/support">{label}</Link>
      : action && action !== 'open' ? <button type="button" className={`b-btn ${action === 'again' || action === 'check' ? 'b-btn--ghost' : 'b-btn--quiet'} b-rem__act`} aria-label={`${label}: ${name}`} aria-busy={line.busy || undefined} disabled={line.busy || offline} onClick={() => onAction(action)}>{label}</button> : null}
  </span>;
}

/** "Remind 4 people" for a card's header: shown when two or more people can be reminded right now. */
export function ReminderBulkButton() {
  const ui = useContext(Context);
  if (!ui || ui.store.eligible.length < 2) return null;
  const t = reminderCopy[ui.lang];
  return <button type="button" id={ui.bulkId} className="b-btn b-btn--ghost b-rem__all" aria-haspopup="dialog" disabled={ui.store.offline} onClick={ui.openMany}><BellRingingIcon weight="bold" aria-hidden="true" />{t.remindMany(ui.store.eligible.length)}</button>;
}
