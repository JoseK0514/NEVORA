import {mkdtemp,readFile,readdir,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {devRecoveryDelivery,capturePush,captureNotificationRuntime} from './capture.server';
import {recoveryDelivery} from '../auth/recovery-delivery.server';
import {createPushSender} from '../notifications/provider';
import type {NotificationConfig} from '../notifications/types';
let out:string|undefined;
afterEach(async()=>{vi.unstubAllEnvs();if(out)await rm(out,{recursive:true,force:true});out=undefined;});
const config={NODE_ENV:'development',NEVORA_DEV_CAPTURE_DELIVERY:'1',FUEL_PORTAL_ORIGIN:'http://127.0.0.1:3000'};
async function setup(){out=await mkdtemp(join(tmpdir(),'nevora-capture-test-'));vi.stubEnv('NODE_ENV','development');return {...config,NEVORA_DEV_CAPTURE_OUT:out};}
const input={subscription:{endpoint:'https://provider.invalid/secret-endpoint',expirationTime:null,keys:{p256dh:'never-record',auth:'never-record'}},payload:{notificationId:'fictional',kind:'TIME_OFF',ownershipGeneration:'fixture',expiresAt:'2030-01-01T00:00:00Z',tag:'fixture',title:'Fictional update',body:'Open your fictional preview.'},ttlSeconds:60,urgency:'normal' as const,topic:'fictional',signal:new AbortController().signal};
it('captures one .eml privately using the real Nodemailer stream transport',async()=>{
  const env=await setup(),delivery=recoveryDelivery(env);expect(delivery).toBeTruthy();
  await delivery!.send('fictional@example.invalid','fictional-one-use-proof');
  const files=await readdir(join(out!,'email'));expect(files).toHaveLength(1);expect(files[0]).toMatch(/\.eml$/);
  const path=join(out!,'email',files[0]),content=await readFile(path,'utf8');expect(content).toContain('fictional@example.invalid');expect(content.replace(/=\r?\n/g,'')).toContain('reset-access#proof=3Dfictional-one-use-proof');expect((await stat(path)).mode&0o777).toBe(0o600);
});
it('enables only an explicitly enrolled local test worker, never production or unscoped recipients',async()=>{
  const env=await setup(),base={environment:'test',featureEnabled:true,testAccountIds:['QA'],deliveryEnabled:false,testDeliveryEnabled:false} as const;
  const config=base as unknown as Parameters<typeof captureNotificationRuntime>[0];
  expect(captureNotificationRuntime(config,env)).toMatchObject({deliveryEnabled:true,testDeliveryEnabled:true});
  expect(captureNotificationRuntime({...config,testAccountIds:[]},env)).toMatchObject({deliveryEnabled:false});
  expect(captureNotificationRuntime({...config,environment:'production'},env)).toMatchObject({deliveryEnabled:false});
});
it('captures one push payload without recording subscription credentials or making a provider call',async()=>{
  const env=await setup();for(const [key,value] of Object.entries(env))vi.stubEnv(key,value);
  const transport=vi.fn();expect(await createPushSender({} as NotificationConfig,transport).send(input)).toEqual({kind:'accepted'});expect(transport).not.toHaveBeenCalled();
  const files=await readdir(join(out!,'push')),content=await readFile(join(out!,'push',files[0]),'utf8');expect(JSON.parse(content).payload).toEqual(input.payload);expect(content).not.toContain('never-record');expect(content).not.toContain('secret-endpoint');
});
it('requires all gates and fails closed for requested capture with invalid local configuration',async()=>{
  const env=await setup();expect(devRecoveryDelivery({...env,NEVORA_DEV_CAPTURE_DELIVERY:'0'})).toBeUndefined();
  expect(devRecoveryDelivery({...env,FUEL_PORTAL_ORIGIN:'https://public.invalid'})).toBeNull();
  expect(await capturePush(input,{...env,NEVORA_DEV_CAPTURE_OUT:'relative'})).toEqual({kind:'failed',errorClass:'local_capture_configuration'});
  vi.stubEnv('NODE_ENV','production');expect(devRecoveryDelivery(env)).toBeUndefined();expect(await capturePush(input,env)).toBeUndefined();expect(await readdir(out!)).toEqual([]);
});
