import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { SchedulePublicationChange } from './schedule-publication-change';
it('is absent without actual changes and collapsed, one plain row per change (upscale S6)',()=>{
 expect(renderToStaticMarkup(<SchedulePublicationChange changes={[]}/>)).toBe('');
 const before={employeeId:'self',locationId:'2',date:'2026-10-05',startTime:'08:00',endTime:'12:00',isDesignatedLead:false,isCalloutApproved:false};
 const html=renderToStaticMarkup(<SchedulePublicationChange changes={[{type:'TIME_CHANGED',before,after:{...before,startTime:'09:00'},affectedEmployeeIds:['self']}]}/>);
 const text=html.replace(/<[^>]+>/g,' ').replace(/[\u00a0\u202f]/g,' ').replace(/\s+/g,' ');
 expect(html).toContain('<details'); expect(html).not.toContain(' open'); expect(text).toContain('New time Mon, Oct 5');/* Review B2 (NV-226): the change word is a chip before the day */ expect(text).toContain('9:00 AM – 12:00 PM'); expect(text).toContain('Was 8:00 AM – 12:00 PM');
 expect(text).not.toMatch(/Before:|After:|No shift/);expect(html).not.toContain('<form');
 // An added shift is "Added · day" with the shift (time · position · place), and no "Before: No shift".
 const added=renderToStaticMarkup(<SchedulePublicationChange changes={[{type:'ADDED',after:{...before,positionName:'Barista'},affectedEmployeeIds:['self']}]} locationNames={{'2':'Condado'}}/>).replace(/<[^>]+>/g,' ').replace(/[\u00a0\u202f]/g,' ').replace(/\s+/g,' ');
 expect(added).toContain('Added Mon, Oct 5');expect(added).toContain('8:00 AM – 12:00 PM · Barista · Condado');expect(added).not.toContain('Was');
 // A time change to another day reads "Moved".
 expect(renderToStaticMarkup(<SchedulePublicationChange changes={[{type:'TIME_CHANGED',before,after:{...before,date:'2026-10-08'},affectedEmployeeIds:['self']}]}/>).replace(/[\u00a0\u202f]/g,' ')).toMatch(/>Moved<\/span>\s*Thu, Oct 8/);
});

it('uses existing location names and a generic unknown-location label without internal identifiers',()=>{
 const before={employeeId:'self',locationId:'QA-internal-uuid',date:'2026-10-05',startTime:'08:00',endTime:'12:00',isDesignatedLead:false,isCalloutApproved:false};
 const changes=[{type:'LOCATION_CHANGED' as const,before,after:{...before,locationId:'known'},affectedEmployeeIds:['self']}];
 const html=renderToStaticMarkup(<SchedulePublicationChange changes={changes} locationNames={{known:'FUEL 2'}}/>).replace(/\u00a0/g,' ');
 expect(html).toContain('Location unavailable');expect(html).toContain('FUEL 2');expect(html).not.toContain('QA-internal-uuid');expect(html).not.toContain('Location known');
});
it('shows the captured position labels in a position change',()=>{
 const before={employeeId:'self',locationId:'known',date:'2026-10-05',startTime:'08:00',endTime:'12:00',isDesignatedLead:false,isCalloutApproved:false,positionId:'barista',positionName:'Barista at publication'};
 const html=renderToStaticMarkup(<SchedulePublicationChange changes={[{type:'POSITION_CHANGED',before,after:{...before,positionId:'cashier',positionName:'Cashier at publication'},affectedEmployeeIds:['self']}]} />);
 expect(html).toContain('New position');expect(html).toContain('Was Barista at publication');expect(html).toContain('Cashier at publication');
});
