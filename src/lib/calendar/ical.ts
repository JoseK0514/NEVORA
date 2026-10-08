import type {CalendarEvent} from './types';
const escapeText=(value:string)=>value.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'');
function fold(line:string){let result='',part='';for(const character of line){if(Buffer.byteLength(part+character,'utf8')>75){result+=part+'\r\n';part=' ';}part+=character;}return result+part;}
function instant(value:string){const date=new Date(value);if(!Number.isFinite(date.getTime()))throw Error('Invalid calendar instant');return date.toISOString().slice(0,19).replace(/[-:]/g,'')+'Z';}
export function serializeCalendar(events:CalendarEvent[]):string {
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//NEVORA//Workforce schedule//EN','CALSCALE:GREGORIAN'];
 for(const event of [...events].sort((a,b)=>a.uid.localeCompare(b.uid))){
  if(!Number.isInteger(event.sequence)||event.sequence<0||event.sequence>2147483647||!event.uid||/[\r\n]/.test(event.uid)||!['CONFIRMED','CANCELLED'].includes(event.status)||Date.parse(event.endAt)<=Date.parse(event.startAt))throw Error('Invalid calendar event');
  lines.push('BEGIN:VEVENT','UID:'+escapeText(event.uid),'SEQUENCE:'+event.sequence,'DTSTAMP:'+instant(event.stamp),'LAST-MODIFIED:'+instant(event.lastModified),'DTSTART:'+instant(event.startAt),'DTEND:'+instant(event.endAt),'SUMMARY:'+escapeText(event.summary),'STATUS:'+event.status);
  if(event.status==='CONFIRMED'&&event.location!==null)lines.push('LOCATION:'+escapeText(event.location));
  lines.push('END:VEVENT');
 }
 lines.push('END:VCALENDAR');return lines.map(fold).join('\r\n')+'\r\n';
}
