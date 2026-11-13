import {afterEach,expect,it,vi} from 'vitest';
import {createCentralBillingClient,parseBillingCatalog,parseCentralStatus,publicBillingApiOrigin,stripeBillingDestination,takeBillingFragment} from './central-billing';
const proof='a'.repeat(43),token='b'.repeat(43),operation='12121212-1212-4212-8212-121212121212',origin='http://127.0.0.1:39991';
const catalog={currency:'usd',trialDays:30,plans:[{key:'small',employees:15,amount:1900},{key:'team',employees:30,amount:2900}]};
const status={state:'paid',operational:true,trialEndsAt:null,paidThrough:'2026-12-01T00:00:00.000Z',graceEndsAt:null,plan:'small',employeeLimit:15,activeEmployees:4,reason:null,billing:true,export:true,businessName:'Fictional business',applicationUrl:'https://fixture.example.invalid',timeZone:'America/Puerto_Rico'};
const json=(value:unknown,status=200)=>Response.json(value,{status});
function fixture(){let stamp=Date.parse('2026-11-13T00:00:00Z');const transport=vi.fn(async(url:string,_init:RequestInit):Promise<Response>=>url.endsWith('/exchange')?json({accessToken:token,expiresIn:28800}):url.endsWith('/status')?json(status):url.endsWith('/plans')?json(catalog):json({url:'https://checkout.stripe.com/c/pay/fictional'}));const key=vi.fn(()=>operation);const client=createCentralBillingClient(origin,transport,key,()=>stamp);return {client,transport,key,advance:(ms:number)=>{stamp+=ms;}};}
afterEach(()=>vi.useRealTimers());
it('takes only a canonical handoff and scrubs even an invalid or retired fragment',()=>{
 for(const hash of ['#handoff='+proof,'#handoff=short','#token='+proof,'#handoff='+proof+'&other=private']){const scrub=vi.fn();expect(takeBillingFragment({hash,pathname:'/pages/plans',search:''},scrub)).toBe(hash==='#handoff='+proof?proof:null);expect(scrub).toHaveBeenCalledExactlyOnceWith('/pages/plans');}
});
it.each(['https://evil.invalid','https://br-fixture-commerceapi.compute.c-15.us-east-1.aws.neon.tech/path','https://user:secret@br-fixture-commerceapi.compute.c-15.us-east-1.aws.neon.tech','http://192.168.0.2:3000'])('rejects an untrusted public API origin %s',value=>expect(publicBillingApiOrigin(value)).toBeNull());
it('exchanges once and sends bearer only on authenticated requests, without cookies or redirects',async()=>{
 const f=fixture();expect(await f.client.enter(proof)).toBe('ready');expect(await f.client.enter(proof)).toBe('invalid');
 expect((await f.client.read(new AbortController().signal)).state).toBe('ready');expect(f.transport).toHaveBeenCalledTimes(3);
 for(const [url,init] of f.transport.mock.calls){expect(init.credentials).toBe('omit');expect(init.redirect).toBe('error');expect(init.cache).toBe('no-store');expect((init.headers as Record<string,string>).authorization).toBe(url.endsWith('/status')?'Bearer '+token:undefined);}
 expect(JSON.stringify(f.client)).not.toContain(token);
});
it('does not issue an operation key or request before an authorized session exists',async()=>{const f=fixture();expect(await f.client.action('checkout','en')).toEqual({kind:'denied'});expect(f.key).not.toHaveBeenCalled();expect(f.transport).not.toHaveBeenCalled();});
it('recovers a lost reply with the exact original key/body and rejects changed action or language',async()=>{
 const f=fixture();await f.client.enter(proof);f.transport.mockRejectedValueOnce(Error('fictional lost response'));
 expect(await f.client.action('checkout','es')).toEqual({kind:'unknown'});const before=f.transport.mock.calls.length;
 expect(await f.client.action('checkout','en')).toEqual({kind:'conflict'});expect(await f.client.action('portal','es')).toEqual({kind:'conflict'});expect(f.transport).toHaveBeenCalledTimes(before);
 expect((await f.client.retry()).kind).toBe('navigate');expect(f.key).toHaveBeenCalledTimes(1);
 const attempts=f.transport.mock.calls.filter(([url])=>url.endsWith('/checkout'));expect(attempts).toHaveLength(2);expect(attempts[0][1].body).toBe(attempts[1][1].body);expect(attempts[0][1].headers).toEqual(attempts[1][1].headers);expect(JSON.parse(String(attempts[1][1].body))).toEqual({lang:'es'});
});
it('binds a reviewed plan change to its original plan and language',async()=>{const f=fixture();await f.client.enter(proof);await f.client.action('team','es');const call=f.transport.mock.calls.at(-1)!;expect(call[0]).toBe(origin+'/v1/plan-change');expect(JSON.parse(String(call[1].body))).toEqual({lang:'es',plan:'team'});expect(await f.client.action('small','es')).toEqual({kind:'conflict'});});
it.each(['http://checkout.stripe.com/c/pay/fake','https://checkout.stripe.com.evil.invalid/c/pay/fake','https://user:secret@checkout.stripe.com/c/pay/fake','https://checkout.stripe.com:444/c/pay/fake','https://billing.stripe.com/elsewhere'])('rejects unsafe financial navigation %s',url=>expect(()=>stripeBillingDestination({url})).toThrow());
it('keeps unknown custody when a successful response has an unsafe destination',async()=>{const f=fixture();await f.client.enter(proof);f.transport.mockResolvedValueOnce(json({url:'https://evil.invalid/private'}));expect(await f.client.action('checkout','en')).toEqual({kind:'unknown'});expect(f.client.hasPending()).toBe(true);expect(f.key).toHaveBeenCalledTimes(1);});
it('does not publish a late financial URL after pause, and settles cancellation before a held transport returns',async()=>{
 const f=fixture();await f.client.enter(proof);let release!:(r:Response)=>void;f.transport.mockImplementationOnce(()=>new Promise<Response>(resolve=>{release=resolve;}));
 let result:unknown='pending';const request=f.client.action('checkout','en').then(value=>{result=value;});f.client.pause();expect(await Promise.race([request.then(()=>result),new Promise(resolve=>setTimeout(()=>resolve('did_not_settle'),100))])).toEqual({kind:'unknown'});
 release(json({url:'https://checkout.stripe.com/c/pay/late'}));await request;expect(result).toEqual({kind:'unknown'});expect(f.client.hasPending()).toBe(true);
});
it('retires credentials on actual unauthorized status and does not replay a financial action',async()=>{const f=fixture();await f.client.enter(proof);f.transport.mockResolvedValueOnce(json({error:{code:'unauthorized'}},401));expect(await f.client.read(new AbortController().signal)).toEqual({state:'unavailable',reason:'access_denied'});expect(f.client.hasSession()).toBe(false);expect(await f.client.retry()).toEqual({kind:'denied'});});
it('rejects an expired billing session without a new request',async()=>{const f=fixture();await f.client.enter(proof);f.advance(28800001);const count=f.transport.mock.calls.length;expect(await f.client.action('checkout','en')).toEqual({kind:'denied'});expect(f.transport).toHaveBeenCalledTimes(count);});
it('clears local credentials immediately on sign out while attempting only the original server revocation',async()=>{
 const f=fixture();await f.client.enter(proof);let release!:(r:Response)=>void;f.transport.mockImplementationOnce(()=>new Promise<Response>(resolve=>{release=resolve;}));const request=f.client.signOut();expect(f.client.hasSession()).toBe(false);release(json({state:'signed_out'}));await request;expect(f.transport.mock.calls.at(-1)![0]).toBe(origin+'/v1/logout');
});
it('disposes a held exchange without accepting the late credential',async()=>{const f=fixture();let release!:(r:Response)=>void;f.transport.mockImplementationOnce(()=>new Promise<Response>(resolve=>{release=resolve;}));const request=f.client.enter(proof);f.client.dispose();release(json({accessToken:token,expiresIn:28800}));expect(await request).toBe('unavailable');expect(f.client.hasSession()).toBe(false);expect(f.client.hasPending()).toBe(false);});
it('projects authoritative plans and current workplace status without caller selectors',()=>{expect(parseBillingCatalog(catalog)).toEqual(catalog);expect(parseCentralStatus({...status,customerId:'private-provider-id'})).not.toHaveProperty('customerId');expect(()=>parseCentralStatus({...status,timeZone:'not-a-zone'})).toThrow();expect(()=>parseBillingCatalog({...catalog,plans:[catalog.plans[0],catalog.plans[0]]})).toThrow();});
