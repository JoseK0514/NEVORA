import { wholeSpanishTimes } from '@/lib/i18n/whole-spanish-times';
/* Dates and times on the Employee phone screens in the person's language (docs/design/voice.md, "Dates, times and
 * numbers"). English keeps the app's one form exactly ("7:00 AM – 3:00 PM", "Tue, Oct 6", "Nov 16–22"); Puerto Rico
 * Spanish writes "7:00 a. m. – 3:00 p. m.", "mar, 6 oct", "16–22 nov". The shared formatters in src/lib stay English;
 * these wrap them, so English output is byte for byte what it was. */
import {dateRange,durationSentence} from '@/lib/duration-format';
import {formatClockTime,formatDisplayDate,formatTime,formatTimeRange,formatWeekRange} from '@/lib/date-utils';

export type MobileLang='en'|'es';
export const LOCALE:Record<MobileLang,string>={en:'en-US',es:'es-PR'};

/** Spanish clock times inside an English-formatted text: "7:00 AM" → "7:00 a. m.", "All day" → "Todo el día". English
 * is returned unchanged. A narrow no-break space before AM/PM (wholeTime) is kept as a no-break space. */
export function timeText(text:string,lang:MobileLang){
 if(lang==='en')return text;
 return wholeSpanishTimes(text).replace(/\bAll day\b/g,'Todo el día');
}
/** "07:00" → "7:00 AM" · "7:00 a. m.". */
export const clockText=(time:string,lang:MobileLang)=>timeText(formatTime(time),lang);
/** "07:00","15:00" → "7:00 AM – 3:00 PM" · "7:00 a. m. – 3:00 p. m.". */
export const clockRangeText=(start:string,end:string,lang:MobileLang)=>timeText(formatTimeRange(start,end),lang);
/** An instant in a zone: "7:02 AM" · "7:02 a. m.". */
export const instantText=(at:string|number|Date,lang:MobileLang,timeZone?:string)=>timeText(formatClockTime(at,timeZone),lang);

const utc=(date:string)=>new Date(`${date}T12:00:00Z`);
const formats=new Map<string,Intl.DateTimeFormat>();
function fmt(lang:MobileLang,options:Intl.DateTimeFormatOptions){
 const key=lang+JSON.stringify(options);let format=formats.get(key);
 if(!format){format=new Intl.DateTimeFormat(LOCALE[lang],options);formats.set(key,format);}
 return format;
}
/** An ISO date with a short weekday: "Tue, Oct 6" · "mar, 6 oct". */
export const displayDateText=(date:string,lang:MobileLang)=>lang==='en'?formatDisplayDate(date):fmt(lang,{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'}).format(utc(date));
/** A schedule week from its first day: "Nov 16–22" · "16–22 nov". */
export const weekRangeText=(weekStart:string,end:string,lang:MobileLang)=>lang==='en'?formatWeekRange(weekStart):dateRange(weekStart,end,{year:'never',locale:LOCALE.es});
/** Any Intl date format in the person's language, for an ISO date read at noon UTC. */
export const dateText=(date:string,lang:MobileLang,options:Intl.DateTimeFormatOptions)=>fmt(lang,{timeZone:'UTC',...options}).format(utc(date));
/** Any Intl date format in the person's language, for an instant (in a zone when given). */
export const instantDateText=(at:string|number|Date,lang:MobileLang,options:Intl.DateTimeFormatOptions)=>fmt(lang,options).format(at instanceof Date?at:new Date(at));
/** "8 h 30 min" reads the same in both languages; kept here so a screen has one import. */
export const durationText=(minutes:number,zero?:string)=>durationSentence(minutes,zero);
