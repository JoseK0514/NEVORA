import {expect,it,rs} from '@rstest/core';
import {intentProps} from './navigation-link';

// Gap closure (Nov 23, 2026): the tab bar and sidebar prefetch on intent, so an access-frame renewal (which clears the
// router cache) no longer fetches every destination again while the page sits open.
it('turns off prefetch on sight and prefetches on pointer enter, focus and touch start, keeping the caller handlers',()=>{
 const prefetch=rs.fn(),own={onPointerEnter:rs.fn(),onFocus:rs.fn(),onTouchStart:rs.fn()};
 const props=intentProps(prefetch,'/app/schedule','full',own);
 expect(props.prefetch).toBe(false);
 expect(prefetch).not.toHaveBeenCalled();
 const event={} as never;
 props.onTouchStart(event);props.onPointerEnter(event);props.onFocus(event);
 expect(prefetch).toHaveBeenCalledTimes(3);
 expect(prefetch).toHaveBeenCalledWith('/app/schedule',{kind:'full'});
 expect(own.onTouchStart).toHaveBeenCalledWith(event);
 expect(own.onPointerEnter).toHaveBeenCalledWith(event);
 expect(own.onFocus).toHaveBeenCalledWith(event);
});
it('asks for the loading shell only when the intent is auto',()=>{
 const prefetch=rs.fn();
 intentProps(prefetch,'/app/payroll','auto',{}).onFocus({} as never);
 expect(prefetch).toHaveBeenCalledWith('/app/payroll',{kind:'auto'});
});
