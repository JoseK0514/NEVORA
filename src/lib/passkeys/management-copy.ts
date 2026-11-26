export const passkeysFeedbackCopy = {
  en: {
    // src/lib/passkeys/management.ts:22
    uncertain: 'We could not confirm the result. Refresh your saved passkeys before trying again.',
    // src/lib/passkeys/management.ts:32
    expired: 'Refresh to check your current passkeys.',
    // src/lib/passkeys/management.ts:88
    cancelled: 'Setup cancelled. No passkey was added to your account.',
    // src/lib/passkeys/management.ts:96
    added: 'Passkey added. You can use it the next time you sign in.',
    // src/lib/passkeys/management.ts:102
    setupFailed: 'Setup did not finish. Check your connection and try again.',
    // src/lib/passkeys/management.ts:110
    removed: 'Passkey removed.',
  },
  es: {
    // src/lib/passkeys/management.ts:22
    uncertain: 'No pudimos confirmar el resultado. Actualiza tus llaves guardadas antes de intentarlo de nuevo.',
    // src/lib/passkeys/management.ts:32
    expired: 'Actualiza para verificar tus llaves de acceso.',
    // src/lib/passkeys/management.ts:88
    cancelled: 'Se canceló la configuración. Tu cuenta sigue con las mismas llaves de acceso.',
    // src/lib/passkeys/management.ts:96
    added: 'Se añadió la llave de acceso. Puedes usarla la próxima vez que inicies sesión.',
    // src/lib/passkeys/management.ts:102
    setupFailed: 'La configuración quedó incompleta. Verifica tu conexión e inténtalo de nuevo.',
    // src/lib/passkeys/management.ts:110
    removed: 'Se quitó la llave de acceso.',
  },
} as const;
