export const copy = {
  en: {
    // src/components/shift-change-form-state.ts:26
    completedCurrentScheduleRequestHistoryHave: "Completed. The current schedule and request history have been refreshed.",
    // src/components/shift-change-form-state.ts:27
    requestRecordedReviewItsCurrentStatus: "Request recorded. Review its current status below; an assignment may still be awaiting consent or management review.",
    // src/components/shift-change-form-state.ts:28
    requestClosedReviewItsCurrentStatus: "Request closed. Review its current status below.",
    // src/components/shift-change-form-state.ts:29
    staleRequestAssignmentRequestChangedReload: "Stale request. The assignment or request changed; reload and review before submitting again.",
    // src/components/shift-change-form-state.ts:30
    actionUnavailableCurrentAccountRequest: "This action is unavailable for your current account or request.",
    // src/components/shift-change-form-state.ts:31
    changeCannotProceedCurrentRules: "This change cannot proceed with the current rules.",
    // src/components/shift-change-form-state.ts:32
    outcomeUncertainRequestMayHaveBeen: "Outcome uncertain. The request may have been saved. Check and retry the same operation; your original entries are preserved.",
  },
  es: {
    // src/components/shift-change-form-state.ts:26
    completedCurrentScheduleRequestHistoryHave: "Listo. Se actualizaron el horario y el historial de solicitudes.",
    // src/components/shift-change-form-state.ts:27
    requestRecordedReviewItsCurrentStatus: "Solicitud registrada. Revisa su estado abajo; puede que una asignación todavía espere aceptación o revisión de la gerencia.",
    // src/components/shift-change-form-state.ts:28
    requestClosedReviewItsCurrentStatus: "Solicitud cerrada. Revisa su estado abajo.",
    // src/components/shift-change-form-state.ts:29
    staleRequestAssignmentRequestChangedReload: "Solicitud desactualizada. La asignación o la solicitud cambió; vuelve a cargar y revisa antes de enviarla otra vez.",
    // src/components/shift-change-form-state.ts:30
    actionUnavailableCurrentAccountRequest: "Esta acción no está disponible para tu cuenta o esta solicitud.",
    // src/components/shift-change-form-state.ts:31
    changeCannotProceedCurrentRules: "Este cambio no puede seguir con las reglas actuales.",
    // src/components/shift-change-form-state.ts:32
    outcomeUncertainRequestMayHaveBeen: "Resultado sin confirmar. Puede que la solicitud se haya guardado. Revisa y reintenta la misma operación; se guardan tus datos originales.",
  },
} as const;

export const shiftChangeFormStateCopy = {
  en: {
    feedback: {
      // shift-change-form-state.ts:26
      completed: 'Completed. The current schedule and request history have been refreshed.',
      // shift-change-form-state.ts:27
      pending: 'Request recorded. Review its current status below; an assignment may still be awaiting consent or management review.',
      // shift-change-form-state.ts:28
      closed: 'Request closed. Review its current status below.',
      // shift-change-form-state.ts:29
      conflict: 'Stale request. The assignment or request changed; reload and review before submitting again.',
      // shift-change-form-state.ts:30
      unavailable: 'This action is unavailable for your current account or request.',
      // shift-change-form-state.ts:31
      blocked: 'This change cannot proceed with the current rules.',
      // shift-change-form-state.ts:32
      outcomeUnknown: 'Outcome uncertain. The request may have been saved. Check and retry the same operation; your original entries are preserved.',
    },
  },
  es: {
    feedback: {
      completed: 'Listo. Se actualizaron el horario y el historial de solicitudes.',
      pending: 'Solicitud registrada. Revisa su estado abajo; puede que una asignación todavía espere aceptación o revisión de la gerencia.',
      closed: 'Solicitud cerrada. Revisa su estado abajo.',
      conflict: 'Solicitud desactualizada. La asignación o la solicitud cambió; vuelve a cargar y revisa antes de enviarla otra vez.',
      unavailable: 'Esta acción no está disponible para tu cuenta o esta solicitud.',
      blocked: 'Este cambio no puede seguir con las reglas actuales.',
      outcomeUnknown: 'Resultado sin confirmar. Puede que la solicitud se haya guardado. Revisa y reintenta la misma operación; se guardan tus datos originales.',
    },
  },
} as const;
