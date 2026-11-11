import {createHash} from 'node:crypto';
import {Client} from 'pg';

type WaitSample={elapsedMs:number;state:string;waitEventType:string|null;waitEvent:string|null;blockers:number|null};
export type MigrationFailureReceipt={file:string;index:number;total:number;sha256:string;pid:number;statementTimeout:string;elapsedMs:number;sqlstate:string|null;samples:WaitSample[];observerFailed:boolean};
const states=new Set(['active','idle','idle in transaction','idle in transaction (aborted)','disabled','fastpath function call']);
const waitTypes=new Set(['Activity','BufferPin','Client','Extension','IO','IPC','Lock','LWLock','Timeout']);
const waitEvents=new Set(['relation','transactionid','virtualxid','tuple','extend','frozenid','object','page','spectoken','advisory','BufferMapping','BufferContent','ProcArray','WALWrite','WALSync','DataFileRead','DataFileWrite','DataFileExtend','DataFileSync','ClientRead','ClientWrite','CheckpointDone','CheckpointStart','PgSleep']);
const label=(value:unknown,allowed:Set<string>)=>value===null?null:typeof value==='string'&&allowed.has(value)?value:'other';

/** QA-only: retain fixed metadata before disposable database teardown. No SQL retry. */
export async function traceOwnedMigration<T>(options:{file:string;index:number;total:number;sql:string;pid:number;statementTimeout:string;execute:()=>Promise<T>;sample:()=>Promise<unknown>;publish?:(receipt:MigrationFailureReceipt)=>void}):Promise<T>{
  const started=performance.now(),samples:WaitSample[]=[];
  let stopped=false,observerFailed=false,pending:Promise<void>|undefined,timer:ReturnType<typeof setTimeout>|undefined;
  const elapsed=()=>Math.max(0,Math.round(performance.now()-started));
  const schedule=()=>{timer=setTimeout(()=>{
    const elapsedMs=elapsed();
    pending=(async()=>{
      let sampleDeadline:ReturnType<typeof setTimeout>|undefined;
      try{
        // The tracer has its own bound as well as the pg transport bounds.
        // A late observer result cannot append to a published failure receipt.
        const raw=await Promise.race([options.sample(),new Promise<never>((_,reject)=>{sampleDeadline=setTimeout(()=>reject(Error('Owned migration observation deadline.')),1500);})]);
        const row=raw!==null&&typeof raw==='object'?raw as Record<string,unknown>:{};
        samples.push({elapsedMs,state:label(row.state,states)??'other',waitEventType:label(row.wait_event_type,waitTypes),waitEvent:label(row.wait_event,waitEvents),blockers:typeof row.blockers==='number'&&Number.isInteger(row.blockers)&&row.blockers>=0&&row.blockers<=10000?row.blockers:null});
      }catch{observerFailed=true;}finally{clearTimeout(sampleDeadline);}
      if(!stopped&&!observerFailed&&samples.length<4)schedule();
    })();
  },1000);};
  schedule();
  const stop=async()=>{stopped=true;clearTimeout(timer);await pending;};
  try{
    const result=await options.execute();await stop();return result;
  }catch(error){
    const elapsedMs=elapsed();await stop();
    const code=error!==null&&typeof error==='object'&&'code'in error?error.code:undefined;
    const receipt:MigrationFailureReceipt={
      file:/^\d{4}_[a-z0-9_]+\.sql$/.test(options.file)?options.file:'unknown',index:options.index,total:options.total,
      sha256:createHash('sha256').update(options.sql).digest('hex'),pid:options.pid,
      statementTimeout:/^\d{1,8}(?:ms|s|min)?$/.test(options.statementTimeout)?options.statementTimeout:'unknown',
      elapsedMs,sqlstate:typeof code==='string'&&/^[0-9A-Z]{5}$/.test(code)?code:null,samples,observerFailed,
    };
    try{(options.publish??(value=>{process.stderr.write(`[OWNED_MIGRATION_FAILURE] ${JSON.stringify(value)}\n`);}))(receipt);}catch{/* Diagnostics must never replace the SQL error. */}
    throw error;
  }
}

/** A separate, lazy, read-only connection; all its operations have short bounds. */
export function ownedMigrationObserver(connectionString:string,pid:number){
  let client:Client|undefined;
  return {
    async sample(){
      if(!client){
        client=new Client({connectionString,connectionTimeoutMillis:750,statement_timeout:250,query_timeout:500,options:'-c default_transaction_read_only=on'});
        // An observer transport failure is recorded as a boolean, never raw text.
        client.on('error',()=>{});
        await client.connect();
      }
      return (await client.query('SELECT state,wait_event_type,wait_event,cardinality(pg_blocking_pids(pid)) AS blockers FROM pg_stat_activity WHERE pid=$1 AND datname=current_database()',[pid])).rows[0];
    },
    async close(){if(client)await client.end();},
  };
}
