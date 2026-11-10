'use client';
import Link from 'next/link';
import {useEffect,useRef,useState,useSyncExternalStore,type FormEvent} from 'react';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {EnvelopeSimpleIcon} from '@phosphor-icons/react/dist/ssr/EnvelopeSimple';
import {CopySimpleIcon} from '@phosphor-icons/react/dist/ssr/CopySimple';
import {IdentificationCardIcon} from '@phosphor-icons/react/dist/ssr/IdentificationCard';
import {LockKeyIcon} from '@phosphor-icons/react/dist/ssr/LockKey';
import {QuestionIcon} from '@phosphor-icons/react/dist/ssr/Question';
import {UsersThreeIcon} from '@phosphor-icons/react/dist/ssr/UsersThree';
import {LifebuoyIcon} from '@phosphor-icons/react/dist/ssr/Lifebuoy';
import {LinkBreakIcon} from '@phosphor-icons/react/dist/ssr/LinkBreak';
import {AtIcon} from '@phosphor-icons/react/dist/ssr/At';
import {CheckCircleIcon} from '@phosphor-icons/react/dist/ssr/CheckCircle';
import {UserMinusIcon} from '@phosphor-icons/react/dist/ssr/UserMinus';
import type {AuthLang} from '@/lib/auth-copy';
import {MOBILE_ACCESS_COPY,type MobileAccessCopy} from './copy';

/** supportEmail is the separately gated general Support intake; ownerEmail is the sole-Owner path, always offered. */
type Props={topic:string;lang:AuthLang;from:string;supportEmail:string|null;ownerEmail:string};
const Header=({title,sub}:{title:string;sub?:string})=><div className="q-hd"><h1 tabIndex={-1}>{title}</h1>{sub?<p>{sub}</p>:null}</div>;
/* Review B4 (NV-101 here, NV-198): a disclosure opens in place behind a bold down caret; a row that leads to another page
 * keeps its right caret and shows its topic as a bold glyph in a teal-tinted circle, as on in-app rows. */
const Caret=()=><CaretDownIcon className="ma-caret" size={16} weight="bold" aria-hidden="true"/>;
const ChoiceIcon=({icon:Icon}:{icon:typeof QuestionIcon})=><span className="ma-choice__icon" aria-hidden="true"><Icon size={20} weight="bold"/></span>;
function Disclosure({title,children}:{title:string;children:React.ReactNode}){return <details className="ma-details"><summary>{title}<Caret/></summary>{children}</details>;}

function Draft({message,t,mailto}:{message:string;t:MobileAccessCopy;mailto?:string}) {
 const details=useRef<HTMLDetailsElement>(null),text=useRef<HTMLTextAreaElement>(null),version=useRef({generation:0});
 const [status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{const lifetime=version.current;lifetime.generation++;return()=>{lifetime.generation++;};},[message]);
 async function copy(){if(busy)return;const current=version.current.generation;setBusy(true);setStatus('');try{if(!navigator.clipboard?.writeText)throw Error('unavailable');await navigator.clipboard.writeText(message);if(current===version.current.generation)setStatus(mailto?t.supportCopied:t.assistCopied);}catch{if(current===version.current.generation){if(details.current)details.current.open=true;text.current?.focus();text.current?.select();setStatus(mailto?t.supportCopyFallback:t.assistManualCopy);}}finally{if(current===version.current.generation)setBusy(false);}}
 return <div className="ma-draft">{mailto?<><a className="q-btn" href={mailto}><EnvelopeSimpleIcon size={20} aria-hidden="true"/>{t.ownerOpenEmail}</a><p className="ma-note">{t.supportSendHint}</p></>:<p className="ma-note">{t.assistSendHint}</p>}
  <details className="ma-details" ref={details}><summary>{mailto?t.ownerViewDraft:t.assistViewMessage}<Caret/></summary><div className="q-fl"><label htmlFor="access-message">{mailto?t.ownerDraftLabel:t.assistMessageLabel}</label><textarea ref={text} id="access-message" readOnly value={message} rows={7} autoComplete="off" spellCheck={false}/></div></details>
  <button className={`q-btn${mailto?' q-btn--sec':''}`} type="button" disabled={busy} onClick={()=>void copy()}><CopySimpleIcon size={20} aria-hidden="true"/>{t.ownerCopy}</button><p className="ma-note" role="status" aria-live="polite">{status}</p>
 </div>;
}
function inquiryUri(email:string,subject:string,message:string){return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;}

