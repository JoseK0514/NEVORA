import {expect,it} from 'vitest';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {join,resolve} from 'node:path';
import {generateKeyPairSync} from 'node:crypto';
import {managedDestinations} from './managed-destinations';
it('preflights the real compiled host and enrolled profiles without opening a listener or starting workers',async()=>{
 const dir=await mkdtemp(resolve('.superpowers/preflight-fixture-')),source='a'.repeat(40),path=join(dir,'host.mjs');
 try{
  await build({entryPoints:['scripts/managed-workforce-host.mts'],outfile:path,bundle:true,format:'esm',platform:'node',target:'node24',packages:'external',alias:{'server-only':resolve('node_modules/next/dist/compiled/server-only/empty.js')},define:{__NEVORA_NEON_BUILD_SOURCE_SHA__:JSON.stringify(source)},logLevel:'silent'});
  const run=(env:Record<string,string>)=>spawnSync(process.execPath,[path,'--validate-config'],{env:{NODE_ENV:'test',PATH:process.env.PATH,RENDER_GIT_COMMIT:source,...env},encoding:'utf8',timeout:2000});
  const closed=run({});expect(closed.status,closed.stderr).toBe(0);expect(closed.stdout).toBe('{"state":"valid","enabled":false,"profiles":0}\n');
  const key=generateKeyPairSync('rsa',{modulusLength:3072,publicKeyEncoding:{format:'pem',type:'spki'},privateKeyEncoding:{format:'pem',type:'pkcs8'}}).privateKey,id='11111111-1111-4111-8111-111111111111',d=managedDestinations.test;
  const profile={scopeId:id,environment:'test',origin:'https://fictional.'+d.portalBaseDomain,portalBaseDomain:d.portalBaseDomain,commands:['payroll'],env:{NEVORA_CONTROL_DATABASE_URL:`postgresql://nv_control_worker_t_${id.replaceAll('-','')}:fictional@${d.controlHostname}/${d.controlDatabase}?sslmode=verify-full`,NEVORA_WORKER_ENROLLMENT_ID:'22222222-2222-4222-8222-222222222222',NEVORA_WORKER_RECIPIENT_PRIVATE_KEY:key,NEVORA_COMMERCE_ENABLED:'true',NEVORA_COMMERCE_API_ORIGIN:d.commerceOrigin,NEVORA_PAYROLL_ENABLED:'true'}};
  const env={NEVORA_WORKFORCE_ENABLED:'true',NEVORA_WORKFORCE_SOURCE_SHA:source,NEVORA_WORKFORCE_STATE_DIR:join(dir,'must-not-create'),NEVORA_WORKFORCE_HEALTH_KEY:Buffer.alloc(32,1).toString('base64url'),NEVORA_WORKFORCE_PROFILES:JSON.stringify([profile])},valid=run(env);expect(valid.status,valid.stderr).toBe(0);expect(valid.stdout).toBe('{"state":"valid","enabled":true,"profiles":1}\n');expect(valid.stdout+valid.stderr).not.toContain(key);
  const other='44444444-4444-4444-8444-444444444444',legacyEnv:Record<string,string>={...profile.env,NEVORA_CONTROL_DATABASE_URL:profile.env.NEVORA_CONTROL_DATABASE_URL.replace(id.replaceAll('-',''),other.replaceAll('-','')),NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY:Buffer.alloc(32,2).toString('base64url'),NEVORA_COMMERCE_WORKER_BINDING_KEY:Buffer.alloc(32,3).toString('base64url')};delete legacyEnv.NEVORA_WORKER_ENROLLMENT_ID;delete legacyEnv.NEVORA_WORKER_RECIPIENT_PRIVATE_KEY;const legacy={...profile,scopeId:other,env:legacyEnv};
  for(const profiles of [[profile,legacy],[legacy,profile]]){const rejected=run({...env,NEVORA_WORKFORCE_PROFILES:JSON.stringify(profiles)});expect(rejected.status).toBe(1);expect(rejected.stderr).toBe('managed_workforce_unavailable\n');}
  const ambient=run({...env,NEVORA_PROVISIONER_API_KEY:'fictional-provider-secret'});expect(ambient.status).toBe(1);expect(ambient.stderr).toBe('managed_workforce_unavailable\n');
  const mixed=run({...env,NEVORA_WORKFORCE_PROFILES:JSON.stringify([{...profile,env:{...profile.env,NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY:Buffer.alloc(32,2).toString('base64url')}}])});expect(mixed.status).toBe(1);expect(mixed.stderr).toBe('managed_workforce_unavailable\n');expect(mixed.stdout).toBe('');
 }finally{await rm(dir,{recursive:true,force:true});}
});
