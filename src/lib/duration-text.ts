import {durationSentence} from './duration-format';
/** Shared prose duration; dense-grid and frozen payroll document formats are separate. */
export function durationText(totalMinutes:number):string {
 return durationSentence(totalMinutes,'0 h');
}
