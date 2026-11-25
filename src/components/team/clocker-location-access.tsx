'use client';
/* The Owner's "Clock in at" sheet (Clocker UI step 1, Option A, Jose's pick Nov 25, 2026). Three Inline radio choices and,
 * under "Only these locations", an Inline check list (Jose's component picks: the native control in teal beside its label,
 * no box, no ruled lines). Each location says where they work ("Works here", "· Main"), so where they may clock in is
 * visibly a separate thing from their schedule. Save is the card's one Solid action and stays off until something changed;
 * then Saving (same width), then Saved, with focus moved to the result. A refusal shows the server's own sentence in a kit
 * notice; a stale or uncertain save locks the sheet until the profile is reloaded. */
import { useEffect, useId, useRef, useState } from 'react';
import { BBusyLabel, BCallout } from '@/components/owner-b/b-kit';
import { saveClockerLocationAccessAction } from '@/app/app/employees/[employeeId]/clocker-location-actions';
import { CLOCKER_LOCATION_UNCONFIRMED, clockerLocationCopy, clockerLocationServerText, type ClockerLocationLang } from './clocker-location-access-copy';
import {
  clockerLocationAfter, clockerLocationChanged, clockerLocationFormData, clockerLocationInitialPicks, clockerLocationInvalid,
  clockerLocationTag, type ClockerLocationBaseline, type ClockerLocationMode, type ClockerLocationPlace, type ClockerLocationResult,
  type ClockerLocationStatus,
} from './clocker-location-access-model';
import './clocker-location-access.css';

export type ClockerLocationViewProps = {
  lang: ClockerLocationLang; mode: ClockerLocationMode; picked: string[]; places: ClockerLocationPlace[]; work: string[];
  primaryId: string | null; status: ClockerLocationStatus; changed: boolean; ids: { group: string; hint: string };
  onMode?: (mode: ClockerLocationMode) => void; onPick?: (id: string, on: boolean) => void; onSave?: () => void; onReload?: () => void;
  resultRef?: React.Ref<HTMLDivElement>;
};

/** Everything drawn, from plain values: each state renders without a browser (tests and the captures use it). */
export function ClockerLocationView({ lang, mode: current, picked, places, work, primaryId, status, changed, ids, onMode, onPick, onSave, onReload, resultRef }: ClockerLocationViewProps) {
  const t = clockerLocationCopy[lang];
  const busy = status.kind === 'saving', locked = status.kind === 'failed' && status.refresh;
  const invalid = clockerLocationInvalid(current, picked);
  const workNames = places.filter(place => work.includes(place.id)).map(place => place.name).join(', ') || t.none;
  const choices: [ClockerLocationMode, string, string | null][] = [['ASSIGNED', t.where, workNames], ['SELECTED', t.only, null], ['ALL', t.every, t.everyDetail]];
  const list = <fieldset className="clk-list" aria-label={t.locations}>
    {places.map(place => { const tag = clockerLocationTag(lang, place.id, work, primaryId); return <label key={place.id} className="clk-choice">
      <input type="checkbox" name="locationId" value={place.id} checked={picked.includes(place.id)} aria-describedby={invalid ? ids.hint : undefined}
        onChange={event => onPick?.(place.id, event.currentTarget.checked)} />
      <span className="clk-choice__text"><span>{place.name}</span>{tag ? <small>{tag}</small> : null}</span>
    </label>; })}
  </fieldset>;
  const result = status.kind === 'saved'
    ? <BCallout tone="green" icon="done" role="status" title={t.saved} />
    : status.kind === 'failed'
      ? <BCallout tone="amber" icon="unknown" role="alert" title={clockerLocationServerText(status.message, lang)}
        action={status.refresh ? { label: t.reload, onClick: onReload } : undefined} />
      : null;
  return <div className="clk" aria-busy={busy || undefined}>
    <fieldset className="clk-modes" aria-labelledby={ids.group} disabled={busy || locked}>
      <legend id={ids.group} className="clk-sr">{t.title}</legend>
      {choices.map(([mode, label, help]) => <div key={mode} className="clk-mode">
        <label className="clk-choice">
          <input type="radio" name="mode" value={mode} checked={current === mode} onChange={() => onMode?.(mode)} />
          <span className="clk-choice__text"><span>{label}</span>{help ? <small>{help}</small> : null}</span>
        </label>
        {mode === 'SELECTED' && current === 'SELECTED' ? list : null}
      </div>)}
    </fieldset>
    {invalid ? <p id={ids.hint} className="clk-hint">{t.chooseOne}</p> : null}
    <div ref={resultRef} tabIndex={-1} className="clk-result">{result}</div>
    <button type="button" className="b-btn b-btn--teal b-btn--full clk-save" aria-busy={busy || undefined} aria-describedby={invalid ? ids.hint : undefined}
      disabled={busy || locked || invalid || !changed || undefined} onClick={onSave}>
      <BBusyLabel busy={busy} busyLabel={t.saving}>{t.save}</BBusyLabel>
    </button>
  </div>;
}

