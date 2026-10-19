import { expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';

it('loads the real notification CLI modules through raw tsx without a top-level-await CommonJS failure', () => {
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--eval', `
    Promise.all([import('./src/lib/notifications/config.ts'), import('./src/lib/notifications/provider.ts')]).then(([config, provider]) => {
      if (typeof config.readNotificationConfig !== 'function' || typeof provider.createPushSender !== 'function') throw Error('Missing CLI exports');
      if (config.readNotificationConfig({}).featureEnabled) throw Error('Unexpected activation');
      console.log('notification-cli-import-ok');
    }).catch(() => { process.exitCode = 1; });
  `], { encoding: 'utf8', timeout: 15000, env: { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: 'development' } });
  expect(result.error).toBeUndefined(); expect(result.status).toBe(0);
  expect(result.stdout).toContain('notification-cli-import-ok');
});
