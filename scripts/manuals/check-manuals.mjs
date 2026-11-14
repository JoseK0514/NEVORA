import {dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {manualErrorMessage, verifyBundle} from './bundle.mjs';

export {verifyBundle};
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--repo')) {
    console.error('Usage: node scripts/manuals/check-manuals.mjs [--repo /path/to/repository]'); process.exitCode = 1;
  } else {
    try {
      const repoRoot = args[1] || resolve(dirname(fileURLToPath(import.meta.url)), '../..');
      const manifest = await verifyBundle({repoRoot});
      console.log(`Verified ${manifest.guides.length} source-qualified web guides from ${manifest.sourceSha}; application ${manifest.applicationHash}`);
    } catch (error) {console.error(`Manual verification failed: ${manualErrorMessage(error)}`); process.exitCode = 1;}
  }
}
