import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { platform, arch } from 'node:os';

const actual = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const expected = process.env.EXPECTED_SHA;
if (!expected || actual !== expected) throw new Error(`Candidate mismatch: expected ${expected || '(missing)'}, checked out ${actual}`);
const target = process.argv[2];
if (!['android', 'ios'].includes(target)) throw new Error('Target must be android or ios');
mkdirSync('artifacts', { recursive: true });
const evidence = {
  candidate: actual,
  target,
  mode: 'packaged fictional fixture',
  runId: process.env.GITHUB_RUN_ID || null,
  runAttempt: process.env.GITHUB_RUN_ATTEMPT || null,
  repository: process.env.GITHUB_REPOSITORY || null,
  event: process.env.GITHUB_EVENT_NAME || null,
  runner: { platform: platform(), arch: arch(), image: process.env.ImageOS || null, imageVersion: process.env.ImageVersion || null, node: process.version },
  timestamp: new Date().toISOString(),
};
writeFileSync(`artifacts/${target}-candidate.json`, JSON.stringify(evidence, null, 2) + '\n');
console.log(`Native ${target} candidate: ${actual}`);
