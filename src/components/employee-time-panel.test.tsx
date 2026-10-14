import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {EmployeeTimeView} from './employee-time-panel';
import {projectEmployeeTime} from '../lib/employee-time';
import type {EmployeeTimePanelState} from '../lib/employee-time-client';
const raw=(extra:Record<string,unknown>={})=>({id:'entry',employee_id:'self',location_name:'Actual Office',clock_in_at:'2030-10-07T12:00:00Z',clock_out_at:null,status:'CLOCKED_IN',history_valid:true,breaks:[],...extra});
const ready=(entries:unknown[]=[],recentCount=0)=>projectEmployeeTime({observedAt:'2030-10-07T16:00:00Z',expiresAt:'2030-10-08T16:00:00Z',timeZone:'America/Puerto_Rico',recentCount,entries},'self');
const render=(time:EmployeeTimePanelState['time'],compact=false,paused=false)=>renderToStaticMarkup(<EmployeeTimeView state={{time,paused,refreshing:false}} compact={compact} onRefresh={()=>{}}/>);
const renderCorporate=(time:EmployeeTimePanelState['time'],paused=false)=>renderToStaticMarkup(<EmployeeTimeView state={{time,paused,refreshing:false}} corporate onRefresh={()=>{}}/>);
it('keeps exact freshness and timezone available in the employee record disclosure',()=>{
 const html=renderCorporate(ready());
 const disclosure=html.split('<details class="employee-corporate-record-details">')[1]?.split('</details>')[0];
 expect(disclosure).toContain('Record details');
 expect(disclosure).toContain('dateTime="2030-10-07T16:00:00Z"');
 expect(disclosure).toContain('12:00:00 PM');
 expect(disclosure).toContain('America/Puerto_Rico');
 expect(disclosure).toContain('Updates every 30s while active.');
 expect(html.match(/aria-label="Refresh recorded time"/g)).toHaveLength(1);
});
it('keeps Refresh before the following record disclosure in native keyboard order',()=>{
 const html=renderCorporate(ready());
 expect(html.indexOf('aria-label="Refresh recorded time"')).toBeLessThan(html.indexOf('Record details'));
});
it('removes the corporate record disclosure and all earlier private data on pause or denial',()=>{
 for(const html of [renderCorporate(ready([raw()]),true),renderCorporate({state:'unavailable',reason:'access_denied'})]){
  expect(html).not.toContain('Record details');
  expect(html).not.toContain('2030-10-07T16:00:00Z');
  expect(html).not.toContain('Actual Office');
  expect(html).not.toContain('4h 0m');
 }
});
it('never displays Off Clock or healthy zero metrics before a successful read',()=>{const html=render(null);expect(html).toContain('Loading recorded time');expect(html).not.toMatch(/Off Clock|0m|No recorded punches/);});
it('distinguishes empty actual time from disconnected timekeeping',()=>{const html=render(ready());expect(html).toContain('Off Clock');expect(html).toContain('No recorded punches today');expect(html).toContain('No earlier entries');expect(html).not.toContain('isn&#x27;t connected');});
it('a failed read clears current state, counters and history',()=>{const html=render({state:'unavailable',reason:'read_failed'});expect(html).toContain('Recorded time unavailable');expect(html).not.toMatch(/Off Clock|0m|Actual Office/);});
it('a paused page exposes none of its earlier private history',()=>{const html=render(ready([raw()]),false,true);expect(html).toContain('Updates paused');expect(html).not.toContain('Actual Office');});
it('offers reauthentication rather than stale activity after denial',()=>{const html=render({state:'unavailable',reason:'access_denied'});expect(html).toContain('Sign in again');expect(html).toContain('href="/login"');});
it('shows actual status, location, recorded durations and non-payroll clarification',()=>{const html=render(ready([raw()]));expect(html).toContain('Clocked In');expect(html).toContain('Actual Office');expect(html).toContain('4h 0m');expect(html).toContain('Not payroll hours');expect(html).toContain('Break time');});
it('on-break state includes the original break name and open end',()=>{const html=render(ready([raw({status:'ON_BREAK',breaks:[{id:'b',break_start_at:'2030-10-07T15:45:00Z',break_end_at:null,break_type_id:'t',break_type_snapshot:{id:'t',version:1,name:'Meal break',category:'MEAL',targetMinutes:30}}]})]));expect(html).toContain('On Break');expect(html).toContain('Meal break');expect(html).toContain('In progress');});
it('compact Home mode retains navigation but does not duplicate the full history view',()=>{const html=render(ready([raw()]),true);expect(html).toContain('href="/app/my-time"');expect(html).toContain('Clocked In');expect(html).not.toContain('Recent Entries');});
it('labels the earlier history limit and its actual available total',()=>{const rows=Array.from({length:20},(_,n)=>raw({id:'old'+n,clock_in_at:`2030-09-${String(n+1).padStart(2,'0')}T12:00Z`,clock_out_at:`2030-09-${String(n+1).padStart(2,'0')}T16:00Z`,status:'CLOCKED_OUT'}));const html=render(ready(rows,25));expect(html).toContain('20 of 25');expect(html).toContain('most recent');});
it('offers a correction request for completed recorded entries but never edits the live Clocker entry',()=>{const closed=render(ready([raw({clock_out_at:'2030-10-07T15:00:00Z',status:'CLOCKED_OUT'})]));expect(closed).toContain('Request correction');const open=render(ready([raw()]));expect(open).not.toContain('Request correction');expect(open).not.toMatch(/Confirm Clock|Save Correction|Pay stub/);});
it('escapes stored labels rather than rendering them as markup',()=>{const html=render(ready([raw({location_name:'<script>alert(1)</script>'})]));expect(html).not.toContain('<script>');expect(html).toContain('&lt;script&gt;');});

it('groups each clock value with its meridiem so narrow ranges can wrap between times',()=>{
 const html=renderCorporate(ready([raw({clock_out_at:'2030-10-07T15:00:00Z',status:'CLOCKED_OUT'})]));
 expect(html).toContain('<span class="employee-time-entry-clock">8:00 AM</span>');
 expect(html).toContain('<span class="employee-time-entry-clock">11:00 AM</span>');
 expect(html).toContain('Completed');
});
it('keeps an open range end together without dropping the original start time',()=>{
 const html=renderCorporate(ready([raw()]));
 expect(html).toContain('<span class="employee-time-entry-clock">8:00 AM</span>');
 expect(html).toContain('<span class="employee-time-entry-clock">In progress</span>');
});

it('makes an overnight entry end date explicit in the business timezone while retaining exact punches',()=>{
 const html=render(ready([raw({clock_in_at:'2030-10-05T23:30:12Z',clock_out_at:'2030-10-06T05:00:34Z',status:'CLOCKED_OUT'})],1));
 const text=html.replace(/<[^>]+>/g,'');
 expect(html).toContain('7:30 PM');
 expect(text).toContain('Oct 6, 1:00 AM');
 expect(html).toContain('dateTime="2030-10-05T23:30:12Z"');
 expect(html).toContain('dateTime="2030-10-06T05:00:34Z"');
 expect(html).toContain('7:30:12 PM');
 expect(html).toContain('1:00:34 AM');
});
