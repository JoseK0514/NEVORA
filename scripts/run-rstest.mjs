import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const cli = join(dirname(require.resolve('@rstest/core/package.json')), 'bin', 'rstest.js');
const args = process.argv.slice(2);
const converted = [];
let configSelected = false;
let reportPath;
let workers;
let json = false;

for (let index = 0; index < args.length; index++) {
  const word = args[index];
  if (word === '--config' || word === '-c') {
    if (configSelected || !args[index + 1]) throw Error('Invalid test configuration option');
    configSelected = true;
    converted.push(word, args[++index]);
    continue;
  }
  if (word === '--outputFile' || word.startsWith('--outputFile=')) {
    if (reportPath !== undefined) throw Error('Only one test report may be written');
    reportPath = word === '--outputFile' ? args[++index] : word.slice('--outputFile='.length);
    if (!reportPath || reportPath.startsWith('-')) throw Error('Missing test report path');
    continue;
  }
  if (word === '--maxWorkers' || word.startsWith('--maxWorkers=')) {
    if (workers !== undefined) throw Error('Only one worker limit may be selected');
    workers = word === '--maxWorkers' ? args[++index] : word.slice('--maxWorkers='.length);
    if (!/^[1-9]\d*$/.test(workers ?? '')) throw Error('Invalid test worker limit');
    continue;
  }
  if (word === '--reporter=json') {
    json = true;
    continue;
  }
  converted.push(word);
}

delete process.env.NEVORA_RSTEST_REPORT_FILE;
if (reportPath && !json) throw Error('Test report path requires the JSON reporter');
if (json && reportPath) {
  process.env.NEVORA_RSTEST_REPORT_FILE = resolve(reportPath);
  for (let index = converted.length - 1; index >= 0; index--) {
    if (converted[index] === '--reporter=default') converted.splice(index, 1);
  }
}
else if (json) converted.push('--reporter=json');

if (!configSelected) converted.push('-c', 'vitest.config.mts');
if (workers) converted.push('--pool.maxWorkers', workers);
process.argv = [process.execPath, cli, ...converted];
await import(pathToFileURL(cli).href);
