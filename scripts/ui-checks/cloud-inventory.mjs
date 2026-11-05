// Called with --import tsx from the tools checkout, after seed-extra and login.
// Uses the tools checkout's fixtures, never the source checkout's test helpers.
import assert from 'node:assert/strict';
import {createRequire,registerHooks} from 'node:module';
import {readFile,readdir,realpath,writeFile} from 'node:fs/promises';
import {join,resolve,relative,isAbsolute} from 'node:path';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';

const out=await realpath(process.env.PREVIEW_OUT);
const tools=resolve(process.env.NEVORA_TOOLS_ROOT);
const source=resolve(process.env.PREVIEW_SOURCE);
const run=(await readdir(out)).filter(n=>n.startsWith('evidence-')).sort().at(-1);
const app=(await readdir(join(out,run))).find(n=>n.startsWith('owned-next-'));
const ownership=JSON.parse(await readFile(join(out,run,app,'ownership.json'),'utf8'));
const root=await realpath(ownership.root),child=relative(out,root);
assert(child&&!child.startsWith('..')&&!isAbsolute(child),'Preview root must be under PREVIEW_OUT');
const suffix=/^nevora_exchange_test_audit_([0-9a-f]{12})$/.exec(ownership.identity.name)?.[1];
assert(suffix,'Not an owned preview database');
const cluster=join(process.env.NEVORA_PREVIEW_TMP??tmpdir(),'nevora-ui-preview-'+suffix.slice(0,10));
assert((await readFile(join(cluster,'owner'),'utf8')).startsWith(suffix),'Cluster owner mismatch');
const port=Number((await readFile(join(cluster,'data/postmaster.pid'),'utf8')).split('\n')[3]);
const pg=createRequire(join(tools,'package.json'))('pg');
const client=new pg.Client({host:'127.0.0.1',port,user:'nevora_audit',database:ownership.identity.name});
await client.connect();
const q=async(text,values=[]) => (await client.query(text,values)).rows;
const executor={query:s=>q(s.text,s.values),transaction:async statements=>{
  await client.query('BEGIN');try{const rows=[];for(const s of statements)rows.push(await q(s.text,s.values));await client.query('COMMIT');return rows;}
  catch(e){await client.query('ROLLBACK');throw e;}
}};
try {
  const [identity]=await q("SELECT oid::int AS oid,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()");
  assert.equal(identity.oid,ownership.identity.oid);
  assert.equal(identity.marker,ownership.identity.marker);
  const hook=registerHooks({resolve(specifier,context,next){return next(specifier==='server-only'?pathToFileURL(join(tools,'node_modules/next/dist/compiled/server-only/empty.js')).href:specifier,context);}});
  const imported=async path=>import(pathToFileURL(join(tools,path)).href);
  const {fixtureProof}=await imported('src/test/integration/shift-change-api.ts');
  const {publishScheduleWithRevision}=await imported('src/test/integration/management-api.ts');
  const {previewCommunicationAudience,executeCommunicationCommand}=await imported('src/lib/communications/service.server.ts');
  const {executeScheduleCopy}=await imported('src/lib/data/schedule-copy.ts');
  const [next]=await q("SELECT week_start::text AS week FROM schedules WHERE id='audit-next'");
  // The supplied payroll fixture has no shifts. Give its two requested screen
  // accounts a real future shift so Swap/Unable to work do not just redirect.
  for(const account of ['payroll-qa-a','payroll-qa-b']) {
    await q("INSERT INTO employee_positions(employee_id,position_id) VALUES($1,'qa-pos') ON CONFLICT DO NOTHING",[account]);
    await q("INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES($1,'loc-1') ON CONFLICT DO NOTHING",[account]);
    await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id,is_designated_lead) VALUES($1,'audit-next',$2,$3,'08:00','16:00','qa-pos',false) ON CONFLICT(id) DO NOTHING",['cloud-'+account,account,next.week]);
  }
  await publishScheduleWithRevision({locationId:'loc-1',weekStart:next.week,managerId:'QAOWNER'},executor);
  const owner=await fixtureProof(executor,'QAOWNER');
  // Publish after seed-extra so ON/BREAK are actual captured recipients too.
  const draft={type:'LOCATION_ANNOUNCEMENT',scope:{kind:'LOCATION',locationId:'loc-1'},title:'Fictional cloud screen-check update',body:'Please review the fictional upcoming schedule. This update exists only in the disposable cloud preview.',acknowledgement:'REQUIRED',expiresAt:null};
  const preview=await previewCommunicationAudience(owner,draft,executor);
  assert.equal(preview.state,'ready','Fictional update audience must be current');
  const publication=await executeCommunicationCommand(owner,{kind:'PUBLISH',operationId:randomUUID(),authority:preview.authority,draft,audienceFingerprint:preview.fingerprint},executor);
  assert.equal(publication.status,'committed','Fictional update must publish');
  const receipts={};
  for(const account of ['AUDIT-M','QAOWNER']) {
    const proof=await fixtureProof(executor,account),operationId=randomUUID();
    // A real immutable receipt for an unavailable template, without copying
    // shifts into the schedule being measured. This state is recorded below.
    const receipt=await executeScheduleCopy(proof,{operationId,weekStart:next.week,kind:'TEMPLATE',templateId:'cloud-fictional-missing-template'},executor);
    assert.equal(receipt.reason,'TEMPLATE_UNAVAILABLE');receipts[account]=operationId;
  }
  hook.deregister();
  const accounts=['AUDIT-E','AUDIT-LEAD','AUDIT-LONG','AUDIT-ON','AUDIT-BREAK','payroll-qa-a','payroll-qa-b','AUDIT-M','QAOWNER'];
  const people=await q('SELECT id,role FROM employees WHERE id=ANY($1::text[])',[accounts]);
  const shifts=await q("SELECT id,employee_id FROM shifts WHERE schedule_id='audit-next' ORDER BY date,id");
  const paths=[];
  async function walk(path){for(const e of await readdir(path,{withFileTypes:true})){const full=join(path,e.name);if(e.isDirectory())await walk(full);else if(e.name==='page.tsx')paths.push('/app'+relative(join(source,'src/app/app'),path).split('/').filter(Boolean).map(x=>'/'+x).join(''));}}
  await walk(join(source,'src/app/app'));
  const managerOnly=new Set(['/app/account-recovery','/app/clocker-recovery','/app/inbox','/app/reports','/app/payroll-export','/app/schedule/new','/app/schedule/edit','/app/schedule/templates','/app/schedule/settings','/app/schedule/copy-receipt','/app/employees','/app/employees/new','/app/employees/[employeeId]','/app/employees/[employeeId]/clocker-pin']);
  const selfOnly=new Set(['/app/my-time','/app/requests/hub','/app/exchange/swap','/app/exchange/callout']);
  const profileSource=await readFile(join(source,'src/app/app/profile/page.tsx'),'utf8');
  // The self-service fallback guard also appears after the management return.
  // Its presence alone must never exclude the page's Owner/Manager branch.
  const managementProfile=/ManagerProfilePage|ManagementProfile/.test(profileSource);
  const jobs=[],excluded=[];
  for(const account of accounts){const person=people.find(p=>p.id===account);assert(person,'Requested account missing: '+account);const manager=['OWNER','MANAGER'].includes(person.role),routes=[];
    for(const pattern of paths.sort()) {
      let reason;
      if(pattern.startsWith('/app/settings')&&person.role!=='OWNER')reason='Owner-only Settings';
      if(managerOnly.has(pattern)&&!manager)reason='Manager/Owner page';
      if(selfOnly.has(pattern)&&manager)reason='Employee/Lead self service';
      if(pattern==='/app/profile'&&manager&&!managementProfile)reason='This snapshot redirects management Profile to Home';
      if(pattern==='/app/payroll'&&person.role!=='OWNER')reason='This fixture grants payroll review only to other actors; AUDIT-M has no payroll grant';
      // Nov 1 upscale: app/app/[...missing] is the catch-all that renders the in-app 404 (HTTP 404) for unknown /app
      // addresses, not a page of its own; its in-shell 404 is checked by the Employee profile journey.
      if(pattern==='/app/[...missing]')reason='Unknown-address catch-all (in-app 404); checked in employee-mobile-profile.integration';
      if(reason){excluded.push({account,pattern,reason});continue;}
      let route=pattern.replace('[employeeId]','AUDIT-LONG').replace('[locationId]','loc-1').replace('[id]',publication.id);
      const shift=shifts.find(s=>s.employee_id===account);
      if(pattern==='/app/exchange/swap'||pattern==='/app/exchange/callout'){assert(shift,'No own future shift for '+account);route+='?'+(pattern.endsWith('swap')?'sourceShiftId':'shiftId')+'='+encodeURIComponent(shift.id);}
      if(pattern==='/app/schedule/edit')route+='?shiftId=audit-next-0-1';
      if(pattern==='/app/schedule/copy-receipt')route+='?operation='+receipts[account];
      routes.push(route);
    }
    jobs.push({account,role:person.role,routes});
  }
  await writeFile(join(out,'state/ANONYMOUS.json'),JSON.stringify({cookies:[],origins:[]}),{mode:0o600});
  jobs.push({account:'ANONYMOUS',role:'SIGNED_OUT',routes:['/login']});
  const inventory={source:ownership.source,pageFiles:paths.length,patterns:[...paths,'/login'],jobs,excluded,fixtures:{updateId:publication.id,copyReceipts:receipts,copyReceiptState:'TEMPLATE_UNAVAILABLE',payrollFutureShifts:['cloud-payroll-qa-a','cloud-payroll-qa-b'],extraSeed:'Supplied tools seed-extra.mts; only additional fictional fixture writes listed here'}};
  await writeFile(join(out,'route-inventory.json'),JSON.stringify(inventory,null,2));
  console.log('INVENTORY_READY '+jobs.reduce((n,j)=>n+j.routes.length,0)+' route/account pairs; '+paths.length+' page files plus /login');
} finally {await client.end();}
