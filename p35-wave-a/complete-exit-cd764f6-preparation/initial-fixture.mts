// PREPARED ONLY. Call once from a NEW ownership-verified createOwnedNextApp beforeListen callback.
// Never import as a state probe or call against an already inspected database.
import assert from 'node:assert/strict';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {registerHooks} from 'node:module';
import {writeFile,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {seedOwnedApp,TEST_PASSWORD} from '/workspace/exit-wave-a-cd764f6/src/test/integration/owned-app-fixture.ts';
import {hashPassword} from '/workspace/exit-wave-a-cd764f6/src/lib/auth/password.ts';
import {businessDate} from '/workspace/exit-wave-a-cd764f6/src/lib/business-time.ts';
import {weekStartFor,addDays} from '/workspace/exit-wave-a-cd764f6/src/lib/date-utils.ts';
import {publishScheduleWithRevision} from '/workspace/exit-wave-a-cd764f6/src/test/integration/management-api.ts';
const SOURCE_SHA="cd764f614be8ca5b5215be19d46e07cf968638d7";
const SOURCE_IMPORTS={"src/test/integration/owned-app-fixture.ts": "83c48a29d92af1e1a64b877def4d5be645ad69ed103cda269f9e5194a8d10f3a", "src/lib/auth/password.ts": "d7f62a0959322209f64457be0e8882ff2ce950ad64b9bb5278b1e552a79e628c", "src/lib/business-time.ts": "7068d3c2355a7c744c197e3ab206af9d95d98955b5805c586fee4dea1531e46c", "src/lib/date-utils.ts": "4e4545d0a4a70df78fde730fb3bd99823c47ec5758e12d2e471142f8454a1e41", "src/test/integration/management-api.ts": "8575a34686d72c0d0d9f569034781915ba722e45d1ae6ec9fc3eb7eacc4891b3", "src/test/integration/payroll-preview-fixture.ts": "41462a7d5deaf2d331e7c400b92c079cbfa71efac9e360f88496d1ef25c8dd65", "src/test/integration/shift-change-api.ts": "57a529ef303aa417081c71a81a52d89b7c52fdf52acdb3d1c0fd9ac40b870ee7", "src/lib/communications/service.server.ts": "22d302752a77c76fcf60b492330e8db6008a66f8bf64efbf00c319980c1457b0", "src/test/fixtures/shift-changes.ts": "4a244aa0d9c74b507fc2935b0d36b156bf56855413a9fbe289d627a6e0af5edb", "src/lib/data/shift-change-snapshot.ts": "75e7e04998e8e17ad0e7da142b8f014641633545557bb457292787a330472e37", "src/lib/data/shift-changes.ts": "6ec6c2ba95b34417890319dc150da8ed0703a85307f735ed2138612ad5d4038c", "src/lib/data/schedule-copy.ts": "16dd10c4e930b4dca06a6f336cf352937a58cbee46d2eb3ec09a64344773192d", "src/lib/data/generation-guards.ts": "a63622ce804204a04d846c0004e8d062131d10b03dada251697251f3b50edac5", "src/lib/data/shift-change-views.ts": "16503a5a2b0f3b9b7398a680509d46dd4b4e0f84c64909d99f85609329048e24", "src/lib/data/coverage-repair.server.ts": "a53cf3d1bc7b9e757193cd543ebe6e0a648e59ceddf6c5b6be765ea42334a5bf", "src/lib/scheduling/coverage-repair.ts": "ca1aed303a9e8d29ebee09d4bdace57a63414d4cfef537b87df40fac747e1cbc", "src/lib/payroll-export/json.ts": "23c16ed9139de5f349843a5766165d379804bf9246aec490df2fb0e8d1a11a8a", "src/lib/clocker/pins.server.ts": "6f5e5d6687ffaf2bd3ce13a1a68f3da31c5ca539f5b2847f1a63ef61ed527e61", "src/lib/notifications/types.ts": "2bddf0fed1bf7d3714b16b455fe8136f0d413c723f82e8409ecfe660efb877f1", "src/lib/shift-changes/types.ts": "242a9873f9ad52f705f8c596d1b5dd94bb1ca108906d2979cf8b5c23034bdcc0"};
const EXTRA_SEED_HASH="759710272461fe6b14bd1511c040d44e8aa071f31e6e51692b9e4bb22e0ef454";
export async function seedInitialWaveA({database,identity,root,source,clockerPinKey},report,evidence){
 const owned={database,identity,root,source,clockerPinKey};
 assert.equal(process.env.WA_BROWSER_RELEASED,'yes','Root resource release required before initial fixtures');
 assert.equal(process.env.WA_BROWSER_RELEASE_SHA,SOURCE_SHA,'Exact-SHA release required');
 assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim(),SOURCE_SHA,'Source drift');
 assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:source,encoding:'utf8'}).trim(),'','Dirty source');
 for(const [file,expected]of Object.entries(SOURCE_IMPORTS))assert.equal(createHash('sha256').update(await readFile(join(source,file))).digest('hex'),expected,'Initial fixture source import drift: '+file);
 assert.equal(createHash('sha256').update(await readFile(join(source,'scripts/ui-checks/seed-extra.mts'))).digest('hex'),EXTRA_SEED_HASH,'Seed-extra source drift');
 assert.match(identity.name,/^nevora_exchange_test_audit_[a-f0-9]{12}$/);
 assert.ok(identity.marker?.startsWith('fuel-phase3-disposable:'),'Owned database marker required');
 const app={database},q=(text,values=[])=>database.executor.query({text,values});
 const sourceManifestBytes=await readFile(join(root,'source-manifest.json'));const sourceManifest=JSON.parse(sourceManifestBytes.toString());assert.equal(sourceManifest.checkpoint,SOURCE_SHA,'Owned source-manifest SHA mismatch before fixtures');
 const [actualIdentity]=await q("SELECT datname AS name,oid::int AS oid,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()");assert.deepEqual(actualIdentity,identity,'Initial fixture executor identity must match owned database before writes');
 const [{n:existingActors}]=await q("SELECT count(*)::int n FROM employees WHERE id='QAOWNER'");
 const [{n:existingUpdates}]=await q('SELECT count(*)::int n FROM communications');
 assert.equal(existingActors,0,'Existing fixture cannot be initialized again');assert.equal(existingUpdates,0,'Already initialized communications cannot be changed');
 const fixtureMarker=randomUUID();
 await writeFile(join(root,'wave-a-initialization.started'),fixtureMarker,{flag:'wx'});
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
 const hook=registerHooks({resolve(specifier,ctx,next){return next(specifier==='server-only'?"/workspace/exit-wave-a-cd764f6/node_modules/next/dist/compiled/server-only/empty.js":specifier,ctx);}});
 const {seedPayrollPreviewFixture}=await import('/workspace/exit-wave-a-cd764f6/src/test/integration/payroll-preview-fixture.ts');hook.deregister();
 const payroll=await seedPayrollPreviewFixture(app.database.executor);report.payrollFixtureSeeded=true;
 { const large=process.env.WA_FIXTURE_VARIANT==="large",executor=app.database.executor;
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
 const communicationHook=registerHooks({resolve(specifier,ctx,next){return next(specifier==='server-only'?"/workspace/exit-wave-a-cd764f6/node_modules/next/dist/compiled/server-only/empty.js":specifier,ctx);}});
 const {fixtureProof}=await import('/workspace/exit-wave-a-cd764f6/src/test/integration/shift-change-api.ts');
 const {previewCommunicationAudience,executeCommunicationCommand,readCommunication}=await import('/workspace/exit-wave-a-cd764f6/src/lib/communications/service.server.ts');
 const proof=await fixtureProof(app.database.executor,'QAOWNER');
 const {prepareWaveAPositive,finalizeWaveAPositive}=await import('/workspace/nevora-inspections/p35-wave-a/complete-exit-cd764f6-preparation/initial-positive-fixture.mts');
 const positiveState=await prepareWaveAPositive(owned,evidence);
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
 const fixtureProofRecord={sourceImportSHA:SOURCE_SHA,sourceManifestSha256:createHash('sha256').update(sourceManifestBytes).digest('hex'),fixtureIdentity:identity,fixtureId:fixtureMarker,initializedBeforeListen:true,initialUpdateId:publication.id,actors:actorRows,recipientGrants,readyReads,notifications:{localOnly:true,rows:notificationRows,pushDeliveries,pushDeliveryEnabled:false},sourceImports:SOURCE_IMPORTS,extraSeedSha256:EXTRA_SEED_HASH};
 await writeFile(join(evidence,'wave-a-initial-fixture.json'),JSON.stringify(fixtureProofRecord,null,2));
 report.initialFixture={manifest:join(evidence,'wave-a-initial-fixture.json'),initializedBeforeListen:true,updateId:publication.id,actors:expectedActors.length,readyReads:readyReads.length};
 report.checks.push({name:'Fictional update inserted after all initial actors; every recipient read positively verified before listen',passed:true});
 report.bootstrapMethod='fixture-only executor; no browser publication';
 report.demoAccounts={owner:'QAOWNER',manager:'AUDIT-M',lead:'AUDIT-LEAD',employee:'AUDIT-E',payrollOwner:payroll.ids.owner,payrollEmployee:payroll.ids.a};
 const demoPassword=process.env.PREVIEW_PASSWORD||('Review-'+randomBytes(9).toString('base64url')+'!');
 const demoHash=await hashPassword(demoPassword);
 await q('UPDATE employee_credentials SET password_hash=$1,must_change_password=false',[demoHash]);
 const positive=await finalizeWaveAPositive(positiveState);
 report.positiveFixture={manifest:join(evidence,'wave-a-positive-fixture.json'),fixtureFingerprint:positive.record.fixtureFingerprint,initializedBeforeListen:true};
 communicationHook.deregister();
 return {password:demoPassword,bindingsPath:positive.bindingsPath};
}
