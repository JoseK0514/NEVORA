export const DASHBOARD_COPY = {
  en: {
    // manager-dashboard.tsx:135–141 at 8c6ee1b67
    revision: { PUBLISH: 'Schedule published', OPEN_SHIFT: 'Open shift claimed', EXCHANGE: 'Shift request applied', CALLOUT: 'Can’t-work request applied', other: 'Published schedule updated' },
    // manager-dashboard.tsx:198–223 at 8c6ee1b67
    today: 'Today', schedule: 'Schedule', activity: 'Activity', allLocations: 'All locations',
    previousWeek: 'Previous week', nextWeek: 'Next week',
    showMore: (count: number) => `Show ${count} more in Things to do`,
    empty: 'Schedule publications and requests show up here.',
    comingUp: 'Coming up', openInbox: 'Open Things to do',
    // manager-dashboard.tsx:297, 314 at 8c6ee1b67
    clockerRecovery: 'Clocker recovery',
  },
  es: {
    // manager-dashboard.tsx:135–141 at 8c6ee1b67
    revision: { PUBLISH: 'Horario publicado', OPEN_SHIFT: 'Turno disponible tomado', EXCHANGE: 'Cambio de turno aplicado', CALLOUT: 'Aviso de ausencia aplicado', other: 'Horario publicado actualizado' },
    // manager-dashboard.tsx:198–223 at 8c6ee1b67
    today: 'Hoy', schedule: 'Horario', activity: 'Actividad', allLocations: 'Todas las localidades',
    previousWeek: 'Semana anterior', nextWeek: 'Semana siguiente',
    showMore: (count: number) => `Ver ${count} más en Pendientes`,
    empty: 'Aquí se ven los horarios publicados y las solicitudes.',
    comingUp: 'Próximamente', openInbox: 'Abrir Pendientes',
    // manager-dashboard.tsx:297, 314 at 8c6ee1b67
    clockerRecovery: 'Recuperación del Clocker',
  },
} as const;