function OwnerInquiry({email,t}:{email:string;t:MobileAccessCopy}) {
 const hydrated=useSyncExternalStore(()=>()=>{},()=>true,()=>false);
 const [review,setReview]=useState(false),[draft,setDraft]=useState({name:'',company:'',reply:''}),[error,setError]=useState(''),[invalid,setInvalid]=useState<'name'|'company'|'reply'|null>(null);
 const heading=useRef<HTMLDivElement>(null);
 function prepare(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget;if(!form.reportValidity())return;const data=new FormData(form),next={name:String(data.get('contactName')??'').trim(),company:String(data.get('companyName')??'').trim(),reply:String(data.get('replyEmail')??'').trim()};
  const bad=(v:string,max:number)=>!v||v.length>max||/[\u0000-\u001f\u007f]/.test(v);
  const field=bad(next.name,100)?'name':bad(next.company,160)?'company':next.reply.length>254||/[\u0000-\u001f\u007f]/.test(next.reply)?'reply':null;
  if(field){setError(t.ownerCheckFields);setInvalid(field);form.querySelector<HTMLInputElement>(`#owner-${field}`)?.focus();return;}setDraft(next);setError('');setInvalid(null);setReview(true);requestAnimationFrame(()=>heading.current?.querySelector<HTMLElement>('h1')?.focus());}
 const message=`${t.ownerMailGreeting}\n\n${t.ownerMailIssue}\n\n${t.ownerName}: ${draft.name}\n${t.ownerCompany}: ${draft.company}\n${t.ownerReply}: ${draft.reply}\n\n${t.ownerMailNext}`;
 return <div ref={heading}><Header title={review?t.ownerReviewTitle:t.ownerContactTitle} sub={review?t.ownerReviewSub:t.ownerContactSub}/>
  {review?<><dl className="ma-summary">{[[t.ownerTo,email],[t.ownerName,draft.name],[t.ownerCompany,draft.company],[t.ownerReply,draft.reply]].map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl><Draft key={message} t={t} message={message} mailto={inquiryUri(email,t.ownerMailSubject,message)}/><p className="ma-note">{t.ownerBoundary}</p><button className="ma-text" type="button" onClick={()=>setReview(false)}>{t.ownerEdit}</button><button className="ma-text" type="button" onClick={()=>{setDraft({name:'',company:'',reply:''});setReview(false);}}>{t.ownerDiscard}</button></>:<>
   <form className="q-auth__form" method="post" onSubmit={prepare}><fieldset className="q-auth__fields" disabled={!hydrated}><div className="q-fl"><label htmlFor="owner-name">{t.ownerName}</label><input className="q-in" id="owner-name" name="contactName" aria-invalid={invalid==='name'||undefined} defaultValue={draft.name} autoComplete="name" maxLength={100} required/></div><div className="q-fl"><label htmlFor="owner-company">{t.ownerCompany}</label><input className="q-in" id="owner-company" name="companyName" aria-invalid={invalid==='company'||undefined} defaultValue={draft.company} autoComplete="organization" maxLength={160} required/></div><div className="q-fl"><label htmlFor="owner-reply">{t.ownerReply}</label><input className="q-in" id="owner-reply" name="replyEmail" aria-invalid={invalid==='reply'||undefined} type="email" defaultValue={draft.reply} autoComplete="email" maxLength={254} required aria-describedby="owner-reply-hint"/><p className="q-help" id="owner-reply-hint">{t.ownerReplyHint}</p></div></fieldset><button className="q-btn" type="submit" disabled={!hydrated}>{t.ownerReview}</button><p className="ma-note">{t.ownerPrivacyNotice} <Link className="ma-text ma-inline-link" href="/privacy">{t.privacyPolicy}</Link></p></form>{error?<p role="alert" className="q-auth__alert">{error}</p>:null}<Disclosure title={t.ownerPrivacyTitle}><p>{t.ownerPrivacyBody}</p></Disclosure><Disclosure title={t.ownerNextTitle}><p>{t.ownerNextBody}</p></Disclosure>
  </>}
 </div>;
}

export function AccessHelpView({topic,lang,from,supportEmail,ownerEmail}:Props) {
 const t=MOBILE_ACCESS_COPY[lang],href=(key='')=>`/access-help${key?'/'+key:''}?from=${encodeURIComponent(from)}`;
 const action=(to:string,label:string,primary=false)=><Link className={primary?'q-btn':'ma-text'} href={to}>{label}</Link>;
 const more=supportEmail?<div className="ma-more"><h2>{t.helpMore}</h2>{action(href('support'),t.contactSupport)}</div>:null;
 const choices:{href:string;title:string;sub:string;icon:typeof QuestionIcon}[]=[
  {href:href('id'),title:t.helpId,sub:t.helpIdSub,icon:IdentificationCardIcon},
  {href:'/forgot-access',title:t.helpPassword,sub:t.helpPasswordSub,icon:LockKeyIcon},
  {href:href('invitation'),title:t.helpInvite,sub:t.helpInviteSub,icon:EnvelopeSimpleIcon},
  {href:href('email'),title:t.helpEmail,sub:t.helpEmailSub,icon:QuestionIcon},
  {href:href('left'),title:t.helpLeft,sub:t.helpLeftSub,icon:UserMinusIcon},
 ];
 if(topic==='')return <><Header title={t.helpTitle} sub={t.helpSub}/><nav className="ma-choices" aria-label={t.helpTitle}>{choices.map(({href:to,title,sub,icon:Icon})=><Link className="ma-choice" key={to} href={to}><ChoiceIcon icon={Icon}/><span><b>{title}</b><small>{sub}</small></span><CaretRightIcon size={18} weight="bold" aria-hidden="true"/></Link>)}</nav>{more}</>;
 if(topic==='id')return <><Header title={t.helpIdTitle}/><div className="ma-copy"><p>{t.idHelpBody}</p><p>{t.helpIdNext}</p></div><div className="ma-actions">{action('/login',t.signIn,true)}{action('/activate',t.activateAccount)}</div></>;
 if(topic==='email')return <><Header title={t.helpEmailTitle} sub={t.helpEmailIntro}/><div className="ma-copy"><h2>{t.helpEmployeeTitle}</h2><p>{t.helpEmployeeBody}</p><h2>{t.helpPrivilegedTitle}</h2><p>{t.helpPrivilegedBody}</p>{action(href('owner'),t.ownerEntry)}</div><div className="ma-actions">{action('/reset-access',t.haveCode,true)}</div>{more}</>;
 if(topic==='owner')return <><Header title={t.ownerTitle} sub={t.ownerSub}/><nav className="ma-choices" aria-label={t.ownerTitle}><Link className="ma-choice" href="/forgot-access"><ChoiceIcon icon={EnvelopeSimpleIcon}/><span><b>{t.ownerEmailChoice}</b><small>{t.ownerEmailSub}</small></span><CaretRightIcon size={18} weight="bold" aria-hidden="true"/></Link><Link className="ma-choice" href={href('owner-other')}><ChoiceIcon icon={UsersThreeIcon}/><span><b>{t.ownerOtherChoice}</b><small>{t.ownerOtherSub}</small></span><CaretRightIcon size={18} weight="bold" aria-hidden="true"/></Link><Link className="ma-choice" href={href('owner-contact')}><ChoiceIcon icon={LifebuoyIcon}/><span><b>{t.ownerSoleChoice}</b><small>{t.ownerSoleSub}</small></span><CaretRightIcon size={18} weight="bold" aria-hidden="true"/></Link></nav></>;
 if(topic==='owner-other')return <><Header title={t.ownerOtherTitle}/><div className="ma-copy"><p>{t.ownerOtherBody}</p><p>{t.ownerOtherNote}</p></div><div className="ma-actions">{action('/reset-access',t.ownerUseCode,true)}</div>{more}</>;
 if(topic==='owner-contact')return <OwnerInquiry email={ownerEmail} t={t}/>;
 if(topic==='support'&&supportEmail)return <><Header title={t.supportTitle} sub={t.supportSub}/><dl className="ma-summary"><div><dt>{t.ownerTo}</dt><dd>{supportEmail}</dd></div></dl><Disclosure title={t.supportInclude}><p>{t.supportIncludeBody}</p></Disclosure><Disclosure title={t.supportSafety}><p>{t.supportSafetyBody}</p></Disclosure><Draft key={lang} message={t.supportMailBody} t={t} mailto={inquiryUri(supportEmail,t.supportMailSubject,t.supportMailBody)}/><p className="ma-note">{t.supportBoundary}</p>{action(href('owner'),t.supportOther)}</>;
 if(topic==='invitation')return <><Header title={t.assistTitle} sub={t.assistSub}/><nav className="ma-choices" aria-label={t.assistTitle}>{([
  ['missing',t.assistMissing,t.assistMissingSub,EnvelopeSimpleIcon],['link',t.assistLink,t.assistLinkSub,LinkBreakIcon],['registered-email',t.assistEmail,t.assistEmailSub,AtIcon],['activated',t.assistActive,t.assistActiveSub,CheckCircleIcon],
 ] as const).map(([key,title,sub,Icon])=><Link className="ma-choice" key={key} href={href(key)}><ChoiceIcon icon={Icon}/><span><b>{title}</b><small>{sub}</small></span><CaretRightIcon size={18} weight="bold" aria-hidden="true"/></Link>)}</nav><Disclosure title={t.assistOwner}><p>{t.assistOwnerBody}</p></Disclosure><Disclosure title={t.assistUnexpected}><p>{t.assistUnexpectedBody}</p></Disclosure></>;
 const issues:Record<string,{title:string;body:string;next:string;message?:string}>={missing:{title:t.assistMissingTitle,body:t.assistMissingBody,next:t.assistMissingNext,message:t.assistMissingMessage},link:{title:t.assistLinkTitle,body:t.assistLinkBody,next:t.assistLinkNext,message:t.assistLinkMessage},'registered-email':{title:t.assistEmailTitle,body:t.assistEmailBody,next:t.assistEmailNext,message:t.assistEmailMessage},activated:{title:t.assistActiveTitle,body:t.assistActiveBody,next:t.assistActiveNext}};
 if(topic==='left')return <><Header title={t.leftTitle}/><div className="ma-copy"><p>{t.leftBody}</p><p>{t.leftNext}</p></div><div className="ma-actions">{action('/account-deletion',t.leftAction,true)}</div>{more}</>;
 const issue=issues[topic];if(!issue)return null;
 return <><Header title={issue.title}/><div className="ma-copy"><p>{issue.body}</p><p>{issue.next}</p></div>{issue.message?<Draft key={lang} message={issue.message} t={t}/>:<div className="ma-actions">{action('/login',t.signIn,true)}{action('/forgot-access',t.forgotAccess)}</div>}<Disclosure title={t.assistOwner}><p>{t.assistOwnerBody}</p></Disclosure></>;
}
