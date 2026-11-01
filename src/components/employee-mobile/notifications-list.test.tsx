import {createElement,type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
vi.mock('next/link',()=>({default:({children,prefetch:_prefetch,...props}:ComponentProps<'a'>&{prefetch?:boolean})=>createElement('a',props,children)}));
import {EmployeeNotificationList,notificationGroup} from './notifications-list';
import type {EmployeeNotificationItem} from '../../lib/employee-view';
const zone='America/Puerto_Rico',now=new Date('2026-10-31T16:00:00Z');
const item=(id:string,at:string,label='Schedule update',extra:Partial<EmployeeNotificationItem>={}):EmployeeNotificationItem=>({id,label,at,href:'/app/notifications/open?notificationId='+id,reviewState:'read',actionState:'none',...extra});
const items=[item('a','2026-10-30T23:45:00Z','Schedule update',{reviewState:'unread',actionState:'required'}),item('b','2026-10-30T15:20:00Z','Time off update'),item('c','2026-10-28T12:00:00Z','Pay statement update')];
const draw=(tab:'all'|'unread'='all',list=items)=>renderToStaticMarkup(<EmployeeNotificationList items={list} partial={false} tab={tab} onTab={()=>{}} timeZone={zone} now={now}/>);
const plain=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
it('groups by day in the workplace time zone',()=>{
 expect(notificationGroup('2026-10-31T13:00:00Z',zone,now)).toBe('Today');expect(notificationGroup('2026-10-30T23:45:00Z',zone,now)).toBe('Yesterday');expect(notificationGroup('2026-10-28T12:00:00Z',zone,now)).toBe('Earlier');
});
it('board E-Notifications: All / Unread tabs, Yesterday and Earlier cards, an unread dot and plain times',()=>{
 const html=draw(),text=plain(html);
 expect(html).toMatch(/aria-pressed="true"[^>]*>All</);expect(text).toContain('Unread 1');expect(text).not.toContain('Unread (1)');expect(html).toContain('<span class="c-count">1</span>');
 expect(text.indexOf('Yesterday')).toBeLessThan(text.indexOf('Earlier'));expect(text).toContain('7:45 PM');expect(text).toContain('Wed, Oct 28 · 8:00 AM');
 expect(text).not.toMatch(/\bAST\b|\bEDT\b|GMT/);expect(html).toContain('em-notif-dot');expect(text).toContain('Action needed · 7:45 PM');
 // Upscale B7: one dot and no icon tile or pill.
 expect(html.match(/em-notif-dot/g)).toHaveLength(1);expect(html).not.toMatch(/em-notif-icon|c-pill/);
 for(const gone of ['Search this page','Show','Your information only','Review schedule'])expect(text).not.toContain(gone);
 expect(html).toContain('href="/app/notifications/open?notificationId=a"');
});
it('Unread shows only unread notices, and says when there are none',()=>{
 const text=plain(draw('unread'));expect(text).toContain('Schedule update');expect(text).not.toContain('Time off update');
 expect(plain(draw('unread',[items[1]]))).toContain('You’re all caught up');expect(plain(draw('all',[]))).toContain('No current notifications');
});
it('a tapped notice stays pressed with its own spinner while it opens',()=>{
 const html=renderToStaticMarkup(<EmployeeNotificationList items={items} partial={false} tab="all" onTab={()=>{}} timeZone={zone} now={now} opening="a"/>);
 const row=html.slice(html.indexOf('id="message-a"'),html.indexOf('</a>',html.indexOf('id="message-a"')));
 expect(row).toContain('aria-busy="true"');expect(row).toContain('em-notif-row--busy');expect(row).toContain('em-notif-spin');expect(row).not.toContain('em-notif-dot');
 expect(plain(html)).not.toContain('Opening current details');
});
