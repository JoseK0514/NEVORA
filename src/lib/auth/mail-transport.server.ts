import 'server-only';
import nodemailer from 'nodemailer';
export class StagingRecipientDenied extends Error {readonly code='staging_recipient_denied';constructor(){super('Staging email recipient is not approved');}}
export const validRegisteredEmail=(email:string)=>email.length<=254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email);

/** Build transport settings for the explicitly configured SMTP account; null
 * means missing/invalid configuration, not a failed connectivity probe. Remote
 * delivery requires HTTPS origin and SMTP credentials/TLS; development loopback
 * is the bounded exception. Construction does not send or verify an email. */
export function validatedMailTransport(env:Record<string,string|undefined>=process.env) {
 try {
  const host=env.NEVORA_RECOVERY_SMTP_HOST?.trim(),port=Number(env.NEVORA_RECOVERY_SMTP_PORT??465),from=env.NEVORA_RECOVERY_FROM?.trim(),origin=new URL(env.FUEL_PORTAL_ORIGIN??'');
  const local=env.NODE_ENV!=='production'&&['127.0.0.1','localhost','[::1]'].includes(host??'');
  if(!host||!Number.isInteger(port)||port<1||port>65535||!from||!validRegisteredEmail(from)||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash||(!local&&origin.protocol!=='https:')||(local&&!['http:','https:'].includes(origin.protocol))||(!local&&(!env.NEVORA_RECOVERY_SMTP_USER||!env.NEVORA_RECOVERY_SMTP_PASSWORD)))return null;
  const configuredRecipient=env.NEVORA_STAGING_EMAIL_RECIPIENT,approvedRecipient=configuredRecipient?.trim().toLowerCase();
  if((env.NEVORA_ONBOARDING_ENVIRONMENT==='test'&&!local)||!!configuredRecipient?.trim()){
   if(!approvedRecipient||!validRegisteredEmail(approvedRecipient)||/[;,()\[\]\"\\]/.test(approvedRecipient))return null;
  }
  const transport=nodemailer.createTransport({host,port,secure:port===465,requireTLS:!local&&port!==465,
   ...(local?{}:{auth:{user:env.NEVORA_RECOVERY_SMTP_USER!,pass:env.NEVORA_RECOVERY_SMTP_PASSWORD!}}),
   connectionTimeout:5000,greetingTimeout:5000,socketTimeout:5000,logger:false,debug:false,disableFileAccess:true,disableUrlAccess:true,maxRecipients:1});
  return {origin:origin.origin,async sendRegistered(email:string,subject:string,text:string) {
   if(!validRegisteredEmail(email))throw Error('Invalid registered channel');
   if(approvedRecipient&&email.toLowerCase()!==approvedRecipient)throw new StagingRecipientDenied();
   // Socket inactivity limits do not bound a progressing SMTP conversation.
   // A deadline is an uncertain outcome, not proof of cancellation or rejection.
   let timer:ReturnType<typeof setTimeout>|undefined;
   try{
    const deadline=new Promise<never>((_,reject)=>{
     timer=setTimeout(()=>reject(Object.assign(new Error('Email delivery outcome is unknown'),{code:'smtp_deadline_exceeded'})),15000);
    });
    return await Promise.race([deadline,Promise.resolve().then(()=>transport.sendMail({from,to:email,subject,text,disableFileAccess:true,disableUrlAccess:true}))]);
   }finally{if(timer!==undefined)clearTimeout(timer);}
  }};
 } catch {return null;}
}
