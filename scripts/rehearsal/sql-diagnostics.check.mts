import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sqlDiagnostic } from './sql-diagnostics.mts';

test('retains SQLSTATE and a source fingerprint without retaining sensitive SQL or error details', () => {
  const secret = 'fictional-private-value-that-must-not-be-recorded';
  const diagnostic = sqlDiagnostic({ code: '57014', message: secret, detail: secret, connectionString: secret }, `SELECT '${secret}'`, 5001.2, true);
  assert.equal(diagnostic.code, '57014');
  assert.equal(diagnostic.command, 'SELECT');
  assert.equal(diagnostic.expected, true);
  assert.match(diagnostic.sqlSha256, /^[a-f0-9]{64}$/);
  assert.ok(!JSON.stringify(diagnostic).includes(secret));
});
test('does not copy a non-SQLSTATE error code into the evidence', () => {
  assert.equal(sqlDiagnostic({ code: 'fictional-sensitive-content' }, 'SELECT 1', 0, false).code, 'unknown');
});
