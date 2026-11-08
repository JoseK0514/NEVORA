import {requireOperationalCommerce} from "../src/lib/commerce/access";
import {withWorkerWorkspace} from '../src/lib/workspace-routing/worker.server';
import { pathToFileURL } from 'node:url';
import { loadWorkspaceNotificationConfig } from '../src/lib/notifications/config';
import { createWorkerDeps, runWorker, type WorkerDeps } from '../src/lib/notifications/worker';
import {runNativeEnvironmentWorker} from '../src/lib/native-push/runtime';
/** Manual bounded invocation only; no daemon, cron registration or provisioning. */
export async function runCli(args: readonly string[], deps?: WorkerDeps) {
    return withWorkerWorkspace(process.env.NEVORA_WORKER_WORKSPACE_ORIGIN,()=>runSelectedCli(args,deps));
}
async function runSelectedCli(args: readonly string[], deps?: WorkerDeps) {
    await requireOperationalCommerce();
    if (args.length === 1 && args[0] === 'native-dispatch') return runNativeEnvironmentWorker(process.env);
    if ((args.length !== 1 && args.length !== 2) || (args[0] !== 'dispatch' && args[0] !== 'reminders') || args.length===2 && (args[0]!=='reminders'||!/^(EXCHANGE|CALLOUT):[A-Za-z0-9_-]{1,128}$/.test(args[1])))
        throw new Error('Usage: notifications:worker dispatch|reminders [cursor]');
    const localContext=process.env.NODE_ENV!=='production'&&process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href?{kind:'cli' as const}:undefined;
    return runWorker(args[0], deps ?? createWorkerDeps(await loadWorkspaceNotificationConfig(process.env),undefined,localContext),{cursor:args[1]});
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    runCli(process.argv.slice(2)).then(report => { process.stdout.write(`${JSON.stringify(report)}\n`); }, () => { process.stderr.write('Notification worker could not complete.\n'); process.exitCode = 1; });
}
