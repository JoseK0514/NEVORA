import {describe,expect,it,vi,beforeEach} from 'vitest';
import {READ_SNAPSHOT,isReadSnapshot,isTransientReadError,retryTransientRead} from './read-snapshot';

const sqlError=(code:string)=>Object.assign(new Error('fictional failure '+code),{code});
const noWait=async()=>{};

describe('transient read classification',()=>{
 it.each(['55P03','57014','40001','40P01'])('retries SQLSTATE %s',code=>expect(isTransientReadError(sqlError(code))).toBe(true));
 it.each(['22P02','42P01','23505','P0001'])('never retries SQLSTATE %s (a denial, a missing table, a conflict, a guard)',code=>expect(isTransientReadError(sqlError(code))).toBe(false));
 it('treats a dropped connection without a SQLSTATE as transient, an ordinary error as not',()=>{
  expect(isTransientReadError(new TypeError('fetch failed'))).toBe(true);
  expect(isTransientReadError(new Error('invalid input syntax for type integer: "operational_authorization"'))).toBe(false);
  expect(isTransientReadError(null)).toBe(false);
 });
});

describe('retryTransientRead',()=>{
 it('reads at most twice and only after a transient failure',async()=>{
  const read=vi.fn().mockRejectedValueOnce(sqlError('55P03')).mockResolvedValueOnce('rows');
  await expect(retryTransientRead(read,undefined,noWait)).resolves.toBe('rows');expect(read).toHaveBeenCalledTimes(2);
  const twice=vi.fn().mockRejectedValue(sqlError('57014'));
  await expect(retryTransientRead(twice,undefined,noWait)).rejects.toMatchObject({code:'57014'});expect(twice).toHaveBeenCalledTimes(2);
  const denied=vi.fn().mockRejectedValue(sqlError('22P02'));
  await expect(retryTransientRead(denied,undefined,noWait)).rejects.toMatchObject({code:'22P02'});expect(denied).toHaveBeenCalledTimes(1);
 });
 it('does not retry once the caller has given up',async()=>{
  const controller=new AbortController();controller.abort();
  const read=vi.fn().mockRejectedValue(sqlError('55P03'));
  await expect(retryTransientRead(read,controller.signal,noWait)).rejects.toMatchObject({code:'55P03'});expect(read).toHaveBeenCalledTimes(1);
 });
 it('waits 100–300 ms before the second attempt',async()=>{
  const waits:number[]=[];const read=vi.fn().mockRejectedValueOnce(sqlError('40001')).mockResolvedValueOnce(1);
  await retryTransientRead(read,undefined,async ms=>{waits.push(ms);});
  expect(waits).toHaveLength(1);expect(waits[0]).toBeGreaterThanOrEqual(100);expect(waits[0]).toBeLessThan(300);
 });
});

it('recognises a snapshot batch only by its first statement',()=>{
 expect(isReadSnapshot([READ_SNAPSHOT,{text:'SELECT 1',values:[]}])).toBe(true);
 expect(isReadSnapshot([{text:'SELECT 1',values:[]},READ_SNAPSHOT])).toBe(false);
 expect(isReadSnapshot([])).toBe(false);
 expect(READ_SNAPSHOT.text).toBe('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
});

describe('production executor',()=>{
 const transaction=vi.fn();
 beforeEach(()=>{transaction.mockReset();vi.resetModules();});
 async function executor(){
  vi.doMock('../db',()=>({getDb:()=>({query:(text:string,values:unknown[])=>({text,values}),transaction}),queryRows:(rows:unknown)=>rows}));
  vi.doMock('./read-snapshot',async original=>{const actual=await original<typeof import('./read-snapshot')>();return {...actual,retryTransientRead:<T,>(read:()=>Promise<T>,signal?:AbortSignal)=>actual.retryTransientRead(read,signal,noWait)};});
  return (await import('./sql-executor')).neonNotificationExecutor();
 }
 it('retries a READ ONLY snapshot batch once after a lock timeout',async()=>{
  transaction.mockRejectedValueOnce(sqlError('55P03')).mockResolvedValueOnce([[],[{ok:1}]]);
  await expect((await executor()).transaction([READ_SNAPSHOT,{text:'SELECT 1 AS ok',values:[]}])).resolves.toEqual([[],[{ok:1}]]);
  expect(transaction).toHaveBeenCalledTimes(2);
 });
 it('never retries a batch that can write',async()=>{
  transaction.mockRejectedValue(sqlError('55P03'));
  await expect((await executor()).transaction([{text:'INSERT INTO fictional VALUES(1)',values:[]}])).rejects.toMatchObject({code:'55P03'});
  expect(transaction).toHaveBeenCalledTimes(1);
 });
});
