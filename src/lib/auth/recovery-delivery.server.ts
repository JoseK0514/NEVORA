import 'server-only';
import type {RecoveryDelivery} from './recovery.server';
import {validatedMailTransport} from './mail-transport.server';
// Erased in production; avoid top-level await in CLI imports.
const developmentCapture:typeof import('../dev/capture-gate.cjs')|null=process.env.NODE_ENV!=='production'?require('../dev/capture-gate.cjs'):null;
import {localRequest} from '../dev/local-only';
/** Sent after any password reset, including one a Manager or Owner started for the person. */
export const PASSWORD_CHANGED_NOTICE=(origin:string)=>`The password for your NEVORA account was just changed, and every device was signed out.\n\nIf you did this, there's nothing else to do. If you didn't, contact your Owner right away and sign in at ${origin}/login to check your account.`;
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
  await mail.sendRegistered(email,'NEVORA access recovery',`A password reset was requested for your NEVORA account. This single-use link expires in 15 minutes.\n\n${mail.origin}/reset-access#proof=${proof}\n\nIf you did not request this, keep your existing password and contact your manager. If you cannot use your registered recovery channel, ask a manager for assisted recovery.`);
 },async notifyReset(email){
  await mail.sendRegistered(email,'Your NEVORA password was changed',PASSWORD_CHANGED_NOTICE(mail.origin));
 }};
}
