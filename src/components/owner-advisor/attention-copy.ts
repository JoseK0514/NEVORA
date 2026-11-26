export const copy = {
  en: {
    // src/lib/owner-advisor/briefing.ts:20
    clockTitle: "Check shifts without a clock-in",
    // src/lib/owner-advisor/briefing.ts:21
    coverageTitle: "Review today's planning gaps",
    // src/lib/owner-advisor/briefing.ts:22
    finishedTitle: "Review finished shifts without punches",
    // src/lib/owner-advisor/briefing.ts:23
    setupTitle: "Complete coverage rules",
    // src/lib/owner-advisor/briefing.ts:75
    punchesSource: "Published shifts and recorded punches",
    // src/lib/owner-advisor/tools.server.ts:53
    todaySource: "Today on the floor",
    // src/lib/owner-advisor/briefing.ts:97
    clockOne: "{n} published shifts started without a recorded clock-in. Verify attendance before choosing coverage.",
    // src/lib/owner-advisor/briefing.ts:97
    clockOther: "{n} published shifts started without a recorded clock-in. Verify attendance before choosing coverage.",
    // src/lib/owner-advisor/briefing.ts:97
    finishedOne: "{n} finished published shifts have no recorded punches. Review the records before correcting time.",
    // src/lib/owner-advisor/briefing.ts:97
    finishedOther: "{n} finished published shifts have no recorded punches. Review the records before correcting time.",
    // src/lib/owner-advisor/briefing.ts:109
    coverageSetup: "Coverage cannot be fully assessed until missing or invalid staffing and coverage rules are reviewed.",
    // src/lib/owner-advisor/briefing.ts:117
    planningOne: "{n} planning periods need review, starting {time}.",
    // src/lib/owner-advisor/briefing.ts:117
    planningOther: "{n} planning periods need review, starting {time}.",
    // src/lib/owner-advisor/briefing.ts:117
    shortfall: "Maximum staffing shortfall: {n}.",
    // src/lib/owner-advisor/briefing.ts:117
    leadNeeded: "A designated lead is missing.",
    // src/lib/owner-advisor/briefing.ts:117
    positionsNeeded: "Unfilled positions: {names}.",
    // src/components/owner-advisor/attention.tsx:13
    draftNote: "Includes draft commitments; verify published staffing separately.",
    // src/components/owner-advisor/attention.tsx:14
    basisFromSchedule: "From the current schedule, including drafts",
    // src/components/owner-advisor/attention.tsx:17
    resolvedCoverage: "Current planning records meet coverage rules for the tracked periods.",
    // src/components/owner-advisor/attention.tsx:17
    resolvedSetup: "Coverage rules are now configured.",
    // src/components/owner-advisor/attention.tsx:17
    resolvedPunches: "Recorded punches now cover the tracked shifts.",
    // src/components/owner-advisor/attention.tsx:18
    notCurrent: "The original issue no longer matches current records. Resolution is unconfirmed.",
    // src/components/owner-advisor/attention.tsx:19
    unverified: "Current records cannot confirm a resolution.",
    // src/components/owner-advisor/attention.tsx:20
    evidenceChanged: "Evidence changed. This issue is shown for review again.",
    // src/components/owner-advisor/attention.tsx:21
    dismissed: "Marked not relevant today. The business issue remains open.",
    // src/components/owner-advisor/attention.tsx:22
    deferred: "Deferred until {deferredUntil}. The business issue remains open.",
    // src/components/owner-advisor/attention.tsx:23
    trackingOpen: "Tracking. The business issue remains open.",
    // src/components/owner-advisor/attention.tsx:60
    observed: "Observed ",
    // src/components/owner-advisor/attention.tsx:69
    reviewSource: "Review source",
    // src/components/owner-advisor/attention.tsx:79
    tracking: "Tracking",
    // src/components/owner-advisor/attention.tsx:79
    track: "Track this issue",
    // src/components/owner-advisor/attention.tsx:80
    later: "Later · 1 hour",
    // src/components/owner-advisor/attention.tsx:81
    dismiss: "Not relevant today",
    // src/components/owner-advisor/attention.tsx:85
    needsAttention: "Needs your attention",
    // src/components/owner-advisor/attention.tsx:89
    lede: "Today’s staffing and recorded-punch issues.",
    // src/components/owner-advisor/attention.tsx:93
    unavailableTitle: "The priority briefing is unavailable.",
    // src/components/owner-advisor/attention.tsx:93
    unavailableLine: "Check again to refresh the records.",
    // src/components/owner-advisor/attention.tsx:95
    partial: "Some sources could not be fully assessed. This briefing cannot confirm that everything is clear.",
    // src/components/owner-advisor/attention.tsx:97
    emptyHidden: "Your reviewed items are below. Deferring or dismissing an item does not resolve it.",
    // src/components/owner-advisor/attention.tsx:97
    emptyPartial: "No priority items could be confirmed from the available sources.",
    // src/components/owner-advisor/attention.tsx:97
    emptyClear: "No staffing or recorded-punch issues were found in today's assessed sources.",
    // src/components/owner-advisor/attention.tsx:117
    showing: "Showing {itemsCount} of {unreviewed} unreviewed items. Review the source screens for the full picture.",
    // src/components/owner-advisor/attention.tsx:119
    reviewed: "{reviewedCount} reviewed",
    // src/components/owner-advisor/attention.tsx:126
    restore: "Restore to briefing",
    // src/components/owner-advisor/attention.tsx:86
    labelCheckAgain: "Check again",
    // src/components/owner-advisor/attention.tsx:119
    labelFollowThrough: "Follow-through",
  },
  es: {
    // src/lib/owner-advisor/briefing.ts:20
    clockTitle: "Revisar turnos sin entrada",
    // src/lib/owner-advisor/briefing.ts:21
    coverageTitle: "Revisar turnos sin cubrir hoy",
    // src/lib/owner-advisor/briefing.ts:22
    finishedTitle: "Revisar turnos terminados sin marcaciones",
    // src/lib/owner-advisor/briefing.ts:23
    setupTitle: "Completar las reglas de cobertura",
    // src/lib/owner-advisor/briefing.ts:75
    punchesSource: "Turnos publicados y marcaciones registradas",
    // src/lib/owner-advisor/tools.server.ts:53
    todaySource: "Personal de hoy",
    // src/lib/owner-advisor/briefing.ts:97
    clockOne: "{n} turno publicado empezó sin una entrada registrada. Verifica la asistencia antes de buscar quién lo cubra.",
    // src/lib/owner-advisor/briefing.ts:97
    clockOther: "{n} turnos publicados empezaron sin una entrada registrada. Verifica la asistencia antes de buscar quién los cubra.",
    // src/lib/owner-advisor/briefing.ts:97
    finishedOne: "{n} turno publicado terminó sin marcaciones registradas. Revisa los registros antes de corregir las horas.",
    // src/lib/owner-advisor/briefing.ts:97
    finishedOther: "{n} turnos publicados terminaron sin marcaciones registradas. Revisa los registros antes de corregir las horas.",
    // src/lib/owner-advisor/briefing.ts:109
    coverageSetup: "Para verificar la cobertura, revisa las reglas de personal y cobertura que faltan o tienen errores.",
    // src/lib/owner-advisor/briefing.ts:117
    planningOne: "Hay {n} período por revisar a partir de {time}.",
    // src/lib/owner-advisor/briefing.ts:117
    planningOther: "Hay {n} períodos por revisar a partir de {time}.",
    // src/lib/owner-advisor/briefing.ts:117
    shortfall: "Máximo de personas que faltan: {n}.",
    // src/lib/owner-advisor/briefing.ts:117
    leadNeeded: "Falta un líder designado.",
    // src/lib/owner-advisor/briefing.ts:117
    positionsNeeded: "Puestos sin cubrir: {names}.",
    // src/components/owner-advisor/attention.tsx:13
    draftNote: "Incluye compromisos en borrador; verifica aparte el personal publicado.",
    // src/components/owner-advisor/attention.tsx:14
    basisFromSchedule: "Del horario actual, incluidos los borradores",
    // src/components/owner-advisor/attention.tsx:17
    resolvedCoverage: "Los registros de planificación actuales cumplen las reglas de cobertura de los períodos en seguimiento.",
    // src/components/owner-advisor/attention.tsx:17
    resolvedSetup: "Las reglas de cobertura ya están configuradas.",
    // src/components/owner-advisor/attention.tsx:17
    resolvedPunches: "Las marcaciones registradas ya cubren los turnos en seguimiento.",
    // src/components/owner-advisor/attention.tsx:18
    notCurrent: "El problema original ya no coincide con los registros actuales. La resolución está por confirmar.",
    // src/components/owner-advisor/attention.tsx:19
    unverified: "Los registros actuales no pueden confirmar una resolución.",
    // src/components/owner-advisor/attention.tsx:20
    evidenceChanged: "La evidencia cambió. Este problema se muestra de nuevo para revisión.",
    // src/components/owner-advisor/attention.tsx:21
    dismissed: "Marcado como no aplica hoy. El problema del negocio sigue abierto.",
    // src/components/owner-advisor/attention.tsx:22
    deferred: "Pospuesto hasta {deferredUntil}. El asunto sigue abierto.",
    // src/components/owner-advisor/attention.tsx:23
    trackingOpen: "En seguimiento. El problema del negocio sigue abierto.",
    // src/components/owner-advisor/attention.tsx:60
    observed: "Observado ",
    // src/components/owner-advisor/attention.tsx:69
    reviewSource: "Revisar fuente",
    // src/components/owner-advisor/attention.tsx:79
    tracking: "En seguimiento",
    // src/components/owner-advisor/attention.tsx:79
    track: "Dar seguimiento",
    // src/components/owner-advisor/attention.tsx:80
    later: "Más tarde · 1 hora",
    // src/components/owner-advisor/attention.tsx:81
    dismiss: "No aplica hoy",
    // src/components/owner-advisor/attention.tsx:85
    needsAttention: "Necesita tu atención",
    // src/components/owner-advisor/attention.tsx:89
    lede: "Problemas de hoy con el personal y las marcaciones registradas.",
    // src/components/owner-advisor/attention.tsx:93
    unavailableTitle: "El resumen de prioridades no está disponible.",
    // src/components/owner-advisor/attention.tsx:93
    unavailableLine: "Verifica de nuevo para actualizar los registros.",
    // src/components/owner-advisor/attention.tsx:95
    partial: "Algunas fuentes no se pudieron evaluar por completo. Este resumen no puede confirmar que todo esté en orden.",
    // src/components/owner-advisor/attention.tsx:97
    emptyHidden: "Tus elementos revisados están abajo. Posponer o descartar un elemento no lo resuelve.",
    // src/components/owner-advisor/attention.tsx:97
    emptyPartial: "No pudimos confirmar ningún elemento prioritario con las fuentes disponibles.",
    // src/components/owner-advisor/attention.tsx:97
    emptyClear: "No se encontraron problemas de personal ni de marcaciones en las fuentes evaluadas hoy.",
    // src/components/owner-advisor/attention.tsx:117
    showing: "Ves {itemsCount} de {unreviewed} asuntos por revisar. Consulta las pantallas de origen para verlos todos.",
    // src/components/owner-advisor/attention.tsx:119
    reviewed: "{reviewedCount} revisados",
    // src/components/owner-advisor/attention.tsx:126
    restore: "Devolver al resumen",
    // src/components/owner-advisor/attention.tsx:86
    labelCheckAgain: "Verificar de nuevo",
    // src/components/owner-advisor/attention.tsx:119
    labelFollowThrough: "Seguimiento",
  },
} as const;
