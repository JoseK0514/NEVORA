import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

const runner = resolve('scripts/phase-e-owned.mjs');
const fixture = resolve('src/test/fixtures/phase-e-supervisor-boundary.mjs');
it.each(['leader-retired', 'leader-live-member', 'leader-ambiguous', 'leader-identity-error', 'leader-identity-stderr', 'root-before-poll', 'root-ambiguous', 'immediate-entry'])('deterministic supervisor boundary: %s', mode => {
  const execution = spawnSync(process.execPath, [fixture, runner, mode], { encoding: 'utf8', timeout: 12000, env: { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: 'test' } });
  expect(execution.status, execution.stderr).toBe(0);
  const receipt = JSON.parse(execution.stdout), detail = JSON.stringify(receipt);
  expect(receipt.backupUsed, detail).toBe(false);
  expect(receipt.result.timedOut, detail).toBe(false);
  expect(receipt.actualExit, detail).toEqual({ status: 0, signal: null });
  expect(receipt.result.resources.every((resource: { stopped: boolean }) => resource.stopped), detail).toBe(true);
  if (mode === 'immediate-entry') {
    expect(receipt.proof.exitEventPending, detail).toBe(true);
    expect(receipt.proof.enteredBeforePin, detail).toBe(false);
    expect(receipt.result.status, detail).toBe(0);
    expect(receipt.entry, detail).toEqual({ argv: ['caller-argument'], nodeOptions: receipt.callerNodeOptions, connected: true });
  } else if (mode === 'leader-retired') {
    expect(receipt.proof.before.member.retired, detail).toBe(false);
    expect(receipt.proof.after.leader.retired, detail).toBe(true);
    expect(receipt.proof.after.member.retired, detail).toBe(true);
    expect(receipt.result.status, detail).toBe(0);
    expect(receipt.result.resources, detail).toHaveLength(2);
    const member = receipt.result.resources.find((resource: { pid: number }) => resource.pid === receipt.originalMember.pid);
    expect(member.commandHash, detail).toBe(createHash('sha256').update(receipt.originalMember.command).digest('hex'));
    expect(receipt.signals, detail).toEqual([]);
  } else if (mode === 'root-before-poll') {
    expect(receipt.proof.exitEventPending, detail).toBe(true);
    expect(receipt.proof.after.root.retired, detail).toBe(true);
    expect(receipt.proof.after.member.retired, detail).toBe(false);
    expect(receipt.result.status, detail).toBe(1);
    expect(receipt.result.error, detail).toBe('Owned child left runtime resources running');
    expect(receipt.result.resources, detail).toHaveLength(1);
    expect(receipt.signals, detail).toContainEqual({ pid: -receipt.proof.before.root.pid, signal: 'SIGKILL' });
  } else {
    expect(receipt.result.status, detail).toBe(1);
    expect(receipt.result.error, detail).toBe('Owned resource observation failed');
    expect(receipt.result.observationFailure, detail).toBeDefined();
    if (mode.startsWith('leader-identity-')) {
      expect(receipt.identityFaultInjected, detail).toBe(true);
      expect(receipt.result.observationFailure.reason, detail).toBe('IDENTITY_UNAVAILABLE');
    }
  }
  if (['immediate-entry', 'leader-retired', 'root-before-poll'].includes(mode)) expect(receipt.result.observationFailure, detail).toBeUndefined();
}, 15000);
