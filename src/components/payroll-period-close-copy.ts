export const copy = {
  en: {
    handoffChanged: "The period record changed. Refresh the list and review the current record before reporting the handoff.",
    downloadFailed: "The file didn’t download. Try again.",
    // src/components/payroll-period-close.tsx:16
    loadingTheListOfPeople: "Loading the list of people…",
    // src/components/payroll-period-close.tsx:16
    thisListIsOutOfDateRefreshItToSee: "This list is out of date. Refresh it to see current data.",
    // src/components/payroll-period-close.tsx:17
    downloadRequested: "Download requested",
    // src/components/payroll-period-close.tsx:17
    markedAsSent: "Reported as sent",
    // src/components/payroll-period-close.tsx:17
    markedAsImported: "Reported as imported",
    // src/components/payroll-period-close.tsx:87
    checkEveryoneOnTheListIncludingInactiveAccountsAndPeople: "Check everyone on the list, including inactive accounts and people with no hours.",
    // src/components/payroll-period-close.tsx:89
    weCouldnTLoadTheListRefreshItToTry: "We couldn’t load the list. Refresh it to try again.",
    // src/components/payroll-period-close.tsx:98
    browserStorageIsOffTurnItOnBeforeSavingChanges: "Browser storage is off. Turn it on before saving changes here.",
    // src/components/payroll-period-close.tsx:99
    pausedWhileYouWereAwayRefreshTheListToContinue: "Paused while you were away. Refresh the list to continue.",
    // src/components/payroll-period-close.tsx:116
    thisListIsOutOfDateRefreshItBeforeSaving: "This list is out of date. Refresh it before saving.",
    // src/components/payroll-period-close.tsx:124
    weCouldnTKeepACopyOfThisChangeSo: "We couldn’t keep a copy of this change, so nothing was sent. Try again.",
    // src/components/payroll-period-close.tsx:137
    somethingChangedWhileYouWereWorkingRefreshTheListAnd: "Something changed while you were working. Refresh the list and check it again.",
    // src/components/payroll-period-close.tsx:147
    savedNEVORACanTConfirmYourProviderImportedIt: "Saved. NEVORA can’t confirm your provider imported it.",
    // src/components/payroll-period-close.tsx:148
    saved: "Saved.",
    // src/components/payroll-period-close.tsx:153
    weCouldnTConfirmThatWasSavedTryAgainBefore: "We couldn’t confirm that was saved. Try again before changing anything else.",
    // src/components/payroll-period-close.tsx:161
    whoSInThisPayroll: "Who’s in this payroll",
    // src/components/payroll-period-close.tsx:163
    chooseWhatToDoWithEachPersonForThisPeriod: "Choose what to do with each person for this period. An active account doesn’t say when someone started or left, so note that here. Nothing you save here runs payroll.",
    // src/components/payroll-period-close.tsx:174
    refreshTheList: "Refresh the list",
    // src/components/payroll-period-close.tsx:183
    tryAgain: "Try again",
    // src/components/payroll-period-close.tsx:186
    chooseWhoSIncluded: "Choose who’s included",
    // src/components/payroll-period-close.tsx:186
    hideTheList: "Hide the list",
    // src/components/payroll-period-close.tsx:188
    memberscountPeopleInThisPeriod: "{membersCount} people in this period.",
    // src/components/payroll-period-close.tsx:227
    activeAccount: "Active account",
    // src/components/payroll-period-close.tsx:227
    inactiveAccount: "Inactive account",
    // src/components/payroll-period-close.tsx:231
    recordednanosecondsRecorded: "{recordedNanoseconds} recorded · ",
    // src/components/payroll-period-close.tsx:232
    hasTimeOrTimecardHistoryThisPeriod: "Has time or timecard history this period",
    // src/components/payroll-period-close.tsx:232
    noTimeOrTimecardHistoryThisPeriod: "No time or timecard history this period",
    // src/components/payroll-period-close.tsx:235
    needsReviewIssues: " · Needs review: {issues}",
    // src/components/payroll-period-close.tsx:239
    adpRUNFilesCanTIncludeInactiveAccountsUseThe: "ADP RUN files can’t include inactive accounts. Use the CSV file or a custom layout for this person, so they aren’t left out by accident.",
    // src/components/payroll-period-close.tsx:245
    whatToDoWithThisPeriod: "What to do with this period ",
    // src/components/payroll-period-close.tsx:252
    chooseOne: "Choose one",
    // src/components/payroll-period-close.tsx:255
    includeTheirFinalizedHours: "Include their finalized hours",
    // src/components/payroll-period-close.tsx:258
    noHoursThisPeriod: "No hours this period",
    // src/components/payroll-period-close.tsx:261
    leaveOutWithAReason: "Leave out, with a reason",
    // src/components/payroll-period-close.tsx:266
    reason: "Reason ",
    // src/components/payroll-period-close.tsx:275
    employmentThisPeriodAsYouKnowItSayIfThey: "Employment this period, as you know it (say if they started or left) ",
    // src/components/payroll-period-close.tsx:292
    saveThisList: "Save this list",
    // src/components/payroll-period-close.tsx:295
    matchYourExportFiles: "Match your export files",
    // src/components/payroll-period-close.tsx:297
    listVersionRevisionSelectTheExportFilesThatCoverEach: "List version {revision}. Select the export files that cover each included person exactly once. People with no hours and people you left out stay on the period record.",
    // src/components/payroll-period-close.tsx:317
    profilenameEmployeeIdsCountEmployees: "{profileName} · {employeeIdsCount} employees · ",
    // src/components/payroll-period-close.tsx:349
    savePeriodRecord: "Save period record",
    // src/components/payroll-period-close.tsx:355
    thisVersionOfTheListAlreadyHasAPeriodRecord: "This version of the list already has a period record below. If something changed, save the list again before making another.",
    // src/components/payroll-period-close.tsx:359
    periodRecords: "Period records",
    // src/components/payroll-period-close.tsx:363
    matchesTheCurrentList: "Matches the current list",
    // src/components/payroll-period-close.tsx:363
    olderRecordMadeBeforeTheListChanged: "Historical period record",
    // src/components/payroll-period-close.tsx:368
    listVersionPopulationRevision: "List version {populationRevision} · ",
    // src/components/payroll-period-close.tsx:369
    recordednanosecondsRecorded2: "{recordedNanoseconds} recorded",
    // src/components/payroll-period-close.tsx:372
    recordFingerprint: "Record fingerprint",
    // src/components/payroll-period-close.tsx:379
    downloadPeriodRecord: "Download period record",
    // src/components/payroll-period-close.tsx:386
    downloadCSVFileNumber: "Download CSV file {number}",
    // src/components/payroll-period-close.tsx:392
    downloadTimeRecordNumberJSON: "Download time record {number} (JSON)",
    // src/components/payroll-period-close.tsx:395
    csvFingerprint: "CSV fingerprint",
    // src/components/payroll-period-close.tsx:403
    nevoraRecordsEachDownloadRequestItCanTConfirmThe: "NEVORA records each download request. It can’t confirm the file finished downloading.",
    // src/components/payroll-period-close.tsx:420
    noteWhereYouSentTheFiles: "Note where you sent the files",
    // src/components/payroll-period-close.tsx:422
    sentTo: "Sent to ",
    // src/components/payroll-period-close.tsx:426
    theirReferenceOrConfirmationNumber: "Their reference or confirmation number ",
    // src/components/payroll-period-close.tsx:430
    status: "Status ",
    // src/components/payroll-period-close.tsx:433
    iSentTheFiles: "I sent the files",
    // src/components/payroll-period-close.tsx:436
    theyImportedTheFilesNotCheckedByNEVORA: "They imported the files (not checked by NEVORA)",
    // src/components/payroll-period-close.tsx:441
    saveNote: "Save note",
    // src/components/payroll-period-close.tsx:445
    nevoraIsnTConnectedToYourProviderSoItCan: "NEVORA isn’t connected to your provider, so it can’t confirm the import or that payroll ran.",
    // src/components/payroll-period-close.tsx:449
    latestDownloadsAndNotes: "Latest downloads and notes",
    // src/components/payroll-period-close.tsx:450
    returnedeventsOfTotalEventsEventsInThisSummaryAllEventsFor: "{returnedEvents} of {totalEvents} events in this summary. All events for this manifest are shown.",
    // src/components/payroll-period-close.tsx:450
    returnedeventsOfTotalEventsEventsInThisSummaryLatestEventOf: "{returnedEvents} of {totalEvents} events in this summary. Latest event of each kind only. Load full period history below for older events.",
    // src/components/payroll-period-close.tsx:454
    eventlabelCreatedAtByName: "{eventLabel} · {createdAt} · by {name}",
    // src/components/payroll-period-close.tsx:458
    destinationReference: "{destination} · reference ",
    // src/components/payroll-period-close.tsx:459
    referenceReportedByAManagerNotConfirmedByTheProvider: "{reference} · Reported by a manager. Not confirmed by the provider.",
    // src/components/payroll-period-close.tsx:465
    filenameDownloadNotConfirmed: "{filename} · Download not confirmed.",
    // src/components/payroll-period-close.tsx:454
    recorded: "Recorded",
  },
  es: {
    handoffChanged: "El registro del período cambió. Actualiza la lista y revisa el registro vigente antes de informar el envío.",
    downloadFailed: "El archivo no se descargó. Inténtalo de nuevo.",
    // src/components/payroll-period-close.tsx:16
    loadingTheListOfPeople: "Cargando la lista de personas…",
    // src/components/payroll-period-close.tsx:16
    thisListIsOutOfDateRefreshItToSee: "Esta lista está desactualizada. Actualízala para ver los datos vigentes.",
    // src/components/payroll-period-close.tsx:17
    downloadRequested: "Descarga solicitada",
    // src/components/payroll-period-close.tsx:17
    markedAsSent: "Informado como enviado",
    // src/components/payroll-period-close.tsx:17
    markedAsImported: "Informado como importado",
    // src/components/payroll-period-close.tsx:87
    checkEveryoneOnTheListIncludingInactiveAccountsAndPeople: "Revisa a todas las personas de la lista, incluidas las que tienen cuentas inactivas y las que no tienen horas.",
    // src/components/payroll-period-close.tsx:89
    weCouldnTLoadTheListRefreshItToTry: "No pudimos cargar la lista. Actualízala para intentarlo de nuevo.",
    // src/components/payroll-period-close.tsx:98
    browserStorageIsOffTurnItOnBeforeSavingChanges: "El almacenamiento del navegador está desactivado. Actívalo antes de guardar cambios aquí.",
    // src/components/payroll-period-close.tsx:99
    pausedWhileYouWereAwayRefreshTheListToContinue: "La lista quedó en pausa mientras estabas fuera. Actualízala para continuar.",
    // src/components/payroll-period-close.tsx:116
    thisListIsOutOfDateRefreshItBeforeSaving: "Esta lista está desactualizada. Actualízala antes de guardar.",
    // src/components/payroll-period-close.tsx:124
    weCouldnTKeepACopyOfThisChangeSo: "No pudimos guardar una copia del cambio y no se envió nada. Inténtalo de nuevo.",
    // src/components/payroll-period-close.tsx:137
    somethingChangedWhileYouWereWorkingRefreshTheListAnd: "Algo cambió mientras trabajabas. Actualiza la lista y revísala de nuevo.",
    // src/components/payroll-period-close.tsx:147
    savedNEVORACanTConfirmYourProviderImportedIt: "Se guardó. NEVORA no puede confirmar si el proveedor importó el archivo.",
    // src/components/payroll-period-close.tsx:148
    saved: "Se guardó.",
    // src/components/payroll-period-close.tsx:153
    weCouldnTConfirmThatWasSavedTryAgainBefore: "No pudimos confirmar si se guardó. Inténtalo de nuevo antes de hacer otros cambios.",
    // src/components/payroll-period-close.tsx:161
    whoSInThisPayroll: "Quién está en esta nómina",
    // src/components/payroll-period-close.tsx:163
    chooseWhatToDoWithEachPersonForThisPeriod: "Elige qué hacer con cada persona en este período. Una cuenta activa no indica cuándo la persona empezó o dejó de trabajar. Anótalo aquí. Guardar esta información no procesa la nómina.",
    // src/components/payroll-period-close.tsx:174
    refreshTheList: "Actualizar la lista",
    // src/components/payroll-period-close.tsx:183
    tryAgain: "Intentar de nuevo",
    // src/components/payroll-period-close.tsx:186
    chooseWhoSIncluded: "Elegir quién está incluido",
    // src/components/payroll-period-close.tsx:186
    hideTheList: "Ocultar la lista",
    // src/components/payroll-period-close.tsx:188
    memberscountPeopleInThisPeriod: "{membersCount} personas en este período.",
    // src/components/payroll-period-close.tsx:227
    activeAccount: "Cuenta activa",
    // src/components/payroll-period-close.tsx:227
    inactiveAccount: "Cuenta inactiva",
    // src/components/payroll-period-close.tsx:231
    recordednanosecondsRecorded: "{recordedNanoseconds} registrados · ",
    // src/components/payroll-period-close.tsx:232
    hasTimeOrTimecardHistoryThisPeriod: "Tiene horas o historial de tarjetas de tiempo en este período",
    // src/components/payroll-period-close.tsx:232
    noTimeOrTimecardHistoryThisPeriod: "Sin horas ni historial de tarjetas de tiempo en este período",
    // src/components/payroll-period-close.tsx:235
    needsReviewIssues: " · Por revisar: {issues}",
    // src/components/payroll-period-close.tsx:239
    adpRUNFilesCanTIncludeInactiveAccountsUseThe: "Los archivos de ADP RUN no admiten cuentas inactivas. Usa el CSV o un formato personalizado para incluir a esta persona.",
    // src/components/payroll-period-close.tsx:245
    whatToDoWithThisPeriod: "Qué hacer en este período ",
    // src/components/payroll-period-close.tsx:252
    chooseOne: "Elige una opción",
    // src/components/payroll-period-close.tsx:255
    includeTheirFinalizedHours: "Incluir sus horas finalizadas",
    // src/components/payroll-period-close.tsx:258
    noHoursThisPeriod: "Sin horas en este período",
    // src/components/payroll-period-close.tsx:261
    leaveOutWithAReason: "Excluir e indicar el motivo",
    // src/components/payroll-period-close.tsx:266
    reason: "Razón ",
    // src/components/payroll-period-close.tsx:275
    employmentThisPeriodAsYouKnowItSayIfThey: "Situación laboral en este período según tu información (indica si empezó o dejó de trabajar) ",
    // src/components/payroll-period-close.tsx:292
    saveThisList: "Guardar esta lista",
    // src/components/payroll-period-close.tsx:295
    matchYourExportFiles: "Vincular los archivos exportados",
    // src/components/payroll-period-close.tsx:297
    listVersionRevisionSelectTheExportFilesThatCoverEach: "Versión {revision} de la lista. Elige los archivos exportados que incluyan a cada persona exactamente una vez. Las personas sin horas y las que excluiste se conservan en el registro del período.",
    // src/components/payroll-period-close.tsx:317
    profilenameEmployeeIdsCountEmployees: "{profileName} · {employeeIdsCount} empleados · ",
    // src/components/payroll-period-close.tsx:349
    savePeriodRecord: "Guardar registro del período",
    // src/components/payroll-period-close.tsx:355
    thisVersionOfTheListAlreadyHasAPeriodRecord: "Esta versión de la lista ya tiene un registro del período más abajo. Si algo cambió, guarda la lista de nuevo antes de crear otro registro.",
    // src/components/payroll-period-close.tsx:359
    periodRecords: "Registros del período",
    // src/components/payroll-period-close.tsx:363
    matchesTheCurrentList: "Coincide con la lista actual",
    // src/components/payroll-period-close.tsx:363
    olderRecordMadeBeforeTheListChanged: "Registro histórico del período",
    // src/components/payroll-period-close.tsx:368
    listVersionPopulationRevision: "Versión {populationRevision} de la lista · ",
    // src/components/payroll-period-close.tsx:369
    recordednanosecondsRecorded2: "{recordedNanoseconds} registradas",
    // src/components/payroll-period-close.tsx:372
    recordFingerprint: "Huella digital del registro",
    // src/components/payroll-period-close.tsx:379
    downloadPeriodRecord: "Descargar registro del período",
    // src/components/payroll-period-close.tsx:386
    downloadCSVFileNumber: "Descargar archivo CSV {number}",
    // src/components/payroll-period-close.tsx:392
    downloadTimeRecordNumberJSON: "Descargar tiempo registrado {number} (JSON)",
    // src/components/payroll-period-close.tsx:395
    csvFingerprint: "Huella digital del CSV",
    // src/components/payroll-period-close.tsx:403
    nevoraRecordsEachDownloadRequestItCanTConfirmThe: "NEVORA registra cada solicitud de descarga. No puede confirmar si el archivo terminó de descargarse.",
    // src/components/payroll-period-close.tsx:420
    noteWhereYouSentTheFiles: "Anota adónde enviaste los archivos",
    // src/components/payroll-period-close.tsx:422
    sentTo: "Enviado a ",
    // src/components/payroll-period-close.tsx:426
    theirReferenceOrConfirmationNumber: "Referencia o número de confirmación que recibiste ",
    // src/components/payroll-period-close.tsx:430
    status: "Estado ",
    // src/components/payroll-period-close.tsx:433
    iSentTheFiles: "Envié los archivos",
    // src/components/payroll-period-close.tsx:436
    theyImportedTheFilesNotCheckedByNEVORA: "Importaron los archivos (sin verificar por NEVORA)",
    // src/components/payroll-period-close.tsx:441
    saveNote: "Guardar nota",
    // src/components/payroll-period-close.tsx:445
    nevoraIsnTConnectedToYourProviderSoItCan: "NEVORA no está conectado a tu proveedor. No puede confirmar si se importaron los archivos o si se procesó la nómina.",
    // src/components/payroll-period-close.tsx:449
    latestDownloadsAndNotes: "Descargas y notas recientes",
    // src/components/payroll-period-close.tsx:450
    returnedeventsOfTotalEventsEventsInThisSummaryAllEventsFor: "{returnedEvents} de {totalEvents} eventos en este resumen. Se muestran todos los eventos de este manifiesto.",
    // src/components/payroll-period-close.tsx:450
    returnedeventsOfTotalEventsEventsInThisSummaryLatestEventOf: "{returnedEvents} de {totalEvents} eventos en este resumen. Se muestra solo el más reciente de cada tipo. Carga el historial completo del período para ver los anteriores.",
    // src/components/payroll-period-close.tsx:454
    eventlabelCreatedAtByName: "{eventLabel} · {createdAt} · por {name}",
    // src/components/payroll-period-close.tsx:458
    destinationReference: "{destination} · Referencia ",
    // src/components/payroll-period-close.tsx:459
    referenceReportedByAManagerNotConfirmedByTheProvider: "{reference} · Informado por un gerente. El proveedor no lo ha confirmado.",
    // src/components/payroll-period-close.tsx:465
    filenameDownloadNotConfirmed: "{filename} · Descarga sin confirmar.",
    // src/components/payroll-period-close.tsx:454
    recorded: "Registrado",
  },
} as const;
