import {expect,it,vi} from 'vitest';
import {createIdentityReload,createNavigationCoordinator,onRouterTransition,routerTransitionStarted} from './navigation-coordinator';

it('keeps accepted navigation pending before native Link reports its first pending state',()=>{
 const navigation=createNavigationCoordinator(),attempt=navigation.begin('/source','/destination','link');
 expect(attempt).not.toBeNull();
 if(!attempt)throw Error('Expected a navigation attempt');
 navigation.observe(attempt,false);
 expect(navigation.pending()).toBe(true);
});

it('releases a matching native Link after it was pending and then settled',()=>{
 const navigation=createNavigationCoordinator(),settled=vi.fn(),attempt=navigation.begin('/source','/destination','link');
 navigation.subscribe(settled);
 if(!attempt)throw Error('Expected a navigation attempt');
 navigation.observe(attempt,true);navigation.observe(attempt,false);navigation.observe(attempt,false);
 expect(navigation.pending()).toBe(false);expect(settled).toHaveBeenCalledTimes(1);
});

it('does not let an older Link completion release a newer accepted destination',()=>{
 const navigation=createNavigationCoordinator(),older=navigation.begin('/source','/first','link');
 if(!older)throw Error('Expected a navigation attempt');
 navigation.observe(older,true);
 const current=navigation.begin('/source','/second','link');
 navigation.observe(older,false);
 expect(navigation.current()).toBe(current);expect(navigation.pending()).toBe(true);
});

it('retains an uncertain unmounted initiator until a new explicit user choice',()=>{
 const navigation=createNavigationCoordinator(),attempt=navigation.begin('/source','/destination','link'),settled=vi.fn();
 navigation.subscribe(settled);
 expect(navigation.pending()).toBe(true);
 navigation.discard();
 expect(navigation.pending()).toBe(false);expect(settled).not.toHaveBeenCalled();
 const current=navigation.begin('/source','/new-destination','link');
 if(!attempt)throw Error('Expected a navigation attempt');
 navigation.observe(attempt,true);navigation.observe(attempt,false);
 expect(navigation.current()).toBe(current);
});

it('ignores source address observations and releases after router commitment to a destination',()=>{
 const navigation=createNavigationCoordinator(),settled=vi.fn();
 navigation.subscribe(settled);navigation.begin('/source?period=1','/destination','link');
 navigation.committed('/source?period=1');expect(navigation.pending()).toBe(true);
 navigation.committed('/destination');expect(navigation.pending()).toBe(false);expect(settled).toHaveBeenCalledTimes(1);
});

it('settles a redirect only through its own native Link completion',()=>{
 const navigation=createNavigationCoordinator();
 const attempt=navigation.begin('/source','/destination','link');
 if(!attempt)throw Error('Expected a navigation attempt');
 navigation.observe(attempt,true);navigation.committed('/login');
 expect(navigation.pending()).toBe(true);
 navigation.observe(attempt,false);
 expect(navigation.pending()).toBe(false);
});

it('does not let an older destination address release a newer navigation',()=>{
 const navigation=createNavigationCoordinator(),settled=vi.fn();
 navigation.subscribe(settled);
 const older=navigation.begin('/source','/first','link');
 if(!older)throw Error('Expected a navigation attempt');
 navigation.observe(older,true);
 const current=navigation.begin('/source','/second','link');
 navigation.committed('/first');navigation.observe(older,false);
 expect(navigation.current()).toBe(current);expect(navigation.pending()).toBe(true);expect(settled).not.toHaveBeenCalled();
 navigation.committed('/second');
 expect(navigation.pending()).toBe(false);expect(settled).toHaveBeenCalledTimes(1);
});

it('requires the current destination query as well as its pathname for address commitment',()=>{
 const navigation=createNavigationCoordinator(),attempt=navigation.begin('/source','/destination?period=current','link');
 navigation.committed('/destination?period=old');
 expect(navigation.current()).toBe(attempt);expect(navigation.pending()).toBe(true);
 navigation.committed('/destination?period=current');expect(navigation.pending()).toBe(false);
});

it('defers history recovery until its actual router address is committed',()=>{
 const navigation=createNavigationCoordinator();
 navigation.begin('/current','/previous','history');navigation.committed('/current');
 expect(navigation.pending()).toBe(true);
 navigation.committed('/previous');expect(navigation.pending()).toBe(false);
});

it('keeps same-address navigation free unless it supersedes an existing destination',()=>{
 const navigation=createNavigationCoordinator();
 expect(navigation.begin('/source','/source','link')).toBeNull();
 navigation.begin('/source','/destination','link');
 expect(navigation.begin('/source','/source','link')).not.toBeNull();
 expect(navigation.current()?.destination).toBe('/source');
});

