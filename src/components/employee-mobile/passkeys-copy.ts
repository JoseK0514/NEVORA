/* Signed-in Spanish (Nov 23, 2026): the words on the Passkeys page (passkeys.tsx: the saved passkeys card, the remove
 * review and the notes), in English and Puerto Rico Spanish (docs/design/voice.md: tú, sentence case, "Iniciar sesión";
 * passkey → "llave de acceso", as src/lib/passkeys/copy.ts already says it). The biometric note is privacy text: its
 * Spanish is literal and waits for Jose's review. English is byte for byte what the page said before. Where a sentence
 * holds a link or a value, it is split into the text before and after it (`…Lead`, `…Tail`), so both languages draw the
 * same nodes. The manager's feedback has its own copy in src/lib/passkeys/management-copy.ts. */
const en = {
  // src/components/employee-mobile/passkeys.tsx:26
  checking: 'Checking your saved passkeys…',
  // src/components/employee-mobile/passkeys.tsx:26
  paused: 'Passkeys are paused. Return to this page to check your account.',
  // src/components/employee-mobile/passkeys.tsx:26
  checkFirst: 'Check your saved passkeys before starting another request.',
  // src/components/employee-mobile/passkeys.tsx:26
  couldntCheck: 'We couldn’t check your passkeys. Refresh to try again.',
  // src/components/employee-mobile/passkeys.tsx:16
  saved: 'Saved passkeys',
  // src/components/employee-mobile/passkeys.tsx:30
  yours: 'Your passkeys',
  // src/components/employee-mobile/passkeys.tsx:32
  addedLead: 'Added ',
  // src/components/employee-mobile/passkeys.tsx:32
  lastUsed: 'Last used {date}',
  // src/components/employee-mobile/passkeys.tsx:32
  notUsed: 'Not used yet',
  // src/components/employee-mobile/passkeys.tsx:14
  removeLabel: 'Remove {name}',
  // src/components/employee-mobile/passkeys.tsx:14
  remove: 'Remove',
  // src/components/employee-mobile/passkeys.tsx:36
  noneYet: 'None yet',
  // src/components/employee-mobile/passkeys.tsx:36
  passwordWorks: 'Your password still works.',
  // src/components/employee-mobile/passkeys.tsx:37
  intro: 'Sign in with your device’s screen lock instead of typing your password.',
  // src/components/employee-mobile/passkeys.tsx:39
  sessionChanged: 'Your session changed. ',
  // src/components/employee-mobile/passkeys.tsx:39
  signInAgain: 'Sign in again',
  // src/components/employee-mobile/passkeys.tsx:39
  signInAgainTail: ' to manage your passkeys.',
  // src/components/employee-mobile/passkeys.tsx:40
  cantCreate: 'This browser can’t create a passkey. You can still manage your saved passkeys here, or use a supported browser to add one.',
  busy: {
    // src/components/employee-mobile/passkeys.tsx:41
    device: 'Finish setup in your device’s prompt.',
    // src/components/employee-mobile/passkeys.tsx:41
    removing: 'Removing your passkey…',
    // src/components/employee-mobile/passkeys.tsx:41
    verifying: 'Checking and saving your passkey…',
    // src/components/employee-mobile/passkeys.tsx:41
    options: 'Preparing secure setup…',
  },
  // src/components/employee-mobile/passkeys.tsx:17
  add: 'Add a passkey',
  // src/components/employee-mobile/passkeys.tsx:48
  addShort: 'Add a passkey',
  // src/components/employee-mobile/passkeys.tsx:44
  cancelSetup: 'Cancel setup',
  // src/components/employee-mobile/passkeys.tsx:45
  refresh: 'Refresh passkeys',
  // src/components/employee-mobile/passkeys.tsx:49
  removeTitleLead: 'Remove “',
  // src/components/employee-mobile/passkeys.tsx:49
  removeTitleTail: '”?',
  // src/components/employee-mobile/passkeys.tsx:51
  removeBody: 'This stops this passkey from signing in to NEVORA. It does not delete it from your device or sign you out.',
  // src/components/employee-mobile/passkeys.tsx:52
  last: 'This is your last saved passkey. You can still sign in with your password.',
  // src/components/employee-mobile/passkeys.tsx:53
  keep: 'Keep passkey',
  // src/components/employee-mobile/passkeys.tsx:53
  removePasskey: 'Remove passkey',
  // src/components/employee-mobile/passkeys.tsx:56
  biometric: 'Your device may use a fingerprint, face scan, screen-lock code or security key. NEVORA does not receive your biometric data.',
};
const es: typeof en = {
  // src/components/employee-mobile/passkeys.tsx:26
  checking: 'Verificando tus llaves de acceso guardadas…',
  // src/components/employee-mobile/passkeys.tsx:26
  paused: 'Las llaves de acceso están en pausa. Vuelve a esta página para verificar tu cuenta.',
  // src/components/employee-mobile/passkeys.tsx:26
  checkFirst: 'Verifica tus llaves de acceso guardadas antes de empezar otra solicitud.',
  // src/components/employee-mobile/passkeys.tsx:26
  couldntCheck: 'No pudimos verificar tus llaves de acceso. Actualiza para intentarlo de nuevo.',
  // src/components/employee-mobile/passkeys.tsx:16
  saved: 'Llaves de acceso guardadas',
  // src/components/employee-mobile/passkeys.tsx:30
  yours: 'Tus llaves de acceso',
  // src/components/employee-mobile/passkeys.tsx:32
  addedLead: 'Añadida el ',
  // src/components/employee-mobile/passkeys.tsx:32
  lastUsed: 'Último uso: {date}',
  // src/components/employee-mobile/passkeys.tsx:32
  notUsed: 'Sin usar todavía',
  // src/components/employee-mobile/passkeys.tsx:14
  removeLabel: 'Quitar {name}',
  // src/components/employee-mobile/passkeys.tsx:14
  remove: 'Quitar',
  // src/components/employee-mobile/passkeys.tsx:36
  noneYet: 'Ninguna todavía',
  // src/components/employee-mobile/passkeys.tsx:36
  passwordWorks: 'Tu contraseña sigue funcionando.',
  // src/components/employee-mobile/passkeys.tsx:37
  intro: 'Inicia sesión con el bloqueo de pantalla de tu dispositivo en vez de escribir tu contraseña.',
  // src/components/employee-mobile/passkeys.tsx:39
  sessionChanged: 'Tu sesión cambió. ',
  // src/components/employee-mobile/passkeys.tsx:39
  signInAgain: 'Inicia sesión de nuevo',
  // src/components/employee-mobile/passkeys.tsx:39
  signInAgainTail: ' para administrar tus llaves de acceso.',
  // src/components/employee-mobile/passkeys.tsx:40
  cantCreate: 'Este navegador no puede crear una llave de acceso. Aún puedes administrar aquí tus llaves guardadas o usar un navegador compatible para añadir una.',
  busy: {
    // src/components/employee-mobile/passkeys.tsx:41
    device: 'Termina la configuración en el aviso de tu dispositivo.',
    // src/components/employee-mobile/passkeys.tsx:41
    removing: 'Quitando tu llave de acceso…',
    // src/components/employee-mobile/passkeys.tsx:41
    verifying: 'Verificando y guardando tu llave de acceso…',
    // src/components/employee-mobile/passkeys.tsx:41
    options: 'Preparando la configuración segura…',
  },
  // src/components/employee-mobile/passkeys.tsx:17
  add: 'Añadir llave de acceso',
  // src/components/employee-mobile/passkeys.tsx:48
  addShort: 'Añadir llave',
  // src/components/employee-mobile/passkeys.tsx:44
  cancelSetup: 'Cancelar configuración',
  // src/components/employee-mobile/passkeys.tsx:45
  refresh: 'Actualizar llaves de acceso',
  // src/components/employee-mobile/passkeys.tsx:49
  removeTitleLead: '¿Quitar “',
  // src/components/employee-mobile/passkeys.tsx:49
  removeTitleTail: '”?',
  // src/components/employee-mobile/passkeys.tsx:51
  removeBody: 'Esta llave de acceso ya no podrá iniciar sesión en NEVORA. No se borra de tu dispositivo ni se cierra tu sesión.',
  // src/components/employee-mobile/passkeys.tsx:52
  last: 'Esta es tu última llave de acceso guardada. Aún puedes iniciar sesión con tu contraseña.',
  // src/components/employee-mobile/passkeys.tsx:53
  keep: 'Conservar llave de acceso',
  // src/components/employee-mobile/passkeys.tsx:53
  removePasskey: 'Quitar llave de acceso',
  // src/components/employee-mobile/passkeys.tsx:56
  biometric: 'Tu dispositivo puede usar una huella digital, un escaneo facial, un código de bloqueo de pantalla o una llave de seguridad. NEVORA no recibe tus datos biométricos.',
};
export const passkeysCopy = {en, es} as const;

