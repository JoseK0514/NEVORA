'use client';

import {ClockerOwnerRequests} from './clocker-owner-requests';
import {useCallback, useEffect, useId, useRef, useState, useSyncExternalStore} from 'react';
import Link from 'next/link';

import {ClockIcon} from '@phosphor-icons/react/dist/ssr/Clock';
import {QuestionIcon} from '@phosphor-icons/react/dist/ssr/Question';
import {WarningCircleIcon} from '@phosphor-icons/react/dist/ssr/WarningCircle';
import {createPrivateSnapshotController} from '../lib/private-snapshot-client';
import type {RecoveryReview} from '../lib/clocker/recovery-review.server';
import {SettingsFrame} from '../app/app/settings/wave-c-kit';
import {BAvatar, BCard, BDoneMark, BIcon, BList, BRow, BState} from './owner-b/b-kit';
import {clockerOwnerCopy, clockerOwnerWhen, type ClockerOwnerLang} from './clocker-owner-copy';
import './clocker-owner-b.css';
import {ScopedReadFrame,type ScopedObservation} from './company-access/scoped-read-frame';

const subscribe = () => () => {};

/** Clocker recovery (Phase 6, Owners): what the page is for in one sentence, the people who asked for help on a tablet,
 * one 560px form that checks a code, and one designed answer for each result: saved (green), nothing saved yet (amber:
 * not confirmed, never "failed"), more than one record (amber: look before you change anything), offline, session ended
 * and failed. The private snapshot controller, its pause-on-blur and the request are unchanged; checking a code never
 * changes recorded time. */
