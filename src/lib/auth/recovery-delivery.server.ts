import 'server-only';
import nodemailer from 'nodemailer';
import type {RecoveryDelivery} from './recovery.server';
// Erased in production; avoid top-level await in CLI imports.
const developmentCapture:typeof import('../dev/capture-gate.cjs')|null=process.env.NODE_ENV!=='production'?require('../dev/capture-gate.cjs'):null;
import {localRequest} from '../dev/local-only';
/** Explicit existing SMTP account configuration; no vendor preset or activation. */
export function recoveryDelivery(env:Record<string,string|undefined>=process.env,requestHeaders?:Pick<Headers,'get'>):RecoveryDelivery|null{
 if(process.env.NODE_ENV!=='production'&&developmentCapture){
  const directory=developmentCapture.captureDirectory(env);
  if(directory===null)return null;
  if(directory!==undefined){
   if(!requestHeaders||!localRequest(requestHeaders))return null;
   const capturedEnv={...env};
   return {async send(email,proof){
    const captured=(await import('../dev/capture.server')).devRecoveryDelivery(capturedEnv,requestHeaders);
    if(!captured)throw Error('Local recovery capture is unavailable');
    await captured.send(email,proof);
   }};
  }
 }
 try{
  const host=env.NEVORA_RECOVERY_SMTP_HOST?.trim(),port=Number(env.NEVORA_RECOVERY_SMTP_PORT??465),from=env.NEVORA_RECOVERY_FROM?.trim(),origin=new URL(env.FUEL_PORTAL_ORIGIN??'');
  const local=env.NODE_ENV!=='production'&&['127.0.0.1','localhost','[::1]'].includes(host??'');
  if(!host||!Number.isInteger(port)||port<1||port>65535||!from||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(from)||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash||(!local&&origin.protocol!=='https:')||(local&&origin.protocol!=='http:')||(!local&&(!env.NEVORA_RECOVERY_SMTP_USER||!env.NEVORA_RECOVERY_SMTP_PASSWORD)))return null;
  const transport=nodemailer.createTransport({host,port,secure:port===465,requireTLS:!local&&port!==465,
   ...(local?{}:{auth:{user:env.NEVORA_RECOVERY_SMTP_USER!,pass:env.NEVORA_RECOVERY_SMTP_PASSWORD!}}),
   connectionTimeout:5000,greetingTimeout:5000,socketTimeout:5000,logger:false,debug:false,disableFileAccess:true,disableUrlAccess:true,maxRecipients:1});
  return {async send(email,proof){
   if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))throw Error('Invalid registered channel');
   await transport.sendMail({from,to:email,subject:'NEVORA access recovery',text:`A password reset was requested for your NEVORA account. This single-use link expires in 15 minutes.\n\n${origin.origin}/reset-access#proof=${proof}\n\nIf you did not request this, keep your existing password and contact your manager. If you cannot use your registered recovery channel, ask a manager for assisted recovery.`,disableFileAccess:true,disableUrlAccess:true});
  }};
 }catch{return null;}
}
