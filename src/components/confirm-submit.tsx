'use client';

import {useEffect, useId, useRef, useState} from 'react';
import './quiet/u3.css';

/** A destructive submit that asks first (UX-E-14): "Take back this offer?" with Take back and Keep. Inside the form it
 * submits; Keep returns to the first button and gives it focus back. */
export function ConfirmSubmit({label, question, confirm, keep = 'Keep', name, value}: {label: string; question: string; confirm: string; keep?: string; name?: string; value?: string}) {
  const [asking, setAsking] = useState(false);
  const id = useId();
  const confirmRef = useRef<HTMLButtonElement>(null), triggerRef = useRef<HTMLButtonElement>(null), moved = useRef(false);
  useEffect(() => {
    if (!moved.current) return;
    (asking ? confirmRef : triggerRef).current?.focus();
  }, [asking]);
  if (!asking) return <button ref={triggerRef} type="button" className="q-btn q-btn--sec q-btn--danger" onClick={() => { moved.current = true; setAsking(true); }}>{label}</button>;
  return <div className="q-confirm" role="group" aria-labelledby={`${id}-q`}>
    <p id={`${id}-q`}>{question}</p>
    <button ref={confirmRef} type="submit" name={name} value={value} className="q-btn q-btn--sec q-btn--danger">{confirm}</button>
    <button type="button" className="q-btn q-btn--quiet" onClick={() => { moved.current = true; setAsking(false); }}>{keep}</button>
  </div>;
}
