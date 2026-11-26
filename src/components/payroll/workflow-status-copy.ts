export const copy = {
  en: {
    // src/components/payroll/workflow-status.ts:5
    noticeTransportIsEnabledCurrentAccessConsentAndSavedNotice: "Notice transport is enabled. Current access, consent and saved notice preferences are checked for each delivery. A queued notice is not a delivery confirmation.",
    // src/components/payroll/workflow-status.ts:6
    noticeDeliveryIsDisabledPrivateNoticeRequestsMayBeQueued: "Notice delivery is disabled. Private notice requests may be queued, but this environment will not send them.",
    // src/components/payroll/workflow-status.ts:11
    noticeQueuedSendingAndReceiptAreNotConfirmed: "Notice queued. Sending and receipt are not confirmed.",
    // src/components/payroll/workflow-status.ts:12
    noticeQueuedWhileDeliveryWasDisabledSendingAndReceiptAre: "Notice queued while delivery was disabled. Sending and receipt are not confirmed.",
    // src/components/payroll/workflow-status.ts:13
    noCurrentlyEligibleRecipientsNoNoticeWasQueued: "No currently eligible recipients. No notice was queued.",
    // src/components/payroll/workflow-status.ts:14
    legacyPreparationOnlyNoNoticeWasSent: "Legacy preparation only. No notice was sent.",
    // src/components/payroll/workflow-status.ts:15
    noQueueResultRecordedYetSendingAndReceiptAreNot: "No queue result recorded yet. Sending and receipt are not confirmed.",
    // src/components/payroll/workflow-status.ts:20
    theHistoryScanReachedItsLimitTheMissingPeriodCount: "The history scan reached its limit. The missing-period count is unavailable; review older settings and original runs before preparing catch-up drafts.",
    // src/components/payroll/workflow-status.ts:22
    missingEarlierPayrollOne: "{missingCount} earlier pay period has no payroll yet. Start with the oldest.",
    // src/components/payroll/workflow-status.ts:22
    missingEarlierPayrollOther: "{missingCount} earlier pay periods have no payroll yet. Start with the oldest.",
    // src/components/payroll/workflow-status.ts:39
    nevoraCanTCalculateThisPayrollUntilItsPayrollRules: "NEVORA can’t calculate this payroll until its payroll rules are confirmed. Contact support.",
    // src/components/payroll/workflow-status.ts:40
    completeAndReviewTheOpenRecordedTimeOrBreakBefore: "Complete and review the open recorded time or break before recalculating.",
    // src/components/payroll/workflow-status.ts:41
    refreshAndReviewTheRecordedTimecardsThenRecalculate: "Refresh and review the recorded timecards, then recalculate.",
    // src/components/payroll/workflow-status.ts:42
    reviewAndFinalizeTheIncludedRecordedTimecards: "Review and finalize the included recorded timecards.",
    // src/components/payroll/workflow-status.ts:43
    nevoraCanTUseTheSavedWageDetailsReviewThe: "NEVORA can’t use the saved wage details. Review the wage in payroll setup.",
    // src/components/payroll/workflow-status.ts:44
    nevoraCanTApplyOneOfTheSavedDeductionsReview: "NEVORA can’t apply one of the saved deductions. Review deductions in payroll setup.",
    // src/components/payroll/workflow-status.ts:45
    employerContributionDetailsAreMissingOrNotSupportedReviewThem: "Employer contribution details are missing or not supported. Review them in payroll setup.",
    // src/components/payroll/workflow-status.ts:46
    nevoraCanTUseTheSavedWorkweekReviewTheWorkweek: "NEVORA can’t use the saved workweek. Review the workweek in payroll setup.",
    // src/components/payroll/workflow-status.ts:47
    nevoraCanTCalculateOneOfTheRecordedBreaksCheck: "NEVORA can’t calculate one of the recorded breaks. Check the break on the timecard and the break rules in payroll setup.",
    // src/components/payroll/workflow-status.ts:48
    nevoraCouldnTConfirmTheRecordedTimeForThisPayroll: "NEVORA couldn’t confirm the recorded time for this payroll. Review the timecards, then recalculate. If it stays, contact support.",
    // src/components/payroll/workflow-status.ts:49
    thisPayrollIsLargerThanNEVORACanCalculateAtOnce: "This payroll is larger than NEVORA can calculate at once. Contact support.",
    // src/components/payroll/workflow-status.ts:50
    someSavedPayrollDetailsCanTBeReadReviewThem: "Some saved payroll details can’t be read. Review them in payroll setup. If it stays, contact support.",
    // src/components/payroll/workflow-status.ts:51
    thisYearSPayrollTotalsDonTLineUpFor: "This year’s payroll totals don’t line up for this employee. Contact support.",
    // src/components/payroll/workflow-status.ts:53
    somethingStopsThisPayrollThatNEVORACanTExplainHere: "Something stops this payroll that NEVORA can’t explain here. Recalculate the draft. If it stays, contact support.",
    // src/components/payroll/workflow-status.ts:59
    reviewAndFinalizeTheEmployeeTimecardsIncludingConfirmedZeroHour: "Review and finalize the employee timecards, including confirmed zero-hour periods, before recalculating.",
    // src/components/payroll/workflow-status.ts:61
    recordedTimecardsAreUnavailableReloadTheirCurrentStatusBeforeRecalculating: "Recorded timecards are unavailable. Reload their current status before recalculating.",
    // src/components/payroll/workflow-status.ts:64
    aTimeCorrectionIsStillWaitingForReviewReviewIt: "A time correction is still waiting for review. Review it in Timecards, then recalculate.",
    // src/components/payroll/workflow-status.ts:65
    twoRecordedTimesOverlapFixTheOverlapInTimecardsThen: "Two recorded times overlap. Fix the overlap in Timecards, then recalculate.",
    // src/components/payroll/workflow-status.ts:67
    nevoraNeedsFinalizedTimecardsForTheDaysJustBeforeAnd: "NEVORA needs finalized timecards for the days just before and after this period to work out overtime. Finalize them, then recalculate.",
    // src/components/payroll/workflow-status.ts:71
    completeTheRecordedLocationCoverageBeforeRecalculating: "Complete the recorded location coverage before recalculating.",
    // src/components/payroll/workflow-status.ts:72
    anOlderRuleHeldThisDraftBecauseRecordedTimeTouched: "An older rule held this draft because recorded time touched midnight. Shifts now count on the day they start. Recalculate this draft.",
    // src/components/payroll/workflow-status.ts:74
    chooseWhoSInThisPayrollForThePeriodThen: "Choose who’s in this payroll for the period, then recalculate.",
    // src/components/payroll/workflow-status.ts:75
    peopleOrTimecardsChangedAfterYouChoseWhoSIn: "People or timecards changed after you chose who’s in this payroll. Review the list again, then recalculate.",
    // src/components/payroll/workflow-status.ts:76
    aCorrectionMustIncludeTheSamePeopleAsTheOriginal: "A correction must include the same people as the original payroll. Review the original payroll before continuing.",
    // src/components/payroll/workflow-status.ts:78
    askTheOwnerToDocumentTheEmployeeWorkweekUnknownNotice: "Ask the Owner to document the employee workweek. Unknown notice history cannot select a default.",
    // src/components/payroll/workflow-status.ts:79
    askTheOwnerToReviewWorkweekEvidenceDeliveryAndEffective: "Ask the Owner to review workweek evidence, delivery and effective dates.",
    // src/components/payroll/workflow-status.ts:80
    askTheOwnerToReviewTheSavedEmployeePayrollFacts: "Ask the Owner to review the saved employee payroll facts and evidence.",
    // src/components/payroll/workflow-status.ts:81
    askTheOwnerToVerifyThatTheWorkweekEvidenceCovers: "Ask the Owner to verify that the workweek evidence covers this employee.",
    // src/components/payroll/workflow-status.ts:82
    askTheOwnerToResolveConflictingLegacyWorkweekCoordinatesAnd: "Ask the Owner to resolve conflicting legacy workweek coordinates and documented policy.",
    // src/components/payroll/workflow-status.ts:83
    askTheOwnerToVerifyWorkweekEvidenceCoveringTheEntire: "Ask the Owner to verify workweek evidence covering the entire recorded context, including prior and terminal days.",
    // src/components/payroll/workflow-status.ts:86
    askTheOwnerToMatchTheEmployerOpeningWageBasis: "Ask the Owner to match the employer opening wage basis to the documented year-to-date balance for the same code.",
    // src/components/payroll/workflow-status.ts:87
    askTheOwnerToVerifyTheEmployerContributionOpeningWage: "Ask the Owner to verify the employer contribution opening wage bases.",
    // src/components/payroll/workflow-status.ts:88
    askTheOwnerToVerifyAndAttestTheOpeningYear: "Ask the Owner to verify and attest the opening year-to-date balances.",
    // src/components/payroll/workflow-status.ts:89
    askTheOwnerToVerifyTheOpeningYearToDate: "Ask the Owner to verify the opening year-to-date balances.",
    // src/components/payroll/workflow-status.ts:90
    askTheOwnerToAttestTheDocumentedYearToDate: "Ask the Owner to attest the documented year-to-date balances.",
    // src/components/payroll/workflow-status.ts:91
    askTheOwnerToCompleteTheEmployeeWageProfile: "Ask the Owner to complete the employee wage profile.",
    // src/components/payroll/workflow-status.ts:92
    twoSavedWagesCoverTheSameDatesAndLocationKeep: "Two saved wages cover the same dates and location. Keep one in payroll setup.",
    // src/components/payroll/workflow-status.ts:94
    minimumWageCoverageIsnTConfirmedForThisWageConfirm: "Minimum wage coverage isn’t confirmed for this wage. Confirm it in payroll setup.",
    // src/components/payroll/workflow-status.ts:95
    theHourlyRateIsBelowTheMinimumWageNEVORAChecks: "The hourly rate is below the minimum wage NEVORA checks. Review the rate in payroll setup.",
    // src/components/payroll/workflow-status.ts:96
    askTheOwnerToCompleteTheEmployeeWithholdingFacts: "Ask the Owner to complete the employee withholding facts.",
    // src/components/payroll/workflow-status.ts:97
    nevoraCanTCalculateThisMixOfWithholdingChoicesYet: "NEVORA can’t calculate this mix of withholding choices yet. Review the withholding details in payroll setup, or contact support.",
    // src/components/payroll/workflow-status.ts:101
    deductionsAreMoreThanThePayForThisPeriodReview: "Deductions are more than the pay for this period. Review deductions in payroll setup.",
    // src/components/payroll/workflow-status.ts:102
    theRecordedTimeAndEmployeePayrollFactsAreIncomplete: "The recorded-time and employee payroll facts are incomplete.",
    // src/components/payroll/workflow-status.ts:103
    theOpeningYearToDateBalancesDonTAddUp: "The opening year-to-date balances don’t add up for this employee. Review the opening balances in payroll setup.",
    // src/components/payroll/workflow-status.ts:106
    noPayrollSettingsAreSavedForThisPaydaySaveYour: "No payroll settings are saved for this payday. Save your pay schedule in Payroll settings.",
    // src/components/payroll/workflow-status.ts:112
    thisCompanyHasSavedDeductionOrContributionRulesThatNEVORA: "This company has saved deduction or contribution rules that NEVORA can’t use in its own calculation. Contact support.",
    // src/components/payroll/workflow-status.ts:113
    nevoraCanTCalculatePaydaysInThatYearYetContact: "NEVORA can’t calculate paydays in that year yet. Contact support.",
    // src/components/payroll/workflow-status.ts:114
    nevoraCanTCalculatePayrollForThisCompanySTime: "NEVORA can’t calculate payroll for this company’s time zone yet. Contact support.",
    // src/components/payroll/workflow-status.ts:115
    someoneWorkedMoreThanSevenDaysInARowWhich: "Someone worked more than seven days in a row, which NEVORA can’t calculate yet. Contact support.",
    // src/components/payroll/workflow-status.ts:116
    thisRecordedContextSpansDifferentWorkweekPoliciesAskTheOwner: "This recorded context spans different workweek policies. Ask the Owner to review it; NEVORA can’t calculate across that change yet.",
    // src/components/payroll/workflow-status.ts:118
    nevoraCouldnTReadTheTimeAndPayrollDetailsFor: "NEVORA couldn’t read the time and payroll details for this payroll. Recalculate the draft. If it happens again, contact support.",
    // src/components/payroll/workflow-status.ts:119
    theDatesOfThisPayPeriodDonTMatchThe: "The dates of this pay period don’t match the saved time. Recalculate the draft. If it stays, contact support.",
    // src/components/payroll/workflow-status.ts:120
    nevoraCanTCalculateAPayPeriodWithTheseDates: "NEVORA can’t calculate a pay period with these dates. Contact support.",
    // src/components/payroll/workflow-status.ts:121
    verifyLocationCoverageForThePriorPayrollBalances: "Verify location coverage for the prior payroll balances.",
    // src/components/payroll/workflow-status.ts:122
    laterPayrollHasAlreadyBeenApprovedAskTheOwnerTo: "Later payroll has already been approved. Ask the Owner to review the year-to-date order.",
    // src/components/payroll/workflow-status.ts:123
    laterApprovedPayrollDependsOnTheseYearToDateBalances: "Later approved payroll depends on these year-to-date balances. Ask the Owner to review the order of corrections.",
    // src/components/payroll/workflow-status.ts:137
    importProviderOrAccountantAmountsToReviewThisDraft: "Import provider or accountant amounts to review this draft.",
    // src/components/payroll/workflow-status.ts:138
    finalizeTimecardsForEmployeeReferenceExceptionBeforeApproval: "Finalize timecards for employee reference {exception} before approval.",
    // src/components/payroll/workflow-status.ts:139
    chooseWhatToDoWithEmployeeReferenceExceptionForThis: "Choose what to do with employee reference {exception} for this period before approval.",
    // src/components/payroll/workflow-status.ts:142
    textEmployeeReferenceReference: "{text} Employee reference {reference}.",
  },
  es: {
    // src/components/payroll/workflow-status.ts:5
    noticeTransportIsEnabledCurrentAccessConsentAndSavedNotice: "El envío de notificaciones está activado. En cada entrega se verifican el acceso actual, el consentimiento y las preferencias de notificación guardadas. Una notificación en cola no confirma la entrega.",
    // src/components/payroll/workflow-status.ts:6
    noticeDeliveryIsDisabledPrivateNoticeRequestsMayBeQueued: "El envío de notificaciones está desactivado. Las solicitudes de notificaciones privadas pueden quedar en cola, pero este entorno no las enviará.",
    // src/components/payroll/workflow-status.ts:11
    noticeQueuedSendingAndReceiptAreNotConfirmed: "Notificación en cola. No se ha confirmado el envío ni el recibo.",
    // src/components/payroll/workflow-status.ts:12
    noticeQueuedWhileDeliveryWasDisabledSendingAndReceiptAre: "Notificación en cola mientras el envío estaba desactivado. No se ha confirmado el envío ni el recibo.",
    // src/components/payroll/workflow-status.ts:13
    noCurrentlyEligibleRecipientsNoNoticeWasQueued: "No hay destinatarios elegibles ahora. No se puso ninguna notificación en cola.",
    // src/components/payroll/workflow-status.ts:14
    legacyPreparationOnlyNoNoticeWasSent: "Solo preparación anterior. No se envió ninguna notificación.",
    // src/components/payroll/workflow-status.ts:15
    noQueueResultRecordedYetSendingAndReceiptAreNot: "Todavía no hay un resultado de la cola. No se ha confirmado el envío ni el recibo.",
    // src/components/payroll/workflow-status.ts:20
    theHistoryScanReachedItsLimitTheMissingPeriodCount: "La búsqueda en el historial llegó a su límite. No está disponible el conteo de períodos sin nómina; revisa los ajustes anteriores y las nóminas originales antes de preparar borradores atrasados.",
    // src/components/payroll/workflow-status.ts:22
    missingEarlierPayrollOne: "Aún falta la nómina de {missingCount} período anterior. Empieza por el más antiguo.",
    // src/components/payroll/workflow-status.ts:22
    missingEarlierPayrollOther: "{missingCount} períodos de pago anteriores todavía no tienen nómina. Empieza por el más antiguo.",
    // src/components/payroll/workflow-status.ts:39
    nevoraCanTCalculateThisPayrollUntilItsPayrollRules: "NEVORA no puede calcular esta nómina hasta que se confirmen sus reglas de nómina. Comunícate con soporte.",
    // src/components/payroll/workflow-status.ts:40
    completeAndReviewTheOpenRecordedTimeOrBreakBefore: "Completa y revisa el tiempo o el descanso registrado que sigue abierto antes de recalcular.",
    // src/components/payroll/workflow-status.ts:41
    refreshAndReviewTheRecordedTimecardsThenRecalculate: "Actualiza y revisa las tarjetas de tiempo registradas y luego recalcula.",
    // src/components/payroll/workflow-status.ts:42
    reviewAndFinalizeTheIncludedRecordedTimecards: "Revisa y finaliza las tarjetas de tiempo registradas que están incluidas.",
    // src/components/payroll/workflow-status.ts:43
    nevoraCanTUseTheSavedWageDetailsReviewThe: "NEVORA no puede usar los datos de salario guardados. Revisa el salario en la configuración de nómina.",
    // src/components/payroll/workflow-status.ts:44
    nevoraCanTApplyOneOfTheSavedDeductionsReview: "NEVORA no puede aplicar una de las deducciones guardadas. Revisa las deducciones en la configuración de nómina.",
    // src/components/payroll/workflow-status.ts:45
    employerContributionDetailsAreMissingOrNotSupportedReviewThem: "Faltan los datos de las aportaciones patronales o no son compatibles. Revísalos en la configuración de nómina.",
    // src/components/payroll/workflow-status.ts:46
    nevoraCanTUseTheSavedWorkweekReviewTheWorkweek: "NEVORA no puede usar la semana laboral guardada. Revisa la semana laboral en la configuración de nómina.",
    // src/components/payroll/workflow-status.ts:47
    nevoraCanTCalculateOneOfTheRecordedBreaksCheck: "NEVORA no puede calcular uno de los descansos registrados. Revisa el descanso en la tarjeta de tiempo y las reglas de descanso en la configuración de nómina.",
    // src/components/payroll/workflow-status.ts:48
    nevoraCouldnTConfirmTheRecordedTimeForThisPayroll: "NEVORA no pudo confirmar el tiempo registrado para esta nómina. Revisa las tarjetas de tiempo y luego recalcula. Si sigue igual, comunícate con soporte.",
    // src/components/payroll/workflow-status.ts:49
    thisPayrollIsLargerThanNEVORACanCalculateAtOnce: "Esta nómina es más grande de lo que NEVORA puede calcular de una vez. Comunícate con soporte.",
    // src/components/payroll/workflow-status.ts:50
    someSavedPayrollDetailsCanTBeReadReviewThem: "No se pueden leer algunos datos de nómina guardados. Revísalos en la configuración de nómina. Si sigue igual, comunícate con soporte.",
    // src/components/payroll/workflow-status.ts:51
    thisYearSPayrollTotalsDonTLineUpFor: "Los totales de nómina de este año no cuadran para este empleado. Comunícate con soporte.",
    // src/components/payroll/workflow-status.ts:53
    somethingStopsThisPayrollThatNEVORACanTExplainHere: "Algo detiene esta nómina que NEVORA no puede explicar aquí. Recalcula el borrador. Si sigue igual, comunícate con soporte.",
    // src/components/payroll/workflow-status.ts:59
    reviewAndFinalizeTheEmployeeTimecardsIncludingConfirmedZeroHour: "Revisa y finaliza las tarjetas de tiempo de los empleados, incluidos los períodos confirmados sin horas, antes de recalcular.",
    // src/components/payroll/workflow-status.ts:61
    recordedTimecardsAreUnavailableReloadTheirCurrentStatusBeforeRecalculating: "Las tarjetas de tiempo registradas no están disponibles. Vuelve a cargar su estado actual antes de recalcular.",
    // src/components/payroll/workflow-status.ts:64
    aTimeCorrectionIsStillWaitingForReviewReviewIt: "Una corrección de tiempo todavía espera revisión. Revísala en Tarjetas de tiempo y luego recalcula.",
    // src/components/payroll/workflow-status.ts:65
    twoRecordedTimesOverlapFixTheOverlapInTimecardsThen: "Dos tiempos registrados se solapan. Corrige el solapamiento en Tarjetas de tiempo y luego recalcula.",
    // src/components/payroll/workflow-status.ts:67
    nevoraNeedsFinalizedTimecardsForTheDaysJustBeforeAnd: "NEVORA necesita las tarjetas de tiempo finalizadas de los días justo antes y después de este período para calcular las horas extra. Finalízalas y luego recalcula.",
    // src/components/payroll/workflow-status.ts:71
    completeTheRecordedLocationCoverageBeforeRecalculating: "Completa la cobertura de localidades registrada antes de recalcular.",
    // src/components/payroll/workflow-status.ts:72
    anOlderRuleHeldThisDraftBecauseRecordedTimeTouched: "Una regla anterior detuvo este borrador porque el tiempo registrado llegó a la medianoche. Ahora los turnos cuentan el día en que empiezan. Recalcula este borrador.",
    // src/components/payroll/workflow-status.ts:74
    chooseWhoSInThisPayrollForThePeriodThen: "Elige quién está en esta nómina para el período y luego recalcula.",
    // src/components/payroll/workflow-status.ts:75
    peopleOrTimecardsChangedAfterYouChoseWhoSIn: "Las personas o las tarjetas de tiempo cambiaron después de que elegiste quién está en esta nómina. Revisa la lista otra vez y luego recalcula.",
    // src/components/payroll/workflow-status.ts:76
    aCorrectionMustIncludeTheSamePeopleAsTheOriginal: "Una corrección tiene que incluir a las mismas personas que la nómina original. Revisa la nómina original antes de continuar.",
    // src/components/payroll/workflow-status.ts:78
    askTheOwnerToDocumentTheEmployeeWorkweekUnknownNotice: "Pídele al dueño que documente la semana laboral del empleado. Sin el historial de avisos no se puede elegir una semana predeterminada.",
    // src/components/payroll/workflow-status.ts:79
    askTheOwnerToReviewWorkweekEvidenceDeliveryAndEffective: "Pídele al dueño que revise la evidencia de la semana laboral, su entrega y las fechas de vigencia.",
    // src/components/payroll/workflow-status.ts:80
    askTheOwnerToReviewTheSavedEmployeePayrollFacts: "Pídele al dueño que revise los datos de nómina guardados del empleado y su evidencia.",
    // src/components/payroll/workflow-status.ts:81
    askTheOwnerToVerifyThatTheWorkweekEvidenceCovers: "Pídele al dueño que verifique que la evidencia de la semana laboral cubre a este empleado.",
    // src/components/payroll/workflow-status.ts:82
    askTheOwnerToResolveConflictingLegacyWorkweekCoordinatesAnd: "Pídele al dueño que resuelva el conflicto entre los datos anteriores de la semana laboral y la política documentada.",
    // src/components/payroll/workflow-status.ts:83
    askTheOwnerToVerifyWorkweekEvidenceCoveringTheEntire: "Pídele al dueño que verifique que la evidencia de la semana laboral cubre todo el tiempo registrado, incluidos los días anteriores y los finales.",
    // src/components/payroll/workflow-status.ts:86
    askTheOwnerToMatchTheEmployerOpeningWageBasis: "Pídele al dueño que haga coincidir la base salarial patronal inicial con el saldo acumulado del año documentado para el mismo código.",
    // src/components/payroll/workflow-status.ts:87
    askTheOwnerToVerifyTheEmployerContributionOpeningWage: "Pídele al dueño que verifique las bases salariales iniciales de las aportaciones patronales.",
    // src/components/payroll/workflow-status.ts:88
    askTheOwnerToVerifyAndAttestTheOpeningYear: "Pídele al dueño que verifique y certifique los saldos acumulados del año iniciales.",
    // src/components/payroll/workflow-status.ts:89
    askTheOwnerToVerifyTheOpeningYearToDate: "Pídele al dueño que verifique los saldos acumulados del año iniciales.",
    // src/components/payroll/workflow-status.ts:90
    askTheOwnerToAttestTheDocumentedYearToDate: "Pídele al dueño que certifique los saldos acumulados del año documentados.",
    // src/components/payroll/workflow-status.ts:91
    askTheOwnerToCompleteTheEmployeeWageProfile: "Pídele al dueño que complete el perfil salarial del empleado.",
    // src/components/payroll/workflow-status.ts:92
    twoSavedWagesCoverTheSameDatesAndLocationKeep: "Dos salarios guardados cubren las mismas fechas y la misma localidad. Deja uno en la configuración de nómina.",
    // src/components/payroll/workflow-status.ts:94
    minimumWageCoverageIsnTConfirmedForThisWageConfirm: "No está confirmada la cobertura de salario mínimo para este salario. Confírmala en la configuración de nómina.",
    // src/components/payroll/workflow-status.ts:95
    theHourlyRateIsBelowTheMinimumWageNEVORAChecks: "La tarifa por hora está por debajo del salario mínimo que verifica NEVORA. Revisa la tarifa en la configuración de nómina.",
    // src/components/payroll/workflow-status.ts:96
    askTheOwnerToCompleteTheEmployeeWithholdingFacts: "Pídele al dueño que complete los datos de retención del empleado.",
    // src/components/payroll/workflow-status.ts:97
    nevoraCanTCalculateThisMixOfWithholdingChoicesYet: "NEVORA todavía no puede calcular esta combinación de opciones de retención. Revisa los datos de retención en la configuración de nómina o comunícate con soporte.",
    // src/components/payroll/workflow-status.ts:101
    deductionsAreMoreThanThePayForThisPeriodReview: "Las deducciones son más que el pago de este período. Revisa las deducciones en la configuración de nómina.",
    // src/components/payroll/workflow-status.ts:102
    theRecordedTimeAndEmployeePayrollFactsAreIncomplete: "El tiempo registrado y los datos de nómina del empleado están incompletos.",
    // src/components/payroll/workflow-status.ts:103
    theOpeningYearToDateBalancesDonTAddUp: "Los saldos acumulados del año iniciales no cuadran para este empleado. Revisa los saldos iniciales en la configuración de nómina.",
    // src/components/payroll/workflow-status.ts:106
    noPayrollSettingsAreSavedForThisPaydaySaveYour: "No hay ajustes de nómina guardados para este día de pago. Guarda tu calendario de pago en Configuración de nómina.",
    // src/components/payroll/workflow-status.ts:112
    thisCompanyHasSavedDeductionOrContributionRulesThatNEVORA: "Esta empresa tiene reglas de deducciones o aportaciones guardadas que NEVORA no puede usar en su propio cálculo. Comunícate con soporte.",
    // src/components/payroll/workflow-status.ts:113
    nevoraCanTCalculatePaydaysInThatYearYetContact: "NEVORA todavía no puede calcular días de pago en ese año. Comunícate con soporte.",
    // src/components/payroll/workflow-status.ts:114
    nevoraCanTCalculatePayrollForThisCompanySTime: "NEVORA todavía no puede calcular la nómina para la zona horaria de esta empresa. Comunícate con soporte.",
    // src/components/payroll/workflow-status.ts:115
    someoneWorkedMoreThanSevenDaysInARowWhich: "Alguien trabajó más de siete días seguidos, y NEVORA todavía no puede calcular eso. Comunícate con soporte.",
    // src/components/payroll/workflow-status.ts:116
    thisRecordedContextSpansDifferentWorkweekPoliciesAskTheOwner: "Este tiempo registrado abarca políticas de semana laboral distintas. Pídele al dueño que lo revise; NEVORA todavía no puede calcular a través de ese cambio.",
    // src/components/payroll/workflow-status.ts:118
    nevoraCouldnTReadTheTimeAndPayrollDetailsFor: "NEVORA no pudo leer los datos de tiempo y de nómina de esta nómina. Recalcula el borrador. Si vuelve a pasar, comunícate con soporte.",
    // src/components/payroll/workflow-status.ts:119
    theDatesOfThisPayPeriodDonTMatchThe: "Las fechas de este período de pago no coinciden con el tiempo guardado. Recalcula el borrador. Si sigue igual, comunícate con soporte.",
    // src/components/payroll/workflow-status.ts:120
    nevoraCanTCalculateAPayPeriodWithTheseDates: "NEVORA no puede calcular un período de pago con estas fechas. Comunícate con soporte.",
    // src/components/payroll/workflow-status.ts:121
    verifyLocationCoverageForThePriorPayrollBalances: "Verifica la cobertura de localidades de los saldos de nóminas anteriores.",
    // src/components/payroll/workflow-status.ts:122
    laterPayrollHasAlreadyBeenApprovedAskTheOwnerTo: "Ya se aprobó una nómina posterior. Pídele al dueño que revise el orden del acumulado del año.",
    // src/components/payroll/workflow-status.ts:123
    laterApprovedPayrollDependsOnTheseYearToDateBalances: "Una nómina aprobada posterior depende de estos saldos acumulados del año. Pídele al dueño que revise el orden de las correcciones.",
    // src/components/payroll/workflow-status.ts:137
    importProviderOrAccountantAmountsToReviewThisDraft: "Importa las cantidades del proveedor o del contador para revisar este borrador.",
    // src/components/payroll/workflow-status.ts:138
    finalizeTimecardsForEmployeeReferenceExceptionBeforeApproval: "Finaliza las tarjetas de tiempo del empleado con referencia {exception} antes de aprobar.",
    // src/components/payroll/workflow-status.ts:139
    chooseWhatToDoWithEmployeeReferenceExceptionForThis: "Elige qué hacer con el empleado con referencia {exception} en este período antes de aprobar.",
    // src/components/payroll/workflow-status.ts:142
    textEmployeeReferenceReference: "{text} Referencia del empleado: {reference}.",
  },
} as const;
