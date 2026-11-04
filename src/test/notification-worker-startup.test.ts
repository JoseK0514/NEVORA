import {expect,it} from 'vitest';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
const environment=()=>({PATH:process.env.PATH??'',TMPDIR:tmpdir(),NODE_ENV:'test' as const});
it('native dispatch is independently disabled by default without database or provider access',()=>{
 const r=spawnSync('npm',['run','notifications:worker','--','native-dispatch'],{cwd:process.cwd(),env:environment(),encoding:'utf8',timeout:8000});
 expect(r.status).toBe(0);expect(r.error).toBeUndefined();
 const last=r.stdout.trim().split('\n').at(-1)!;
 expect(JSON.parse(last)).toEqual({claimed:0,accepted:0,retried:0,failed:0,expired:0,cancelled:0,noSubscription:0,disabled:true});
 expect(r.stderr).not.toContain('Notification worker could not complete');
});
it.each([false,true])('the actual npm worker command retains its exact bounded error with package-manager diagnostic %s',notice=>{
 const root=mkdtempSync(join(tmpdir(),'nevora-worker-cli-'));
 try{
 const preload=join(root,'npm-diagnostic.cjs');
 writeFileSync(preload,"if(['npm','npm-cli.js'].includes(require('node:path').basename(process.argv[1]??'')))process.stderr.write('Controlled package manager diagnostic.\\n');");
 const scriptShell=join(root,'worker-shell.cjs'),workerDiagnostic=join(root,'worker-stderr');
 writeFileSync(scriptShell,`#!${process.execPath}\nconst {openSync,closeSync}=require('node:fs');const {spawnSync}=require('node:child_process');const fd=openSync(${JSON.stringify(workerDiagnostic)},'w');const result=spawnSync('/bin/sh',process.argv.slice(2),{stdio:['inherit','inherit',fd]});closeSync(fd);process.exit(result.status??1);`,{mode:0o700});
 const r=spawnSync('npm',['run','notifications:worker','--','invalid'],{cwd:process.cwd(),env:{...environment(),npm_config_script_shell:scriptShell,...(notice?{NODE_OPTIONS:'--require='+preload}:{})},encoding:'utf8',timeout:8000});
 expect(r.status).toBe(1);expect(r.error===undefined).toBe(true);
 const actual=readFileSync(workerDiagnostic,'utf8');
 expect(actual.trim()).toBe('Notification worker could not complete.');
 expect(/MODULE_NOT_FOUND|Cannot find module|Require stack:/.test(r.stderr+actual)).toBe(false);
 if(notice)expect(r.stderr).toContain('Controlled package manager diagnostic.');
 }finally{rmSync(root,{recursive:true,force:true});}
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
