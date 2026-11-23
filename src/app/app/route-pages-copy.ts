/* Signed-in Spanish (es-rest): the words of small signed-in routes (restricted, clocker-recovery, account-recovery and the
 * shift-change sheet), English as written and Puerto Rico Spanish (docs/design/voice.md: Owner = Dueño). */
const en = {
  restricted: {
    managerTitle: 'That page is for Owners',
    otherTitle: 'That page is for Owners and Managers',
    help: 'Ask your Owner if you need access.',
    home: 'Go to Home',
  },
  clockerRecovery: { title: 'Clocker recovery', unavailable: 'Clocker recovery unavailable' },
  accountRecovery: { title: 'Help someone sign in', unavailable: 'Help someone sign in is unavailable' },
  shiftSheet: 'Change a shift',
};
const es: typeof en = {
  restricted: {
    managerTitle: 'Esa página es para dueños',
    otherTitle: 'Esa página es para dueños y gerentes',
    help: 'Pídele acceso a tu dueño si lo necesitas.',
    home: 'Ir a Inicio',
  },
  clockerRecovery: { title: 'Recuperación del Clocker', unavailable: 'La recuperación del Clocker no está disponible' },
  accountRecovery: { title: 'Ayudar a alguien a iniciar sesión', unavailable: 'Ayudar a alguien a iniciar sesión no está disponible' },
  shiftSheet: 'Cambiar un turno',
};
export const ROUTE_PAGES_COPY = { en, es };
