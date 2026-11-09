import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,existsSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createServer} from 'node:net';
import {createOwnedNextApp} from '../src/test/integration/owned-next-app.ts';
const mode=process.argv[2];assert(['mutated','extra'].includes(mode));
assert(!process.env.DATABASE_URL);
const evidence=resolve(process.env.NEVORA_MIRROR_EVIDENCE_DIR??'../test-evidence/mirror-'+mode);
const root=mkdtempSync(join(tmpdir(),'nevora-mirror-probe-')),data=join(root,'data');
const port=await new Promise(r=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>r(p));});});
const bin=process.env.NEVORA_TEST_PG_BIN;
const pg=(args)=>{const r=spawnSync(join(bin,args[0]),args.slice(1),{encoding:'utf8'});assert.equal(r.status,0,r.stderr);};
let app,observed;
try{
 pg(['initdb','-D',data,'-U','nevora_probe','--auth-local=trust','--auth-host=trust','--encoding=UTF8','--no-locale']);
 pg(['pg_ctl','-D',data,'-l',join(root,'postgres.log'),'-w','start','-o',`-h 127.0.0.1 -p ${port} -k ''`]);
 process.env.FUEL_TEST_DATABASE_URL=`postgresql://nevora_probe@127.0.0.1:${port}/nevora_exchange_test_mirror_${port}`;
 process.env.FUEL_TEST_ALLOW_DESTRUCTIVE_TEARDOWN='yes';
 app=await createOwnedNextApp(evidence,{pinDevTypeReferences:true});
 for(const path of ['services/commerce/workspace-enrollment.ts','db/migrations/order.ts'])assert.deepEqual(readFileSync(join(app.mirror,path)),readFileSync(path),'Owned runtime dependency must retain canonical bytes: '+path);
 const file=join(app.mirror,'src/lib/navigation.ts');
 if(mode==='mutated')writeFileSync(file,readFileSync(file,'utf8')+'\n// fictional mutation probe\n');
 else writeFileSync(join(app.mirror,'src/lib/untracked-mirror-probe.ts'),'export const fictionalInjection=true;\n');
 try{await app.close();}catch(error){observed=String(error);}
 assert(observed?.includes('mirror')||observed?.includes('Source manifest mismatch'),'Mirror drift must fail after owned cleanup; got '+observed);
 console.log(JSON.stringify({mode,observed,ownership:JSON.parse(readFileSync(join(app.root,'ownership.json')))}));
}finally{
 if(app)try{await app.close();}catch{/* Expected fixture custody failure, resources already closed. */}
 if(existsSync(join(data,'postmaster.pid')))pg(['pg_ctl','-D',data,'-w','stop','-m','fast']);
 // Only fictional PostgreSQL fixture data; evidence/mirror/receipt are retained.
 rmSync(data,{recursive:true,force:true});
}
