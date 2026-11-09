import 'server-only';
import type {InvitationDelivery} from '@/lib/company-access/contracts';
import {validatedMailTransport,validRegisteredEmail} from '../mail-transport.server';
import {invitationEmail} from '../account-email-copy';
class InvitationDeliveryError extends Error {
 constructor(readonly deliveryState:'FAILED'|'UNKNOWN') {super('Invitation email outcome unavailable.');}
}
/** Disabled by default. Runtime verification uses only invocation-owned loopback SMTP. */
export function invitationDelivery(env:Record<string,string|undefined>=process.env):InvitationDelivery|null {
 if(env.NEVORA_INVITATION_DELIVERY_ENABLED!=='true')return null;
 const mail=validatedMailTransport(env);
 if(!mail)return null;
 return {async send({registeredEmail,proof,expiresAt}) {
  if(!validRegisteredEmail(registeredEmail)||!/^[A-Za-z0-9_-]{43}$/.test(proof)||Buffer.from(proof,'base64url').toString('base64url')!==proof||!Number.isFinite(Date.parse(expiresAt)))throw new InvitationDeliveryError('FAILED');
  try {
   const email=invitationEmail(`${mail.origin}/activate#proof=${proof}`);
   const result=await mail.sendRegistered(registeredEmail,email.subject,email.text);
   const accepted=result.accepted;
   if(accepted?.length!==1||accepted[0]?.toLowerCase()!==registeredEmail.toLowerCase())throw new InvitationDeliveryError('UNKNOWN');
   return {providerAccepted:true};
  } catch(error) {
   if(error instanceof InvitationDeliveryError)throw error;
   const e=error as {command?:unknown;responseCode?:unknown};
   const definite=['EHLO','HELO','AUTH','MAIL FROM','RCPT TO'].includes(String(e?.command))
    ||(typeof e?.responseCode==='number'&&e.responseCode>=400);
   throw new InvitationDeliveryError(definite?'FAILED':'UNKNOWN');
  }
 }};
}
