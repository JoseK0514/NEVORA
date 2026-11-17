'use client';
import type {AuthLang} from '@/lib/auth-copy';
import {PasswordPair} from '@/components/access-recovery/password-pair';
import {MOBILE_ACCESS_COPY} from './copy';

/** Phase 5 (Nov 17, 2026): the phone pages use the same password pair as every other width: empty placeholders, the
 * length rule under the first field, the match under the second, the eye on both fields, a mismatch in the one field
 * error style. The field ids are unchanged, so a breakpoint change still restores what was typed. */
export function AccessPasswordPair({prefix,lang,mismatch=false,newLabel}:{prefix:'activation'|'reset';lang:AuthLang;mismatch?:boolean;newLabel?:string}) {
 const t=MOBILE_ACCESS_COPY[lang];
 return <PasswordPair prefix={prefix} lang={lang} mismatch={mismatch} newLabel={newLabel??t.newPassword} confirmLabel={t.confirmPassword} className="ma-passwords"/>;
}
