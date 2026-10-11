// Test-only native protocol observation. No production import or kernel hook.
// Observe actual PG CommandComplete/ReadyForQuery; never replace SQL rows or scrypt.
import { createRequire } from 'node:module';
import { Client } from 'pg';
import { expect } from 'vitest';
import type { PortalCredentialNativeCommand, PortalCredentialNativeFault } from './portal-credential-session.postgres-cases';
type QueryState={text:string;_result:{command:string|null};handleError:(error:Error,connection:object)=>void};
type QueryPrototype={handleReadyForQuery:(this:QueryState,connection:object)=>void;handleError:(this:QueryState,error:Error,connection:object)=>void};
const PgQuery=createRequire(import.meta.url)('pg/lib/query') as {prototype:QueryPrototype};
const ready=PgQuery.prototype.handleReadyForQuery,error=PgQuery.prototype.handleError;
const native=Client.prototype.query;
export function makePortalNativeObserver(verifier:Client,backendPid:number) {
 const connection=(verifier as unknown as {connection:object}).connection;
 let commands:PortalCredentialNativeCommand[]=[];let fault:PortalCredentialNativeFault|undefined;let armed=false;let installed=false;let previous:string|null='I';
 let pause:{acquired:()=>void;wait:Promise<void>}|undefined;
 const observedErrors=new WeakMap<object,string>();
 function install() {
  expect(installed).toBe(false);expect(PgQuery.prototype.handleReadyForQuery).toBe(ready);expect(PgQuery.prototype.handleError).toBe(error);installed=true;
  PgQuery.prototype.handleError=function(e,c){
   if(c===connection){const code=(e as Error&{code?:string}).code;observedErrors.set(this,typeof code==='string'?code:'ACK_LOST');
    if(!this._result.command&&typeof code==='string'&&/^[A-Z0-9]{5}$/.test(code)){
     const text=this.text,before=previous;
     (connection as {once:(event:string,fn:()=>void)=>void}).once('readyForQuery',()=>{const after=verifier.getTransactionStatus();commands.push(Object.freeze({text,backendPid,sqlstate:code,statusBefore:before,statusAfter:after}));previous=after;});
    }
   }return Reflect.apply(error,this,[e,c]);
  };
  PgQuery.prototype.handleReadyForQuery=function(c) {
   if(c!==connection)return Reflect.apply(ready,this,[c]);
   const text=this.text, after=verifier.getTransactionStatus(), sqlstate=observedErrors.get(this)??null;
   commands.push(Object.freeze({text,backendPid,sqlstate,statusBefore:previous,statusAfter:after}));previous=after;
   const acquisition=/^SELECT\s+nevora_tenancy\.acquire_portal_login_source\s*\(/i.test(text);
   if(pause&&acquisition&&!sqlstate){const held=pause;pause=undefined;held.acquired();void held.wait.then(()=>Reflect.apply(ready,this,[c]));return;}
   const isInsert=/^SELECT\s+nevora_tenancy\.insert_portal_reviewed_session\s*\(/i.test(text),isCommit=text==='COMMIT',isBegin=text==='BEGIN ISOLATION LEVEL READ COMMITTED',isRollback=text==='ROLLBACK';
   const drop=armed&&((fault==='AFTER_REAL_COMMIT_ACK_LOST'&&isCommit)||(fault==='AFTER_REAL_BEGIN_ACK_LOST'&&isBegin)||(fault==='AFTER_REAL_INSERT_ERROR_AND_REAL_ROLLBACK_ACK_LOST'&&isRollback));
   if(drop){armed=false;this.handleError(Object.assign(new Error('owned_native_ack_lost'),{code:'OWNED_ACK_LOST'}),c);return;}
   if(armed&&isInsert&&(fault==='AFTER_REAL_INSERT_NATIVE_ERROR'||fault==='AFTER_REAL_INSERT_ERROR_AND_REAL_ROLLBACK_ACK_LOST')) {
    if(fault==='AFTER_REAL_INSERT_NATIVE_ERROR')armed=false;
    // The real insert and both native target writes already completed. Cause a
    // genuine native error on the still-owning same connection before releasing
    // the original query promise to the kernel; do not manufacture ErrorResponse.
    const original=this;
    void Reflect.apply(native,verifier,['SELECT 1/0 AS owned_post_insert_native_error']).then(()=>{throw Error('expected_native_error_missing');},async (e:unknown)=>{
     if(verifier.getTransactionStatus()!=='E')await new Promise<void>(ok=>(connection as {once:(event:string,fn:()=>void)=>void}).once('readyForQuery',ok));
     expect(verifier.getTransactionStatus()).toBe('E');original.handleError(e as Error,c);
    });return;
   }
   return Reflect.apply(ready,this,[c]);
  };
 }
 function uninstall(){if(!installed)return;PgQuery.prototype.handleReadyForQuery=ready;PgQuery.prototype.handleError=error;installed=false;pause=undefined;armed=false;fault=undefined;}
 return {
  observe:async<T>(action:()=>Promise<T>,selected?:PortalCredentialNativeFault)=>{commands=[];previous=verifier.getTransactionStatus();fault=selected;armed=Boolean(selected);install();try{return {result:await action(),commands};}finally{uninstall();}},
  pauseAfterAcquire:async<T>(action:()=>Promise<T>)=>{
   commands=[];previous=verifier.getTransactionStatus();let arrived!:()=>void,release!:()=>void;const acquired=new Promise<void>(ok=>arrived=ok),wait=new Promise<void>(ok=>release=ok);pause={acquired:arrived,wait};install();const pending=action().finally(uninstall);return{pending,acquired,release,commands};
  },
  uninstall,
 };
}
