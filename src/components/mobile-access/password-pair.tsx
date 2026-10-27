'use client';
import {useEffect,useRef,useState} from 'react';
import {EyeIcon} from '@phosphor-icons/react/dist/ssr/Eye';
import {EyeSlashIcon} from '@phosphor-icons/react/dist/ssr/EyeSlash';
import {CircleIcon} from '@phosphor-icons/react/dist/ssr/Circle';
import {CheckCircleIcon} from '@phosphor-icons/react/dist/ssr/CheckCircle';
import type {AuthLang} from '@/lib/auth-copy';
import {MOBILE_ACCESS_COPY} from './copy';

export function AccessPasswordPair({prefix,lang,mismatch=false,newLabel}:{prefix:'activation'|'reset';lang:AuthLang;mismatch?:boolean;newLabel?:string}) {
 const t=MOBILE_ACCESS_COPY[lang],group=useRef<HTMLDivElement>(null);
 const [visible,setVisible]=useState(false),[password,setPassword]=useState(''),[confirm,setConfirm]=useState('');
 const ids=[`${prefix}-password`,prefix==='activation'?'activation-confirm-password':'reset-confirm-password'];
 useEffect(()=>{const form=group.current?.closest('form');const clear=()=>{setPassword('');setConfirm('');setVisible(false);};form?.addEventListener('reset',clear);return()=>form?.removeEventListener('reset',clear);},[]);
 const match=Boolean(confirm&&confirm===password),length=password.length>=8;
 return <div ref={group} className="ma-passwords">
  <div className="q-fl"><label htmlFor={ids[0]}>{newLabel??t.newPassword}</label><input id={ids[0]} className="q-in" name="password" type={visible?'text':'password'} minLength={8} maxLength={1024} required autoComplete="new-password" placeholder={t.passwordHint} aria-describedby={`${prefix}-rules`} onInput={e=>setPassword(e.currentTarget.value)}/></div>
  <div className="q-fl"><label htmlFor={ids[1]}>{t.confirmPassword}</label><input id={ids[1]} className="q-in" name="confirmPassword" type={visible?'text':'password'} minLength={8} maxLength={1024} required autoComplete="new-password" placeholder={t.confirmPlaceholder} aria-invalid={mismatch||undefined} aria-describedby={`${prefix}-rules${mismatch?` ${prefix}-error`:''}`} onInput={e=>setConfirm(e.currentTarget.value)}/></div>
  <button className="ma-text ma-password-toggle" type="button" aria-controls={ids.join(' ')} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?<EyeSlashIcon size={18} aria-hidden="true"/>:<EyeIcon size={18} aria-hidden="true"/>}{visible?t.hidePasswords:t.showPasswords}</button>
  <ul className="ma-rules" id={`${prefix}-rules`}><li data-met={length}>{length?<CheckCircleIcon size={18} aria-hidden="true"/>:<CircleIcon size={18} aria-hidden="true"/>}{t.ruleLength}</li><li data-met={match}>{match?<CheckCircleIcon size={18} aria-hidden="true"/>:<CircleIcon size={18} aria-hidden="true"/>}{match?t.ruleMatched:t.ruleMatch}</li></ul>
 </div>;
}
