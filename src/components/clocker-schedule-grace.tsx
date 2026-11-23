'use client';

import {Fragment,useEffect,useRef,useState,type FormEvent,type ReactNode} from 'react';
import type {ClockerScheduleGrace} from '@/lib/clocker/schedule-grace.server';
import {CorpFormFooter} from './corp/corp';
import {FieldB} from '@/app/app/settings/settings-b-form';
import {BCallout,type BMeaning,type BTone} from './owner-b/b-kit';
import {clockerOwnerCopy,type ClockerOwnerLang} from './clocker-owner-copy';

export type ClockerGraceActionResult={state:'available';setting:ClockerScheduleGrace}|{state:'unavailable'|'rejected';message:string;code?:string};
/** A whole number of minutes, 0–30, as typed: no signs, decimals, exponents or leading zeros. */
export const graceDraftValid=(draft:string)=>/^(0|[1-9][0-9]?)$/.test(draft)&&Number(draft)<=30;

/** Review 30 (D23): what a result is, so its words and its look are chosen here by code (the server's sentence is never
 * drawn): saved is the green done note, a reload is information, a change made elsewhere and a save that can't be
 * confirmed wait on a reload (amber; "not confirmed" has the question glyph and is never red), and a refusal stops. */
type Result='saved'|'reloaded'|'changed'|'unknown'|'readFailed'|'ownerOnly'|'refused';
const LOOK:Record<Result,{tone:BTone;icon?:BMeaning}>={saved:{tone:'green',icon:'done'},reloaded:{tone:'teal',icon:'info'},changed:{tone:'amber',icon:'check'},
 unknown:{tone:'amber',icon:'unknown'},readFailed:{tone:'red',icon:'stop'},ownerOnly:{tone:'red',icon:'stop'},refused:{tone:'red',icon:'stop'}};

/** D26: "0" stays with the word after it ("0 keeps strict matching"), and a hyphenated word ("Clock-ins") never breaks at
 * its hyphen. */
function wholeWords(text:string):ReactNode{
 const tied=text.replace(/(^|\s)(\d+) /g,'$1$2 ');
 return tied.split(/(\S+-\S+)/).map((part,index)=>index%2?<span key={index} className="c-grace__whole">{part}</span>:<Fragment key={index}>{part}</Fragment>);
}

/** Shift matching (the Owner's Clocker settings): one card with the early clock-in grace, what it does, and Save once the
 * value differs from the saved one, as on the other Settings forms (Review 30, D22). The save carries the version the
 * Owner reviewed; success is shown only for the server's next version and the exact value, and an unconfirmed save asks
 * for a reload before another try (no blind replay): Save goes and Reload setting is the one filled button (D25). */
