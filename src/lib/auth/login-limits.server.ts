import 'server-only';
import {createHash} from 'node:crypto';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import {neonNotificationExecutor} from '../data/sql-executor';

/** Sign-in attempt limits (pre-release fix P1). Each attempt is counted BEFORE the password is checked, in 15-minute
 * buckets of the existing password_recovery_limits table (its scopes are 64-hex hashes, so these never collide with
 * recovery's). Per Employee ID it stops online guessing of one account; per client address it stops spraying many
 * IDs, and a successful sign-in hands its address slot back (releaseLoginAddress). The per-ID limit is deliberately above what a person mistyping reaches, so it can't be used as a cheap lockout. */
export const LOGIN_LIMITS={perId:10,perAddress:60} as const;
const BUCKET='floor(EXTRACT(epoch FROM clock_timestamp())/900)';
const scope=(kind:'id'|'address',value:string)=>createHash('sha256').update(`NEVORA login limit ${kind} v1:${value}`).digest('hex');

/** Consume ID and optional address budgets atomically before password work.
 * Only hashed scopes are persisted. All applicable counters must be readable
 * and within their cap; executor failures are left to the caller's error path. */
export async function admitLoginAttempt(employeeId:string,address:string|null,executor:SqlExecutor=neonNotificationExecutor()):Promise<boolean>{
 const scopes:[string,number][]=[[scope('id',employeeId.trim().toUpperCase()),LOGIN_LIMITS.perId]];
 if(address)scopes.push([scope('address',address),LOGIN_LIMITS.perAddress]);
 const statements:SqlStatement[]=[{text:`DELETE FROM password_recovery_limits WHERE bucket<${BUCKET}-96`,values:[]},
  ...scopes.map(([s])=>({text:`INSERT INTO password_recovery_limits(scope,bucket,attempts) VALUES($1,${BUCKET},1)
   ON CONFLICT(scope,bucket) DO UPDATE SET attempts=password_recovery_limits.attempts+1 RETURNING attempts`,values:[s]}))];
 const results=await executor.transaction(statements);
 return scopes.every(([,max],index)=>{const attempts=Number((results[index+1]?.[0] as {attempts?:unknown}|undefined)?.attempts);return Number.isFinite(attempts)&&attempts<=max;});
}

/** Gives a successful sign-in's slot back to its client address, so the address budget counts only failures: a whole
 * shift signing in over one store network can't use it up, while guessing from one address still can. The attempt
 * stays counted until the password is proven, so parallel guesses can't slip past the limit, and the per-ID budget
 * keeps every attempt. Only the current bucket is refunded (a rollover since admission is a no-op), never below
 * zero; a failed refund leaves the attempt counted, which is the safe direction. */
export async function releaseLoginAddress(address:string|null,executor:SqlExecutor=neonNotificationExecutor()):Promise<void>{
 if(!address)return;
 // Rows hold at least one attempt (table check), so a last slot is removed rather than set to zero.
 const key=scope('address',address);
 await executor.transaction([{text:`DELETE FROM password_recovery_limits WHERE scope=$1 AND bucket=${BUCKET} AND attempts=1`,values:[key]},
  {text:`UPDATE password_recovery_limits SET attempts=attempts-1 WHERE scope=$1 AND bucket=${BUCKET} AND attempts>1`,values:[key]}]);
}

/** The client address as the hosting edge reports it (first x-forwarded-for hop), or null. */
export function clientAddress(forwardedFor:string|null|undefined):string|null{
 const first=forwardedFor?.split(',')[0]?.trim()??'';
 return first&&first.length<=64&&/^[0-9a-fA-F:.]+$/.test(first)?first:null;
}