// Role-change navigation (WebKit actual-role-redirect): a server redirect's replace starts before the provider records
// the redirecting page's commit, and an identity reload must not cancel it mid-flight.

it('keeps a server redirect replace pending through its source commit and settles at its destination',()=>{
 const navigation=createNavigationCoordinator(),settled=vi.fn();navigation.subscribe(settled);
 navigation.begin('/app/payroll-export','/app/reports','link');
 // Next commits Reports, its redirect boundary calls router.replace('/app'), then the provider records the commit.
 navigation.transition('/app/reports','/app');
 navigation.committed('/app/reports');
 expect(navigation.pending()).toBe(true);expect(settled).not.toHaveBeenCalled();
 navigation.committed('/app');
 expect(navigation.pending()).toBe(false);expect(settled).toHaveBeenCalledTimes(1);
});

it('settles a router transition when the router commits a further redirect instead of its destination',()=>{
 const navigation=createNavigationCoordinator();
 navigation.transition('/app/reports','/app/settings');
 navigation.committed('/app');
 expect(navigation.pending()).toBe(false);
});

it('keeps a link attempt when the router reports the same destination, and ignores same-address router replaces',()=>{
 const navigation=createNavigationCoordinator(),link=navigation.begin('/source','/destination','link');
 expect(navigation.transition('/source','/destination')).toBe(link);
 expect(navigation.current()?.kind).toBe('link');
 const idle=createNavigationCoordinator();
 expect(idle.transition('/source','/source')).toBeNull();expect(idle.pending()).toBe(false);
});

it('delivers router transition starts to every registered listener until it stops listening',()=>{
 const heard=vi.fn(),stop=onRouterTransition(heard);
 routerTransitionStarted('/app');stop();routerTransitionStarted('/app/reports');
 expect(heard).toHaveBeenCalledTimes(1);expect(heard).toHaveBeenCalledWith('/app');
});

it('reloads at once for an identity change when no router navigation is in flight',()=>{
 const reload=vi.fn(),identity=createIdentityReload(createNavigationCoordinator(),reload);
 identity.request();identity.request();
 expect(reload).toHaveBeenCalledTimes(1);
});

it('reloads for an identity change only after the in-flight redirect commits, exactly once',()=>{
 const navigation=createNavigationCoordinator(),reload=vi.fn(),identity=createIdentityReload(navigation,reload);
 navigation.begin('/app/payroll-export','/app/reports','link');
 navigation.transition('/app/reports','/app');navigation.committed('/app/reports');
 identity.request();identity.request();
 expect(reload).not.toHaveBeenCalled();
 navigation.committed('/app');
 expect(reload).toHaveBeenCalledTimes(1);
 identity.request();identity.release();
 expect(reload).toHaveBeenCalledTimes(1);
});

it('still reloads exactly once when the new identity remounts the shell at the redirect commit',()=>{
 const navigation=createNavigationCoordinator(),reload=vi.fn(),identity=createIdentityReload(navigation,reload);
 navigation.transition('/app/reports','/app');identity.request();
 // The remount discards the old provider's coordinator, which leaves it idle; the old shell's unmount then releases.
 navigation.discard();expect(reload).toHaveBeenCalledTimes(1);
 identity.release();identity.release();
 expect(reload).toHaveBeenCalledTimes(1);
});

it('does not reload on unmount when no identity change was requested',()=>{
 const reload=vi.fn(),identity=createIdentityReload(createNavigationCoordinator(),reload);
 identity.release();
 expect(reload).not.toHaveBeenCalled();
});

// Review of 89a8b8f9: a router attempt settles only on its own commit (its destination or a genuine further redirect),
// never on a commit belonging to a navigation it superseded; an abandoned navigation never strands an identity reload.

it('keeps a newer router transition pending through a stale commit of the transition it superseded',()=>{
 const navigation=createNavigationCoordinator(),reload=vi.fn(),identity=createIdentityReload(navigation,reload);
 navigation.transition('/source','/old');
 const current=navigation.transition('/source','/new');
 identity.request();navigation.committed('/old');
 expect(navigation.pending()).toBe(true);expect(navigation.current()).toBe(current);expect(reload).not.toHaveBeenCalled();
 navigation.committed('/new');
 expect(navigation.pending()).toBe(false);expect(reload).toHaveBeenCalledTimes(1);
});

it('ignores stale commits from every transition in a superseded chain, including a superseded link',()=>{
 const navigation=createNavigationCoordinator(),settled=vi.fn();navigation.subscribe(settled);
 navigation.begin('/source','/first','link');navigation.transition('/source','/second');navigation.transition('/source','/third');
 navigation.committed('/first');navigation.committed('/second');navigation.committed('/source');
 expect(navigation.pending()).toBe(true);expect(navigation.current()?.destination).toBe('/third');expect(settled).not.toHaveBeenCalled();
 navigation.committed('/third');
 expect(navigation.pending()).toBe(false);expect(settled).toHaveBeenCalledTimes(1);
});

