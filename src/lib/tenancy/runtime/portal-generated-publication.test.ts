// UNEXECUTED future src/lib/tenancy/runtime/portal-generated-publication.test.ts.
// Direct actual exported module tests; no private declarations/VM/source eval,
// fabricated Client responses, parser mocks or serialized positive authority.
import {describe,it,expect,vi} from 'vitest';
vi.mock('server-only', () => ({}));
import type {Client} from 'pg';
import {writeCurrentControlledPortalInstallationBytes,isControlledPortalGeneratedPublication} from './portal-native-installation-producer.server';
const unavailable={status:'BLOCKED',code:'CONTROLLED_PORTAL_PUBLICATION_UNAVAILABLE',reconciliation:'FRESH_ROOT_OWNED_ORIGINAL_INPUT_RECHECK_REQUIRED'};
describe('unused current controlled publication private input boundary',()=>{
 const ordinary=[null,undefined,false,0,'ordinary',[],{},Object.freeze({status:'RETAINED_SOURCE_INSTALLATION_NOT_AUTHORITY',bytes:Object.freeze([123,125,10])}),JSON.parse('{"status":"RETAINED_SOURCE_INSTALLATION_NOT_AUTHORITY","bytes":[123,125,10]}')];
 it.each(ordinary.map(value=>({value})))('refuses unissued input $value before Client reads',async ({value})=>{
  let reads=0;const client=new Proxy({},{get(){reads++;throw Error('client_read');}}) as Client;
  expect(await writeCurrentControlledPortalInstallationBytes(client,client,value)).toEqual(unavailable);expect(reads).toBe(0);
 });
 it('refuses accessor input without evaluating it',async()=>{
  let reads=0;const input=Object.defineProperty({},'status',{enumerable:true,get(){reads++;throw Error('input_read');}});
  expect(await writeCurrentControlledPortalInstallationBytes(null as unknown as Client,null as unknown as Client,input)).toEqual(unavailable);expect(reads).toBe(0);
 });
 it('refuses a proxy without traps',async()=>{
  let reads=0;const input=new Proxy({},{get(){reads++;throw Error('read');},ownKeys(){reads++;throw Error('keys');},getPrototypeOf(){reads++;throw Error('proto');}});
  expect(await writeCurrentControlledPortalInstallationBytes(null as unknown as Client,null as unknown as Client,input)).toEqual(unavailable);expect(reads).toBe(0);
 });
 it('refuses a revoked proxy without reading it',async()=>{
  const p=Proxy.revocable({},{});p.revoke();expect(await writeCurrentControlledPortalInstallationBytes(null as unknown as Client,null as unknown as Client,p.proxy)).toEqual(unavailable);
 });
 it('publication identity is private and trap-free',()=>{
  let reads=0;const p=new Proxy({},{get(){reads++;throw Error('read');},ownKeys(){reads++;throw Error('keys');}});
  for(const value of [undefined,null,{},Object.freeze({status:'GENERATED_SOURCE_PUBLISHED_NOT_AUTHORITY',file:'src/lib/tenancy/runtime/portal-native-installation.generated.json',sha256:'a'.repeat(64),byteLength:1}),p])expect(isControlledPortalGeneratedPublication(value)).toBe(false);
  const revoked=Proxy.revocable({},{});revoked.revoke();expect(isControlledPortalGeneratedPublication(revoked.proxy)).toBe(false);expect(reads).toBe(0);
 });
});
