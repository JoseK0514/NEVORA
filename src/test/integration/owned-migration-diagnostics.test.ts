import {createHash} from 'node:crypto';
import {afterEach, expect, it, rs} from '@rstest/core';
import {traceOwnedMigration, type MigrationFailureReceipt} from './owned-migration-diagnostics';

afterEach(()=>rs.useRealTimers());
const identity={file:'0002_schedule_health.sql',index:2,total:60,pid:42,statementTimeout:'5s',sql:'PRIVATE SQL and parameters'};

it('executes once, returns the original result, and never samples a fast migration',async()=>{
  rs.useFakeTimers();
  const execute=rs.fn(async()=>({rows:[1]})),sample=rs.fn(),publish=rs.fn();
  await expect(traceOwnedMigration({...identity,execute,sample,publish})).resolves.toEqual({rows:[1]});
  await rs.advanceTimersByTimeAsync(10000);
  expect(execute).toHaveBeenCalledTimes(1);expect(sample).not.toHaveBeenCalled();expect(publish).not.toHaveBeenCalled();
});

it('retains bounded contemporaneous waits, file hash and original timeout without private data',async()=>{
  rs.useFakeTimers();
  const failure=Object.assign(new Error('PRIVATE password and query'),{code:'57014'}),receipts:MigrationFailureReceipt[]=[];
  let fail!:(error:unknown)=>void;
  const execute=rs.fn(()=>new Promise<never>((_,reject)=>{fail=reject;}));
  const sample=rs.fn(async()=>({state:'active',wait_event_type:'Lock',wait_event:'relation',blockers:1,query:'PRIVATE',password:'PRIVATE'}));
  const pending=traceOwnedMigration({...identity,execute,sample,publish:r=>receipts.push(r)});
  const rejected=expect(pending).rejects.toBe(failure);
  await rs.advanceTimersByTimeAsync(5500);fail(failure);await rejected;
  expect(execute).toHaveBeenCalledTimes(1);expect(sample).toHaveBeenCalledTimes(4);
  expect(receipts).toHaveLength(1);
  expect(receipts[0]).toMatchObject({file:identity.file,index:2,total:60,pid:42,statementTimeout:'5s',sqlstate:'57014',sha256:createHash('sha256').update(identity.sql).digest('hex'),elapsedMs:5500});
  expect(receipts[0].samples[0]).toEqual({elapsedMs:1000,state:'active',waitEventType:'Lock',waitEvent:'relation',blockers:1});
  expect(receipts[0].samples).toHaveLength(4);expect(JSON.stringify(receipts)).not.toContain('PRIVATE');
  await rs.advanceTimersByTimeAsync(10000);expect(sample).toHaveBeenCalledTimes(4);
});

it('preserves the original error when observing or publishing fails and never retries SQL',async()=>{
  rs.useFakeTimers();
  const failure=new Error('PRIVATE original');let fail!:(error:unknown)=>void;
  const execute=rs.fn(()=>new Promise<never>((_,reject)=>{fail=reject;}));
  const sample=rs.fn(async()=>{throw new Error('PRIVATE observer');});
  const pending=traceOwnedMigration({...identity,execute,sample,publish:()=>{throw Error('PRIVATE sink');}});
  const rejected=expect(pending).rejects.toBe(failure);
  await rs.advanceTimersByTimeAsync(2500);fail(failure);await rejected;
  expect(execute).toHaveBeenCalledTimes(1);expect(sample).toHaveBeenCalledTimes(1);
});

it('sanitizes unsupported wait metadata and waits for an in-flight sample before publishing',async()=>{
  rs.useFakeTimers();let finish!:(value:unknown)=>void,fail!:(error:unknown)=>void;
  const receipts:MigrationFailureReceipt[]=[],failure=Object.assign(Error('PRIVATE'),{code:'PRIVATE'});
  const pending=traceOwnedMigration({...identity,execute:()=>new Promise<never>((_,reject)=>{fail=reject;}),sample:()=>new Promise(resolve=>{finish=resolve;}),publish:r=>receipts.push(r)});
  const rejected=expect(pending).rejects.toBe(failure);
  await rs.advanceTimersByTimeAsync(1000);fail(failure);await Promise.resolve();expect(receipts).toEqual([]);
  finish({state:'PRIVATE',wait_event_type:'PRIVATE',wait_event:'PRIVATE',blockers:'PRIVATE'});await rejected;
  expect(receipts[0]).toMatchObject({sqlstate:null,samples:[{state:'other',waitEventType:'other',waitEvent:'other',blockers:null}]});
  expect(JSON.stringify(receipts)).not.toContain('PRIVATE');
});

it('bounds a never-settling observer and still propagates the same SQL failure',async()=>{
  rs.useFakeTimers();let fail!:(error:unknown)=>void;
  const failure=Object.assign(Error('PRIVATE'),{code:'57014'}),receipts:MigrationFailureReceipt[]=[];
  const sample=rs.fn(()=>new Promise<never>(()=>{}));
  const pending=traceOwnedMigration({...identity,execute:()=>new Promise<never>((_,reject)=>{fail=reject;}),sample,publish:r=>receipts.push(r)});
  const rejected=expect(pending).rejects.toBe(failure);
  await rs.advanceTimersByTimeAsync(1100);fail(failure);
  await rs.advanceTimersByTimeAsync(1500);await rejected;
  expect(sample).toHaveBeenCalledTimes(1);expect(receipts[0]).toMatchObject({observerFailed:true,samples:[],sqlstate:'57014'});
  await rs.advanceTimersByTimeAsync(10000);expect(sample).toHaveBeenCalledTimes(1);
});

it('does not mutate published metadata when an observation arrives after its deadline',async()=>{
  rs.useFakeTimers();let fail!:(error:unknown)=>void,finish!:(value:unknown)=>void;
  const failure=Object.assign(Error('PRIVATE'),{code:'57014'}),receipts:MigrationFailureReceipt[]=[];
  const pending=traceOwnedMigration({...identity,execute:()=>new Promise<never>((_,reject)=>{fail=reject;}),sample:()=>new Promise(resolve=>{finish=resolve;}),publish:r=>receipts.push(r)});
  const rejected=expect(pending).rejects.toBe(failure);
  await rs.advanceTimersByTimeAsync(1100);fail(failure);await rs.advanceTimersByTimeAsync(1500);await rejected;
  const retained=JSON.stringify(receipts);
  finish({state:'active',wait_event_type:'Lock',wait_event:'relation',blockers:1});await rs.advanceTimersByTimeAsync(10000);
  expect(JSON.stringify(receipts)).toBe(retained);expect(receipts[0]).toMatchObject({observerFailed:true,samples:[]});
});
