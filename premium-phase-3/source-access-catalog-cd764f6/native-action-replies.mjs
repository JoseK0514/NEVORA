// Inert local reply builders. No server calls, imports from the application, or browser startup.
import assert from 'node:assert/strict';

function plainValue(value,seen=new Set()){
  if(value===null||['string','boolean'].includes(typeof value))return;
  if(typeof value==='number'){assert(Number.isFinite(value),'Flight fixture numbers must be finite');return;}
  assert(value&&typeof value==='object'&&!seen.has(value),'Use plain acyclic contract values');
  assert(Array.isArray(value)||Object.getPrototypeOf(value)===Object.prototype,'Use JSON contract records, not custom instances');
  seen.add(value);for(const child of Object.values(value))plainValue(child,seen);seen.delete(value);
}
function encodedValue(value){
  plainValue(value);
  // Flight reserves a leading $. Doubling it encodes a literal string value.
  return JSON.stringify(value,(_key,item)=>typeof item==='string'&&item.startsWith('$')?'$'+item:item);
}
export function nativeResultReply(result){
  // Matches Next's action envelope: `a` is a promise chunk; f="" means no router patch.
  // An omitted build ID avoids falsely naming another build; no navigation or cache revalidation is claimed.
  return {status:200,contentType:'text/x-component',headers:{'x-action-revalidated':'0'},body:'0:{"a":"$@1","f":""}\n1:'+encodedValue(result)+'\n'};
}
export function nativeRedirectReply(destination){
  assert(typeof destination==='string'&&destination.startsWith('/app')&&!destination.startsWith('//'),'Use a local inspected app destination');
  assert(!/[\r\n]/.test(destination),'Invalid redirect fixture');
  return {status:303,contentType:'text/plain',headers:{'x-action-redirect':destination+';push','x-action-revalidated':'0'},body:''};
}
function assertHeldNative(gate,index,origin){
  const entry=gate.entries[index];assert(entry&&!entry.released,'Native operation is missing or already answered');
  const request=entry.route.request(),url=new URL(request.url()),expected=new URL(origin);
  assert(['127.0.0.1','localhost','[::1]'].includes(expected.hostname),'Only an owned loopback preview is allowed');
  assert(url.origin===expected.origin&&request.method()==='POST'&&request.headers()['next-action'],'Expected an actual held same-origin Next action');
  return {entry,request,url};
}
export async function readHeldNativeFields(gate,index,origin){
  const {request}=assertHeldNative(gate,index,origin),type=request.headers()['content-type']??'';
  const bytes=request.postDataBuffer();assert(bytes,'Native request body is missing');
  if(!type.startsWith('multipart/form-data'))throw Error('SETUP GAP: native FormData transport is not multipart; do not invent command identities');
  const form=await new Response(bytes,{headers:{'content-type':type}}).formData();
  const fields={};
  for(const [key,value] of form){
    if(typeof value!=='string')continue;
    const name=key.replace(/^\d+_/,'');
    if(!['operationId','requestId','kind','sourceShiftId','sourceEpisodeId','sourceTermsFingerprint','targetShiftId','targetEpisodeId','targetTermsFingerprint','expectedRevision','confirmed'].includes(name))continue;
    if(Object.hasOwn(fields,name))throw Error('SETUP GAP: ambiguous native field '+name);
    fields[name]=value;
  }
  return fields;
}
export async function fulfillHeldNativeResult(gate,index,origin,result){
  const {entry}=assertHeldNative(gate,index,origin);
  entry.released=true;await entry.route.fulfill(nativeResultReply(result));
}
export async function fulfillHeldNativeRedirect(gate,index,origin,destination){
  const {entry}=assertHeldNative(gate,index,origin);
  entry.released=true;await entry.route.fulfill(nativeRedirectReply(destination));
}
