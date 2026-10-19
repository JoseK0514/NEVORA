import {createElement,type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
import {EmployeeAccountView} from './employee-account-panel';
vi.mock('next/link',()=>({default:({children,...props}:ComponentProps<'a'>)=>createElement('a',props,children)}));
const inbox={state:'ready' as const,kind:'notifications' as const,observedAt:'2026-10-08T12:00:00Z',validForMs:45000,coverage:'complete' as const,items:[{id:'own',label:'Time off update',at:'2026-10-08T12:00:00Z',href:'/app/notifications/open?notificationId=own'}]};
it('hides all new private content while paused, including previously ready snapshots',()=>{
 const html=renderToStaticMarkup(<EmployeeAccountView kind="notifications" state={{snapshot:inbox,paused:true,refreshing:false}} onRetry={()=>{}}/>);
 expect(html).not.toContain('Time off update');expect(html).not.toContain('notificationId=own');expect(html).toContain('Updates paused');
});
it('partial and unavailable are never verified empty or Important Actions all-clear',()=>{
 for(const snapshot of [{...inbox,coverage:'partial' as const,items:[]},{state:'unavailable' as const,reason:'read_failed' as const}]){
  const html=renderToStaticMarkup(<EmployeeAccountView kind="notifications" state={{snapshot,paused:false,refreshing:false}} onRetry={()=>{}}/>);
  expect(html).not.toContain('No notifications in this current view');expect(html).not.toContain("You&#x27;re all set");expect(html).toContain('Try again');
 }
});
it('renders safe-open links without read/ack or consent actions',()=>{
 const html=renderToStaticMarkup(<EmployeeAccountView kind="notifications" state={{snapshot:inbox,paused:false,refreshing:false}} onRetry={()=>{}}/>);
 expect(html).toContain('/app/notifications/open?notificationId=own');expect(html).not.toContain('Mark read');expect(html).not.toContain('Acknowledge');
});
it('shows required action independently from own read state and completed acknowledgement',()=>{
 const snapshot={...inbox,items:[{...inbox.items[0],reviewState:'read' as const,actionState:'required' as const},{...inbox.items[0],id:'done',href:'/app/notifications/open?notificationId=done',reviewState:'confirmed' as const,actionState:'complete' as const}]};
 const html=renderToStaticMarkup(<EmployeeAccountView kind="notifications" state={{snapshot,paused:false,refreshing:false}} onRetry={()=>{}}/>);
 expect(html).toContain('Read');expect(html).toContain('Action required');expect(html).toContain('Confirmed');expect(html).toContain('Action complete');expect(html).not.toContain('Mark read');
});
