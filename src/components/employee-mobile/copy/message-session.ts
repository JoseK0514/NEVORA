/* Signed-in Spanish (Nov 23, 2026): the return link a phone shows on a page opened from Notifications or Updates
 * (message-session.tsx), in English and Puerto Rico Spanish (docs/design/voice.md: the glossary: Notifications →
 * "Notificaciones", Update → "Aviso"). English is byte for byte what the link said before. */
const en = {
  back: {notifications: 'Back to notifications', updates: 'Back to updates'},
};
const es: typeof en = {
  back: {notifications: 'Volver a notificaciones', updates: 'Volver a avisos'},
};
export const messageSessionCopy = {en, es};
