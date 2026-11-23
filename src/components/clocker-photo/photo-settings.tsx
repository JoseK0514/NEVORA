'use client';

import {useEffect,useRef,useState,type FormEvent,type ReactNode} from 'react';
import {PHOTO_ACTIONS,type PhotoPolicy,type PhotoPolicyUpdate} from '@/lib/clocker/photo-server/contracts';
import type {PhotoSettingsActionResult} from '@/lib/clocker/photo-server/settings-types';
import {photoSettingsDraft,photoSettingsUpdate,verifySavedPhotoPolicy,type PhotoSettingsDraft} from '@/lib/clocker/photo-client/settings';
import {readPhotoPolicy} from '@/lib/clocker/photo-client/session';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {CorpCard,CorpFormFooter} from '../corp/corp';
import {FieldB,SwitchRowB} from '@/app/app/settings/settings-b-form';
import {BCallout} from '../owner-b/b-kit';
import {ReturnToNext} from '../team/return-to-next';
import {clockerOwnerCopy,type ClockerOwnerLang} from '../clocker-owner-copy';

/** Phase 8 (B #7): Save shows only once the form differs from what is saved, as on the other Settings forms. */
export function photoSettingsChanged(draft:PhotoSettingsDraft,policy:PhotoPolicy):boolean {
  const saved=photoSettingsDraft(policy);
  return draft.enabled!==saved.enabled||draft.retentionDays.trim()!==saved.retentionDays
    ||PHOTO_ACTIONS.some(action=>draft.events.includes(action)!==saved.events.includes(action));
}

