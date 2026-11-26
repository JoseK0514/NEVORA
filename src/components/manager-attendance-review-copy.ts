export const ATTENDANCE_REVIEW_COPY = {
  en: {
    // manager-attendance-review.tsx:109 at 8c6ee1b67
    unmatched: "This clock-in doesn’t match a scheduled shift.",
    // manager-attendance-review.tsx:110 at 8c6ee1b67
    ambiguous: "We couldn’t tell which shift this clock-in belongs to.",
    // manager-attendance-review.tsx:111 at 8c6ee1b67
    inconsistent: "These clock times don’t add up. Check the timecard.",
    // manager-attendance-review.tsx:168 at 8c6ee1b67
    today: "Today’s clock-ins",
    // manager-attendance-review.tsx:172 at 8c6ee1b67
    summary: "Attendance exception summary",
    // manager-attendance-review.tsx:175 at 8c6ee1b67
    person: "person affected",
    // manager-attendance-review.tsx:175 at 8c6ee1b67
    people: "people affected",
    // manager-attendance-review.tsx:175 at 8c6ee1b67
    correction: "time correction",
    // manager-attendance-review.tsx:175 at 8c6ee1b67
    corrections: "time corrections",
    // manager-attendance-review.tsx:175 at 8c6ee1b67
    waiting: "waiting",
    // manager-attendance-review.tsx:180 at 8c6ee1b67
    limited: "Some comparisons are limited",
    // manager-attendance-review.tsx:187 at 8c6ee1b67
    review: "Clock-ins to review",
    // manager-attendance-review.tsx:209 at 8c6ee1b67
    nothing: "Nothing to review",
    // manager-attendance-review.tsx:209 at 8c6ee1b67
    nothingDetail: "No clock-ins need a look right now.",
    // manager-attendance-review.tsx:214 at 8c6ee1b67
    paused: "Attendance paused",
    // manager-attendance-review.tsx:214 at 8c6ee1b67
    offline: "You’re offline",
    // manager-attendance-review.tsx:214 at 8c6ee1b67
    signInAgain: "Sign in again",
    // manager-attendance-review.tsx:214 at 8c6ee1b67
    unavailable: "Attendance unavailable",
    // manager-attendance-review.tsx:214 at 8c6ee1b67
    loading: "Loading attendance",
    // manager-attendance-review.tsx:216 at 8c6ee1b67
    back: "Updates when you’re back.",
    // manager-attendance-review.tsx:216 at 8c6ee1b67
    reconnect: "Updates when you reconnect.",
    // manager-attendance-review.tsx:216 at 8c6ee1b67
    access: "Manager or Owner access is needed.",
    // manager-attendance-review.tsx:216 at 8c6ee1b67
    latest: "The latest records didn’t load.",
    // manager-attendance-review.tsx:216 at 8c6ee1b67
    checkingRecords: "Checking today’s clock records.",
    // manager-attendance-review.tsx:226 at 8c6ee1b67
    updated: "Updated ",
    // manager-attendance-review.tsx:227 at 8c6ee1b67
    shortPaused: "Paused.",
    // manager-attendance-review.tsx:227 at 8c6ee1b67
    shortOffline: "Offline.",
    // manager-attendance-review.tsx:228 at 8c6ee1b67
    noAccess: "No access.",
    // manager-attendance-review.tsx:229 at 8c6ee1b67
    updateFailed: "Couldn’t update.",
    // manager-attendance-review.tsx:230 at 8c6ee1b67
    checking: "Checking…",
    // manager-attendance-review.tsx:232 at 8c6ee1b67
    offlineSuffix: " · Offline.",
    // manager-attendance-review.tsx:232 at 8c6ee1b67
    updateRate: " · Updates every 30 seconds.",
    // manager-attendance-review.tsx:232 at 8c6ee1b67
    tryRefresh: " · Try Refresh.",
    // manager-attendance-review.tsx:171 at 8c6ee1b67
    signIn: "Sign in",
    // manager-attendance-review.tsx:244 at 8c6ee1b67
    refreshAria: "Refresh attendance review",
    // manager-attendance-review.tsx:244 at 8c6ee1b67
    refreshingAria: "Refreshing attendance review",
    // manager-attendance-review.tsx:246 at 8c6ee1b67
    refreshing: "Refreshing…",
    // manager-attendance-review.tsx:148 at 8c6ee1b67
    refresh: "Refresh",
    // manager-attendance-review.tsx:24 at 8c6ee1b67
    kind0: "Time record needs review",
    // manager-attendance-review.tsx:25 at 8c6ee1b67
    kind1: "Schedule not matched",
    // manager-attendance-review.tsx:26 at 8c6ee1b67
    kind2: "Schedule match unclear",
    // manager-attendance-review.tsx:27 at 8c6ee1b67
    kind3: "Clock-in after scheduled start",
    // manager-attendance-review.tsx:28 at 8c6ee1b67
    kind4: "Clock-out before scheduled end",
    // manager-attendance-review.tsx:29 at 8c6ee1b67
    kind5: "No clock-out after scheduled end",
    // manager-attendance-review.tsx:32 at 8c6ee1b67
    kind6: "No clock-out after 12 hours",
    // manager-attendance-review.tsx:33 at 8c6ee1b67
    kind7: "Break exceeded saved target",
    // manager-attendance-review.tsx:168 at 8c6ee1b67
    toReview: (count: number) => `${count} to review`,
    // manager-attendance-review.tsx:180 at 8c6ee1b67
    limitedDetail: (count: number) => `${count} recorded item${count === 1 ? "" : "s"} could not be fully compared with saved schedule or break context.`,
  },
  es: {
    // manager-attendance-review.tsx:109 at 8c6ee1b67
    unmatched: "Esta entrada no coincide con un turno programado.",
    // manager-attendance-review.tsx:110 at 8c6ee1b67
    ambiguous: "No pudimos identificar el turno de esta entrada.",
    // manager-attendance-review.tsx:111 at 8c6ee1b67
    inconsistent: "Los ponches no cuadran. Revisa la tarjeta de tiempo.",
    // manager-attendance-review.tsx:168 at 8c6ee1b67
    today: "Entradas de hoy",
    // manager-attendance-review.tsx:172 at 8c6ee1b67
    summary: "Resumen de asistencia",
    // manager-attendance-review.tsx:175 at 8c6ee1b67
    person: "persona afectada",
    // manager-attendance-review.tsx:175 at 8c6ee1b67
    people: "personas afectadas",
    // manager-attendance-review.tsx:175 at 8c6ee1b67
    correction: "corrección de tiempo",
    // manager-attendance-review.tsx:175 at 8c6ee1b67
    corrections: "correcciones de tiempo",
    // manager-attendance-review.tsx:175 at 8c6ee1b67
    waiting: "pendientes",
    // manager-attendance-review.tsx:180 at 8c6ee1b67
    limited: "Algunas comparaciones son parciales",
    // manager-attendance-review.tsx:187 at 8c6ee1b67
    review: "Entradas por revisar",
    // manager-attendance-review.tsx:209 at 8c6ee1b67
    nothing: "Nada por revisar",
    // manager-attendance-review.tsx:209 at 8c6ee1b67
    nothingDetail: "Por ahora no hay entradas que revisar.",
    // manager-attendance-review.tsx:214 at 8c6ee1b67
    paused: "Asistencia en pausa",
    // manager-attendance-review.tsx:214 at 8c6ee1b67
    offline: "Estás sin conexión",
    // manager-attendance-review.tsx:214 at 8c6ee1b67
    signInAgain: "Volver a iniciar sesión",
    // manager-attendance-review.tsx:214 at 8c6ee1b67
    unavailable: "Asistencia no disponible",
    // manager-attendance-review.tsx:214 at 8c6ee1b67
    loading: "Cargando asistencia",
    // manager-attendance-review.tsx:216 at 8c6ee1b67
    back: "Se actualiza cuando vuelvas.",
    // manager-attendance-review.tsx:216 at 8c6ee1b67
    reconnect: "Se actualiza al reconectarte.",
    // manager-attendance-review.tsx:216 at 8c6ee1b67
    access: "Se requiere acceso de gerente o dueño.",
    // manager-attendance-review.tsx:216 at 8c6ee1b67
    latest: "No cargaron los últimos registros.",
    // manager-attendance-review.tsx:216 at 8c6ee1b67
    checkingRecords: "Verificando los ponches de hoy.",
    // manager-attendance-review.tsx:226 at 8c6ee1b67
    updated: "Actualizado ",
    // manager-attendance-review.tsx:227 at 8c6ee1b67
    shortPaused: "En pausa.",
    // manager-attendance-review.tsx:227 at 8c6ee1b67
    shortOffline: "Sin conexión.",
    // manager-attendance-review.tsx:228 at 8c6ee1b67
    noAccess: "Sin acceso.",
    // manager-attendance-review.tsx:229 at 8c6ee1b67
    updateFailed: "No se pudo actualizar.",
    // manager-attendance-review.tsx:230 at 8c6ee1b67
    checking: "Verificando…",
    // manager-attendance-review.tsx:232 at 8c6ee1b67
    offlineSuffix: " · Sin conexión.",
    // manager-attendance-review.tsx:232 at 8c6ee1b67
    updateRate: " · Se actualiza cada 30 segundos.",
    // manager-attendance-review.tsx:232 at 8c6ee1b67
    tryRefresh: " · Intenta actualizar.",
    // manager-attendance-review.tsx:171 at 8c6ee1b67
    signIn: "Iniciar sesión",
    // manager-attendance-review.tsx:244 at 8c6ee1b67
    refreshAria: "Actualizar revisión de asistencia",
    // manager-attendance-review.tsx:244 at 8c6ee1b67
    refreshingAria: "Actualizando revisión de asistencia",
    // manager-attendance-review.tsx:246 at 8c6ee1b67
    refreshing: "Actualizando…",
    // manager-attendance-review.tsx:148 at 8c6ee1b67
    refresh: "Actualizar",
    // manager-attendance-review.tsx:24 at 8c6ee1b67
    kind0: "Revisar registro de tiempo",
    // manager-attendance-review.tsx:25 at 8c6ee1b67
    kind1: "Sin turno correspondiente",
    // manager-attendance-review.tsx:26 at 8c6ee1b67
    kind2: "Turno sin confirmar",
    // manager-attendance-review.tsx:27 at 8c6ee1b67
    kind3: "Entrada después de la hora programada",
    // manager-attendance-review.tsx:28 at 8c6ee1b67
    kind4: "Salida antes de la hora programada",
    // manager-attendance-review.tsx:29 at 8c6ee1b67
    kind5: "Sin salida después de la hora programada",
    // manager-attendance-review.tsx:32 at 8c6ee1b67
    kind6: "Sin salida después de 12 horas",
    // manager-attendance-review.tsx:33 at 8c6ee1b67
    kind7: "Descanso más largo de lo previsto",
    // manager-attendance-review.tsx:168 at 8c6ee1b67
    toReview: (count: number) => `${count} por revisar`,
    // manager-attendance-review.tsx:180 at 8c6ee1b67
    limitedDetail: (count: number) => `No se pudo comparar ${count === 1 ? "el registro" : `los ${count} registros`} por completo con el horario o los descansos guardados.`,
  },
} as const;

