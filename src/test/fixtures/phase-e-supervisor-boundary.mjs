import assert from 'node:assert/strict';
import cp from 'node:child_process';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const runner = resolve(process.argv[2]), mode = process.argv[3];
assert(['leader-retired', 'leader-live-member', 'leader-ambiguous', 'leader-identity-error', 'leader-identity-stderr', 'root-before-poll', 'root-ambiguous', 'immediate-entry'].includes(mode));
const directory = fs.mkdtempSync(join(tmpdir(), 'nevora-e-boundary-'));
const file = name => join(directory, name);
const nativeSpawn = cp.spawn, nativeRead = cp.spawnSync, nativeFileRead = fs.readFileSync;
const nativeKill = process.kill.bind(process), nativeInterval = globalThis.setInterval;
const platform = process.platform, ownerId = 'b'.repeat(32), signals = [], lifetimes = new Map();
let identityFaultInjected = false;
let child, actualExit, triggered = false, leaseReady = false, memberSeen = false, proof, backupUsed = false;
const pid = name => { try { return JSON.parse(nativeFileRead(file(name + '.json'), 'utf8')).pid; } catch { return undefined; } };
function state(target) {
  const row = nativeRead('ps', ['-p', String(target), '-o', 'pid=,ppid=,pgid=,lstart=,stat=,command='], { encoding: 'utf8', timeout: 500 });
  assert(!row.error && !row.stderr?.trim() && [0, 1].includes(row.status));
  if (row.status === 1 && !row.stdout.trim()) return { retired: true, absent: true };
  const fields = row.stdout.trim().split(/\s+/);
  assert(Number(fields[0]) === target);
  return { pid: target, ppid: Number(fields[1]), pgid: Number(fields[2]), started: fields.slice(3, 8).join(' '), retired: fields[8].startsWith('Z'), command: fields.slice(9).join(' ') };
}
function until(check, message) {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) { const value = check(); if (value) return value; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5); }
  throw Error(message);
}
const gone = target => until(() => { const value = state(target); return value.retired && value; }, 'Native fixture process did not retire');
const leaderMode = mode.startsWith('leader-');
// Observe the first application-level IPC subscription before --import runs.
// The no-gate baseline goes straight to user entry; the protected process holds
// on its IPC listener. Both boundaries are reached by a condition, not a sleep.
fs.writeFileSync(file('observe-startup.cjs'), `const fs=require('node:fs'),on=process.on;process.on=function(event,...args){const result=on.call(this,event,...args);if(event==='message'){process.on=on;fs.writeFileSync(${JSON.stringify(file('ipc-wait'))},'ready');}return result;};`);
const callerNodeOptions = '--no-warnings' + (mode === 'immediate-entry' ? ' --require=' + file('observe-startup.cjs') : '');
fs.writeFileSync(file('worker.mjs'), `import fs from 'node:fs';fs.writeFileSync(${JSON.stringify(file('member.json'))},JSON.stringify({pid:process.pid}));process.on('SIGTERM',()=>{});setInterval(()=>{if(fs.existsSync(${JSON.stringify(file('retitle'))})){process.title='changed-owned-member';fs.writeFileSync(${JSON.stringify(file('retitled'))},'ready');}},5);`);
fs.writeFileSync(file('leader.mjs'), `import fs from 'node:fs';import {spawn} from 'node:child_process';fs.writeFileSync(${JSON.stringify(file('leader.json'))},JSON.stringify({pid:process.pid}));spawn(process.execPath,[${JSON.stringify(file('worker.mjs'))}],{env:process.env,stdio:'ignore'});setInterval(()=>{},100);`);
fs.writeFileSync(file('child.mjs'), mode === 'immediate-entry'
  ? `import fs from 'node:fs';fs.writeFileSync(${JSON.stringify(file('entered'))},JSON.stringify({argv:process.argv.slice(2),nodeOptions:process.env.NODE_OPTIONS,connected:process.connected}));process.exit(0);`
  : `import fs from 'node:fs';import {spawn} from 'node:child_process';const resource=spawn(process.execPath,[${JSON.stringify(file(leaderMode ? 'leader.mjs' : 'worker.mjs'))}],{env:process.env,detached:${leaderMode},stdio:'ignore'});process.on('SIGTERM',()=>{try{process.kill(${leaderMode ? '-resource.pid' : 'resource.pid'},'SIGKILL');}catch{}process.exit(0);});setInterval(()=>{if(fs.existsSync(${JSON.stringify(file('root-exit'))}))process.exit(0);},5);`);
