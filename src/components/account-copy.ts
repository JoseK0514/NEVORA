/* Signed-in Spanish (es-rest): the account pages' own words (Delete account's title and role names, and the messages of
 * an Owner's or Manager's assisted recovery code) in English and Puerto Rico Spanish (docs/design/voice.md: tú, Dueño).
 * The English is word for word what they said before. The sign-in pages' request and reset messages stay as they are. */
const en = {
  deleteAccount: 'Delete account',
  roles: {OWNER: 'Owner', MANAGER: 'Manager', LEAD: 'Lead', EMPLOYEE: 'Employee'},
  assistedUnavailable: 'The recovery code could not be confirmed. Check current access before preparing another code.',
  codeExpired: 'This code expired. Verify identity again before issuing another.',
  assistedSessionEnded: 'Your session ended. Sign in again to issue a code.',
};
const es: typeof en = {
  deleteAccount: 'Eliminar cuenta',
  roles: {OWNER: 'Dueño', MANAGER: 'Gerente', LEAD: 'Líder', EMPLOYEE: 'Empleado'},
  assistedUnavailable: 'No pudimos confirmar el código de recuperación. Revisa el acceso actual antes de preparar otro código.',
  codeExpired: 'Este código venció. Verifica la identidad de nuevo antes de emitir otro.',
  assistedSessionEnded: 'Tu sesión terminó. Inicia sesión de nuevo para emitir un código.',
};
export const ACCOUNT_COPY = {en, es};
