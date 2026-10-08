import {chmodSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {afterEach,expect,it} from 'vitest';
const runtimeModule=resolve('scripts/phase-e-browser-qa.mjs');
const {darwinWebKitLaunch}=await import(runtimeModule);
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
