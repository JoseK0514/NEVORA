import 'server-only';
import {workspaceBindingFacts,type WorkspaceBinding} from './resolver.server';
export type {WorkspaceBinding} from './resolver.server';
/** Public identity facts are derived from genuine custody; copying them gives no binding. */
export function workspaceIdentity(binding:WorkspaceBinding){const f=workspaceBindingFacts(binding);return Object.freeze({workspaceId:f.record.id,canonicalOrigin:f.record.canonicalOrigin,incarnation:f.record.incarnation,environment:f.record.environment,purpose:f.purpose});}
