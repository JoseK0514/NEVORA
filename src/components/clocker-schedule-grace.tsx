'use client';

import {useEffect,useRef,useState,type FormEvent} from 'react';
import type {ClockerScheduleGrace} from '@/lib/clocker/schedule-grace.server';
import {CorpCard} from './corp/corp';
import {clockerOwnerCopy,type ClockerOwnerLang} from './clocker-owner-copy';

export type ClockerGraceActionResult={state:'available';setting:ClockerScheduleGrace}|{state:'unavailable'|'rejected';message:string;code?:string};
/** A whole number of minutes, 0–30, as typed: no signs, decimals, exponents or leading zeros. */
export const graceDraftValid=(draft:string)=>/^(0|[1-9][0-9]?)$/.test(draft)&&Number(draft)<=30;

/** Shift matching (the Owner's Clocker settings): one card with the early clock-in grace, what it does, and one Save, as
 * Punch photos. The save carries the version the Owner reviewed; success is shown only for the server's next version and
 * the exact value, and an unconfirmed save asks for a reload before another try (no blind replay). */
export function ClockerGraceSettings({initial,saveAction,readAction,lang='en'}:{initial:ClockerScheduleGrace;lang?:ClockerOwnerLang;
  saveAction:(form:FormData)=>Promise<ClockerGraceActionResult>;readAction:()=>Promise<ClockerGraceActionResult>}){
  const t=clockerOwnerCopy[lang];
  const [setting,setSetting]=useState(initial),[draft,setDraft]=useState(String(initial.earlyClockInGraceMinutes));
  const [pending,setPending]=useState(false),[mustReload,setMustReload]=useState(false),[invalid,setInvalid]=useState(false);
  const [feedback,setFeedback]=useState<{text:string;error:boolean}|null>(null);
  const busy=useRef(false),input=useRef<HTMLInputElement>(null),reloadButton=useRef<HTMLButtonElement>(null);
  // The fieldset is disabled while a save or reload runs, which drops keyboard focus to the page. When it ends, focus
  // returns to where it was (the field or Save), or to Reload setting when Save stays disabled until a reload.
  const restore=useRef<HTMLElement|null>(null);
  useEffect(()=>{
    if(pending||!restore.current)return;
    const target=restore.current;restore.current=null;
    if(document.activeElement&&document.activeElement!==document.body)return;
    const usable=target.isConnected&&!(target as HTMLButtonElement).disabled;
    (usable?target:mustReload?reloadButton.current??input.current:input.current)?.focus();
  },[pending,mustReload]);
  const holdFocus=()=>{restore.current=document.activeElement instanceof HTMLElement&&document.activeElement!==document.body?document.activeElement:input.current;};
  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy.current||mustReload)return;
    const value=draft.trim();
    if(!graceDraftValid(value)){setInvalid(true);setFeedback(null);input.current?.focus();return;}
    const form=new FormData();form.set('earlyClockInGraceMinutes',value);form.set('expectedVersion',String(setting.version));
    busy.current=true;holdFocus();setPending(true);setFeedback(null);
    try{
      const result=await saveAction(form);
      if(result.state!=='available'){setMustReload(true);setFeedback({text:result.message,error:true});return;}
      const saved=result.setting;
      if(saved.version!==setting.version+1||saved.earlyClockInGraceMinutes!==Number(value))throw Error('Unconfirmed save');
      setSetting(saved);setDraft(String(saved.earlyClockInGraceMinutes));setFeedback({text:t.graceSaved,error:false});
    }catch{setMustReload(true);setFeedback({text:t.graceNotConfirmed,error:true});}
    finally{busy.current=false;setPending(false);}
  }
  async function reload(){
    if(busy.current)return;busy.current=true;holdFocus();setPending(true);setFeedback(null);
    try{
      const result=await readAction();
      if(result.state!=='available'){setFeedback({text:result.message,error:true});return;}
      setMustReload(false);setInvalid(false);setSetting(result.setting);setDraft(String(result.setting.earlyClockInGraceMinutes));
      setFeedback({text:t.graceReloaded,error:false});
    }catch{setFeedback({text:t.graceReloadFailed,error:true});}
    finally{busy.current=false;setPending(false);}
  }
  const described=invalid?'clocker-grace-error clocker-grace-help':'clocker-grace-help';
  return <CorpCard as="div" ariaLabel={t.matchingTitle}>
    <form id="clocker-grace-form" onSubmit={save} className="c-grace__form" aria-busy={pending} aria-labelledby="clocker-grace-title" noValidate>
      <h2 className="c-sr" id="clocker-grace-title">{t.matchingTitle}</h2>
      <fieldset disabled={pending} className="c-grace__fields">
        <legend className="c-sr">{t.matchingTitle}</legend>
        <div className="c-field c-grace__field">
          <label className="c-field__label" htmlFor="clocker-grace-minutes">{t.graceLabel}</label>
          <span className="c-grace__minutes">
            <input ref={input} id="clocker-grace-minutes" name="earlyClockInGraceMinutes" className="c-in" type="number" min={0} max={30} step={1}
              inputMode="numeric" enterKeyHint="done" required value={draft} aria-invalid={invalid||undefined} aria-describedby={described}
              onChange={event=>{setDraft(event.target.value);if(invalid&&graceDraftValid(event.target.value.trim()))setInvalid(false);}}/>
            <span aria-hidden="true">{t.graceUnit}</span>
          </span>
          {invalid?<span id="clocker-grace-error" className="c-grace__error" role="alert">{t.graceInvalid}</span>:null}
          <span id="clocker-grace-help" className="c-field__help">{t.graceHelp}</span>
        </div>
        <p className="c-grace__note">{t.graceNote}</p>
      </fieldset>
    </form>
    {feedback?<p role={feedback.error?'alert':'status'} className={feedback.error?'c-grace__feedback c-grace__feedback--error':'c-grace__feedback'}>{feedback.text}</p>:null}
    <div className="c-card__foot c-grace__foot">
      {mustReload?<button ref={reloadButton} type="button" className="c-btn c-btn--secondary" disabled={pending} onClick={()=>void reload()}>{t.graceReload}</button>:null}
      <button type="submit" form="clocker-grace-form" disabled={pending||mustReload} className="c-btn">{pending?t.saving:t.graceSave}</button>
    </div>
  </CorpCard>;
}
