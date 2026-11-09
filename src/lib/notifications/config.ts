import {workspaceRuntimeEnvironment} from '../workspace-routing/runtime-config.server';
import { notificationPolicyFor } from './policy';
import { getWorkspace } from '../data/workspaces';
import type { Workspace } from '../domain';
import type { NotificationConfig, PushRuntimeConfig, SqlExecutor } from './types';
// Erased by Next production compilation; synchronous for the existing worker CLI.
const developmentCapture:typeof import('../dev/capture-gate.cjs')|null=process.env.NODE_ENV!=='production'?require('../dev/capture-gate.cjs'):null;
export {decodePushKey} from './runtime-config';
import {parseNotificationRuntimeConfig} from './runtime-config';
export function readNotificationConfig(env:Record<string,string|undefined>):PushRuntimeConfig{
 const config=parseNotificationRuntimeConfig(env);
 return process.env.NODE_ENV!=='production'&&developmentCapture?developmentCapture.captureNotificationRuntime(config,env):config;
}
/** Attach the current workspace time zone and active-state gates; workers should
 * receive this bound config rather than silently using the default policy time zone. */
export function bindWorkspaceNotificationConfig(runtime: PushRuntimeConfig, workspace: Workspace): NotificationConfig {
    return {...runtime, workspace, policy:notificationPolicyFor(workspace.timeZone),
        featureEnabled:runtime.featureEnabled && workspace.active,
        deliveryEnabled:runtime.deliveryEnabled && workspace.active,
        testDeliveryEnabled:runtime.testDeliveryEnabled && workspace.active};
}
export async function loadWorkspaceNotificationConfig(env: Record<string,string|undefined>, executor?: SqlExecutor): Promise<NotificationConfig> {
    return bindWorkspaceNotificationConfig(readNotificationConfig(await workspaceRuntimeEnvironment(env)),await getWorkspace(executor));
}
