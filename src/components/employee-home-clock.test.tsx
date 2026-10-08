import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {EmployeeDashboard} from './employee-dashboard';
import {EmployeeHomeView,type HomeLifetime} from './employee-home-actions';
import type {HomeSnapshot,PublishedAssignment} from '../lib/employee-home/types';
const authority='a'.repeat(64),timeAuthority='b'.repeat(64),at='2030-10-07T12:00:00.000Z';
const assignment:PublishedAssignment={shiftId:'own',assignmentEpisodeId:'episode',termsRevision:1,weekStart:'2030-10-07',date:'2030-10-08',startAt:'2030-10-08T12:00:00Z',endAt:'2030-10-08T20:00:00Z',locationId:'loc-1',locationLabel:'Main Office',positionLabel:null,designatedLead:false,publicationRevisionId:'r1'};
function view(extra:Partial<HomeSnapshot>={}){
 const snapshot:HomeSnapshot={observedAt:at,authority,validForMs:45000,timeZone:'America/Puerto_Rico',sources:Object.fromEntries(['schedule','acknowledgements','exchanges','timeOff','ownTime','communications'].map(k=>[k,{state:k==='communications'?'partial':'complete',observedAt:at,version:'v1',reason:k==='communications'?'integration_pending':null}])) as HomeSnapshot['sources'],publicationState:'complete',nextShift:assignment,currentShift:null,attention:[],...extra};
 const state={snapshot:{state:'ready',observedAt:at,validForMs:45000,home:{state:'partial',snapshot,allSet:false}} as HomeLifetime,refreshing:false,paused:false};
 return renderToStaticMarkup(<EmployeeHomeView state={state} timeAuthority={timeAuthority} onRetry={()=>{}}/>);
}
it('initial Home contains no all-clear or private assignments and preserves recorded-time loading guidance',()=>{const html=renderToStaticMarkup(<EmployeeDashboard authority={authority} timeAuthority={timeAuthority}/>);expect(html).toContain('Loading Home');expect(html).toContain('Loading recorded time');expect(html).not.toContain('all set');expect(html).not.toContain('Main Office');});
it('Next Shift leads and can cross week boundaries without implying clocked in',()=>{const html=view();expect(html.indexOf('Next Shift')).toBeLessThan(html.indexOf('Needs your attention'));expect(html).toContain('Main Office');expect(html).toContain('day=2030-10-08');expect(html).toContain('Loading recorded time');expect(html).not.toContain('Clocked In');});
it('scheduled now remains distinct from own clock status and shows both dates overnight',()=>{const html=view({currentShift:{...assignment,date:'2030-10-06',startAt:'2030-10-07T02:00:00Z',endAt:'2030-10-07T14:00:00Z'}});expect(html).toContain('Scheduled now');expect(html).toContain('Oct 6');expect(html).toContain('Oct 7');expect(html).toContain('clock status is shown separately');expect(html).not.toContain('Clocked In');});
it('proven empty uses no upcoming published shift and does not imply perpetual time off',()=>{const html=view({nextShift:null});expect(html).toContain('No upcoming published shift');expect(html).not.toContain('all set');expect(html).not.toContain('caught up');});
it('partial publication coexists with known future assignment and partial communications',()=>{const html=view({publicationState:'partial'});expect(html).toContain('Main Office');expect(html).toContain('Schedule not published yet');expect(html).toContain('Home is partial');expect(html).toContain('Communications are not included yet');});
it('overflow is disclosed, canonical review links are used, and compact consent/read controls are absent',()=>{const html=view({attention:Array.from({length:7},(_,i)=>({ref:{kind:'TIME_OFF',id:'r'+i,version:'v1'},label:'Time off approved',href:'/app/requests?tab=my&requestId=r'+i,required:false,actionable:false,deadlineAt:null,changedAt:at}))});expect(html).toContain('Show all 7 items (2 more)');expect(html).not.toContain('Mark read');expect(html).not.toContain('Confirm schedule');expect(html).not.toContain('$128');});
it('an old ready snapshot is synchronously hidden when the rendered authority changes',()=>{
 const oldSnapshot:HomeSnapshot={observedAt:at,authority,validForMs:45000,timeZone:'America/Puerto_Rico',sources:Object.fromEntries(['schedule','acknowledgements','exchanges','timeOff','ownTime','communications'].map(k=>[k,{state:'complete',observedAt:at,version:'v1',reason:null}])) as HomeSnapshot['sources'],publicationState:'complete',nextShift:assignment,currentShift:null,attention:[]};
 // The stale private state must be rejected before a replacement effect can run.
 const html=renderToStaticMarkup(<EmployeeHomeView {...{authority:'c'.repeat(64)}} state={{snapshot:{state:'ready',observedAt:at,validForMs:45000,home:{state:'partial',snapshot:oldSnapshot,allSet:false}},refreshing:false,paused:false}} timeAuthority={timeAuthority} onRetry={()=>{}}/>);
 expect(html).not.toContain('Main Office');expect(html).not.toContain('2030-10-08');
});
