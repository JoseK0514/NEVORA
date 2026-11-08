import 'server-only';
import {Pool,type PoolClient,type QueryResultRow} from 'pg';
import type {EnabledConfig} from './config.server';

export class ControlCommitUnknown extends Error{constructor(){super('Onboarding command acknowledgement is unavailable.');}}
export type ControlStore={query<R extends QueryResultRow=QueryResultRow>(sql:string,values?:readonly unknown[]):Promise<{rows:R[];rowCount:number|null}>;transaction<T>(work:(client:PoolClient)=>Promise<T>):Promise<T>};
export function createControlStore(pool:Pool):ControlStore{
 return {
  async query<R extends QueryResultRow>(sql:string,values:readonly unknown[]=[]){const r=await pool.query<R>(sql,[...values]);return {rows:r.rows,rowCount:r.rowCount};},
  async transaction<T>(work:(client:PoolClient)=>Promise<T>):Promise<T>{const client=await pool.connect();let commitAttempted=false;try{await client.query('BEGIN');const value=await work(client);commitAttempted=true;await client.query('COMMIT');return value;}catch(error){try{await client.query('ROLLBACK');}catch{/* A missing rollback acknowledgement never proves that COMMIT failed. */}if(commitAttempted){const code=error&&typeof error==='object'&&'code'in error?String(error.code):'';if(!/^(23|40)[0-9A-Z]{3}$/.test(code))throw new ControlCommitUnknown();}throw error;}finally{client.release();}},
 };
}
const runtimeStores=new Map<string,ControlStore>();
/** Cache only immutable control transport configuration, never signup/workspace authority. */
export function runtimeControlStore(config:EnabledConfig):ControlStore{
 const key=config.environment+'\0'+config.controlDatabaseUrl;const cached=runtimeStores.get(key);if(cached)return cached;
 if(runtimeStores.size>=2)throw Error('Onboarding transport configuration changed; restart the runtime.');
 const store=createControlStore(new Pool({connectionString:config.controlDatabaseUrl,max:4,connectionTimeoutMillis:5000,idleTimeoutMillis:30000,allowExitOnIdle:true}));runtimeStores.set(key,store);return store;
}
