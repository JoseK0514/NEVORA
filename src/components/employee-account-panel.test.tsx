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
// Clean Manager (v3, QA): Owners and Managers (onMarkRead) get the Inbox's list: no "Your alerts" strip or visible count line,
// Mark read in each unread row's trailing slot, and Refresh in the page foot; the filters and the foot stay in every state.
it('gives Owners and Managers kit rows with Mark read in the row and Refresh in the page foot',()=>{
 const snapshot={...inbox,items:[{...inbox.items[0],reviewState:'unread' as const,actionState:'required' as const}]};
 const html=renderToStaticMarkup(<EmployeeAccountView kind="notifications" state={{snapshot,paused:false,refreshing:false}} onRetry={()=>{}} onMarkRead={async()=>{}}/>);
 expect(html).not.toContain('Your alerts');
 expect(html).toContain('<p class="nv-sr" role="status" aria-live="polite">1 notification in this view</p>');
 expect(html).toContain('<span class="nv-row__title">Time off update</span>');
 expect(html).toContain('Unread\u00a0·');
 expect(html).not.toContain('Action required');expect(html).not.toContain('Review your time off request');
 expect(html).toMatch(/<\/a><button type="button" class="[^"]*cm-notifications-mark" aria-label="Mark Time off update read">Mark read<\/button><\/li>/);
 expect(html).toMatch(/<p class="cm-page-foot">.*Refresh.*<\/p>/);
});
it('keeps the manager filters and foot when a read fails or the session ends',()=>{
 const failed=renderToStaticMarkup(<EmployeeAccountView kind="notifications" state={{snapshot:{state:'unavailable',reason:'read_failed'},paused:false,refreshing:false}} onRetry={()=>{}} onMarkRead={async()=>{}}/>);
 expect(failed).toContain('Filter notifications');expect(failed).toContain('Couldn’t load notifications');expect(failed).toMatch(/<p class="cm-page-foot">.*Try again.*<\/p>/);
 const denied=renderToStaticMarkup(<EmployeeAccountView kind="notifications" state={{snapshot:{state:'unavailable',reason:'access_denied'},paused:false,refreshing:false}} onRetry={()=>{}} onMarkRead={async()=>{}}/>);
 expect(denied).toContain('Filter notifications');expect(denied).toMatch(/<a class="nv-band-control cm-refresh" href="\/login">Sign in<\/a>/);expect(denied).not.toContain('Refresh');
});
