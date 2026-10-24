/** Fixed metadata only: never retain an error's arbitrary text, stack or cause. */
export function projectRscCaughtError(error){
 try{
  const names=['Error','TypeError','AbortError','SyntaxError','RangeError','AggregateError','NetworkError'];
  const messages={'Load failed':'load-failed','Failed to fetch':'fetch-failed','The operation was aborted.':'aborted','This operation was aborted':'aborted','Connection closed.':'connection-closed'};
  const project=value=>({name:names.includes(value?.name)?value.name:'other',messageKind:Object.hasOwn(messages,value?.message)?messages[value.message]:'other',createFetch:typeof value?.stack==='string'&&/\bcreateFetch\b/.test(value.stack),processFetch:typeof value?.stack==='string'&&/\bprocessFetch\b/.test(value.stack),fetchServerResponse:typeof value?.stack==='string'&&/\bfetchServerResponse\b/.test(value.stack)});
  return {error:project(error),cause:error?.cause===undefined?null:project(error.cause),projectionUnavailable:false};
 }catch{return {error:null,cause:null,projectionUnavailable:true};}
}

export function requestFailureCategory(text){
 if(typeof text!=='string')return 'unavailable';
 if(/^(?:net::ERR_ABORTED|cancelled|canceled|The operation was aborted\.)$/i.test(text))return 'aborted';
 if(/^(?:net::ERR_CONNECTION_(?:RESET|CLOSED|REFUSED)|net::ERR_NAME_NOT_RESOLVED|Could not connect to the server\.)$/i.test(text))return 'connection-failed';
 return 'other';
}

/** Capture synchronously before a navigation destroys the error's JSHandle. */
export function installRscCaughtErrorObserver(project){
 const original=console.error;
 console.error=function(...args){
  if(typeof args[0]==='string'&&args[0].includes('Failed to fetch RSC payload for ')&&args[0].includes('Falling back to browser navigation.')){
   const metadata=project(args[1]);
   try{void globalThis.__nevoraQaRscCaughtError({...metadata,timeOrigin:performance.timeOrigin,elapsedMs:Math.round(performance.now()),readyState:document.readyState}).catch(()=>{});}catch{}
  }
  return Reflect.apply(original,this,args);
 };
}

export async function observeRscCaughtErrors(context,receive){
 await context.exposeBinding('__nevoraQaRscCaughtError',(source,value)=>{
  const normal=entry=>entry&&typeof entry==='object'?{
   name:['Error','TypeError','AbortError','SyntaxError','RangeError','AggregateError','NetworkError','other'].includes(entry.name)?entry.name:'other',
   messageKind:['load-failed','fetch-failed','aborted','connection-closed','other'].includes(entry.messageKind)?entry.messageKind:'other',
   createFetch:entry.createFetch===true,processFetch:entry.processFetch===true,fetchServerResponse:entry.fetchServerResponse===true,
  }:null;
  receive(source.page,{error:normal(value?.error),cause:normal(value?.cause),projectionUnavailable:value?.projectionUnavailable!==false,timeOrigin:Number.isFinite(value?.timeOrigin)?value.timeOrigin:null,elapsedMs:Number.isSafeInteger(value?.elapsedMs)&&value.elapsedMs>=0?value.elapsedMs:null,readyState:['loading','interactive','complete'].includes(value?.readyState)?value.readyState:'other'});
 });
 await context.addInitScript({content:'('+installRscCaughtErrorObserver.toString()+')('+projectRscCaughtError.toString()+');'});
}
