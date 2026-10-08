import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {EmployeeDashboard} from './employee-dashboard';
const props={firstName:'Avery',weekStart:'2030-10-07',weekLabel:'Oct 7 – 13',currentDate:'2030-10-07',currentTime:'09:00',publishedShifts:[],scheduledHours:0,estimatedEarnings:0,todayShiftLabel:'FAKE SHIFT',todayClockStatus:'FAKE CLOCK',scheduleState:'published' as const};
it('initial Home delegates actual status to the protected reader instead of trusting a supplied clock label',()=>{const html=renderToStaticMarkup(<EmployeeDashboard {...props}/>);expect(html).toContain('Loading recorded time');expect(html).not.toContain('FAKE CLOCK');});
it('Home displays a confirmed no-assignment day only with published coverage',()=>{const html=renderToStaticMarkup(<EmployeeDashboard {...props}/>);expect(html).toContain('Off — no assignment');expect(html).not.toContain('FAKE SHIFT');});
it('derives the Today schedule label from the actual published shift inputs',()=>{const html=renderToStaticMarkup(<EmployeeDashboard {...props} publishedShifts={[{id:'s',date:'2030-10-07',startTime:'09:00',endTime:'13:30',isDesignatedLead:false}]}/>);expect(html).toContain('9:00 AM');expect(html).toContain('1:30 PM');expect(html).not.toContain('FAKE SHIFT');});
it('withholds a nonzero reference-rate amount when employee compensation is unavailable',()=>{
 const html=renderToStaticMarkup(<EmployeeDashboard {...props} {...{scheduledHours:8,estimatedEarnings:128}}/>);
 expect(html).toContain('Unavailable');expect(html).toContain('Pay rates are not configured');expect(html).not.toContain('$128.00');
 expect(html).toContain('8.0');
});
it.each(['unpublished','unavailable'] as const)('UX-03 %s does not claim time off or an all-clear',scheduleState=>{
 const html=renderToStaticMarkup(<EmployeeDashboard {...props} scheduleState={scheduleState}/>);
 expect(html).not.toContain('Off —');expect(html).not.toContain('caught up');
 expect(html).toContain(scheduleState==='unpublished'?'Schedule not published yet':'Schedule unavailable');
});
it('UX-03 unavailable ignores stale assignments and hour totals',()=>{
 const html=renderToStaticMarkup(<EmployeeDashboard {...props} scheduleState="unavailable" scheduledHours={8} publishedShifts={[{id:'s',date:props.currentDate,startTime:'09:00',endTime:'13:30',isDesignatedLead:false,locationName:'STALE LOCATION'}]}/>);
 expect(html).not.toContain('STALE LOCATION');expect(html).not.toContain('8.0');
});
