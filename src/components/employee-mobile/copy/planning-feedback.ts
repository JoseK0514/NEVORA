/* Signed-in Spanish (Nov 23, 2026): the result of a Time off or Availability submission (planning-feedback.tsx), in
 * English and Puerto Rico Spanish (docs/design/voice.md: what happened, then what to do; tú; the glossary: "Días
 * libres", "tu trabajo", "Iniciar sesión"). English is byte for byte what the screen said before. `messages` is keyed
 * by the server's result state, which is not translated. */
const en = {
  pending: 'Checking and saving your original submission…',
  status: 'Submission status',
  uncertain: 'The result couldn’t be confirmed. Your original submission is kept. Check its status before trying anything new.',
  checkStatus: 'Check submission status',
  messages: {
    conflict: 'Saved information changed. Refresh and review the current details before continuing.',
    locked: 'The deadline passed. This week is now read only. Your unsent edits are kept while this page stays open.',
    disabled: 'Time off is turned off for your company.',
    denied: 'Your access changed. Sign in again to continue.',
    invalid: 'Check the dates, times and confirmation before submitting.',
    missing: 'Your submission hasn’t been recorded.',
    unknown: 'The result couldn’t be confirmed. Check submission status before trying again.',
  },
};
const es: typeof en = {
  pending: 'Verificando y guardando tu envío original…',
  status: 'Estado del envío',
  uncertain: 'No pudimos confirmar el resultado. Tu envío original se conserva. Verifica su estado antes de intentar algo nuevo.',
  checkStatus: 'Verificar estado del envío',
  messages: {
    conflict: 'La información guardada cambió. Actualiza y revisa los datos actuales antes de continuar.',
    locked: 'Pasó la fecha límite. Esta semana ahora es solo de lectura. Tus cambios sin enviar se conservan mientras esta página siga abierta.',
    disabled: 'Los días libres están desactivados en tu trabajo.',
    denied: 'Tu acceso cambió. Inicia sesión de nuevo para continuar.',
    invalid: 'Revisa las fechas, las horas y la confirmación antes de enviar.',
    missing: 'Tu envío no se ha registrado.',
    unknown: 'No pudimos confirmar el resultado. Verifica el estado del envío antes de intentarlo de nuevo.',
  },
};
export const planningFeedbackCopy = {en, es};