export const copy = {
  en: {
    // src/components/manager-dashboard.tsx:116
    overview: 'Overview',
    // src/components/manager-dashboard.tsx:117, src/components/manager-dashboard.tsx:269
    whoWorking: 'Who’s working',
    // src/components/manager-dashboard.tsx:118, src/components/manager-dashboard.tsx:156, src/components/manager-dashboard.tsx:158, src/components/manager-dashboard.tsx:270
    hoursThisWeek: 'Hours this week',
    // src/components/manager-dashboard.tsx:119, src/components/manager-dashboard.tsx:208, src/components/manager-dashboard.tsx:209, src/components/manager-dashboard.tsx:271
    activity: 'Activity',
    // src/components/manager-dashboard.tsx:132
    schedulePublished: 'Schedule published',
    // src/components/manager-dashboard.tsx:133
    openShiftClaimed: 'Open shift claimed',
    // src/components/manager-dashboard.tsx:134
    shiftRequestApplied: 'Shift request applied',
    // src/components/manager-dashboard.tsx:135
    canWorkRequestApplied: 'Can’t-work request applied',
    // src/components/manager-dashboard.tsx:136
    publishedScheduleUpdated: 'Published schedule updated',
    // src/components/manager-dashboard.tsx:146
    week: 'This week',
    // src/components/manager-dashboard.tsx:164
    hoursAppearHereAsShiftsAre: 'Hours appear here as shifts are added.',
    // src/components/manager-dashboard.tsx:190
    open: 'Open',
    // src/components/manager-dashboard.tsx:199
    today: 'Today · {text}',
    // src/components/manager-dashboard.tsx:211
    allLocations: '{weekLabel} · All locations',
    // src/components/manager-dashboard.tsx:213
    previousWeek: 'Previous week',
    // src/components/manager-dashboard.tsx:214
    nextWeek: 'Next week',
    // src/components/manager-dashboard.tsx:220
    schedulePublicationsRequestsShowUpHere: 'Schedule publications and requests show up here.',
    // src/components/manager-dashboard.tsx:221, src/components/manager-dashboard.tsx:222
    comingUp: 'Coming up',
    // src/components/manager-dashboard.tsx:238
    stage: 'draft',
    // src/components/manager-dashboard.tsx:256
    welcomeBack: 'Welcome back, {firstName}',
    // src/components/manager-dashboard.tsx:269
    summary: 'Clock-ins today and corrections to review.',
    // src/components/manager-dashboard.tsx:270
    summaryLabel: 'Hours and availability by person.',
    // src/components/manager-dashboard.tsx:271
    summary2: 'Publications and changes.',
    // src/components/manager-dashboard.tsx:289, src/components/manager-dashboard.tsx:305
    recoveryTitle: 'Clocker recovery',
  },
  es: {
    // src/components/manager-dashboard.tsx:116
    overview: 'Resumen',
    // src/components/manager-dashboard.tsx:117, src/components/manager-dashboard.tsx:269
    whoWorking: 'Quién está en turno',
    // src/components/manager-dashboard.tsx:118, src/components/manager-dashboard.tsx:156, src/components/manager-dashboard.tsx:158, src/components/manager-dashboard.tsx:270
    hoursThisWeek: 'Horas esta semana',
    // src/components/manager-dashboard.tsx:119, src/components/manager-dashboard.tsx:208, src/components/manager-dashboard.tsx:209, src/components/manager-dashboard.tsx:271
    activity: 'Actividad',
    // src/components/manager-dashboard.tsx:132
    schedulePublished: 'Horario publicado',
    // src/components/manager-dashboard.tsx:133
    openShiftClaimed: 'Turno disponible reclamado',
    // src/components/manager-dashboard.tsx:134
    shiftRequestApplied: 'Se ha aplicado la solicitud de turno',
    // src/components/manager-dashboard.tsx:135
    canWorkRequestApplied: 'Se ha aplicado la solicitud de no poder trabajar',
    // src/components/manager-dashboard.tsx:136
    publishedScheduleUpdated: 'Horario publicado actualizado',
    // src/components/manager-dashboard.tsx:146
    week: 'Esta semana',
    // src/components/manager-dashboard.tsx:164
    hoursAppearHereAsShiftsAre: 'Las horas aparecen aquí a medida que se añaden turnos',
    // src/components/manager-dashboard.tsx:190
    open: 'Abrir',
    // src/components/manager-dashboard.tsx:199
    today: 'Hoy · {text}',
    // src/components/manager-dashboard.tsx:211
    allLocations: '{weekLabel} · Todas las localidades',
    // src/components/manager-dashboard.tsx:213
    previousWeek: 'Semana anterior',
    // src/components/manager-dashboard.tsx:214
    nextWeek: 'Próxima semana',
    // src/components/manager-dashboard.tsx:220
    schedulePublicationsRequestsShowUpHere: 'Aquí aparecen los horarios de publicaciones y solicitudes',
    // src/components/manager-dashboard.tsx:221, src/components/manager-dashboard.tsx:222
    comingUp: 'Próximos turnos',
    // src/components/manager-dashboard.tsx:238
    stage: 'su borrador',
    // src/components/manager-dashboard.tsx:256
    welcomeBack: 'Hola de nuevo, {firstName}',
    // src/components/manager-dashboard.tsx:269
    summary: 'Horarios de entrada de hoy y correcciones para revisar',
    // src/components/manager-dashboard.tsx:270
    summaryLabel: 'Horas y disponibilidad por persona',
    // src/components/manager-dashboard.tsx:271
    summary2: 'Publicaciones y cambios',
    // src/components/manager-dashboard.tsx:289, src/components/manager-dashboard.tsx:305
    recoveryTitle: 'Recuperación de Clocker',
  },
} as const;
