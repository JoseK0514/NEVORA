'use client';

import {useRef,useState,type FormEvent} from 'react';
import type {PhotoCompanyNoticeSettings,PhotoNoticeProfileUpdate} from '@/lib/clocker/photo-server/contracts';
import type {PhotoNoticeActionResult} from '@/lib/clocker/photo-server/settings-types';
import {noticeSettingsDraft,noticeSettingsUpdate,readCompanyNoticeSettings,verifySavedNoticeSettings} from '@/lib/clocker/photo-client/notice-settings';
import {ClockerPhotoNotice} from './photo-notice';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {ReturnToNext} from '../team/return-to-next';
import {FieldB} from '@/app/app/settings/settings-b-form';
import {usePortalLang} from '@/lib/i18n/portal-lang';
import {PHOTO_OWNER_COPY} from './photo-owner-copy';

export function ClockerPhotoNoticeSettings({initialSettings,saveAction,readAction}:{initialSettings:PhotoCompanyNoticeSettings;
 saveAction:(input:PhotoNoticeProfileUpdate)=>Promise<PhotoNoticeActionResult>;readAction:()=>Promise<PhotoNoticeActionResult>}){
 const lang=usePortalLang(), t=PHOTO_OWNER_COPY[lang];
 const [settings,setSettings]=useState(()=>readCompanyNoticeSettings(initialSettings));
 const [draft,setDraft]=useState(()=>noticeSettingsDraft(initialSettings)),[pending,setPending]=useState(false);
 const [feedback,setFeedback]=useState<{text:string;error:boolean}|null>(null);const busy=useRef(false);const [mustReload,setMustReload]=useState(false);
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy.current||mustReload)return;let request:PhotoNoticeProfileUpdate;
  try{request=noticeSettingsUpdate(draft,settings.profile.version,lang);}catch(error){setFeedback({text:error instanceof Error?error.message:t.checkHelpDetails,error:true});return;}
  busy.current=true;setPending(true);setFeedback(null);
  try{const result=await saveAction(request);if(result.state!=='available'){setMustReload(true);setFeedback({text:result.message,error:true});return;}
   const saved=verifySavedNoticeSettings(result.settings,request);setSettings(saved);setDraft(noticeSettingsDraft(saved));
   setFeedback({text:t.helpSaved,error:false});
  }catch{setMustReload(true);setFeedback({text:t.saveUnconfirmed,error:true});}
  finally{busy.current=false;setPending(false);}
 }
 async function reload(){if(busy.current)return;busy.current=true;setPending(true);setFeedback(null);
  try{const result=await readAction();if(result.state!=='available'){setMustReload(true);setFeedback({text:result.message,error:true});return;}
   const current=readCompanyNoticeSettings(result.settings);setMustReload(false);setSettings(current);setDraft(noticeSettingsDraft(current));setFeedback({text:t.helpLoaded,error:false});
  }catch{setMustReload(true);setFeedback({text:t.helpLoadFailed,error:true});}
  finally{busy.current=false;setPending(false);}
 }
 // Owner premium R13 (round 2): a closed row inside the Punch photos card ("Help for your team"). Opened, it holds this
 // form's two fields and its own Save; Reload shows only when a save couldn't be confirmed. Its own <form>, never nested
 // in the photo settings form, so neither reads the other's fields. The notice preview shows only once a notice exists.
 return <details className="c-photos__help" open={mustReload||undefined}>
  <summary className="c-row"><span className="c-row__main"><span className="c-row__title">{t.helpForTeam}</span>
   <span className="c-row__detail"><span>{settings.profile.assistanceContact??t.notSetYet}</span></span></span><CaretDownIcon weight="bold" className="c-chev c-photos__caret" aria-hidden="true"/></summary>
  <form className="c-photos__helpform" onSubmit={save} aria-busy={pending} aria-labelledby="photo-assistance-title">
   <h3 className="c-sr" id="photo-assistance-title">{t.helpForTeam}</h3>
   <fieldset disabled={pending} className="c-photos__fields"><legend className="c-sr">{t.helpForTeam}</legend>
    {settings.companyName?null:<p className="c-field__help">{t.companyNameMissing}</p>}
    <FieldB label={t.assistanceContact} id="photo-assistance-contact" helpId="photo-contact-help" help={t.assistanceContactHelp}
     required maxLength={200} value={draft.assistanceContact} autoComplete="off" autoCorrect="off" enterKeyHint="next" onChange={event=>setDraft({...draft,assistanceContact:event.target.value})}/>
    <FieldB kind="textarea" label={t.assistanceInstructions} id="photo-assistance-instructions" helpId="photo-instructions-help" help={t.assistanceInstructionsHelp}
     required maxLength={1000} rows={4} value={draft.assistanceInstructions} onChange={event=>setDraft({...draft,assistanceInstructions:event.target.value})}/>
    {settings.notice?<ClockerPhotoNotice lang={lang} policy={settings.policy} notice={settings.notice}/>:<p className="c-field__help">{t.savingDoesntTurnOn}</p>}
    {feedback?<p className={feedback.error?'c-photos__feedback c-photos__feedback--error':'c-photos__feedback'} role={feedback.error?'alert':'status'}>{feedback.text}</p>:null}
    <div className="c-photos__helpactions">
     {mustReload?<button className="c-btn c-btn--secondary" type="button" onClick={()=>void reload()}>{t.reloadHelp}</button>:null}
     <button className="c-btn c-btn--secondary" type="submit" disabled={mustReload}>{pending?t.saving:t.saveHelp}</button>
    </div>
   </fieldset>
   <ReturnToNext/>
  </form>
 </details>;
}
