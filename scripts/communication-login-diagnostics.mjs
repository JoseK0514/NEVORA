import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {Client} from 'pg';
import {OWNED_LOGIN_HEADER,readOwnedLoginEvents} from '../src/test/integration/owned-login-diagnostics.mjs';
import {safeDatabaseWaits,safeEvaluationFailure,safeLoginServerRequests} from './release-browser-diagnostics.mjs';
import {runBeforeRecoveryDeadline} from './browser-response-deadline.mjs';

const routeOf=(value,origin)=>{try{const url=new URL(value,origin);return url.origin===origin&&['/app','/login'].includes(url.pathname)?url.pathname:'other';}catch{return 'other';}};
const bounded=work=>runBeforeRecoveryDeadline(work,performance.now()+1000);

/** Observe the existing login callback without changing its navigation ordering or deadline. */
export async function diagnoseCommunicationLogin({target,app,id,login,persist,readLog=()=>readFile(join(app.root,'next.log'),'utf8'),createClient=options=>new Client(options)}){
 const started=Date.now(),attemptId=randomUUID(),attempt={status:'started',trace:[],omittedEvents:0};
 let sequence=0,failed=false;const identities=new WeakMap();
 const record=value=>{if(attempt.trace.length<40)attempt.trace.push({afterMs:Math.max(0,Date.now()-started),...value});else attempt.omittedEvents++;};
 const metadata=request=>{
  if(!identities.has(request))identities.set(request,++sequence);
  const type=request.resourceType(),method=request.method();
  return {id:identities.get(request),route:routeOf(request.url(),app.url),method:['GET','POST'].includes(method)?method:'other',navigation:request.isNavigationRequest()===true,resourceType:['document','fetch','xhr'].includes(type)?type:'other',serverAction:typeof request.headers()['next-action']==='string'};
 };
 const observe=(event,request,extra={})=>{const value=metadata(request);if(value.route!=='other')record({event,...value,...extra});};
 const requested=request=>observe('request',request);
 const responded=response=>{const headers=response.headers(),redirect=headers['x-action-redirect']??headers.location,status=response.status();observe('response',response.request(),{status:Number.isInteger(status)&&status>=100&&status<=599?status:null,redirect:typeof redirect==='string'?routeOf(redirect.split(';')[0],app.url):null});};
 const requestFailed=request=>observe('request-failed',request,{reason:/abort|cancel/i.test(request.failure()?.errorText??'')?'aborted':'transport-failed'});
 const finished=request=>observe('request-finished',request);
 const navigated=frame=>{if(frame===target.mainFrame())record({event:'document',route:routeOf(frame.url(),app.url)});};
 const listeners={request:requested,response:responded,requestfailed:requestFailed,requestfinished:finished,framenavigated:navigated};
 for(const [event,listener] of Object.entries(listeners))target.on(event,listener);
 const server=async()=>{try{const log=await bounded(readLog);attempt.serverRequests=safeLoginServerRequests(log);attempt.serverTrace=readOwnedLoginEvents(log,attemptId);}catch{attempt.serverRequests='unavailable';attempt.serverTrace='unavailable';}};
 try{
  await target.setExtraHTTPHeaders({[OWNED_LOGIN_HEADER]:attemptId});
  await login();attempt.status='ready';await server();
 }catch(error){
  failed=true;attempt.status='failed';
  let code;try{code=new URL(target.url()).searchParams.get('error');}catch{}
  attempt.failure={route:routeOf(target.url(),app.url),error:['busy','invalid','missing','locked'].includes(code)?code:code?'other':null,category:safeEvaluationFailure(error)};
  try{attempt.pageState=await bounded(()=>target.evaluate(()=>{
   const button=document.querySelector('form button[type=submit]'),attribute=name=>['true','false'].includes(button?.getAttribute(name))?button.getAttribute(name):null;
   return {route:['/login','/app'].includes(location.pathname)?location.pathname:'other',readyState:['loading','interactive','complete'].includes(document.readyState)?document.readyState:'other',focused:document.hasFocus(),visibility:document.visibilityState==='visible'?'visible':'hidden',busy:attribute('aria-busy'),disabled:attribute('aria-disabled'),shell:!!document.querySelector('.app-shell.nevora-portal')};
  }));}catch(error){attempt.pageState={state:'unavailable',failure:safeEvaluationFailure(error)};}
  await server();
  let client;
  try{
   client=createClient({connectionString:app.database.connectionString,connectionTimeoutMillis:1000,statement_timeout:1000,query_timeout:1000});
   await bounded(()=>client.connect());
   attempt.databaseWaits=safeDatabaseWaits((await bounded(()=>client.query('SELECT state,wait_event_type,wait_event,count(*)::int AS connections FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() GROUP BY state,wait_event_type,wait_event'))).rows);
   const row=(await bounded(()=>client.query('SELECT EXISTS(SELECT 1 FROM employee_sessions WHERE employee_id=$1 AND created_at>=to_timestamp($2::double precision/1000)) AS "createdSinceAttempt"',[id,started]))).rows[0];
   attempt.sessionOutcome={createdSinceAttempt:typeof row?.createdSinceAttempt==='boolean'?row.createdSinceAttempt:null};
  }catch{attempt.databaseWaits??='unavailable';attempt.sessionOutcome='unavailable';}
  finally{if(client)await bounded(()=>client.end()).catch(()=>{});}
  throw error;
 }finally{
  for(const [event,listener] of Object.entries(listeners))target.off(event,listener);
  await bounded(()=>target.setExtraHTTPHeaders({})).catch(()=>{});
  try{await persist(attempt);}catch{if(!failed)throw Error('Communication login diagnostic persistence failed');console.error('Communication login diagnostic persistence failed during an already failed login');}
 }
}
