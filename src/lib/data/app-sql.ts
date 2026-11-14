import {getDb,queryRows} from '../db';
import {workspaceMode} from '../workspace-routing/config.server';
import {neonNotificationExecutor} from './sql-executor';

/** Raw query compatibility at application boundaries. Only the real driver
 * constructs Neon query promises; this adapter exposes an ordinary Promise. */
export function applicationSql(){
 // Preserve configuration failure before deriving a private business proof.
 // This constructs/caches a driver; every actual query still uses the contract.
 if(workspaceMode()==='single_company')getDb();
 const executor=neonNotificationExecutor();
 return {async query(text:string,values:readonly unknown[]=[],options?:{fetchOptions?:{signal?:AbortSignal}}){
  return queryRows(await executor.query({text,values},options?.fetchOptions?.signal));
 }};
}
