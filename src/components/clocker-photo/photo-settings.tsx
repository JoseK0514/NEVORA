'use client';

import {useRef,useState,type FormEvent} from 'react';
import {PHOTO_ACTIONS,type PhotoPolicy,type PhotoPolicyUpdate} from '@/lib/clocker/photo-server/contracts';
import type {PhotoSettingsActionResult} from '@/lib/clocker/photo-server/settings-types';
import {photoSettingsDraft,photoSettingsUpdate,verifySavedPhotoPolicy} from '@/lib/clocker/photo-client/settings';
import {readPhotoPolicy} from '@/lib/clocker/photo-client/session';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {CorpBody,CorpCard} from '../corp/corp';
import {ReturnToNext} from '../team/return-to-next';

const labels={CLOCK_IN:'Clock in',START_BREAK:'Start break',END_BREAK:'End break',CLOCK_OUT:'Clock out'};
export function ClockerPhotoSettings({initialPolicy,saveAction,readAction}:{initialPolicy:PhotoPolicy;
  saveAction:(policy:PhotoPolicyUpdate)=>Promise<PhotoSettingsActionResult>;readAction:()=>Promise<PhotoSettingsActionResult>}) {
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
      setFeedback({text:'Company photo settings saved. These preferences apply when photo capture is available.',error:false});
    }catch{setMustReload(true);setFeedback({text:'The settings result could not be confirmed. Reload saved settings before trying again.',error:true});}
    finally{busy.current=false;setPending(false);}
  }
  async function reload(){
    if(busy.current)return;busy.current=true;setPending(true);setFeedback(null);
    try{
      const result=await readAction();
      if(result.state!=='available'){setMustReload(true);setFeedback({text:result.message,error:true});return;}
      const current=readPhotoPolicy(result.policy);setMustReload(false);setPolicy(current);setDraft(photoSettingsDraft(current));
      setFeedback({text:'Current saved settings loaded. Unsaved edits were replaced.',error:false});
    }catch{setMustReload(true);setFeedback({text:'Saved settings could not be loaded. Your edits have been kept.',error:true});}
    finally{busy.current=false;setPending(false);}
  }
  // Owner premium (visual-craft "Punch photos"): the kit's cards and switch rows. The same draft, fields and two actions.
  return <form onSubmit={save} className="c-photos__form" aria-busy={pending} aria-labelledby="photo-settings-title">
    <h2 className="c-sr" id="photo-settings-title">Company punch photos</h2>
    <fieldset disabled={pending} className="c-photos__fields">
      <legend className="c-sr">Company punch photos</legend>
      <CorpCard as="div" ariaLabel="Punch photos">
        <label className="c-row c-photos__switch" htmlFor="photo-enabled">
          <span className="c-row__main"><span className="c-row__title">Ask for punch photos</span><span className="c-row__detail"><span>When capture is available, save a photo with the punches you pick.</span></span></span>
          <input id="photo-enabled" type="checkbox" role="switch" className="c-switch" checked={draft.enabled} onChange={e=>setDraft({...draft,enabled:e.target.checked})}/>
        </label>
      </CorpCard>
      <CorpCard label="Which punches need a photo?" id="photo-events">
        <ul className="c-rows" aria-label="Punches that need a photo">{PHOTO_ACTIONS.map(action=><li key={action}><label className="c-row c-row--one c-photos__switch" htmlFor={`photo-event-${action}`}>
          <span className="c-row__main"><span className="c-row__title">{labels[action]}</span></span>
          <input id={`photo-event-${action}`} type="checkbox" role="switch" className="c-switch" checked={draft.events.includes(action)} onChange={e=>setDraft({...draft,events:e.target.checked?[...draft.events,action]:draft.events.filter(value=>value!==action)})}/>
        </label></li>)}</ul>
      </CorpCard>
      <CorpCard label="Keeping photos" id="photo-retention">
        <CorpBody>
          <div className="c-field"><label className="c-field__label" htmlFor="photo-retention-days">Keep photos for (days)</label>
            <input id="photo-retention-days" className="c-in" aria-describedby="photo-retention-help" type="number" min={1} max={30} step={1} inputMode="numeric" enterKeyHint="done" value={draft.retentionDays} onChange={e=>setDraft({...draft,retentionDays:e.target.value})}/>
            <span id="photo-retention-help" className="c-field__help">Choose 1–30 days. A shorter period also applies to existing photos. Increasing it applies only to new photos.</span></div>
        </CorpBody>
        <details className="c-photos__more"><summary className="c-row c-row--one"><span className="c-row__main"><span className="c-row__title">When a photo is missing</span></span><CaretDownIcon className="c-chev c-photos__caret" aria-hidden="true"/></summary>
          <div className="c-photos__moretext"><p>A valid clock action stays recorded if a photo is declined or unavailable. Employees can continue without a photo and ask for assistance. Photo exceptions are kept separately.</p><p>Only an authorized Owner can review photos. Clocker takes one snapshot for the selected action; it does not record continuously or recognize faces.</p></div></details>
        <div className="c-card__foot c-photos__foot"><button type="button" className="c-btn c-btn--secondary" onClick={()=>void reload()}>Reload saved settings</button>
          <button type="submit" disabled={mustReload} className="c-btn">{pending?'Saving…':'Save company settings'}</button></div>
      </CorpCard>
    </fieldset>
    {feedback?<p role={feedback.error?'alert':'status'} className={feedback.error?'c-photos__feedback c-photos__feedback--error':'c-photos__feedback'}>{feedback.text}</p>:null}
    <ReturnToNext/>
  </form>;
}
