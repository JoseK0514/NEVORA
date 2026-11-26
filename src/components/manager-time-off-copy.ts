/** Manager Time Off uses the same status words on the list and its detail routes. */
export const managerTimeOffCopy = {
  en: {
    // manager-time-off.tsx:33
    waiting: "Waiting",
    // manager-time-off.tsx:34
    approved: "Approved",
    // manager-time-off.tsx:35
    declined: "Declined",
    // manager-time-off.tsx:162
    approvedOne: "Approved",
    // manager-time-off.tsx:162
    declinedOne: "Declined",
    // manager-time-off.tsx:51
    home: "Home",
    // manager-time-off.tsx:57
    inbox: "Things to do",
    // manager-time-off.tsx:64
    allDay: "All day",
    // manager-time-off.tsx:64
    daysOther: "{count} days",
    // manager-time-off.tsx:80
    sent: "Sent {day} at {time}",
    // manager-time-off.tsx:90
    ptoBalance: "Not approved. This request needs more paid time off than the person has left, so it’s still waiting. Decline it, or ask an Owner to adjust the balance first.",
    // manager-time-off.tsx:91
    refused: "That decision wasn’t saved. The request may have changed, or it covers a location where an Owner decides time off. Check it and decide again, or ask an Owner.",
    // manager-time-off.tsx:100
    offDay: "Also off that day",
    // manager-time-off.tsx:100
    offDays: "Also off those days",
    // manager-time-off.tsx:102
    request: "Time-off request",
    // manager-time-off.tsx:105
    changed: "The request may have changed. Check it and decide again.",
    // manager-time-off.tsx:108
    card: "Time off for {name}",
    // manager-time-off.tsx:117
    noNote: "No note",
    // manager-time-off.tsx:120
    week: "That week",
    // manager-time-off.tsx:121
    seeSchedule: "See that week’s schedule",
    // manager-time-off.tsx:122
    none: "No one",
    // manager-time-off.tsx:129
    notified: "{name} gets a notification either way.",
    // manager-time-off.tsx:131
    review: "Review time off for {name}",
    // manager-time-off.tsx:147
    by: " by {name}",
    // manager-time-off.tsx:157
    alreadyApproved: "Already approved",
    // manager-time-off.tsx:157
    alreadyDeclined: "Already declined",
    // manager-time-off.tsx:157
    alreadyDecided: "Already decided",
    // manager-time-off.tsx:157
    noLongerWaiting: "This request isn’t waiting anymore.",
    // manager-time-off.tsx:160
    thisRequest: "This request",
    // manager-time-off.tsx:164
    backTo: "Back to {page}",
    // manager-time-off.tsx:183
    unavailable: "Team time off unavailable",
    // manager-time-off.tsx:237
    title: "Time off requests",
    // manager-time-off.tsx:239
    sections: "Time off sections",
    // manager-time-off.tsx:240
    count: "Waiting ({count})",
    // manager-time-off.tsx:254
    approvedList: "Approved time off",
    // manager-time-off.tsx:254
    declinedList: "Declined time off",
    // manager-time-off.tsx:263
    noApproved: "No approved time off yet",
    // manager-time-off.tsx:263
    noDeclined: "No declined time off yet",
    // manager-time-off.tsx:263
    approvedEmpty: "Requests you approve show up here.",
    // manager-time-off.tsx:263
    declinedEmpty: "Requests you decline show up here.",
    // quiet/quiet.tsx:132
    justNow: "Just now",
    // quiet/quiet.tsx:132
    ago: "{duration} ago",
  },
  es: {
    waiting: "En espera",
    approved: "Aprobadas",
    declined: "Rechazadas",
    approvedOne: "Aprobada",
    declinedOne: "Rechazada",
    home: "Inicio",
    inbox: "Pendientes",
    allDay: "Todo el día",
    daysOther: "{count} días",
    sent: "Enviada el {day} a las {time}",
    ptoBalance: "No se aprobó. La solicitud requiere más días libres pagados de los que le quedan a la persona, así que sigue en espera. Recházala o pídele a un dueño que ajuste el balance primero.",
    refused: "No se guardó la decisión. La solicitud pudo haber cambiado o incluye una localidad donde un dueño aprueba los días libres. Revísala y vuelve a decidir, o consulta con un dueño.",
    offDay: "También libre ese día",
    offDays: "También libre esos días",
    request: "Solicitud de días libres",
    changed: "La solicitud pudo haber cambiado. Revísala y vuelve a decidir.",
    card: "Días libres de {name}",
    noNote: "Sin nota",
    week: "Esa semana",
    seeSchedule: "Ver el horario de esa semana",
    none: "Nadie",
    notified: "{name} recibe un aviso con cualquiera de las dos decisiones.",
    review: "Revisar los días libres de {name}",
    by: " por {name}",
    alreadyApproved: "Ya se aprobó",
    alreadyDeclined: "Ya se rechazó",
    alreadyDecided: "Ya se tomó una decisión",
    noLongerWaiting: "Esta solicitud ya salió de la lista de espera.",
    thisRequest: "Esta solicitud",
    backTo: "Volver a {page}",
    unavailable: "Días libres del equipo no disponibles",
    title: "Solicitudes de días libres",
    sections: "Secciones de días libres",
    count: "En espera ({count})",
    approvedList: "Días libres aprobados",
    declinedList: "Días libres rechazados",
    noApproved: "Aún no hay días libres aprobados",
    noDeclined: "Aún no hay días libres rechazados",
    approvedEmpty: "Aquí aparecen las solicitudes que apruebas.",
    declinedEmpty: "Aquí aparecen las solicitudes que rechazas.",
    justNow: "Ahora mismo",
    ago: "Hace {duration}",
  },
} as const;

