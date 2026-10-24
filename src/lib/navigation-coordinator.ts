export type NavigationAttempt={
 readonly generation:number;
 readonly source:string;
 readonly destination:string;
 readonly kind:'link'|'imperative'|'history';
};

export function createNavigationCoordinator(){
 let active:NavigationAttempt|null=null,generation=0,seenPending=false;
 const settled=new Set<()=>void>();
 const finish=(attempt:NavigationAttempt)=>{
  if(active!==attempt)return false;
  active=null;seenPending=false;
  for(const listener of [...settled])listener();
  return true;
 };
 return {
  begin(source:string,destination:string,kind:NavigationAttempt['kind']):NavigationAttempt|null{
   if(source===destination&&!active)return null;
   active={generation:++generation,source,destination,kind};seenPending=false;return active;
  },
  pending:()=>active!==null,
  current:()=>active,
  observe(attempt:NavigationAttempt,pending:boolean){
   if(active!==attempt)return;
   if(pending)seenPending=true;
   else if(seenPending)finish(attempt);
  },
  committed(address:string){if(active&&address!==active.source)finish(active);},
  // A new explicit user choice supersedes the old navigation. Its caller starts
  // a new authority barrier; no deferred snapshot or callback is replayed.
  discard(){active=null;seenPending=false;},
  subscribe(listener:()=>void){settled.add(listener);return()=>{settled.delete(listener);};},
 };
}
export type NavigationCoordinator=ReturnType<typeof createNavigationCoordinator>;
