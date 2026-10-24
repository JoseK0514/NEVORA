import {createHash} from 'node:crypto';
import type {SqlExecutor,SqlStatement} from '../../lib/notifications/types';

type Status='started'|'completed'|'failed';
type Operation={index:number;kind:'query'|'transaction';status:Status;statementCount:number;statementHashes:string[];hashesTruncated:boolean;elapsedMs:number;sqlstate?:string;severity?:string};
export type OwnedSetupReceipt={status:Status;operationCount:number;truncated:boolean;elapsedMs:number;operations:Operation[];failedOperation?:Operation};

function errorFields(error:unknown){
 if(!error||typeof error!=='object')return {};
 const code='code'in error?error.code:undefined,severity='severity'in error?error.severity:undefined;
 return {sqlstate:typeof code==='string'&&/^[0-9A-Z]{5}$/.test(code)?code:undefined,
  severity:typeof severity==='string'&&['ERROR','FATAL','PANIC'].includes(severity)?severity:undefined};
}

/** Observe the existing owned fixture boundary without changing SQL, order,
 * signals or timeouts. Persist static statement digests, never text or values.
 * This records operation identity; it does not establish the server's wait cause.
 */
export async function traceOwnedFixtureSeed(executor:SqlExecutor,seed:(sql:SqlExecutor)=>Promise<void>,publish:(receipt:OwnedSetupReceipt)=>void){
 const started=performance.now();
 const receipt:OwnedSetupReceipt={status:'started',operationCount:0,truncated:false,elapsedMs:0,operations:[]};
 const emit=()=>{receipt.elapsedMs=Math.round(performance.now()-started);publish(receipt);};
 const observe=async<T>(kind:Operation['kind'],statements:readonly SqlStatement[],run:()=>Promise<T>):Promise<T>=>{
  const operation:Operation={index:++receipt.operationCount,kind,status:'started',statementCount:statements.length,
   statementHashes:statements.slice(0,32).map(statement=>createHash('sha256').update(statement.text).digest('hex')),
   hashesTruncated:statements.length>32,elapsedMs:0};
  if(receipt.operations.length<64)receipt.operations.push(operation);else receipt.truncated=true;
  emit();const operationStarted=performance.now();let result:T;
  try{result=await run();}
  catch(error){operation.status='failed';operation.elapsedMs=Math.round(performance.now()-operationStarted);Object.assign(operation,errorFields(error));receipt.failedOperation=operation;throw error;}
  operation.status='completed';operation.elapsedMs=Math.round(performance.now()-operationStarted);emit();return result;
 };
 const observed:SqlExecutor={
  query:<T>(statement:SqlStatement,signal?:AbortSignal)=>observe('query',[statement],()=>executor.query<T>(statement,signal)),
  transaction:(statements,signal)=>observe('transaction',statements,()=>executor.transaction(statements,signal)),
 };
 emit();
 try{await seed(observed);}
 catch(error){
  receipt.status='failed';
  try{emit();}catch(traceError){throw new AggregateError([error,traceError],'Fixture setup failed and its diagnostic could not be saved');}
  throw error;
 }
 receipt.status='completed';emit();
}
