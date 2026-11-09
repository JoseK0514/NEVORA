import { createHash } from 'node:crypto';

export type SqlDiagnostic = { code: string; command: string; sqlSha256: string; elapsedMs: number; expected: boolean; migration?: string };
export type SqlTraceReport = { candidate: string; queries: number; failures: SqlDiagnostic[]; slowest: Omit<SqlDiagnostic, 'code' | 'expected'>[] };

/** Deliberately retain no SQL, parameters, server messages, credentials, or connection strings. */
export function sqlDiagnostic(error: unknown, text: string, elapsedMs: number, expected: boolean): SqlDiagnostic {
  const code = error !== null && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  const stripped = text.replace(/^(?:\s*--[^\n]*(?:\n|$))*/, '').trimStart();
  return { code: /^[0-9A-Z]{5}$/.test(code) ? code : 'unknown', command: /^[A-Za-z]+/.exec(stripped)?.[0].toUpperCase() ?? 'SQL',
    sqlSha256: createHash('sha256').update(text).digest('hex'), elapsedMs: Math.round(elapsedMs), expected };
}
export const fixtureTrace = { expected: false, queries: 0, failures: [] as SqlDiagnostic[], slowest: [] as SqlTraceReport['slowest'] };
