import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const roots: string[] = [];
const binding = {
  environment: 'test', workspaceId: 'workspace_fixture', incarnationId: '11111111-1111-4111-8111-111111111111',
  sourceSha: 'a'.repeat(40), operation: 'completion', reference: 'case_fixture', subjectRef: 'employee_fixture',
};
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'nevora-case-cli-')); roots.push(dir);
  const expected = join(dir, 'expected.json'), manifest = join(dir, 'case.json');
  const value = { schemaVersion: 1, binding, record: {
    policyRef: 'policy_fixture', reviewedAt: '2026-11-11T12:00:00.000Z',
    operator: { primaryRef: 'operator_fixture', backupRef: null, coverage: 'attended' }, requestState: 'processing', dependencies: [],
    inventory: ['access', 'profile', 'work_records', 'communications', 'payroll', 'photos', 'advisor', 'providers', 'backups'].map(scope => ({
      scope, disposition: 'not_applicable', evidenceRef: `evidence_${scope}`, basisRef: 'basis_fixture', endAt: null, hold: null,
    })), providerTasks: [],
  } };
  writeFileSync(expected, JSON.stringify(binding)); writeFileSync(manifest, JSON.stringify(value));
  return { expected, manifest, value };
}
function run(args: string[]) {
  return spawnSync(process.execPath, ['--import', 'tsx', resolve('scripts/operations-case-readiness.mts'), ...args], {
    env: { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: 'test', NEXT_TELEMETRY_DISABLED: '1' }, encoding: 'utf8', timeout: 10_000,
  });
}
afterEach(() => roots.splice(0).forEach(p => rmSync(p, { recursive: true, force: true })));

describe('operations case CLI', () => {
  it('executes the actual read-only script and emits only the bounded review', () => {
    const f = fixture(); const r = run(['--manifest', f.manifest, '--expected', f.expected, '--as-of', '2026-11-11T12:10:00.000Z']);
    expect(r.status, r.stderr).toBe(0); expect(r.stderr).toBe('');
    expect(JSON.parse(r.stdout)).toMatchObject({ decision: 'review_ready', evidence: 'operator_attestations_only', canMutate: false, canActivate: false });
    expect(r.stdout).not.toContain('employee_fixture');
  });
  it('returns nonzero for blocked evidence and never echoes unknown fields or paths', () => {
    const f = fixture(); writeFileSync(f.manifest, JSON.stringify({ ...f.value, secret: 'private_marker_do_not_echo' }));
    const r = run(['--manifest', f.manifest, '--expected', f.expected]);
    expect(r.status).toBe(1); expect(JSON.parse(r.stdout).decision).toBe('blocked');
    expect(r.stdout + r.stderr).not.toContain('private_marker'); expect(r.stdout + r.stderr).not.toContain(f.manifest);
  });
  it('refuses oversized input, malformed JSON, unknown args and production clock overrides without raw diagnostics', () => {
    const f = fixture();
    const cases = [
      () => { writeFileSync(f.manifest, 'x'.repeat(65_537)); return ['--manifest', f.manifest, '--expected', f.expected]; },
      () => { writeFileSync(f.manifest, '{private_marker'); return ['--manifest', f.manifest, '--expected', f.expected]; },
      () => ['--private_marker', 'private_marker'],
      () => { writeFileSync(f.expected, JSON.stringify({ ...binding, environment: 'production' })); return ['--manifest', f.manifest, '--expected', f.expected, '--as-of', '2026-11-11T12:10:00.000Z']; },
    ];
    for (const make of cases) {
      const r = run(make()); expect(r.status).toBe(2); expect(r.stdout.trim()).toBe('{"error":"INVALID_INPUT"}');
      expect(r.stderr).toBe(''); expect(r.stdout).not.toContain('private_marker');
    }
  });
});
