import 'server-only';
import nodemailer from 'nodemailer';
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
  const transport=nodemailer.createTransport({host,port,secure:port===465,requireTLS:!local&&port!==465,
   ...(local?{}:{auth:{user:env.NEVORA_RECOVERY_SMTP_USER!,pass:env.NEVORA_RECOVERY_SMTP_PASSWORD!}}),
   connectionTimeout:5000,greetingTimeout:5000,socketTimeout:5000,logger:false,debug:false,disableFileAccess:true,disableUrlAccess:true,maxRecipients:1});
  return {origin:origin.origin,async sendRegistered(email:string,subject:string,text:string) {
   if(!validRegisteredEmail(email))throw Error('Invalid registered channel');
   return transport.sendMail({from,to:email,subject,text,disableFileAccess:true,disableUrlAccess:true});
  }};
 } catch {return null;}
}
