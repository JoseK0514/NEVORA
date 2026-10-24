export type NavigationAttempt={
 readonly generation:number;
 readonly source:string;
 readonly destination:string;
 readonly kind:'link'|'imperative'|'history'|'router';
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
  /** A navigation the router starts itself (router.push or replace, including the replace a server redirect
   * issues after its page commits). A link already heading to the same destination keeps its own attempt.
   * It settles when the router commits its destination, or commits any other address (a further redirect). */
  transition(source:string,destination:string):NavigationAttempt|null{
   if(active?.destination===destination)return active;
   if(source===destination&&!active)return null;
   active={generation:++generation,source,destination,kind:'router'};seenPending=false;return active;
  },
  pending:()=>active!==null,
  current:()=>active,
  observe(attempt:NavigationAttempt,pending:boolean){
   if(active!==attempt)return;
   if(pending)seenPending=true;
   else if(seenPending)finish(attempt);
  },
  committed(address:string){if(active&&(address===active.destination||active.kind==='router'&&address!==active.source))finish(active);},
  // A new explicit user choice supersedes the old navigation. Its caller starts
  // a new authority barrier; no deferred snapshot or callback is replayed.
  discard(){active=null;seenPending=false;},
  subscribe(listener:()=>void){settled.add(listener);return()=>{settled.delete(listener);};},
 };
}
export type NavigationCoordinator=ReturnType<typeof createNavigationCoordinator>;

/** Next calls instrumentation-client's onRouterTransitionStart synchronously as the router starts a push or replace.
 * The mounted navigation provider listens here, so every router navigation is visible to the coordinator. */
const routerTransitions=new Set<(href:string)=>void>();
export function routerTransitionStarted(href:string){for(const listener of [...routerTransitions])listener(href);}
export function onRouterTransition(listener:(href:string)=>void){routerTransitions.add(listener);return()=>{routerTransitions.delete(listener);};}

/** An identity change reloads the whole document. Started while the router is navigating, the reload cancels that
 * navigation's RSC request, which WebKit rejects before pagehide, so Next logs a failed fetch and starts a competing
 * browser navigation. Reload once the router has committed instead: when it settles, or when the shell that asked
 * unmounts at that commit (a new identity remounts the shell). Exactly one reload either way. */
export function createIdentityReload(navigation:NavigationCoordinator|null,reload:()=>void){
 let waiting:(()=>void)|null=null,done=false;
 const run=()=>{if(done)return;done=true;waiting?.();waiting=null;reload();};
 return {
  request(){
   if(done||waiting)return;
   if(!navigation?.pending()){run();return;}
   waiting=navigation.subscribe(run);
  },
  /** The shell is leaving: a deferred reload happens now, after the commit that replaced it. */
  release(){if(waiting)run();},
 };
}
