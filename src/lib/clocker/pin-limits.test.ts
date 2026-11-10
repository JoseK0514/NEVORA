import {expect,it} from 'vitest';
import {reservePinAttempt} from './pin-limits.server';
import type {SqlExecutor} from '../notifications/types';
import type {ClockerDeviceWriteProof} from './devices.server';
import type {Workspace} from '../domain';
const device={deviceId:'device',locationId:'location',credentialVersion:1} as ClockerDeviceWriteProof;
const workspace={id:'workspace'} as Workspace;
const executor=(rows:unknown[][])=>({transaction:async()=>rows,query:async()=>[]} as SqlExecutor);
it('carries the authoritative remaining database seconds when the reservation is denied',async()=>{
 expect(await reservePinAttempt(device,workspace,Buffer.alloc(32),executor([[],[{retryAfterSeconds:47}]]))).toEqual({retryAfterSeconds:47});
});
it('preserves both captured failure windows on a successful reservation',async()=>{
 const windows=[{scope:'WORKSPACE',scopeId:'workspace',failureWindow:'2026-11-10 00:00:00+00'},{scope:'DEVICE',scopeId:'device',failureWindow:'2026-11-10 00:00:00+00'}];
 expect(await reservePinAttempt(device,workspace,Buffer.alloc(32),executor([windows,[{retryAfterSeconds:300}]]))).toEqual({attemptId:expect.any(String),windows});
});
it.each([undefined,0,-1,NaN,1.5,'47'])('fails closed on invalid database wait %s',async retryAfterSeconds=>{
 await expect(reservePinAttempt(device,workspace,Buffer.alloc(32),executor([[],[{retryAfterSeconds}]]))).rejects.toMatchObject({code:'UNAVAILABLE'});
});
