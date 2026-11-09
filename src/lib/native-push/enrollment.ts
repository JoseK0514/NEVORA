import {workspaceRuntimeEnvironment} from '../workspace-routing/runtime-config.server';
import 'server-only';
import {readSessionMutationProof} from '../auth/session';
import {neonNotificationExecutor} from '../data/sql-executor';
import {sqlNativeInstallationRepository} from '../data/native-installations';
import {readNativeRegistrationConfig} from './config';
import {createNativeRegistrationHandlers} from './http';

/** No database access is started until the enabled HTTP boundary has admitted
 * the request. No provider account/configuration is read by these handlers. */
export async function nativeRegistrationHandlers() {
  const config = readNativeRegistrationConfig(await workspaceRuntimeEnvironment());
  return createNativeRegistrationHandlers({config, session: readSessionMutationProof, repository() {
    if (!config) throw Error('Native registration unavailable');
    return sqlNativeInstallationRepository({...config, executor: neonNotificationExecutor()});
  }});
}
