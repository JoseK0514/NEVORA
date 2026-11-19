import {createHash} from 'node:crypto';
import blockedDigests from './blocked-passwords.json';
import {MIN_PASSWORD_CHARACTERS,isPasswordTooLong,passwordLength,type PasswordRejection} from './password-requirements';

export type PasswordContext={employeeId:string;companyName:string};
const breached=new Set(blockedDigests);
const canonical=(value:string)=>value.normalize('NFKC').toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}]/gu,'');
function contextual(candidate:string,value:string):boolean{
 const base=canonical(value);if(!base)return false;
 if(candidate===base)return true;
 if(candidate.startsWith(base)&&/^\d{1,6}$/.test(candidate.slice(base.length)))return true;
 if(candidate.endsWith(base)&&/^\d{1,6}$/.test(candidate.slice(0,-base.length)))return true;
 return candidate===base+'password'||candidate===base+'password1';
}
/** Whole-value local screening; no candidate, hash or identity leaves this process.
 * Context comes from the admitted proof/workspace, never an unauthenticated caller.
 * This screens new enrollment only: normalization here does not alter hash/verify semantics. */
export function passwordRejection(password:string,context:PasswordContext):PasswordRejection|null{
 if(isPasswordTooLong(password))return 'too_long';
 if(passwordLength(password)<MIN_PASSWORD_CHARACTERS)return 'too_short';
 const normalized=password.normalize('NFC'),candidate=canonical(password);
 if(contextual(candidate,context.employeeId))return 'employee_id';
 if(contextual(candidate,context.companyName)||contextual(candidate,'NEVORA'))return 'company_name';
 if(new Set(Array.from(normalized)).size===1||['0123456789','1234567890','9876543210','qwertyuiop'].some(seed=>seed.repeat(110).includes(normalized.toLowerCase())))return 'common';
 return breached.has(createHash('sha256').update(normalized).digest('hex'))?'breached':null;
}
