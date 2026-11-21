'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { QuestionIcon } from '@phosphor-icons/react/dist/ssr/Question';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import type { PinActionResult,PinSaveStatus } from '@/app/app/employees/[employeeId]/clocker-pin/actions';
import { BCard, BDoneMark, BState } from './owner-b/b-kit';
import { ReturnToNext } from './team/return-to-next';
import { clockerOwnerCopy, type ClockerOwnerLang } from './clocker-owner-copy';

type Origin = 'person' | 'pins';

/** Setting or resetting one person's Clocker PIN (Phase 6). The PIN never enters React state: only how many digits are
 * typed is kept, the two fields are compared in the page and cleared before the request leaves, and one request runs
 * at a time. After a save the form is gone: the card says whose PIN was set and that it is told in person, and nothing
 * a passer-by could read stays on screen. A save that can't be confirmed is amber, keeps its reference and offers one
 * check that looks the original save up; nothing is sent twice. */
export function ClockerPinForm({ employeeId, name = '', initialVersion, action, checkStatus, origin = 'person', lang = 'en' }: {
  employeeId: string;
  name?: string;
  initialVersion: number;
  action: (data: FormData) => Promise<PinActionResult>;
  checkStatus?:(data:FormData)=>Promise<PinSaveStatus>;
  origin?: Origin;
  lang?: ClockerOwnerLang;
}) {
  const t = clockerOwnerCopy[lang];
  const [version, setVersion] = useState(initialVersion);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<PinActionResult | null>(null);
  const [operation,setOperation]=useState<string|null>(null),[status,setStatus]=useState<string|null>(null);
  const [mismatch, setMismatch] = useState(false);
  const [again, setAgain] = useState(0);
  const lock = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  const confirm = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const employeeHref = `/app/employees/${encodeURIComponent(employeeId)}`;
  const unknown = Boolean(result && !result.ok && result.refresh);
  const saved = Boolean(result?.ok);
  const configured = initialVersion > 0;
  const [lengths, setLengths] = useState<[number, number]>([0, 0]);
  const disabled = pending || unknown || lengths.some(n => n !== 4);

  useEffect(() => { if (result) feedback.current?.focus(); }, [result]);
  useEffect(() => { if (mismatch) confirm.current?.focus(); }, [mismatch]);
  useEffect(() => { if (again) heading.current?.focus(); }, [again]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || unknown) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    // The two PINs are compared here, in the page; a mismatch sends nothing and clears the second box.
    if (data.get('pin') !== data.get('confirmPin')) {
      data.delete('pin'); data.delete('confirmPin');
      if (confirm.current) confirm.current.value = '';
      setLengths(current => [current[0], 0]); setResult(null); setMismatch(true); return;
    }
    const operationId=crypto.randomUUID();data.set('operationId',operationId);setOperation(operationId);setStatus(null);
    // Keep PINs out of React state and clear the DOM before the network request.
    form.reset();
    setLengths([0, 0]); setMismatch(false);
    lock.current = true;
    setPending(true);
    setResult(null);
    try {
      const next = await action(data);
      setResult(next);
      if (next.ok){setVersion(next.version);setOperation(null);}
    } catch {
      setResult({ ok: false, error: t.pinUnknownBody, refresh: true });
    } finally {
      data.delete('pin');
      data.delete('confirmPin');
      lock.current = false;
      setPending(false);
    }
  }

  async function check(){
    if(lock.current||!operation||!checkStatus)return;lock.current=true;setPending(true);setStatus(null);
    const data=new FormData();data.set('employeeId',employeeId);data.set('operationId',operation);
    try{const r=await checkStatus(data);if(r.state==='recorded'&&r.version===r.currentVersion){setVersion(r.currentVersion);setResult({ok:true,version:r.version});setOperation(null);}else setStatus(r.state==='recorded'?t.pinStatusReplaced:r.state==='unknown'?t.pinStatusUnknown:t.pinStatusFailed);}
    catch{setStatus(t.pinStatusFailed);}finally{lock.current=false;setPending(false);}
  }
  function another() { setResult(null); setOperation(null); setStatus(null); setLengths([0, 0]); setAgain(n => n + 1); }

  // Saved: the form is gone. Whose PIN, how to pass it on, and the way back.
  if (saved) return <BCard label={t.pinDoneSet(name)}>
    <div ref={feedback} tabIndex={-1} className="ck-result">
      <div className="b-statecard" data-kind="done" role="status">
        <BDoneMark />
        <div className="b-statecard__main">
          <p className="b-statecard__t">{t.pinDoneSet(name)}</p>
          <p className="b-statecard__s">{t.pinDoneBody}</p>
          <span className="ck-result__acts">
            <Link className="b-btn b-btn--ghost" href={origin === 'pins' ? '/app/settings/clocker/pins' : employeeHref}>{origin === 'pins' ? t.pinBackToPins : t.pinBackToPerson(name)}</Link>
            <button type="button" className="b-btn b-btn--quiet ck-text" onClick={another}>{t.pinAnother}</button>
          </span>
        </div>
      </div>
    </div>
  </BCard>;
  // Not confirmed: amber, the save's reference, one check of the original save, and a reload.
  if (unknown) return <BCard label={t.pinUnknownTitle}>
    <div ref={feedback} tabIndex={-1} className="ck-result" data-tone="amber">
      <BState kind="paused" alert icon={<QuestionIcon weight="bold" />} title={t.pinUnknownTitle} line={t.pinUnknownBody}>
        {operation ? <p className="ck-ref">{t.pinReference} <code>{operation}</code></p> : null}
        {status ? <p role="status" className="ck-ref">{status}</p> : null}
        <span className="ck-result__acts">
          {operation && checkStatus ? <button type="button" className="b-btn b-btn--ghost" disabled={pending} aria-busy={pending || undefined} onClick={() => void check()}>{pending ? t.checking : t.pinCheck}</button> : null}
          <a className="b-btn b-btn--quiet ck-text" href={`${employeeHref}/clocker-pin${origin === 'pins' ? '?from=pins' : ''}`}>{t.pinReload}</a>
        </span>
      </BState>
    </div>
  </BCard>;
  const failed = result && !result.ok ? result.error : null;
  return <BCard label={configured ? t.pinResetHeading(name) : t.pinSetHeading(name)}>
    <form id="clocker-pin-form" className="ck-form" onSubmit={event => void submit(event)} aria-busy={pending} aria-labelledby="clocker-pin-heading" noValidate>
      <h2 ref={heading} id="clocker-pin-heading" tabIndex={-1} className="ck-form__t">{configured ? t.pinResetHeading(name) : t.pinSetHeading(name)}</h2>
      <p className="ck-form__p">{configured ? t.pinIntroReset : t.pinIntroSet}</p>
      {failed ? <div ref={feedback} role="alert" tabIndex={-1} className="ck-alert" data-tone="red"><WarningCircleIcon size={18} weight="bold" aria-hidden="true" /><span><b>{t.pinNotSavedTitle}</b>{failed}</span></div> : null}
      <input type="hidden" name="employeeId" value={employeeId} />
      <input type="hidden" name="expectedVersion" value={version} />
      <fieldset disabled={pending} className="ck-form__fields">
        <ReturnToNext />
        <PinBoxes id="new-clocker-pin" name="pin" label={t.pinNew} enterKeyHint="next" filled={lengths[0]} help="pin-help" onLength={n => { setMismatch(false); setLengths(current => [n, current[1]]); }} />
        <PinBoxes id="confirm-clocker-pin" name="confirmPin" label={t.pinConfirm} enterKeyHint="done" filled={lengths[1]} help="pin-help" inputRef={confirm} error={mismatch ? t.pinMismatch : undefined} onLength={n => { setMismatch(false); setLengths(current => [current[0], n]); }} />
        <p id="pin-help" className="ck-form__h">{t.pinHelp}</p>
      </fieldset>
      <div className="ck-form__foot"><button type="submit" className="b-btn b-btn--teal" disabled={disabled}>{pending ? t.saving : t.pinSave}</button></div>
      <p role="status" className="b-sr">{pending ? t.pinSaving : ''}</p>
    </form>
  </BCard>;
}

