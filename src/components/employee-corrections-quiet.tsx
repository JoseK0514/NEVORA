'use client';

import Link from 'next/link';
import {Temporal} from '@js-temporal/polyfill';
import {useContext, useEffect, useId, useRef, useState, type FormEvent} from 'react';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {fetchEmployeeTimeCorrections, submitEmployeeTimeCorrection, type CorrectionActionResponse} from '@/lib/time-corrections/client';
import type {CorrectionTarget, EmployeeTimeCorrections, PublicCorrectionItem} from '@/lib/time-corrections/read-model';
import type {CorrectionRequestCommand} from '@/lib/time-corrections/validation';
import {addDays, formatTime} from '@/lib/date-utils';
import {keepWhole} from '@/lib/keep-whole';
import {PendingLabel} from './employee-submit-button';
import {QuietSheet, SheetCancel, SheetRow, useSheetClose} from './quiet/quiet-sheet';
import {actionMessage, changedEvent, EmployeeCorrectionRecoveryContext, localInstant, localValue, useCorrectionRetry} from './employee-time-corrections';
import './quiet/u3.css';

/* T-19 (Oct 25, 2026; mockups E12 and E08): corrections on My time as one Quiet sheet, "Cancel · Correction · Send",
 * and a "Corrections" group with one row per request. What to fix (missing time, clock-in, clock-out, a break), when
 * (day, location, starts, ends: teal values, no ticket), and a required note. Each request opens a detail sheet with
 * Before, After, Status and the note. Same reads, commands, retry-after-unknown, pause clearing and authority as the
 * forms it replaces; the server checks every request when it is sent. */

type Fix = 'missing' | 'clock-in' | 'clock-out' | 'break';
export const OPEN_CORRECTION_EVENT = 'nevora:open-correction';
export type OpenCorrectionDetail = {timeEntryId?: string; fix?: Fix; day?: string; from?: string; to?: string; locationId?: string};

