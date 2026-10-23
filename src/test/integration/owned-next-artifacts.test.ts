import {randomUUID} from 'node:crypto';
import {mkdir,mkdtemp,readFile,rename,rm,symlink,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach,expect,it,vi} from 'vitest';

const state=vi.hoisted(()=>({failRemoval:false}));
vi.mock('node:fs/promises',async original=>{
 const fs=await original<typeof import('node:fs/promises')>();
 return {...fs,rm:(...args:Parameters<typeof fs.rm>)=>state.failRemoval?Promise.reject(Error('Owned derived removal failed')):fs.rm(...args)};
});
import {releaseOwnedDerivedArtifacts} from './owned-next-app';

const parents:string[]=[];
async function fixture(){
 const parent=await mkdtemp(join(tmpdir(),'nevora-derived-fixture-'));parents.push(parent);
 const source=join(parent,'source'),evidence=join(parent,'evidence');await mkdir(source);await mkdir(evidence);
 const root=await mkdtemp(join(evidence,'owned-next-')),mirror=join(root,'app'),ownerId=randomUUID();
 await mkdir(join(mirror,'node_modules'),{recursive:true});await mkdir(join(mirror,'.next/cache'),{recursive:true});await mkdir(join(mirror,'src'));
 await writeFile(join(mirror,'node_modules/fixture'),'copied dependency');await writeFile(join(mirror,'.next/cache/fixture'),'generated cache');
 await writeFile(join(mirror,'src/fixture'),'preserved mirrored source');await writeFile(join(source,'fixture'),'preserved original source');
 await writeFile(join(root,'source-manifest.json'),'preserved manifest');await writeFile(join(root,'next.log'),'preserved log');
 const metadata={root,source,ownerId,closed:true,sourceVerified:true,mirrorVerified:true};
 const marker=join(root,'ownership.json'),writeMarker=(patch:Record<string,unknown>={})=>writeFile(marker,JSON.stringify({...metadata,...patch}));await writeMarker();
 return {parent,source,root,mirror,ownerId,marker,metadata,writeMarker};
}
afterEach(async()=>{state.failRemoval=false;for(const parent of parents.splice(0))await rm(parent,{recursive:true,force:true});});

it('releases only derived trees and never follows their nested links into original source',async()=>{
 const f=await fixture();await symlink(f.source,join(f.mirror,'node_modules/original-source'),'dir');
 const released=await releaseOwnedDerivedArtifacts(f.root,f.source,f.ownerId);
 expect(released.directories).toEqual(['app/node_modules','app/.next']);
 expect(Number.isFinite(released.availableBytesBefore)).toBe(true);expect(released.availableBytesBefore).toBeGreaterThanOrEqual(0);
 expect(Number.isFinite(released.availableBytesAfter)).toBe(true);expect(released.availableBytesAfter).toBeGreaterThanOrEqual(0);
 await expect(readFile(join(f.mirror,'node_modules/fixture'))).rejects.toMatchObject({code:'ENOENT'});
 await expect(readFile(join(f.mirror,'.next/cache/fixture'))).rejects.toMatchObject({code:'ENOENT'});
 expect(await readFile(join(f.source,'fixture'),'utf8')).toBe('preserved original source');
 expect(await readFile(join(f.mirror,'src/fixture'),'utf8')).toBe('preserved mirrored source');
 expect(await readFile(join(f.root,'source-manifest.json'),'utf8')).toBe('preserved manifest');
 expect(await readFile(join(f.root,'next.log'),'utf8')).toBe('preserved log');
 expect(JSON.parse(await readFile(f.marker,'utf8'))).toEqual(f.metadata);
});

