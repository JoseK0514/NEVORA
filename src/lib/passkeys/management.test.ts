import {afterEach,beforeEach,expect,it,rs} from '@rstest/core';
import {createPasskeyManager,parsePasskeySnapshot} from './management';
const authority='a'.repeat(64),id='11111111-1111-4111-8111-111111111111';
const key={id,name:'Fictional phone',createdAt:'2026-10-27T12:00:00.000Z',lastUsedAt:null};
const snapshot=(keys:unknown[]=[key],validForMs=45000)=>({authority,validForMs,passkeys:keys});
const options={challenge:'AQ',rp:{id:'localhost',name:'NEVORA'},user:{id:'AQ',name:'a',displayName:'a'},pubKeyCredParams:[{type:'public-key',alg:-7}]};
const credential={toJSON:()=>({id:'fictional-public-response'})} as unknown as Credential;
const managers:ReturnType<typeof createPasskeyManager>[]=[];
const make=()=>{const manager=createPasskeyManager(authority,()=>{});managers.push(manager);return manager;};
beforeEach(()=>{rs.useFakeTimers({toFake:['setTimeout','clearTimeout','setInterval','clearInterval','performance','Date']});rs.stubGlobal('window',{PublicKeyCredential:function(){}});rs.stubGlobal('PublicKeyCredential',{});rs.stubGlobal('navigator',{credentials:{create:rs.fn(async()=>null)}});});
afterEach(()=>{managers.splice(0).forEach(manager=>manager.end());rs.unstubAllGlobals();rs.restoreAllMocks();rs.useRealTimers();});
it('accepts only exact current own metadata and a positive finite lease',()=>{
 expect(parsePasskeySnapshot(snapshot(),authority).passkeys).toEqual([key]);
 for(const value of [{...snapshot(),authority:'b'.repeat(64)},{...snapshot(),validForMs:45001},snapshot([],0),snapshot([key,key]),snapshot([{...key,createdAt:'unknown'}]),snapshot([{...key,credentialId:'secret'}])])expect(()=>parsePasskeySnapshot(value,authority)).toThrow();
});
it.each(['headers','body'])('bounds unread %s and clears metadata',async boundary=>{
 rs.stubGlobal('fetch',rs.fn(()=>boundary==='headers'?new Promise(()=>{}):Promise.resolve(new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{'));}})))));
 const manager=make(),work=manager.refresh();await rs.advanceTimersByTimeAsync(10001);await work;expect(manager.state.phase).toBe('unavailable');expect(manager.state.passkeys).toBeNull();
});
it('subtracts transport time and checks expiry before native admission even if timers stall',async()=>{
 let deliver!:(r:Response)=>void;rs.stubGlobal('fetch',rs.fn(()=>new Promise<Response>(r=>{deliver=r;})));const m=make(),work=m.refresh();await rs.advanceTimersByTimeAsync(500);deliver(Response.json(snapshot([],100)));await work;expect(m.state.phase).toBe('unavailable');await m.add();expect(navigator.credentials.create).not.toHaveBeenCalled();
 rs.stubGlobal('fetch',rs.fn(async()=>Response.json(snapshot([],100))));await m.refresh();const now=rs.spyOn(performance,'now').mockReturnValue(1000);await m.add();expect(navigator.credentials.create).not.toHaveBeenCalled();expect(m.state.phase).toBe('unavailable');now.mockRestore();
});
it('ends permanently on account loss and fences an abort-ignoring late read',async()=>{
 let deliver!:(r:Response)=>void;rs.stubGlobal('fetch',rs.fn(()=>new Promise<Response>(r=>{deliver=r;})));const m=make(),work=m.refresh();m.end();deliver(Response.json(snapshot()));await work;await m.refresh();expect(m.state.phase).toBe('ended');expect(m.state.passkeys).toBeNull();expect(fetch).toHaveBeenCalledOnce();
});
it.each([401,403])('treats HTTP%s as current denial without waiting for a held body',async status=>{
 const cancel=rs.fn();rs.stubGlobal('fetch',rs.fn(async()=>new Response(new ReadableStream({cancel}),{status})));const m=make();await m.refresh();expect(m.state.phase).toBe('denied');expect(cancel).toHaveBeenCalledOnce();
});
it('keeps an expected native-prompt blur from starting a duplicate ceremony, then rechecks before verify',async()=>{
 let finish!:(c:Credential|null)=>void;rs.stubGlobal('navigator',{credentials:{create:rs.fn(()=>new Promise<Credential|null>(r=>{finish=r;}))}});
 const calls:string[]=[];rs.stubGlobal('fetch',rs.fn(async(path:string)=>{calls.push(path);return Response.json(path.endsWith('/options')?{challenge:'AQ',rp:{id:'localhost',name:'NEVORA'},user:{id:'AQ',name:'a',displayName:'a'},pubKeyCredParams:[{type:'public-key',alg:-7}]}:snapshot([]));}));
 const m=make();await m.refresh();const work=m.add();await rs.advanceTimersByTimeAsync(0);expect(m.state.busy).toBe('device');m.pause(true);expect(m.state.passkeys).toBeNull();await m.resume();await m.add();expect(navigator.credentials.create).toHaveBeenCalledOnce();finish(null);await work;expect(calls.filter(path=>path.endsWith('/verify'))).toHaveLength(0);expect(m.state.notice).toMatch(/cancelled/i);expect(m.state.phase).toBe('ready');
});
it('does not repeat an uncertain removal and requires a current list before more actions',async()=>{
 let removes=0;rs.stubGlobal('fetch',rs.fn(async(_path:string,init:RequestInit)=>{if(init.method==='DELETE'){removes++;throw Error('lost reply');}return Response.json(snapshot());}));
 const m=make();await m.refresh();await m.remove(id);expect(m.state.needsRefresh).toBe(true);expect(m.state.notice).toMatch(/could not confirm/i);await m.remove(id);expect(removes).toBe(1);await m.refresh();expect(m.state.phase).toBe('ready');expect(m.state.notice).not.toMatch(/removed\./i);
});
it('never removes an unreviewed key and only reports success after a fresh absent-key read',async()=>{
 let removed=false;rs.stubGlobal('fetch',rs.fn(async(_path:string,init:RequestInit)=>{if(init.method==='DELETE'){removed=true;return new Response(null,{status:204});}return Response.json(snapshot(removed?[]:[key]));}));
 const m=make();await m.refresh();await m.remove('22222222-2222-4222-8222-222222222222');expect(removed).toBe(false);await m.remove(id);expect(m.state.passkeys).toEqual([]);expect(m.state.notice).toBe('Passkey removed.');
});
it('does not call a successful deletion complete when its canonical follow-up read fails',async()=>{
 let reads=0;rs.stubGlobal('fetch',rs.fn(async(_path:string,init:RequestInit)=>{if(init.method==='DELETE')return new Response(null,{status:204});if(++reads>1)throw Error('read failed');return Response.json(snapshot());}));
 const m=make();await m.refresh();await m.remove(id);expect(m.state.needsRefresh).toBe(true);expect(m.state.notice).toMatch(/could not confirm/i);expect(m.state.passkeys).toBeNull();
});
it.each(['headers','body'])('never resends registration verification after unknown %s; a new read cannot invent success',async boundary=>{
 let verifications=0;rs.stubGlobal('navigator',{credentials:{create:rs.fn(async()=>credential)}});
 rs.stubGlobal('fetch',rs.fn(async(path:string)=>{if(path.endsWith('/options'))return Response.json(options);if(path.endsWith('/verify')){verifications++;if(boundary==='headers')return await new Promise<Response>(()=>{});return new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{'));}}));}return Response.json(snapshot([]));}));
 const m=make();await m.refresh();const work=m.add();await rs.advanceTimersByTimeAsync(10001);await work;expect(m.state.needsRefresh).toBe(true);await m.add();expect(verifications).toBe(1);await m.refresh();expect(m.state.notice).not.toMatch(/Passkey added/);expect(verifications).toBe(1);
});
it('rechecks current binding after the native response and never verifies after denial',async()=>{
 let reads=0;rs.stubGlobal('navigator',{credentials:{create:rs.fn(async()=>credential)}});const paths:string[]=[];
 rs.stubGlobal('fetch',rs.fn(async(path:string)=>{paths.push(path);if(path.endsWith('/options'))return Response.json(options);return ++reads===1?Response.json(snapshot([])):new Response(null,{status:401});}));
 const m=make();await m.refresh();await m.add();expect(m.state.phase).toBe('denied');expect(paths.some(path=>path.endsWith('/verify'))).toBe(false);
});
it('only reports native registration success after the exact saved receipt is present in a fresh list',async()=>{
 let saved=false;rs.stubGlobal('navigator',{credentials:{create:rs.fn(async()=>credential)}});
 const headers:HeadersInit[]=[];rs.stubGlobal('fetch',rs.fn(async(path:string,init:RequestInit)=>{headers.push(init.headers!);if(path.endsWith('/options'))return Response.json(options);if(path.endsWith('/verify')){saved=true;return Response.json({passkey:key});}return Response.json(snapshot(saved?[key]:[]));}));
 const m=make();await m.refresh();await m.add();expect(m.state.passkeys).toEqual([key]);expect(m.state.notice).toMatch(/Passkey added/);expect(headers.every(value=>new Headers(value).get('X-Nevora-Passkey-Authority')===authority)).toBe(true);
});
it.each([{error:'unavailable'},{},null])('rejects a non-204 removal response %j even when a later list happens to be absent',async body=>{
 let removed=false;rs.stubGlobal('fetch',rs.fn(async(_path:string,init:RequestInit)=>{if(init.method==='DELETE'){removed=true;return Response.json(body);}return Response.json(snapshot(removed?[]:[key]));}));const m=make();await m.refresh();await m.remove(id);expect(m.state.needsRefresh).toBe(true);expect(m.state.notice).not.toBe('Passkey removed.');
});
