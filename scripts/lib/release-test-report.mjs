import assert from 'node:assert/strict';
import { isAbsolute, resolve, sep } from 'node:path';

/** Translate Rstest's JSON into the execution records used by release checks. */
export function releaseTestReport(report, source) {
  if (report?.tool !== 'rstest') return report;

  assert.equal(report.status, 'pass', 'Rstest report did not succeed');
  assert(Array.isArray(report.unhandledErrors) && report.unhandledErrors.length === 0,
    'Rstest report contains unhandled errors');
  const { summary, files, tests } = report;
  assert(Array.isArray(files) && files.length > 0, 'Missing Rstest files');
  assert(Array.isArray(tests) && tests.length > 0, 'Missing Rstest tests');
  const counts = {
    testFiles: files.length,
    failedFiles: 0,
    tests: tests.length,
    passedTests: tests.length,
    failedTests: 0,
    skippedTests: 0,
    todoTests: 0,
  };
  for (const [key, count] of Object.entries(counts)) {
    assert.equal(summary?.[key], count, 'Invalid Rstest count: ' + key);
  }

  const absoluteSource = resolve(source) + sep;
  const seenFiles = new Set();
  const seenTests = new Map();
  function testIdentity(test) {
    assert.equal(test?.status, 'pass', 'Failed or skipped Rstest case');
    for (const field of ['testId', 'project', 'testPath', 'name', 'fullName']) {
      assert(typeof test[field] === 'string' && test[field].trim(), 'Missing Rstest case ' + field);
    }
    assert(Array.isArray(test.parentNames) &&
      test.parentNames.every(name => typeof name === 'string' && name.trim()),
    'Invalid Rstest case hierarchy');
    assert.equal([...test.parentNames, test.name].join(' > '), test.fullName,
      'Rstest case title does not match its hierarchy');
    return JSON.stringify([test.project, test.testPath, test.fullName]);
  }

  const testResults = files.map(file => {
    const path = file?.testPath;
    assert(typeof path === 'string' && path.length > 0 && !isAbsolute(path) &&
      path.split('/').every(part => part && part !== '.' && part !== '..') && !path.includes('\\'),
    'Invalid Rstest source path');
    const name = resolve(source, path);
    assert(name.startsWith(absoluteSource) && !seenFiles.has(name), 'Foreign or duplicate Rstest file');
    seenFiles.add(name);
    assert.equal(file.status, 'pass', 'Failed or skipped Rstest file');
    assert(Array.isArray(file.results) && file.results.length > 0, 'Missing Rstest file tests');
    const names = new Set();
    const assertionResults = file.results.map(test => {
      const identity = testIdentity(test);
      assert.equal(test.testPath, path, 'Rstest case belongs to another file');
      assert.equal(test.project, file.project, 'Rstest case belongs to another project');
      assert(!seenTests.has(test.testId) && !names.has(test.fullName), 'Duplicate Rstest test');
      seenTests.set(test.testId, identity);
      names.add(test.fullName);
      return { status: 'passed', fullName: [...test.parentNames, test.name].join(' ') };
    });
    return { name, status: 'passed', assertionResults };
  });

  assert.equal(seenTests.size, tests.length, 'Rstest file and case counts disagree');
  for (const test of tests) {
    const identity = testIdentity(test);
    assert.equal(seenTests.get(test.testId), identity, 'Missing, duplicate or mismatched Rstest case');
    seenTests.delete(test.testId);
  }
  return {
    success: true,
    numTotalTests: tests.length,
    numPassedTests: tests.length,
    numFailedTests: 0,
    numPendingTests: 0,
    numTodoTests: 0,
    testResults,
  };
}
