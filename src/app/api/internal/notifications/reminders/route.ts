import { readNotificationConfig, loadWorkspaceNotificationConfig } from '../../../../../lib/notifications/config';
import { authorizeWorker } from '../../../../../lib/notifications/worker-auth';
import { createWorkerDeps, runWorker } from '../../../../../lib/notifications/worker';
export const runtime = 'nodejs';
export const maxDuration = 30;
async function handle(request: Request, maintenance:boolean) {
  const config = readNotificationConfig(process.env);
  const headers = { 'Cache-Control': 'no-store' };
  if (!authorizeWorker(request, config.workerSecret)) return Response.json({ error: 'unauthorized' }, { status: 401, headers });
  const cursor=new URL(request.url).searchParams.get('cursor')??undefined;
  if(cursor!==undefined && !/^(EXCHANGE|CALLOUT):[A-Za-z0-9_-]{1,128}$/.test(cursor))return Response.json({error:'invalid_cursor'},{status:400,headers});
  try { return Response.json(await runWorker('reminders', createWorkerDeps(await loadWorkspaceNotificationConfig(process.env),undefined,{kind:'request',headers:request.headers}),{maintenance,cursor}), { headers }); }
  catch { return Response.json({ error: 'worker_unavailable' }, { status: 503, headers }); }
}
export const GET=(request:Request)=>handle(request,false);
export const POST=(request:Request)=>handle(request,true);
