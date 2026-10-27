import 'server-only';
import type {SqlExecutor} from '../notifications/types';
import type {ClockerCookieStore,ClockerSecurity} from './setup.server';
import {clockerCookieNames} from './setup.server';
import {authenticateClockerDevice} from './devices.server';
import {readClockerIdentity} from './pin-identity.server';
import {pinCookieName} from './pin-transport.server';
import {readPinKey} from './pin-crypto.server';
export type CurrentClockerDependencies={executor:SqlExecutor;cookies:ClockerCookieStore;security:ClockerSecurity;key?:Buffer};
/** Browser JSON never chooses the company, employee or registered tablet. */
export async function resolveCurrentClockerIdentity(locationKey:string,deps:CurrentClockerDependencies){
 const device=await authenticateClockerDevice({locationKey,credential:deps.cookies.get(clockerCookieNames(deps.security.production).device)?.value??''},deps.executor);
 if(!device)return null;const key=deps.key??readPinKey();
 const identity=await readClockerIdentity(device.proof,deps.cookies.get(pinCookieName(deps.security.production))?.value??'',key,deps.executor);
 return identity?{...identity,key}:null;
}
