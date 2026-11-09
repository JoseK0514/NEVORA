import {createElement,type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
import {ClockMonitorCard} from './manager-clock-monitor';
import type {ClockMonitor} from '../lib/time-clock';
vi.mock('next/link',()=>({default:({href,children,...props}:ComponentProps<'a'>)=>createElement('a',{href,...props},children)}));
const ready:ClockMonitor={state:'ready',observedAt:'2030-10-07T14:00:00Z',timeZone:'America/Puerto_Rico',validForMs:45000,employees:[
 {timeEntryId:'a',employeeId:'a',employeeName:'Avery Cruz',locationId:'loc',locationName:'Main Office',deviceId:'d',clockInAt:'2030-10-07T12:00:00Z',state:'ON_FLOOR',elapsedMinutes:120,breakElapsedMinutes:null,positionName:'Recorded Position',scheduleMatch:'MATCHED'},
 {timeEntryId:'b',employeeId:'b',employeeName:'Blair Lee',locationId:'loc2',locationName:'West Office',deviceId:'d2',clockInAt:'2030-10-07T13:00:00Z',breakStartAt:'2030-10-07T13:50:00Z',state:'ON_BREAK',elapsedMinutes:60,breakElapsedMinutes:10,positionName:null,scheduleMatch:'UNMATCHED'},
]};
const html=(monitor:ClockMonitor|null,refreshing=false,paused=false)=>renderToStaticMarkup(<ClockMonitorCard state={{monitor,refreshing,paused}} onRefresh={()=>{}}/>);
it('loading is neither zero activity nor schedule-derived presence',()=>{const s=html(null,true);expect(s).toContain('Loading live activity');expect(s).not.toMatch(/No one is clocked in|>0<|scheduled right now/);});
it('unavailable has no false zero, people or successful empty state',()=>{const s=html({state:'unavailable',reason:'read_failed'});expect(s).toContain('Live activity unavailable');expect(s).not.toMatch(/No one is clocked in|>0<|Avery|Blair/);});
it('a successful empty read explicitly shows no recorded open punches',()=>{if(ready.state!=='ready')throw Error();const s=html({...ready,employees:[]});expect(s).toContain('No one is clocked in right now');expect(s).not.toContain('>0<');expect(s).not.toContain('published schedule');});
it('separates on floor from on break and shows total without truncation',()=>{const s=html(ready);expect(s).toContain('Clocked in now');expect(s).toContain('Avery Cruz');expect(s).toContain('Blair Lee');expect(s).toContain('On floor');expect(s).toContain('On break');expect(s).toContain('</strong> on floor');expect(s).toContain('>2<');expect(s).toContain('10m on break');expect(s).toContain('2h 0m since clock-in');});
it('shows actual locations and recorded positions without inventing roles or payroll',()=>{const s=html(ready);expect(s).toContain('Main Office');expect(s).toContain('West Office');expect(s).toContain('Recorded Position');expect(s).not.toMatch(/Barista|Shift lead|paid hours|earned|worked hours/i);});
it('paused and denied states reveal no people',()=>{expect(html(null,false,true)).toContain('Live updates paused');const s=html({state:'unavailable',reason:'access_denied'});expect(s).toContain('Sign in again');expect(s).not.toMatch(/Avery|Blair|>0</);});
it('refresh feedback keeps an accessible stable button and observation timestamp',()=>{const s=html(ready,true);expect(s).toContain('Refreshing');expect(s).toContain('disabled');expect(s).toContain('dateTime="2030-10-07T14:00:00Z"');});
