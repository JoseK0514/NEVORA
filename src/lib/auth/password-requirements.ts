/** Browser-safe enrollment rules. Existing sign-in verifies the original hash unchanged. */
export const MIN_PASSWORD_CHARACTERS = 15;
export const MAX_PASSWORD_CHARACTERS = 1024;
export type PasswordRejection = 'too_short'|'too_long'|'common'|'breached'|'employee_id'|'company_name'|'temporary_password';
export function passwordLength(value:string):number{return Array.from(value).length;}
export function isPasswordRejection(value:unknown):value is PasswordRejection{
 return typeof value==='string'&&['too_short','too_long','common','breached','employee_id','company_name','temporary_password'].includes(value);
}
export function isPasswordTooLong(value:string):boolean{return value.length>MAX_PASSWORD_CHARACTERS*2||passwordLength(value)>MAX_PASSWORD_CHARACTERS;}
const messages:Record<'en'|'es',Record<PasswordRejection,string>>={
 en:{too_short:'Use at least 15 characters.',too_long:'Use no more than 1,024 characters.',common:'This password is too common or predictable. Choose a different phrase.',breached:'This password appears in a known breach. Choose a different phrase.',employee_id:'Avoid your Employee ID or a predictable variation of it.',company_name:'Avoid the company name or a predictable variation of it.',temporary_password:'Choose a password different from your temporary password.'},
 es:{too_short:'Usa al menos 15 caracteres.',too_long:'Usa un máximo de 1,024 caracteres.',common:'Esta contraseña es muy común o predecible. Elige otra frase.',breached:'Esta contraseña aparece en una filtración conocida. Elige otra frase.',employee_id:'Evita tu ID de empleado o una variación predecible.',company_name:'Evita el nombre de la empresa o una variación predecible.',temporary_password:'Elige una contraseña diferente a tu contraseña temporal.'},
};
export function passwordRejectionMessage(lang:'en'|'es',reason:PasswordRejection):string{return messages[lang][reason];}

