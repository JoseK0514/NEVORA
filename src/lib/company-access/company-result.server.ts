import 'server-only';
import type {SqlExecutor} from '../notifications/types';
import type {SessionMutationProof} from '../shift-changes/types';
import {withOperationalCompany} from './operational-scope.server';

type ReadResult={state:'ready';validForMs:number}|{state:'unavailable';reason:string};
/** Preserve a global reader's domain DTO while enforcing current Company access.
 * The callback must be read-only. Canonical financial/self sources stay separate.
 * Consume the original observation budget, including all asynchronous work. */
export async function readCompanyResult<T extends ReadResult>(proof:SessionMutationProof,load:()=>Promise<T>,executor:SqlExecutor):Promise<T|{state:'unavailable';reason:'access_denied'|'read_failed'}>{
 const started=performance.now();
 const result=await withOperationalCompany(proof,load,executor);
 if(result.state!=='ready')return {state:'unavailable',reason:result.reason==='access_denied'?'access_denied':'read_failed'};
 if(result.data.state!=='ready')return result.data;
 const validForMs=Math.floor(Math.min(result.data.validForMs,result.validForMs-(performance.now()-started)));
 return validForMs>0?{...result.data,validForMs}:{state:'unavailable',reason:'access_denied'};
}
