import { afterAll, vi } from 'vitest';
import { Client } from 'pg';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fixtureTrace, sqlDiagnostic } from './sql-diagnostics.mts';

const migrations = new Map(readdirSync('db/migrations').filter(file => file.endsWith('.sql')).map(file =>
  [createHash('sha256').update(readFileSync(join('db/migrations', file))).digest('hex'), file]));
const original = Client.prototype.query;
const traced = function (this: Client, ...args: unknown[]): unknown {
  const text = typeof args[0] === 'string' ? args[0] : args[0] && typeof args[0] === 'object' && 'text' in args[0] ? String(args[0].text) : '';
  const started = performance.now();
  const record = (error?: unknown) => {
    fixtureTrace.queries++;
    const diagnostic = sqlDiagnostic(error, text, performance.now() - started, fixtureTrace.expected);
    diagnostic.migration = migrations.get(diagnostic.sqlSha256);
    if (error) fixtureTrace.failures.push(diagnostic);
    const { code: _code, expected: _expected, ...timing } = diagnostic;
    void _code; void _expected;
    fixtureTrace.slowest.push(timing);
    fixtureTrace.slowest.sort((a, b) => b.elapsedMs - a.elapsedMs);
    fixtureTrace.slowest.length = Math.min(fixtureTrace.slowest.length, 10);
  };
  let result: unknown;
  try { result = Reflect.apply(original, this, args); } catch (error) { record(error); throw error; }
  if (result instanceof Promise) return result.then(value => { record(); return value; }, error => { record(error); throw error; });
  return result;
};
// Delegate every original argument/result unchanged; only observe Promise-based queries used by the checked-in adapter.
const spy = vi.spyOn(Client.prototype, 'query').mockImplementation(traced as typeof Client.prototype.query);
afterAll(() => {
  spy.mockRestore();
  const output = process.env.NEVORA_REHEARSAL_FIXTURE_OUTPUT;
  if (!output) throw Error('The owning rehearsal must select the fixture evidence directory.');
  mkdirSync(output, { recursive: true, mode: 0o700 });
  writeFileSync(join(output, `fixture-sql-${process.pid}.json`), JSON.stringify({ candidate: process.env.NEVORA_REHEARSAL_CANDIDATE,
    queries: fixtureTrace.queries, failures: fixtureTrace.failures, slowest: fixtureTrace.slowest }, null, 2) + '\n', { mode: 0o600 });
});
