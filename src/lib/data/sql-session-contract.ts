import type {NeonQueryFunction} from '@neondatabase/serverless';
import type {SqlStatement} from '../notifications/types';
type Driver=Pick<NeonQueryFunction<false,false>,'query'|'transaction'>;
const setup:readonly SqlStatement[]=[
 {text:"SET LOCAL TIME ZONE 'UTC'",values:[]},
 {text:"SET LOCAL DateStyle TO 'ISO, YMD'",values:[]},
];
const final:SqlStatement={text:"SELECT (CASE WHEN current_setting('TimeZone')='UTC' AND current_setting('DateStyle')='ISO, YMD' AND current_setting('transaction_isolation')='read committed' THEN '1' ELSE 'sql_session_contract_changed' END)::integer AS sql_session_contract",values:[]};
/** Text timestamp versions retain PostgreSQL microseconds and one source format.
 * LOCAL settings belong to the same HTTP batch as every body query; pooled
 * defaults are neither trusted nor changed. Fixed trusted body SQL must preserve
 * these settings; the exit guard rejects a changed final contract atomically. */
export async function sessionTransaction(sql:Driver,statements:readonly SqlStatement[],signal?:AbortSignal):Promise<unknown[][]>{
 signal?.throwIfAborted();if(!statements.length)return [];
 const batch=[...setup,...statements,final];
 // Keep every NeonQueryPromise lazy until its owning transaction consumes it.
 const result=await sql.transaction(batch.map(s=>sql.query(s.text,[...s.values])),{isolationLevel:'ReadCommitted',arrayMode:false,fullResults:false,...(signal?{fetchOptions:{signal}}:{})});
 if(!Array.isArray(result)||result.length!==batch.length)throw Error('SQL session contract result unavailable');
 const normalized=result.map((value:unknown):unknown[]=>{
  if(Array.isArray(value))return value;
  if(value&&typeof value==='object'&&'rows'in value&&Array.isArray(value.rows))return value.rows;
  throw Error('SQL session contract result unavailable');
 });
 const checked=normalized.at(-1),proof=checked?.[0];
 if(checked?.length!==1||!proof||typeof proof!=='object'||!('sql_session_contract'in proof)||proof.sql_session_contract!==1)throw Error('SQL session contract result unavailable');
 return normalized.slice(setup.length,setup.length+statements.length);
}