cp.spawn = function(command, args, options) {
  const spawned = nativeSpawn(command, args, options);
  if (command === process.execPath && args[0] === file('child.mjs')) {
    child = spawned;
    spawned.once('exit', (status, signal) => { actualExit = { status, signal }; });
  }
  return spawned;
};
// Linux marker retention after process.title is modeled on Darwin only. Native
// PID/lifetime reads remain real and reject absent or zombie process markers.
fs.readFileSync = function(path, ...args) {
  const match = typeof path === 'string' && path.match(/^\/proc\/(\d+)\/environ$/);
  if (!match) return nativeFileRead(path, ...args);
  const target = Number(match[1]);
  assert([child?.pid, pid('leader'), pid('member')].includes(target));
  if (!lifetimes.has(target)) { const actual = state(target); if (!actual.retired) lifetimes.set(target, actual); }
  if (target === pid('member')) {
    memberSeen = true;
    if (!leaseReady) setImmediate(() => { leaseReady = true; if (leaderMode) fs.writeFileSync(file('retitle'), 'ready'); });
  }
  let environment;
  if (platform === 'linux') environment = nativeFileRead(path, ...args);
  else {
    if (state(target).retired) { const error = Error('Native fixture retired'); error.code = 'ENOENT'; throw error; }
    environment = 'NEVORA_OWNED_PROCESS_OWNER=' + ownerId + '\0';
  }
  if (leaderMode && !triggered && leaseReady && target === pid('member') && fs.existsSync(file('retitled'))) {
    triggered = true;
    const before = { leader: state(pid('leader')), member: state(pid('member')) };
    nativeKill(mode === 'leader-live-member' ? pid('leader') : -pid('leader'), 'SIGKILL');
    proof = { before, after: { leader: gone(pid('leader')), member: mode === 'leader-live-member' ? state(pid('member')) : gone(pid('member')) } };
    fs.writeFileSync(file('root-exit'), 'exit');
  }
  return environment;
};
cp.spawnSync = function(command, args, options) {
  if (mode === 'immediate-entry' && !triggered && command === 'ps' && args[0] === '-p' && args[1] === String(child?.pid)) {
    triggered = true;
    until(() => fs.existsSync(file('entered')) || fs.existsSync(file('ipc-wait')), 'Neither entry completion nor IPC startup wait was reached');
    const enteredBeforePin = fs.existsSync(file('entered'));
    proof = { enteredBeforePin, beforeIdentity: enteredBeforePin ? gone(child.pid) : state(child.pid), exitEventPending: actualExit === undefined };
  }
  if (triggered && mode.endsWith('ambiguous') && command === 'ps' && args.at(-1) === 'pid=,stat=' && args[1] === String(leaderMode ? pid('leader') : child?.pid)) {
    return { status: 1, stdout: '', stderr: 'fixture retirement observer diagnostic' };
  }
  if (triggered && !identityFaultInjected && mode.startsWith('leader-identity-') && command === 'ps' && args[1] === String(pid('leader')) && args.at(-1) === 'pid=,ppid=,pgid=,lstart=,stat=,command=') {
    identityFaultInjected = true;
    return { status: 1, stdout: '', stderr: mode.endsWith('stderr') ? 'fixture identity observer diagnostic' : '', ...(mode.endsWith('error') ? { error: Error('fixture identity observer failed') } : {}) };
  }
  const row = nativeRead(command, args, options);
  return row;
};
// Trigger immediately before a real 250ms snapshot callback; exitCode must still
// be null because this synchronous boundary prevents delivery of the exit event.
globalThis.setInterval = function(callback, milliseconds, ...args) {
  return nativeInterval(function(...values) {
    if (mode.startsWith('root-') && leaseReady && memberSeen && !triggered && milliseconds === 250) {
      triggered = true;
      const before = { root: state(child.pid), member: state(pid('member')) };
      fs.writeFileSync(file('root-exit'), 'exit');
      const root = gone(child.pid);
      const member = until(() => { const value = state(pid('member')); return value.ppid !== child.pid && value; }, 'Member not reparented');
      proof = { before, after: { root, member }, exitEventPending: actualExit === undefined && child.exitCode === null };
    }
    return callback(...values);
  }, milliseconds, ...args);
};
process.kill = function(target, signal) { signals.push({ pid: target, signal }); return nativeKill(target, signal); };
Object.defineProperty(process, 'platform', { value: 'linux' });
syncBuiltinESMExports();
let result;
try {
  const api = await import(pathToFileURL(runner));
  result = await api.superviseOwnedChild({ command: process.execPath, args: [file('child.mjs'), 'caller-argument'], cwd: directory, env: { ...api.safeEnvironment(), NODE_OPTIONS: callerNodeOptions }, ownerId, timeoutMs: 6000, graceMs: 100 });
} finally {
  cp.spawn = nativeSpawn; cp.spawnSync = nativeRead; fs.readFileSync = nativeFileRead; process.kill = nativeKill; globalThis.setInterval = nativeInterval;
  Object.defineProperty(process, 'platform', { value: platform }); syncBuiltinESMExports();
  for (const target of [pid('member'), pid('leader'), child?.pid].filter(Boolean)) {
    const actual = state(target);
    if (!actual.retired) {
      const original = lifetimes.get(target);
      assert(original && actual.started === original.started && actual.pgid === original.pgid, 'Refusing backup cleanup without fixture lifetime proof');
      backupUsed = true; nativeKill(target, 'SIGKILL'); gone(target);
    }
  }
}
assert(triggered, 'Requested boundary was not reached');
const receipt = { mode, platform, callerNodeOptions, identityFaultInjected, originalMember: lifetimes.get(pid('member')), proof, result, actualExit, signals, backupUsed, entry: fs.existsSync(file('entered')) ? JSON.parse(nativeFileRead(file('entered'), 'utf8')) : undefined };
fs.rmSync(directory, { recursive: true, force: true });
process.stdout.write(JSON.stringify(receipt));