export function ClockerGraceSettings({initial,saveAction,readAction,lang='en'}:{initial:ClockerScheduleGrace;lang?:ClockerOwnerLang;
  saveAction:(form:FormData)=>Promise<ClockerGraceActionResult>;readAction:()=>Promise<ClockerGraceActionResult>}){
  const t=clockerOwnerCopy[lang];
  const [setting,setSetting]=useState(initial),[draft,setDraft]=useState(String(initial.earlyClockInGraceMinutes));
  const [pending,setPending]=useState(false),[mustReload,setMustReload]=useState(false),[invalid,setInvalid]=useState(false);
  const [result,setResult]=useState<{kind:Result;focus:boolean}|null>(null);
  const busy=useRef(false),input=useRef<HTMLInputElement>(null),reloadButton=useRef<HTMLButtonElement>(null),foot=useRef<HTMLDivElement>(null),said=useRef<HTMLDivElement>(null);
  const changed=draft.trim()!==String(setting.earlyClockInGraceMinutes);
  // The fieldset is disabled while a save or reload runs, which drops keyboard focus to the page. When it ends, focus goes
  // where the person can act: Reload setting while a reload is needed; the result when the button they pressed has gone
  // (it is then read once, without a live region); otherwise back where it was (the field), or to the field.
  const restore=useRef<HTMLElement|null>(null);
  useEffect(()=>{
    if(pending||!restore.current)return;
    const target=restore.current;restore.current=null;
    if(document.activeElement&&document.activeElement!==document.body)return;
    if(mustReload){reloadButton.current?.focus();return;}
    if(result?.focus){said.current?.focus();return;}
    const usable=target.isConnected&&!(target as HTMLButtonElement).disabled;
    (usable?target:input.current)?.focus();
  },[pending,mustReload,result]);
  const holdFocus=()=>{const active=document.activeElement instanceof HTMLElement&&document.activeElement!==document.body?document.activeElement:null;restore.current=active??input.current;return !!active&&!!foot.current?.contains(active);};
  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy.current||mustReload||!changed)return;
    const value=draft.trim();
    if(!graceDraftValid(value)){setInvalid(true);setResult(null);input.current?.focus();return;}
    const form=new FormData();form.set('earlyClockInGraceMinutes',value);form.set('expectedVersion',String(setting.version));
    busy.current=true;const pressed=holdFocus();setPending(true);setResult(null);
    try{
      const reply=await saveAction(form);
      if(reply.state!=='available'){
        if(reply.state==='rejected'&&reply.code==='INVALID'){setInvalid(true);restore.current=input.current;return;}
        setMustReload(true);setResult({kind:reply.state==='unavailable'?'unknown':reply.code==='STALE'?'changed':reply.code==='FORBIDDEN'?'ownerOnly':'refused',focus:false});return;
      }
      const saved=reply.setting;
      if(saved.version!==setting.version+1||saved.earlyClockInGraceMinutes!==Number(value))throw Error('Unconfirmed save');
      setSetting(saved);setDraft(String(saved.earlyClockInGraceMinutes));setResult({kind:'saved',focus:pressed});
    }catch{setMustReload(true);setResult({kind:'unknown',focus:false});}
    finally{busy.current=false;setPending(false);}
  }
  async function reload(){
    if(busy.current)return;busy.current=true;holdFocus();restore.current=input.current;setPending(true);setResult(null);
    try{
      const reply=await readAction();
      if(reply.state!=='available'){setResult({kind:reply.state==='rejected'&&reply.code==='FORBIDDEN'?'ownerOnly':'readFailed',focus:false});return;}
      setMustReload(false);setInvalid(false);setSetting(reply.setting);setDraft(String(reply.setting.earlyClockInGraceMinutes));
      setResult({kind:'reloaded',focus:false});
    }catch{setResult({kind:'readFailed',focus:false});}
    finally{busy.current=false;setPending(false);}
  }
    const words:Record<Result,string>={saved:t.graceSaved,reloaded:t.graceReloaded,changed:t.graceChanged,unknown:t.graceNotConfirmed,readFailed:t.graceReloadFailed,ownerOnly:t.graceOwnerOnly,refused:t.graceRefused};
  const look=result?LOOK[result.kind]:null;
  // Final fixes S2 (G85): the form is the card, its field is the Settings FieldB (label, outlined field with its unit, the one
  // error line, the help), and Save stands where every Settings form has it: on a phone's band (the page's `phoneRight`,
  // shown while `data-dirty` is set) and in the card's footer from 768px, at its right edge. Reload setting, when a save
  // couldn't be confirmed, is the card's own footer at every width. The result stands under the card.
  const dirty=(changed||pending)&&!mustReload;
  return <>
    <form id="clocker-grace-form" onSubmit={save} className="c-card c-setb-form c-grace__form" aria-busy={pending} aria-labelledby="clocker-grace-title" noValidate
      data-save-on-change="" data-dirty={dirty?'':undefined}>
      <h2 className="c-sr" id="clocker-grace-title">{t.matchingTitle}</h2>
      <fieldset disabled={pending} className="c-setb-fieldset c-grace__fields">
        <legend className="c-sr">{t.matchingTitle}</legend>
        <div className="c-card__body c-setb-fields">
          <FieldB label={t.graceLabel} id="clocker-grace-minutes" name="earlyClockInGraceMinutes" unit={t.graceUnit} inputRef={input as never}
            type="number" min={0} max={30} step={1} inputMode="numeric" enterKeyHint="done" required value={draft}
            error={invalid?t.graceInvalid:undefined} help={wholeWords(t.graceHelp)} helpId="clocker-grace-help"
            onChange={event=>{setDraft(event.target.value);if(invalid&&graceDraftValid(event.target.value.trim()))setInvalid(false);if(result&&!mustReload)setResult(null);}}/>
        </div>
        <p className="c-setb-cardnote">{wholeWords(t.graceNote)}</p>
      </fieldset>
      {mustReload?<div className="c-card__foot c-grace__foot" ref={foot}>
        <button ref={reloadButton} type="button" className="c-btn" disabled={pending} onClick={()=>void reload()}>{t.graceReload}</button>
      </div>:dirty?<div ref={foot} style={{display:'contents'}}><CorpFormFooter>
        <button type="submit" disabled={pending} className="c-btn">{pending?t.saving:t.graceSave}</button>
      </CorpFormFooter></div>:null}
    </form>
    {result&&look?<div ref={said} className="c-grace__result c-setb-result" tabIndex={result.focus?-1:undefined}>
      <BCallout tone={look.tone} icon={look.icon} role={result.focus?undefined:look.tone==='green'||look.tone==='teal'?'status':'alert'}>{words[result.kind]}</BCallout>
    </div>:null}
  </>;
}
