/* Signed-in Spanish (es-rest): the words of the Owner's and Manager's Updates list (messages-manager-b.tsx), English as
 * written and Puerto Rico Spanish (docs/design/voice.md: Update = Aviso; dates "lun, 23 nov"). */
const en = {
  locale: 'en-US',
  acknowledged: (done: number, total: number) => `${done} of ${total} acknowledged`,
  partial: 'Some updates couldn’t load. Try again to check for the rest.',
  mustBeRead: 'Must be confirmed',
  otherUpdates: 'Other updates',
  updates: 'Updates',
  noneInView: 'No updates available in this view',
  noneYet: 'No updates yet',
  partialLine: 'Some updates couldn’t be checked. Try again to check for the rest.',
  emptyLine: 'Tell your team about hours, menus or events.',
  more: 'More',
  newUpdate: 'New update',
};
const es: typeof en = {
  locale: 'es-PR',
  acknowledged: (done: number, total: number) => `${done} de ${total} confirmaron`,
  partial: 'Algunos avisos no cargaron. Inténtalo de nuevo para ver los demás.',
  mustBeRead: 'Confirmación requerida',
  otherUpdates: 'Otros avisos',
  updates: 'Avisos',
  noneInView: 'No hay avisos disponibles en esta vista',
  noneYet: 'Todavía no hay avisos',
  partialLine: 'No pudimos verificar algunos avisos. Inténtalo de nuevo para ver los demás.',
  emptyLine: 'Cuéntale a tu equipo sobre horarios, menús o eventos.',
  more: 'Más',
  newUpdate: 'Nuevo aviso',
};
export const MESSAGES_MANAGER_COPY = { en, es };