export function ClockerPhotoSettings({initialPolicy,saveAction,readAction,children,lang='en'}:{initialPolicy:PhotoPolicy;lang?:ClockerOwnerLang;
  saveAction:(policy:PhotoPolicyUpdate)=>Promise<PhotoSettingsActionResult>;readAction:()=>Promise<PhotoSettingsActionResult>;
  /** Rows after the settings and before Save, outside this form (help for your team, review). */ children?:ReactNode}) {
  const t=clockerOwnerCopy[lang];
  const labels={CLOCK_IN:t.momentClockIn,START_BREAK:t.momentStartBreak,END_BREAK:t.momentEndBreak,CLOCK_OUT:t.momentClockOut};
  const [policy,setPolicy]=useState(initialPolicy),[draft,setDraft]=useState(()=>photoSettingsDraft(initialPolicy));
  // `focus`: the button that was pressed leaves with the change it saved, so the result line takes focus (and is then read
  // once, without a live region).
  const [pending,setPending]=useState(false),[feedback,setFeedback]=useState<{text:string;error:boolean;focus?:boolean}|null>(null);
  const busy=useRef(false);const [mustReload,setMustReload]=useState(false);
  const foot=useRef<HTMLDivElement>(null),said=useRef<HTMLParagraphElement>(null);
  const changed=photoSettingsChanged(draft,policy);
  useEffect(()=>{if(feedback?.focus)said.current?.focus();},[feedback]);
  const fromFoot=()=>!!foot.current&&foot.current.contains(document.activeElement);
  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy.current||mustReload)return;
    const pressed=fromFoot();
    let request:PhotoPolicyUpdate;
    try{request=photoSettingsUpdate(draft,policy.version);}
    catch(error){setFeedback({text:error instanceof Error?error.message:t.photosCheck,error:true});return;}
    busy.current=true;setPending(true);setFeedback(null);
    try{
      const result=await saveAction(request);
      if(result.state!=='available'){setMustReload(true);setFeedback({text:result.message,error:true});return;}
      const saved=verifySavedPhotoPolicy(result.policy,request);setPolicy(saved);setDraft(photoSettingsDraft(saved));
      setFeedback({text:t.photosSaved,error:false,focus:pressed});
    }catch{setMustReload(true);setFeedback({text:t.photosNotConfirmed,error:true});}
    finally{busy.current=false;setPending(false);}
  }
  async function reload(){
    if(busy.current)return;const pressed=fromFoot();busy.current=true;setPending(true);setFeedback(null);
    try{
      const result=await readAction();
      if(result.state!=='available'){setMustReload(true);setFeedback({text:result.message,error:true});return;}
      const current=readPhotoPolicy(result.policy);setMustReload(false);setPolicy(current);setDraft(photoSettingsDraft(current));
      setFeedback({text:t.photosReloaded,error:false,focus:pressed});
    }catch{setMustReload(true);setFeedback({text:t.photosReloadFailed,error:true});}
    finally{busy.current=false;setPending(false);}
  }
  // Owner premium R13 (round 2): while photo capture is unavailable the page is one card. It says so first, then the same
  // draft and fields, then `children` (help for your team and review, each outside this form so no form nests), and one
  // Save, shown once something changed (Phase 8). Reload shows only when a save couldn't be confirmed, the one time it's needed. Same reads, fields and actions.
  // Phase 6: the card opens with what the setting does, in one sentence; each switch says its state in words (On, Off)
  // beside it, so the state never rests on the switch's colour; and while punch photos are off, the four moments are
  // disabled and a line under their heading says why.
  // A moment's own word is left out while photos are off: its kept choice is not in effect, and the line above says why.
  const state=(on:boolean,off=false)=>off?null:<span className="ck-switch__state" data-on={on?'':undefined} aria-hidden="true">{on?t.on:t.off}</span>;
  return <CorpCard as="div" ariaLabel={t.photosTitle}>
    <div className="c-photos__state">
      <p className="ck-photos__what">{t.photosWhat}</p>
      {/* Phase 9 (spec 2.2): that photos aren't on yet is information about this card, so it is the kit's teal note (Info,
        * a 600 title over the 400 line, a hairline edge), not a bold line floating between the sentence and the switch. */}
      <BCallout tone="teal" title={t.photosUnavailableTitle}>{t.photosUnavailableBody}</BCallout>
    </div>
    <form id="photo-policy-form" onSubmit={save} className="c-photos__form" aria-busy={pending} aria-labelledby="photo-settings-title" data-save-on-change="" data-dirty={(changed||pending)&&!mustReload?'':undefined}>
      <h2 className="c-sr" id="photo-settings-title">{t.photosTitle}</h2>
      <fieldset disabled={pending} className="c-photos__fields">
        <legend className="c-sr">{t.photosTitle}</legend>
        <ul className="c-rows"><li><SwitchRowB id="photo-enabled" label={t.photosMain} status={state(draft.enabled)} checked={draft.enabled} onChange={on=>setDraft({...draft,enabled:on})}/></li></ul>
        {/* Review B5 (NV-083): while punch photos are off, the moments read as off too (disabled, the disabled look); the
          choices are kept and come back when photos are turned on. Phase 8 (B #6): a disabled moment is drawn and announced
          off, since no photo is taken at it; the kept choice lives in the draft, not in the switch. */}
        <fieldset className="c-photos__events" disabled={!draft.enabled} data-off={!draft.enabled || undefined}>
        <legend className="c-photos__label" id="photo-events">{t.photosMoments}</legend>
        {draft.enabled?null:<p className="ck-photos__why" id="photo-events-why">{t.photosMomentsOff}</p>}
        <ul className="c-rows" aria-labelledby="photo-events" aria-describedby={draft.enabled?undefined:'photo-events-why'}>{PHOTO_ACTIONS.map(action=><li key={action}>
          <SwitchRowB id={`photo-event-${action}`} label={labels[action]} status={state(draft.events.includes(action),!draft.enabled)} describedBy={draft.enabled?undefined:'photo-events-why'}
            checked={draft.enabled&&draft.events.includes(action)} onChange={on=>setDraft({...draft,events:on?[...draft.events,action]:draft.events.filter(value=>value!==action)})}/>
        </li>)}</ul>
        </fieldset>
        <div className="c-photos__keep c-setb-fields"><FieldB label={t.photosKeep} id="photo-retention-days" name="retentionDays" unit={t.photosDays} helpId="photo-retention-help" help={t.photosKeepHelp}
          type="number" min={1} max={30} step={1} inputMode="numeric" enterKeyHint="done" value={draft.retentionDays} onChange={e=>setDraft({...draft,retentionDays:e.target.value})}/></div>
        <details className="c-photos__more"><summary className="c-row c-row--one"><span className="c-row__main"><span className="c-row__title">{t.photosMissing}</span></span><CaretDownIcon weight="bold" className="c-chev c-photos__caret" aria-hidden="true"/></summary>
          <div className="c-photos__moretext">{t.photosMissingBody.map(line=><p key={line}>{line}</p>)}</div></details>
      </fieldset>
      <ReturnToNext/>
    </form>
    {children}
    {feedback?<p ref={said} tabIndex={feedback.focus?-1:undefined} role={feedback.focus?undefined:feedback.error?'alert':'status'} className={feedback.error?'c-photos__feedback c-photos__feedback--error':'c-photos__feedback'}>{feedback.text}</p>:null}
    {/* Final fixes S2 (G85): Save as on every Settings form: a phone's band (the page's `phoneRight`, shown while the form
      is `data-dirty`), the card's footer at its right edge from 768px. Reload, when a save couldn't be confirmed, is the
      card's own footer at every width. */}
    {mustReload?<div className="c-card__foot c-photos__foot" ref={foot}>
      <button type="button" className="c-btn c-btn--secondary" disabled={pending} onClick={()=>void reload()}>{t.photosReload}</button>
      <button type="submit" form="photo-policy-form" disabled className="c-btn">{t.photosSave}</button>
    </div>:changed||pending?<div ref={foot} style={{display:'contents'}}><CorpFormFooter>
      <button type="submit" form="photo-policy-form" disabled={pending} className="c-btn">{pending?t.saving:t.photosSave}</button>
    </CorpFormFooter></div>:null}
  </CorpCard>;
}
