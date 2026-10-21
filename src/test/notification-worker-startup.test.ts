import {expect,it} from 'vitest';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
const environment=()=>({PATH:process.env.PATH??'',TMPDIR:tmpdir(),NODE_ENV:'test' as const});
it('the actual npm worker command rejects invalid arguments through its bounded CLI handler without loading a provider or database',()=>{
 const r=spawnSync('npm',['run','notifications:worker','--','invalid'],{cwd:process.cwd(),env:environment(),encoding:'utf8',timeout:8000});
 expect(r.status).toBe(1);expect(r.error===undefined).toBe(true);
 expect(r.stderr.trim()==='Notification worker could not complete.').toBe(true);
 expect(/MODULE_NOT_FOUND|Cannot find module|Require stack:/.test(r.stderr)).toBe(false);
});
it('the explicit Node server entry loads the actual worker and executes an injected disabled dispatch without any IO',()=>{
 const script=`
  const {runCli}=await import('./scripts/fuel-notification-worker.ts');
  const {bindWorkspaceNotificationConfig,readNotificationConfig}=await import('./src/lib/notifications/config.ts');
  const config=bindWorkspaceNotificationConfig(readNotificationConfig({}),{id:'owned-node',name:'Owned Node',timeZone:'America/Puerto_Rico',active:true,createdAt:'2030-01-01',updatedAt:'2030-01-01'});
  let io=0;
  const forbidden=new Proxy({}, {get(){io++;throw Error('Owned no-IO boundary');}});
  const report=await runCli(['dispatch'],{config,clock:()=>new Date('2030-01-01'),executor:forbidden,state:forbidden,sender:forbidden,deliveries:forbidden,subscriptions:forbidden});
  process.stdout.write(JSON.stringify({report,io}));`;
 const r=spawnSync(process.execPath,['--conditions=react-server','--import','./scripts/node-server-context.mjs','--import','tsx','--input-type=module','--eval',script],{cwd:process.cwd(),env:environment(),encoding:'utf8',timeout:8000});
 expect(r.status).toBe(0);expect(r.error===undefined&&r.stderr==='').toBe(true);
 expect(JSON.parse(r.stdout)).toEqual({report:{claimed:0,accepted:0,retried:0,failed:0,expired:0,cancelled:0,noSubscription:0,disabled:true},io:0});
});
it('the Node server resolver leaves every non-marker package lookup to normal resolution',()=>{
 const script=`
  await import('server-only');
  let denied=false;try{await import('server-only/not-a-marker');}catch(e){denied=e.code==='ERR_MODULE_NOT_FOUND';}
  process.stdout.write(JSON.stringify({denied}));`;
 const r=spawnSync(process.execPath,['--conditions=react-server','--import','./scripts/node-server-context.mjs','--input-type=module','--eval',script],{cwd:process.cwd(),env:environment(),encoding:'utf8',timeout:8000});
 expect(r.status).toBe(0);expect(r.error===undefined&&r.stderr==='').toBe(true);expect(JSON.parse(r.stdout)).toEqual({denied:true});
});

it('loading the Node hook without the explicit react-server condition does not permit a server-only import',()=>{
 const r=spawnSync(process.execPath,['--import','./scripts/node-server-context.mjs','--input-type=module','--eval',"await import('server-only')"],{cwd:process.cwd(),env:environment(),encoding:'utf8',timeout:8000});
 expect(r.status).toBe(1);expect(r.stdout==='').toBe(true);
});
