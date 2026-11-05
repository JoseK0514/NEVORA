import { spawnSync } from 'node:child_process';
if (process.platform !== 'darwin') {
  console.error('iOS compilation requires a macOS runner with Xcode. No build was attempted.');
  process.exit(1);
}
for (const [command, args] of [['npm', ['run', 'build']], ['npx', ['cap', 'sync', 'ios']]]) {
  const preparation = spawnSync(command, args, { stdio: 'inherit' });
  if (preparation.error) console.error(preparation.error.message);
  if (preparation.status !== 0) process.exit(preparation.status ?? 1);
}
const result = spawnSync('xcodebuild', ['-project', 'ios/App/App.xcodeproj', '-scheme', 'App', '-configuration', 'Debug', '-sdk', 'iphonesimulator', '-destination', 'generic/platform=iOS Simulator', '-derivedDataPath', 'artifacts/ios-derived', 'CODE_SIGNING_ALLOWED=NO', 'build'], { stdio: 'inherit' });
process.exit(result.status ?? 1);
