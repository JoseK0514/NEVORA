import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gitFileList } from './lib/git-files.mjs';

export function ownedExecutionTimeout(mode, suite) {
  assert(['sql','browser'].includes(mode), 'Unknown execution mode');
  return mode === 'sql' ? 480_000 : suite === 'all' ? 2_700_000 : 1_800_000;
}

// Suite owners add real fixtures at these paths. Absence never means success.
export const SQL_SUITES = Object.freeze({
  assignments: 'src/test/integration/phase-e-published-assignments.integration.ts',
  attention: 'src/test/integration/phase-e-attention.integration.ts',
  'communications-schema': 'src/test/integration/phase-e-communications-schema.integration.ts',
  communications: 'src/test/integration/phase-e-communications.integration.ts',
  'communication-ack': 'src/test/integration/phase-e-communication-ack.integration.ts',
  'communication-notifications': 'src/test/integration/phase-e-communication-notifications.integration.ts',
  home: 'src/test/integration/phase-e-home.integration.ts',
  'calendar-tokens': 'src/test/integration/phase-e-calendar-tokens.integration.ts',
  'calendar-feed': 'src/test/integration/phase-e-calendar-feed.integration.ts',
  'employee-navigation': 'src/test/integration/phase-e-employee-navigation.integration.ts',
});
export const SQL_DATABASE_PREFIXES = Object.freeze({
  assignments: 'nevora_foundation_test_',
  attention: 'nevora_foundation_test_',
  'communications-schema': 'nevora_foundation_test_',
  communications: 'nevora_foundation_test_',
  'communication-ack': 'nevora_foundation_test_',
  'communication-notifications': 'fuel_phase3_test_',
  home: 'nevora_foundation_test_',
  'calendar-tokens': 'nevora_foundation_test_',
  'calendar-feed': 'nevora_foundation_test_',
  'employee-navigation': 'nevora_foundation_test_',
});
export const BROWSER_SUITES = Object.freeze(Object.fromEntries(['home', 'communications', 'calendar', 'navigation', 'attention'].map(suite => [suite, `scripts/phase-e-${suite}-browser-scenarios.mjs`])));
export const ENGINES = Object.freeze(['chromium', 'webkit']);
export const WIDTHS = Object.freeze([320, 375, 390, 430, 768, 1024, 1440]);
const REQUIRED_JOBS = ['validate', 'clocker-postgres', 'release-postgres', 'phase-d-attendance-ui', 'phase-e-postgres', 'phase-e-ui'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = path => JSON.parse(readFileSync(path, 'utf8'));
const delay = ms => new Promise(ready => setTimeout(ready, ms));
export function installTerminationHandlers(handler) {
  let received = false;
  const listeners = ['SIGINT', 'SIGTERM', 'SIGHUP'].map(signal => {
    const listener = () => { if (!received) { received = true; Promise.resolve(handler(signal)).catch(() => { process.exitCode = 1; }); } };
    process.on(signal, listener); return [signal, listener];
  });
  return () => { for (const [signal, listener] of listeners) process.off(signal, listener); };
}
export function raceOwnedAbort(promise, signal) {
  return new Promise((ready, reject) => {
    const aborted = () => reject(signal.reason ?? Error('Owned runtime aborted'));
    if (signal.aborted) aborted(); else signal.addEventListener('abort', aborted, { once: true });
    Promise.resolve(promise).then(ready, reject).finally(() => signal.removeEventListener('abort', aborted));
  });
}
function processTable() {
  const result = spawnSync('ps', ['-axo', 'pid=,ppid=,pgid='], { encoding: 'utf8', timeout: 2000 });
  if (result.error || result.status !== 0) throw Error('Cannot prove owned process ancestry');
  return new Map(result.stdout.trim().split('\n').map(line => line.trim().split(/\s+/).map(Number)).filter(row => row.length === 3).map(([pid, ppid, pgid]) => [pid, { ppid, pgid }]));
}
function isDescendant(pid, ancestor, table) {
  const visited = new Set();
  while (pid > 1 && !visited.has(pid)) {
    if (pid === ancestor) return true;
    visited.add(pid); pid = table.get(pid)?.ppid ?? 0;
  }
  return false;
}
function processIdentity(pid) {
  if (!Number.isSafeInteger(pid) || pid < 2) throw Error('Invalid owned process identity');
  const result = spawnSync('ps', ['-p', String(pid), '-o', 'pid=,ppid=,pgid=,lstart=,stat=,command='], { encoding: 'utf8', timeout: 2000 });
  if (result.error || result.stderr?.trim()) throw Error('Cannot verify owned process identity');
  if (result.status === 1 && !result.stdout?.trim()) return undefined;
  if (result.status !== 0 || !result.stdout?.trim()) throw Error('Cannot verify owned process identity');
  const parts = result.stdout.trim().split(/\s+/);
  if (parts[8]?.startsWith('Z')) return undefined;
  const command=parts.slice(9).join(' ');
  // procps reports [name] when argv is unavailable. It is an observation of a
  // lifetime, not a final command identity that can establish a resource lease.
  return { pid, ppid: Number(parts[1]), pgid: Number(parts[2]), started: parts.slice(3, 8).join(' '), commandHash: hash(command), commandUnavailable:!command||/^\[[\s\S]*\]$/.test(command) };
}
const retiredProcess = Symbol('retired-process');
function environmentFailure(pid, phase, reason, code) {
  return Object.assign(Error(reason === 'OWNERSHIP_LOST' ? 'Live process lost invocation ownership; refusing signal' : 'Cannot reprove owned process environment'), {
    observationFailure: { reason, pid, phase: ['root-environment', 'member-environment'].includes(phase) ? phase : 'environment', errno: ['ENOENT', 'ESRCH', 'EACCES', 'EIO'].includes(code) ? code : code === undefined ? 'unavailable' : 'other' },
  });
}
function ownedProcessIdentity(pid, ownerId, required = false, { allowRetirement = false, phase = 'environment' } = {}) {
  const identity = processIdentity(pid);
  if (!identity) return undefined;
  const marker = 'NEVORA_OWNED_PROCESS_OWNER=' + ownerId;
  let owned;
  if (process.platform === 'linux') {
    try { owned = readFileSync('/proc/' + pid + '/environ', 'utf8').split('\0').includes(marker); }
    catch (error) {
      if (allowRetirement && ['ENOENT', 'ESRCH', 'EACCES'].includes(error.code) && observedProcessExit(pid)) return retiredProcess;
      if (required) throw environmentFailure(pid, phase, 'OWNERSHIP_UNAVAILABLE', error.code);
      return undefined;
    }
  } else {
    const environment = spawnSync('ps', ['eww', '-p', String(pid), '-o', 'command='], { encoding: 'utf8', timeout: 2000 });
    if (environment.error || environment.stderr?.trim() || environment.status !== 0) {
      if (allowRetirement && !environment.error && !environment.stderr?.trim() && environment.status === 1 && !environment.stdout?.trim() && observedProcessExit(pid)) return retiredProcess;
      if (required) throw environmentFailure(pid, phase, 'OWNERSHIP_UNAVAILABLE', environment.error?.code);
      return undefined;
    }
    owned = new RegExp('(?:^|\\s)' + marker + '(?:\\s|$)').test(environment.stdout);
  }
  if (!owned) {
    if (allowRetirement && observedProcessExit(pid)) return retiredProcess;
    if (required) throw environmentFailure(pid, phase, 'OWNERSHIP_LOST');
    return undefined;
  }
  return identity;
}
function assertSameProcess(actual, lease) {
  if (actual && (actual.pid !== lease.pid || actual.pgid !== lease.pgid || actual.started !== lease.started || actual.commandHash !== lease.commandHash)) throw Object.assign(Error('Owned process identity changed; refusing signal'), {
    observationFailure: { reason: 'IDENTITY_CHANGED', expected: processLeaseFields(lease), observed: processLeaseFields(actual) },
  });
}
function observedProcessExit(pid) {
  const observation = spawnSync('ps', ['-p', String(pid), '-o', 'pid=,stat='], { encoding: 'utf8', timeout: 2000 });
  if (observation.error || observation.stderr?.trim()) return undefined;
  const output = observation.stdout?.trim() ?? '';
  if (observation.status === 1 && !output) return 'absent';
  const fields = output.split(/\s+/);
  if (observation.status === 0 && fields.length === 2 && Number(fields[0]) === pid && fields[1].startsWith('Z')) return 'zombie';
  return undefined;
}
function processLeaseFields(identity) {
  return { pid: identity.pid, ppid: identity.ppid, pgid: identity.pgid, started: identity.started, commandHash: identity.commandHash };
}
export async function registerOwnedProcess({ kind, pid, ownerId }) {
  if (!process.send || ownerId !== process.env.PHASE_E_OWNER_ID) throw Error('Owned runtime supervisor required');
  const requestId = randomBytes(16).toString('hex');
  await new Promise((ready, reject) => {
    const finish = error => { clearTimeout(timer); process.off('message', reply); error ? reject(error) : ready(); };
    const reply = message => { if (message?.type === 'owned-process-registered' && message.requestId === requestId) finish(message.accepted ? undefined : Error('Owned process registration refused')); };
    const timer = setTimeout(() => finish(Error('Owned process registration timed out')), 5000);
    process.on('message', reply);
    process.send({ type: 'register-owned-process', requestId, kind, pid, ownerId }, error => { if (error) finish(Error('Owned runtime supervisor disconnected')); });
  });
}
// Hold Node's entry point until the creation-handle identity has been pinned.
// NODE_OPTIONS preserves the caller's argv/execArgv and orders this import before
// command-line imports. Restore the caller's options before any descendants run.
// Worker threads inherit parsed startup imports even after NODE_OPTIONS changes.
// They share the already-pinned PID and must not repeat its IPC wait or env reset.
function pinnedNodeEnvironment(env, ownerId) {
  const gate = `
    import { isMainThread } from 'node:worker_threads';
    if (isMainThread) {
      ${env.NODE_OPTIONS === undefined ? 'delete process.env.NODE_OPTIONS;' : `process.env.NODE_OPTIONS = ${JSON.stringify(env.NODE_OPTIONS)};`}
      await new Promise((ready, reject) => {
        const close = () => { process.off('message', message); process.off('disconnect', disconnected); };
        const disconnected = () => { close(); reject(Error('Owned supervisor disconnected before root pin')); };
        const message = value => {
          if (value?.type !== 'owned-root-pinned' || value.ownerId !== ${JSON.stringify(ownerId)}) return;
          close(); ready();
        };
        process.on('message', message);
        process.once('disconnect', disconnected);
        process.send({ type: 'owned-root-ready' }, error => { if (error) disconnected(); });
      });
    }
  `;
  return { ...env, NODE_OPTIONS: '--import="data:text/javascript,' + encodeURIComponent(gate) + '"' + (env.NODE_OPTIONS ? ' ' + env.NODE_OPTIONS : '') };
}
/** Async supervision keeps the cleanup owner alive for grace, then signals only
 * independently observed descendants carrying this invocation's random marker.
 * Start/command identity is rechecked before every fallback signal; mutable
 * runtime ownership JSON is never sufficient authority to signal a PID. */
export async function superviseOwnedChild({ command, args, cwd, env, ownerId, timeoutMs, graceMs = 7500, signal }) {
  if (!/^[a-f0-9]{32}$/.test(ownerId) || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || !Number.isSafeInteger(graceMs) || graceMs < 1) throw Error('Invalid owned supervision contract');
  const childEnv = command === process.execPath ? pinnedNodeEnvironment(env, ownerId) : env;
  const leases = new Map(), rejectedInitial = new Set(), child = spawn(command, args, { cwd, env: { ...childEnv, NEVORA_OWNED_PROCESS_OWNER: ownerId }, detached: process.platform !== 'win32', stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
  let failure, observationFailure, escalation, rootLease, initialRootExit, stopping = false;
  // Keep only our bounded reason codes and identity hashes, never argv/env.
  const retainObservationFailure = error => {
    observationFailure ??= error.observationFailure ?? { reason: ({
      'Cannot prove owned process ancestry': 'ANCESTRY_UNAVAILABLE',
      'Cannot verify owned process identity': 'IDENTITY_UNAVAILABLE',
      'Cannot reprove owned process environment': 'OWNERSHIP_UNAVAILABLE',
      'Live process lost invocation ownership; refusing signal': 'OWNERSHIP_LOST',
      'Process is not an owned child descendant': 'DESCENDANT_UNPROVEN',
      'Process lacks invocation ownership': 'OWNERSHIP_UNPROVEN',
      'Owned group leader is no longer proven': 'LEADER_UNPROVEN',
    })[error.message] ?? 'UNCLASSIFIED_OBSERVATION_FAILURE' };
  };
  const continuityFailure = (expected, observed) => Object.assign(Error('Owned member continuity changed'), {
    observationFailure: { reason: 'MEMBER_CONTINUITY_CHANGED', expected: processLeaseFields(expected), observed: processLeaseFields(observed) },
  });
  const rootGroupProof = sampledMember => {
    // Retirement discards only this stale sample. It never proves ownership or
    // authorizes a lease/signal, and a surviving or uncertain member still fails.
    const retiredSample = () => {
      if (sampledMember && observedProcessExit(child.pid) && observedProcessExit(sampledMember.pid)) return retiredProcess;
      throw Object.assign(Error('Owned group leader is no longer proven'), { observationFailure: { reason: 'LEADER_UNPROVEN', pid: child.pid, phase: 'root-environment' } });
    };
    if (!rootLease || child.exitCode !== null || child.signalCode !== null) return retiredSample();
    const actual = ownedProcessIdentity(child.pid, ownerId, true, { allowRetirement: Boolean(sampledMember), phase: 'root-environment' });
    if (!actual || actual === retiredProcess) return retiredSample();
    assertSameProcess(actual, rootLease);
    if (actual.ppid !== rootLease.ppid || actual.ppid !== process.pid || actual.pgid !== actual.pid) throw continuityFailure(rootLease, actual);
    return actual;
  };
  const remember = (pid, kind, table = processTable(), observedIdentity) => {
    if (rejectedInitial.has(pid)) throw Error('Owned initial process proof was already rejected');
    if (!child.pid || pid === child.pid || !isDescendant(pid, child.pid, table)) throw Error('Process is not an owned child descendant');
    // Only snapshot supplies this current independently collected identity.
    // Registration always reads fresh; cached leases/IPC/receipts cannot supply it.
    let identity = observedIdentity ?? ownedProcessIdentity(pid, ownerId);
    if (!identity) throw Error('Process lacks invocation ownership');
    const previous = leases.get(pid);
    const awaitingCommand=candidate=>candidate.commandUnavailable||(candidate.ppid===child.pid&&candidate.pid===candidate.pgid&&candidate.commandHash===rootLease?.commandHash);
    if (!previous && rootLease && awaitingCommand(identity)) {
      // A poll can see inherited parent argv or Linux's bracketed fallback
      // before command arguments are available. Neither can create a first lease.
      // Collect a bounded post-exec proof BEFORE creating its first lease;
      // an established lease can never take this path or change its command.
      const birth = identity, by = performance.now() + 250, pause = new Int32Array(new SharedArrayBuffer(4));
      const unresolved = () => Object.assign(Error('Owned child exec identity unresolved'), {
        observationFailure: { reason: 'EXEC_IDENTITY_UNRESOLVED', pid, phase: 'initial-binding' },
      });
      try {
        do {
          rootGroupProof();
          if (performance.now() >= by) throw unresolved();
          Atomics.wait(pause, 0, 0, 5);
          const fresh = ownedProcessIdentity(pid, ownerId, true);
          if (!fresh) throw Error('Process lacks invocation ownership');
          if (fresh.pid !== birth.pid || fresh.started !== birth.started || fresh.ppid !== birth.ppid || fresh.pgid !== birth.pgid) throw continuityFailure(birth, fresh);
          identity = fresh;
        } while (awaitingCommand(identity));
        rootGroupProof();
        table = processTable();
        if (!isDescendant(pid, child.pid, table) || table.get(pid)?.ppid !== birth.ppid) throw continuityFailure(birth, identity);
        if (performance.now() >= by) throw unresolved();
      } catch (error) {
        // A failed first proof must never become fresh cleanup or registration
        // authority when stop() rescans or an already-queued IPC message arrives.
        rejectedInitial.add(pid); retainObservationFailure(error); throw error;
      }
    }
    const rootMember = rootLease && identity.pgid === rootLease.pid;
    if (rootMember && kind === 'owned-descendant' && (!previous || previous.kind === 'owned-descendant') && rootGroupProof(identity) === retiredProcess) return;
    if (previous) {
      const leader = leases.get(previous.pgid);
      if (rootMember && kind === 'owned-descendant' && previous.kind === 'owned-descendant') {
        if (identity.pid !== previous.pid || identity.started !== previous.started || identity.pgid !== previous.pgid || identity.ppid !== previous.ppid || !isDescendant(pid, rootLease.pid, table)) throw continuityFailure(previous, identity);
        identity.commandHash = previous.commandHash;
      } else if (kind === 'owned-descendant' && identity.commandHash !== previous.commandHash && previous.pid !== previous.pgid && leader?.pid === previous.pgid && leader.pgid === leader.pid) {
        // A title change grants no new signal authority. Only re-observation of
        // an already proven member may vary argv, while birth/group/parent and
        // ancestry continue and its still-live group leader has full proof.
        if (identity.pid !== previous.pid || identity.started !== previous.started || identity.pgid !== previous.pgid || identity.ppid !== previous.ppid || !isDescendant(pid, leader.pid, table) || !isDescendant(leader.pid, child.pid, table)) throw Object.assign(Error('Owned member continuity changed'), {
          observationFailure: { reason: 'MEMBER_CONTINUITY_CHANGED', expected: processLeaseFields(previous), observed: processLeaseFields(identity) },
        });
        const actualLeader = ownedProcessIdentity(leader.pid, ownerId, true, { allowRetirement: true, phase: 'member-environment' });
        if (!actualLeader || actualLeader === retiredProcess) {
          // A stale changed-title sample grants no lease or signaling authority.
          // Both lifetimes must have retired; a surviving or uncertain member
          // still requires its live, independently proven leader.
          if (observedProcessExit(leader.pid) && observedProcessExit(identity.pid)) return;
          throw Error('Owned group leader is no longer proven');
        }
        assertSameProcess(actualLeader, leader);
        // Retain the original command hash: it must not become independent PID
        // or registration authority if this worker later loses its group proof.
        identity.commandHash = previous.commandHash;
      } else assertSameProcess(identity, previous);
    }
    leases.set(pid, { ...identity, ppid:previous?.ppid??table.get(pid).ppid, lastObservedPpid:identity.ppid, kind: previous?.kind === 'owned-descendant' ? kind : previous?.kind ?? kind });
  };
  const snapshot = () => {
    // SIGCHLD delivery may lag behind ps. Once our root is positively retired,
    // the exit path owns cleanup from existing leases, without new discoveries.
    if (child.pid && observedProcessExit(child.pid)) return;
    const table = processTable();
    for (const lease of leases.values()) if (rootLease && lease.pgid === rootLease.pid) {
      const actual = processIdentity(lease.pid);
      if (!actual) continue;
      if (actual.started !== lease.started || actual.pgid !== lease.pgid || !isDescendant(lease.pid, child.pid, table)) throw continuityFailure(lease, actual);
      if (rootGroupProof(actual) === retiredProcess) continue;
      ownedProcessIdentity(lease.pid, ownerId, true, { allowRetirement: true, phase: 'member-environment' });
    }
    for (const pid of table.keys()) if (pid !== child.pid && !rejectedInitial.has(pid) && isDescendant(pid, child.pid, table)) {
      const identity = ownedProcessIdentity(pid, ownerId);
      if (identity) remember(pid, 'owned-descendant', table, identity);
    }
  };
  const stop = (message, status) => {
    if (stopping) return;
    stopping = true; failure = { message, status };
    try { snapshot(); } catch (error) { retainObservationFailure(error); failure.message = 'Owned resource observation failed'; }
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
    escalation = setTimeout(() => {
      try { snapshot(); } catch (error) { retainObservationFailure(error); failure.message = 'Owned resource observation failed'; }
      if (child.exitCode === null && child.signalCode === null && child.pid) {
        try { process.kill(process.platform === 'win32' ? child.pid : -child.pid, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') failure.message = 'Owned child forced termination failed'; }
      }
    }, graceMs);
  };
  child.once('spawn', () => {
    let unavailable = false;
    try {
      const identity = ownedProcessIdentity(child.pid, ownerId, true);
      if (!identity) { unavailable = true; throw Error('Owned group leader is no longer proven'); }
      if (identity.pgid !== child.pid || identity.ppid !== process.pid) throw Error('Owned group leader is no longer proven');
      // Pin once from the creation handle; this root never becomes a resource
      // lease or registration authority, and its command must remain unchanged.
      rootLease = identity;
    } catch (error) {
      retainObservationFailure(error);
      const missingObservation = unavailable || ['Cannot reprove owned process environment', 'Cannot verify owned process identity'].includes(error.message);
      const exitProof = missingObservation && !stopping ? observedProcessExit(child.pid) : undefined;
      if (exitProof) {
        initialRootExit = exitProof; observationFailure.initialRootExit = exitProof;
        stopping = true; failure = { message: 'Owned resource observation failed', status: 1 };
      } else stop('Owned resource observation failed', 1);
    }
  });
  child.on('message', message => {
    if (message?.type === 'owned-root-ready') {
      if (rootLease && !stopping && child.connected) child.send({ type: 'owned-root-pinned', ownerId }, error => { if (error) stop('Owned child startup gate failed', 1); });
      return;
    }
    if (message?.type !== 'register-owned-process') return;
    let accepted = false;
    try {
      if (stopping || message.ownerId !== ownerId || !['next', 'browser-chromium', 'browser-webkit'].includes(message.kind)) throw Error('Invalid resource registration');
      remember(message.pid, message.kind); accepted = true;
    } catch { stop('Owned process registration refused', 1); }
    if (child.connected) child.send({ type: 'owned-process-registered', requestId: message.requestId, accepted }, () => {});
  });
  const deadline = setTimeout(() => stop('Owned child timed out', 124), timeoutMs);
  const poll = setInterval(() => { if (!stopping) { try { snapshot(); } catch (error) { retainObservationFailure(error); stop('Owned resource observation failed', 1); } } }, 250);
  const aborted = () => stop('Owned supervisor termination signal', 1);
  signal?.addEventListener('abort', aborted, { once: true });
  if (signal?.aborted) aborted();
  const outcome = await new Promise(ready => {
    child.once('error', () => { failure = { message: 'Owned child could not start', status: 1 }; ready({ status: 1, signal: undefined }); });
    child.once('exit', (status, exitSignal) => ready({ status, signal: exitSignal }));
  });
  clearTimeout(deadline); clearTimeout(escalation); clearInterval(poll); signal?.removeEventListener('abort', aborted);
  const resources = [...leases.values()];
  const groups = new Map(resources.filter(lease => lease.pgid === lease.pid).map(lease => [lease.pgid, lease]));
  if (rootLease && resources.some(lease => lease.pgid === rootLease.pid)) groups.set(rootLease.pgid, rootLease);
  const individuals = resources.filter(lease => !groups.has(lease.pgid));
  const sameLifetime = (actual, lease) => {
    if (actual && (actual.pid !== lease.pid || actual.pgid !== lease.pgid || actual.started !== lease.started)) throw Error('Owned process lifetime changed; refusing signal');
    return actual;
  };
  const liveResource = lease => sameLifetime(processIdentity(lease.pid), lease);
  const signalGroup = (leader, kind) => {
    const actual = processIdentity(leader.pid);
    if (actual) {
      // A live leader must still carry the independently verified marker/identity.
      assertSameProcess(ownedProcessIdentity(leader.pid, ownerId, true), leader);
      if (leader === rootLease) rootGroupProof();
    } else {
      // Its original observed member keeps this invocation-created process group
      // alive: the PGID cannot be reused while that same member remains in it.
      // Next may overwrite a member's argv/environment with process.title; that
      // member grants no individual signalling authority. Only the proven group
      // is signalled, using PID/start/PGID continuity, never mutable JSON/title.
      let anchored = false;
      for (const lease of resources.filter(lease => lease.pgid === leader.pgid)) {
        if (!liveResource(lease)) continue;
        if (leader === rootLease) {
          const actual = sameLifetime(ownedProcessIdentity(lease.pid, ownerId, true), lease);
          if (!actual) continue;
          if (lease.kind !== 'owned-descendant') assertSameProcess(actual, lease);
        }
        anchored = true;
      }
      if (!anchored) return;
    }
    try { process.kill(process.platform === 'win32' ? leader.pid : -leader.pgid, kind); }
    catch (error) { if (error.code !== 'ESRCH') throw error; }
  };
  const signalIndividual = (lease, kind) => {
    const actual = ownedProcessIdentity(lease.pid, ownerId, true); assertSameProcess(actual, lease);
    if (!actual) return;
    try { process.kill(actual.pid, kind); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  };
  let cleanupFailed = false;
  const signalAll = kind => {
    // Stop independently proven leaders before checking members' mutable titles.
    for (const leader of groups.values()) { try { signalGroup(leader, kind); } catch { cleanupFailed = true; } }
    for (const lease of individuals) { try { signalIndividual(lease, kind); } catch { cleanupFailed = true; } }
  };
  try {
    if (resources.some(liveResource) && !failure) failure = { message: 'Owned child left runtime resources running', status: 1 };
    signalAll('SIGTERM');
    const grace = Date.now() + Math.min(graceMs, 1000);
    while (Date.now() < grace && resources.some(liveResource)) await delay(25);
    signalAll('SIGKILL');
    const forced = Date.now() + 2000;
    while (Date.now() < forced && resources.some(liveResource)) await delay(25);
    for (const lease of resources) {
      lease.stopped = !liveResource(lease);
      if (!lease.stopped) cleanupFailed = true;
    }
  } catch { cleanupFailed = true; }
  if (cleanupFailed) failure = { message: 'Owned resource cleanup could not be proven', status: failure?.status ?? 1 };
  const preserveChildFailure = initialRootExit && !cleanupFailed && resources.length === 0 && Number.isInteger(outcome.status) && outcome.status > 0;
  return { status: preserveChildFailure ? outcome.status : failure?.status ?? outcome.status ?? 1, signal: outcome.signal, timedOut: failure?.status === 124, error: failure?.message, observationFailure, resources };
}
const approvedAdapters = new Map();
function approvedDbAdapterHash(originalDb) {
  const generator = new URL('../src/test/integration/owned-next-app.ts', import.meta.url);
  const key = hash(readFileSync(generator)) + ':' + hash(originalDb);
  if (!approvedAdapters.has(key)) {
    // Import the approved source generator, never the writable runtime mirror.
    const script = `import {createOwnedDbAdapter} from ${JSON.stringify(generator.href)};import fs from 'node:fs';process.stdout.write(createOwnedDbAdapter(fs.readFileSync(0,'utf8')));`;
    try {
      const bytes = execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], { cwd: fileURLToPath(new URL('..', import.meta.url)), input: originalDb, encoding: 'utf8', env: safeEnvironment(), timeout: 15_000, stdio: ['pipe', 'pipe', 'pipe'] });
      approvedAdapters.set(key, hash(bytes));
    } catch { throw Error('Source manifest mismatch: approved DB adapter cannot be derived'); }
  }
  return approvedAdapters.get(key);
}
export function selectSuites(mode, suite) {
  const allowed = mode === 'sql' ? SQL_SUITES : mode === 'browser' ? BROWSER_SUITES : undefined;
  if (!allowed || (suite !== 'all' && !Object.hasOwn(allowed, suite))) throw Error('Unknown Phase E mode/suite');
  return suite === 'all' ? Object.keys(allowed) : [suite];
}
export function parseSuiteArguments(args) {
  if (args.length !== 2 || args[0] !== '--suite') throw Error('Use an explicit --suite; arbitrary configs, URLs and arguments are refused');
  return args[1];
}
export function assertSuitesPresent(source, mode, suites) {
  for (const suite of suites) {
    const file = (mode === 'sql' ? SQL_SUITES : BROWSER_SUITES)[suite];
    if (!existsSync(join(source, file))) throw Error('Missing required Phase E fixture: ' + file);
  }
  if (mode === 'sql' && !existsSync(join(source, 'vitest.phase-e-integration.config.mts'))) throw Error('Missing required Phase E integration config');
}
function canonical(path) {
  if (existsSync(path)) return realpathSync(path);
  return join(canonical(dirname(path)), basename(path));
}
export function externalEvidence(source, value) {
  const outside = (base, path) => { const distance = relative(base, path); return distance === '..' || distance.startsWith('..' + sep) || isAbsolute(distance); };
  if (!value || !isAbsolute(value) || !outside(resolve(source), resolve(value)) || !outside(realpathSync(source), canonical(value))) throw Error('PHASE_E_EVIDENCE_DIR must be explicit and outside the repository');
  mkdirSync(value, { recursive: true });
  return resolve(value);
}
export function captureSource(source, expectedSha) {
  if (!/^[a-f0-9]{40}$/.test(expectedSha ?? '')) throw Error('PHASE_E_EXPECTED_SHA must identify the exact candidate');
  const git = args => execFileSync('git', args, { cwd: source, encoding: 'utf8' }).trim();
  const checkpoint = git(['rev-parse', 'HEAD']), tree = git(['rev-parse', 'HEAD^{tree}']);
  assert.equal(checkpoint, expectedSha, 'Phase E source SHA mismatch');
  assert.equal(git(['status', '--porcelain=v1']), '', 'Phase E verification requires a clean worktree');
  const files = gitFileList(['ls-files', '-z'], {cwd:source});
  // The repository's checked-in empty template is source custody, never a
  // runtime environment file. Owned children receive only the explicit allowlist.
  if (files.some(file => file.split('/').some(part => part.startsWith('.env') && part !== '.env.example'))) throw Error('Refusing tracked environment files in verification source');
  return { checkpoint, tree, sourceClean: true, hashes: Object.fromEntries(files.map(file => [file, hash(readFileSync(join(source, file)))])) };
}
export function assertSourceUnchanged(source, custody) {
  const current = captureSource(source, custody.checkpoint);
  assert.deepEqual(current, custody, 'Phase E source manifest mismatch after execution');
}
export function safeEnvironment(env = process.env) {
  const keys = ['PATH', 'HOME', 'TMPDIR', 'USER', 'LOGNAME', 'NEVORA_TEST_PG_BIN', 'NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE', 'NEVORA_AXE_RUNTIME_FILE', 'PLAYWRIGHT_BROWSERS_PATH'];
  return { ...Object.fromEntries(keys.filter(key => env[key] !== undefined).map(key => [key, env[key]])), NODE_ENV: 'test', CI: '1', NEXT_TELEMETRY_DISABLED: '1', PUSH_FEATURE_ENABLED: 'false', PUSH_DELIVERY_ENABLED: 'false', PUSH_TEST_DELIVERY_ENABLED: 'false' };
}
export function assertOwnedFixture(env = process.env) {
  if (env.DATABASE_URL !== undefined) throw Error('Unset DATABASE_URL before owned Phase E verification');
  let target;
  try { target = new URL(env.FUEL_TEST_DATABASE_URL); } catch { throw Error('Refusing unowned or non-loopback fixture'); }
  if (!['postgres:', 'postgresql:'].includes(target.protocol) || target.hostname !== '127.0.0.1' || !target.port || target.search || target.hash || target.password || target.username !== 'nevora_e') throw Error('Refusing unowned or non-loopback fixture');
  if (!env.PHASE_E_OWNERSHIP_FILE || !env.PHASE_E_OWNER_ID || !existsSync(env.PHASE_E_OWNERSHIP_FILE)) throw Error('Phase E ownership marker required');
  const owner = json(env.PHASE_E_OWNERSHIP_FILE);
  const mode = env.PHASE_E_MODE;
  const prefix = mode === 'sql' && Object.hasOwn(SQL_DATABASE_PREFIXES, env.PHASE_E_SQL_SUITE ?? '') ? SQL_DATABASE_PREFIXES[env.PHASE_E_SQL_SUITE] : mode === 'browser' ? 'nevora_exchange_test_' : undefined;
  const index = mode === 'sql' && Array.isArray(owner.suites) ? owner.suites.indexOf(env.PHASE_E_SQL_SUITE) : 0;
  if (!prefix || index < 0 || owner.mode !== mode || !/^[a-f0-9]{32}$/.test(env.PHASE_E_OWNER_ID) || owner.ownerId !== env.PHASE_E_OWNER_ID || owner.started !== true || owner.closed !== false || owner.port !== Number(target.port) || owner.checkpoint !== env.PHASE_E_EXPECTED_SHA || owner.source !== resolve(process.cwd()) || decodeURIComponent(target.pathname.slice(1)) !== `${prefix}e_${owner.ownerId.slice(0, 12)}_s${index}` || resolve(env.PHASE_E_OWNERSHIP_FILE) !== join(owner.root, 'ownership.json')) throw Error('Phase E ownership marker mismatch');
  return owner;
}
export function verifySourceManifest(source, root, checkpoint) {
  const manifest = json(join(root, 'source-manifest.json'));
  const expected = verifySourceManifestMetadata(source, manifest, checkpoint);
  for (const [file, expectedHash] of Object.entries(expected)) {
    if (hash(readFileSync(join(root, 'app', file))) !== expectedHash) throw Error('Source manifest mismatch: ' + (file === 'next-env.d.ts' ? 'generated type references' : file === 'src/lib/db.ts' ? 'unapproved DB adapter' : 'mirror ' + file));
  }
  return manifest;
}
export function verifySourceManifestMetadata(source, manifest, checkpoint) {
  const hasTypes = existsSync(join(source, 'next-env.d.ts'));
  const substitutions = hasTypes ? ['src/lib/db.ts', 'next-env.d.ts'] : ['src/lib/db.ts'];
  if (manifest.checkpoint !== checkpoint || JSON.stringify(manifest.substitutedFiles) !== JSON.stringify(substitutions) || !manifest.hashes || !Object.keys(manifest.hashes).length) throw Error('Source manifest mismatch');
  const approvedHash = approvedDbAdapterHash(readFileSync(join(source, 'src/lib/db.ts'), 'utf8'));
  if (manifest.substitutedDbHash !== approvedHash) throw Error('Source manifest mismatch: unapproved DB adapter');
  let typesHash;
  if (hasTypes) {
    const original = readFileSync(join(source, 'next-env.d.ts'), 'utf8');
    let derived = original;
    // Independent full-byte derivation: only these two source-pinned imports.
    for (const name of ['routes.d.ts', 'root-params.d.ts']) {
      const production = `import "./.next/types/${name}";`;
      if (original.split(`./.next/types/${name}`).length !== 2 || original.split(/\r?\n/).filter(line => line === production).length !== 1) throw Error('Source manifest mismatch: generated type references source imports');
      derived = derived.replace(production, `import "./.next/dev/types/${name}";`);
    }
    typesHash = hash(derived);
    if (manifest.generatedTypeReferences?.originalHash !== hash(original) || manifest.generatedTypeReferences?.derivedHash !== typesHash || manifest.generatedTypeReferences?.reason !== 'Next 16.4.2 dev generated type-reference paths') throw Error('Source manifest mismatch: generated type references');
  }
  const expectedHashes = {};
  for (const [file, originalHash] of Object.entries(manifest.hashes)) {
    if (isAbsolute(file) || file.split('/').some(part => part === '..' || part.startsWith('.env')) || !/^[a-f0-9]{64}$/.test(originalHash)) throw Error('Source manifest mismatch: unsafe entry');
    if (hash(readFileSync(join(source, file))) !== originalHash) throw Error('Source manifest mismatch: ' + file);
    expectedHashes[file] = file === 'src/lib/db.ts' ? approvedHash : file === 'next-env.d.ts' ? typesHash : originalHash;
  }
  if (manifest.originalDbHash !== manifest.hashes['src/lib/db.ts']) throw Error('Source manifest mismatch: original DB');
  const files = gitFileList(['ls-files', '-c', '-o', '--exclude-standard', '-z'], { cwd: source })
    .filter(file => ['src/', 'public/', 'services/', 'db/'].some(prefix => file.startsWith(prefix)) || ['package.json', 'package-lock.json', 'tsconfig.json', 'next-env.d.ts', 'next.config.ts'].includes(file))
    .filter(file => existsSync(join(source, file))).sort();
  assert.deepEqual(Object.keys(manifest.hashes).sort(), [...new Set(files)], 'Source manifest mismatch: missing runtime source');
  return expectedHashes;
}
export function verifyBrowserExecutions(executions, suites) {
  if (!Array.isArray(executions)) throw Error('Missing executed browser evidence');
  for (const suite of suites) for (const engine of ENGINES) for (const width of WIDTHS) {
    const records = executions.filter(item => item.suite === suite && item.engine === engine && item.width === width);
    if (records.length !== 1 || records[0].status !== 'passed' || !Array.isArray(records[0].checks) || !records[0].checks.length || records[0].checks.some(check => typeof check !== 'string' || !check.trim())) throw Error(`Missing/failed executed evidence: ${suite} ${engine} ${width}`);
  }
  if (executions.length !== suites.length * ENGINES.length * WIDTHS.length) throw Error('Unexpected browser execution evidence');
}
export function verifyRequiredJobs(jobs) {
  for (const job of REQUIRED_JOBS) if (jobs?.[job]?.result !== 'success') throw Error('Required Phase E/D CI job did not pass: ' + job);
}
function sqlCommand(suite, evidence) {
  return [process.execPath, 'node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.phase-e-integration.config.mts', SQL_SUITES[suite], '--reporter=default', '--reporter=json', '--outputFile', join(evidence, 'sql-' + suite + '.json')];
}
function verifySqlExecution(report, source, suite) {
  const cases = report.testResults?.flatMap(item => item.assertionResults ?? []) ?? [];
  if (report.success !== true || !Number.isSafeInteger(report.numTotalTests) || report.numTotalTests < 1 || report.numPassedTests !== report.numTotalTests || report.numPendingTests || report.numTodoTests || report.numFailedTests || cases.length !== report.numTotalTests || cases.some(item => item.status !== 'passed')) throw Error('Required SQL suite has missing/failed/skipped executed tests');
  if (!Object.hasOwn(SQL_SUITES, suite) || report.testResults.length !== 1 || report.testResults[0].status !== 'passed' || report.testResults[0].name !== join(source, SQL_SUITES[suite])) throw Error('SQL evidence does not identify the exact owning fixture: ' + suite);
  if (cases.some(item => typeof item.fullName !== 'string' || !item.fullName.trim())) throw Error('Missing executed SQL case identity');
  if (new Set(cases.map(item => item.fullName)).size !== cases.length) throw Error('Duplicate executed SQL case identity');
  return cases.map(item => item.fullName);
}
function verifySqlResults(results, evidence, source, suites) {
  if (!Array.isArray(results) || results.length !== suites.length || new Set(results.map(item => item.suite)).size !== suites.length) throw Error('Missing/duplicate SQL selector evidence');
  for (const suite of suites) {
    const record = results.find(item => item.suite === suite);
    if (!record || record.exitCode !== 0) throw Error('Missing SQL command result: ' + suite);
    assert.deepEqual(record.command, sqlCommand(suite, evidence), 'SQL command identity mismatch: ' + suite);
    assert.deepEqual(record.checks, verifySqlExecution(json(join(evidence, 'sql-' + suite + '.json')), source, suite), 'SQL executed case identity mismatch: ' + suite);
  }
}
export function verifyEvidence(evidence, kind, source, browserSuite = 'all') {
  if (kind !== 'browser' && browserSuite !== 'all') throw Error('Browser selector cannot alter SQL verification');
  const report = json(join(evidence, kind + '-report.json'));
  if (report.checkpoint !== source.checkpoint || report.tree !== source.tree || report.sourceClean !== true || report.status !== 'passed' || !Array.isArray(report.errors) || report.errors.length || report.ownershipClosed !== true) throw Error('Invalid Phase E source/clean/error/ownership evidence');
  const suites = kind === 'sql' ? Object.keys(SQL_SUITES) : selectSuites('browser', browserSuite);
  assert.deepEqual(report.suites, suites, 'Mandatory Phase E suites missing');
  assert.deepEqual(json(join(evidence, 'source-manifest.json')), source, 'Phase E source manifest mismatch');
  const owner = json(report.ownershipFile);
  if (owner.ownerId !== report.ownerId || owner.checkpoint !== source.checkpoint || owner.source !== resolve(process.cwd()) || owner.started !== true || owner.closed !== true || dirname(report.ownershipFile) !== owner.root || dirname(owner.root) !== evidence || !basename(owner.root).startsWith('owned-postgres-')) throw Error('Invalid Phase E ownership receipt');
  if (kind === 'browser') {
    verifyBrowserExecutions(report.executions, suites);
    verifySourceManifest(owner.source, report.appRoot, source.checkpoint);
    const appOwner = json(join(report.appRoot, 'ownership.json'));
    if (appOwner.ownerId !== report.appOwnerId || appOwner.source !== owner.source || appOwner.closed !== true || dirname(report.appRoot) !== evidence || !basename(report.appRoot).startsWith('owned-next-')) throw Error('Invalid Phase E application ownership receipt');
  }
  else {
    verifySqlResults(report.results, evidence, owner.source, suites);
  }
  return report;
}
async function availablePort() {
  return new Promise((ready, reject) => { const socket = createServer(); socket.once('error', reject); socket.listen(0, '127.0.0.1', () => { const port = socket.address().port; socket.close(error => error ? reject(error) : ready(port)); }); });
}
async function runOwned(mode, suite, source, custody, evidence) {
  const suites = selectSuites(mode, suite);
  assertSuitesPresent(source, mode, suites);
  const bin = process.env.NEVORA_TEST_PG_BIN;
  if (!bin || !existsSync(join(bin, 'initdb')) || !existsSync(join(bin, 'pg_ctl'))) throw Error('Select an existing local PostgreSQL runtime with NEVORA_TEST_PG_BIN');
  const root = mkdtempSync(join(evidence, 'owned-postgres-')), data = join(root, 'data'), ownerId = randomBytes(16).toString('hex'), port = await availablePort();
  const ownerPath = join(root, 'ownership.json');
  const owner = { ownerId, source, root, data, port, checkpoint: custody.checkpoint, mode, suites, started: false, closed: false };
  const writeOwner = () => writeFileSync(ownerPath, JSON.stringify(owner, null, 2), { mode: 0o600 });
  const assertOwner = () => assert.deepEqual(json(ownerPath), owner, 'Phase E ownership marker changed; refusing teardown');
  writeOwner(); writeFileSync(join(evidence, 'source-manifest.json'), JSON.stringify(custody, null, 2));
  const env = { ...safeEnvironment(), PHASE_E_EXPECTED_SHA: custody.checkpoint, PHASE_E_EVIDENCE_DIR: evidence, PHASE_E_OWNERSHIP_FILE: ownerPath, PHASE_E_OWNER_ID: ownerId, PHASE_E_MODE: mode, FUEL_TEST_ALLOW_DESTRUCTIVE_TEARDOWN: 'yes' };
  const report = { checkpoint: custody.checkpoint, tree: custody.tree, sourceClean: true, ownerId, ownershipFile: ownerPath, ownershipClosed: false, suites, mode, status: 'failed', results: [], errors: [], limitations: ['Owned local foundation verification is not hosted, client or independent phase acceptance.'] };
  let exitCode = 0;
  const controller = new AbortController();
  const removeSignals = installTerminationHandlers(() => controller.abort(Error('Owned supervisor termination signal')));
  const runPg = (name, args) => {
    assertOwner();
    const result = spawnSync(join(bin, name), args, { env, encoding: 'utf8', timeout: 45_000 });
    writeFileSync(join(root, name + '-' + (args.includes('stop') ? 'stop' : args.includes('start') ? 'start' : 'init') + '.log'), (result.stdout ?? '') + (result.stderr ?? ''));
    if (result.error || result.status !== 0) throw Error(`${name} failed (see owned runtime log): ${result.error?.message ?? result.status}`);
  };
  try {
    runPg('initdb', ['-D', data, '-U', 'nevora_e', '--auth-local=trust', '--auth-host=trust', '--encoding=UTF8', '--no-locale']);
    runPg('pg_ctl', ['-D', data, '-l', join(root, 'postgres.log'), '-w', 'start', '-o', `-h 127.0.0.1 -p ${port} -k ''`]);
    owner.started = true; writeOwner();
    for (const item of mode === 'sql' ? suites : [suite]) {
      const prefix = mode === 'sql' ? SQL_DATABASE_PREFIXES[item] : 'nevora_exchange_test_';
      const childEnv = { ...env, FUEL_TEST_DATABASE_URL: `postgresql://nevora_e@127.0.0.1:${port}/${prefix}e_${ownerId.slice(0, 12)}_s${mode === 'sql' ? suites.indexOf(item) : 0}`, PHASE_E_SQL_SUITE: item };
      const output = join(evidence, 'sql-' + item + '.json');
      rmSync(mode === 'sql' ? output : join(evidence, 'browser-report.json'), { force: true });
      const args = mode === 'sql' ? sqlCommand(item, evidence).slice(1) : ['--import', fileURLToPath(new URL('./qa-server-context.mjs', import.meta.url)), '--import', 'tsx', 'scripts/phase-e-browser-qa.mjs', '--suite', item];
      controller.signal.throwIfAborted();
      const result = await superviseOwnedChild({ command: process.execPath, args, cwd: source, env: childEnv, ownerId, timeoutMs: ownedExecutionTimeout(mode, item), signal: controller.signal });
      const record = { suite: item, command: [process.execPath, ...args], exitCode: result.status ?? 1, checks: [], resources: result.resources, observationFailure: result.observationFailure }; report.results.push(record);
      if (result.error || result.status !== 0) { exitCode = result.status ?? 1; throw Error(`Phase E child failed: ${item} (exit ${exitCode})${result.error ? ': ' + result.error : ''}`); }
      if (mode === 'sql') record.checks = verifySqlExecution(json(output), source, item);
      else {
        const browser = json(join(evidence, 'browser-report.json'));
        if (browser.checkpoint !== custody.checkpoint || browser.tree !== custody.tree || browser.sourceClean !== true || browser.ownerId !== ownerId || browser.errors.length || browser.status !== 'passed' || browser.ownershipClosed !== true) throw Error('Invalid Phase E browser child evidence');
        verifyBrowserExecutions(browser.executions, suites); record.checks = browser.executions.flatMap(item => item.checks);
      }
      assertOwner(); assertSourceUnchanged(source, custody);
    }
    if (mode === 'sql') verifySqlResults(report.results, evidence, source, suites);
    report.status = 'passed';
  } catch (error) { report.errors.push(error.message); console.error(error.message); exitCode ||= 1; }
  finally {
    try {
      assertOwner();
      if (owner.started || existsSync(join(data, 'postmaster.pid'))) runPg('pg_ctl', ['-D', data, '-w', 'stop', '-m', 'fast']);
      rmSync(data, { recursive: true, force: true }); owner.closed = true; writeOwner(); report.ownershipClosed = true;
      assertSourceUnchanged(source, custody);
    } catch (error) { report.errors.push(error.message); console.error(error.message); exitCode ||= 1; report.status = 'failed'; }
    writeFileSync(join(evidence, mode === 'sql' ? 'sql-report.json' : 'owned-browser-report.json'), JSON.stringify(report, null, 2));
    removeSignals();
  }
  return exitCode;
}
async function main() {
  if (process.env.DATABASE_URL !== undefined) throw Error('Unset DATABASE_URL before owned Phase E verification');
  if (process.env.FUEL_TEST_DATABASE_URL !== undefined) throw Error('Refusing inherited FUEL_TEST_DATABASE_URL; Phase E creates its own fixture');
  const [mode, ...args] = process.argv.slice(2), source = resolve(process.cwd());
  if (!['sql', 'browser', 'verify-evidence', 'verify-ci'].includes(mode)) throw Error('Unknown Phase E mode');
  const suite = mode === 'verify-ci' ? (args.length ? (() => { throw Error('verify-ci accepts no arbitrary arguments'); })() : undefined) : parseSuiteArguments(args);
  if (['sql', 'browser'].includes(mode)) selectSuites(mode, suite);
  if (mode === 'verify-evidence' && !['sql', 'browser'].includes(suite)) throw Error('verify-evidence requires --suite sql|browser');
  const custody = captureSource(source, process.env.PHASE_E_EXPECTED_SHA), evidence = externalEvidence(source, process.env.PHASE_E_EVIDENCE_DIR);
  if (mode === 'verify-ci') {
    verifyRequiredJobs(JSON.parse(process.env.PHASE_E_CI_NEEDS_JSON ?? 'null'));
    writeFileSync(join(evidence, 'ci-report.json'), JSON.stringify({ ...custody, status: 'passed', requiredJobs: REQUIRED_JOBS }, null, 2));
  } else if (mode === 'verify-evidence') verifyEvidence(evidence, suite, custody);
  else process.exitCode = await runOwned(mode, suite, source, custody, evidence);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
