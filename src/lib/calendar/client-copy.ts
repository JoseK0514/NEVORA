export const calendarFeedbackCopy = {
  en: {
    // src/lib/calendar/client.ts:6
    unknown: 'The result is unknown. Retry the original request to finish checking it. No new request will be created.',
    // src/lib/calendar/client.ts:42
    created: 'Link created. Copy it now to use it in your calendar app.',
    // src/lib/calendar/client.ts:42
    changedBeforeShown: 'The link changed before it could be shown. Review its current status.',
    // src/lib/calendar/client.ts:61
    checking: 'Checking the new link…',
    // src/lib/calendar/client.ts:61
    turnedOff: 'Link turned off. Calendar apps can’t get your shifts through it anymore.',
    // src/lib/calendar/client.ts:61
    earlier: 'Your earlier request went through, but the private link can’t be shown again. Get a new link if you still need to copy it.',
    // src/lib/calendar/client.ts:61
    changed: 'The link or your access changed. Review the current status before continuing.',
    // src/lib/calendar/client.ts:63
    denied: 'Your access could not be confirmed. Sign in again to check your calendar settings.',
    // src/lib/calendar/client.ts:71
    copied: 'Link copied.',
    // src/lib/calendar/client.ts:71
    copyFailed: 'Copy was unavailable. Select the link above, then copy it manually.',
  },
  es: {
    // src/lib/calendar/client.ts:6
    unknown: 'No pudimos confirmar el resultado. Reintenta la solicitud original para verificarla. No se creará una solicitud nueva.',
    // src/lib/calendar/client.ts:42
    created: 'Se creó el enlace. Cópialo ahora para usarlo en tu aplicación de calendario.',
    // src/lib/calendar/client.ts:42
    changedBeforeShown: 'El enlace cambió antes de mostrarse. Verifica su estado actual.',
    // src/lib/calendar/client.ts:61
    checking: 'Verificando el enlace nuevo…',
    // src/lib/calendar/client.ts:61
    turnedOff: 'Se desactivó el enlace. Las aplicaciones de calendario ya no pueden recibir tus turnos por ese enlace.',
    // src/lib/calendar/client.ts:61
    earlier: 'Se completó tu solicitud anterior, pero el enlace privado solo se muestra una vez. Genera otro enlace si necesitas copiarlo.',
    // src/lib/calendar/client.ts:61
    changed: 'El enlace o tu acceso cambió. Verifica el estado antes de continuar.',
    // src/lib/calendar/client.ts:63
    denied: 'No pudimos confirmar tu acceso. Inicia sesión de nuevo para verificar la configuración de tu calendario.',
    // src/lib/calendar/client.ts:71
    copied: 'Se copió el enlace.',
    // src/lib/calendar/client.ts:71
    copyFailed: 'No pudimos copiar el enlace. Selecciónalo arriba y cópialo manualmente.',
  },
} as const;
