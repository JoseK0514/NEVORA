import {getDb,queryRows} from '../db';
import {workspaceMode} from '../workspace-routing/config.server';
import {neonNotificationExecutor} from './sql-executor';

/** Raw query compatibility at application boundaries. Only the real driver
 * constructs Neon query promises; this adapter exposes an ordinary Promise. */
export function applicationSql(){
 if(workspaceMode()==='single_company')return getDb();
 const executor=neonNotificationExecutor();
 return {async query(text:string,values:readonly unknown[]=[],options?:{fetchOptions?:{signal?:AbortSignal}}){
  return queryRows(await executor.query({text,values},options?.fetchOptions?.signal));
 }};
}
