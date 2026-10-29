import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
