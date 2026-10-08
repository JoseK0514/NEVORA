import {expect,it} from 'vitest';
import {createCalendarLogRedactor} from './calendar-log-redaction';
async function redact(parts:string[]){const stream=createCalendarLogRedactor(),output:Buffer[]=[];stream.on('data',(data:Buffer)=>output.push(data));const ended=new Promise<void>((ready,reject)=>{stream.once('end',ready);stream.once('error',reject);});for(const part of parts)stream.write(part);stream.end();await ended;return Buffer.concat(output).toString('utf8');}
it('suppresses split capability paths and bare credentials while retaining unrelated logs',async()=>{
 const sentinel='A'.repeat(43),line=`GET /api/calendar/${sentinel}/schedule.ics 404\nError: credential=${sentinel}\nUnrelated Café error 503\n`;
 const output=await redact([line.slice(0,30),line.slice(30,55),line.slice(55)]);
 expect(output.includes(sentinel)).toBe(false);expect(output).toContain('/api/calendar/[redacted]/schedule.ics');expect(output).toContain('Unrelated Café error 503');expect(output).not.toContain('credential='+sentinel);
});
it('limits oversized unterminated lines before writing persistent logs',async()=>{const output=await redact(['X'.repeat(70000),'\nNormal error\n']);expect(output.length).toBeLessThan(1000);expect(output).toContain('Normal error');});
