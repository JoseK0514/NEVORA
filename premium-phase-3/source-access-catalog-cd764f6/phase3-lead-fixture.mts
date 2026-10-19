// STATIC PREPARATION ONLY. Invoke once inside the released owned beforeListen callback.
// Private source fixture helper copied byte-exact; no integration/Vitest module is imported.
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {registerHooks} from 'node:module';
import {readFile,writeFile,realpath} from 'node:fs/promises';
import {join,relative,isAbsolute,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const SOURCE_SHA='cd764f614be8ca5b5215be19d46e07cf968638d7';
const SOURCE_TREE='64bc4c24afac005ce5270b3d65112a797b59b511';
const SOURCE_PATH='/workspace/inspect-phase3-final';
const SOURCE_HASHES={"src/test/integration/clocker-time-corrections.integration.ts":"a388aca855218e37156834b91dd0f703d5d5ac2d93f8bb07b57eacc1d2bfd870","src/test/integration/payroll-preview-fixture.ts":"41462a7d5deaf2d331e7c400b92c079cbfa71efac9e360f88496d1ef25c8dd65","src/test/integration/payroll-fixture.ts":"7f830da23d54caea79f7a8bfa3be8cfa0b44850da8479d124bc487654824278f","src/test/integration/shift-change-api.ts":"57a529ef303aa417081c71a81a52d89b7c52fdf52acdb3d1c0fd9ac40b870ee7","src/lib/data/employee-time.server.ts":"1c289e6aaa01331eabd276c864b7a45e2ec6ad3d52dcc1a8b87b8f27ef9f4e6b","src/lib/data/time-corrections.server.ts":"a20e6c7ac4d162b7f9f265df709045feee18f641508eecc4cfd75c23f389a73e","src/lib/employee-time.ts":"0f8f7e75cc131b5d19369b818a74de349dab5513117d0ac4b8edf3e0d332d327","src/lib/time-corrections/read-model.ts":"05d6807ad0592164791fe83bbf08db3e5d2fcee8518380167034e4fc52838835","src/lib/data/requests.ts":"ceea9c1bf919eb071acab558cb59c4c85a0c33ac719e56ff7b8d4580ae155ca1","src/lib/time-off-withdrawal.ts":"41d4fe907058a831043db9a16851b54b9c01de9008a2912bdb53cc6b984b2734","src/lib/date-utils.ts":"4e4545d0a4a70df78fde730fb3bd99823c47ec5758e12d2e471142f8454a1e41"};
const HELPER_SHA256='458115a0d90011ddc2ca4e01287b576a6b673737dc214cec5d363bed9b621643';
const sha256=(value:any)=>createHash('sha256').update(value).digest('hex');
let f:any;

const isoAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

async function seedClosedEntry(options: {
  id?: string;
  employeeId?: string;
  startMinutesAgo?: number;
  endMinutesAgo?: number;
  withBreak?: boolean;
} = {}) {
  const id = options.id ?? 'd2-entry-1';
  const employeeId = options.employeeId ?? 'c34-a';
  const startAt = isoAgo(options.startMinutesAgo ?? 240);
  const endAt = isoAgo(options.endMinutesAgo ?? 120);
  await f.q(
    `INSERT INTO time_entries(
       id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version
     ) VALUES($1,$2,'loc-1',$3,$4::timestamptz,$5::timestamptz,'CLOCKED_OUT',4)`,
    [id, employeeId, f.devices[0].device.id, startAt, endAt],
  );
  let breakId: string | null = null;
  if (options.withBreak) {
    breakId = `${id}-break`;
    const snapshot = {
      id: f.breakType!.id,
      version: f.breakType!.version,
      name: f.breakType!.name,
      category: f.breakType!.category,
      targetMinutes: f.breakType!.targetMinutes,
    };
    await f.q(
      `INSERT INTO break_entries(
         id,time_entry_id,break_start_at,break_end_at,version,break_type_id,break_type_snapshot
       ) VALUES($1,$2,$3::timestamptz,$4::timestamptz,2,$5,$6::jsonb)`,
      [breakId, id, isoAgo(190), isoAgo(175), f.breakType!.id, JSON.stringify(snapshot)],
    );
  }
  return { id, breakId, startAt, endAt };
}

/** Initial fixture writes only, before communications publication and first listener. */
export async function seedPhase3LeadFixture(owned:any,report:any,evidence:string){
 const {database,identity,root,source}=owned;
 assert.equal(process.env.READY_REVIEW_RELEASED_SHA,SOURCE_SHA,'Coordinator has not released this exact SHA');
 assert.equal(process.env.INSPECTION_PHASE3_ENTRY_FIXTURE,'yes','Phase3 fixture extension was not explicitly selected');
 assert.equal(resolve(source),SOURCE_PATH,'Unexpected source worktree');
 const git=(...args:string[])=>execFileSync('git',args,{cwd:source,encoding:'utf8'}).trim();
 assert.equal(git('rev-parse','HEAD'),SOURCE_SHA,'Source drift');
 assert.equal(git('rev-parse','HEAD^{tree}'),SOURCE_TREE,'Source tree drift');
 assert.equal(git('status','--porcelain','--untracked-files=no'),'','Dirty source');
 assert.match(identity.name,/^nevora_exchange_test_audit_[a-f0-9]{12}$/);
 assert.ok(identity.marker?.startsWith('fuel-phase3-disposable:'),'Owned database marker required');
 const preview=await realpath(process.env.PREVIEW_OUT??'');
 const realRoot=await realpath(root),child=relative(preview,realRoot);
 assert.ok(child&&!child.startsWith('..')&&!isAbsolute(child),'Fixture root must be inside owned preview');
 for(const [path,expected] of Object.entries(SOURCE_HASHES))assert.equal(sha256(await readFile(join(source,path))),expected,'Fixture source drift: '+path);
 const sourceFixture=await readFile(join(source,'src/test/integration/clocker-time-corrections.integration.ts'),'utf8');
 const sourceHelper=sourceFixture.slice(sourceFixture.indexOf('async function seedClosedEntry('),sourceFixture.indexOf('\nasync function submitEntryResult')).trimEnd();
 assert.equal(sha256(sourceHelper),HELPER_SHA256,'Canonical source helper changed');
 const q=(text:string,values:any[]=[])=>database.executor.query({text,values});
 const [actual]=await q("SELECT datname AS name,oid::int AS oid,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()");
 assert.deepEqual(actual,identity,'Phase3 initial fixture DB identity mismatch');
 const [{n:communications}]=await q('SELECT count(*)::int n FROM communications');
 assert.equal(communications,0,'Entry extension must run before communications publication and listen');
 await writeFile(join(realRoot,'phase3-entry-initialization.started'),JSON.stringify({source:SOURCE_SHA,kind:'initial-only',at:new Date().toISOString()}),{flag:'wx'});
 const [device]=await q("SELECT d.id FROM clocker_devices d JOIN locations l ON l.id=d.location_id WHERE d.name='Fictional payroll clock' AND d.location_id='loc-1' AND l.workspace_id='workspace-fuel'");
 assert.ok(device,'Exact source payroll fixture must have created its real Clocker device');
 const [breakType]=await q("SELECT id,version,name,category,target_minutes AS \"targetMinutes\" FROM clocker_break_types WHERE id='audit-rest' AND workspace_id='workspace-fuel' AND active");
 assert.ok(breakType&&breakType.version>0,'Exact source extra fixture must have created its actual break type');
 f={q,devices:[{device}],breakType};
 const hook=registerHooks({resolve(specifier:any,context:any,next:any){return next(specifier==='server-only'?pathToFileURL(join(source,'node_modules/next/dist/compiled/server-only/empty.js')).href:specifier,context);}});
 try{
  const {fixtureProof}=await import(pathToFileURL(join(source,'src/test/integration/shift-change-api.ts')).href);
  const {readEmployeeTime}=await import(pathToFileURL(join(source,'src/lib/data/employee-time.server.ts')).href);
  const {readEmployeeTimeCorrections}=await import(pathToFileURL(join(source,'src/lib/data/time-corrections.server.ts')).href);
  const {createTimeOffRequest,getTimeOffRequest}=await import(pathToFileURL(join(source,'src/lib/data/requests.ts')).href);
  const {parseWithdrawalCommand,withdrawalIdentity}=await import(pathToFileURL(join(source,'src/lib/time-off-withdrawal.ts')).href);
  const {addDays}=await import(pathToFileURL(join(source,'src/lib/date-utils.ts')).href);
  const actors=[];
  for(const account of ['AUDIT-E','AUDIT-LEAD']){
   const [employee]=await q("SELECT id,role,primary_location_id FROM employees WHERE id=$1",[account]);
   assert.equal(employee?.role,account==='AUDIT-LEAD'?'LEAD':'EMPLOYEE','Exact fixture actor role changed');
   assert.equal(employee.primary_location_id,'loc-1','Unexpected own primary location');
   const [{n:open}]=await q('SELECT count(*)::int n FROM time_entries WHERE employee_id=$1 AND clock_out_at IS NULL',[account]);
   assert.equal(open,0,'Do not change an actor with an existing open time entry');
   const existing=await q("SELECT t.id,b.id AS break_id FROM time_entries t JOIN break_entries b ON b.time_entry_id=t.id JOIN locations l ON l.id=t.location_id WHERE t.employee_id=$1 AND l.workspace_id='workspace-fuel' AND t.clock_out_at IS NOT NULL AND b.break_end_at IS NOT NULL AND t.clock_in_at<clock_timestamp()-interval '30 minutes' AND t.clock_out_at>clock_timestamp()-interval '7 days' ORDER BY t.clock_in_at DESC,t.id,b.id LIMIT 1",[account]);
   let target,created=false;
   if(existing.length){target={id:existing[0].id,breakId:existing[0].break_id};}
   else{
    const [{n:overlaps}]=await q("SELECT count(*)::int n FROM time_entries WHERE employee_id=$1 AND clock_in_at<clock_timestamp()-interval '120 minutes' AND COALESCE(clock_out_at,'infinity'::timestamptz)>clock_timestamp()-interval '240 minutes'",[account]);
    assert.equal(overlaps,0,'Canonical initial fixture interval would overlap existing own time');
    const id='phase3-exit-'+account.toLowerCase()+'-closed';
    const [{n:reserved}]=await q('SELECT count(*)::int n FROM time_entries WHERE id=$1',[id]);
    assert.equal(reserved,0,'Initial fixture entry already exists');
    // This exact source helper creates one closed120-minute own record and its closed15-minute break.
    target=await seedClosedEntry({id,employeeId:account,withBreak:true});created=true;
   }
   const proof=await fixtureProof(database.executor,account);
   const time=await readEmployeeTime(proof,database.executor);
   assert.equal(time.state,'ready','Canonical UI time read unavailable for '+account);
   const entries=[...time.today.entries,...time.recent.entries];
   const entry=entries.find((row:any)=>row.id===target.id);
   assert.ok(entry&&entry.clockOutAt&&entry.breaks.some((row:any)=>row.id===target.breakId&&row.endAt),'Own closed entry+break absent from canonical UI time read');
   const corrections=await readEmployeeTimeCorrections(proof,database.executor);
   assert.equal(corrections.state,'ready','Canonical UI correction context unavailable for '+account);
   const targets=corrections.targets.filter((row:any)=>row.timeEntryId===target.id);
   assert.ok(targets.some((row:any)=>row.kind==='ENTRY_BOUNDARY'&&row.breakEntryId===null&&row.context.state==='confirmed'),'Entry boundary correction target is not confirmed');
   assert.ok(targets.some((row:any)=>row.kind==='BREAK_BOUNDARY'&&row.breakEntryId===target.breakId&&row.context.state==='confirmed'),'Break boundary correction target is not confirmed');
   // audit-timeoff is intentionally a legacy text ID; the current withdrawal contract needs a real UUIDv4 request.
   const pending=await q("SELECT id FROM time_off_requests WHERE employee_id=$1 AND status='PENDING' AND id~'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' ORDER BY created_at DESC,id LIMIT 1",[account]);
   const pendingRequestId=pending[0]?.id??randomUUID();let pendingCreated=false;
   if(!pending.length){
    const date=addDays(report.fixtureDate,account==='AUDIT-E'?60:62);
    await createTimeOffRequest({requestId:pendingRequestId,employeeId:account,proof,startDate:date,endDate:date,reason:'Fictional Phase3 withdrawal inspection prerequisite'},database.executor);
    pendingCreated=true;
   }
   const pendingRead=await getTimeOffRequest(pendingRequestId,database.executor);
   assert.ok(pendingRead?.employeeId===account&&pendingRead.status==='PENDING','Canonical own pending withdrawal request readback failed');
   const command=parseWithdrawalCommand({requestId:pendingRequestId,operationId:withdrawalIdentity(pendingRequestId)});
   assert.equal(command.requestId,pendingRequestId,'Pending fixture must satisfy the actual withdrawal command contract');
   actors.push({account,role:employee.role,created,entryId:target.id,breakId:target.breakId,timeReadState:time.state,correctionReadState:corrections.state,targetKinds:[...new Set(targets.map((row:any)=>row.kind))],closedEntry:true,closedBreak:true,pendingWithdrawal:{requestId:pendingRequestId,created:pendingCreated,readStatus:pendingRead.status,ownActorVerified:true,commandValid:true}});
  }
  const [after]=await q("SELECT datname AS name,oid::int AS oid,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()");
  assert.deepEqual(after,identity,'Owned DB identity changed');
  const manifest={checkpoint:SOURCE_SHA,source:SOURCE_PATH,tree:SOURCE_TREE,initializedBeforeListen:true,kind:'canonical exact-source fixture helper extension',identity:{name:identity.name,oid:identity.oid,marker:identity.marker},helperSource:'src/test/integration/clocker-time-corrections.integration.ts',helperSha256:HELPER_SHA256,sourceHashes:SOURCE_HASHES,actors,browserReadback:'REQUIRED after listen: own My time record, correction entry selector and actual break selector; this canonical UI read-model proof is not DOM evidence',secretsIncluded:false};
  const file=join(evidence,'phase3-entry-initial-fixture.json');await writeFile(file,JSON.stringify(manifest,null,2));
  report.phase3EntryFixture={manifest:file,initializedBeforeListen:true,actors:actors.map(({account,entryId,breakId,targetKinds,pendingWithdrawal})=>({account,entryId,breakId,targetKinds,pendingWithdrawal}))};
  report.checks.push({name:'Phase3 initial own Employee/Lead entry+break appear in canonical UI time/correction reads before listen',passed:true});
  return report.phase3EntryFixture;
 }finally{f=undefined;hook.deregister();}
}
