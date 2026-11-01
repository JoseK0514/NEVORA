import {safeBrowserFailure} from './release-browser-diagnostics.mjs';
const stackSources=new Set(['fetch-server-response.ts','server-action-reducer.ts','router-reducer.ts','app-router.tsx','error-boundary.tsx','scoped-read-frame.tsx','manager-time-corrections.tsx','react-dom-client.development.js']);
export function safeD2Text(value){
 const text=String(value);
 if(/\b(?:authority|proof|credential)[\s"']*[:=]/i.test(text))return '[sensitive diagnostic omitted]';
 return safeBrowserFailure({name:'Error',message:text.replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s"'<>]+/gi,'[URL]').replace(/\/[^\s"'<>]*[?#][^\s"'<>]*/g,'[PATH WITH QUERY]')}).summary;
}
export function safeD2Error(error){
 const frames=[...String(error.stack??'').slice(0,16000).matchAll(/([\w.-]+\.(?:tsx?|m?js)):(\d+):(\d+)/g)].slice(0,12).map(match=>({source:stackSources.has(match[1])?match[1]:'other-script',line:Number(match[2]),column:Number(match[3])}));
 return {name:['Error','TypeError','RangeError','AbortError'].includes(error.name)?error.name:'Unknown',message:safeD2Text(error.message),frames};
}
/** WebKit reports a fetch that a navigation cancelled as "<host>/<path> due to access control checks.". The manager's
 * foreground return starts a protected RSC refresh that can cancel Who's working's own /api/manager/today read (CI on
 * a9f0b342). Only that read, in that stage, on the loopback test origin and without a query, is a navigation
 * cancellation; the caller records it separately. Anything else stays fatal. */
export function d2NavigationCancellation(event){
 return event.stage==='manager-return'&&event.name==='Unknown'&&/^\/127\.0\.0\.1:\d+\/api\/manager\/today due to access control checks\.$/.test(event.message);
}
export function unexpectedD2Runtime(observations){
 return {
  runtime:observations.runtime.filter(event=>!(event.phase==='offline'&&/^(Load failed|TypeError: Load failed|Failed to fetch|TypeError: Failed to fetch)$/.test(event.message))&&!d2NavigationCancellation(event)),
  console:observations.console.filter(event=>event.errors.length>0||event.extractionFailed||event.reactBoundary),
 };
}