export function ClockerRecoveryReview({actorId, timeZone, from, observation, lang = 'en'}: {actorId: string; timeZone: string; from?: 'settings'; observation?:ScopedObservation; lang?: ClockerOwnerLang}) {
  const t = clockerOwnerCopy[lang];
  const actionNames: Record<string, string> = {CLOCK_IN: t.actionClockIn, CLOCK_OUT: t.actionClockOut, START_BREAK: t.actionStartBreak, END_BREAK: t.actionEndBreak};
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [reference, setReference] = useState('');
  const [hasSelection, setHasSelection] = useState(false);
  const [state, setState] = useState<RecoveryReview | null>(null);
  const [loading, setLoading] = useState(true);
  const feedback = useRef<HTMLDivElement>(null);
  const submitted = useRef(false);
  const asker = useRef<Element | null>(null);
  const selected = useRef('');
  const controller = useRef<ReturnType<typeof createPrivateSnapshotController<RecoveryReview>> | null>(null);
  const inputId = useId();
  const helpId = useId();
  const [invalid, setInvalid] = useState('');
  const pending = loading && hasSelection;
  const ready = state?.state === 'ready' ? state : null;
  const denied = state?.state === 'unavailable' && state.reason === 'access_denied';
  const unavailable = state?.state === 'unavailable' && state.reason !== 'no_selection';
  // Clocker recovery lives with the Clocker settings (A2: Team no longer opens it), so Back returns to Settings.
  const back = {href: '/app/settings', label: t.settings};
  void from;

  useEffect(() => {
    const c = createPrivateSnapshotController<RecoveryReview>(value => {
      // A routine renewal keeps the answer on screen (and the reader's place and focus), as the help requests above do; the
      // controller still clears it the moment it expires, access ends, the code is edited or the window is left.
      // Only the answer for the code being checked is kept: a check of another code (from a help request) starts clean.
      const kept = value.snapshot?.state === 'ready' && value.snapshot.commandId === selected.current;
      const shown = value.refreshing && !kept ? null : value.snapshot;
      setState(shown);
      setLoading(value.refreshing && !shown);
    }, async signal => {
      if (!selected.current) return {state: 'unavailable', reason: 'no_selection'};
      const response = await fetch('/api/manager/clocker-recovery', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store', signal,
        headers: {'Content-Type': 'application/json', 'X-Nevora-Clocker-Recovery': '1', 'X-Nevora-Actor': actorId},
        body: JSON.stringify({commandId: selected.current}),
      });
      if (response.status === 401 || response.status === 403) return {state: 'unavailable', reason: 'access_denied'};
      if (!response.ok) throw Error('Unavailable');
      return response.json();
    }, value => {
      const v = value as RecoveryReview;
      if (v?.state === 'unavailable') return v;
      if (v?.state !== 'ready' || v.commandId !== selected.current || !Array.isArray(v.receipts) || v.receipts.length > 100 || !Number.isFinite(v.validForMs) || v.validForMs < 1 || v.validForMs > 15000 || !Number.isFinite(Date.parse(v.observedAt))) throw Error('Invalid receipt review');
      return v;
    }, reason => ({state: 'unavailable', reason}), () => 'read_failed');
    controller.current = c;
    let live = false;
    const active = (event?: Event) => {
      if (event?.type === 'focus' && (event.target !== window || live)) return;
      live = document.visibilityState === 'visible' && navigator.onLine;
      if (live) c.start(); else c.pause();
    };
    const pause = (event?: Event) => {
      if (event?.type === 'blur' && event.target !== window) return;
      live = false;
      c.pause();
    };
    for (const name of ['focus', 'pageshow', 'online', 'storage']) window.addEventListener(name, active);
    for (const name of ['blur', 'pagehide', 'offline']) window.addEventListener(name, pause);
    document.addEventListener('visibilitychange', active);
    active();
    return () => {
      c.stop();
      for (const name of ['focus', 'pageshow', 'online', 'storage']) window.removeEventListener(name, active);
      for (const name of ['blur', 'pagehide', 'offline']) window.removeEventListener(name, pause);
      document.removeEventListener('visibilitychange', active);
      controller.current = null;
    };
  }, [actorId]);

  /* Focus goes to the answer of a check the person asked for, once. The page is drawn through the access frame
   * (ScopedReadFrame), which commits this component's content one step after this component renders, so when the effect
   * below runs the answer card is usually not in the document yet. The card therefore takes focus as it mounts (its ref
   * callback); the effect covers an answer whose card is already there (the same code checked again).
   * Focus is never taken back: it moves only while it is still where the check left it (the control that asked, or
   * nowhere, since the form is disabled during the check). A routine renewal keeps the card mounted and asks nothing. */
  const answer = useCallback((node: HTMLDivElement | null) => {
    feedback.current = node;
    if (!node || !submitted.current) return;
    submitted.current = false;
    const active = document.activeElement;
    if (!active || active === document.body || active === asker.current) node.focus({preventScroll: true});
  }, []);
  useEffect(() => {
    if (!loading && submitted.current && (ready || unavailable) && feedback.current?.isConnected) answer(feedback.current);
  }, [loading, ready, unavailable, answer]);
  /** A check was asked for: remember which control asked, so the answer can take focus from it and from nowhere else. */
  const ask = () => { submitted.current = true; asker.current = typeof document === 'undefined' ? null : document.activeElement; };

  function changeReference(value: string) {
    setReference(value);
    setHasSelection(false);
    setInvalid('');
    selected.current = '';
    submitted.current = false;
    controller.current?.pause();
    if (document.visibilityState === 'visible' && navigator.onLine) controller.current?.start();
  }

  const formattedTime = (value: string) => clockerOwnerWhen(value, timeZone, lang);

  const errorId = `${inputId}-error`;
  const offline = state?.state === 'unavailable' && state.reason === 'offline';
  const receipts = ready?.receipts ?? [];
  const receiptRows = receipts.length ? <BList label={t.resultHeading}>{receipts.map((receipt, index) => <BRow key={[receipt.employeeId, receipt.performedAt, index].join('-')}
    lead={<BAvatar name={receipt.employeeName} />} title={`${receipt.employeeName} · ${actionNames[receipt.action] ?? t.actionOther}`}
    sub={<><time dateTime={receipt.performedAt}>{formattedTime(receipt.performedAt)}</time>{` · ${receipt.deviceName}, ${receipt.locationName}`}</>} />)}</BList> : null;
  const content = <SettingsFrame back={back} settingsCrumb={false} className="wc-recovery ck-owner ck-recovery" title={t.recoveryTitle} summary={t.recoverySub}>
    <div className="ck-stack">
    <ClockerOwnerRequests actorId={actorId} timeZone={timeZone} lang={lang} onSelect={value=>{setReference(value);setHasSelection(true);setInvalid('');selected.current=value;ask();controller.current?.refresh();}}/>
    <BCard label={t.lookupTitle}>
    <form noValidate className="ck-form" aria-labelledby="recovery-lookup-heading" data-guard={hydrated ? undefined : ''}
      onInvalidCapture={event => { event.preventDefault(); setInvalid((event.target as HTMLInputElement).validity.valueMissing ? t.lookupMissing : t.lookupPattern); (event.target as HTMLInputElement).focus(); }}
      onSubmit={event => {
        event.preventDefault();
        if (!hydrated || pending) return;
        if (event.currentTarget?.checkValidity && !event.currentTarget.checkValidity()) return;
        selected.current = reference.trim().toLowerCase();
        setHasSelection(true);
        ask();
        if (!navigator.onLine) {
          setLoading(false);
          setState({state: 'unavailable', reason: 'offline'});
          return;
        }
        controller.current?.refresh();
      }}>
      <h2 className="ck-form__t" id="recovery-lookup-heading">{t.lookupTitle}</h2>
      <p className="ck-form__p">{t.recoveryWhat}</p>
      <fieldset disabled={!hydrated || pending} className="ck-form__fields">
        <div className="ck-field" data-invalid={invalid ? 'true' : undefined}>
          <label className="ck-field__l" htmlFor={inputId}>{t.lookupLabel}</label>
          <input id={inputId} className="ck-input" required value={reference} onChange={event => changeReference(event.target.value)}
            pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
            maxLength={36} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="go" aria-describedby={invalid ? `${errorId} ${helpId}` : helpId} aria-invalid={invalid ? true : undefined}/>
          {invalid ? <p className="ck-field__e" id={errorId} role="alert"><WarningCircleIcon size={16} weight="bold" aria-hidden="true" />{invalid}</p> : null}
          <p id={helpId} className="ck-form__h">{t.lookupHelp}</p>
        </div>
      </fieldset>
      <div className="ck-form__foot"><button className="b-btn b-btn--teal" type="submit" disabled={!hydrated || pending}>{pending ? t.checking : t.lookupSubmit}</button></div>
      <noscript><p className="ck-form__h">{t.noScript}</p></noscript>
    </form>
    </BCard>

    <section className="ck-results" aria-labelledby="recovery-result-heading" aria-busy={pending}>
      <h2 className="b-sr" id="recovery-result-heading">{t.resultHeading}</h2>
      {pending ? <BCard label={t.lookupBusy}><BState kind="loading" title={t.lookupBusy} /></BCard>
        : ready ? <div ref={answer} tabIndex={-1} className="ck-result" data-result={receipts.length === 0 ? 'none' : receipts.length === 1 ? 'found' : 'conflict'}>
          <BCard label={receipts.length === 0 ? t.notFoundTitle : receipts.length === 1 ? t.foundTitle : t.conflictTitle}>
            {receipts.length === 1 ? <div className="b-statecard" data-kind="done" role="status">
              <BDoneMark />
              <div className="b-statecard__main"><p className="b-statecard__t">{t.foundTitle}</p><p className="b-statecard__s">{t.foundBody}</p></div>
            </div>
              : <BState kind="paused" icon={<QuestionIcon weight="bold" />} title={receipts.length ? t.conflictTitle : t.notFoundTitle} line={receipts.length ? t.conflictBody : t.notFoundBody} />}
            {receiptRows}
          </BCard>
          <p className="b-sr">{t.codeChecked(ready.commandId)}</p>
        </div>
        : unavailable ? <div ref={answer} tabIndex={-1} className="ck-result">
          <BCard label={denied ? t.sessionTitle : offline ? t.offlineTitle : t.failedTitle}>
            <BState kind={denied ? 'locked' : offline ? 'offline' : 'failed'} alert title={denied ? t.sessionTitle : offline ? t.offlineTitle : t.failedTitle} line={denied ? t.sessionBody : offline ? t.offlineBody : t.failedBody}>
              {denied ? <Link className="b-btn b-btn--ghost" href="/login">{t.signIn}</Link> : null}
            </BState>
          </BCard>
        </div> : null}
    </section>

    {/* Final review B #9: the link to Timecards draws Timecards' own glyph, the Clock (the counter-clockwise clock is Time corrections). */}
    <BCard label={t.timecardsTitle}><BList><BRow href="/app/timecards" lead={<BIcon tone="teal"><ClockIcon weight="bold" /></BIcon>} title={t.timecardsTitle} sub={t.timecardsSub} /></BList></BCard>
    </div>
  </SettingsFrame>;
  return observation ? <ScopedReadFrame observation={observation}>{content}</ScopedReadFrame> : content;
}
