/** Test-fixture sequencing only; product reads/responses remain untouched. */
export function fixtureReadGate(publish:(event:{event:string;at:number;active:number})=>void=()=>{}){
 let blocked=false,active=0,open:Promise<void>=Promise.resolve(),release=()=>{},drained=()=>{};
 const trace=(event:string)=>publish({event,at:Date.now(),active});
 async function read<T>(run:()=>Promise<T>):Promise<T>{
  while(blocked){trace('read-queued');await open;}
  active++;trace('read-start');
  try{return await run();}finally{active--;trace('read-end');if(active===0)drained();}
 }
 async function mutate<T>(run:()=>Promise<T>,timeoutMs:number):Promise<T>{
  if(blocked)throw Error('Nested fixture mutation is not supported');
  blocked=true;open=new Promise<void>(ready=>{release=ready;});trace('mutation-blocked');
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{
   if(active)await new Promise<void>((ready,reject)=>{drained=ready;timer=setTimeout(()=>reject(Error('Existing notification reads did not drain before fixture mutation')),timeoutMs);});
   if(timer)clearTimeout(timer);trace('mutation-start');
   try{return await run();}finally{trace('mutation-end');}
  }finally{if(timer)clearTimeout(timer);drained=()=>{};blocked=false;trace('mutation-released');release();}
 }
 return {read,mutate};
}
