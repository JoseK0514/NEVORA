import type {SqlExecutor,SqlStatement} from '../../lib/notifications/types';

/** Only the rate-counter bucket is controlled. Invitation/session expiry,
 * locks, SQL execution and password derivation retain their real behavior. */
export async function claimCounterClock(base:SqlExecutor){
 const [row]=await base.query<{at:string}>({text:'SELECT clock_timestamp()::text AS at',values:[]});
 let at=new Date(row.at);
 if(!Number.isFinite(at.getTime()))throw Error('Owned claim counter clock unavailable');
 const rewrite=(statement:SqlStatement):SqlStatement=>{
  const expression="date_bin(interval '15 minutes',clock_timestamp(),";
  if(!statement.text.includes('company_invitation_claim_counters')||!statement.text.includes(expression))return statement;
  return {...statement,text:statement.text.replaceAll(expression,`date_bin(interval '15 minutes',$${statement.values.length+1}::timestamptz,`),values:[...statement.values,at.toISOString()]};
 };
 const executor:SqlExecutor={...base,
  query:<T>(statement:SqlStatement,signal?:AbortSignal)=>base.query<T>(rewrite(statement),signal),
  transaction:(statements,signal)=>base.transaction(statements.map(rewrite),signal),
 };
 return {executor,advanceBucket(){at=new Date(at.getTime()+15*60*1000);}};
}
