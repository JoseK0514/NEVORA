import {describe,expect,it} from 'vitest';
import {csvCell,reportCsv} from './csv';
import {projectReports} from './project';
const report=projectReports({workspaceId:'W',timeZone:'America/Puerto_Rico',observedAt:'2026-10-01T00:00:00Z',period:{startDate:'2026-09-21',endDate:'2026-09-27'},cards:[],schedules:[],requests:[],changes:[],publications:[],attendanceSources:[],publishedWeeks:[]});
describe('D5 scoped report CSV',()=>{
 it.each(['=HYPERLINK("evil")',' +cmd','\t@SUM(1)','-2+4','\r=evil'])('neutralizes spreadsheet formula input %s',v=>{expect(csvCell(v)).toMatch(/^"'/);});
 it('preserves commas, quotes, newlines and Unicode',()=>{expect(csvCell('José, "Rivera"\nOffice')).toBe('"José, ""Rivera""\nOffice"');});
 it('exports a verified empty period with scope, definitions and unavailable metrics',()=>{const csv=reportCsv(report);expect(csv).toContain('2026-09-21');expect(csv).toContain('America/Puerto_Rico');expect(csv).toContain('unavailable');expect(csv).not.toContain('undefined');expect(csv.endsWith('\r\n')).toBe(true);});
 it('includes source fingerprints and exact time without private correction/absence reasons',()=>{
  const source={employeeId:'E',employeeName:'=Fictional',timeZone:report.timeZone,...report.period,pendingCorrections:0,entries:[],corrections:[]};
  const richer=projectReports({workspaceId:'W',timeZone:report.timeZone,observedAt:report.observedAt,period:report.period,cards:[{source,sourceHash:'a'.repeat(32),revision:0,state:'DRAFT',history:[]}],schedules:[],requests:[],changes:[],publications:[],attendanceSources:[],publishedWeeks:[]});
  const csv=reportCsv(richer);expect(csv).toContain('a'.repeat(32));expect(csv).toContain("'=Fictional");
 });
});
