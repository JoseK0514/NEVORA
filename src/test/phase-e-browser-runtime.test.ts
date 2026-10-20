import {chmodSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {afterEach,expect,it} from 'vitest';
import {EventEmitter} from 'node:events';
const runtimeModule=resolve('scripts/phase-e-browser-qa.mjs');
const {darwinWebKitLaunch}=await import(runtimeModule);
const {observeBrowserCell}=await import(runtimeModule);
it('refuses a cell with a late runtime error and never records private error payloads',async()=>{
 const errors:unknown[]=[],context=new EventEmitter(),page=new EventEmitter();
 const cell=observeBrowserCell({suite:'communications',engine:'webkit',width:390,status:'failed'},errors);
 cell.observeContext(context,'primary');context.emit('page',page);
 cell.setStageReader(()=> 'replacement');
 page.emit('pageerror',new TypeError('Load failed https://private.invalid/api/calendar/secret Alice private body'));
 expect(errors).toHaveLength(1);expect(JSON.stringify(errors)).not.toMatch(/private|Alice|secret/);
 expect(errors[0]).toMatchObject({pageIndex:0,role:'primary',failure:{name:'TypeError',stage:'replacement',summary:'Network load failure'}});
 expect(()=>cell.assertClean()).toThrow('Browser runtime/network errors recorded in current cell');
});
it('observes errors during context close before accepting a cell and isolates previous cells',async()=>{
 const errors:unknown[]=['previous cell'],context=new EventEmitter(),page=new EventEmitter();
 const cell=observeBrowserCell({suite:'home',engine:'chromium',width:320,status:'failed'},errors);
 cell.observeContext(context,'primary');context.emit('page',page);cell.assertClean();
 cell.setPhase('context-close');
 await Promise.resolve().then(()=>page.emit('pageerror',new Error('arbitrary body')));
 expect(()=>cell.assertClean()).toThrow();expect(errors[1]).toMatchObject({phase:'context-close',failure:{summary:'Unclassified page runtime error'}});
 expect(JSON.stringify(errors)).not.toContain('arbitrary body');
});
const roots:string[]=[];
afterEach(()=>{for(const root of roots.splice(0))rmSync(root,{recursive:true,force:true});});
function fixture(binary=true,revision='2336'){
 const root=mkdtempSync(join(tmpdir(),'nevora-webkit-fixture-'));roots.push(root);const folder=join(root,'webkit-'+revision);mkdirSync(folder);
 const wrapper=join(folder,'pw_run.sh');writeFileSync(wrapper,'DYLD_FRAMEWORK_PATH="$DYLIB_PATH" DYLD_LIBRARY_PATH="$DYLIB_PATH" "$PLAYWRIGHT" "$@"',{mode:0o700});
 const executable=join(folder,'Playwright.app/Contents/MacOS/Playwright');if(binary){mkdirSync(join(folder,'Playwright.app/Contents/MacOS'),{recursive:true});writeFileSync(executable,'fictional packaged binary',{mode:0o700});}return {folder,wrapper,executable};
}
it('uses only the expected packaged Darwin WebKit binary and the inspected wrapper environment',()=>{
 const f=fixture(),result=darwinWebKitLaunch('webkit',f.wrapper,['2336'],'darwin');expect(result.executablePath).toBe(f.executable);expect(result.environment).toEqual({DYLD_FRAMEWORK_PATH:f.folder,DYLD_LIBRARY_PATH:f.folder});expect(result.identity!.binaryHash).toMatch(/^[a-f0-9]{64}$/);
});
it.each(['missing','revision','layout','not-executable'])('fails closed before launch for %s package',kind=>{
 const f=fixture(kind!=='missing',kind==='revision'?'9999':'2336');if(kind==='not-executable')chmodSync(f.executable,0o600);
 expect(()=>darwinWebKitLaunch('webkit',kind==='layout'?join(f.folder,'other.sh'):f.wrapper,['2336'],'darwin')).toThrow();
});
it('preserves default Chromium and non-Darwin WebKit launch',()=>{
 expect(darwinWebKitLaunch('chromium','unused',[],'darwin')).toEqual({});expect(darwinWebKitLaunch('webkit','unused',[],'linux')).toEqual({});
});
