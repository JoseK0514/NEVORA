import {expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {admitLoginAttempt,clientAddress,LOGIN_LIMITS} from './login-limits.server';
import type {SqlExecutor,SqlStatement} from '../notifications/types';

/** A fictional in-memory stand-in for password_recovery_limits: one bucket, counts per scope. */
function fakeLimits(){const counts=new Map<string,number>();const seen:SqlStatement[][]=[];
 const executor:SqlExecutor={query:async()=>[],transaction:async statements=>{seen.push([...statements]);return statements.map(s=>{if(!s.text.startsWith('INSERT'))return [];const k=String(s.values[0]);counts.set(k,(counts.get(k)??0)+1);return [{attempts:counts.get(k)}];});}};
 return {executor,counts,seen};}

it('admits up to the per-ID limit, then refuses that ID only',async()=>{
 const {executor}=fakeLimits();
 for(let i=0;i<LOGIN_LIMITS.perId;i++)expect(await admitLoginAttempt('emp-1',null,executor)).toBe(true);
 expect(await admitLoginAttempt('EMP-1',null,executor)).toBe(false);
 expect(await admitLoginAttempt('EMP-2',null,executor)).toBe(true);
});
it('counts every ID from one address against the address limit',async()=>{
 const {executor}=fakeLimits();
 for(let i=0;i<LOGIN_LIMITS.perAddress;i++)expect(await admitLoginAttempt(`EMP-${i}`,'198.51.100.4',executor)).toBe(true);
 expect(await admitLoginAttempt('EMP-NEW','198.51.100.4',executor)).toBe(false);
 expect(await admitLoginAttempt('EMP-NEW','198.51.100.5',executor)).toBe(true);
});
it('stores hashed scopes only, never the ID or address',async()=>{
 const {executor,seen}=fakeLimits();await admitLoginAttempt('EMP-1','198.51.100.4',executor);
 const values=seen[0]!.flatMap(s=>s.values.map(String));
 expect(values.every(v=>/^[a-f0-9]{64}$/.test(v))).toBe(true);expect(values.join()).not.toMatch(/EMP-1|198\.51/);
});
it('reads the first forwarded hop and ignores anything that isn’t an address',()=>{
 expect(clientAddress('203.0.113.7, 10.0.0.1')).toBe('203.0.113.7');expect(clientAddress('2001:db8::1')).toBe('2001:db8::1');
 expect(clientAddress(null)).toBeNull();expect(clientAddress('<script>')).toBeNull();expect(clientAddress('')).toBeNull();
});
