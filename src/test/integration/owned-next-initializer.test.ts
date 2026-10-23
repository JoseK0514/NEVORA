import {execFileSync} from 'node:child_process';
import {existsSync,mkdtempSync,mkdirSync,readFileSync,readdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({identity:{name:'nevora_exchange_test_initializer',oid:42,marker:'fuel-phase3-disposable:00000000-0000-4000-8000-000000000001'},dispose:vi.fn(async()=>{}),query:vi.fn(async()=>[] as unknown[]),spawn:vi.fn(()=>{throw Error('Owned test stops before a real child');})}));
vi.mock('node:child_process',async original=>({...await original<Record<string,unknown>>(),spawn:state.spawn}));
vi.mock('./local-postgres',()=>({createDisposableExchangeDatabase:async()=>({executor:{query:state.query,transaction:async()=>{throw Error('No actual SQL in lifecycle unit test');}},connectionString:'postgresql://qa@127.0.0.1:54321/nevora_exchange_test_initializer',dispose:state.dispose})}));
import {createOwnedNextApp} from './owned-next-app';
const originalCwd=process.cwd(),roots:string[]=[];
function source(){
 const parent=mkdtempSync(join(tmpdir(),'nevora-owned-initializer-')),root=join(parent,'source');roots.push(parent);mkdirSync(join(root,'src/lib'),{recursive:true});
 writeFileSync(join(root,'src/lib/db.ts'),'export function queryRows(value:unknown){return value;}\n');
 execFileSync('git',['init','-q',root]);execFileSync('git',['-C',root,'add','.']);execFileSync('git',['-C',root,'-c','user.name=Fictional QA','-c','user.email=qa@example.invalid','commit','-qm','fixture']);
 mkdirSync(join(root,'node_modules/next/dist/bin'),{recursive:true});writeFileSync(join(root,'node_modules/next/dist/bin/next'),'// Never executed: child spawn is a refusing mock.\n');process.chdir(root);return join(parent,'evidence');
}
beforeEach(()=>{state.dispose.mockClear();state.query.mockReset();state.spawn.mockClear();state.spawn.mockImplementation(()=>{throw Error('Owned test stops before a real child');});state.identity={name:'nevora_exchange_test_initializer',oid:42,marker:'fuel-phase3-disposable:00000000-0000-4000-8000-000000000001'};state.query.mockImplementation(async()=>[{...state.identity}]);});
afterEach(()=>{process.chdir(originalCwd);for(const root of roots.splice(0))rmSync(root,{recursive:true,force:true});});
it('initializer failure closes the allocated owned database before any child start',async()=>{
 const initializeDatabase=vi.fn(async()=>{throw Error('Owned initializer failed');});await expect(createOwnedNextApp(source(),{pinDevTypeReferences:false,initializeDatabase})).rejects.toThrow('Owned initializer failed');expect(initializeDatabase).toHaveBeenCalledTimes(1);expect(state.spawn).not.toHaveBeenCalled();expect(state.dispose).toHaveBeenCalledTimes(1);
});
it('pending initialization is awaited with zero child starts and zero early disposal',async()=>{
 let release=()=>{};let reached=()=>{};const entered=new Promise<void>(resolve=>{reached=resolve;});
 const initializeDatabase=vi.fn(()=>new Promise<void>((_resolve,reject)=>{release=()=>reject(Error('Owned initializer released'));reached();}));
 const result=createOwnedNextApp(source(),{pinDevTypeReferences:false,initializeDatabase}).then(()=>({error:Error('Unexpected application start')}),error=>({error}));
 try{await Promise.race([entered,result.then(({error})=>{throw error;})]);expect(state.spawn).not.toHaveBeenCalled();expect(state.dispose).not.toHaveBeenCalled();}
 finally{release();await result;}
 expect(state.dispose).toHaveBeenCalledTimes(1);
});
it('successful initializer receives only owned context and finishes before the refusing child boundary',async()=>{
 const order:string[]=[];state.spawn.mockImplementation(()=>{order.push('spawn');throw Error('Owned child boundary');});
 const initializeDatabase=vi.fn(async(context:{executor:unknown;identity:unknown;signal?:AbortSignal})=>{order.push('initialize');expect(Object.keys(context).sort()).toEqual(['executor','identity','signal']);expect(context.identity).toEqual(state.identity);order.push('initialized');});
 await expect(createOwnedNextApp(source(),{pinDevTypeReferences:false,initializeDatabase})).rejects.toThrow('Owned child boundary');expect(order).toEqual(['initialize','initialized','spawn']);expect(state.dispose).toHaveBeenCalledTimes(1);
});
it('changed ownership during initialization refuses a child start and enters owned cleanup',async()=>{
 const initializeDatabase=vi.fn(async()=>{state.identity={...state.identity,oid:43};});await expect(createOwnedNextApp(source(),{pinDevTypeReferences:false,initializeDatabase})).rejects.toThrow('Owned database identity changed during initialization');expect(initializeDatabase).toHaveBeenCalledTimes(1);expect(state.spawn).not.toHaveBeenCalled();expect(state.dispose).toHaveBeenCalledTimes(1);
});
it('abort during initialization stops before a child and closes its allocated database once',async()=>{
 const controller=new AbortController(),initializeDatabase=vi.fn(async()=>{controller.abort(Error('Owned initialization aborted'));});await expect(createOwnedNextApp(source(),{pinDevTypeReferences:false,initializeDatabase,signal:controller.signal})).rejects.toThrow('Owned initialization aborted');expect(initializeDatabase).toHaveBeenCalledTimes(1);expect(state.spawn).not.toHaveBeenCalled();expect(state.dispose).toHaveBeenCalledTimes(1);
});
it('the default absent initializer retains the existing child-start lifecycle',async()=>{
 await expect(createOwnedNextApp(source(),{pinDevTypeReferences:false})).rejects.toThrow('Owned test stops before a real child');expect(state.spawn).toHaveBeenCalledTimes(1);expect(state.dispose).toHaveBeenCalledTimes(1);
});
it('verified closure releases copied dependencies and generated cache while preserving source custody',async()=>{
 const evidence=source(),sourceRoot=process.cwd(),original=readFileSync(join(sourceRoot,'src/lib/db.ts'),'utf8');let mirror='',manifest='';
 state.spawn.mockImplementation(()=>{
  const [name]=readdirSync(evidence).filter(name=>name.startsWith('owned-next-'));mirror=join(evidence,name,'app');
  mkdirSync(join(mirror,'.next/cache'),{recursive:true});writeFileSync(join(mirror,'.next/cache/fixture'),Buffer.alloc(4096));
  manifest=readFileSync(join(evidence,name,'source-manifest.json'),'utf8');
  throw Error('Owned child boundary');
 });
 await expect(createOwnedNextApp(evidence,{pinDevTypeReferences:false})).rejects.toThrow('Owned child boundary');
 expect(state.dispose).toHaveBeenCalledTimes(1);
 expect(existsSync(join(mirror,'node_modules'))).toBe(false);expect(existsSync(join(mirror,'.next'))).toBe(false);
 expect(readFileSync(join(sourceRoot,'src/lib/db.ts'),'utf8')).toBe(original);
 expect(existsSync(join(sourceRoot,'node_modules/next/dist/bin/next'))).toBe(true);
 expect(readFileSync(join(mirror,'../source-manifest.json'),'utf8')).toBe(manifest);
 expect(readFileSync(join(mirror,'src/lib/db.ts'),'utf8')).toContain('createOwnedPgTransport');
 const receipt=JSON.parse(readFileSync(join(mirror,'../ownership.json'),'utf8'));
 expect(receipt).toMatchObject({closed:true,sourceVerified:true,mirrorVerified:true});
});