/** Four boxes over one real field. Only how many digits are typed is kept, never the digits. A text field with the number
 * pad and masked digits, not a password field, so iOS never offers a Strong Password or a saved login for a 4-digit PIN.
 * The digits are drawn as dots in the boxes; the field itself is invisible. An error is the one error style: the 16px
 * bold warning glyph, then the sentence, with no closing period. */
function PinBoxes({ id, name, label, filled, onLength, enterKeyHint, help, error, inputRef }: { id: string; name: string; label: string; filled: number; onLength: (n: number) => void; enterKeyHint: 'next' | 'done'; help: string; error?: string; inputRef?: React.Ref<HTMLInputElement> }) {
  return <div className="ck-field" data-invalid={error ? 'true' : undefined}>
    <label className="ck-field__l" htmlFor={id}>{label}</label>
    <div className="ck-pinbox">
      <input ref={inputRef} id={id} name={name} type="text" inputMode="numeric" autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} enterKeyHint={enterKeyHint} data-masked="" pattern="[0-9]{4}" minLength={4} maxLength={4} required
        aria-describedby={error ? `${id}-error ${help}` : help} aria-invalid={error ? true : undefined}
        onInput={event => { const field = event.currentTarget; field.value = field.value.replace(/\D/g, '').slice(0, 4); onLength(field.value.length); }} />
      {[0, 1, 2, 3].map(index => <span key={index} aria-hidden="true" data-on={index === filled ? '' : undefined}>{index < filled ? <i /> : null}</span>)}
    </div>
    {error ? <p className="ck-field__e" id={`${id}-error`} role="alert"><WarningCircleIcon size={16} weight="bold" aria-hidden="true" />{error}</p> : null}
  </div>;
}
