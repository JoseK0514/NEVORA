/* Signed-in Spanish (es-rest, Nov 23, 2026): the words of Swap shift, Offer for cover and Can't work's reason check, and
 * the swap labels (date, time, position), in English and Puerto Rico Spanish (docs/design/voice.md: tú, the glossary:
 * "Turno disponible"). The English is the text these parts showed before, word for word. */
import type { PortalLang } from '@/lib/i18n/portal-lang';
import { addDays, formatDayLabel, formatTime } from '@/lib/date-utils';
import { esDay, esTime } from './schedule-copy';

const esLong = (date: string) => new Intl.DateTimeFormat('es-PR', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`)).replace(/\./g, '').replace(/ de /g, ' ');

const en = {
  /** "Wednesday, Dec 9, 2026". */
  dateLabel: (date: string) => new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`)),
  /** "10:00 PM – 6:00 AM (Thu, Dec 10)". */
  timeLabel: (date: string, start: string, end: string, overnight: boolean) => { const next = formatDayLabel(addDays(date, 1)); return `${formatTime(start)} – ${formatTime(end)}${overnight ? ` (${next.weekday}, ${next.day})` : ''}`; },
  position: (id: string) => `Position ${id}`, noPosition: 'No assigned position',
  page: {
    offerForCover: 'Offer for cover', offering: 'Offering…', offer: 'Offer', yourShift: 'Your shift',
    noSwapsOffer: 'No shifts to swap: no one has a shift you can trade for it this week, so you can offer it for someone to pick up instead.',
    teamSees: 'Your team sees it as an open shift. It stays your shift until someone picks it up and any review is done.',
    swapShift: 'Swap shift', noSwapsNow: 'No shifts to swap right now. ', checkBack: 'Check back later.',
  },
  callout: { details: 'Add a few words about the reason when you choose Other.', reason: 'Choose a reason first.' },
};

const es: typeof en = {
  dateLabel: esLong,
  timeLabel: (date: string, start: string, end: string, overnight: boolean) => `${esTime(start)} – ${esTime(end)}${overnight ? ` (${esDay(addDays(date, 1))})` : ''}`,
  position: (id: string) => `Puesto ${id}`, noPosition: 'Sin puesto asignado',
  page: {
    offerForCover: 'Ofrecer para cubrir', offering: 'Ofreciendo…', offer: 'Ofrecer', yourShift: 'Tu turno',
    noSwapsOffer: 'No hay turnos para cambiar: nadie tiene un turno que puedas cambiar por este esta semana, así que puedes ofrecerlo para que alguien lo tome.',
    teamSees: 'Tu equipo lo ve como turno disponible. Sigue siendo tu turno hasta que alguien lo tome y se complete cualquier revisión.',
    swapShift: 'Cambiar turno', noSwapsNow: 'No hay turnos para cambiar ahora. ', checkBack: 'Vuelve a revisar más tarde.',
  },
  callout: { details: 'Escribe unas palabras sobre el motivo cuando elijas Otro.', reason: 'Primero elige un motivo.' },
};

export const SWAP_COPY: Record<PortalLang, typeof en> = { en, es };
export const swapCopy = (lang: PortalLang = 'en') => SWAP_COPY[lang];
