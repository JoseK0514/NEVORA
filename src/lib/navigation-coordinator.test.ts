import {expect,it,vi} from 'vitest';
import {createNavigationCoordinator} from './navigation-coordinator';

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

it('allows router commitment to an actual redirect without retaining the source latch',()=>{
 const navigation=createNavigationCoordinator();
 navigation.begin('/source','/destination','imperative');navigation.committed('/login');
 expect(navigation.pending()).toBe(false);
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
