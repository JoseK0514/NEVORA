import 'server-only';
import type {RecoveryDelivery} from './recovery.server';
import {validatedMailTransport} from './mail-transport.server';
/** Recovery remains credentialed-only; invitations use their own explicit delivery flag. */
export function recoveryDelivery(env:Record<string,string|undefined>=process.env):RecoveryDelivery|null {
 const mail=validatedMailTransport(env);
 if(!mail)return null;
 return {async send(email,proof) {
  await mail.sendRegistered(email,'NEVORA access recovery',`A password reset was requested for your NEVORA account. This single-use link expires in 15 minutes.\n\n${mail.origin}/reset-access#proof=${proof}\n\nIf you did not request this, keep your existing password and contact your manager. If you cannot use your registered recovery channel, ask a manager for assisted recovery.`);
 }};
}
