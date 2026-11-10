import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {isAbsolute,join} from 'node:path';
const git=(...args)=>{const r=spawnSync('git',args,{encoding:'utf8',timeout:10000});assert.equal(r.status,0);return r.stdout.trim();};
const source=git('rev-parse','HEAD'),output=process.argv[2];assert.equal(git('status','--porcelain'),'','Enrollment acceptance requires committed clean source');assert(output&&isAbsolute(output)&&process.argv.length===3,'Supply a new absolute evidence directory');await mkdir(output,{mode:0o700});
const env={PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR,NODE_ENV:'production'},bundle=join(output,'provisioner-bundle');
for(const [name,args] of [['build',['scripts/build-neon-onboarding.mjs','--provisioner-only',bundle]],['verify',['scripts/verify-neon-onboarding.mjs','--provisioner-only',bundle]]]){
 const result=spawnSync(process.execPath,args,{env,encoding:'utf8',timeout:60000,maxBuffer:1024*1024});await writeFile(join(output,name+'.log'),result.stdout+result.stderr,{mode:0o600});assert.equal(result.status,0,'Enrollment '+name+' failed');
}
assert.equal(git('rev-parse','HEAD'),source);assert.equal(git('status','--porcelain'),'');await writeFile(join(output,'report.json'),JSON.stringify({sourceSha:source,state:'passed',actualProvisionerZipVerified:true,enrollmentModeDefaultsClosed:true,localTriggerSimulationOnly:true,hosted:false})+'\n',{mode:0o600});console.log(JSON.stringify({sourceSha:source,state:'passed',output}));
