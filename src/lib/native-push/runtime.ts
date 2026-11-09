import 'server-only';
import {sqlNativeInstallationRepository} from '../data/native-installations';
import {sqlNativeDeliveryRepository} from '../data/native-deliveries';
import {sqlNotificationStateRepository} from '../data/notification-state';
import {neonNotificationExecutor} from '../data/sql-executor';
import {loadWorkspaceNotificationConfig, readNotificationConfig} from '../notifications/config';
import type {NotificationConfig, SqlExecutor, WorkerReport} from '../notifications/types';
import {readNativeRegistrationConfig, type NativeRegistrationConfig} from './config';
import {readNativeProviderConfig, type NativeProviderConfig} from './providers/config';
import {createApnsSender} from './providers/apns';
import {createFcmSender} from './providers/fcm';
import {createGoogleAccessTokenSupplier} from './providers/oauth';
import type {NativeTransport} from './providers/transport';
import {runNativeWorker, type NativeWorkerDeps} from './worker';

/** Factory starts no IO. Tests supply their disposable SQL executor and fake
 * transport; real providers require independent explicit registration/delivery
 * configuration and a manual CLI invocation. No schedule is installed here. */
export function createNativeWorkerDeps({notification, registration, providers, executor = neonNotificationExecutor(), transport, clock = () => new Date()}: {
  notification: NotificationConfig; registration: NativeRegistrationConfig; providers: NativeProviderConfig;
  executor?: SqlExecutor; transport?: NativeTransport; clock?(): Date;
}): NativeWorkerDeps {
  const apns = createApnsSender(providers.apns, transport);
  const fcm = createFcmSender(providers.fcm && {...providers.fcm, accessToken: createGoogleAccessTokenSupplier(providers.fcm, transport)}, transport);
  const config = {...registration, enabled: notification.featureEnabled && providers.deliveryEnabled
    && notification.environment === registration.environment && notification.portalOrigin === registration.origin,
    testAccountIds: providers.testAccountIds, policy: notification.policy};
  function bind(signal?: AbortSignal): NativeWorkerDeps {
    const sql: SqlExecutor = {
      query: (statement, caller) => executor.query(statement, signal && caller ? AbortSignal.any([signal, caller]) : signal ?? caller),
      transaction: (statements, caller) => executor.transaction(statements, signal && caller ? AbortSignal.any([signal, caller]) : signal ?? caller),
    };
    return {config, clock, state: sqlNotificationStateRepository(sql, notification.workspace),
      deliveries: sqlNativeDeliveryRepository({...registration, executor: sql}),
      cleanup: limit => sqlNativeInstallationRepository({...registration, executor: sql}).cleanupRevoked(limit),
      sender: {send: input => (input.installation.platform === 'ios' ? apns : fcm).send(input)}, withSignal: bind};
  }
  return bind();
}

/** All disabled/configuration gates precede even a workspace database read. */
export async function runNativeEnvironmentWorker(env: Record<string, string | undefined>): Promise<WorkerReport> {
  const off: WorkerReport = {claimed: 0, accepted: 0, retried: 0, failed: 0, expired: 0, cancelled: 0, noSubscription: 0, disabled: true};
  const registration = readNativeRegistrationConfig(env), providers = readNativeProviderConfig(env), notification = readNotificationConfig(env);
  if (!registration || !providers.deliveryEnabled || !notification.featureEnabled || notification.environment !== registration.environment
    || notification.portalOrigin !== registration.origin || (registration.environment === 'test' && !providers.testAccountIds.length)) return off;
  return runNativeWorker({mode: 'all', deps: createNativeWorkerDeps({notification: await loadWorkspaceNotificationConfig(env), registration, providers})});
}
