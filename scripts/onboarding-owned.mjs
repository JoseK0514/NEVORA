import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,existsSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createServer} from 'node:net';
import {randomBytes} from 'node:crypto';

// This runner owns a NEW loopback server; it cannot accept application targets.
if(process.env.DATABASE_URL||process.env.NEVORA_CONTROL_DATABASE_URL||process.env.FUEL_TEST_DATABASE_URL)throw Error('Unset existing application/test database targets before owned onboarding tests.');
const args=process.argv.slice(2),suites=['registration','isolation-routing','isolation-auth','provisioning','owner-activation','setup','people','invitations','journey','operations','commerce','all'];
const suite=args.length===0?'all':args.length===2&&args[0]==='--suite'?args[1]:null;
if(!suite||!suites.includes(suite))throw Error('Use --suite with a documented onboarding suite.');
const localBinary=resolve('.superpowers/sdd/2026-11-07-self-service-owner-onboarding/tools/postgres17/package/native/bin');
const bin=process.env.NEVORA_TEST_PG_BIN??localBinary;
if(!existsSync(join(bin,'initdb'))||!existsSync(join(bin,'pg_ctl')))throw Error('NEVORA_TEST_PG_BIN must identify an existing PostgreSQL binary directory.');
const port=await new Promise((ok,bad)=>{const s=createServer();s.once('error',bad);s.listen(0,'127.0.0.1',()=>{const a=s.address();s.close(()=>ok(a.port));});});
const owned=mkdtempSync(join(tmpdir(),'nv-onboarding-')),data=join(owned,'data'),marker=randomBytes(16).toString('hex'),password=randomBytes(24).toString('base64url'),user='nv_onboard_'+marker.slice(0,8);
writeFileSync(join(owned,'owner'),marker,{mode:0o600});writeFileSync(join(owned,'password'),password,{mode:0o600});
function run(name,a){const r=spawnSync(join(bin,name),a,{encoding:'utf8',timeout:60000});if(r.error||r.status!==0)throw Error('Owned PostgreSQL '+name+' failed: '+(r.error?.message??r.stderr??r.stdout));}
let exit=1;
try{
 run('initdb',['-D',data,'-U',user,'--auth-local=scram-sha-256','--auth-host=scram-sha-256','--pwfile',join(owned,'password'),'--encoding=UTF8','--no-locale']);
 run('pg_ctl',['-D',data,'-l',join(owned,'postgres.log'),'-w','start','-o',`-h 127.0.0.1 -p ${port} -k ${owned}`]);
 console.log('Owned onboarding PostgreSQL started on loopback; existing databases are not used.');
 const env={PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR,NODE_ENV:'test',NEVORA_ONBOARDING_TEST_ADMIN_URL:`postgresql://${user}:${password}@127.0.0.1:${port}/postgres`,NEVORA_ONBOARDING_TEST_CUSTODY_DIR:owned,NEVORA_ONBOARDING_TEST_CUSTODY:marker,NEVORA_ONBOARDING_TEST_SUITE:suite,NEVORA_TEST_PG_BIN:bin,NEVORA_TEST_PG_CLIENT_BIN:process.env.NEVORA_TEST_PG_CLIENT_BIN??(existsSync(resolve('.superpowers/sdd/2026-11-07-self-service-owner-onboarding/tools/pgclients17/bin/pg_dump'))?resolve('.superpowers/sdd/2026-11-07-self-service-owner-onboarding/tools/pgclients17/bin'):bin)};
 const r=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run','--config','vitest.onboarding-integration.config.mts'],{env,stdio:'inherit'});exit=r.status??1;
}finally{
 if(existsSync(join(data,'postmaster.pid')))run('pg_ctl',['-D',data,'-w','stop','-m','fast']);
 if(readFileSync(join(owned,'owner'),'utf8')!==marker)throw Error('Owned onboarding cleanup custody mismatch');
 rmSync(owned,{recursive:true,force:true});console.log('Owned onboarding PostgreSQL stopped and temporary cluster removed.');
}
process.exitCode=exit;
