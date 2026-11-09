import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';

const runner = resolve('scripts/phase-e-owned.mjs');
it('gated Node preserves import order, entry arguments, fork IPC and descendant startup', () => {
  const root = mkdtempSync(join(tmpdir(), 'nevora-e-gate-'));
  try {
    const output = join(root, 'entry.json'), order = join(root, 'imports'), worker = join(root, 'worker.mjs'), child = join(root, 'child.mjs');
    const preload = (name: string) => {
      const path = join(root, name + '.mjs');
      writeFileSync(path, `import fs from 'node:fs';fs.appendFileSync(${JSON.stringify(order)},${JSON.stringify(name + '\n')});`);
      return path;
    };
    const environmentImport = preload('environment'), argumentImport = preload('argument');
    const nodeOptions = '--no-warnings --import=' + environmentImport;
    writeFileSync(worker, `process.send({nodeOptions:process.env.NODE_OPTIONS,argv:process.argv.slice(2),execArgv:process.execArgv});process.disconnect();`);
    writeFileSync(child, `import fs from 'node:fs';import {fork} from 'node:child_process';import {once} from 'node:events';
const order=fs.readFileSync(${JSON.stringify(order)},'utf8');
const worker=fork(${JSON.stringify(worker)},['worker-argument'],{stdio:['ignore','ignore','ignore','ipc']});
const closed=once(worker,'exit');const [message]=await once(worker,'message');const [status,signal]=await closed;
fs.writeFileSync(${JSON.stringify(output)},JSON.stringify({order,argv:process.argv.slice(2),execArgv:process.execArgv,nodeOptions:process.env.NODE_OPTIONS,connected:process.connected,message,status,signal}));`);
    const args = ['--import', argumentImport, child, 'entry-argument'];
    const driver = `const api=await import(${JSON.stringify(runner)});const result=await api.superviseOwnedChild({command:process.execPath,args:${JSON.stringify(args)},cwd:${JSON.stringify(root)},env:{...api.safeEnvironment(),NODE_OPTIONS:${JSON.stringify(nodeOptions)}},ownerId:'a'.repeat(32),timeoutMs:5000,graceMs:100});process.stdout.write(JSON.stringify(result));`;
    const execution = spawnSync(process.execPath, ['--input-type=module', '-e', driver], { encoding: 'utf8', timeout: 10000 });
    expect(execution.status, execution.stderr).toBe(0);
    const result = JSON.parse(execution.stdout);
    expect(result, JSON.stringify(result)).toMatchObject({ status: 0, timedOut: false });
    expect(result.observationFailure).toBeUndefined();
    expect(JSON.parse(readFileSync(output, 'utf8'))).toEqual({ order: 'environment\nargument\n', argv: ['entry-argument'], execArgv: ['--import', argumentImport], nodeOptions, connected: true, message: { nodeOptions, argv: ['worker-argument'], execArgv: ['--import', argumentImport] }, status: 0, signal: null });
  } finally { rmSync(root, { recursive: true, force: true }); }
});

it('gated Node allows default and nested Worker startup without inherited IPC waits or environment rewrites', () => {
  const root = mkdtempSync(join(tmpdir(), 'nevora-e-worker-gate-'));
  try {
    const output = join(root, 'entry.json'), nested = join(root, 'nested.mjs'), worker = join(root, 'worker.mjs'), child = join(root, 'child.mjs');
    writeFileSync(nested, `import {parentPort,isMainThread} from 'node:worker_threads';parentPort.postMessage({pid:process.pid,isMainThread,nodeOptions:process.env.NODE_OPTIONS});`);
    writeFileSync(worker, `import {Worker,parentPort,isMainThread} from 'node:worker_threads';import {once} from 'node:events';
const nested=new Worker(${JSON.stringify(nested)});const closed=once(nested,'exit');const [message]=await once(nested,'message');const status=await closed;
parentPort.postMessage({pid:process.pid,isMainThread,nodeOptions:process.env.NODE_OPTIONS,nested:message,nestedStatus:status[0]});`);
    writeFileSync(child, `import fs from 'node:fs';import {Worker} from 'node:worker_threads';import {once} from 'node:events';
process.env.NODE_OPTIONS='--trace-warnings';
const worker=new Worker(${JSON.stringify(worker)});const closed=once(worker,'exit');const [message]=await once(worker,'message');const status=await closed;
fs.writeFileSync(${JSON.stringify(output)},JSON.stringify({pid:process.pid,nodeOptions:process.env.NODE_OPTIONS,worker:message,status:status[0]}));`);
    const driver = `const api=await import(${JSON.stringify(runner)});const result=await api.superviseOwnedChild({command:process.execPath,args:[${JSON.stringify(child)}],cwd:${JSON.stringify(root)},env:{...api.safeEnvironment(),NODE_OPTIONS:'--no-warnings'},ownerId:'a'.repeat(32),timeoutMs:5000,graceMs:100});process.stdout.write(JSON.stringify(result));`;
    const execution = spawnSync(process.execPath, ['--input-type=module', '-e', driver], { encoding: 'utf8', timeout: 10000 });
    expect(execution.status, execution.stderr).toBe(0);
    const result = JSON.parse(execution.stdout);
    expect(result, execution.stderr + execution.stdout).toMatchObject({ status: 0, timedOut: false });
    expect(result.observationFailure).toBeUndefined();
    const receipt = JSON.parse(readFileSync(output, 'utf8'));
    expect(receipt).toEqual({ pid: receipt.pid, nodeOptions: '--trace-warnings', worker: { pid: receipt.pid, isMainThread: false, nodeOptions: '--trace-warnings', nested: { pid: receipt.pid, isMainThread: false, nodeOptions: '--trace-warnings' }, nestedStatus: 0 }, status: 0 });
  } finally { rmSync(root, { recursive: true, force: true }); }
});

it('gated main-thread startup without supervisor IPC fails before user entry', () => {
  const root = mkdtempSync(join(tmpdir(), 'nevora-e-missing-ipc-'));
  try {
    const output = join(root, 'entered'), child = join(root, 'child.mjs');
    writeFileSync(child, `import fs from 'node:fs';fs.writeFileSync(${JSON.stringify(output)},'entered');`);
    const driver = `import cp from 'node:child_process';import {syncBuiltinESMExports} from 'node:module';
const spawn=cp.spawn;cp.spawn=(command,args,options)=>spawn(command,args,{...options,stdio:options.stdio.slice(0,3)});syncBuiltinESMExports();
const api=await import(${JSON.stringify(runner)});const result=await api.superviseOwnedChild({command:process.execPath,args:[${JSON.stringify(child)}],cwd:${JSON.stringify(root)},env:api.safeEnvironment(),ownerId:'a'.repeat(32),timeoutMs:5000,graceMs:100});process.stdout.write(JSON.stringify(result));`;
    const execution = spawnSync(process.execPath, ['--input-type=module', '-e', driver], { encoding: 'utf8', timeout: 10000 });
    expect(execution.status, execution.stderr).toBe(0);
    expect(JSON.parse(execution.stdout)).toMatchObject({ status: 1, timedOut: false, resources: [] });
    expect(existsSync(output)).toBe(false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
