// PREPARED ONLY. Call once from a NEW ownership-verified createOwnedNextApp beforeListen callback.
// Never import as a state probe or call against an already inspected database.
import assert from 'node:assert/strict';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {registerHooks} from 'node:module';
import {writeFile,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {seedOwnedApp,TEST_PASSWORD} from '/workspace/inspect-wave-c-combined-cd764f6/src/test/integration/owned-app-fixture.ts';
import {hashPassword} from '/workspace/inspect-wave-c-combined-cd764f6/src/lib/auth/password.ts';
import {businessDate} from '/workspace/inspect-wave-c-combined-cd764f6/src/lib/business-time.ts';
import {weekStartFor,addDays} from '/workspace/inspect-wave-c-combined-cd764f6/src/lib/date-utils.ts';
import {publishScheduleWithRevision} from '/workspace/inspect-wave-c-combined-cd764f6/src/test/integration/management-api.ts';
const SOURCE_SHA="cd764f614be8ca5b5215be19d46e07cf968638d7";
const SOURCE_IMPORTS={"src/test/integration/owned-app-fixture.ts":"83c48a29d92af1e1a64b877def4d5be645ad69ed103cda269f9e5194a8d10f3a","src/test/integration/payroll-preview-fixture.ts":"41462a7d5deaf2d331e7c400b92c079cbfa71efac9e360f88496d1ef25c8dd65","src/test/integration/shift-change-api.ts":"57a529ef303aa417081c71a81a52d89b7c52fdf52acdb3d1c0fd9ac40b870ee7","src/test/integration/management-api.ts":"8575a34686d72c0d0d9f569034781915ba722e45d1ae6ec9fc3eb7eacc4891b3","src/lib/communications/service.server.ts":"22d302752a77c76fcf60b492330e8db6008a66f8bf64efbf00c319980c1457b0","scripts/ui-checks/seed-extra.mts":"759710272461fe6b14bd1511c040d44e8aa071f31e6e51692b9e4bb22e0ef454","src/lib/data/schedule-templates.ts":"3d2f42c02304b1ea49b394810854c1ddfd41b974b8235aaf59fedeceb2a0067d","src/lib/data/schedule-health.ts":"1d4599d0bfdcd71092ee8aab9770aecadfc316648d5df4b9a632bb37ada22bef","src/lib/workspace-presentation/service.ts":"289d83b388a83ae05df40f62fe2b94f70a8a900c9688c7a8e66eae7332690c2e"};
const EXTRA_SEED_HASH="759710272461fe6b14bd1511c040d44e8aa071f31e6e51692b9e4bb22e0ef454";
export async function seedInitialWaveC({database,identity,root,source},report,evidence){
 assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim(),SOURCE_SHA,'Source drift');
 assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:source,encoding:'utf8'}).trim(),'','Dirty source');
 for(const [path,expected] of Object.entries(SOURCE_IMPORTS))assert.equal(createHash('sha256').update(await readFile(join(source,path))).digest('hex'),expected,'Fixture source input drift '+path);
 assert.match(identity.name,/^nevora_exchange_test_audit_[a-f0-9]{12}$/);
 assert.ok(identity.marker?.startsWith('fuel-phase3-disposable:'),'Owned database marker required');
 const app={database},q=(text,values=[])=>database.executor.query({text,values});
 const [{n:existingActors}]=await q("SELECT count(*)::int n FROM employees WHERE id='QAOWNER'");
 const [{n:existingUpdates}]=await q('SELECT count(*)::int n FROM communications');
 assert.equal(existingActors,0,'Existing fixture cannot be initialized again');assert.equal(existingUpdates,0,'Already initialized communications cannot be changed');
 const fixtureMarker=randomUUID();
 await writeFile(join(root,'wave-c-initialization.started'),fixtureMarker,{flag:'wx'});
 await seedOwnedApp(app.database.executor);
 const password=await hashPassword(TEST_PASSWORD);
 for(const [id,first,last,role] of [['AUDIT-LEAD','Taylor','Rivera','LEAD'],['AUDIT-M','Morgan','Rivera','MANAGER'],['AUDIT-E','Alexandra','Rivera','EMPLOYEE'],['AUDIT-LONG','María José','Rivera Santiago With A Long Name','EMPLOYEE']]){
 await q("INSERT INTO employees(id,first_name,last_name,phone,email,role,primary_location_id) VALUES($1,$2,$3,'7875550101',$4,$5,'loc-1')",[id,first,last,id.toLowerCase()+'@example.invalid',role]);
 await q('INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false)',[id,password]);await q("INSERT INTO employee_location_eligibility VALUES($1,'loc-1'),($1,'loc-2')",[id]);await q("INSERT INTO employee_positions(employee_id,position_id) VALUES($1,'qa-pos')",[id]);
 }
 await q("INSERT INTO clocker_break_types(id,workspace_id,name,category,target_minutes,created_by,updated_by) VALUES('audit-rest','workspace-fuel','Rest break','REST',15,'QAOWNER','QAOWNER')");
 const today=businessDate(new Date(),'America/Puerto_Rico'),week=weekStartFor(today);report.fixtureDate=today;report.fixtureWeek=week;
 await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('audit-current','loc-1',$1,'DRAFT','QAOWNER')",[week]);
 for(let d=0;d<7;d++)for(const [i,id]of ['AUDIT-M','AUDIT-E','AUDIT-LONG'].entries())await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id,is_designated_lead) VALUES($1,'audit-current',$2,$3,$4,$5,'qa-pos',false)",[`audit-shift-${d}-${i}`,id,addDays(week,d),i===0?'07:00':'08:00',i===0?'15:00':'16:00']);
 await publishScheduleWithRevision({locationId:'loc-1',weekStart:week,managerId:'QAOWNER'},app.database.executor);
 // B2 fixture: a published next week (Mon-Fri) so Home has a real next shift and swaps/coverage have partners.
 {const next=addDays(week,7);await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('audit-next','loc-1',$1,'DRAFT','QAOWNER')",[next]);
  for(let d=0;d<5;d++)for(const [i,id] of ['AUDIT-M','AUDIT-E','AUDIT-LONG'].entries())await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id,is_designated_lead) VALUES($1,'audit-next',$2,$3,$4,$5,'qa-pos',false)",[`audit-next-${d}-${i}`,id,addDays(next,d),i===1?'08:00':i===0?'12:00':'09:00',i===1?'16:00':i===0?'20:00':'17:00']);
  await publishScheduleWithRevision({locationId:'loc-1',weekStart:next,managerId:'QAOWNER'},app.database.executor);report.nextWeekSeeded=next;}
 await q("INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status,reason) VALUES('audit-timeoff','AUDIT-E',$1,$2,'PENDING','Fictional family appointment')",[addDays(today,10),addDays(today,11)]);
 const hook=registerHooks({resolve(specifier,ctx,next){return next(specifier==='server-only'?"/workspace/inspect-wave-c-combined-cd764f6/node_modules/next/dist/compiled/server-only/empty.js":specifier,ctx);}});
 const {seedPayrollPreviewFixture}=await import('/workspace/inspect-wave-c-combined-cd764f6/src/test/integration/payroll-preview-fixture.ts');hook.deregister();
 const payroll=await seedPayrollPreviewFixture(app.database.executor);report.payrollFixtureSeeded=true;
 { const large=process.env.WC_FIXTURE_VARIANT==="large",executor=app.database.executor;
const zone = 'America/Puerto_Rico';
const today = businessDate(new Date(), zone), week = weekStartFor(today), next = addDays(week, 7);
const [{ password_hash: hash }] = await q("SELECT password_hash FROM employee_credentials WHERE employee_id='AUDIT-E'");
const [device] = await q("SELECT id FROM clocker_devices WHERE location_id='loc-1' ORDER BY created_at LIMIT 1");
if (!device) throw Error('No Clocker device at loc-1 in this preview');

async function person(id: string, first: string, last: string, role: string, location = 'loc-1') {
  await q("INSERT INTO employees(id,first_name,last_name,phone,email,role,primary_location_id) VALUES($1,$2,$3,'7875550199',$4,$5,$6) ON CONFLICT (id) DO NOTHING", [id, first, last, id.toLowerCase() + '@example.invalid', role, location]);
  await q('INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false) ON CONFLICT DO NOTHING', [id, hash]);
  await q('INSERT INTO employee_location_eligibility VALUES($1,$2) ON CONFLICT DO NOTHING', [id, location]);
  await q("INSERT INTO employee_positions VALUES($1,'qa-pos') ON CONFLICT DO NOTHING", [id]);
}
async function shifts(scheduleId: string, start: string, people: string[], days: number) {
  for (let d = 0; d < days; d++) for (const id of people)
    await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id,is_designated_lead) VALUES($1,$2,$3,$4,'09:00','17:00','qa-pos',$5) ON CONFLICT (id) DO NOTHING",
      [`x-${scheduleId}-${id}-${d}`, scheduleId, id, addDays(start, d), id === 'AUDIT-LEAD']);
}
const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString();

