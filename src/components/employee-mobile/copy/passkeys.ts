/* Signed-in Spanish (Nov 23, 2026): the words on the Passkeys page (passkeys.tsx: the saved passkeys card, the remove
 * review and the notes), in English and Puerto Rico Spanish (docs/design/voice.md: tú, sentence case, "Iniciar sesión";
 * passkey → "llave de acceso", as src/lib/passkeys/copy.ts already says it). The biometric note is privacy text: its
 * Spanish is literal and waits for Jose's review. English is byte for byte what the page said before. Where a sentence
 * holds a link or a value, it is split into the text before and after it (`…Lead`, `…Tail`), so both languages draw the
 * same nodes. The manager's own notices (state.notice) come from src/lib/passkeys and stay as given. */
const en = {
  checking: 'Checking your saved passkeys…',
  paused: 'Passkeys are paused. Return to this page to check your account.',
  checkFirst: 'Check your saved passkeys before starting another request.',
  couldntCheck: 'We couldn’t check your passkeys. Refresh to try again.',
  saved: 'Saved passkeys', yours: 'Your passkeys',
  addedLead: 'Added ', lastUsed: (date: string) => 'Last used ' + date, notUsed: 'Not used yet',
  removeLabel: (name: string) => 'Remove ' + name, remove: 'Remove',
  noneYet: 'None yet', passwordWorks: 'Your password still works.',
  intro: 'Sign in with your device’s screen lock instead of typing your password.',
  sessionChanged: 'Your session changed. ', signInAgain: 'Sign in again', signInAgainTail: ' to manage your passkeys.',
  cantCreate: 'This browser can’t create a passkey. You can still manage your saved passkeys here, or use a supported browser to add one.',
  busy: {device: 'Finish setup in your device’s prompt.', removing: 'Removing your passkey…', verifying: 'Checking and saving your passkey…', options: 'Preparing secure setup…'},
  add: 'Add a passkey', cancelSetup: 'Cancel setup', refresh: 'Refresh passkeys',
  removeTitleLead: 'Remove “', removeTitleTail: '”?',
  removeBody: 'This stops this passkey from signing in to NEVORA. It does not delete it from your device or sign you out.',
  last: 'This is your last saved passkey. You can still sign in with your password.',
  keep: 'Keep passkey', removePasskey: 'Remove passkey',
  biometric: 'Your device may use a fingerprint, face scan, screen-lock code or security key. NEVORA does not receive your biometric data.',
};
const es: typeof en = {
  checking: 'Verificando tus llaves de acceso guardadas…',
  paused: 'Las llaves de acceso están en pausa. Vuelve a esta página para verificar tu cuenta.',
  checkFirst: 'Verifica tus llaves de acceso guardadas antes de empezar otra solicitud.',
  couldntCheck: 'No pudimos verificar tus llaves de acceso. Actualiza para intentarlo de nuevo.',
  saved: 'Llaves de acceso guardadas', yours: 'Tus llaves de acceso',
  addedLead: 'Agregada el ', lastUsed: (date: string) => 'Último uso: ' + date, notUsed: 'Sin usar todavía',
  removeLabel: (name: string) => 'Quitar ' + name, remove: 'Quitar',
  noneYet: 'Ninguna todavía', passwordWorks: 'Tu contraseña sigue funcionando.',
  intro: 'Inicia sesión con el bloqueo de pantalla de tu dispositivo en vez de escribir tu contraseña.',
  sessionChanged: 'Tu sesión cambió. ', signInAgain: 'Inicia sesión de nuevo', signInAgainTail: ' para administrar tus llaves de acceso.',
  cantCreate: 'Este navegador no puede crear una llave de acceso. Aún puedes administrar aquí tus llaves guardadas o usar un navegador compatible para agregar una.',
  busy: {device: 'Termina la configuración en el aviso de tu dispositivo.', removing: 'Quitando tu llave de acceso…', verifying: 'Verificando y guardando tu llave de acceso…', options: 'Preparando la configuración segura…'},
  add: 'Agregar llave de acceso', cancelSetup: 'Cancelar configuración', refresh: 'Actualizar llaves de acceso',
  removeTitleLead: '¿Quitar “', removeTitleTail: '”?',
  removeBody: 'Esta llave de acceso ya no podrá iniciar sesión en NEVORA. No se borra de tu dispositivo ni se cierra tu sesión.',
  last: 'Esta es tu última llave de acceso guardada. Aún puedes iniciar sesión con tu contraseña.',
  keep: 'Conservar llave de acceso', removePasskey: 'Quitar llave de acceso',
  biometric: 'Tu dispositivo puede usar una huella digital, un escaneo facial, un código de bloqueo de pantalla o una llave de seguridad. NEVORA no recibe tus datos biométricos.',
};
export const passkeysCopy = {en, es};
