import { pathToFileURL } from 'node:url';
import { loadWorkspaceNotificationConfig } from '../src/lib/notifications/config';
import { createWorkerDeps, runWorker, type WorkerDeps } from '../src/lib/notifications/worker';
/** Manual bounded invocation only; no daemon, cron registration or provisioning. */
export async function runCli(args: readonly string[], deps?: WorkerDeps) {
    if (args.length !== 1 || (args[0] !== 'dispatch' && args[0] !== 'reminders'))
        throw new Error('Usage: notifications:worker dispatch|reminders');
    return runWorker(args[0], deps ?? createWorkerDeps(await loadWorkspaceNotificationConfig(process.env)));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    runCli(process.argv.slice(2)).then(report => { process.stdout.write(`${JSON.stringify(report)}\n`); }, () => { process.stderr.write('Notification worker could not complete.\n'); process.exitCode = 1; });
}