// 2. Decided time-off requests (the timeline's "Approved by <name> · <date>" and "Withdrawn · <date>").
const requests: [string, string, number, number, string | null, string | null, string, string | null][] = [
  ['x-to-approved', 'AUDIT-E', 20, 21, null, null, 'APPROVED', 'AUDIT-M'],
  ['x-to-partial', 'AUDIT-E', 25, 25, '09:00', '13:00', 'APPROVED', 'QAOWNER'],
  ['x-to-declined', 'AUDIT-E', 30, 31, null, null, 'DENIED', 'AUDIT-M'],
  ['x-to-withdrawn', 'AUDIT-E', 40, 40, null, null, 'CANCELLED', 'AUDIT-E'],
  ['x-to-lead-approved', 'AUDIT-LEAD', 22, 23, null, null, 'APPROVED', 'AUDIT-M'],
];
for (const [id, employee, from, to, startTime, endTime, status, reviewer] of requests)
  await q("INSERT INTO time_off_requests(id,employee_id,start_date,end_date,start_time,end_time,reason,status,reviewed_by,reviewed_at,created_at) VALUES($1,$2,$3,$4,$5,$6,'Fictional appointment',$7,$8,now()-interval '2 days',now()-interval '5 days') ON CONFLICT (id) DO NOTHING",
    [id, employee, addDays(today, from), addDays(today, to), startTime, endTime, status, reviewer]);

