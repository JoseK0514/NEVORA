import { reasonNotice } from '@/lib/shift-changes/eligibility-reasons';
import { copy } from './manager-shift-requests-copy';
const en = {
  ownerReview: 'Needs Owner rule review',
  deadline: 'The deadline for changes to this shift has passed.',
  changed: 'This shift changed. Reload to see the latest.',
  rules: copy.en.currentRulesPreventChange as string,
  account: 'Unavailable for your current account.',
  publish: 'Publish the schedule changes for this shift first, then approve.',
  overtime: 'Projected scheduled overtime needs manager review.',
  managerReview: 'This request was submitted under manager review.',
};
const es: typeof en = {
  ownerReview: 'El dueño tiene que revisar las reglas',
  deadline: 'Ya pasó la fecha límite para cambiar este turno.',
  changed: 'Este turno cambió. Vuelve a cargar para ver lo más reciente.',
  rules: copy.es.currentRulesPreventChange,
  account: 'No está disponible para tu cuenta actual.',
  publish: 'Publica primero los cambios del horario de este turno y luego aprueba.',
  overtime: 'Las horas extra proyectadas en el horario necesitan revisión del gerente.',
  managerReview: 'Esta solicitud se envió para revisión del gerente.',
};
export const SHIFT_AVAILABILITY_COPY = {en, es};
/** Presentation only: keep the canonical notice untouched for policy checks and links. */
export function shiftAvailabilityNotice(notice: string | null | undefined, lang: 'en' | 'es'): string | undefined {
  if (!notice || lang === 'en') return notice ?? undefined;
  let out = notice;
  for (const key of Object.keys(en) as (keyof typeof en)[]) out = out.replaceAll(en[key], es[key]);
  return reasonNotice(out, lang);
}
