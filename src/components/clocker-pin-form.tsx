'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { PinActionResult,PinSaveStatus } from '@/app/app/employees/[employeeId]/clocker-pin/actions';
import { Notice } from './wave-a/parts';
import { useKeepHeight } from './wave-a/keep-height';

/** Phase 3.5 Wave A: Clocker PIN in the shared form pattern. The PIN never enters React state, the fields clear
 * before the request leaves, one request at a time, and the button says "Saving…" while it is out. */
export function ClockerPinForm({ employeeId, initialVersion, action,checkStatus }: {
  employeeId: string;
  initialVersion: number;
  action: (data: FormData) => Promise<PinActionResult>;
  checkStatus?:(data:FormData)=>Promise<PinSaveStatus>;
}) {
  const [version, setVersion] = useState(initialVersion);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<PinActionResult | null>(null);
  const [operation,setOperation]=useState<string|null>(null),[status,setStatus]=useState<string|null>(null);
  const lock = useRef(false);
  const saveButton = useKeepHeight<HTMLButtonElement>(pending);
  const feedback = useRef<HTMLDivElement>(null);
  const employeeHref = `/app/employees/${encodeURIComponent(employeeId)}`;
  const blocked = Boolean(result && !result.ok && result.refresh);
  const configured = version > 0;
  const [lengths, setLengths] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    if (result) feedback.current?.focus();
  }, [result]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || blocked) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const operationId=crypto.randomUUID();data.set('operationId',operationId);setOperation(operationId);setStatus(null);
    // Keep PINs out of React state and clear the DOM before the network request.
    form.reset();
    lock.current = true;
    setPending(true);
    setResult(null);
    try {
      const next = await action(data);
      setResult(next);
      if (next.ok){setVersion(next.version);setOperation(null);}
    } catch {
      setResult({ ok: false, error: 'PIN changes could not be confirmed. Reload before trying again.', refresh: true });
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
    try{const r=await checkStatus(data);if(r.state==='recorded'&&r.version===r.currentVersion){setVersion(r.currentVersion);setResult({ok:true,version:r.version});setOperation(null);}else setStatus(r.state==='recorded'?'This save was recorded, then replaced by a newer PIN. Reload the current settings.':r.state==='unknown'?'No confirmation was found yet. Keep this reference and check again; no PIN was resent.':r.error);}
    catch{setStatus('This save could not be checked. Keep its reference and try again.');}finally{lock.current=false;setPending(false);}
  }
  // Quiet (v4, approved Oct 23): four boxes for the new PIN and four to confirm it; Save is at the top right.
  return <>
    {result ? <div ref={feedback} tabIndex={-1} className="wa-target">
      {result.ok
        ? <Notice tone="done" title="PIN saved">Share it with them privately.</Notice>
        : <Notice tone="urgent" title={result.refresh ? 'PIN save needs checking' : 'The PIN wasn’t saved'}>{result.error}</Notice>}
      {operation&&blocked?<div style={{display:'grid',gap:12,marginTop:16}}><p className="q-help">Save reference <code style={{overflowWrap:'anywhere'}}>{operation}</code></p>{checkStatus?<button type="button" className="q-btn q-btn--sec" disabled={pending} onClick={()=>void check()}>Check save status</button>:null}{status?<p role="status" className="q-help">{status}</p>:null}</div>:null}
      {result.ok ? <a className="q-btn q-btn--sec" href={employeeHref}>Back to employee</a> : result.refresh ? <a className="q-btn q-btn--sec" href={`${employeeHref}/clocker-pin`}>Reload</a> : null}
    </div> : null}
    <form id="clocker-pin-form" onSubmit={event => { setLengths([0, 0]); void submit(event); }} aria-busy={pending}>
      <input type="hidden" name="employeeId" value={employeeId} />
      <input type="hidden" name="expectedVersion" value={version} />
      <fieldset disabled={pending || blocked} className="q-fieldset">
        <PinBoxes id="new-clocker-pin" name="pin" label="New PIN" filled={lengths[0]} onLength={n => setLengths(current => [n, current[1]])} />
        <PinBoxes id="confirm-clocker-pin" name="confirmPin" label="Confirm PIN" filled={lengths[1]} onLength={n => setLengths(current => [current[0], n])} />
        <p id="pin-help" className="q-help" style={{ marginTop: 16 }}>4 digits, different for each person.{configured ? ' The old PIN stops working.' : ''}</p>
        <button ref={saveButton} type="submit" className="q-sr" tabIndex={-1}>{pending ? 'Saving…' : configured ? 'Reset PIN' : 'Save PIN'}</button>
      </fieldset>
      {pending ? <p role="status" className="q-sr">Saving the PIN.</p> : null}
    </form>
  </>;
}

/** Four boxes over one real field. Only how many digits are typed is kept, never the digits. */
function PinBoxes({ id, name, label, filled, onLength }: { id: string; name: string; label: string; filled: number; onLength: (n: number) => void }) {
  return <div className="q-fl">
    <label className="q-fl__label" htmlFor={id}>{label}</label>
    <div className="q-pin">
      <input id={id} name={name} type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{4}" minLength={4} maxLength={4} required aria-describedby="pin-help"
        onInput={event => { const field = event.currentTarget; field.value = field.value.replace(/\D/g, '').slice(0, 4); onLength(field.value.length); }} />
      {[0, 1, 2, 3].map(index => <span key={index} aria-hidden="true" data-on={index === filled ? '' : undefined}>{index < filled ? <i /> : null}</span>)}
    </div>
  </div>;
}