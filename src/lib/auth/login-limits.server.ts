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

/** The outcome of one admission. `addressBucket` is the 15-minute window the address attempt was counted in (null when
 * there was no address or it wasn't recorded), so a later refund returns exactly that attempt. */
export type LoginAdmission={admitted:boolean;addressBucket:number|null};

/** Consume ID and optional address budgets atomically before password work.
 * Only hashed scopes are persisted. All applicable counters must be readable
 * and within their cap; executor failures are left to the caller's error path. */
export async function admitLogin(employeeId:string,address:string|null,executor:SqlExecutor=neonNotificationExecutor()):Promise<LoginAdmission>{
 const scopes:[string,number][]=[[scope('id',employeeId.trim().toUpperCase()),LOGIN_LIMITS.perId]];
 if(address)scopes.push([scope('address',address),LOGIN_LIMITS.perAddress]);
 const statements:SqlStatement[]=[{text:`DELETE FROM password_recovery_limits WHERE bucket<${BUCKET}-96`,values:[]},
  ...scopes.map(([s])=>({text:`INSERT INTO password_recovery_limits(scope,bucket,attempts) VALUES($1,${BUCKET},1)
   ON CONFLICT(scope,bucket) DO UPDATE SET attempts=password_recovery_limits.attempts+1 RETURNING attempts,bucket::text AS bucket`,values:[s]}))];
 const results=await executor.transaction(statements);
 const row=(index:number)=>results[index+1]?.[0] as {attempts?:unknown;bucket?:unknown}|undefined;
 const admitted=scopes.every(([,max],index)=>{const attempts=Number(row(index)?.attempts);return Number.isFinite(attempts)&&attempts<=max;});
 const bucket=address?Number(row(1)?.bucket):NaN;
 return {admitted,addressBucket:Number.isSafeInteger(bucket)?bucket:null};
}
/** Boolean form of admitLogin for callers that never refund (account deletion's password check). */
export async function admitLoginAttempt(employeeId:string,address:string|null,executor:SqlExecutor=neonNotificationExecutor()):Promise<boolean>{
 return (await admitLogin(employeeId,address,executor)).admitted;
}

/** Gives a successful sign-in's slot back to its client address, so the address budget counts only failures: a whole
 * shift signing in over one store network can't use it up, while guessing from one address still can. The attempt
 * stays counted until the password is proven, so parallel guesses can't slip past the limit, and the per-ID budget
 * keeps every attempt. The refund goes to the window the attempt was admitted in, never the current one, so a sign-in
 * that crosses a 15-minute boundary can't erase newer failures; a window already cleaned up is a no-op. The row is
 * locked first, so concurrent refunds apply one after another and none is lost. A failed refund leaves the attempt
 * counted, which is the safe direction. */
export async function releaseLoginAddress(address:string|null,admission:Pick<LoginAdmission,'addressBucket'>,executor:SqlExecutor=neonNotificationExecutor()):Promise<void>{
 const bucket=admission.addressBucket;
 if(!address||bucket===null||!Number.isSafeInteger(bucket))return;
 const key=scope('address',address);
 // Rows hold at least one attempt (table check), so a last slot is removed rather than set to zero. Each statement
 // reads the row's latest committed value once the lock is held.
 await executor.transaction([{text:`SELECT attempts FROM password_recovery_limits WHERE scope=$1 AND bucket=$2::bigint FOR UPDATE`,values:[key,String(bucket)]},
  {text:`DELETE FROM password_recovery_limits WHERE scope=$1 AND bucket=$2::bigint AND attempts=1`,values:[key,String(bucket)]},
  {text:`UPDATE password_recovery_limits SET attempts=attempts-1 WHERE scope=$1 AND bucket=$2::bigint AND attempts>1`,values:[key,String(bucket)]}]);
}

/** The client address as the hosting edge reports it (first x-forwarded-for hop), or null. */
export function clientAddress(forwardedFor:string|null|undefined):string|null{
 const first=forwardedFor?.split(',')[0]?.trim()??'';
 return first&&first.length<=64&&/^[0-9a-fA-F:.]+$/.test(first)?first:null;
}
