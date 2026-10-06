import { pathToFileURL } from 'node:url';
import { loadWorkspaceNotificationConfig } from '../src/lib/notifications/config';
import { createWorkerDeps, runWorker, type WorkerDeps } from '../src/lib/notifications/worker';
/** Manual bounded invocation only; no daemon, cron registration or provisioning. */
export async function runCli(args: readonly string[], deps?: WorkerDeps) {
    if ((args.length !== 1 && args.length !== 2) || (args[0] !== 'dispatch' && args[0] !== 'reminders') || args.length===2 && (args[0]!=='reminders'||!/^(EXCHANGE|CALLOUT):[A-Za-z0-9_-]{1,128}$/.test(args[1])))
        throw new Error('Usage: notifications:worker dispatch|reminders [cursor]');
    return runWorker(args[0], deps ?? createWorkerDeps(await loadWorkspaceNotificationConfig(process.env)),{cursor:args[1]});
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    runCli(process.argv.slice(2)).then(report => { process.stdout.write(`${JSON.stringify(report)}\n`); }, () => { process.stderr.write('Notification worker could not complete.\n'); process.exitCode = 1; });
}
