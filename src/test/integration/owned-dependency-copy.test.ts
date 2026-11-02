import {afterEach,expect,it,vi} from 'vitest';
import {chmodSync,lstatSync,mkdirSync,mkdtempSync,readFileSync,readlinkSync,rmSync,statSync,symlinkSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
vi.mock('node:child_process',async original=>({...await original<typeof import('node:child_process')>(),execFileSync:()=>{throw Error('Dependency copy must not fork a helper');}}));
import {copyOwnedDependencies} from './owned-next-app';
let root:string|undefined;
afterEach(()=>{if(root)rmSync(root,{recursive:true,force:true});root=undefined;});
it('copies independent nested dependency bytes, executable modes and verbatim relative links without a child process',()=>{
 root=mkdtempSync(join(tmpdir(),'nevora-dependency-copy-'));
 const source=join(root,'source'),mirror=join(root,'mirror'),modules=join(source,'node_modules');
 mkdirSync(join(modules,'package','bin'),{recursive:true});mkdirSync(join(modules,'.bin'));mkdirSync(mirror);
 const executable=join(modules,'package','bin','tool');writeFileSync(executable,'fictional tool');chmodSync(executable,0o755);
 symlinkSync('../package/bin/tool',join(modules,'.bin','tool'));
 copyOwnedDependencies(source,mirror);
 const copied=join(mirror,'node_modules','package','bin','tool');
 expect(readFileSync(copied,'utf8')).toBe('fictional tool');expect(statSync(copied).mode&0o777).toBe(0o755);
 expect(readlinkSync(join(mirror,'node_modules','.bin','tool'))).toBe('../package/bin/tool');
 writeFileSync(executable,'source changed');expect(readFileSync(copied,'utf8')).toBe('fictional tool');
 expect(readFileSync(join(mirror,'node_modules','.bin','tool'),'utf8')).toBe('fictional tool');
});
it('refuses missing dependencies rather than producing an empty successful mirror',()=>{
 const directory=mkdtempSync(join(tmpdir(),'nevora-dependency-copy-'));root=directory;
 expect(()=>copyOwnedDependencies(join(directory,'missing'),join(directory,'mirror'))).toThrow();
});
it('materializes a linked dependency root inside the mirror, keeping nested executable links relative',()=>{
 root=mkdtempSync(join(tmpdir(),'nevora-dependency-copy-'));
 const source=join(root,'source'),mirror=join(root,'mirror'),external=join(root,'external');
 mkdirSync(source);mkdirSync(mirror);mkdirSync(join(external,'.bin'),{recursive:true});
 mkdirSync(join(external,'next'));writeFileSync(join(external,'next','package.json'),'{"name":"next"}');
 symlinkSync('../next/package.json',join(external,'.bin','next'));
 symlinkSync(external,join(source,'node_modules'));
 copyOwnedDependencies(source,mirror);
 expect(lstatSync(join(mirror,'node_modules')).isSymbolicLink()).toBe(false);
 expect(readlinkSync(join(mirror,'node_modules','.bin','next'))).toBe('../next/package.json');
 writeFileSync(join(external,'next','package.json'),'changed');
 expect(readFileSync(join(mirror,'node_modules','next','package.json'),'utf8')).toBe('{"name":"next"}');
});
