import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {EmployeeDashboard} from './employee-dashboard';
const props={firstName:'Avery',weekStart:'2030-10-07',weekLabel:'Oct 7 – 13',currentDate:'2030-10-07',currentTime:'09:00',publishedShifts:[],scheduledHours:0,estimatedEarnings:0,todayShiftLabel:'FAKE SHIFT',todayClockStatus:'FAKE CLOCK'};
it('initial Home delegates actual status to the protected reader instead of trusting a supplied clock label',()=>{const html=renderToStaticMarkup(<EmployeeDashboard {...props}/>);expect(html).toContain('Loading recorded time');expect(html).not.toContain('FAKE CLOCK');});
it('Home cannot display an invented 8-to-4 schedule when no shift is published',()=>{const html=renderToStaticMarkup(<EmployeeDashboard {...props}/>);expect(html).toContain('No published shift today');expect(html).not.toContain('FAKE SHIFT');});
it('derives the Today schedule label from the actual published shift inputs',()=>{const html=renderToStaticMarkup(<EmployeeDashboard {...props} publishedShifts={[{id:'s',date:'2030-10-07',startTime:'09:00',endTime:'13:30',isDesignatedLead:false}]}/>);expect(html).toContain('9:00 AM');expect(html).toContain('1:30 PM');expect(html).not.toContain('FAKE SHIFT');});
it('withholds a nonzero reference-rate amount when employee compensation is unavailable',()=>{
 const html=renderToStaticMarkup(<EmployeeDashboard {...props} {...{scheduledHours:8,estimatedEarnings:128}}/>);
 expect(html).toContain('Unavailable');expect(html).toContain('Pay rates are not configured');expect(html).not.toContain('$128.00');
 expect(html).toContain('8.0');
});
