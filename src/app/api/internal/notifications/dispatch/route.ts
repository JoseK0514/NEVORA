import {withWorkerWorkspace} from '@/lib/workspace-routing/worker.server';
import {workspaceMode} from '@/lib/workspace-routing/config.server';
import {workspaceRequestOrigin} from '@/lib/workspace-routing/runtime-config.server';
import { readNotificationConfig, loadWorkspaceNotificationConfig } from '../../../../../lib/notifications/config';
import { authorizeWorker } from '../../../../../lib/notifications/worker-auth';
import { createWorkerDeps, runWorker } from '../../../../../lib/notifications/worker';
export const runtime = 'nodejs';
export const maxDuration = 30;
export async function GET(request: Request) {
  const config = readNotificationConfig(process.env);
  const headers = { 'Cache-Control': 'no-store' };
  if (!authorizeWorker(request, config.workerSecret)) return Response.json({ error: 'unauthorized' }, { status: 401, headers });
  try { return Response.json(await withWorkerWorkspace(workspaceMode()==='isolated'?workspaceRequestOrigin(request)??undefined:undefined,async()=>runWorker('dispatch', createWorkerDeps(await loadWorkspaceNotificationConfig(process.env),undefined,{kind:'request',headers:request.headers}))), { headers }); }
  catch { return Response.json({ error: 'worker_unavailable' }, { status: 503, headers }); }
}
export const POST = GET;
