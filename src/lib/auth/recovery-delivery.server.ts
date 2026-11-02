import 'server-only';
import type {RecoveryDelivery} from './recovery.server';
import {validatedMailTransport} from './mail-transport.server';
import {passwordChangedEmail,recoveryEmail} from './account-email-copy';
// Erased in production; avoid top-level await in CLI imports.
const developmentCapture:typeof import('../dev/capture-gate.cjs')|null=process.env.NODE_ENV!=='production'?require('../dev/capture-gate.cjs'):null;
import {localRequest} from '../dev/local-only';
/** Select local capture when explicitly requested, otherwise the configured SMTP
 * transport. An invalid requested capture or nonlocal capture request returns
 * null instead of falling through to live delivery. Recovery bearers are placed
 * in the URL fragment; the reset page must submit them explicitly. */
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
   },async notifyReset(email){
    const captured=(await import('../dev/capture.server')).devRecoveryDelivery(capturedEnv,requestHeaders);
    if(!captured?.notifyReset)throw Error('Local recovery capture is unavailable');
    await captured.notifyReset(email);
   }};
  }
 }
 const mail=validatedMailTransport(env);
 if(!mail)return null;
 return {async send(email,proof) {
  const message=recoveryEmail(`${mail.origin}/reset-access#proof=${proof}`);
  await mail.sendRegistered(email,message.subject,message.text);
 },async notifyReset(email){
  const message=passwordChangedEmail(mail.origin);
  await mail.sendRegistered(email,message.subject,message.text);
 }};
}
