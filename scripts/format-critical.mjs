import {spawnSync} from 'node:child_process';

const mode = process.argv[2];
if (!['--check', '--write'].includes(mode) || process.argv.length !== 3) {
  throw new Error('Use --check or --write for the reviewed critical-module scope');
}
const files = [
  'src/lib/calendar/http.server.ts',
  'src/lib/data/employee-requests.server.ts',
  'src/lib/data/employee-creation.server.ts',
  'src/lib/data/shift-change-snapshot.ts',
  'src/lib/data/shift-changes.ts',
  'src/lib/onboarding/control-store.server.ts',
];
const result = spawnSync(process.execPath, [
  'tools/format-runtime/node_modules/prettier/bin/prettier.cjs', mode, ...files,
], {stdio: 'inherit'});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
