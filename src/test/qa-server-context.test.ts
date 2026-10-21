import {expect, it} from 'vitest';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const env = {PATH: process.env.PATH, NODE_ENV: 'test' as const};
const hook = resolve('scripts/qa-server-context.mjs');

it('standalone QA can load current server services while keeping the normal React renderer', () => {
  const script = `
    await import('./src/lib/company-access/operational-scope.server.ts');
    const React = await import('react');
    const {renderToStaticMarkup} = await import('react-dom/server');
    process.stdout.write(renderToStaticMarkup(React.createElement('p', null, 'QA renderer ready')));
  `;
  const result = spawnSync(process.execPath, ['--import', hook, '--import', 'tsx', '--input-type=module', '--eval', script], {env, encoding: 'utf8', timeout: 8000});
  expect({exit: result.status, spawned: result.error === undefined, stderr: result.stderr}).toEqual({exit: 0, spawned: true, stderr: ''});
  expect(result.stdout).toBe('<p>QA renderer ready</p>');
});

it.each(['production', 'development'] as const)('the QA context refuses a %s process', mode => {
  const result = spawnSync(process.execPath, ['--import', hook, '--eval', "process.stdout.write('entered')"], {env: {...env, NODE_ENV: mode}, encoding: 'utf8'});
  expect(result.status).toBe(1);
  expect(result.stdout).toBe('');
  expect(result.stderr).toContain('QA server context requires an isolated test process');
});

it.each(['DATABASE_URL', 'NEVORA_APP_DATABASE_URL', 'NEVORA_WORKER_DATABASE_URL'])('the QA context refuses inherited %s', key => {
  const result = spawnSync(process.execPath, ['--import', hook, '--eval', "process.stdout.write('entered')"], {env: {...env, [key]: 'postgresql://fictional.invalid/never-connect'}, encoding: 'utf8'});
  expect(result.status).toBe(1);
  expect(result.stdout).toBe('');
  expect(result.stderr).toContain('QA server context requires an isolated test process');
});

it('the QA context does not resolve arbitrary server-only subpaths', () => {
  const result = spawnSync(process.execPath, ['--import', hook, '--input-type=module', '--eval', "await import('server-only/private-path')"], {env, encoding: 'utf8'});
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('ERR_MODULE_NOT_FOUND');
});

it.each(['foundation', 'phase-b-c-authority', 'generation', 'exchanges', 'notifications'])('%s SQL config loads current server services in its real Vitest process', name => {
  const scratch = mkdtempSync(join(tmpdir(), 'nevora-server-context-'));
  try {
    const fixture = join(scratch, 'context.test.ts');
    const api = pathToFileURL(resolve('src/lib/company-access/operational-scope.server.ts')).href;
    const vitest = pathToFileURL(resolve('node_modules/vitest/dist/index.js')).href;
    writeFileSync(fixture, `import {it,expect} from ${JSON.stringify(vitest)};import {withOperationalCompany} from ${JSON.stringify(api)};it('denied current authority never enters a company loader',async()=>{let reads=0;const executor={query:async()=>{throw Error('No workspace');},transaction:async()=>{throw Error('No workspace');}};const result=await withOperationalCompany({employee:{id:'fictional',role:'MANAGER'},sessionTokenHash:'f'.repeat(64)},async()=>{reads++;return 'private';},executor);expect(result.state).toBe('unavailable');expect(reads).toBe(0);});`);
    const config = join(scratch, 'vitest.config.mts');
    const original = pathToFileURL(resolve(`vitest.${name}${name === 'phase-b-c-authority' ? '' : '-integration'}.config.mts`)).href;
    writeFileSync(config, `import original from ${JSON.stringify(original)};export default {...original,test:{...original.test,include:[${JSON.stringify(fixture)}],setupFiles:[],reporters:['dot']}};`);
    const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', '--config', config], {env, encoding: 'utf8', timeout: 12000});
    expect({exit: result.status, spawned: result.error === undefined, stderr: result.stderr}).toEqual({exit: 0, spawned: true, stderr: ''});
    expect(result.stdout).toContain('1 passed');
  } finally { rmSync(scratch, {recursive: true, force: true}); }
});
