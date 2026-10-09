import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';

const runner = resolve('scripts/phase-e-owned.mjs');
it.each(['graceful', 'forced', 'forced-title-worker'])('a short %s timeout stops detached Next/browser process resources and fails', mode => {
  const root = mkdtempSync(join(tmpdir(), 'nevora-e-timeout-')), trace = join(root, 'resources.json');
  try {
    const resource = join(root, 'resource.mjs'), child = join(root, 'child.mjs');
    // Real detached processes at the Next/browser executable boundary. No app,
    // credential, customer or provider is selected by this lifecycle regression.
    writeFileSync(resource, `import {spawn} from 'node:child_process';process.on('SIGTERM',()=>{});if(process.argv.includes('--next-worker')){const worker=spawn(process.execPath,['--input-type=module','-e',"process.on('SIGTERM',()=>{});setTimeout(()=>{process.title='next-server';},500);setInterval(()=>{},100);"],{env:process.env,stdio:'ignore'});}setInterval(()=>{},100);\n`);
    writeFileSync(child, `import fs from 'node:fs';import {spawn} from 'node:child_process';import {registerOwnedProcess,installTerminationHandlers} from ${JSON.stringify(runner)};
const start=next=>spawn(process.execPath,[${JSON.stringify(resource)},...(next&&${JSON.stringify(mode)}==='forced-title-worker'?['--next-worker']:[])],{env:process.env,detached:true,stdio:'ignore'});
const next=start(true),browser=start(false);fs.writeFileSync(${JSON.stringify(trace)},JSON.stringify([next.pid,browser.pid]));
await registerOwnedProcess({kind:'next',pid:next.pid,ownerId:process.env.PHASE_E_OWNER_ID});await registerOwnedProcess({kind:'browser-chromium',pid:browser.pid,ownerId:process.env.PHASE_E_OWNER_ID});
if(${JSON.stringify(mode)}==='graceful')installTerminationHandlers(async()=>{process.kill(-next.pid,'SIGKILL');process.kill(-browser.pid,'SIGKILL');fs.writeFileSync(${JSON.stringify(join(root, 'graceful-closed'))},'closed');process.exit(1);});else process.on('SIGTERM',()=>{});
setInterval(()=>{},100);\n`);
    const script = `const api=await import(${JSON.stringify(runner)});const ownerId='c'.repeat(32);const result=await api.superviseOwnedChild({command:process.execPath,args:[${JSON.stringify(child)}],cwd:${JSON.stringify(root)},env:{...api.safeEnvironment(),PHASE_E_OWNER_ID:ownerId},ownerId,timeoutMs:${mode === 'forced-title-worker' ? 1250 : 750},graceMs:250});process.stdout.write(JSON.stringify(result));`;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', timeout: 12_000 });
    expect(result.status, result.stderr).toBe(0);
    const supervised = JSON.parse(result.stdout);
    expect(supervised.status).toBe(124); expect(supervised.timedOut).toBe(true);
    expect(supervised.resources).toHaveLength(mode === 'forced-title-worker' ? 3 : 2); expect(supervised.resources.every((item: { stopped: boolean }) => item.stopped)).toBe(true);
    const pids = JSON.parse(readFileSync(trace, 'utf8')) as number[];
    for (const pid of pids) expect(() => process.kill(pid, 0)).toThrow();
    if (mode === 'graceful') expect(readFileSync(join(root, 'graceful-closed'), 'utf8')).toBe('closed');
  } finally {
    // Only independently recorded invocation-created fixture PIDs are eligible.
    try { for (const pid of JSON.parse(readFileSync(trace, 'utf8'))) { try { process.kill(-pid, 'SIGKILL'); } catch { /* already stopped */ } } } catch { /* not started */ }
    rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

it('refuses a resource registration for an unrelated process', () => {
  const root = mkdtempSync(join(tmpdir(), 'nevora-e-unowned-process-'));
  try {
    const child = join(root, 'child.mjs');
    writeFileSync(child, `import {registerOwnedProcess} from ${JSON.stringify(runner)};try{await registerOwnedProcess({kind:'next',pid:${process.pid},ownerId:process.env.PHASE_E_OWNER_ID});process.exit(0);}catch{process.exit(19);}`);
    const script = `const api=await import(${JSON.stringify(runner)});const ownerId='d'.repeat(32);const result=await api.superviseOwnedChild({command:process.execPath,args:[${JSON.stringify(child)}],cwd:${JSON.stringify(root)},env:{...api.safeEnvironment(),PHASE_E_OWNER_ID:ownerId},ownerId,timeoutMs:1000,graceMs:100});process.stdout.write(JSON.stringify(result));`;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', timeout: 5000 });
    expect(result.status, result.stderr).toBe(0);
    const supervised = JSON.parse(result.stdout); expect(supervised.status).not.toBe(0); expect(supervised.resources).toEqual([]);
    expect(() => process.kill(process.pid, 0)).not.toThrow();
  } finally { rmSync(root, { recursive: true, force: true }); }
});

it.each(['stable-member', 'changed-member', 'changed-leader', 'outside-group', 'recycled-birth', 'changed-ancestry', 'departed-member'])('retained Linux marker observation: %s', mode => {
  const root = mkdtempSync(join(tmpdir(), 'nevora-e-title-observation-'));
  const leaderTrace = join(root, 'leader.json'), workerTrace = join(root, 'worker.json');
  try {
    const driver = join(root, 'driver.mjs'), child = join(root, 'child.mjs'), resource = join(root, 'resource.mjs'), worker = join(root, 'worker.mjs'), depart = join(root, 'depart-worker'), changed = join(root, 'changed'), childTrace = join(root, 'child.json');
    // Actual local processes/ps/polling/cleanup. Only /proc/environ retention is
    // simulated on Darwin. Negative birth/ancestry modes explicitly perturb one
    // fixture PID's ps field to model authority loss; they do not claim PID reuse.
    writeFileSync(worker, `import fs from 'node:fs';fs.writeFileSync(${JSON.stringify(workerTrace)},JSON.stringify({pid:process.pid}));${mode === 'outside-group' ? `fs.writeFileSync(${JSON.stringify(leaderTrace)},JSON.stringify({pid:process.pid}));` : ''}setTimeout(()=>{${['changed-member', 'outside-group', 'recycled-birth', 'changed-ancestry'].includes(mode) ? "process.title='next-server';" : ''}fs.writeFileSync(${JSON.stringify(changed)},'changed');},800);setInterval(()=>{if(${JSON.stringify(mode)}==='departed-member'&&fs.existsSync(${JSON.stringify(depart)}))process.exit(0);},5);setInterval(()=>{},100);`);
    writeFileSync(resource, `import fs from 'node:fs';import {spawn} from 'node:child_process';fs.writeFileSync(${JSON.stringify(leaderTrace)},JSON.stringify({pid:process.pid}));spawn(process.execPath,[${JSON.stringify(worker)}],{env:process.env,stdio:'ignore'});${mode === 'changed-leader' ? "setTimeout(()=>{process.title='changed-owned-leader';},800);" : ''}setInterval(()=>{},100);`);
    writeFileSync(child, `import fs from 'node:fs';import {spawn} from 'node:child_process';import {registerOwnedProcess} from ${JSON.stringify(runner)};fs.writeFileSync(${JSON.stringify(childTrace)},JSON.stringify({pid:process.pid}));const resource=spawn(process.execPath,[${JSON.stringify(mode === 'outside-group' ? worker : resource)}],{env:process.env,detached:${mode !== 'outside-group'},stdio:'ignore'});const close=()=>{try{process.kill(${mode === 'outside-group' ? 'resource.pid' : '-resource.pid'},'SIGKILL');}catch{}};process.on('SIGTERM',()=>{close();setTimeout(()=>process.exit(19),50);});while(!fs.existsSync(${JSON.stringify(leaderTrace)})||!fs.existsSync(${JSON.stringify(workerTrace)}))await new Promise(ready=>setTimeout(ready,5));await registerOwnedProcess({kind:'next',pid:resource.pid,ownerId:process.env.PHASE_E_OWNER_ID});setTimeout(()=>{close();setTimeout(()=>process.exit(0),50);},2000);`);
    writeFileSync(driver, `import fs from 'node:fs';import cp from 'node:child_process';import {syncBuiltinESMExports} from 'node:module';const ownerId='e'.repeat(32),actualPlatform=process.platform,rawRead=fs.readFileSync,rawSpawn=cp.spawnSync;let departureTriggered=false;const pid=file=>{try{return JSON.parse(rawRead(file,'utf8')).pid;}catch{return undefined;}};
fs.readFileSync=function(path,...args){const match=typeof path==='string'&&path.match(/^\\/proc\\/(\\d+)\\/environ$/);if(match){if([pid(${JSON.stringify(leaderTrace)}),pid(${JSON.stringify(workerTrace)})].includes(Number(match[1])))return 'NEVORA_OWNED_PROCESS_OWNER='+ownerId+'\\0';throw Error('not a fixture-created PID');}return rawRead(path,...args);};
cp.spawnSync=function(command,args,options){const result=rawSpawn(command,args,options);if(${JSON.stringify(mode)}==='departed-member'&&!departureTriggered&&command==='ps'&&args[0]==='-p'&&args[1]===String(pid(${JSON.stringify(workerTrace)}))&&result.status===0&&Date.now()-started>600){departureTriggered=true;fs.writeFileSync(${JSON.stringify(depart)},'worker exits normally');rawSpawn(process.execPath,['-e','Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,80)'],{stdio:'ignore'});}if(command==='ps'&&fs.existsSync(${JSON.stringify(changed)})){const target=pid(${JSON.stringify(workerTrace)});if(${JSON.stringify(mode)}==='recycled-birth'&&args[0]==='-p'&&args[1]===String(target)&&result.stdout){const fields=result.stdout.trim().split(/\\s+/);fields[7]='1999';result.stdout=fields.join(' ')+'\\n';}if(${JSON.stringify(mode)}==='changed-ancestry'&&args[0]==='-axo'){result.stdout=result.stdout.split('\\n').map(line=>{const fields=line.trim().split(/\\s+/);return Number(fields[0])===target?[fields[0],pid(${JSON.stringify(childTrace)}),fields[2]].join(' '):line;}).join('\\n');}}return result;};syncBuiltinESMExports();Object.defineProperty(process,'platform',{value:'linux'});const api=await import(${JSON.stringify(runner)});const started=Date.now();const result=await api.superviseOwnedChild({command:process.execPath,args:[${JSON.stringify(child)}],cwd:${JSON.stringify(root)},env:{...api.safeEnvironment(),PHASE_E_OWNER_ID:ownerId},ownerId,timeoutMs:3500,graceMs:250});process.stdout.write(JSON.stringify({actualPlatform,simulation:'Linux marker retention; negative birth/ancestry field only when selected',elapsedMs:Date.now()-started,departureTriggered,result}));`);
    const execution = spawnSync(process.execPath, [driver], { encoding: 'utf8', timeout: 12_000 });
    expect(execution.status, execution.stderr).toBe(0);
    const receipt = JSON.parse(execution.stdout), supervised = receipt.result;
    expect(supervised.timedOut).toBe(false);
    expect(supervised.status, JSON.stringify(receipt)).toBe(['stable-member', 'changed-member', 'departed-member'].includes(mode) ? 0 : 1);
    if (!['stable-member', 'changed-member', 'departed-member'].includes(mode)) {
      expect(supervised.error).toBe('Owned resource observation failed');
      expect(supervised.observationFailure.reason).toMatch(/^(IDENTITY_CHANGED|MEMBER_CONTINUITY_CHANGED)$/);
      expect(JSON.stringify(supervised.observationFailure)).not.toContain('NEVORA_OWNED_PROCESS_OWNER');
    }
    if (mode === 'departed-member') expect(receipt.departureTriggered).toBe(true);
    expect(supervised.resources.length).toBeGreaterThan(0);
    expect(supervised.resources.every((item: { stopped: boolean }) => item.stopped)).toBe(true);
  } finally {
    // Test cleanup uses only the recorded group/handle created by this fixture.
    try { const leader = JSON.parse(readFileSync(leaderTrace, 'utf8')).pid; try { process.kill(mode === 'outside-group' ? leader : -leader, 'SIGKILL'); } catch { /* already stopped */ } } catch { /* fixture not started */ }
    rmSync(root, { recursive: true, force: true });
  }
}, 15_000);