export const timeOffText = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (key, name: string) => String(values[name] ?? key));

export const copy = {
  en: {
    // src/components/manager-time-off.tsx:31, src/components/manager-time-off.tsx:112
    waiting: 'Waiting',
    // src/components/manager-time-off.tsx:32, src/components/manager-time-off.tsx:147, src/components/manager-time-off.tsx:162
    approved: 'Approved',
    // src/components/manager-time-off.tsx:33, src/components/manager-time-off.tsx:147, src/components/manager-time-off.tsx:162
    declined: 'Declined',
    // src/components/manager-time-off.tsx:48
    home: 'Home',
    // src/components/manager-time-off.tsx:53
    thingsDo: 'Things to do',
    // src/components/manager-time-off.tsx:60
    allDay: '{startDate} · All day',
    // src/components/manager-time-off.tsx:60
    days: '{startDate} – {endDate} · {days} days',
    // src/components/manager-time-off.tsx:70
    allDay2: 'All day',
    // src/components/manager-time-off.tsx:70
    age: '{days} days',
    // src/components/manager-time-off.tsx:81
    sentAt: 'Sent {day} at {time}',
    // src/components/manager-time-off.tsx:90
    notApprovedRequestNeedsMorePaid: 'Not approved. This request needs more paid time off than the person has left, so it’s still waiting. Decline it, or ask an Owner to adjust the balance first.',
    // src/components/manager-time-off.tsx:91
    decisionWasnSavedRequestMayHave: 'That decision wasn’t saved. The request may have changed, or it covers a location where an Owner decides time off. Check it and decide again, or ask an Owner.',
    // src/components/manager-time-off.tsx:100
    alsoOffDay: 'Also off that day',
    // src/components/manager-time-off.tsx:100
    alsoOffThoseDays: 'Also off those days',
    // src/components/manager-time-off.tsx:102, src/components/manager-time-off.tsx:104
    timeOffRequest: 'Time-off request',
    // src/components/manager-time-off.tsx:105
    requestMayHaveChangedCheckDecide: 'The request may have changed. Check it and decide again.',
    // src/components/manager-time-off.tsx:108
    ariaLabel: 'Time off for {employeeName}',
    // src/components/manager-time-off.tsx:117
    noNote: 'No note',
    // src/components/manager-time-off.tsx:120
    week: 'That week',
    // src/components/manager-time-off.tsx:121
    seeWeekSchedule: 'See that week’s schedule',
    // src/components/manager-time-off.tsx:129
    getsNotificationEitherWay: '{first} gets a notification either way.',
    // src/components/manager-time-off.tsx:131
    reviewTimeOff: 'Review time off for {employeeName}',
    // src/components/manager-time-off.tsx:147
    approved2: 'Approved by {reviewerName} · {on}',
    // src/components/manager-time-off.tsx:147
    approvedBy: 'Approved by {reviewerName}',
    // src/components/manager-time-off.tsx:147
    earlierLine: 'Approved · {on}',
    // src/components/manager-time-off.tsx:147
    declined2: 'Declined by {reviewerName} · {on}',
    // src/components/manager-time-off.tsx:147
    declinedBy: 'Declined by {reviewerName}',
    // src/components/manager-time-off.tsx:147
    earlierLine2: 'Declined · {on}',
    // src/components/manager-time-off.tsx:157
    alreadyApproved: 'Already approved',
    // src/components/manager-time-off.tsx:157
    alreadyDeclined: 'Already declined',
    // src/components/manager-time-off.tsx:157
    alreadyDecided: 'Already decided',
    // src/components/manager-time-off.tsx:160
    request: 'This request',
    // src/components/manager-time-off.tsx:164
    pinBackToPerson: 'Back to {label}',
    // src/components/manager-time-off.tsx:188
    teamTimeOffUnavailable: 'Team time off unavailable',
    // src/components/manager-time-off.tsx:235
    timeOff: 'Time off requests',
    // src/components/manager-time-off.tsx:237
    timeOffSections: 'Time off sections',
    // src/components/manager-time-off.tsx:250
    timeOffLabel: '{label} time off',
    // src/components/manager-time-off.tsx:258
    noTimeOffYet: 'No {label} time off yet',
    // src/components/manager-time-off.tsx:258
    line: 'Requests you approve show up here.',
    // src/components/manager-time-off.tsx:258
    lineLabel: 'Requests you decline show up here.',
  },
  es: {
    // src/components/manager-time-off.tsx:31, src/components/manager-time-off.tsx:112
    waiting: 'En espera',
    // src/components/manager-time-off.tsx:32, src/components/manager-time-off.tsx:147, src/components/manager-time-off.tsx:162
    approved: 'Aprobado',
    // src/components/manager-time-off.tsx:33, src/components/manager-time-off.tsx:147, src/components/manager-time-off.tsx:162
    declined: 'Rechazada',
    // src/components/manager-time-off.tsx:48
    home: 'Inicio',
    // src/components/manager-time-off.tsx:53
    thingsDo: 'Pendientes',
    // src/components/manager-time-off.tsx:60
    allDay: '{startDate} · Todo el día',
    // src/components/manager-time-off.tsx:60
    days: '{startDate} - {endDate} · {days} días',
    // src/components/manager-time-off.tsx:70
    allDay2: 'Todo el día',
    // src/components/manager-time-off.tsx:70
    age: '{days} días',
    // src/components/manager-time-off.tsx:81
    sentAt: 'Enviado {day} a {time}',
    // src/components/manager-time-off.tsx:90
    notApprovedRequestNeedsMorePaid: 'No aprobado. Esta solicitud necesita más días de vacaciones pagados de los que la persona ha tenido, por lo que todavía está esperando. Denégala o pide al dueño que ajuste primero el saldo',
    // src/components/manager-time-off.tsx:91
    decisionWasnSavedRequestMayHave: 'Esa decisión no se guardó. Es posible que la solicitud haya cambiado, o que se aplique a una localidad donde un dueño decide tomarse un día libre. Compruebalo y vuelve a decidir, o pregunta a un dueño',
    // src/components/manager-time-off.tsx:100
    alsoOffDay: 'También fuera de ese día',
    // src/components/manager-time-off.tsx:100
    alsoOffThoseDays: 'También fuera de esos días',
    // src/components/manager-time-off.tsx:102, src/components/manager-time-off.tsx:104
    timeOffRequest: 'Solicitud de días libres',
    // src/components/manager-time-off.tsx:105
    requestMayHaveChangedCheckDecide: 'La solicitud puede haber cambiado. Comprueba y vuelve a decidir',
    // src/components/manager-time-off.tsx:108
    ariaLabel: 'Días libres para {employeeName}',
    // src/components/manager-time-off.tsx:117
    noNote: 'Sin nota',
    // src/components/manager-time-off.tsx:120
    week: 'Esa semana',
    // src/components/manager-time-off.tsx:121
    seeWeekSchedule: 'Vea el horario de esa semana',
    // src/components/manager-time-off.tsx:129
    getsNotificationEitherWay: '{first} recibirá una notificación de cualquier manera',
    // src/components/manager-time-off.tsx:131
    reviewTimeOff: 'Revisar los días libres de {employeeName}',
    // src/components/manager-time-off.tsx:147
    approved2: 'Aprobado por {reviewerName} · {on}',
    // src/components/manager-time-off.tsx:147
    approvedBy: 'Aprobada por {reviewerName}',
    // src/components/manager-time-off.tsx:147
    earlierLine: 'Aprobada · {on}',
    // src/components/manager-time-off.tsx:147
    declined2: 'Rechazado por {reviewerName} · {on}',
    // src/components/manager-time-off.tsx:147
    declinedBy: 'Rechazada por {reviewerName}',
    // src/components/manager-time-off.tsx:147
    earlierLine2: 'Rechazada · {on}',
    // src/components/manager-time-off.tsx:157
    alreadyApproved: 'Ya aprobado',
    // src/components/manager-time-off.tsx:157
    alreadyDeclined: 'Ya rechazado',
    // src/components/manager-time-off.tsx:157
    alreadyDecided: 'Ya decidido',
    // src/components/manager-time-off.tsx:160
    request: 'Esta solicitud',
    // src/components/manager-time-off.tsx:164
    pinBackToPerson: 'Volver a {label}',
    // src/components/manager-time-off.tsx:188
    teamTimeOffUnavailable: 'El días libres del equipo no está disponible',
    // src/components/manager-time-off.tsx:235
    timeOff: 'Solicitudes de días libres',
    // src/components/manager-time-off.tsx:237
    timeOffSections: 'Secciones de vacaciones',
    // src/components/manager-time-off.tsx:250
    timeOffLabel: '{label} días libres',
    // src/components/manager-time-off.tsx:258
    noTimeOffYet: 'Aún no hay vacaciones {label}',
    // src/components/manager-time-off.tsx:258
    line: 'Las solicitudes que apruebes aparecen aquí',
    // src/components/manager-time-off.tsx:258
    lineLabel: 'Las solicitudes que rechazas aparecen aquí',
  },
} as const;
