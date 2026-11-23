/* Signed-in Spanish (es-rest): Home's live status line (the screen-reader summary under the band) in English and Puerto
 * Rico Spanish. The English is exactly the earlier wording. */
export type PremiumHomeLang = 'en' | 'es';

const en = {
  offline: 'You’re offline.',
  paused: 'Paused while you’re away.',
  failed: 'Couldn’t load everything.',
  checking: 'Checking what needs you…',
  today: (sentence: string) => `${sentence} today.`,
};

const es: typeof en = {
  offline: 'No tienes conexión.',
  paused: 'En pausa mientras no estás.',
  failed: 'No pudimos cargar todo.',
  checking: 'Revisando qué necesita tu atención…',
  today: sentence => `${sentence} hoy.`,
};

export const PREMIUM_HOME_COPY = { en, es };
