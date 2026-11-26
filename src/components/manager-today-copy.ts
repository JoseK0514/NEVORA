export const copy = {
  en: {
    // src/components/manager-today.tsx:44, src/components/manager-today.tsx:48, src/components/manager-today.tsx:60
    today: 'Today',
    // src/components/manager-today.tsx:46
    loadingToday: 'Loading today',
    // src/components/manager-today.tsx:49
    todayRsquoSNumbersArenRsquo: 'Today&rsquo;s numbers aren&rsquo;t available right now.',
    // src/components/manager-today.tsx:50
    tryAgain: 'Try again',
    // src/components/manager-today.tsx:54
    scheduledToday: 'Scheduled today',
    // src/components/manager-today.tsx:55
    clockedInNow: 'Clocked in now',
    // src/components/manager-today.tsx:56
    clockedInAfterStart: 'Clocked in after start',
    // src/components/manager-today.tsx:57, src/components/manager-today.tsx:92
    startedNotClockedIn: 'Started, not clocked in',
    // src/components/manager-today.tsx:65
    publishedShiftsOnlyUpdated: 'Published shifts only · Updated ',
    // src/components/manager-today.tsx:74
    started: '{STATUS_TEXT} · started {startAt} · {locationName}',
    // src/components/manager-today.tsx:77
    contact: 'Contact ',
    // src/components/manager-today.tsx:77
    reviewTimecard: 'Review timecard ',
    // src/components/manager-today.tsx:77
    forDate: ' for {employeeName}',
    // src/components/manager-today.tsx:89
    missedPunches: 'Missed punches ',
    // src/components/manager-today.tsx:90
    publishedShiftsTodayNoClockIn: 'Published shifts today with no clock-in recorded. Started means more than {START_GRACE_MINUTES} minutes ago.',
    // src/components/manager-today.tsx:93
    noPunches: 'No punches recorded',
  },
  es: {
    // src/components/manager-today.tsx:44, src/components/manager-today.tsx:48, src/components/manager-today.tsx:60
    today: 'Hoy',
    // src/components/manager-today.tsx:46
    loadingToday: 'Cargando hoy',
    // src/components/manager-today.tsx:49
    todayRsquoSNumbersArenRsquo: 'Los números de hoy no están disponibles en este momento',
    // src/components/manager-today.tsx:50
    tryAgain: 'Intentar de nuevo',
    // src/components/manager-today.tsx:54
    scheduledToday: 'Programado para hoy',
    // src/components/manager-today.tsx:55
    clockedInNow: 'En turno ahora',
    // src/components/manager-today.tsx:56
    clockedInAfterStart: 'Registrado después del inicio',
    // src/components/manager-today.tsx:57, src/components/manager-today.tsx:92
    startedNotClockedIn: 'Comenzado, no registrado',
    // src/components/manager-today.tsx:65
    publishedShiftsOnlyUpdated: 'Turnos publicados solo · Actualizado ',
    // src/components/manager-today.tsx:74
    started: '{STATUS_TEXT} · comenzó {startAt} · {locationName}',
    // src/components/manager-today.tsx:77
    contact: 'Contacto ',
    // src/components/manager-today.tsx:77
    reviewTimecard: 'Tarjeta de tiempo de revisión ',
    // src/components/manager-today.tsx:77
    forDate: ' del {employeeName}',
    // src/components/manager-today.tsx:89
    missedPunches: 'Puñetazos perdidos ',
    // src/components/manager-today.tsx:90
    publishedShiftsTodayNoClockIn: 'Turnos publicados para hoy sin marcación de entrada. Un turno se considera empezado si han pasado más de {START_GRACE_MINUTES} minutos.',
    // src/components/manager-today.tsx:93
    noPunches: 'Sin marcaciones registradas',
  },
} as const;
