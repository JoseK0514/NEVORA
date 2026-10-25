import {mkdir,writeFile} from 'node:fs/promises';
import {isAbsolute,join} from 'node:path';
import {randomUUID} from 'node:crypto';
import nodemailer from 'nodemailer';
import type {RecoveryDelivery} from '../auth/recovery.server';
import type {PushSender} from '../notifications/provider';
import type {PushRuntimeConfig} from '../notifications/types';
import {localDevEnabled,loopbackOrigin,localRequest,type LocalCaptureContext} from './local-only';
import {captureDirectory} from './capture-gate.cjs';
export {captureNotificationRuntime} from './capture-gate.cjs';
async function record(directory:string,kind:'email'|'push',extension:string,value:Buffer|string) {
  const folder=join(directory,kind);
  await mkdir(folder,{recursive:true,mode:0o700});
  await writeFile(join(folder,randomUUID()+extension),value,{flag:'wx',mode:0o600});
}
/** undefined means capture was not requested; null is an invalid requested mode.
 * Requested capture fails closed and never falls through to SMTP. */
export function devRecoveryDelivery(env:Record<string,string|undefined>,headers?:Pick<Headers,'get'>):RecoveryDelivery|null|undefined {
  const directory=captureDirectory(env);
  if(directory===undefined||directory===null)return directory;
  if(!headers||!localRequest(headers))return null;
  const origin=new URL(env.FUEL_PORTAL_ORIGIN!).origin;
  const transport=nodemailer.createTransport({streamTransport:true,buffer:true,newline:'unix',disableFileAccess:true,disableUrlAccess:true});
  return {async send(email,proof){
    if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)||/[\r\n]/.test(proof))throw Error('Invalid local capture input');
    const message=await transport.sendMail({from:'NEVORA preview <preview@example.invalid>',to:email,subject:'NEVORA access recovery',
      text:`A password reset was requested for your NEVORA account. This single-use link expires in 15 minutes.\n\n${origin}/reset-access#proof=${proof}\n\nIf you did not request this, keep your existing password and contact your manager. If you cannot use your registered recovery channel, ask a manager for assisted recovery.`,disableFileAccess:true,disableUrlAccess:true});
    if(!Buffer.isBuffer(message.message))throw Error('Local email capture did not produce a buffered message');
    await record(directory,'email','.eml',message.message);
  },async notifyReset(email){
    if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))throw Error('Invalid local capture input');
    const {PASSWORD_CHANGED_NOTICE}=await import('../auth/recovery-delivery.server');
    const message=await transport.sendMail({from:'NEVORA preview <preview@example.invalid>',to:email,subject:'Your NEVORA password was changed',text:PASSWORD_CHANGED_NOTICE(origin)});
    if(!Buffer.isBuffer(message.message))throw Error('Local email capture did not produce a buffered message');
    await record(directory,'email','.eml',message.message);
  }};
}
/** Replace provider delivery only in explicitly bound local capture mode.
 * undefined leaves normal provider selection to the caller; a requested but
 * invalid capture returns a failure instead of falling through to delivery.
 * accepted means a local payload file was written, not that a push provider ran. */
export async function capturePush(input:Parameters<PushSender['send']>[0],config:Pick<PushRuntimeConfig,'localCapture'>,context?:LocalCaptureContext):Promise<Awaited<ReturnType<PushSender['send']>>|undefined> {
  if(process.env.NODE_ENV==='production')return undefined;
  const binding=config.localCapture;
  if(!binding)return localDevEnabled(process.env,'NEVORA_DEV_CAPTURE_DELIVERY')?{kind:'failed',errorClass:'local_capture_configuration'}:undefined;
  const {directory,origin}=binding;
  if(!isAbsolute(directory)||!loopbackOrigin(origin)||!context||(context.kind==='request'&&!localRequest(context.headers)))return {kind:'failed',errorClass:'local_capture_configuration'};
  if(input.signal.aborted)return {kind:'retry',errorClass:'transport_timeout'};
  try {
    // Capture the display payload and delivery options, never subscription keys,
    // endpoint credentials, VAPID material or the sender's process environment.
    await record(directory,'push','.json',JSON.stringify({payload:input.payload,ttlSeconds:input.ttlSeconds,urgency:input.urgency,topic:input.topic},null,2)+'\n');
    return {kind:'accepted'};
  }catch{return {kind:'retry',errorClass:'local_capture_write'};}
}
