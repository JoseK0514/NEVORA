import * as rstestOriginal0 from "react" with { rstest: 'importActual' };
import type {ReactElement,ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {beforeEach,expect,it,rs} from '@rstest/core';
import type {EmployeeNotificationItem} from '../lib/employee-view';

// A minimal hook host: state persists between renders so a click can be followed by a fresh render.
const host=rs.hoisted(()=>({cursor:0,slots:[] as {value:unknown}[]}));
rs.mock('react',()=>({...rstestOriginal0,
 useState:(initial:unknown)=>{const i=host.cursor++;const slot=host.slots[i]??(host.slots[i]={value:typeof initial==='function'?(initial as ()=>unknown)():initial});return [slot.value,(next:unknown)=>{slot.value=typeof next==='function'?(next as (old:unknown)=>unknown)(slot.value):next;}];},
 // Signed-in Spanish: usePortalLang() reads a context; outside a provider it is the default (English).
 useContext:(context:{_currentValue:unknown})=>context._currentValue,
 useRef:(initial:unknown)=>{const i=host.cursor++;return (host.slots[i]??(host.slots[i]={value:{current:initial}})).value;},
}));
import {NotificationInbox} from './notification-inbox';

const summary=(id:string,at:string,reviewState:'read'|'unread'):EmployeeNotificationItem=>({id,label:'Operations need review',at,href:'/app/notifications/open?notificationId='+id,reviewState,actionState:'available'});
const items=[summary('a','2026-11-15T14:00:00Z','unread'),summary('b','2026-11-15T13:00:00Z','read'),summary('c','2026-11-15T12:00:00Z','unread')];
const onMarkRead=rs.fn(async()=>{});
const render=()=>{host.cursor=0;return NotificationInbox({state:{paused:false,refreshing:false,snapshot:{state:'ready',kind:'notifications',coverage:'complete',items,observedAt:'2026-11-15T14:05:00Z',validForMs:60000} as never},onRetry:()=>{},onMarkRead});};
function nodes(v:ReactNode):ReactElement<Record<string,unknown>>[]{if(Array.isArray(v))return v.flatMap(nodes);if(!v||typeof v!=='object'||!('props'in v))return [];const n=v as ReactElement<Record<string,unknown>>;return [n,...nodes(n.props.children as ReactNode)];}
const fold=()=>nodes(render()).find(n=>n.type==='button'&&String(n.props.className).includes('q-notif-fold'))!;

beforeEach(()=>{host.cursor=0;host.slots=[];onMarkRead.mockClear();});

it('opens a fold in place to list every notification, and marks none read by opening it (Jose, Nov 15, 2026, item 8)',()=>{
 const closed=renderToStaticMarkup(render());
 // Final polish (Nov 20, 2026): the count and the latest time are the kit's facts line (the dot is the line's own).
 expect(closed).toMatch(/3[ \u00a0]notifications<\/span><span class="b-segs__i"><span class="b-sr"> · <\/span>/);
 expect(fold().props['aria-expanded']).toBe(false);
 expect(fold().props['aria-label']).toContain('3 notifications, 2 unread');
 expect(closed).not.toContain('q-notif-held');
 (fold().props.onClick as ()=>void)();
 expect(onMarkRead).not.toHaveBeenCalled();
 const open=renderToStaticMarkup(render());
 expect(fold().props['aria-expanded']).toBe(true);
 // Each notification is its own link to its own open route, which marks only that one.
 for(const id of ['a','b','c'])expect(open).toContain(`href="/app/notifications/open?notificationId=${id}"`);
 expect(open.match(/class="q-list q-notif-held"/g)).toHaveLength(1);
 // Rows inside the group keep an empty icon slot (text under the group's) and don't repeat its title.
 const held=open.slice(open.indexOf('q-notif-held'));
 expect(held.match(/q-notif-spacer/g)).toHaveLength(3);
 expect(held).not.toContain('<b>Things to do are waiting for you</b>');
 // Opening one held notification marks that one read, not the others.
 const link=nodes(render()).find(n=>n.props.href==='/app/notifications/open?notificationId=c')!;
 (link.props.onClick as ()=>void)();
 expect(onMarkRead).toHaveBeenCalledOnce();
 expect(onMarkRead).toHaveBeenCalledWith('c');
 // A read one marks nothing.
 const read=nodes(render()).find(n=>n.props.href==='/app/notifications/open?notificationId=b')!;
 (read.props.onClick as ()=>void)();
 expect(onMarkRead).toHaveBeenCalledOnce();
});

it('reads days and times in the workplace zone the snapshot carries (backend, Nov 15, 2026)',()=>{
 host.cursor=0;host.slots=[];
 const zoned=()=>{host.cursor=0;return NotificationInbox({state:{paused:false,refreshing:false,snapshot:{state:'ready',kind:'notifications',timeZone:'Pacific/Kiritimati',coverage:'complete',items:[summary('z','2026-11-15T14:00:00Z','unread')],observedAt:'2026-11-15T14:05:00Z',validForMs:60000} as never},onRetry:()=>{},onMarkRead});};
 // 14:00 UTC is 4:00 AM the next day at UTC+14.
 expect(renderToStaticMarkup(zoned())).toContain('Monday, November 16 at 4:00');
});

it('says a manager summary\'s count was what it gathered when sent, with its scope (Phase 8, a.md #29, b.md #25)',()=>{
 const one=(id:string,count:number,at:string):EmployeeNotificationItem=>({...summary(id,at,'unread'),eventType:'MANAGER_REVIEW',count} as EmployeeNotificationItem);
 host.cursor=0;
 const html=renderToStaticMarkup(NotificationInbox({state:{paused:false,refreshing:false,snapshot:{state:'ready',kind:'notifications',coverage:'complete',items:[one('s1',22,'2026-11-15T14:00:00Z')],observedAt:'2026-11-15T14:05:00Z',validForMs:60000} as never},onRetry:()=>{},onMarkRead}));
 // Not "22 waiting" beside a badge of 11: the count is the summary's, said in the past, and the line names what it gathered.
 expect(html).toContain('<b>22 items were waiting</b>');
 // Final regression review #2: the scope and the time are one facts line (BSegs), the dot belongs to the time.
 expect(html).toContain('<span class="b-segs__i">Open shifts, requests or missing availability</span><span class="b-segs__i"><span class="b-sr"> · </span><time');
 expect(html).not.toContain('22 waiting');
 expect(html).not.toContain('<b>Things to do are waiting for you</b>');
});
