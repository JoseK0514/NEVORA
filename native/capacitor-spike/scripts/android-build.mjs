import { spawnSync } from 'node:child_process';
const result = spawnSync(process.platform === 'win32' ? 'gradlew.bat' : './gradlew', ['--no-daemon', ':app:assembleDebug'], { cwd: new URL('../android/', import.meta.url), stdio: 'inherit' });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
