'use client';

import {useRef,useState,type FormEvent,type ReactNode} from 'react';
import {PHOTO_ACTIONS,type PhotoPolicy,type PhotoPolicyUpdate} from '@/lib/clocker/photo-server/contracts';
import type {PhotoSettingsActionResult} from '@/lib/clocker/photo-server/settings-types';
import {photoSettingsDraft,photoSettingsUpdate,verifySavedPhotoPolicy} from '@/lib/clocker/photo-client/settings';
import {readPhotoPolicy} from '@/lib/clocker/photo-client/session';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {CorpCard} from '../corp/corp';
import {ReturnToNext} from '../team/return-to-next';

const labels={CLOCK_IN:'Clock in',START_BREAK:'Start break',END_BREAK:'End break',CLOCK_OUT:'Clock out'};
export function ClockerPhotoSettings({initialPolicy,saveAction,readAction,children}:{initialPolicy:PhotoPolicy;
  saveAction:(policy:PhotoPolicyUpdate)=>Promise<PhotoSettingsActionResult>;readAction:()=>Promise<PhotoSettingsActionResult>;
  /** Rows after the settings and before Save, outside this form (help for your team, review). */ children?:ReactNode}) {
  const [policy,setPolicy]=useState(initialPolicy),[draft,setDraft]=useState(()=>photoSettingsDraft(initialPolicy));
  const [pending,setPending]=useState(false),[feedback,setFeedback]=useState<{text:string;error:boolean}|null>(null);
  const busy=useRef(false);const [mustReload,setMustReload]=useState(false);
  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy.current||mustReload)return;
    let request:PhotoPolicyUpdate;
    try{request=photoSettingsUpdate(draft,policy.version);}
    catch(error){setFeedback({text:error instanceof Error?error.message:'Check the photo settings.',error:true});return;}
    busy.current=true;setPending(true);setFeedback(null);
    try{
      const result=await saveAction(request);
      if(result.state!=='available'){setMustReload(true);setFeedback({text:result.message,error:true});return;}
      const saved=verifySavedPhotoPolicy(result.policy,request);setPolicy(saved);setDraft(photoSettingsDraft(saved));
      setFeedback({text:'Saved. These settings start when photos are available.',error:false});
    }catch{setMustReload(true);setFeedback({text:'We couldn’t confirm that save. Reload settings before you try again.',error:true});}
    finally{busy.current=false;setPending(false);}
  }
  async function reload(){
    if(busy.current)return;busy.current=true;setPending(true);setFeedback(null);
    try{
      const result=await readAction();
      if(result.state!=='available'){setMustReload(true);setFeedback({text:result.message,error:true});return;}
      const current=readPhotoPolicy(result.policy);setMustReload(false);setPolicy(current);setDraft(photoSettingsDraft(current));
      setFeedback({text:'Saved settings loaded. Unsaved changes were replaced.',error:false});
    }catch{setMustReload(true);setFeedback({text:'Couldn’t load saved settings. Your changes are still here.',error:true});}
    finally{busy.current=false;setPending(false);}
  }
  // Owner premium R13 (round 2): while photo capture is unavailable the page is one card. It says so first, then the same
  // draft and fields, then `children` (help for your team and review, each outside this form so no form nests), and one
  // Save. Reload shows only when a save couldn't be confirmed, the one time it's needed. Same reads, fields and actions.
  return <CorpCard as="div" ariaLabel="Punch photos">
    <div className="c-photos__state">
      <span className="c-photos__state-title">Punch photos aren’t available yet</span>
      <span className="c-photos__state-body">You can choose your settings now.</span>
    </div>
    <form id="photo-policy-form" onSubmit={save} className="c-photos__form" aria-busy={pending} aria-labelledby="photo-settings-title">
      <h2 className="c-sr" id="photo-settings-title">Punch photo settings</h2>
      <fieldset disabled={pending} className="c-photos__fields">
        <legend className="c-sr">Punch photo settings</legend>
        <label className="c-row c-photos__switch" htmlFor="photo-enabled">
          <span className="c-row__main"><span className="c-row__title">Take punch photos</span><span className="c-row__detail"><span>Starts when photos are available</span></span></span>
          <input id="photo-enabled" type="checkbox" role="switch" className="c-switch" checked={draft.enabled} onChange={e=>setDraft({...draft,enabled:e.target.checked})}/>
        </label>
        <h3 className="c-photos__label" id="photo-events">When to take a photo</h3>
        <ul className="c-rows" aria-labelledby="photo-events">{PHOTO_ACTIONS.map(action=><li key={action}><label className="c-row c-row--one c-photos__switch" htmlFor={`photo-event-${action}`}>
          <span className="c-row__main"><span className="c-row__title">{labels[action]}</span></span>
          <input id={`photo-event-${action}`} type="checkbox" role="switch" className="c-switch" checked={draft.events.includes(action)} onChange={e=>setDraft({...draft,events:e.target.checked?[...draft.events,action]:draft.events.filter(value=>value!==action)})}/>
        </label></li>)}</ul>
        <div className="c-field c-photos__keep"><label className="c-field__label" htmlFor="photo-retention-days">Keep photos for</label>
          <span className="c-photos__days"><input id="photo-retention-days" className="c-in" aria-describedby="photo-retention-help" type="number" min={1} max={30} step={1} inputMode="numeric" enterKeyHint="done" value={draft.retentionDays} onChange={e=>setDraft({...draft,retentionDays:e.target.value})}/><span aria-hidden="true">days</span></span>
          <span id="photo-retention-help" className="c-field__help">1 to 30 days. Shortening it deletes older photos.</span></div>
        <details className="c-photos__more"><summary className="c-row c-row--one"><span className="c-row__main"><span className="c-row__title">When a photo is missing</span></span><CaretDownIcon className="c-chev c-photos__caret" aria-hidden="true"/></summary>
          <div className="c-photos__moretext"><p>The clock-in or clock-out still counts if someone declines the photo or the camera fails. They can ask for help and carry on.</p><p>Only an Owner can see photos. The tablet takes one photo for that moment. It never records video or recognizes faces.</p></div></details>
      </fieldset>
      <ReturnToNext/>
    </form>
    {children}
    {feedback?<p role={feedback.error?'alert':'status'} className={feedback.error?'c-photos__feedback c-photos__feedback--error':'c-photos__feedback'}>{feedback.text}</p>:null}
    <div className="c-card__foot c-photos__foot">
      {mustReload?<button type="button" className="c-btn c-btn--secondary" disabled={pending} onClick={()=>void reload()}>Reload settings</button>:null}
      <button type="submit" form="photo-policy-form" disabled={pending||mustReload} className="c-btn">{pending?'Saving…':'Save'}</button>
    </div>
  </CorpCard>;
}
