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
