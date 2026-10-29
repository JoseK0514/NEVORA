import {beforeEach,describe,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
const fixture=vi.hoisted(()=>({mobile:true,state:{snapshot:null as null|{state:'unavailable';reason:string},paused:false,refreshing:false},origin:null as null|{source:'/app/notifications'|'/app/updates';id:string;target:string}}));
vi.mock('next/navigation',()=>({useRouter:()=>({push:()=>{}})}));
vi.mock('./use-mobile',()=>({useEmployeeMobile:()=>fixture.mobile}));
vi.mock('./use-messages',()=>({useMessages:()=>({state:fixture.state,read:null,allowed:()=>false,current:()=>null,refresh:()=>{}})}));
vi.mock('./message-session',()=>({useMessageSession:()=>({origin:fixture.origin,lists:{notifications:{search:'',filter:'all',cursors:[]},updates:{search:'',filter:'all',cursors:[]}},state:{pending:false,hasUnknown:false},operationHref:null,setOrigin:()=>{}})}));
import {ResponsiveEmployeeMessages} from './messages';
import {HoursFrame} from './hours-frame';
import {PlanningFrame} from './planning-frame';
import type {MessageView} from '@/lib/employee-messages';
const plain=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
const message=(view:MessageView,id?:string)=>renderToStaticMarkup(<ResponsiveEmployeeMessages authority="fictional-view" view={view} id={id}><span>Desktop presentation</span></ResponsiveEmployeeMessages>);
beforeEach(()=>{fixture.mobile=true;fixture.state={snapshot:null,paused:false,refreshing:false};fixture.origin=null;});
describe('Employee message read states and contextual return',()=>{
 it('names Notifications while checking and offers a correctly labelled disabled action',()=>{
  fixture.state.refreshing=true;const html=message('notifications'),text=plain(html);
  expect(text).toContain('Checking your current notifications…');
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Checking…<\/button>/);
  expect(text).not.toContain('Try again');expect(text).not.toContain('unsent draft');
 });
 it('uses the right read-failure noun without promising an unentered draft',()=>{
  for(const [view,noun]of [['notifications','notifications'],['updates','updates']] as const){const html=message(view);expect(plain(html)).toContain(`Your ${noun} couldn’t be checked.`);expect(plain(html)).toContain('Try again');expect(plain(html)).not.toContain('unsent draft');}
 });
 it('keeps Notifications pause and denied states separate from generic failure',()=>{
  fixture.state.paused=true;expect(plain(message('notifications'))).toContain('Your notifications are paused.');
  fixture.state.paused=false;fixture.state.snapshot={state:'unavailable',reason:'access_denied'};const html=message('notifications');expect(plain(html)).toContain('Your access changed.');expect(html).toContain('href="/login"');expect(plain(html)).not.toContain('Try again');
 });
 it('returns Updates to More while retaining Notifications Home and detail origin anchors',()=>{
  const updates=message('updates');expect(updates).toMatch(/class="em-request-back" href="\/app\/more"/);expect(plain(updates)).toContain('More');
  expect(message('notifications')).toMatch(/class="em-request-back" href="\/app"/);
  expect(message('compose')).toMatch(/class="em-request-back" href="\/app\/updates"/);
  fixture.origin={source:'/app/notifications',id:'own-notice',target:'/app/updates/own-update'};
  expect(message('detail','own-update')).toContain('href="/app/notifications#message-own-notice"');
 });
 it('uses view-specific loading copy during responsive hydration',()=>{
  fixture.mobile=false;expect(plain(message('notifications'))).toContain('Loading your notifications…');expect(plain(message('updates'))).toContain('Loading your updates…');expect(plain(message('notifications'))).toContain('Desktop presentation');
 });
});
describe('Employee read failure notices without draft evidence',()=>{
 it('keeps Hours failure truthful while retaining time navigation and retry',()=>{
  const html=renderToStaticMarkup(<HoursFrame title="Hours" sub="Your time" back={null} backLabel={null} contextKey="records" view="records" state={{snapshot:null,refreshing:false,paused:false}} ready={false} refresh={()=>{}}>Private records</HoursFrame>);
  expect(plain(html)).toContain('Your records couldn’t be checked.');expect(plain(html)).toContain('Try again');expect(plain(html)).not.toContain('unsent entries');expect(plain(html)).not.toContain('Private records');expect(html).toContain('aria-label="Your time"');
 });
 it('keeps Planning failure truthful without exposing an unauthorized form',()=>{
  const html=renderToStaticMarkup(<PlanningFrame title="Time off" sub="Your requests" back="/app/requests" selection="time-off" state={{snapshot:null,refreshing:false,paused:false}} ready={false} refresh={()=>{}}>Private request form</PlanningFrame>);
  expect(plain(html)).toContain('Your planning couldn’t be checked.');expect(plain(html)).toContain('Try again');expect(plain(html)).not.toContain('unsent entries');expect(plain(html)).not.toContain('Private request form');expect(html).toContain('href="/app/requests"');
 });
});
