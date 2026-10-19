// STATIC ONLY. Narrow path-agnostic exact-source initial pending withdrawals; never executes a withdrawal.
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {registerHooks} from 'node:module';
import {readFile,writeFile,realpath} from 'node:fs/promises';
import {join,relative,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
const SHA='cd764f614be8ca5b5215be19d46e07cf968638d7';
const TREE='64bc4c24afac005ce5270b3d65112a797b59b511';
const SOURCE_HASHES={"src/test/integration/shift-change-api.ts":"57a529ef303aa417081c71a81a52d89b7c52fdf52acdb3d1c0fd9ac40b870ee7","src/lib/data/requests.ts":"ceea9c1bf919eb071acab558cb59c4c85a0c33ac719e56ff7b8d4580ae155ca1","src/lib/time-off-withdrawal.ts":"41d4fe907058a831043db9a16851b54b9c01de9008a2912bdb53cc6b984b2734","src/lib/date-utils.ts":"4e4545d0a4a70df78fde730fb3bd99823c47ec5758e12d2e471142f8454a1e41"};
export async function seedInitialOwnWithdrawals({database,identity,root,source}:any,report:any,evidence:string){
 assert.equal(process.env.READY_REVIEW_RELEASED_SHA,SHA,'Exact source not released');
 const git=(...args:string[])=>execFileSync('git',args,{cwd:source,encoding:'utf8'}).trim();
 assert.equal(git('rev-parse','HEAD'),SHA);assert.equal(git('rev-parse','HEAD^{tree}'),TREE);
 assert.equal(git('status','--porcelain','--untracked-files=no'),'','Dirty source');
 for(const [file,hash] of Object.entries(SOURCE_HASHES))assert.equal(createHash('sha256').update(await readFile(join(source,file))).digest('hex'),hash,'Source import changed: '+file);
 assert.match(identity.name,/^nevora_exchange_test_audit_[a-f0-9]{12}$/);assert.ok(identity.marker?.startsWith('fuel-phase3-disposable:'));
 const ownedRoot=await realpath(root),preview=await realpath(process.env.PREVIEW_OUT??''),child=relative(preview,ownedRoot);
 assert.ok(child&&!child.startsWith('..')&&!isAbsolute(child),'Root is outside owned preview');
 const q=(text:string,values:any[]=[])=>database.executor.query({text,values});
 const identityRead=()=>q("SELECT datname AS name,oid::int AS oid,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()");
 assert.deepEqual((await identityRead())[0],identity,'Initial withdrawal DB identity mismatch');
 assert.equal((await q('SELECT count(*)::int n FROM communications'))[0].n,0,'Must run before publication/listen');
 assert.match(report.fixtureDate??'',/^\d{4}-\d{2}-\d{2}$/,'Initial fixture date missing');
 await writeFile(join(ownedRoot,'initial-own-withdrawals.started'),JSON.stringify({source:SHA,kind:'initial-only',at:new Date().toISOString()}),{flag:'wx'});
 const hook=registerHooks({resolve(specifier:any,context:any,next:any){return next(specifier==='server-only'?pathToFileURL(join(source,'node_modules/next/dist/compiled/server-only/empty.js')).href:specifier,context);}});
 try{
  const {fixtureProof}=await import(pathToFileURL(join(source,'src/test/integration/shift-change-api.ts')).href);
  const {createTimeOffRequest,getTimeOffRequest}=await import(pathToFileURL(join(source,'src/lib/data/requests.ts')).href);
  const {parseWithdrawalCommand,withdrawalIdentity}=await import(pathToFileURL(join(source,'src/lib/time-off-withdrawal.ts')).href);
  const {addDays}=await import(pathToFileURL(join(source,'src/lib/date-utils.ts')).href);
  const actors=[];
  for(const account of ['AUDIT-E','AUDIT-LEAD']){
   const proof=await fixtureProof(database.executor,account);
   assert.equal(proof.employee.id,account);assert.equal(proof.employee.role,account==='AUDIT-E'?'EMPLOYEE':'LEAD');
   const existing=await q("SELECT id FROM time_off_requests WHERE employee_id=$1 AND status='PENDING' AND id~'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' ORDER BY created_at DESC,id LIMIT 1",[account]);
   const requestId=existing[0]?.id??randomUUID();
   if(!existing.length){
    const date=addDays(report.fixtureDate,account==='AUDIT-E'?60:62);
    await createTimeOffRequest({requestId,employeeId:account,proof,startDate:date,endDate:date,reason:'Fictional Phase3 withdrawal inspection prerequisite'},database.executor);
   }
   const read=await getTimeOffRequest(requestId,database.executor);
   assert.ok(read?.employeeId===account&&read.status==='PENDING','Own canonical pending read failed');
   const command=parseWithdrawalCommand({requestId,operationId:withdrawalIdentity(requestId)});
   assert.equal(command.requestId,requestId,'Pending fixture is not withdrawable by the actual command contract');
   actors.push({account,requestId,created:!existing.length,status:read.status,ownActorVerified:true,canonicalCommandValid:true});
  }
  assert.deepEqual((await identityRead())[0],identity,'DB identity changed');
  const manifest={checkpoint:SHA,source,tree:TREE,initializedBeforeListen:true,kind:'canonical own pending UUIDv4 initial fixture',sourceHashes:SOURCE_HASHES,identity,actors,preservesLegacyAuditTimeoff:true,withdrawalExecuted:false,secretsIncluded:false,domReadback:'Required after listen: form selected by exact manifest requestId, actual own cookie, hidden immutable operation identity, visible confirmation/action'};
  const file=join(evidence,'initial-own-withdrawal-fixture.json');await writeFile(file,JSON.stringify(manifest,null,2));
  report.initialOwnWithdrawals={manifest:file,initializedBeforeListen:true,actors};
  report.checks.push({name:'Canonical own pending UUIDv4 withdrawal fixtures verified before publication/listen',passed:true});
  return report.initialOwnWithdrawals;
 }finally{hook.deregister();}
}