const DAY = /^\d{4}-\d{2}-\d{2}$/, TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const dayLabel = (date: string) => new Intl.DateTimeFormat('en-US', {timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric'}).format(new Date(`${date}T12:00:00Z`));
const inZone = (at: string, zone: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', {timeZone: zone, ...options}).format(new Date(at));
const clock = (at: string, zone: string) => inZone(at, zone, {hour: 'numeric', minute: '2-digit'});
const range = (start: string, end: string, zone: string) => keepWhole(`${clock(start, zone)} – ${clock(end, zone)}`);
const same = (a: string, b: string) => Temporal.Instant.compare(Temporal.Instant.from(a), Temporal.Instant.from(b)) === 0;

/** "Missing time", "Wrong clock-in", "Wrong clock-out", "Clock in and out" or the break's name. */
function kindWord(item: PublicCorrectionItem) {
  if (item.kind === 'MISSING_ENTRY') return 'Missing time';
  if (item.kind === 'BREAK_BOUNDARY') return item.breakName ? `${item.breakName} break` : 'Break';
  if (item.originalStartAt && item.originalEndAt) {
    const startMoved = !same(item.originalStartAt, item.proposedStartAt), endMoved = !same(item.originalEndAt, item.proposedEndAt);
    if (startMoved && !endMoved) return 'Wrong clock-in';
    if (endMoved && !startMoved) return 'Wrong clock-out';
  }
  return 'Clock in and out';
}
const statusWord = (status: PublicCorrectionItem['status']) => status === 'PENDING' ? 'Waiting' : status === 'APPROVED' ? 'Approved' : 'Declined';

/** A row whose teal value opens the native picker (the time-off sheet's pattern). */
function PickerRow({id, label, type, value, shown, min, onChange, disabled, invalid, describedBy}: {id: string; label: string; type: 'date' | 'time'; value: string; shown?: string; min?: string; onChange: (value: string) => void; disabled?: boolean; invalid?: boolean; describedBy?: string}) {
  const text = shown ?? (!value ? 'Choose' : type === 'date' ? dayLabel(value) : formatTime(value));
  return <li><label htmlFor={id} className="q-row q-row--one q-row--picker">
    <span className="q-rt"><b>{label}</b></span>
    <span className={`q-rv ${value ? 'q-rv--go' : 'q-rv--ph'}`} aria-hidden="true">{text}</span>
    <input id={id} className="q-picker" type={type} value={value} min={min} disabled={disabled} aria-label={label} aria-invalid={invalid || undefined} aria-describedby={describedBy}
      onClick={event => { try { event.currentTarget.showPicker(); } catch { /* the browser opens its own picker */ } }}
      onChange={event => onChange(event.target.value)}/>
  </label></li>;
}

function ValueRow({label, value}: {label: string; value: string}) {
  return <li><div className="q-row q-row--one"><span className="q-rt"><b>{label}</b></span><span className="q-rv q-rv--l">{value}</span></div></li>;
}

/** `day` and `endDay` are the local dates of the start and end; times are "HH:MM". A missing-time end at or before its
 * start is the next day (an overnight shift). */
export type Draft = {fix: Fix; targetKey: string; day: string; endDay: string; from: string; to: string; locationId: string; reason: string; replacement: {id: string; revision: number} | null};
export const emptyDraft = (locationId = ''): Draft => ({fix: 'missing', targetKey: '', day: '', endDay: '', from: '', to: '', locationId, reason: '', replacement: null});
const targetKey = (target: CorrectionTarget) => `${target.timeEntryId}:${target.breakEntryId ?? 'entry'}`;

/** The correction sheet's fields. Every target must have a confirmed effective time, as before. */
export function CorrectionFields({draft, set, ready, zone, disabled, errors}: {draft: Draft; set: (patch: Partial<Draft>) => void; ready: Extract<EmployeeTimeCorrections, {state: 'ready'}>; zone: string; disabled: boolean; errors: Partial<Record<'fix' | 'when' | 'reason', string>>}) {
  const id = useId();
  const confirmed = ready.targets.filter(target => target.context.state === 'confirmed');
  const entries = confirmed.filter(target => target.kind === 'ENTRY_BOUNDARY'), breaks = confirmed.filter(target => target.kind === 'BREAK_BOUNDARY');
  const options: {fix: Fix; title: string; detail: string}[] = [
    {fix: 'missing', title: 'Missing time', detail: 'You worked, but nothing was recorded'},
    ...(entries.length ? [{fix: 'clock-in' as const, title: 'Wrong clock-in', detail: 'The start time is off'}, {fix: 'clock-out' as const, title: 'Wrong clock-out', detail: 'The end time is off'}] : []),
    ...(breaks.length ? [{fix: 'break' as const, title: 'Wrong break', detail: 'A recorded break is off'}] : []),
  ];
  const targets = draft.fix === 'break' ? breaks : entries;
  const target = targets.find(item => targetKey(item) === draft.targetKey);
  const choose = (fix: Fix) => {
    if (fix === draft.fix) return;
    const first = fix === 'missing' ? undefined : (fix === 'break' ? breaks : entries)[0];
    set({fix, ...(first ? pick(first) : {targetKey: '', day: '', endDay: '', from: '', to: ''}), replacement: null});
  };
  const pick = (item: CorrectionTarget) => {
    const context = item.context.state === 'confirmed' ? item.context : null;
    const start = localValue(context?.startAt ?? item.recordedStartAt, zone), end = localValue(context?.endAt ?? item.recordedEndAt, zone);
    return {targetKey: targetKey(item), day: start.slice(0, 10), endDay: end.slice(0, 10), from: start.slice(11, 16), to: end.slice(11, 16)};
  };
  const entryLabel = (item: CorrectionTarget) => keepWhole(`${inZone(item.recordedStartAt, zone, {weekday: 'short', month: 'short', day: 'numeric'})} · ${range(item.recordedStartAt, item.recordedEndAt, zone)}`);
  const location = ready.locations.find(item => item.id === draft.locationId);
  const overnight = draft.from && draft.to && draft.to <= draft.from;
  return <>
    <fieldset disabled={disabled} aria-describedby={errors.fix ? `${id}-fix` : undefined}>
      <legend className="q-grp"><h2>What to fix</h2></legend>
      <ul className="q-list">{options.map(option => <li key={option.fix}><label className="q-row q-row--pick">
        <span className="q-rt"><b>{option.title}</b><i>{option.detail}</i></span>
        <input className="q-pick" type="radio" name="correction-fix" value={option.fix} checked={draft.fix === option.fix} onChange={() => choose(option.fix)}/>
        <span className="q-radio" aria-hidden="true"/>
      </label></li>)}</ul>
    </fieldset>
    <fieldset disabled={disabled} aria-describedby={errors.when ? `${id}-when` : undefined}>
      <legend className="q-grp"><h2>When</h2></legend>
      <ul className="q-list">
        {draft.fix === 'missing' ? <>
          <PickerRow id={`${id}-day`} label="Day" type="date" value={draft.day} onChange={day => set({day})} disabled={disabled || !!draft.replacement} invalid={!!errors.when && !draft.day}/>
          {ready.locations.length > 1 && !draft.replacement ? <li><label className="q-row q-row--one q-select-row"><span className="q-rt"><b>Location</b></span>
            <select className="q-select-row__control q-select-row__control--ink" aria-label="Location" value={draft.locationId} onChange={event => set({locationId: event.target.value})}>
              {ready.locations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select><CaretRightIcon className="q-chev" aria-hidden="true"/></label></li>
            : <ValueRow label="Location" value={location?.name ?? '–'}/>}
          <PickerRow id={`${id}-from`} label="Starts" type="time" value={draft.from} onChange={from => set({from})} invalid={!!errors.when && !draft.from}/>
          <PickerRow id={`${id}-to`} label="Ends" type="time" value={draft.to} shown={draft.to ? `${formatTime(draft.to)}${overnight ? ' next day' : ''}` : undefined} onChange={to => set({to})} invalid={!!errors.when && !draft.to}/>
        </> : <>
          <li><label className="q-row q-row--one q-select-row"><span className="q-rt"><b>{draft.fix === 'break' ? 'Break' : 'Entry'}</b></span>
            <select className="q-select-row__control q-select-row__control--ink" aria-label={draft.fix === 'break' ? 'Recorded break' : 'Recorded entry'} value={draft.targetKey}
              onChange={event => { const item = targets.find(next => targetKey(next) === event.target.value); if (item) set(pick(item)); }}>
              {targets.map(item => <option key={targetKey(item)} value={targetKey(item)}>{entryLabel(item)}</option>)}
            </select><CaretRightIcon className="q-chev" aria-hidden="true"/></label></li>
          {draft.fix === 'clock-out' ? <ValueRow label="Starts" value={draft.from ? formatTime(draft.from) : '–'}/>
            : <PickerRow id={`${id}-from`} label="Starts" type="time" value={draft.from} onChange={from => set({from})} invalid={!!errors.when && !draft.from}/>}
          {draft.fix === 'clock-in' ? <ValueRow label="Ends" value={draft.to ? formatTime(draft.to) : '–'}/>
            : <PickerRow id={`${id}-to`} label="Ends" type="time" value={draft.to} onChange={to => set({to})} invalid={!!errors.when && !draft.to}/>}
          {target ? null : <li className="q-sr">Choose a recorded entry.</li>}
        </>}
      </ul>
      {errors.when ? <p className="q-error" id={`${id}-when`} role="alert">{errors.when}</p> : null}
    </fieldset>
    <div className="q-fl">
      <div className="q-fl__row"><label className="q-fl__label" htmlFor={`${id}-reason`}>Note</label><span className="q-fix__count" aria-label={`${draft.reason.length} of 500 characters`}>{draft.reason.length}/500</span></div>
      <textarea id={`${id}-reason`} className="q-in" rows={3} maxLength={500} disabled={disabled} value={draft.reason} onChange={event => set({reason: event.target.value})}
        placeholder={draft.fix === 'missing' ? 'Why wasn’t it recorded?' : 'What happened?'} aria-invalid={!!errors.reason || undefined} aria-describedby={errors.reason ? `${id}-reason-error` : undefined}/>
      {errors.reason ? <p className="q-error" id={`${id}-reason-error`} role="alert">{errors.reason}</p> : null}
    </div>
    {draft.replacement ? <p className="q-help">This replaces the approved missing time after your manager reviews it. The earlier time stays in your history.</p> : null}
    <p className="q-help">Your manager reviews it. Your original punches are kept.</p>
  </>;
}

/** The detail sheet of one request: Before, After, Status, Sent and the note. */
export function RequestRow({item, zone, onReplace, busy}: {item: PublicCorrectionItem; zone: string; onReplace: (item: PublicCorrectionItem) => void; busy: boolean}) {
  const word = statusWord(item.status);
  const where = [range(item.proposedStartAt, item.proposedEndAt, zone), item.locationName].filter(Boolean).join(' · ');
  const title = keepWhole(`${kindWord(item)} · ${inZone(item.proposedStartAt, zone, {month: 'short', day: 'numeric'})}`);
  return <SheetRow title={title} detail={where} value={<span className={item.status === 'PENDING' ? 'q-rv--wait' : undefined}>{word}</span>} sheetTitle="Correction" status={item.status}>
    <div className="q-hd"><h1>{kindWord(item)}</h1><p>{inZone(item.proposedStartAt, zone, {weekday: 'long', month: 'short', day: 'numeric'})} · {item.locationName}</p></div>
    <ul className="q-list" style={{marginTop: 16}}>
      <ValueRow label="Before" value={item.originalStartAt && item.originalEndAt ? range(item.originalStartAt, item.originalEndAt, zone) : 'Not recorded'}/>
      <ValueRow label="After" value={range(item.proposedStartAt, item.proposedEndAt, zone)}/>
      <ValueRow label="Status" value={item.status === 'REJECTED' ? 'Declined · time unchanged' : word}/>
      <ValueRow label="Sent" value={keepWhole(inZone(item.createdAt, zone, {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'}))}/>
    </ul>
    {item.reason ? <><div className="q-grp"><h2>Note</h2></div><p className="q-body">{item.reason}</p></> : null}
    {item.status === 'PENDING' && item.baseChanged ? <p className="q-help">The recorded time changed after you sent this.</p> : null}
    {item.kind === 'MISSING_ENTRY' && item.status === 'APPROVED' && item.currentAdjustmentId
      ? <ul className="q-list" style={{marginTop: 16}}><li><button type="button" className="q-row q-row--one q-row--btn q-row--go" disabled={busy} onClick={() => onReplace(item)}><span className="q-rt"><b>Correct this time</b></span><CaretRightIcon className="q-chev" aria-hidden="true"/></button></li></ul> : null}
  </SheetRow>;
}

export function EmployeeCorrectionsQuiet({zone}: {zone: string}) {
  const recovery = useContext(EmployeeCorrectionRecoveryContext);
  const [snapshot, setSnapshot] = useState<EmployeeTimeCorrections | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [errors, setErrors] = useState<Partial<Record<'fix' | 'when' | 'reason', string>>>({});
  const [busy, setBusy] = useState(false);
  const sending = useRef(false), authorityLost = useRef(false), abortRef = useRef<AbortController | null>(null);
  const [retry, setRetry] = useCorrectionRetry('sheet');
  const [result, setResult] = useState<CorrectionActionResponse | null>(retry ? {state: 'outcome_unknown', operationId: retry.operationId} : null);
  const pendingOpen = useRef<OpenCorrectionDetail | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      abortRef.current?.abort();
      const controller = new AbortController(); abortRef.current = controller; setLoading(true);
      try {
        const next = await fetchEmployeeTimeCorrections(controller.signal, recovery?.authority);
        if (!active || controller.signal.aborted) return;
        setSnapshot(next);
        authorityLost.current = next.state === 'unavailable' && next.reason === 'access_denied';
        if (authorityLost.current) { setRetry(null); setResult(null); setOpen(false); }
      } catch { if (active && !controller.signal.aborted) setSnapshot({state: 'unavailable', reason: 'read_failed'}); }
      finally { if (active && !controller.signal.aborted) setLoading(false); }
    };
    const refresh = () => { if (active && document.visibilityState !== 'hidden' && navigator.onLine) void load(); };
    // Private data clears when the page is hidden, offline or left, as before; an unknown send keeps only its retry.
    const clear = () => { abortRef.current?.abort(); if (active) { setSnapshot(null); setLoading(false); setOpen(false); setDraft(emptyDraft()); setResult(current => current?.state === 'outcome_unknown' ? current : null); } };
    const visibility = () => { if (document.visibilityState === 'hidden') clear(); else refresh(); };
    void load();
    window.addEventListener(changedEvent, refresh); window.addEventListener('focus', refresh); window.addEventListener('pageshow', refresh); window.addEventListener('storage', refresh);
    window.addEventListener('offline', clear); window.addEventListener('pagehide', clear); document.addEventListener('visibilitychange', visibility);
    return () => { active = false; abortRef.current?.abort(); window.removeEventListener(changedEvent, refresh); window.removeEventListener('focus', refresh); window.removeEventListener('pageshow', refresh); window.removeEventListener('storage', refresh); window.removeEventListener('offline', clear); window.removeEventListener('pagehide', clear); document.removeEventListener('visibilitychange', visibility); };
  }, [setRetry, recovery?.authority]);

  const ready = snapshot?.state === 'ready' ? snapshot : null;

  /** Opens the sheet filled in: from Home's missed shift (the address), or from a time entry's sheet (an event). */
  const openWith = (detail: OpenCorrectionDetail, source: Extract<EmployeeTimeCorrections, {state: 'ready'}>) => {
    const base = emptyDraft(source.locations[0]?.id ?? '');
    const entry = detail.timeEntryId ? source.targets.find(target => target.kind === 'ENTRY_BOUNDARY' && target.timeEntryId === detail.timeEntryId && target.context.state === 'confirmed') : undefined;
    if (entry) {
      const context = entry.context.state === 'confirmed' ? entry.context : null;
      const start = localValue(context?.startAt ?? entry.recordedStartAt, zone), end = localValue(context?.endAt ?? entry.recordedEndAt, zone);
      setDraft({...base, fix: detail.fix === 'clock-out' ? 'clock-out' : 'clock-in', targetKey: targetKey(entry), day: start.slice(0, 10), endDay: end.slice(0, 10), from: start.slice(11, 16), to: end.slice(11, 16)});
    } else {
      setDraft({...base, day: detail.day && DAY.test(detail.day) ? detail.day : '', from: detail.from && TIME.test(detail.from) ? detail.from : '', to: detail.to && TIME.test(detail.to) ? detail.to : '',
        locationId: source.locations.some(item => item.id === detail.locationId) ? detail.locationId! : base.locationId});
    }
    setErrors({}); setResult(current => current?.state === 'outcome_unknown' ? current : null); setOpen(true);
  };

  // Home's "No clock-in" row links here with ?fix=…&from=…&to=…&location=… (UX-E-01).
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.has('fix')) pendingOpen.current = {fix: 'missing', day: query.get('fix') ?? undefined, from: query.get('from') ?? undefined, to: query.get('to') ?? undefined, locationId: query.get('location') ?? undefined};
    const fromEntry = (event: Event) => { const detail = (event as CustomEvent<OpenCorrectionDetail>).detail ?? {}; pendingOpen.current = detail; setSnapshot(current => current ? {...current} : current); };
    window.addEventListener(OPEN_CORRECTION_EVENT, fromEntry);
    return () => window.removeEventListener(OPEN_CORRECTION_EVENT, fromEntry);
  }, []);
  useEffect(() => {
    if (!ready || !pendingOpen.current || retry) return;
    const detail = pendingOpen.current; pendingOpen.current = null;
    openWith(detail, ready);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, retry]);

  const set = (patch: Partial<Draft>) => { setDraft(current => ({...current, ...patch})); setErrors({}); };
  const close = () => {
    setOpen(false);
    if (window.location.search.includes('fix=')) window.history.replaceState(window.history.state, '', window.location.pathname + '#corrections');
    requestAnimationFrame(() => { if (!document.activeElement || document.activeElement === document.body) triggerRef.current?.focus(); });
  };

  const send = async (command: CorrectionRequestCommand) => {
    if (authorityLost.current || sending.current) return;
    sending.current = true;
    setRetry(command); setBusy(true); setResult(null);
    try {
      const response = await submitEmployeeTimeCorrection(command, recovery?.authority);
      if (authorityLost.current) return;
      setResult(response); setRetry(response.state === 'outcome_unknown' ? command : null);
      if (response.state === 'pending') { close(); setDraft(emptyDraft(ready?.locations[0]?.id ?? '')); window.dispatchEvent(new Event(changedEvent)); }
    } catch { if (!authorityLost.current) { setResult({state: 'outcome_unknown', operationId: command.operationId}); setRetry(command); } }
    finally { sending.current = false; setBusy(false); }
  };

  /** Checked on Send, like time off: what's missing is said under its group. */
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending.current || retry || !ready) return;
    const next: typeof errors = {};
    if (draft.fix !== 'missing' && !ready.targets.some(target => targetKey(target) === draft.targetKey)) next.when = 'Choose the recorded entry to fix.';
    else if (!draft.day || !draft.from || !draft.to) next.when = draft.fix === 'missing' ? 'Choose the day and when you started and finished.' : 'Choose the corrected time.';
    if (!draft.reason.trim()) next.reason = draft.fix === 'missing' ? 'Say why it wasn’t recorded.' : 'Say what happened.';
    if (draft.fix === 'missing' && !draft.locationId) next.when = 'Choose a location.';
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      const startLocal = `${draft.day}T${draft.from}`;
      // A missing-time end at or before its start is the next day; a recorded entry keeps its own end date.
      const endDay = draft.fix === 'missing' ? (draft.to <= draft.from ? addDays(draft.day, 1) : draft.day) : draft.endDay || draft.day;
      const endLocal = `${endDay}T${draft.to}`;
      const base = {operationId: crypto.randomUUID(), proposedStartAt: localInstant(startLocal, zone), proposedEndAt: localInstant(endLocal, zone), reason: draft.reason.trim()};
      if (Temporal.Instant.compare(Temporal.Instant.from(base.proposedEndAt), Temporal.Instant.from(base.proposedStartAt)) <= 0) { setErrors({when: 'The end needs to be after the start.'}); return; }
      const target = ready.targets.find(item => targetKey(item) === draft.targetKey);
      const command: CorrectionRequestCommand = draft.fix === 'missing'
        ? {...base, kind: 'MISSING_ENTRY', locationId: draft.locationId, ...(draft.replacement ? {targetAdjustmentId: draft.replacement.id, expectedBaseRevision: draft.replacement.revision} : {})}
        : draft.fix === 'break' ? {...base, kind: 'BREAK_BOUNDARY', timeEntryId: target!.timeEntryId, breakEntryId: target!.breakEntryId!}
        : {...base, kind: 'ENTRY_BOUNDARY', timeEntryId: target!.timeEntryId};
      await send(command);
    } catch { setResult({state: 'invalid'}); setErrors({when: 'That time doesn’t exist on this day. Choose another.'}); }
  };

  const replace = (item: PublicCorrectionItem) => {
    if (!ready) return;
    const start = localValue(item.proposedStartAt, zone), end = localValue(item.proposedEndAt, zone);
    setDraft({...emptyDraft(item.locationId), day: start.slice(0, 10), endDay: end.slice(0, 10), from: start.slice(11, 16), to: end.slice(11, 16), replacement: {id: item.currentAdjustmentId!, revision: item.revision}});
    setErrors({}); setResult(null); setOpen(true);
  };

  const recent = ready?.requests.slice(0, 5) ?? [];
  const feedback = busy ? null : retry ? {state: 'outcome_unknown' as const, operationId: retry.operationId} : result;
  const formId = useId();
  return <section id="corrections" className="q-corrections-e employee-correction-center" aria-labelledby="employee-corrections-title">
    <div className="q-grp"><h2 id="employee-corrections-title">Corrections</h2></div>
    {feedback ? <p className="q-help" role="status">{feedback.state === 'pending' ? 'Sent. Your manager reviews it.' : actionMessage(feedback)}{feedback.state === 'unavailable' ? <> <Link href="/login">Sign in</Link></> : null}</p> : null}
    {retry && (!busy) ? <button className="q-btn q-btn--sec" type="button" onClick={() => void send(retry)}>Try again</button> : null}
    {loading && !snapshot ? <p className="q-empty">Loading your corrections…</p>
      : snapshot?.state === 'unavailable' ? <p className="q-empty">Corrections are unavailable right now.{snapshot.reason === 'access_denied' ? <> <Link href="/login">Sign in</Link></> : null}</p>
      : recent.length ? <ul className="q-list" aria-labelledby="employee-corrections-title">{recent.map(item => <RequestRow key={item.id} item={item} zone={zone} onReplace={replace} busy={busy || !!retry}/>)}</ul>
      : null}
    {ready && ready.totalRequests > recent.length ? <p className="q-help">Showing {recent.length} of {ready.totalRequests} requests.</p> : null}
    <button ref={triggerRef} className="q-btn q-btn--sec" type="button" aria-haspopup="dialog" disabled={!ready || ready.locations.length === 0 || !!retry} onClick={() => { if (ready) openWith({}, ready); }}>Request a correction</button>
    {!recent.length ? <p className="q-help">Your manager reviews each request. Your original times are kept.</p> : null}
    <QuietSheet open={open && !!ready} label="Correction" onClose={close}>
      {ready ? <form id={formId} className="q-fix" onSubmit={submit} noValidate aria-busy={busy}>
        <div className="q-nav"><SheetCancel href="/app/my-time"/><h1 className="q-nav__t">Correction</h1>
          <button type="submit" className="q-nav__r q-nav__r--b" aria-disabled={busy || undefined} disabled={!!retry && !busy}><PendingLabel pending={busy} pendingText="Sending…">Send</PendingLabel></button></div>
        <CorrectionFields draft={draft} set={set} ready={ready} zone={zone} disabled={busy || !!retry} errors={errors}/>
        {feedback && feedback.state !== 'pending' ? <p className="q-help q-help--alert" role="alert">{actionMessage(feedback)}</p> : null}
      </form> : null}
    </QuietSheet>
  </section>;
}

/** In a time entry's sheet: "Something wrong? Request a correction" opens the correction sheet for that entry. */
export function EntryCorrectionRow({timeEntryId, closed}: {timeEntryId: string; closed: boolean}) {
  if (!closed) return null;
  return <ul className="q-list" style={{marginTop: 16}}><li>
    <SheetCloseThen detail={{timeEntryId, fix: 'clock-in'}}/>
  </li></ul>;
}

function SheetCloseThen({detail}: {detail: OpenCorrectionDetail}) {
  const close = useSheetClose();
  return <button type="button" className="q-row q-row--one q-row--btn q-row--go" aria-haspopup="dialog" onClick={() => {
    close?.();
    // After the entry's sheet has gone, so focus returns to the page before the correction sheet opens.
    window.setTimeout(() => window.dispatchEvent(new CustomEvent<OpenCorrectionDetail>(OPEN_CORRECTION_EVENT, {detail})), close ? 260 : 0);
  }}><span className="q-rt"><b>Something wrong? Request a correction</b></span><CaretRightIcon className="q-chev" aria-hidden="true"/></button>;
}