it.each([
 {name:'owner',patch:{ownerId:'different-owner'}},
 {name:'root',patch:{root:'/different-owner'}},
 {name:'source',patch:{source:'/different-source'}},
 {name:'still open',patch:{closed:false}},
 {name:'unverified source',patch:{sourceVerified:false}},
 {name:'unverified mirror',patch:{mirrorVerified:false}},
])('preserves all derived data when ownership is $name',async({patch})=>{
 const f=await fixture();await f.writeMarker(patch);
 await expect(releaseOwnedDerivedArtifacts(f.root,f.source,f.ownerId)).rejects.toThrow('verified closed ownership');
 expect(await readFile(join(f.mirror,'node_modules/fixture'),'utf8')).toBe('copied dependency');
 expect(await readFile(join(f.mirror,'.next/cache/fixture'),'utf8')).toBe('generated cache');
});

it('rejects a mirror symlink without deleting the source or parked mirror',async()=>{
 const f=await fixture(),parked=join(f.root,'parked-app');await rename(f.mirror,parked);await symlink(f.source,f.mirror,'dir');
 await expect(releaseOwnedDerivedArtifacts(f.root,f.source,f.ownerId)).rejects.toThrow('ownership paths changed');
 expect(await readFile(join(f.source,'fixture'),'utf8')).toBe('preserved original source');
 expect(await readFile(join(parked,'node_modules/fixture'),'utf8')).toBe('copied dependency');
});

it('validates both target trees before deleting either one',async()=>{
 const f=await fixture();await rm(join(f.mirror,'.next'),{recursive:true});await symlink(f.source,join(f.mirror,'.next'),'dir');
 await expect(releaseOwnedDerivedArtifacts(f.root,f.source,f.ownerId)).rejects.toThrow('target escaped');
 expect(await readFile(join(f.mirror,'node_modules/fixture'),'utf8')).toBe('copied dependency');
 expect(await readFile(join(f.source,'fixture'),'utf8')).toBe('preserved original source');
});

it('rejects a linked ownership marker even when its JSON matches',async()=>{
 const f=await fixture(),external=join(f.parent,'external-marker');await rename(f.marker,external);await symlink(external,f.marker);
 await expect(releaseOwnedDerivedArtifacts(f.root,f.source,f.ownerId)).rejects.toThrow('ownership paths changed');
 expect(await readFile(join(f.mirror,'node_modules/fixture'),'utf8')).toBe('copied dependency');
});

it('rejects a linked owned root',async()=>{
 const f=await fixture(),alias=join(f.parent,'owned-next-alias');await symlink(f.root,alias,'dir');
 await expect(releaseOwnedDerivedArtifacts(alias,f.source,f.ownerId)).rejects.toThrow('ownership paths changed');
 expect(await readFile(join(f.mirror,'node_modules/fixture'),'utf8')).toBe('copied dependency');
});

it.each(['node_modules','.next'])('refuses a plain-file %s target',async name=>{
 const f=await fixture();await rm(join(f.mirror,name),{recursive:true});await writeFile(join(f.mirror,name),'preserved unexpected file');
 await expect(releaseOwnedDerivedArtifacts(f.root,f.source,f.ownerId)).rejects.toThrow('target escaped');
 expect(await readFile(join(f.mirror,name),'utf8')).toBe('preserved unexpected file');
});

it('rejects a cleanup root within original source before allocating or deleting anything',async()=>{
 const f=await fixture();
 await expect(releaseOwnedDerivedArtifacts(join(f.source,'owned-next-inside'),f.source,f.ownerId)).rejects.toThrow('outside the repository');
 expect(await readFile(join(f.source,'fixture'),'utf8')).toBe('preserved original source');
});

it('propagates removal failures instead of reporting cleanup success',async()=>{
 const f=await fixture();state.failRemoval=true;
 await expect(releaseOwnedDerivedArtifacts(f.root,f.source,f.ownerId)).rejects.toThrow('Owned derived removal failed');
 expect(await readFile(join(f.mirror,'node_modules/fixture'),'utf8')).toBe('copied dependency');
});

it('can verify an already released mirror without removing its evidence',async()=>{
 const f=await fixture();await releaseOwnedDerivedArtifacts(f.root,f.source,f.ownerId);
 expect((await releaseOwnedDerivedArtifacts(f.root,f.source,f.ownerId)).directories).toEqual([]);
 expect(await readFile(join(f.root,'source-manifest.json'),'utf8')).toBe('preserved manifest');
});
