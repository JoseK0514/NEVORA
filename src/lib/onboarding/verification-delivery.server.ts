import 'server-only';
import {validatedMailTransport} from '../auth/mail-transport.server';
import {registeredEmail} from './contracts';
import {validOnboardingToken} from './crypto.server';
import type {EnabledConfig} from './config.server';

export type VerificationMessage={email:string;proof:string;locale:'en'|'es';expiresAt:string};
export type VerificationDelivery={send(message:VerificationMessage):Promise<{providerAccepted:true}>};
export class VerificationDeliveryError extends Error{constructor(readonly deliveryState:'FAILED'|'UNKNOWN'){super('Verification email outcome unavailable.');}}
export function verificationDelivery(env:Record<string,string|undefined>,config:EnabledConfig):VerificationDelivery|null{
 if(env.NEVORA_ONBOARDING_EMAIL_ENABLED!=='true')return null;
 const transport=validatedMailTransport(env);if(!transport||transport.origin!==config.signupOrigin)return null;
 return {async send({email,proof,locale,expiresAt}){
  if(!registeredEmail(email)||!validOnboardingToken(proof)||!['en','es'].includes(locale)||!Number.isFinite(Date.parse(expiresAt))||Date.parse(expiresAt)<=Date.now())throw new VerificationDeliveryError('FAILED');
  const url=config.signupOrigin+'/onboarding/verify#proof='+proof;
  const subject=locale==='es'?'Verifica tu correo para NEVORA':'Verify your email for NEVORA';
  const text=locale==='es'?'Verifica tu correo para comenzar la configuración de tu negocio.\n\n'+url+'\n\nSi no solicitaste este enlace, ignora este mensaje.':'Verify your email to begin setting up your business.\n\n'+url+'\n\nIf you did not request this link, ignore this message.';
  try{const r=await transport.sendRegistered(email,subject,text);if(r.accepted?.length!==1||String(r.accepted[0]).toLowerCase()!==email.toLowerCase())throw new VerificationDeliveryError('UNKNOWN');return {providerAccepted:true};}
  catch(error){if(error instanceof VerificationDeliveryError)throw error;const e=error as {command?:unknown;responseCode?:unknown};const definite=['EHLO','HELO','AUTH','MAIL FROM','RCPT TO'].includes(String(e?.command))||(typeof e?.responseCode==='number'&&e.responseCode>=400);throw new VerificationDeliveryError(definite?'FAILED':'UNKNOWN');}
 }};
}