export const copy = {
  en: {
    // src/components/manager-attendance-review.tsx:24
    timeRecordNeedsReview: 'Time record needs review',
    // src/components/manager-attendance-review.tsx:25
    scheduleNotMatched: 'Schedule not matched',
    // src/components/manager-attendance-review.tsx:26
    scheduleMatchUnclear: 'Schedule match unclear',
    // src/components/manager-attendance-review.tsx:27
    clockInAfterScheduledStart: 'Clock-in after scheduled start',
    // src/components/manager-attendance-review.tsx:28
    clockOutBeforeScheduledEnd: 'Clock-out before scheduled end',
    // src/components/manager-attendance-review.tsx:29
    noClockOutAfterScheduledEnd: 'No clock-out after scheduled end',
    // src/components/manager-attendance-review.tsx:32
    noClockOutAfterHours: 'No clock-out after 12 hours',
    // src/components/manager-attendance-review.tsx:33
    breakExceededSavedTarget: 'Break exceeded saved target',
    // src/components/manager-attendance-review.tsx:71
    yesterday: '{time} yesterday',
    // src/components/manager-attendance-review.tsx:87
    openSince: 'Open {open}, since {since}',
    // src/components/manager-attendance-review.tsx:87
    openLabel: 'Open {open}',
    // src/components/manager-attendance-review.tsx:98
    min: '<1 min',
    // src/components/manager-attendance-review.tsx:109
    clockInDoesnMatchScheduledShift: 'This clock-in doesn’t match a scheduled shift.',
    // src/components/manager-attendance-review.tsx:110
    weCouldnTellWhichShiftClock: 'We couldn’t tell which shift this clock-in belongs to.',
    // src/components/manager-attendance-review.tsx:111
    theseClockTimesDonAddUp: 'These clock times don’t add up. Check the timecard.',
    // src/components/manager-attendance-review.tsx:168
    todayClockIns: 'Today’s clock-ins',
    // src/components/manager-attendance-review.tsx:168
    toReviewCount: '{signalCount} to review',
    // src/components/manager-attendance-review.tsx:172
    attendanceExceptionSummary: 'Attendance exception summary',
    // src/components/manager-attendance-review.tsx:180
    someComparisonsAreLimited: 'Some comparisons are limited',
    // src/components/manager-attendance-review.tsx:181
    recordedItemCouldNotBeFullyOne: '{limitationsCount} recorded item could not be fully compared with saved schedule or break context.',
    // src/components/manager-attendance-review.tsx:181
    recordedItemsCouldNotBeFullyOther: '{limitationsCount} recorded items could not be fully compared with saved schedule or break context.',
    // src/components/manager-attendance-review.tsx:187
    clockInsReview: 'Clock-ins to review',
    // src/components/manager-attendance-review.tsx:209
    nothingReview: 'Nothing to review',
    // src/components/manager-attendance-review.tsx:209
    line: 'No clock-ins need a look right now.',
    // src/components/manager-attendance-review.tsx:214
    attendancePaused: 'Attendance paused',
    // src/components/manager-attendance-review.tsx:214
    offlineTitle: 'You’re offline',
    // src/components/manager-attendance-review.tsx:214
    signIn: 'Sign in again',
    // src/components/manager-attendance-review.tsx:214
    attendanceUnavailable: 'Attendance unavailable',
    // src/components/manager-attendance-review.tsx:214
    loadingAttendance: 'Loading attendance',
    // src/components/manager-attendance-review.tsx:215
    updatesBack: 'Updates when you’re back.',
    // src/components/manager-attendance-review.tsx:215
    updatesReconnect: 'Updates when you reconnect.',
    // src/components/manager-attendance-review.tsx:215
    lineLabel: 'Manager or Owner access is needed.',
    // src/components/manager-attendance-review.tsx:215
    line2: 'The latest records didn’t load.',
    // src/components/manager-attendance-review.tsx:215
    line3: 'Checking today’s clock records.',
    // src/components/manager-attendance-review.tsx:226, src/components/manager-attendance-review.tsx:227
    paused: 'Paused.',
    // src/components/manager-attendance-review.tsx:226, src/components/manager-attendance-review.tsx:227
    offline: 'Offline.',
    // src/components/manager-attendance-review.tsx:226, src/components/manager-attendance-review.tsx:228
    noAccess: 'No access.',
    // src/components/manager-attendance-review.tsx:226, src/components/manager-attendance-review.tsx:229
    couldnUpdate: 'Couldn’t update.',
    // src/components/manager-attendance-review.tsx:226, src/components/manager-attendance-review.tsx:230
    checkingBusy: 'Checking…',
    // src/components/manager-attendance-review.tsx:226
    updated: 'Updated ',
    // src/components/manager-attendance-review.tsx:232
    offline2: ' · Offline.',
    // src/components/manager-attendance-review.tsx:232
    updatesEverySeconds: ' · Updates every 30 seconds.',
    // src/components/manager-attendance-review.tsx:232
    tryRefresh: ' · Try Refresh.',
    // src/components/manager-attendance-review.tsx:235
    signIn2: 'Sign in',
    // src/components/manager-attendance-review.tsx:244
    refreshingAttendanceReview: 'Refreshing attendance review',
    // src/components/manager-attendance-review.tsx:244
    refreshAttendanceReview: 'Refresh attendance review',
    // src/components/manager-attendance-review.tsx:246
    refreshing: 'Refreshing…',
    // src/components/manager-attendance-review.tsx:246
    refresh: 'Refresh',
  },
  es: {
    // src/components/manager-attendance-review.tsx:24
    timeRecordNeedsReview: 'El registro de tiempo necesita revisión',
    // src/components/manager-attendance-review.tsx:25
    scheduleNotMatched: 'Horario no coincidente',
    // src/components/manager-attendance-review.tsx:26
    scheduleMatchUnclear: 'El calendario del partido es poco claro',
    // src/components/manager-attendance-review.tsx:27
    clockInAfterScheduledStart: 'Incorporarse después de la hora de inicio programada',
    // src/components/manager-attendance-review.tsx:28
    clockOutBeforeScheduledEnd: 'Salida antes de la fecha de finalización programada',
    // src/components/manager-attendance-review.tsx:29
    noClockOutAfterScheduledEnd: 'Sin baja después de la fecha de finalización programada',
    // src/components/manager-attendance-review.tsx:32
    noClockOutAfterHours: 'No hay salida después de 12 horas',
    // src/components/manager-attendance-review.tsx:33
    breakExceededSavedTarget: 'Se ha superado la ruptura del objetivo guardado',
    // src/components/manager-attendance-review.tsx:71
    yesterday: '{time} ayer',
    // src/components/manager-attendance-review.tsx:87
    openSince: 'Abre {open}, ya que {since}',
    // src/components/manager-attendance-review.tsx:87
    openLabel: 'Abrir {open}',
    // src/components/manager-attendance-review.tsx:98
    min: '< 1 min',
    // src/components/manager-attendance-review.tsx:109
    clockInDoesnMatchScheduledShift: 'Esta entrada de hora no coincide con un turno programado',
    // src/components/manager-attendance-review.tsx:110
    weCouldnTellWhichShiftClock: 'No pudimos saber a qué turno pertenece este registro de entrada',
    // src/components/manager-attendance-review.tsx:111
    theseClockTimesDonAddUp: 'Estos horarios de reloj no suman. Verifica la tarjeta de tiempo',
    // src/components/manager-attendance-review.tsx:168
    todayClockIns: 'Las entradas de hoy',
    // src/components/manager-attendance-review.tsx:168
    toReviewCount: '{signalCount} por revisar',
    // src/components/manager-attendance-review.tsx:172
    attendanceExceptionSummary: 'Resumen de la excepción de asistencia',
    // src/components/manager-attendance-review.tsx:180
    someComparisonsAreLimited: 'Algunas comparaciones son limitadas',
    // src/components/manager-attendance-review.tsx:181
    recordedItemCouldNotBeFullyOne: 'El artículo registrado {limitationsCount} no pudo compararse completamente con el horario guardado o el contexto de descanso',
    // src/components/manager-attendance-review.tsx:181
    recordedItemsCouldNotBeFullyOther: 'Los elementos registrados en {limitationsCount} no pudieron compararse completamente con el horario guardado o el contexto de descanso',
    // src/components/manager-attendance-review.tsx:187
    clockInsReview: 'Horarios de entrada para revisar',
    // src/components/manager-attendance-review.tsx:209
    nothingReview: 'Nada que revisar',
    // src/components/manager-attendance-review.tsx:209
    line: 'No se necesitan registros de inicio de sesión ahora mismo',
    // src/components/manager-attendance-review.tsx:214
    attendancePaused: 'Asistencia pausada',
    // src/components/manager-attendance-review.tsx:214
    offlineTitle: 'No tienes conexión',
    // src/components/manager-attendance-review.tsx:214
    signIn: 'Iniciar sesión de nuevo',
    // src/components/manager-attendance-review.tsx:214
    attendanceUnavailable: 'Asistencia no disponible',
    // src/components/manager-attendance-review.tsx:214
    loadingAttendance: 'Cargando asistencia',
    // src/components/manager-attendance-review.tsx:215
    updatesBack: 'Se actualiza cuando regreses.',
    // src/components/manager-attendance-review.tsx:215
    updatesReconnect: 'Se actualiza cuando vuelvas a conectarte.',
    // src/components/manager-attendance-review.tsx:215
    lineLabel: 'Se necesita acceso del gerente o del dueño',
    // src/components/manager-attendance-review.tsx:215
    line2: 'Los registros más recientes no se cargaron',
    // src/components/manager-attendance-review.tsx:215
    line3: 'Revisando los registros del reloj de hoy',
    // src/components/manager-attendance-review.tsx:226, src/components/manager-attendance-review.tsx:227
    paused: 'Pausado',
    // src/components/manager-attendance-review.tsx:226, src/components/manager-attendance-review.tsx:227
    offline: 'Sin conexión',
    // src/components/manager-attendance-review.tsx:226, src/components/manager-attendance-review.tsx:228
    noAccess: 'Sin acceso',
    // src/components/manager-attendance-review.tsx:226, src/components/manager-attendance-review.tsx:229
    couldnUpdate: 'No se pudo actualizar',
    // src/components/manager-attendance-review.tsx:226, src/components/manager-attendance-review.tsx:230
    checkingBusy: 'Revisando…',
    // src/components/manager-attendance-review.tsx:226
    updated: 'Actualizado ',
    // src/components/manager-attendance-review.tsx:232
    offline2: ' · Fuera de línea',
    // src/components/manager-attendance-review.tsx:232
    updatesEverySeconds: ' · Actualizaciones cada 30 segundos',
    // src/components/manager-attendance-review.tsx:232
    tryRefresh: ' · Prueba con Recargar',
    // src/components/manager-attendance-review.tsx:235
    signIn2: 'Iniciar sesión',
    // src/components/manager-attendance-review.tsx:244
    refreshingAttendanceReview: 'Revisión de asistencia refrescante',
    // src/components/manager-attendance-review.tsx:244
    refreshAttendanceReview: 'Revisión de asistencia actualizada',
    // src/components/manager-attendance-review.tsx:246
    refreshing: 'Refrescante',
    // src/components/manager-attendance-review.tsx:246
    refresh: 'Actualizar',
  },
} as const;