type SheetProps = { lang: ClockerLocationLang; employeeId: string; baseline: ClockerLocationBaseline; places: ClockerLocationPlace[]; work: string[]; primaryId: string | null };

/** The sheet's state and its one request. */
export function ClockerLocationSheet(props: SheetProps) {
  const [baseline, setBaseline] = useState(props.baseline);
  const [mode, setMode] = useState<ClockerLocationMode>(props.baseline.mode);
  const [picked, setPicked] = useState(() => clockerLocationInitialPicks(props.baseline, props.work, props.places));
  const [status, setStatus] = useState<ClockerLocationStatus>({ kind: 'idle' });
  const busy = useRef(false), mounted = useRef(false), resultRef = useRef<HTMLDivElement>(null);
  const id = useId().replace(/:/g, '');
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  // Focus moves to the result once it is drawn (Saved, or the server's sentence).
  useEffect(() => { if (status.kind === 'saved' || status.kind === 'failed') resultRef.current?.focus({ preventScroll: false }); }, [status]);
  const edit = () => { if (status.kind === 'saved' || (status.kind === 'failed' && !status.refresh)) setStatus({ kind: 'idle' }); };
  async function save() {
    if (busy.current || clockerLocationInvalid(mode, picked) || !clockerLocationChanged(baseline, mode, picked)) return;
    if (status.kind === 'failed' && status.refresh) return;
    busy.current = true; setStatus({ kind: 'saving' });
    let result: ClockerLocationResult;
    try { result = await saveClockerLocationAccessAction(clockerLocationFormData(props.employeeId, baseline, mode, picked)); }
    catch { result = { ok: false, error: CLOCKER_LOCATION_UNCONFIRMED, refresh: true }; }
    busy.current = false;
    if (!mounted.current) return;
    const next = clockerLocationAfter(result, baseline);
    setBaseline(next.baseline); setStatus(next.status);
    if (result.ok) { setMode(result.access.mode); if (result.access.mode === 'SELECTED') setPicked(result.access.locationIds); }
  }
  return <ClockerLocationView lang={props.lang} mode={mode} picked={picked} places={props.places} work={props.work} primaryId={props.primaryId}
    status={status} changed={clockerLocationChanged(baseline, mode, picked)} ids={{ group: `clk-${id}-group`, hint: `clk-${id}-hint` }} resultRef={resultRef}
    onMode={next => { edit(); setMode(next); }} onPick={(place, on) => { edit(); setPicked(current => on ? [...new Set([...current, place])] : current.filter(value => value !== place)); }}
    onSave={() => void save()} onReload={() => window.location.reload()} />;
}

/** On the person page: when the sheet closes back to the row (#clock-in-at), the row's link takes focus again. */
export function ClockerLocationReturnFocus({ targetId }: { targetId: string }) {
  useEffect(() => {
    if (window.location.hash !== `#${targetId}`) return;
    const link = document.getElementById(targetId)?.querySelector<HTMLElement>('a');
    link?.focus({ preventScroll: false });
  }, [targetId]);
  return null;
}
