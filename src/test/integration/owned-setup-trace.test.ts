import {createHash} from 'node:crypto';
import {expect,it} from 'vitest';
import type {SqlExecutor,SqlStatement} from '../../lib/notifications/types';
import {traceOwnedFixtureSeed,type OwnedSetupReceipt} from './owned-setup-trace';

it('retains the failing operation identity and propagates the original SQL timeout without sensitive input',async()=>{
 const failure=Object.assign(new Error('private payload and credential must not be recorded'),{code:'57014',severity:'ERROR'});
 const executor:SqlExecutor={query:async()=>{throw failure;},transaction:async()=>[]};
 const receipts:OwnedSetupReceipt[]=[];
 const text='UPDATE fictional_fixture SET name=$1';
 await expect(traceOwnedFixtureSeed(executor,async sql=>{await sql.query({text,values:['PRIVATE fixture secret']});},receipt=>receipts.push(structuredClone(receipt)))).rejects.toBe(failure);
 expect(receipts[0].status).toBe('started');
 expect(receipts.some(receipt=>receipt.operations[0]?.status==='started')).toBe(true);
 expect(receipts.at(-1)).toMatchObject({status:'failed',operations:[{index:1,kind:'query',status:'failed',statementCount:1,statementHashes:[createHash('sha256').update(text).digest('hex')],sqlstate:'57014',severity:'ERROR'}]});
 const retained=JSON.stringify(receipts);
 for(const secret of ['PRIVATE','private payload','credential',text])expect(retained).not.toContain(secret);
});

it('preserves query and transaction results, abort signals, and call order',async()=>{
 const controller=new AbortController(),seen:unknown[]=[];
 const executor:SqlExecutor={query:async<T>(statement:SqlStatement,signal?:AbortSignal)=>{seen.push([statement.values,signal]);return [{value:3}] as T[];},transaction:async(statements,signal)=>{seen.push([statements.map(statement=>statement.values),signal]);return [[{value:4}]];}};
 let final:OwnedSetupReceipt|undefined;
 await traceOwnedFixtureSeed(executor,async sql=>{
  expect(await sql.query({text:'SELECT $1',values:[3]},controller.signal)).toEqual([{value:3}]);
  expect(await sql.transaction([{text:'SELECT $1',values:[4]}],controller.signal)).toEqual([[{value:4}]]);
 },receipt=>{final=structuredClone(receipt);});
 expect(seen).toEqual([[[3],controller.signal],[[[4]],controller.signal]]);
 expect(final).toMatchObject({status:'completed',operations:[{index:1,kind:'query',status:'completed'},{index:2,kind:'transaction',status:'completed'}]});
});

it('bounds recorded operations while continuing the original work and marks truncation',async()=>{
 let performed=0,final:OwnedSetupReceipt|undefined;
 const executor:SqlExecutor={query:async()=>{performed++;return [];},transaction:async()=>[]};
 await traceOwnedFixtureSeed(executor,async sql=>{for(let i=0;i<70;i++)await sql.query({text:'SELECT 1',values:[]});},receipt=>{final=structuredClone(receipt);});
 expect(performed).toBe(70);expect(final?.operations).toHaveLength(64);expect(final).toMatchObject({status:'completed',operationCount:70,truncated:true});
});

it('retains a failure outside a query and excludes arbitrary error metadata',async()=>{
 const failure=Object.assign(new Error('PRIVATE outside query'),{code:'PRIVATE',severity:'PRIVATE'});
 const executor:SqlExecutor={query:async()=>[],transaction:async()=>[]};
 let final:OwnedSetupReceipt|undefined;
 await expect(traceOwnedFixtureSeed(executor,async()=>{throw failure;},receipt=>{final=structuredClone(receipt);})).rejects.toBe(failure);
 expect(final).toMatchObject({status:'failed',operations:[],operationCount:0});
 expect(JSON.stringify(final)).not.toContain('PRIVATE');
});

it('identifies a failing operation even after the ordinary operation history is full',async()=>{
 const failure=Object.assign(new Error('PRIVATE late statement'),{code:'57014'});
 let performed=0,final:OwnedSetupReceipt|undefined;
 const executor:SqlExecutor={query:async()=>{if(++performed===65)throw failure;return [];},transaction:async()=>[]};
 await expect(traceOwnedFixtureSeed(executor,async sql=>{for(let i=0;i<65;i++)await sql.query({text:'SELECT 1',values:[]});},receipt=>{final=structuredClone(receipt);})).rejects.toBe(failure);
 expect(final?.operations).toHaveLength(64);expect(final).toMatchObject({status:'failed',operationCount:65,truncated:true,failedOperation:{index:65,kind:'query',status:'failed',sqlstate:'57014'}});
});

it('keeps both failures fatal when saving a SQL failure diagnostic also fails',async()=>{
 const failure=new Error('fictional SQL failure'),writeFailure=new Error('fictional diagnostic write failure');
 const executor:SqlExecutor={query:async()=>{throw failure;},transaction:async()=>[]};
 let caught:unknown;
 try{await traceOwnedFixtureSeed(executor,async sql=>{await sql.query({text:'SELECT 1',values:[]});},receipt=>{if(receipt.status==='failed')throw writeFailure;});}catch(error){caught=error;}
 expect(caught).toBeInstanceOf(AggregateError);
 expect((caught as AggregateError).errors).toEqual([failure,writeFailure]);
});
