import type {SqlStatement} from '../notifications/types';

/** First statement of a read-only batch. REPEATABLE READ gives every later statement in the batch one snapshot (the
 * single instant the old `LOCK TABLE … IN SHARE MODE` prefixes provided) without blocking any writer, and READ ONLY
 * makes PostgreSQL refuse any write or row lock in the batch. It must be the first statement of the transaction:
 * PostgreSQL rejects it once a query has taken a snapshot, so a misplaced use fails loudly instead of silently
 * reading at READ COMMITTED. */
export const READ_SNAPSHOT:SqlStatement=Object.freeze({text:'SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY',values:Object.freeze([]) as readonly unknown[]});
export const isReadSnapshot=(statements:readonly SqlStatement[])=>statements[0]?.text===READ_SNAPSHOT.text;

/** Bound waits on Owner and Manager read batches as Employee reads already are, so a stuck lock fails fast (and is
 * retried once) instead of holding the request until the platform ends it. SET LOCAL ends with the transaction. */
export const managementReadLimits:SqlStatement[]=[{text:"SET LOCAL lock_timeout='2s'",values:[]},{text:"SET LOCAL statement_timeout='5s'",values:[]}];

/** SQLSTATEs a read may meet under contention and that a fresh attempt can clear: lock timeout, statement
 * timeout/cancel, serialization failure, deadlock. A transport failure without a SQLSTATE is also transient. */
const TRANSIENT=new Set(['55P03','57014','40001','40P01']);
export function isTransientReadError(error:unknown):boolean{
 if(!error||typeof error!=='object')return false;
 const code='code'in error?String((error as {code?:unknown}).code??''):'';
 if(TRANSIENT.has(code))return true;
 if(code)return false;
 const message=error instanceof Error?error.message:'';
 return /fetch failed|ECONNRESET|ETIMEDOUT|socket hang up|Error connecting to database/i.test(message);
}

/** Run an idempotent read at most twice: once, then once more after 100–300 ms (jittered) when the first attempt
 * met a transient failure. Only for work that cannot write (a READ ONLY snapshot, or locks plus SELECTs). */
export async function retryTransientRead<T>(read:()=>Promise<T>,signal?:AbortSignal,wait:(ms:number)=>Promise<void>=ms=>new Promise(resolve=>setTimeout(resolve,ms))):Promise<T>{
 try{return await read();}catch(error){
  if(!isTransientReadError(error)||signal?.aborted)throw error;
  await wait(100+Math.floor(Math.random()*200));
  signal?.throwIfAborted();
  return read();
 }
}
