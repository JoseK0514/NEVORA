import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { SchedulePublicationChange } from './schedule-publication-change';
it('is absent without actual changes and collapsed with readable before/after',()=>{
 expect(renderToStaticMarkup(<SchedulePublicationChange changes={[]}/>)).toBe('');
 const before={employeeId:'self',locationId:'2',date:'2026-10-05',startTime:'08:00',endTime:'12:00',isDesignatedLead:false,isCalloutApproved:false};
 const html=renderToStaticMarkup(<SchedulePublicationChange changes={[{type:'TIME_CHANGED',before,after:{...before,startTime:'09:00'},affectedEmployeeIds:['self']}]}/>);
 expect(html).toContain('<details'); expect(html).not.toContain(' open'); expect(html).toContain('Before'); expect(html).toContain('After'); expect(html).toContain('8:00');expect(html).toContain('9:00');expect(html).not.toContain('<form');
});

it('uses existing location names and a generic unknown-location label without internal identifiers',()=>{
 const before={employeeId:'self',locationId:'QA-internal-uuid',date:'2026-10-05',startTime:'08:00',endTime:'12:00',isDesignatedLead:false,isCalloutApproved:false};
 const changes=[{type:'LOCATION_CHANGED' as const,before,after:{...before,locationId:'known'},affectedEmployeeIds:['self']}];
 const html=renderToStaticMarkup(<SchedulePublicationChange changes={changes} locationNames={{known:'FUEL 2'}}/>);
 expect(html).toContain('Location unavailable');expect(html).toContain('FUEL 2');expect(html).not.toContain('QA-internal-uuid');expect(html).not.toContain('Location known');
});
it('shows the captured position labels in a position change',()=>{
 const before={employeeId:'self',locationId:'known',date:'2026-10-05',startTime:'08:00',endTime:'12:00',isDesignatedLead:false,isCalloutApproved:false,positionId:'barista',positionName:'Barista at publication'};
 const html=renderToStaticMarkup(<SchedulePublicationChange changes={[{type:'POSITION_CHANGED',before,after:{...before,positionId:'cashier',positionName:'Cashier at publication'},affectedEmployeeIds:['self']}]} />);
 expect(html).toContain('Position changed');expect(html).toContain('Barista at publication');expect(html).toContain('Cashier at publication');
});
