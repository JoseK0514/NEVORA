import {expect,it} from 'vitest';
import {mkdtemp,mkdir,readFile,writeFile,chmod,lstat,symlink,rm,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {managedDestinations} from './managed-destinations';
import {parseWorkerEnrollmentRequest,workerEnrollmentRequestHash} from './worker-enrollment-store';
import {workerRecipientFingerprint} from './worker-enrollment';
const id='11111111-1111-4111-8111-111111111111',d=managedDestinations.test;
function run(args:string[]){return spawnSync(process.execPath,['--conditions=react-server','--import','./scripts/node-server-context.mjs','--import','tsx','scripts/worker-enrollment-operator.mts',...args],{env:{PATH:process.env.PATH,NODE_ENV:'test'},encoding:'utf8',timeout:15000});}
async function fixture(){const dir=await mkdtemp(join(await realpath(tmpdir()),'nv-enrollment-files-'));await chmod(dir,0o700);const input=join(dir,'scope.json');await writeFile(input,JSON.stringify({workspaceId:id,environment:'test',incarnation:'1',registryRevision:'1',sourceSecretRef:'33333333-3333-4333-8333-333333333333',loginRole:'nv_worker_'+'a'.repeat(24),canonicalOrigin:'https://fictional.'+d.portalBaseDomain,providerProjectId:'fictional-project',issuerSourceSha:'a'.repeat(40),requestExpiresAt:new Date(Date.now()+600000).toISOString(),expiresAt:new Date(Date.now()+3600000).toISOString()}),{mode:0o600});return {dir,input,output:join(dir,'request')};}
it('prepares fresh separate public request and private key files without secret output, then a curated host profile',async()=>{
 const f=await fixture();try{
  const result=run(['request',f.input,f.output]);expect(result.status,result.stderr).toBe(0);expect(result.stdout).toBe('{"state":"prepared"}\n');expect(result.stderr).toBe('');
  const request=parseWorkerEnrollmentRequest(JSON.parse(await readFile(join(f.output,'request.json'),'utf8'))),key=await readFile(join(f.output,'recipient.private.pem'),'utf8');expect(request.workspaceId).toBe(id);expect(request.recipientFingerprint).toBe(workerRecipientFingerprint(key));expect(JSON.stringify(request)).not.toContain('PRIVATE KEY');
  for(const path of ['request.json','recipient.private.pem','binding.json'])expect((await lstat(join(f.output,path))).mode&0o777).toBe(0o600);expect((await lstat(f.output)).mode&0o777).toBe(0o700);
  expect(JSON.parse(await readFile(join(f.output,'binding.json'),'utf8'))).toEqual({id:request.enrollmentId,requestHash:workerEnrollmentRequestHash(request)});
  const profileInput=join(f.dir,'profile-input.json');await writeFile(profileInput,JSON.stringify({profiles:[{request,recipientPrivateKeyFile:join(f.output,'recipient.private.pem'),controlDatabaseUrl:`postgresql://nv_control_worker_t_${id.replaceAll('-','')}:fictional@${d.controlHostname}/${d.controlDatabase}?sslmode=verify-full`,commands:['payroll']}]}),{mode:0o600});
  const prepared=run(['profile',profileInput,join(f.dir,'profile')]);expect(prepared.status,prepared.stderr).toBe(0);const profiles=JSON.parse(await readFile(join(f.dir,'profile','profiles.json'),'utf8'));expect(profiles[0].env.NEVORA_WORKER_RECIPIENT_PRIVATE_KEY).toBe(key);expect(profiles[0].env).not.toHaveProperty('NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY');expect(profiles[0].env).not.toHaveProperty('NEVORA_COMMERCE_BINDING_KEY');expect(prepared.stdout+prepared.stderr).not.toContain(key);
 }finally{await rm(f.dir,{recursive:true,force:true});}
});
it('rejects broad files, symlinks, existing output and secret-like CLI arguments with redacted errors',async()=>{
 const f=await fixture();try{
  await chmod(f.input,0o644);expect(run(['request',f.input,f.output]).status).toBe(1);await chmod(f.input,0o600);
  const link=join(f.dir,'scope-link.json');await symlink(f.input,link);expect(run(['request',link,f.output]).status).toBe(1);
  await mkdir(f.output,{mode:0o700});expect(run(['request',f.input,f.output]).status).toBe(1);
  const bad=run(['request','postgresql://private-password@foreign.invalid/db',f.output]);expect(bad.status).toBe(1);expect(bad.stdout).toBe('');expect(bad.stderr).toBe('worker_enrollment_operator_unavailable\n');
 }finally{await rm(f.dir,{recursive:true,force:true});}
});
