/* Signed-in Spanish (es-rest): the words of Team's live states and filters and the team form fields, in English and Puerto
 * Rico Spanish (docs/design/voice.md: "En turno" for clocked in, times "1:30 p. m."). The English attendance words are
 * Jose's (src/lib/action-center/present.ts, ATTENDANCE_WORDS). */
import {ATTENDANCE_WORDS} from '@/lib/action-center/present';
import {esTimes} from '@/components/copy-receipt-copy';

const en = {
  notClockedIn: ATTENDANCE_WORDS.notClockedIn as string,
  late: ATTENDANCE_WORDS.late as string,
  clockedIn: 'Clocked in',
  onBreak: 'On break',
  offToday: 'Off today',
  starts: (time: string) => `Starts ${time}`,
  show: 'Show',
  all: 'All',
  onTheClock: 'On the clock',
  noOneClockedIn: 'No one is clocked in right now.',
  everyoneClockedIn: 'Everyone on shift has clocked in.',
  noOneOff: 'No one is off today.',
  phoneTitle: 'Enter all 10 digits of the phone number',
  none: 'None',
};
const es: typeof en = {
  notClockedIn: 'Sin marcar entrada',
  late: 'En turno, llegó tarde',
  clockedIn: 'En turno',
  onBreak: 'En descanso',
  offToday: 'Libre hoy',
  starts: (time: string) => `Empieza ${esTimes(time)}`,
  show: 'Mostrar',
  all: 'Todos',
  onTheClock: 'En turno',
  noOneClockedIn: 'Nadie está en turno ahora.',
  everyoneClockedIn: 'Todos los que tienen turno ya marcaron entrada.',
  noOneOff: 'Nadie está libre hoy.',
  phoneTitle: 'Escribe los 10 dígitos del número de teléfono',
  none: 'Ninguno',
};
export const TEAM_COPY = {en, es};
