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
export function unexpectedD2Runtime(observations){
 return {
  runtime:observations.runtime.filter(event=>!(event.phase==='offline'&&/^(Load failed|TypeError: Load failed|Failed to fetch|TypeError: Failed to fetch)$/.test(event.message))),
  console:observations.console.filter(event=>event.errors.length>0||event.extractionFailed||event.reactBoundary),
 };
}
