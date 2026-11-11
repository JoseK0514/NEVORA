import 'server-only';
import {registeredEmail} from './contracts';

export type SignupAdmission={mode:'closed'|'open'}|{mode:'approved_recipient';email:string};
/** Admission is independent of backend availability. The production integration
 * inbox can exercise the real API while the public signup page remains closed. */
export function readSignupAdmission(env:Readonly<Record<string,string|undefined>>=process.env):SignupAdmission{
 const production=env.NEVORA_ONBOARDING_ENVIRONMENT==='production';
 const mode=env.NEVORA_ONBOARDING_ADMISSION_MODE??(production?'closed':'open');
 const email=env.NEVORA_STAGING_EMAIL_RECIPIENT?.trim().toLowerCase();
 if(mode==='approved_recipient'&&registeredEmail(email))return {mode,email};
 if(mode==='open'&&(!production||!email))return {mode};
 return {mode:'closed'};
}
export function signupAdmissionAllows(admission:SignupAdmission,email:unknown):boolean{
 return admission.mode==='open'||admission.mode==='approved_recipient'&&typeof email==='string'&&email.trim().toLowerCase()===admission.email;
}
