import {constants} from 'node:fs';
import {open,lstat,realpath,mkdir,rm} from 'node:fs/promises';
import {resolve,dirname,isAbsolute,join} from 'node:path';
import {generateKeyPairSync,randomUUID,randomBytes} from 'node:crypto';
import {isClosedRecord} from '../src/lib/onboarding/contracts';
import {parseWorkerEnrollmentRequest,workerEnrollmentRequestHash} from '../src/lib/operations/worker-enrollment-store';
import {workerRecipientFingerprint} from '../src/lib/operations/worker-enrollment';
import {parseManagedHostConfig} from '../src/lib/operations/managed-host';
import {managedDestinations} from '../src/lib/operations/managed-destinations';
const invalid=()=>Error('worker_enrollment_operator_unavailable');
async function privateDirectory(path:string){
 if(!isAbsolute(path)||resolve(path)!==path||await realpath(path)!==path)throw invalid();const stat=await lstat(path);
 if(!stat.isDirectory()||stat.uid!==process.getuid?.()||(stat.mode&0o777)!==0o700)throw invalid();
}
async function readPrivate(path:unknown){
 if(typeof path!=='string'||!isAbsolute(path)||resolve(path)!==path||await realpath(path)!==path)throw invalid();await privateDirectory(dirname(path));
 const file=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);try{const stat=await file.stat();if(!stat.isFile()||stat.uid!==process.getuid?.()||(stat.mode&0o777)!==0o600||stat.nlink!==1||stat.size<1||stat.size>32768)throw invalid();return await file.readFile('utf8');}finally{await file.close();}
}
async function writePrivate(path:string,value:string){const file=await open(path,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);try{await file.writeFile(value);await file.sync();}finally{await file.close();}}
let created:string|undefined;
try{
 const [command,input,output,...extra]=process.argv.slice(2);
 if(extra.length||!['request','profile'].includes(command)||!input||!output||!isAbsolute(output)||resolve(output)!==output)throw invalid();
 await privateDirectory(dirname(output));const data:unknown=JSON.parse(await readPrivate(input));
 const files:Record<string,string>={};
 if(command==='request'){
  if(!isClosedRecord(data,['workspaceId','environment','incarnation','registryRevision','sourceSecretRef','loginRole','canonicalOrigin','providerProjectId','issuerSourceSha','requestExpiresAt','expiresAt']))throw invalid();
  const pair=generateKeyPairSync('rsa',{modulusLength:3072,publicKeyEncoding:{format:'pem',type:'spki'},privateKeyEncoding:{format:'pem',type:'pkcs8'}}),request=parseWorkerEnrollmentRequest({...data,schemaVersion:1,enrollmentId:randomUUID(),recipientPublicKey:pair.publicKey,recipientFingerprint:workerRecipientFingerprint(pair.publicKey)});
  if(Date.parse(request.requestExpiresAt)<=Date.now()||Date.parse(request.requestExpiresAt)>Date.now()+1800000||Date.parse(request.expiresAt)>Date.now()+86400000)throw invalid();
  files['request.json']=JSON.stringify(request,null,2)+'\n';files['recipient.private.pem']=pair.privateKey;files['binding.json']=JSON.stringify({id:request.enrollmentId,requestHash:workerEnrollmentRequestHash(request)})+'\n';
 }else{
  if(!isClosedRecord(data,['profiles'])||!Array.isArray(data.profiles)||data.profiles.length<1||data.profiles.length>2)throw invalid();let source='';
  const profiles=[];
  for(const p of data.profiles){
   if(!isClosedRecord(p,['request','recipientPrivateKeyFile','controlDatabaseUrl','commands'])||typeof p.controlDatabaseUrl!=='string')throw invalid();
   const request=parseWorkerEnrollmentRequest(p.request),key=await readPrivate(p.recipientPrivateKeyFile);if(workerRecipientFingerprint(key)!==request.recipientFingerprint||Date.parse(request.expiresAt)<=Date.now()||source&&source!==request.issuerSourceSha)throw invalid();source=request.issuerSourceSha;
   profiles.push({scopeId:request.workspaceId,environment:request.environment,origin:request.canonicalOrigin,portalBaseDomain:managedDestinations.test.portalBaseDomain,commands:p.commands,env:{NEVORA_CONTROL_DATABASE_URL:p.controlDatabaseUrl,NEVORA_WORKER_ENROLLMENT_ID:request.enrollmentId,NEVORA_WORKER_RECIPIENT_PRIVATE_KEY:key,NEVORA_COMMERCE_ENABLED:'true',NEVORA_COMMERCE_API_ORIGIN:managedDestinations.test.commerceOrigin,NEVORA_PAYROLL_ENABLED:'true'}});
  }
  // Validate through the actual host policy. This operator's initial profile is
  // payroll-only; notification delivery requires its separately reviewed setup.
  parseManagedHostConfig({NEVORA_WORKFORCE_ENABLED:'true',NEVORA_WORKFORCE_SOURCE_SHA:source,NEVORA_WORKFORCE_STATE_DIR:'/var/lib/nevora',NEVORA_WORKFORCE_HEALTH_KEY:randomBytes(32).toString('base64url'),NEVORA_WORKFORCE_PROFILES:JSON.stringify(profiles)},source,managedDestinations);
  files['profiles.json']=JSON.stringify(profiles,null,2)+'\n';
 }
 await mkdir(output,{mode:0o700});created=output;await privateDirectory(output);for(const [name,value] of Object.entries(files))await writePrivate(join(output,name),value);
 process.stdout.write('{"state":"prepared"}\n');
}catch{if(created)await rm(created,{recursive:true,force:true}).catch(()=>{});process.stderr.write('worker_enrollment_operator_unavailable\n');process.exitCode=1;}