export const copy = {
  en: {
    // src/components/employee-mobile/passkeys.tsx:26
    checking: 'Checking your saved passkeys…',
    // src/components/employee-mobile/passkeys.tsx:26
    paused: 'Passkeys are paused. Return to this page to check your account.',
    // src/components/employee-mobile/passkeys.tsx:26
    checkFirst: 'Check your saved passkeys before starting another request.',
    // src/components/employee-mobile/passkeys.tsx:26
    couldntCheck: 'We couldn’t check your passkeys. Refresh to try again.',
    // src/components/employee-mobile/passkeys.tsx:29
    saved: 'Saved passkeys',
    // src/components/employee-mobile/passkeys.tsx:30
    yours: 'Your passkeys',
    // src/components/employee-mobile/passkeys.tsx:32
    addedLastUsed: 'Added {createdAt} · Last used {lastUsedAt}',
    // src/components/employee-mobile/passkeys.tsx:32
    addedNotUsedYet: 'Added {createdAt} · Not used yet',
    // src/components/employee-mobile/passkeys.tsx:33
    removeLabel: 'Remove {name}',
    // src/components/employee-mobile/passkeys.tsx:33
    remove: 'Remove',
    // src/components/employee-mobile/passkeys.tsx:36
    noneYet: 'None yet',
    // src/components/employee-mobile/passkeys.tsx:36
    passwordWorks: 'Your password still works.',
    // src/components/employee-mobile/passkeys.tsx:37
    intro: 'Sign in with your device’s screen lock instead of typing your password.',
    // src/components/employee-mobile/passkeys.tsx:39
    sessionChanged: 'Your session changed. ',
    // src/components/employee-mobile/passkeys.tsx:39
    signInAgain: 'Sign in again',
    // src/components/employee-mobile/passkeys.tsx:39
    signInAgainTail: ' to manage your passkeys.',
    // src/components/employee-mobile/passkeys.tsx:40
    cantCreate: 'This browser can’t create a passkey. You can still manage your saved passkeys here, or use a supported browser to add one.',
    // src/components/employee-mobile/passkeys.tsx:41
    device: 'Finish setup in your device’s prompt.',
    // src/components/employee-mobile/passkeys.tsx:41
    removing: 'Removing your passkey…',
    // src/components/employee-mobile/passkeys.tsx:41
    verifying: 'Checking and saving your passkey…',
    // src/components/employee-mobile/passkeys.tsx:41
    options: 'Preparing secure setup…',
    // src/components/employee-mobile/passkeys.tsx:43
    add: 'Add a passkey',
    // src/components/employee-mobile/passkeys.tsx:44
    cancelSetup: 'Cancel setup',
    // src/components/employee-mobile/passkeys.tsx:45
    refresh: 'Refresh passkeys',
    // src/components/employee-mobile/passkeys.tsx:49
    confirmTitle: 'Remove “{name}”?',
    // src/components/employee-mobile/passkeys.tsx:51
    removeBody: 'This stops this passkey from signing in to NEVORA. It does not delete it from your device or sign you out.',
    // src/components/employee-mobile/passkeys.tsx:52
    last: 'This is your last saved passkey. You can still sign in with your password.',
    // src/components/employee-mobile/passkeys.tsx:53
    keep: 'Keep passkey',
    // src/components/employee-mobile/passkeys.tsx:53
    removePasskey: 'Remove passkey',
    // src/components/employee-mobile/passkeys.tsx:56
    biometric: 'Your device may use a fingerprint, face scan, screen-lock code or security key. NEVORA does not receive your biometric data.',
  },
  es: {
    // src/components/employee-mobile/passkeys.tsx:26
    checking: 'Verificando tus llaves de acceso guardadas…',
    // src/components/employee-mobile/passkeys.tsx:26
    paused: 'Las llaves de acceso están en pausa. Vuelve a esta página para verificar tu cuenta.',
    // src/components/employee-mobile/passkeys.tsx:26
    checkFirst: 'Verifica tus llaves de acceso guardadas antes de empezar otra solicitud.',
    // src/components/employee-mobile/passkeys.tsx:26
    couldntCheck: 'No pudimos verificar tus llaves de acceso. Actualiza para intentarlo de nuevo.',
    // src/components/employee-mobile/passkeys.tsx:29
    saved: 'Llaves de acceso guardadas',
    // src/components/employee-mobile/passkeys.tsx:30
    yours: 'Tus llaves de acceso',
    // src/components/employee-mobile/passkeys.tsx:32
    addedLastUsed: 'Añadido {createdAt} · Último usado {lastUsedAt}',
    // src/components/employee-mobile/passkeys.tsx:32
    addedNotUsedYet: 'Añadido {createdAt} · Aún no utilizado',
    // src/components/employee-mobile/passkeys.tsx:33
    removeLabel: 'Quitar {name}',
    // src/components/employee-mobile/passkeys.tsx:33
    remove: 'Quitar',
    // src/components/employee-mobile/passkeys.tsx:36
    noneYet: 'Ninguna todavía',
    // src/components/employee-mobile/passkeys.tsx:36
    passwordWorks: 'Tu contraseña sigue funcionando.',
    // src/components/employee-mobile/passkeys.tsx:37
    intro: 'Inicia sesión con el bloqueo de pantalla de tu dispositivo en vez de escribir tu contraseña.',
    // src/components/employee-mobile/passkeys.tsx:39
    sessionChanged: 'Tu sesión cambió. ',
    // src/components/employee-mobile/passkeys.tsx:39
    signInAgain: 'Inicia sesión de nuevo',
    // src/components/employee-mobile/passkeys.tsx:39
    signInAgainTail: ' para administrar tus llaves de acceso.',
    // src/components/employee-mobile/passkeys.tsx:40
    cantCreate: 'Este navegador no puede crear llaves de acceso. Puedes administrar las que guardaste aquí o usar un navegador compatible para añadir una.',
    // src/components/employee-mobile/passkeys.tsx:41
    device: 'Termina la configuración en el aviso de tu dispositivo.',
    // src/components/employee-mobile/passkeys.tsx:41
    removing: 'Quitando tu llave de acceso…',
    // src/components/employee-mobile/passkeys.tsx:41
    verifying: 'Verificando y guardando tu llave de acceso…',
    // src/components/employee-mobile/passkeys.tsx:41
    options: 'Preparando la configuración segura…',
    // src/components/employee-mobile/passkeys.tsx:43
    add: 'Añadir llave de acceso',
    // src/components/employee-mobile/passkeys.tsx:44
    cancelSetup: 'Cancelar configuración',
    // src/components/employee-mobile/passkeys.tsx:45
    refresh: 'Actualizar llaves de acceso',
    // src/components/employee-mobile/passkeys.tsx:49
    confirmTitle: '¿Quitar “{name}”?',
    // src/components/employee-mobile/passkeys.tsx:51
    removeBody: 'Esta llave de acceso ya no podrá iniciar sesión en NEVORA. No se borra de tu dispositivo ni se cierra tu sesión.',
    // src/components/employee-mobile/passkeys.tsx:52
    last: 'Esta es tu última llave de acceso guardada. Aún puedes iniciar sesión con tu contraseña.',
    // src/components/employee-mobile/passkeys.tsx:53
    keep: 'Conservar llave de acceso',
    // src/components/employee-mobile/passkeys.tsx:53
    removePasskey: 'Quitar llave de acceso',
    // src/components/employee-mobile/passkeys.tsx:56
    biometric: 'Tu dispositivo puede usar una huella digital, un escaneo facial, un código de bloqueo de pantalla o una llave de seguridad. NEVORA no recibe tus datos biométricos.',
  },
} as const;
