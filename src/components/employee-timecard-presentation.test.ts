import {expect,it} from 'vitest';
import type {TimecardIssue} from '@/lib/timecards/project';
import {employeeTimecardPresentation} from './employee-timecard-presentation';

it('treats an open period as information while retaining its authoritative reason',()=>{
 const issues=Object.freeze(['period_open'] as TimecardIssue[]);
 expect(employeeTimecardPresentation(issues)).toEqual({tone:'neutral',heading:'Period information',issues});
});
it('keeps every reason in its original order when actionable time issues coexist',()=>{
 const issues=Object.freeze(['period_open','open_entry','open_break','pending_correction','overlapping_time'] as TimecardIssue[]);
 const presentation=employeeTimecardPresentation(issues);
 expect(presentation.tone).toBe('warning');
 expect(presentation.heading).toBe('Needs attention');
 expect(presentation.issues).toBe(issues);
 expect(presentation.issues).toEqual(['period_open','open_entry','open_break','pending_correction','overlapping_time']);
});
it('does not invent an attention reason for an issue-free card',()=>{
 expect(employeeTimecardPresentation([])).toEqual({tone:'neutral',heading:'Period information',issues:[]});
});