it('treats a superseded destination query as stale and requires the current destination query',()=>{
 const navigation=createNavigationCoordinator();
 navigation.transition('/source','/app/reports?period=week');navigation.transition('/source','/app/reports?period=month');
 navigation.committed('/app/reports?period=week');
 expect(navigation.pending()).toBe(true);expect(navigation.current()?.destination).toBe('/app/reports?period=month');
 navigation.committed('/app/reports?period=month');
 expect(navigation.pending()).toBe(false);
});

it('compares router addresses by their decoded query, as the router formats a committed address',()=>{
 // The transition destination comes from URL.search (%20); the provider's committed address from URLSearchParams (+).
 const stale=createNavigationCoordinator();
 stale.transition('/source','/old?name=Ana%20Rivera');stale.transition('/source','/new');
 stale.committed('/old?name=Ana+Rivera');
 expect(stale.pending()).toBe(true);
 const exact=createNavigationCoordinator(),link=exact.begin('/source','/team?name=Ana%20Rivera','link');
 expect(exact.transition('/source','/team?name=Ana+Rivera')).toBe(link);
 exact.committed('/team?name=Ana+Rivera');expect(exact.pending()).toBe(false);
});

it('still settles a superseding transition on a genuine further redirect',()=>{
 const navigation=createNavigationCoordinator(),reload=vi.fn(),identity=createIdentityReload(navigation,reload);
 navigation.transition('/source','/old');navigation.transition('/source','/new');identity.request();
 navigation.committed('/login');
 expect(navigation.pending()).toBe(false);expect(reload).toHaveBeenCalledTimes(1);
});

it('waits for a navigation that a settled listener starts before reloading for an identity change',()=>{
 const navigation=createNavigationCoordinator(),reload=vi.fn(),identity=createIdentityReload(navigation,reload);
 const stop=navigation.subscribe(()=>{stop();navigation.transition('/new','/next');});
 navigation.transition('/source','/new');identity.request();
 navigation.committed('/new');
 expect(navigation.pending()).toBe(true);expect(reload).not.toHaveBeenCalled();
 navigation.committed('/next');
 expect(reload).toHaveBeenCalledTimes(1);
});

it('reloads exactly once when the pending navigation is discarded, and never again for a later navigation',()=>{
 const navigation=createNavigationCoordinator(),reload=vi.fn(),identity=createIdentityReload(navigation,reload);
 navigation.transition('/source','/new');identity.request();
 navigation.discard();
 expect(navigation.pending()).toBe(false);expect(reload).toHaveBeenCalledTimes(1);
 identity.request();
 expect(reload).toHaveBeenCalledTimes(1);
 // Recovery: the coordinator keeps working for later navigations, and the old request does not fire into them.
 navigation.transition('/source','/later');navigation.committed('/later');
 expect(navigation.pending()).toBe(false);expect(reload).toHaveBeenCalledTimes(1);
});

it('reloads once when a failed Link navigation settles without committing an address',()=>{
 const navigation=createNavigationCoordinator(),reload=vi.fn(),identity=createIdentityReload(navigation,reload);
 navigation.transition('/source','/new');
 const link=navigation.begin('/source','/other','link');
 if(!link)throw Error('Expected a navigation attempt');
 identity.request();navigation.observe(link,true);
 expect(reload).not.toHaveBeenCalled();
 navigation.observe(link,false);
 expect(navigation.pending()).toBe(false);expect(reload).toHaveBeenCalledTimes(1);
});

it('notifies idle listeners once when a navigation finishes or is discarded, and not after they stop listening',()=>{
 const navigation=createNavigationCoordinator(),finished=vi.fn(),discarded=vi.fn(),stopped=vi.fn(),idle=vi.fn();
 navigation.whenIdle(idle);expect(idle).toHaveBeenCalledTimes(1);
 navigation.transition('/source','/a');navigation.whenIdle(finished);navigation.committed('/a');navigation.committed('/b');
 navigation.transition('/a','/b');navigation.whenIdle(discarded);navigation.whenIdle(stopped)();navigation.discard();navigation.discard();
 navigation.transition('/a','/c');navigation.committed('/c');
 expect(finished).toHaveBeenCalledTimes(1);expect(discarded).toHaveBeenCalledTimes(1);expect(stopped).not.toHaveBeenCalled();
});

it('does not reload again when the shell unmounts after the wait already reloaded',()=>{
 const navigation=createNavigationCoordinator(),reload=vi.fn(),identity=createIdentityReload(navigation,reload);
 navigation.transition('/source','/new');identity.request();navigation.committed('/new');
 identity.release();
 expect(reload).toHaveBeenCalledTimes(1);
});