// 3. One person clocked in and one on break, both on today's published schedule; the lead's shifts too.
await person('AUDIT-ON', 'Jordan', 'Rivera', 'EMPLOYEE');
await person('AUDIT-BREAK', 'Casey', 'Rivera', 'EMPLOYEE');
await shifts('audit-current', week, ['AUDIT-ON', 'AUDIT-BREAK', 'AUDIT-LEAD'], 7);
await shifts('audit-next', next, ['AUDIT-ON', 'AUDIT-BREAK', 'AUDIT-LEAD'], 5);
// A swap partner: AUDIT-SWAP works only next Saturday and Sunday, so AUDIT-E's weekday shifts and theirs can trade.
await person('AUDIT-SWAP', 'Riley', 'Rivera', 'EMPLOYEE');
for (const d of [5, 6]) await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id,is_designated_lead) VALUES($1,'audit-next','AUDIT-SWAP',$2,'08:00','16:00','qa-pos',false) ON CONFLICT (id) DO NOTHING", [`x-swap-${d}`, addDays(next, d)]);
// Wave A (Oct 19): a swap AUDIT-E <-> AUDIT-SWAP is allowed only when both people's operational rules have been
// reviewed (otherwise RULE_UNVERIFIABLE) and each one's availability covers the other's shift (OUTSIDE_AVAILABILITY).
// Same shape as the fixture's own test people: rules reviewed as not applicable, available 6 AM to 10 PM every day,
// and next week's availability sent. target_weekly_hours stays unset, so the "no weekly hour target" items remain.
const reviewed = { status: 'NOT_APPLICABLE', reviewedBy: 'QAOWNER', reviewedAt: '2026-10-01T00:00:00Z' };
const ruleProfile = JSON.stringify({ version: 1, revision: 1, reviewedBy: 'QAOWNER', reviewedAt: '2026-10-01T00:00:00Z', minimumRest: reviewed, maximumShift: reviewed, maximumDaily: reviewed, breaks: reviewed, projectedOvertime: reviewed });
for (const id of ['AUDIT-E', 'AUDIT-SWAP']) {
  await q('INSERT INTO employee_scheduling_settings(employee_id,maximum_weekly_hours,operational_rule_profile) VALUES($1,80,$2::jsonb) ON CONFLICT (employee_id) DO UPDATE SET operational_rule_profile=COALESCE(employee_scheduling_settings.operational_rule_profile,EXCLUDED.operational_rule_profile)', [id, ruleProfile]);
  for (let day = 0; day < 7; day++) await q("INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) VALUES($1,$2,$3,'06:00','22:00') ON CONFLICT (id) DO NOTHING", [`x-av-${id}-${day}`, id, day]);
  await q('INSERT INTO weekly_availability_submissions(employee_id,week_start,uses_normal_availability) VALUES($1,$2,true) ON CONFLICT DO NOTHING', [id, next]);
}
await publishScheduleWithRevision({ locationId: 'loc-1', weekStart: week, managerId: 'QAOWNER' }, executor);
await publishScheduleWithRevision({ locationId: 'loc-1', weekStart: next, managerId: 'QAOWNER' }, executor);
for (const [id, status, minutes] of [['AUDIT-ON', 'CLOCKED_IN', 120], ['AUDIT-BREAK', 'ON_BREAK', 180]] as const) {
  const open = await q("SELECT id FROM time_entries WHERE employee_id=$1 AND clock_out_at IS NULL", [id]);
  if (open.length) continue;
  const entry = randomUUID();
  await q('INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status,version) VALUES($1,$2,$3,$4,$5,$6,1)', [entry, id, 'loc-1', device.id, at(minutes), status]);
  if (status === 'ON_BREAK') await q('INSERT INTO break_entries(id,time_entry_id,break_start_at,version) VALUES($1,$2,$3,1)', [randomUUID(), entry, at(10)]);
  await q('INSERT INTO clocker_employee_clock_state(employee_id,revision) VALUES($1,1) ON CONFLICT DO NOTHING', [id]);
}

