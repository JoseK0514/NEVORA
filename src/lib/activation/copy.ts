import type { AuthLang } from '../auth-copy';
import type { FirstWeekStepId } from './first-week';

type ActivationCopy = {
  language: string;
  languageSaved: string;
  languageSaveFailed: string;
  checklist: string;
  complete: string;
  pending: string;
  progressUnavailable: string;
  steps: Record<FirstWeekStepId, string>;
};

export const activationCopy = {
  en: {
    language: 'Language',
    languageSaved: 'Language saved.',
    languageSaveFailed: 'We couldn’t confirm your language. Try again.',
    checklist: 'First-week setup',
    complete: 'Complete',
    pending: 'To do',
    progressUnavailable: 'We couldn’t load your setup progress. Try again.',
    steps: {
      ROSTER: 'Add a team member',
      LOCATION_AND_RULES: 'Set up locations and staffing rules',
      FIRST_SCHEDULE_PUBLISHED: 'Publish your first schedule',
      TABLET_SETUP: 'Register a time clock tablet',
      FIRST_TIMECARD_REVIEW: 'Review your first timecard',
    },
  },
  es: {
    language: 'Idioma',
    languageSaved: 'Se guardó el idioma.',
    languageSaveFailed: 'No pudimos confirmar tu idioma. Inténtalo de nuevo.',
    checklist: 'Configuración de la primera semana',
    complete: 'Completado',
    pending: 'Pendiente',
    progressUnavailable: 'No pudimos cargar el progreso de la configuración. Inténtalo de nuevo.',
    steps: {
      ROSTER: 'Añade a alguien a tu equipo',
      LOCATION_AND_RULES: 'Configura las ubicaciones y las reglas de personal',
      FIRST_SCHEDULE_PUBLISHED: 'Publica tu primer horario',
      TABLET_SETUP: 'Registra una tableta para ponchar',
      FIRST_TIMECARD_REVIEW: 'Revisa tu primera tarjeta de tiempo',
    },
  },
} as const satisfies Record<AuthLang, ActivationCopy>;
