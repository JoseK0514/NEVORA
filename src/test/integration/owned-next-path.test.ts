import {it,expect} from 'vitest';
import {mkdtemp,mkdir,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {assertExternalEvidencePath} from './owned-next-app';
it('H08 rejects repository, child and dotdot-name child, permits sibling',async()=>{
 const root=await mkdtemp(join(tmpdir(),'owned-path-'));
 try {const repo=join(root,'repo');await mkdir(repo);
 for(const value of [repo,join(repo,'child'),join(repo,'..evidence')])await expect(assertExternalEvidencePath(repo,value)).rejects.toThrow('outside');
 await expect(assertExternalEvidencePath(repo,join(root,'sibling'))).resolves.toBeUndefined();
 await expect(assertExternalEvidencePath(repo,'relative')).rejects.toThrow('outside');
 } finally {await rm(root,{recursive:true,force:true});}
});
it('H08 resolves existing symlink parents before accepting an outside destination',async()=>{
 const root=await mkdtemp(join(tmpdir(),'owned-path-'));
 try {const repo=join(root,'repo');await mkdir(repo);await symlink(repo,join(root,'linked'));
 await expect(assertExternalEvidencePath(repo,join(root,'linked','future-evidence'))).rejects.toThrow('outside');
 } finally {await rm(root,{recursive:true,force:true});}
});
