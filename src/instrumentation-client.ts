import {routerTransitionStarted} from '@/lib/navigation-coordinator';

/** Next calls this as the router starts a push or replace (including a server redirect's replace). The app's
 * navigation coordinator uses it to know a router navigation is in flight; see createIdentityReload. */
export function onRouterTransitionStart(url:string,navigationType:'push'|'replace'|'traverse'){
 if(navigationType!=='traverse')routerTransitionStarted(url);
}
