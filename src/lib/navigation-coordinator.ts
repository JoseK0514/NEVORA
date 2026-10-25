export type NavigationAttempt={
 readonly generation:number;
 readonly source:string;
 readonly destination:string;
 readonly kind:'link'|'imperative'|'history'|'router';
};

/** One spelling per address: the router reports committed queries through URLSearchParams ("+" for a space), while
 * destinations come from URL.search ("%20"). */
function addressKey(address:string){
 const query=address.indexOf('?');
 if(query<0)return address;
 const search=new URLSearchParams(address.slice(query+1)).toString();
 return address.slice(0,query)+(search?'?'+search:'');
}

/**
 * Tracks one current navigation for the shell's pending UI and identity reloads.
 * Attempts are compared by object identity, so a late completion from a replaced
 * attempt cannot settle the new one. This coordinates lifecycle only; it grants
 * no data access and does not perform router navigation itself.
 */
export function createNavigationCoordinator(){
 let active:NavigationAttempt|null=null,generation=0,seenPending=false;
 const settled=new Set<()=>void>(),idle=new Set<()=>void>();
 const start=(attempt:NavigationAttempt)=>{
  active=attempt;seenPending=false;return attempt;
 };
 const quiet=()=>{
  if(active)return;
  for(const listener of [...idle]){idle.delete(listener);listener();}
 };
 const finish=(attempt:NavigationAttempt)=>{
  if(active!==attempt)return false;
  active=null;seenPending=false;
  for(const listener of [...settled])listener();
  // A settled listener may start the next navigation; idle listeners then wait for that one.
  quiet();
  return true;
 };
 return {
  begin(source:string,destination:string,kind:NavigationAttempt['kind']):NavigationAttempt|null{
   if(addressKey(source)===addressKey(destination)&&!active)return null;
   return start({generation:++generation,source,destination,kind});
  },
  /** A navigation the router starts itself (router.push or replace, including the replace a server redirect
   * issues after its page commits). A link already heading to the same destination keeps its own attempt.
   * Each redirect's push or replace starts its own transition. An unrelated address commit cannot prove that the
   * current transition completed, even if that address has never been observed before. */
  transition(source:string,destination:string):NavigationAttempt|null{
   if(active&&addressKey(active.destination)===addressKey(destination))return active;
   if(addressKey(source)===addressKey(destination)&&!active)return null;
   return start({generation:++generation,source,destination,kind:'router'});
  },
  pending:()=>active!==null,
  current:()=>active,
  observe(attempt:NavigationAttempt,pending:boolean){
   if(active!==attempt)return;
   if(pending)seenPending=true;
   else if(seenPending)finish(attempt);
  },
  committed(address:string){
   // Only the current destination or its attempt-bound Link completion is evidence of settlement. No history of
   // earlier destinations is needed: eviction, repeated commits and unknown addresses all remain conservative.
   if(active&&addressKey(address)===addressKey(active.destination))finish(active);
  },
  // A new explicit user choice supersedes the old navigation. Its caller starts
  // a new authority barrier; no deferred snapshot or callback is replayed to settled listeners.
  // The coordinator is idle afterwards, so idle listeners (an identity reload) no longer wait.
  // Discarded attempts may still commit, but cannot settle a different current destination.
  discard(){active=null;seenPending=false;quiet();},
  subscribe(listener:()=>void){settled.add(listener);return()=>{settled.delete(listener);};},
  /** Calls the listener once, as soon as no navigation is in flight: now, or when the current one finishes or is
   * discarded. The returned function stops the wait. */
  whenIdle(listener:()=>void){
   if(!active){listener();return()=>{};}
   idle.add(listener);return()=>{idle.delete(listener);};
  },
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
 * browser navigation. Reload once no navigation is in flight instead: when it settles, when it is abandoned (discarded,
 * including by the provider remount a new identity causes at that commit), or when the shell that asked unmounts.
 * Exactly one reload either way, and a finished wait never fires into a later navigation. */
export function createIdentityReload(navigation:NavigationCoordinator|null,reload:()=>void){
 let stop:(()=>void)|null=null,waiting=false,done=false;
 const run=()=>{if(done)return;done=true;waiting=false;stop?.();stop=null;reload();};
 return {
  request(){
   if(done||waiting)return;
   if(!navigation){run();return;}
   waiting=true;
   const stopWaiting=navigation.whenIdle(run);
   if(waiting)stop=stopWaiting;
  },
  /** The shell is leaving: a deferred reload happens now, after the commit that replaced it. */
  release(){if(waiting)run();},
 };
}
