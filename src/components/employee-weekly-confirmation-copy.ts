export const copy = {
  en: {
    // src/components/employee-weekly-confirmation.tsx:33
    week: 'week:{weekStart}',
    // src/components/employee-weekly-confirmation.tsx:40
    retryConfirmation: 'Retry confirmation',
    // src/components/employee-weekly-confirmation.tsx:40
    confirmSchedule: 'Confirm schedule',
    // src/components/employee-weekly-confirmation.tsx:40
    confirming: 'Confirming…',
    // src/components/employee-weekly-confirmation.tsx:40
    confirmed: 'Confirmed',
    // src/components/employee-weekly-confirmation.tsx:40
    retry: 'Retry',
    // src/components/employee-weekly-confirmation.tsx:40, src/components/employee-weekly-confirmation.tsx:41
    confirm: 'Confirm',
    // src/components/employee-weekly-confirmation.tsx:41
    confirmPreparing: 'Confirm schedule, preparing',
    // src/components/employee-weekly-confirmation.tsx:41
    preparing: 'Preparing confirmation…',
    // src/components/employee-weekly-confirmation.tsx:42
    conflict: 'The schedule changed. Review the current week before confirming.',
    // src/components/employee-weekly-confirmation.tsx:42
    blocked: 'This review is no longer authorized. Sign in and review the schedule again.',
    // src/components/employee-weekly-confirmation.tsx:42
    confirmationOutcomeUnknownRetryCheckOriginal: 'Confirmation outcome unknown. Retry to check the original confirmation.',
    // src/components/employee-weekly-confirmation.tsx:42
    unavailable: 'Confirmation unavailable. Retry the original confirmation.',
    // src/components/employee-weekly-confirmation.tsx:45
    checking: 'Checking the current schedule confirmation…',
    // src/components/employee-weekly-confirmation.tsx:46
    reviewCurrent: 'Review current schedule',
  },
  es: {
    // src/components/employee-weekly-confirmation.tsx:33
    week: 'semana:{weekStart}',
    // src/components/employee-weekly-confirmation.tsx:40
    retryConfirmation: 'Reintentar confirmación',
    // src/components/employee-weekly-confirmation.tsx:40
    confirmSchedule: 'Confirmar horario',
    // src/components/employee-weekly-confirmation.tsx:40
    confirming: 'Confirmando…',
    // src/components/employee-weekly-confirmation.tsx:40
    confirmed: 'Confirmado',
    // src/components/employee-weekly-confirmation.tsx:40
    retry: 'Intentar de nuevo',
    // src/components/employee-weekly-confirmation.tsx:40, src/components/employee-weekly-confirmation.tsx:41
    confirm: 'Confirmar',
    // src/components/employee-weekly-confirmation.tsx:41
    confirmPreparing: 'Confirmar horario, preparando',
    // src/components/employee-weekly-confirmation.tsx:41
    preparing: 'Preparando la confirmación…',
    // src/components/employee-weekly-confirmation.tsx:42
    conflict: 'El horario cambió. Revisa la semana actual antes de confirmar.',
    // src/components/employee-weekly-confirmation.tsx:42
    blocked: 'Ya no tienes autorización para esta revisión. Inicia sesión y revisa el horario otra vez.',
    // src/components/employee-weekly-confirmation.tsx:42
    confirmationOutcomeUnknownRetryCheckOriginal: 'No sabemos si se confirmó. Reintenta para verificar la confirmación original.',
    // src/components/employee-weekly-confirmation.tsx:42
    unavailable: 'La confirmación no está disponible. Reintenta la confirmación original.',
    // src/components/employee-weekly-confirmation.tsx:45
    checking: 'Verificando la confirmación del horario actual…',
    // src/components/employee-weekly-confirmation.tsx:46
    reviewCurrent: 'Revisar horario actual',
  },
} as const;