// 4. A lead with pay statements: the payroll fixture's second employee becomes a lead.
await q("UPDATE employees SET role='LEAD', first_name='Robin' WHERE id='payroll-qa-b'");

// 5. Large data, on its own preview.
if (large) {
  const longName = 'Northside Distribution and Customer Service Center at Plaza Las Américas';
  await q("INSERT INTO locations(id,name,short_name,workspace_id,clocker_key,calendar_serial,calendar_modified_at) VALUES('loc-large',$1,'Plaza Las Américas Center','workspace-fuel',$2,1,now()) ON CONFLICT (id) DO NOTHING", [longName, randomUUID()]);
  await q("INSERT INTO clocker_devices(id,location_id,name) VALUES('x-device-large','loc-large','Front desk tablet') ON CONFLICT DO NOTHING");
  const firsts = ['María José', 'Juan Carlos', 'Ana', 'Luis Alberto', 'Carmen', 'José', 'Gabriela', 'Pedro', 'Yolanda', 'Héctor'];
  const lasts = ['Rivera Santiago', 'Rodríguez de la Torre y Valentín', 'Ortiz', 'Martínez Colón', 'Vázquez', 'Hernández Figueroa-Quiñones', 'Cruz', 'López'];
  const people: string[] = [];
  for (let i = 1; i <= 200; i++) {
    const id = `LD-${String(i).padStart(4, '0')}`;
    people.push(id);
    await person(id, firsts[i % firsts.length], lasts[i % lasts.length] + (i % 25 === 0 ? ' With An Exceptionally Long Family Name' : ''), i % 20 === 0 ? 'LEAD' : 'EMPLOYEE', 'loc-large');
  }
  await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('x-large-current','loc-large',$1,'DRAFT','QAOWNER') ON CONFLICT DO NOTHING", [week]);
  for (let d = 0; d < 7; d++) for (let s = 0; s < 50; s++) {
    const id = people[(d * 50 + s) % people.length], start = ['06:00', '08:00', '10:00', '14:00', '18:00'][s % 5], end = ['14:00', '16:00', '18:00', '22:00', '23:30'][s % 5];
    await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id,is_designated_lead) VALUES($1,'x-large-current',$2,$3,$4,$5,'qa-pos',false) ON CONFLICT (id) DO NOTHING", [`x-large-${d}-${s}`, id, addDays(week, d), start, end]);
  }
  await publishScheduleWithRevision({ locationId: 'loc-large', weekStart: week, managerId: 'QAOWNER' }, executor);
  // A year of closed timecards, weekdays only, for AUDIT-E and ten large-data people.
  for (const id of ['AUDIT-E', ...people.slice(0, 10)]) {
    const location = id === 'AUDIT-E' ? 'loc-1' : 'loc-large', deviceId = id === 'AUDIT-E' ? device.id : 'x-device-large';
    const existing = await q("SELECT count(*)::int n FROM time_entries WHERE employee_id=$1 AND id LIKE 'x-year-%'", [id]);
    if (existing[0].n) continue;
    for (let d = 1; d <= 365; d++) {
      const day = new Date(Date.now() - d * 86_400_000);
      if (day.getUTCDay() === 0 || day.getUTCDay() === 6) continue;
      const date = day.toISOString().slice(0, 10);
      await q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version) VALUES($1,$2,$3,$4,($5||' 08:00:00-04')::timestamptz,($5||' 16:30:00-04')::timestamptz,'CLOCKED_OUT',1)", [`x-year-${id}-${date}`, id, location, deviceId, date]);
    }
  }
}


 }
 // Inspection bootstrap is fixture-only: no browser publication or other application mutation.
 const communicationHook=registerHooks({resolve(specifier,ctx,next){return next(specifier==='server-only'?"/workspace/inspect-wave-c-combined-cd764f6/node_modules/next/dist/compiled/server-only/empty.js":specifier,ctx);}});
 const {fixtureProof}=await import('/workspace/inspect-wave-c-combined-cd764f6/src/test/integration/shift-change-api.ts');
 const {previewCommunicationAudience,executeCommunicationCommand,readCommunication}=await import('/workspace/inspect-wave-c-combined-cd764f6/src/lib/communications/service.server.ts');
 const proof=await fixtureProof(app.database.executor,'QAOWNER');
 const {createTemplateFromWeek,listScheduleTemplates,listTemplateShifts}=await import('/workspace/inspect-wave-c-combined-cd764f6/src/lib/data/schedule-templates.ts');
 const fixtureVariant=process.env.WC_FIXTURE_VARIANT??'populated';
 assert.ok(['populated','empty-templates','large'].includes(fixtureVariant),'Unsupported initial fixture variant');
 if(fixtureVariant==='large'){
 const {createCoverageWindow}=await import('/workspace/inspect-wave-c-combined-cd764f6/src/lib/data/schedule-health.ts');
 const ids=[];for(let day=0;day<7;day++)for(const [startTime,endTime] of [['08:00','10:00'],['10:00','12:00'],['14:00','17:00']])ids.push(await createCoverageWindow({locationId:'loc-large',dayOfWeek:day,startTime,endTime,minimumStaff:2,positionRequirements:[],actorEmployeeId:'QAOWNER',proof},app.database.executor));
 const rows=await q('SELECT id,day_of_week,start_time::text,end_time::text FROM location_coverage_windows WHERE location_id=$1 ORDER BY day_of_week,start_time',['loc-large']);assert.equal(rows.length,21);report.coverageFixture={initialOnly:true,ids,rows};
 }
 const templateCount=fixtureVariant==='empty-templates'?0:fixtureVariant==='large'?30:2;
 const seededTemplates=[];
 for(let i=0;i<templateCount;i++){const name=i===0?'Fictional support week':'Fictional operations and customer service week '+(i+1);const id=await createTemplateFromWeek({name,weekStart:week,createdBy:'QAOWNER',proof},app.database.executor);const shifts=await listTemplateShifts(id,app.database.executor,proof);assert.ok(shifts?.length,'Initial template must include shifts');seededTemplates.push({id,name,shifts:shifts.length});}
 const listedTemplates=await listScheduleTemplates(proof,app.database.executor);assert.equal(listedTemplates.length,templateCount);
 report.templateFixture={variant:fixtureVariant,seededTemplates,initialOnly:true};
 // Wave C initial-only Branding history: canonical owned service, before Next listens.
 const {saveWorkspacePresentation,readPresentationHistory}=await import('/workspace/inspect-wave-c-combined-cd764f6/src/lib/workspace-presentation/service.ts');
 const oldHistory=await readPresentationHistory(proof,app.database.executor);
 let brandRevision=oldHistory[0]?.revision??0;
 for(const seed of ['#1D4ED8',null]){const saved=await saveWorkspacePresentation(proof,{operationId:randomUUID(),expectedRevision:brandRevision,section:'brand',seed,logoAssetId:null},app.database.executor);brandRevision=saved.revision;}
 const brandHistory=await readPresentationHistory(proof,app.database.executor);
 assert.ok(brandHistory.length>=2,'Canonical initial Branding history required');
 assert.equal(brandHistory[0].settings.brand.seed,null,'Normal baseline keeps default brand');
 report.presentationFixture={initializedBeforeListen:true,history:brandHistory.map(({revision,changedAt,changedKeys})=>({revision,changedAt,changedKeys})),defaultBrandRestored:true};
 const draft={type:'LOCATION_ANNOUNCEMENT',scope:{kind:'LOCATION',locationId:'loc-1'},title:'Fictional inspection schedule update',body:'Please review the fictional upcoming schedule. This update exists only in the disposable inspection preview.',acknowledgement:'REQUIRED',expiresAt:null};
 const audience=await previewCommunicationAudience(proof,draft,app.database.executor);
 assert.equal(audience.state,'ready','Owned fixture audience must be ready');
 const publication=await executeCommunicationCommand(proof,{kind:'PUBLISH',operationId:randomUUID(),authority:audience.authority,draft,audienceFingerprint:audience.fingerprint},app.database.executor);
 assert.equal(publication.status,'committed','Owned fictional fixture publication must commit');
 const expectedActors=['QAOWNER','AUDIT-M','AUDIT-LEAD','AUDIT-E','AUDIT-LONG','AUDIT-ON','AUDIT-BREAK','AUDIT-SWAP','payroll-qa-owner','payroll-qa-reviewer','payroll-qa-a','payroll-qa-b'];
 const actorRows=await q('SELECT id,role,primary_location_id FROM employees WHERE id=ANY($1::text[]) ORDER BY id',[expectedActors]);
 assert.equal(actorRows.length,expectedActors.length,'Every fictional inspection actor must exist');
 const recipientGrants=await q('SELECT employee_id,grant_kind,communication_id::text,revision_id::text FROM communication_recipients WHERE communication_id=$1::uuid ORDER BY employee_id',[publication.id]);
 for(const id of ['AUDIT-LEAD','AUDIT-E','AUDIT-LONG','AUDIT-ON','AUDIT-BREAK','AUDIT-SWAP','payroll-qa-a','payroll-qa-b'])assert.ok(recipientGrants.some(g=>g.employee_id===id&&g.grant_kind==='LOCATION'),'Missing initial recipient '+id);
 const readyReads=[];
 for(const id of expectedActors){const actorProof=await fixtureProof(app.database.executor,id);const read=await readCommunication(actorProof,publication.id,app.database.executor);assert.equal(read.state,'ready','Initial fictional detail unavailable for '+id);readyReads.push({actor:id,state:read.state,id:read.id});}
 const notificationRows=await q('SELECT id,employee_id,source_kind,source_id,source_version,environment FROM notifications ORDER BY id');
 const [{n:pushDeliveries}]=await q('SELECT count(*)::int n FROM push_deliveries');
 const fixtureProofRecord={sourceImportSHA:SOURCE_SHA,fixtureIdentity:identity,fixtureId:fixtureMarker,initializedBeforeListen:true,initialUpdateId:publication.id,actors:actorRows,recipientGrants,readyReads,notifications:{localOnly:true,rows:notificationRows,pushDeliveries,pushDeliveryEnabled:false},sourceImports:SOURCE_IMPORTS,extraSeedSha256:EXTRA_SEED_HASH};
 await writeFile(join(evidence,'wave-c-initial-fixture.json'),JSON.stringify(fixtureProofRecord,null,2));
 report.initialFixture={manifest:join(evidence,'wave-c-initial-fixture.json'),initializedBeforeListen:true,updateId:publication.id,actors:expectedActors.length,readyReads:readyReads.length};
 report.checks.push({name:'Fictional update inserted after all initial actors; every recipient read positively verified before listen',passed:true});
 report.bootstrapMethod='fixture-only executor; no browser publication';
 report.demoAccounts={owner:'QAOWNER',manager:'AUDIT-M',lead:'AUDIT-LEAD',employee:'AUDIT-E',payrollOwner:payroll.ids.owner,payrollEmployee:payroll.ids.a};
 const demoPassword=process.env.PREVIEW_PASSWORD||('Review-'+randomBytes(9).toString('base64url')+'!');
 const demoHash=await hashPassword(demoPassword);
 await q('UPDATE employee_credentials SET password_hash=$1,must_change_password=false',[demoHash]);
 communicationHook.deregister();
 return {password:demoPassword};
}
