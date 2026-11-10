'use client';
import {useEffect,useRef,useState} from 'react';
import {EyeIcon} from '@phosphor-icons/react/dist/ssr/Eye';
import {EyeSlashIcon} from '@phosphor-icons/react/dist/ssr/EyeSlash';
import {AUTH_COPY,type AuthLang} from '@/lib/auth-copy';
import {FieldInvalid} from '@/components/auth-premium/auth-validation';
import {PasswordRules} from '@/components/auth-premium/password-rules';
import {MOBILE_ACCESS_COPY} from './copy';

export function AccessPasswordPair({prefix,lang,mismatch=false,newLabel}:{prefix:'activation'|'reset';lang:AuthLang;mismatch?:boolean;newLabel?:string}) {
 const t=MOBILE_ACCESS_COPY[lang],v=AUTH_COPY[lang].invalid,group=useRef<HTMLDivElement>(null);
 const [visible,setVisible]=useState(false),[password,setPassword]=useState(''),[confirm,setConfirm]=useState('');
 const ids=[`${prefix}-password`,prefix==='activation'?'activation-confirm-password':'reset-confirm-password'];
 useEffect(()=>{const form=group.current?.closest('form');const clear=()=>{setPassword('');setConfirm('');setVisible(false);};form?.addEventListener('reset',clear);return()=>form?.removeEventListener('reset',clear);},[]);
 const match=Boolean(confirm&&confirm===password),length=password.length>=8;
 // Review B4 (Nov 10, 2026): the toggle keeps one name and says its state with aria-pressed (NV-193); the checks use the
 // Direction B marks (NV-312); a missing or short password is named under its field (NV-190).
 return <div ref={group} className="ma-passwords">
  <div className="q-fl"><label htmlFor={ids[0]}>{newLabel??t.newPassword}</label><input id={ids[0]} className="q-in" name="password" type={visible?'text':'password'} minLength={8} maxLength={1024} required autoComplete="new-password" placeholder={t.passwordHint} aria-describedby={`${prefix}-rules ${ids[0]}-invalid`} data-msg-required={v.newPassword} data-msg-invalid={v.newPassword} onInput={e=>setPassword(e.currentTarget.value)}/><FieldInvalid id={ids[0]}/></div>
  <div className="q-fl"><label htmlFor={ids[1]}>{t.confirmPassword}</label><input id={ids[1]} className="q-in" name="confirmPassword" type={visible?'text':'password'} minLength={8} maxLength={1024} required autoComplete="new-password" placeholder={t.confirmPlaceholder} aria-invalid={mismatch||undefined} aria-describedby={`${prefix}-rules${mismatch?` ${prefix}-error`:''} ${ids[1]}-invalid`} data-msg-required={v.confirm} data-msg-invalid={v.confirm} onInput={e=>setConfirm(e.currentTarget.value)}/><FieldInvalid id={ids[1]}/></div>
  <button className="ma-text ma-password-toggle" type="button" aria-controls={ids.join(' ')} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?<EyeSlashIcon size={20} weight="bold" aria-hidden="true"/>:<EyeIcon size={20} weight="bold" aria-hidden="true"/>}{t.showPasswords}</button>
  <PasswordRules className="ma-rules" id={`${prefix}-rules`} rules={[{state:length?'ok':'idle',text:t.ruleLength},{state:match?'ok':'idle',text:match?t.ruleMatched:t.ruleMatch}]}/>
 </div>;
}
