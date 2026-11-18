import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { releaseTestReport } from './lib/release-test-report.mjs';
import { SQL_SUITES, verifySqlExecution } from './phase-e-owned.mjs';
import { validateClockerReport } from './clocker-sql-shards.mjs';

const source = resolve('fixture');
const file = SQL_SUITES.assignments;

function report() {
  const project = 'assignments';
  const names = ['publish assignments', 'retain the same assignment'];
  const tests = names.map((name, index) => ({
    testId: 'case-' + index,
    project,
    testPath: file,
    name,
    fullName: 'SQL suite > ' + name,
    parentNames: ['SQL suite'],
    status: 'pass',
  }));
  return {
    tool: 'rstest',
    version: '0.12.6',
    status: 'pass',
    unhandledErrors: [],
    summary: {
      testFiles: 1, failedFiles: 0, tests: 2, passedTests: 2,
      failedTests: 0, skippedTests: 0, todoTests: 0,
    },
    files: [{ project, testPath: file, status: 'pass', results: structuredClone(tests) }],
    tests,
  };
}

test('both release readers accept the same complete Rstest execution and case identities', () => {
  assert.deepEqual(verifySqlExecution(report(), source, 'assignments'),
    ['SQL suite publish assignments', 'SQL suite retain the same assignment']);
  assert.deepEqual(validateClockerReport(report(), source, [file]), { files: [file], tests: 2 });
  const legacy = { success: true };
  assert.equal(releaseTestReport(legacy, source), legacy);
});

const failures = {
  'a failed run': value => { value.status = 'fail'; },
  'an unhandled error': value => { value.unhandledErrors = [{ message: 'fixture error' }]; },
  'a missing suite': value => { value.files = []; },
  'a missing flat test': value => { value.tests.pop(); },
  'a missing nested test': value => { value.files[0].results.pop(); },
  'a failed nested test': value => { value.files[0].results[0].status = 'fail'; },
  'a skipped flat test': value => { value.tests[0].status = 'skip'; },
  'a duplicate test': value => { value.tests[0] = value.tests[1]; },
  'a duplicate file': value => { value.files.push(value.files[0]); value.summary.testFiles = 2; },
  'an inconsistent test identity': value => { value.tests[0].project = 'other'; },
  'a path outside the source': value => { value.files[0].testPath = '../outside.ts'; },
  'a fabricated case name': value => { value.tests[0].fullName = 'other'; },
  'a foreign but internally consistent file': value => {
    const foreign = 'src/test/integration/foreign.integration.ts';
    value.files[0].testPath = foreign;
    for (const test of [...value.tests, ...value.files[0].results]) test.testPath = foreign;
  },
};

for (const [name, mutate] of Object.entries(failures)) {
  test('both release readers reject ' + name, () => {
    const value = report();
    mutate(value);
    assert.throws(() => verifySqlExecution(value, source, 'assignments'));
    assert.throws(() => validateClockerReport(value, source, [file]));
  });
}
